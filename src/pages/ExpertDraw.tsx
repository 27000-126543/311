import { useState, useEffect, useCallback } from 'react'
import { api } from '@/utils/api'
import { Users, Play, Eye, Clock, X, Plus, Loader2 } from 'lucide-react'

const SPECIALTIES = ['建筑工程', '信息技术', '医疗卫生', '教育培训', '交通运输', '能源环保']

interface DrawRecord {
  drawId: string
  projectId: string
  projectName: string
  specialties: string[]
  createdAt: string
  decryptAt: string
  decrypted: boolean
  experts?: { id: string; name: string; orgName?: string; specialty?: string }[]
}

export default function ExpertDraw() {
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [draws, setDraws] = useState<DrawRecord[]>([])
  const [projectId, setProjectId] = useState('')
  const [count, setCount] = useState(5)
  const [specialties, setSpecialties] = useState<string[]>([])
  const [excludeInput, setExcludeInput] = useState('')
  const [excludeIds, setExcludeIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDraw, setSelectedDraw] = useState<DrawRecord | null>(null)

  useEffect(() => {
    api.get<{ success: boolean; data: { list: { id: string; name: string }[] } }>('/projects?pageSize=100')
      .then((r) => setProjects(r.data?.list || []))
      .catch(() => {})
    fetchDraws()
  }, [])

  const fetchDraws = useCallback(async () => {
    try {
      const r = await api.get<{ success: boolean; data: DrawRecord[] }>('/experts/draws')
      setDraws(r.data || [])
    } catch {
      setDraws([])
    }
  }, [])

  const toggleSpecialty = (s: string) =>
    setSpecialties((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))

  const addExclude = () => {
    const v = excludeInput.trim()
    if (v && !excludeIds.includes(v)) {
      setExcludeIds((prev) => [...prev, v])
      setExcludeInput('')
    }
  }

  const handleDraw = async () => {
    if (!projectId || !specialties.length) return
    setLoading(true)
    try {
      const r = await api.post<{ success: boolean; data: { drawId: string } }>('/experts/draw', {
        projectId, specialties, count, excludeIds,
      })
      if (r.success) await fetchDraws()
    } catch {}
    setLoading(false)
  }

  const viewDraw = async (draw: DrawRecord) => {
    if (!draw.decrypted) return
    try {
      const r = await api.get<{ success: boolean; data: DrawRecord }>(`/experts/draw/${draw.drawId}`)
      if (r.success && r.data) setSelectedDraw(r.data)
    } catch {}
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <Users className="text-[#0F2B46]" /> 专家抽取
      </h1>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">选择项目</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#C8A45C] focus:border-[#C8A45C]"
            >
              <option value="">请选择项目</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">抽取人数</label>
            <input
              type="number" min={3} max={7} value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#C8A45C]"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">专业领域</label>
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map((s) => (
              <label
                key={s}
                className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer border transition-colors ${
                  specialties.includes(s)
                    ? 'bg-[#0F2B46] text-white border-[#0F2B46]'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-[#C8A45C]'
                }`}
              >
                <input type="checkbox" className="sr-only" checked={specialties.includes(s)} onChange={() => toggleSpecialty(s)} />
                {s}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">回避规则</label>
          <div className="flex gap-2">
            <input
              value={excludeInput}
              onChange={(e) => setExcludeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addExclude()}
              placeholder="输入专家ID或姓名，回车添加"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#C8A45C]"
            />
            <button onClick={addExclude} className="px-3 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200">
              <Plus size={16} />
            </button>
          </div>
          {excludeIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {excludeIds.map((id) => (
                <span key={id} className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded">
                  {id}
                  <button onClick={() => setExcludeIds((prev) => prev.filter((x) => x !== id))}><X size={12} /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleDraw}
          disabled={loading || !projectId || !specialties.length}
          className="mt-4 px-6 py-2.5 bg-[#C8A45C] text-white rounded-lg font-medium hover:bg-[#b8944f] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? <><Loader2 className="animate-spin" size={16} /> 抽取中...</> : <><Play size={16} /> 开始抽取</>}
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">抽取记录</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-slate-500 font-medium">抽取编号</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">项目名称</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">专业领域</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">抽取时间</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">解密时间</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">状态</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {draws.map((d) => (
                <tr key={d.drawId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono text-xs">{d.drawId.slice(0, 8)}</td>
                  <td className="py-3 px-4">{d.projectName}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {d.specialties.map((s) => (
                        <span key={s} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{new Date(d.createdAt).toLocaleString('zh-CN')}</td>
                  <td className="py-3 px-4 text-slate-500">{new Date(d.decryptAt).toLocaleString('zh-CN')}</td>
                  <td className="py-3 px-4">
                    {d.decrypted
                      ? <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">已解密</span>
                      : <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full">已加密</span>}
                  </td>
                  <td className="py-3 px-4">
                    {d.decrypted
                      ? <button onClick={() => viewDraw(d)} className="text-[#C8A45C] hover:underline text-sm flex items-center gap-1"><Eye size={14} /> 查看专家</button>
                      : <span className="text-slate-400 text-sm flex items-center gap-1"><Clock size={14} /> 等待解密</span>}
                  </td>
                </tr>
              ))}
              {draws.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">暂无抽取记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDraw && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedDraw(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">抽取专家列表</h3>
              <button onClick={() => setSelectedDraw(null)}><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-500 mb-3">项目: {selectedDraw.projectName}</p>
            {selectedDraw.experts?.length ? (
              <div className="space-y-2">
                {selectedDraw.experts.map((e, i) => (
                  <div key={e.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-[#0F2B46] text-white flex items-center justify-center text-sm font-medium">{i + 1}</div>
                    <div>
                      <p className="font-medium text-slate-800">{e.name}</p>
                      <p className="text-xs text-slate-500">{e.orgName} · {e.specialty}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-4">暂无专家信息</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
