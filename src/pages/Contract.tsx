import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'
import {
  FileSignature, PenLine, Upload, CheckCircle2,
  AlertCircle, FileText, Shield,
} from 'lucide-react'

interface Amendment {
  id: string
  reason: string
  status: string
  documents: string[]
  createdAt: string
}

interface ContractData {
  id: string
  projectName: string
  status: 'draft' | 'signed' | 'amending' | 'completed'
  bondAmount: number
  signedAt?: string
  content: string
  amendments: Amendment[]
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-amber-100', text: 'text-amber-700', label: '待签署' },
  signed: { bg: 'bg-green-100', text: 'text-green-700', label: '已签署' },
  amending: { bg: 'bg-blue-100', text: 'text-blue-700', label: '变更中' },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '已完成' },
}

function StatusBadge({ status }: { status: string }) {
  const c = statusConfig[status] || statusConfig.draft
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${c.bg} ${c.text}`}>{c.label}</span>
}

function ContractPreview({ content }: { content: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-full">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
        <FileText size={18} className="text-[#0F2B46]" />
        <h3 className="font-semibold text-[#0F2B46]">合同内容</h3>
      </div>
      <div className="p-6 max-h-[600px] overflow-y-auto text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-serif">
        {content}
      </div>
    </div>
  )
}

function SignDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-white rounded-xl p-6 w-[480px] space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <PenLine size={20} className="text-[#C8A45C]" />
          <h3 className="font-semibold text-[#0F2B46]">电子签署确认</h3>
        </div>
        <div className="border border-dashed border-slate-300 rounded-lg p-8 text-center bg-slate-50">
          <p className="text-sm text-slate-500 mb-4">请在下方区域确认签署</p>
          <div className="border-2 border-slate-200 rounded-lg h-24 flex items-center justify-center bg-white">
            <span className="text-slate-400 text-sm">点击确认即表示同意合同全部条款</span>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">取消</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm rounded-lg bg-[#C8A45C] text-white hover:bg-[#C8A45C]/90 flex items-center gap-1">
            <PenLine size={14} /> 确认签署
          </button>
        </div>
      </div>
    </div>
  )
}

function AmendForm({ onSubmit, onCancel }: { onSubmit: (reason: string, docs: string[]) => void; onCancel: () => void }) {
  const [reason, setReason] = useState('')
  return (
    <div className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50">
      <textarea value={reason} onChange={(e) => setReason(e.target.value)}
        placeholder="请输入变更/索赔原因..." rows={4}
        className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-[#C8A45C] resize-none" />
      <div className="border border-dashed border-slate-300 rounded-lg p-3 text-center text-sm text-slate-400 cursor-pointer hover:border-[#C8A45C]">
        <Upload size={16} className="mx-auto mb-1" /> 上传相关文档
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100">取消</button>
        <button onClick={() => onSubmit(reason, [])} className="text-sm px-4 py-2 rounded-lg bg-[#0F2B46] text-white hover:bg-[#0F2B46]/90">提交</button>
      </div>
    </div>
  )
}

function AmendmentCard({ amend, canApprove }: { amend: Amendment; canApprove: boolean }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }
  const statusLabels: Record<string, string> = { pending: '待审批', approved: '已通过', rejected: '已驳回' }

  return (
    <div className="border border-slate-100 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-700">{amend.reason}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            <span>{new Date(amend.createdAt).toLocaleDateString('zh-CN')}</span>
            {amend.documents.length > 0 && <span>{amend.documents.length} 个附件</span>}
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[amend.status] || statusColors.pending}`}>
          {statusLabels[amend.status] || '待审批'}
        </span>
      </div>
      {canApprove && amend.status === 'pending' && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2 justify-end">
          <button className="text-xs bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">通过</button>
          <button className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">驳回</button>
        </div>
      )}
    </div>
  )
}

