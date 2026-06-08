import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/utils/api'
import { Scale, Clock, Check, Ban, ArrowRight, Filter } from 'lucide-react'

interface ApprovalBadge {
  label: string
  status: string
}

interface ObjectionRow {
  id: string
  projectId: string
  projectName: string
  contentSummary: string
  submitter: string
  createdAt: string
  approvals: ApprovalBadge[]
  overallStatus: string
}

type StatusFilter = 'all' | 'pending' | 'processing' | 'completed'

const statusLabel: Record<StatusFilter, string> = {
  all: '全部',
  pending: '待处理',
  processing: '处理中',
  completed: '已完成',
}

function ApprovalBadges({ approvals }: { approvals: ApprovalBadge[] }) {
  return (
    <div className="flex items-center gap-1">
      {approvals.map((a, i) => (
        <span key={i} className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded ${
          a.status === 'approved' ? 'bg-green-100 text-green-700' :
          a.status === 'rejected' ? 'bg-red-100 text-red-700' :
          'bg-amber-100 text-amber-700'
        }`}>
          {a.status === 'approved' ? <Check size={10} /> :
           a.status === 'rejected' ? <Ban size={10} /> :
           <Clock size={10} />}
          {a.label}
        </span>
      ))}
    </div>
  )
}

function OverallStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: '待处理' },
    processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: '处理中' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: '已完成' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', label: '已驳回' },
  }
  const c = config[status] || config.pending
  return <span className={`text-xs px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>{c.label}</span>
}

export default function ObjectionList() {
  const navigate = useNavigate()
  const [data, setData] = useState<ObjectionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    api.get<ObjectionRow[]>('/objections/list')
      .then(setData)
      .catch(() => {
        setData([
          {
            id: '1', projectId: 'P001', projectName: '市政道路改造工程',
            contentSummary: '中标候选人资质证明文件存在疑点...',
            submitter: '中铁五局', createdAt: '2026-06-05T10:30:00Z',
            approvals: [
              { label: '招标人', status: 'approved' },
              { label: '交易中心', status: 'pending' },
              { label: '监管', status: 'pending' },
            ],
            overallStatus: 'processing',
          },
          {
            id: '2', projectId: 'P002', projectName: '智慧校园信息化建设',
            contentSummary: '评标过程违反公平原则，评分标准不一致...',
            submitter: '华信科技', createdAt: '2026-06-04T14:20:00Z',
            approvals: [
              { label: '招标人', status: 'approved' },
              { label: '交易中心', status: 'approved' },
              { label: '监管', status: 'approved' },
            ],
            overallStatus: 'completed',
          },
          {
            id: '3', projectId: 'P003', projectName: '城市供水管网改造',
            contentSummary: '技术方案评审存在明显偏颇，未按照招标文件...',
            submitter: '水务集团', createdAt: '2026-06-06T09:15:00Z',
            approvals: [
              { label: '招标人', status: 'pending' },
              { label: '交易中心', status: 'pending' },
              { label: '监管', status: 'pending' },
            ],
            overallStatus: 'pending',
          },
        ])
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? data : data.filter((d) => d.overallStatus === filter)

  if (loading) return <div className="text-center py-20 text-slate-400">加载中...</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale size={24} className="text-[#C8A45C]" />
          <h1 className="text-xl font-semibold text-[#0F2B46]">异议管理</h1>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          {(['all', 'pending', 'processing', 'completed'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                filter === s
                  ? 'bg-[#0F2B46] text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {statusLabel[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              <th className="px-6 py-3 text-left font-medium">项目名称</th>
              <th className="px-6 py-3 text-left font-medium">异议内容摘要</th>
              <th className="px-6 py-3 text-left font-medium">提交人</th>
              <th className="px-6 py-3 text-left font-medium">提交时间</th>
              <th className="px-6 py-3 text-left font-medium">审批状态</th>
              <th className="px-6 py-3 text-center font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                className="border-t border-slate-50 hover:bg-slate-50/50 cursor-pointer"
                onClick={() => navigate(`/objections/${row.projectId}`)}
              >
                <td className="px-6 py-3 font-medium text-[#0F2B46]">{row.projectName}</td>
                <td className="px-6 py-3 text-slate-600 max-w-xs truncate">{row.contentSummary}</td>
                <td className="px-6 py-3">{row.submitter}</td>
                <td className="px-6 py-3 text-slate-500">{new Date(row.createdAt).toLocaleDateString('zh-CN')}</td>
                <td className="px-6 py-3">
                  <OverallStatusBadge status={row.overallStatus} />
                  <ApprovalBadges approvals={row.approvals} />
                </td>
                <td className="px-6 py-3 text-center">
                  <button className="text-[#C8A45C] hover:text-[#C8A45C]/80 text-xs flex items-center gap-1 mx-auto">
                    查看 <ArrowRight size={12} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">暂无异议记录</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
