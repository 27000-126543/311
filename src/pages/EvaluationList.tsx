import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/utils/api'
import { FileCheck, ArrowRight, Calendar } from 'lucide-react'

interface ProjectItem {
  id: string; name: string; budget: number; industry: string
  status: string; deadline: string
}

type Filter = 'all' | 'pending' | 'done'

const STATUS_MAP: Record<Filter, string> = { all: '全部', pending: '待评标', done: '已评标' }

export default function EvaluationList() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [evaluatedIds, setEvaluatedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    api.get<{ success: boolean; data: { list: ProjectItem[] } }>('/projects?status=evaluating')
      .then((r) => setProjects(r.data?.list || []))
      .catch(() => {})
    api.get<{ success: boolean; data: { list: ProjectItem[] } }>('/projects?status=awarded')
      .then((r) => {
        const awarded = r.data?.list || []
        setEvaluatedIds(new Set(awarded.map((p) => p.id)))
        setProjects((prev) => [...prev, ...awarded.filter((p) => !prev.some((x) => x.id === p.id))])
      })
      .catch(() => {})
  }, [])

  const filtered = projects.filter((p) => {
    if (filter === 'pending') return !evaluatedIds.has(p.id)
    if (filter === 'done') return evaluatedIds.has(p.id)
    return true
  })

  const isDone = (p: ProjectItem) => evaluatedIds.has(p.id)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <FileCheck className="text-[#0F2B46]" /> 评标任务
      </h1>

      <div className="flex gap-2">
        {(['all', 'pending', 'done'] as Filter[]).map((f) => (
          <button
            key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-[#0F2B46] text-white' : 'bg-white text-slate-600 border border-slate-300'
            }`}
          >
            {STATUS_MAP[f]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => {
          const done = isDone(p)
          return (
            <div
              key={p.id}
              className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-slate-800 line-clamp-2 flex-1">{p.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full shrink-0 ml-2 ${
                  done ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {done ? '已评标' : '待评标'}
                </span>
              </div>
              <div className="space-y-1 text-sm text-slate-500 mb-4">
                <p>行业: <span className="text-slate-700">{p.industry}</span></p>
                <p>预算: <span className="text-slate-700">¥{p.budget.toLocaleString()}</span></p>
                <p className="flex items-center gap-1">
                  <Calendar size={12} />
                  截止: {p.deadline ? new Date(p.deadline).toLocaleDateString('zh-CN') : '—'}
                </p>
              </div>
              <button
                onClick={() => navigate(`/evaluation/${p.id}`)}
                className="w-full py-2 bg-[#0F2B46] text-white rounded-lg text-sm font-medium hover:bg-[#1a3d5c] flex items-center justify-center gap-1 transition-colors"
              >
                进入评标 <ArrowRight size={14} />
              </button>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400">暂无评标任务</div>
        )}
      </div>
    </div>
  )
}
