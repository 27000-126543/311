import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Clock, MapPin, Building2, Tag, FileText, Send, Users, Eye, Gavel, Award, FileCheck } from 'lucide-react'
import { api } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'

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

const statusLabels: Record<string, string> = {
  draft: '草稿', published: '已发布', bidding: '投标中', evaluating: '评审中',
  awarded: '已中标', contracted: '已签约', completed: '已完成', failed: '已流标',
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const { hasRole } = useAuthStore()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchProject() }, [id])

  async function fetchProject() {
    setLoading(true)
    try {
      const res = await api.get<any>('/projects/' + id)
      setProject(res)
    } catch { setProject(null) } finally { setLoading(false) }
  }

  if (loading) return <div className="text-center py-20 text-slate-400">加载中...</div>
  if (!project) return <div className="text-center py-20 text-slate-400">项目不存在</div>

  const isBidder = hasRole('bidder')
  const isTendererOrAdmin = hasRole('tenderer', 'admin')
  const canBid = isBidder && (project.status === 'published' || project.status === 'bidding')

  function fmtDate(v: string) {
    return v ? new Date(v).toLocaleDateString('zh-CN') : '-'
  }

  function fmtBudget(v: number) {
    if (!v) return '-'
    if (v >= 10000) return `¥${(v / 10000).toFixed(v % 10000 ? 2 : 0)}万元`
    return `¥${v.toLocaleString()}元`
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-[#0F2B46]">{project.name}</h1>
          <span className={`shrink-0 text-sm px-3 py-1 rounded-full ${statusColors[project.status] || 'bg-slate-100 text-slate-600'}`}>
            {statusLabels[project.status] || project.status}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Building2 size={16} />
          <span>{project.tendererName || project.tenderer || '招标方'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h3 className="font-semibold text-[#0F2B46] flex items-center gap-2"><FileText size={18} />项目信息</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-400 text-xs block">预算金额</span>
              <span className="font-medium text-[#0F2B46]">{fmtBudget(project.budget)}</span>
            </div>
            <div>
              <span className="text-slate-400 text-xs block">所属行业</span>
              <span className="font-medium">{project.industry || '-'}</span>
            </div>
            <div className="flex items-start gap-1">
              <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
              <div><span className="text-slate-400 text-xs block">所属地区</span><span className="font-medium">{project.region || '-'}</span></div>
            </div>
            <div className="flex items-start gap-1">
              <Clock size={14} className="text-slate-400 mt-0.5 shrink-0" />
              <div><span className="text-slate-400 text-xs block">截止日期</span><span className="font-medium">{fmtDate(project.deadline)}</span></div>
            </div>
            <div className="flex items-start gap-1">
              <Clock size={14} className="text-slate-400 mt-0.5 shrink-0" />
              <div><span className="text-slate-400 text-xs block">创建日期</span><span className="font-medium">{fmtDate(project.createdAt)}</span></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h3 className="font-semibold text-[#0F2B46] flex items-center gap-2"><Tag size={18} />详细说明</h3>
          <div>
            <span className="text-slate-400 text-xs block mb-1">项目描述</span>
            <p className="text-sm text-slate-700 leading-relaxed">{project.description || '暂无描述'}</p>
          </div>
          {project.qualifications?.length > 0 && (
            <div>
              <span className="text-slate-400 text-xs block mb-2">资质要求</span>
              <div className="flex flex-wrap gap-1.5">
                {project.qualifications.map((q: string) => (
                  <span key={q} className="text-xs bg-[#0F2B46]/5 text-[#0F2B46] px-2 py-1 rounded-full">{q}</span>
                ))}
              </div>
            </div>
          )}
          {project.scoringCriteria?.length > 0 && (
            <div>
              <span className="text-slate-400 text-xs block mb-2">评分标准</span>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="px-2 py-1.5 text-left font-medium">名称</th>
                    <th className="px-2 py-1.5 text-left font-medium">权重</th>
                    <th className="px-2 py-1.5 text-left font-medium">满分</th>
                  </tr>
                </thead>
                <tbody>
                  {project.scoringCriteria.map((r: any, i: number) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">{r.name}</td>
                      <td className="px-2 py-1.5">{r.weight}%</td>
                      <td className="px-2 py-1.5">{r.maxScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-semibold text-[#0F2B46] mb-4">操作</h3>
        <div className="flex flex-wrap gap-3">
          {canBid && (
            <Link to={`/bids/submit/${id}`} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[#C8A45C] text-white hover:bg-[#b8933f] transition-colors">
              <Send size={16} />提交投标
            </Link>
          )}
          {isTendererOrAdmin && (
            <>
              <Link to={`/experts?projectId=${id}`} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[#0F2B46] text-white hover:bg-[#1a3d5e] transition-colors">
                <Users size={16} />专家抽取
              </Link>
              <Link to={`/bid-opening/${id}`} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-[#0F2B46] text-[#0F2B46] hover:bg-[#0F2B46] hover:text-white transition-colors">
                <Eye size={16} />开标
              </Link>
              <Link to={`/evaluation/${id}`} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-[#0F2B46] text-[#0F2B46] hover:bg-[#0F2B46] hover:text-white transition-colors">
                <FileCheck size={16} />查看评标
              </Link>
              <Link to={`/awards/${id}`} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-[#0F2B46] text-[#0F2B46] hover:bg-[#0F2B46] hover:text-white transition-colors">
                <Award size={16} />中标公示
              </Link>
            </>
          )}
          <Link to={`/contracts/${id}`} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors">
            <Gavel size={16} />查看合同
          </Link>
        </div>
      </div>

      {isTendererOrAdmin && project.bids?.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold text-[#0F2B46] mb-4">投标列表</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="px-3 py-2 text-left font-medium">投标方</th>
                  <th className="px-3 py-2 text-left font-medium">报价</th>
                  <th className="px-3 py-2 text-left font-medium">状态</th>
                  <th className="px-3 py-2 text-left font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {project.bids.map((b: any) => (
                  <tr key={b.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{b.bidderName || b.bidder || '-'}</td>
                    <td className="px-3 py-2">{b.quote ? `¥${b.quote.toLocaleString()}` : '-'}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${b.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {b.status === 'verified' ? '已验证' : b.status === 'pending' ? '待验证' : b.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {b.status !== 'verified' && (
                        <Link to={`/bids/verify/${b.id}`} className="text-[#C8A45C] hover:underline text-xs">验证</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