export default function Contract() {
  const { projectId } = useParams<{ projectId: string }>()
  const { hasRole } = useAuthStore()
  const [data, setData] = useState<ContractData | null>(null)
  const [showSign, setShowSign] = useState(false)
  const [showAmend, setShowAmend] = useState(false)

  useEffect(() => {
    api.get<ContractData>(`/contracts/project/${projectId}`).then(setData).catch(() => {
      setData({
        id: 'CT001',
        projectName: '示范项目招标合同',
        status: 'draft',
        bondAmount: 500000,
        content: `合同编号：CT-2026-001\n\n甲方（招标人）：XX市建设局\n乙方（中标人）：中建三局\n\n一、工程概况\n本项目为XX市政道路改造工程，工程地点位于XX市XX区，建设规模为道路总长约5.2公里。\n\n二、合同金额\n本合同总价为人民币壹仟贰佰伍拾万元整（¥12,500,000.00）。\n\n三、工期要求\n工程总工期为365日历天，自开工令下达之日起计算。\n\n四、质量标准\n工程质量应符合国家现行施工验收规范的合格标准。\n\n五、履约保证金\n乙方应在中标通知书发出后15日内缴纳履约保证金，金额为合同总价的4%，即人民币伍拾万元整。\n\n六、付款方式\n按工程进度分阶段支付，具体支付比例及时间节点详见合同附件。\n\n七、违约责任\n如乙方未按合同约定履行义务，应承担违约责任并赔偿甲方因此造成的损失。\n\n八、争议解决\n本合同履行过程中发生争议，双方应协商解决；协商不成的，提交XX仲裁委员会仲裁。`,
        amendments: [],
      })
    })
  }, [projectId])

  if (!data) return <div className="text-center py-20 text-slate-400">加载中...</div>

  const handleSign = async () => {
    await api.post(`/contracts/${data.id}/sign`)
    setShowSign(false)
    setData({ ...data, status: 'signed', signedAt: new Date().toISOString() })
  }

  const handleAmend = async (reason: string, documents: string[]) => {
    await api.post(`/contracts/${data.id}/amend`, { reason, documents })
    setShowAmend(false)
    setData({
      ...data,
      status: 'amending',
      amendments: [...data.amendments, {
        id: String(Date.now()), reason, status: 'pending', documents, createdAt: new Date().toISOString(),
      }],
    })
  }

  const canApprove = hasRole('admin')

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <FileSignature size={24} className="text-[#C8A45C]" />
        <h1 className="text-xl font-semibold text-[#0F2B46]">合同管理</h1>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3">
          <ContractPreview content={data.content} />
        </div>

        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-[#0F2B46] mb-4 flex items-center gap-2">
              <Shield size={18} /> 合同信息
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">状态</span>
                <StatusBadge status={data.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">合同编号</span>
                <span className="font-medium">{data.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">履约保证金</span>
                <span className="font-semibold text-[#C8A45C]">¥{data.bondAmount.toLocaleString()}</span>
              </div>
              {data.signedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">签署时间</span>
                  <span>{new Date(data.signedAt).toLocaleString('zh-CN')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <h3 className="font-semibold text-[#0F2B46] mb-2">操作</h3>
            {data.status === 'draft' && (
              <button
                onClick={() => setShowSign(true)}
                className="w-full flex items-center justify-center gap-2 bg-[#C8A45C] text-white py-2.5 rounded-lg hover:bg-[#C8A45C]/90 text-sm font-medium"
              >
                <PenLine size={16} /> 签署合同
              </button>
            )}
            {(data.status === 'signed' || data.status === 'amending') && (
              <>
                <button
                  onClick={() => setShowAmend(true)}
                  className="w-full flex items-center justify-center gap-2 bg-[#0F2B46] text-white py-2.5 rounded-lg hover:bg-[#0F2B46]/90 text-sm font-medium"
                >
                  <AlertCircle size={16} /> 合同变更/索赔
                </button>
              </>
            )}
            {data.status === 'completed' && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 justify-center py-2">
                <CheckCircle2 size={16} /> 合同已完结
              </div>
            )}
          </div>

          {data.amendments.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-[#0F2B46] mb-3">变更记录</h3>
              <div className="space-y-3">
                {data.amendments.map((a) => (
                  <AmendmentCard key={a.id} amend={a} canApprove={canApprove} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showSign && <SignDialog onConfirm={handleSign} onCancel={() => setShowSign(false)} />}
      {showAmend && <AmendForm onSubmit={handleAmend} onCancel={() => setShowAmend(false)} />}
    </div>
  )
}
