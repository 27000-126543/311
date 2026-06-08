import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Filter, Search, Clock, Users } from 'lucide-react'
import { api } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'

const industries = ['建筑工程', '信息技术', '医疗卫生', '教育培训', '交通运输', '能源环保']
const regions = ['华北', '华东', '华南', '西南', '西北']
const statuses = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'bidding', label: '投标中' },
  { value: 'evaluating', label: '评审中' },
  { value: 'awarded', label: '已中标' },
  { value: 'contracted', label: '已签约' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '已流标' },
]

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-blue-100 text-blue-700',
  bidding: 'bg-amber-100 text-amber-700',
  evaluating: 'bg-violet-100 text-violet-700',
  awarded: 'bg-emerald-100 text-emerald-700',
  contracted: 'bg-teal-100 text-teal-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

const statusLabels: Record<string, string> = Object.fromEntries(statuses.map(s => [s.value, s.label]))

const industryColors: Record<string, string> = {
  建筑工程: 'bg-orange-100 text-orange-700',
  信息技术: 'bg-blue-100 text-blue-700',
  医疗卫生: 'bg-pink-100 text-pink-700',
  教育培训: 'bg-purple-100 text-purple-700',
  交通运输: 'bg-cyan-100 text-cyan-700',
  能源环保: 'bg-green-100 text-green-700',
}

export default function ProjectList() {
  const { hasRole } = useAuthStore()
  const [list, setList] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ industry: '', region: '', status: '', keyword: '' })
  const pageSize = 9

  useEffect(() => { setPage(1) }, [filters])
  useEffect(() => { fetchProjects() }, [page, filters])

  async function fetchProjects() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.industry) params.set('industry', filters.industry)
      if (filters.region) params.set('region', filters.region)
      if (filters.status) params.set('status', filters.status)
      if (filters.keyword) params.set('keyword', filters.keyword)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      const res = await api.get<{ list: any[]; total: number }>('/projects?' + params.toString())
      setList(res.list || [])
      setTotal(res.total || 0)
    } catch {
      setList([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function formatBudget(v: number) {
    if (v >= 10000) return `¥${(v / 10000).toFixed(v % 10000 ? 2 : 0)}万元`
    return `¥${v.toLocaleString()}元`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Filter size={20} className="text-[#0F2B46]" />
        <h2 className="text-lg font-semibold text-[#0F2B46]">筛选条件</h2>
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <select
            value={filters.industry}
            onChange={e => setFilters(f => ({ ...f, industry: e.target.value }))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A45C]"
          >
            <option value="">全部行业</option>
            {industries.map(i => <option key={i} value={i}>{i}</option>)}
          </select>

          <select
            value={filters.region}
            onChange={e => setFilters(f => ({ ...f, region: e.target.value }))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A45C]"
          >
            <option value="">全部地区</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <select
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A45C]"
          >
            <option value="">全部状态</option>
            {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.keyword}
              onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))}
              placeholder="搜索项目名称"
              className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A45C]"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">加载中...</div>
      ) : list.length === 0 ? (
        <div className="text-center py-20 text-slate-400">暂无项目</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {list.map(p => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-lg text-[#0F2B46] leading-snug">{p.name}</h3>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${statusColors[p.status] || 'bg-slate-100 text-slate-600'}`}>
                  {statusLabels[p.status] || p.status}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span className={`text-xs px-2 py-0.5 rounded-full ${industryColors[p.industry] || 'bg-slate-100 text-slate-600'}`}>
                  {p.industry}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{p.region}</span>
              </div>

              <div className="text-[#0F2B46] font-medium">{formatBudget(p.budget || 0)}</div>

              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {p.deadline ? new Date(p.deadline).toLocaleDateString('zh-CN') : '-'}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  {p.bidCount ?? 0}家投标
                </span>
              </div>

              <div className="flex gap-2 mt-auto pt-2">
                <Link
                  to={`/projects/${p.id}`}
                  className="flex-1 text-center py-1.5 text-sm rounded-lg border border-[#0F2B46] text-[#0F2B46] hover:bg-[#0F2B46] hover:text-white transition-colors"
                >
                  查看详情
                </Link>
                {hasRole('bidder') && (p.status === 'published' || p.status === 'bidding') && (
                  <Link
                    to={`/bids/submit/${p.id}`}
                    className="flex-1 text-center py-1.5 text-sm rounded-lg bg-[#C8A45C] text-white hover:bg-[#b8933f] transition-colors"
                  >
                    立即投标
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-1.5 text-sm rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            上一页
          </button>
          <span className="text-sm text-slate-500">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-1.5 text-sm rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
