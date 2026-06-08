import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'
import {
  Scale, Clock, Check, Ban, AlertTriangle,
  FileText, ChevronDown, ChevronUp, Paperclip,
} from 'lucide-react'

interface ApprovalStep {
  level: number
  label: string
  status: string
  comment: string
  updatedAt?: string
}

interface Objection {
  id: string
  content: string
  evidence: string[]
  submitter: string
  createdAt: string
  approvals: ApprovalStep[]
}

function ApprovalStepper({ approvals, onAction, canApprove }: {
  approvals: ApprovalStep[]
  canApprove: boolean
  onAction: (level: number, action: 'approved' | 'rejected', comment: string) => void
}) {
  const [pendingComment, setPendingComment] = useState('')

  return (
    <div className="relative pl-6">
      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-200" />
      {approvals.map((step, i) => {
        const isLast = i === approvals.length - 1
        const statusColor = step.status === 'approved'
          ? 'bg-green-500' : step.status === 'rejected'
          ? 'bg-red-500' : 'bg-amber-400'
        const statusText = step.status === 'approved'
          ? '已通过' : step.status === 'rejected'
          ? '已驳回' : '待审批'

        return (
          <div key={i} className={`relative ${!isLast ? 'pb-6' : ''}`}>
            <div className={`absolute -left-3 w-6 h-6 rounded-full flex items-center justify-center ${statusColor}`}>
              {step.status === 'approved' ? <Check size={14} className="text-white" /> :
               step.status === 'rejected' ? <Ban size={14} className="text-white" /> :
               <Clock size={14} className="text-white" />}
            </div>
            <div className="ml-6">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-[#0F2B46]">{step.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  step.status === 'approved' ? 'bg-green-100 text-green-700' :
                  step.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>{statusText}</span>
              </div>
              {step.comment && (
                <p className="text-xs text-slate-500 mt-1">意见：{step.comment}</p>
              )}
              {step.updatedAt && (
                <p className="text-xs text-slate-400 mt-0.5">{new Date(step.updatedAt).toLocaleString('zh-CN')}</p>
              )}
              {step.status === 'pending' && canApprove && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={pendingComment}
                    onChange={(e) => setPendingComment(e.target.value)}
                    placeholder="审批意见"
                    className="flex-1 text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-[#C8A45C]"
                  />
                  <button
                    onClick={() => { onAction(step.level, 'approved', pendingComment); setPendingComment('') }}
                    className="text-xs bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  >通过</button>
                  <button
                    onClick={() => { onAction(step.level, 'rejected', pendingComment); setPendingComment('') }}
                    className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >驳回</button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ObjectionDetailCard({ obj, canApprove, onAction }: {
  obj: Objection
  canApprove: boolean
  onAction: (objId: string, level: number, action: 'approved' | 'rejected', comment: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const isTimeout = (Date.now() - new Date(obj.createdAt).getTime()) > 72 * 3600 * 1000

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div
        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Scale size={18} className="text-[#0F2B46]" />
          <div>
            <span className="font-medium text-sm text-[#0F2B46]">{obj.submitter} 提交的异议</span>
            <span className="text-xs text-slate-400 ml-3">{new Date(obj.createdAt).toLocaleString('zh-CN')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isTimeout && (
            <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">
              <AlertTriangle size={12} /> 超时自动维持原结果
            </span>
          )}
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-6 pb-6 space-y-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={16} className="text-slate-500" />
              <span className="text-sm font-medium text-slate-600">异议内容</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{obj.content}</p>
          </div>

          {obj.evidence.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Paperclip size={16} className="text-slate-500" />
                <span className="text-sm font-medium text-slate-600">证据材料</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {obj.evidence.map((f, i) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">{f}</span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-slate-600 mb-3">审批流程</h4>
            <ApprovalStepper
              approvals={obj.approvals}
              canApprove={canApprove}
              onAction={(level, action, comment) => onAction(obj.id, level, action, comment)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function ObjectionPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { hasRole } = useAuthStore()
  const [objections, setObjections] = useState<Objection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Objection[]>(`/objections/project/${projectId}`)
      .then(setObjections)
      .catch(() => {
        setObjections([
          {
            id: '1',
            content: '中标候选人资质证明文件存在疑点，部分证书已过期，不符合招标文件要求的资质条件。',
            evidence: ['资质证书扫描件.pdf', '招标文件第3.2节.pdf'],
            submitter: '中铁五局',
            createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
            approvals: [
              { level: 1, label: '招标人审批', status: 'approved', comment: '资质材料确实存在疑点，需进一步核实', updatedAt: new Date(Date.now() - 24 * 3600000).toISOString() },
              { level: 2, label: '交易中心审批', status: 'pending', comment: '' },
              { level: 3, label: '监管部门审批', status: 'pending', comment: '' },
            ],
          },
        ])
      })
      .finally(() => setLoading(false))
  }, [projectId])

  const handleAction = async (objId: string, level: number, action: 'approved' | 'rejected', comment: string) => {
    await api.post(`/objections/${objId}/approve`, { level, action, comment })
  }

  const canApprove = hasRole('tenderer', 'admin', 'supervisor')

  if (loading) return <div className="text-center py-20 text-slate-400">加载中...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Scale size={24} className="text-[#C8A45C]" />
        <h1 className="text-xl font-semibold text-[#0F2B46]">异议处理</h1>
        <span className="text-sm text-slate-400">项目编号：{projectId}</span>
      </div>

      {objections.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <Scale size={48} className="mx-auto mb-3 opacity-30" />
          <p>暂无异议记录</p>
        </div>
      ) : (
        <div className="space-y-4">
          {objections.map((obj) => (
            <ObjectionDetailCard
              key={obj.id}
              obj={obj}
              canApprove={canApprove}
              onAction={handleAction}
            />
          ))}
        </div>
      )}
    </div>
  )
}
