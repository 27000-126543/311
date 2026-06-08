import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'
import {
  FileSignature, PenLine, Upload, CheckCircle2,
  AlertCircle, FileText, Shield, Plus, X, Clock,
  Ban, ChevronRight, Eye, Trash2,
} from 'lucide-react'

interface Attachment {
  id: string
  name: string
  size: string
}

interface Milestone {
  id: string
  contract_id: string
  name: string
  planned_date: string
  actual_date: string | null
  payment_amount: number
  acceptance_result: string
  acceptance_opinion: string
  attachments: Attachment[]
  status: string
  created_at: string
}

interface Amendment {
  id?: string
  reason: string
  type?: string
  status?: string
  documents?: Attachment[]
  amountChange?: number
  durationChange?: number
  tendererComment?: string | null
  supervisorComment?: string | null
  tendererApprovedAt?: string | null
  supervisorApprovedAt?: string | null
  date?: string
}

interface SignatureData {
  signerName: string | null
  signatureContent: string | null
  signatureType: string
  signedAt: string
}

interface ContractData {
  id: string
  project_id: string
  projectName?: string
  status: string
  deposit: number
  contract_amount: number
  signed_at?: string
  content: string
  amendments: Amendment[]
  signatureData: SignatureData | null
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-amber-100', text: 'text-amber-700', label: '待签署' },
  signed: { bg: 'bg-green-100', text: 'text-green-700', label: '已签署' },
  amending: { bg: 'bg-blue-100', text: 'text-blue-700', label: '变更中' },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '已完成' },
}

const milestoneStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-slate-100', text: 'text-slate-600', label: '待完成' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: '已完成' },
  overdue: { bg: 'bg-red-100', text: 'text-red-700', label: '已逾期' },
}

function StatusBadge({ status }: { status: string }) {
  const c = statusConfig[status] || statusConfig.draft
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${c.bg} ${c.text}`}>{c.label}</span>
}

function MilestoneStatusBadge({ status }: { status: string }) {
  const c = milestoneStatusConfig[status] || milestoneStatusConfig.pending
  return <span className={`text-xs px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>{c.label}</span>
}

const amendmentStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: '待审批' },
  tenderer_approved: { bg: 'bg-blue-100', text: 'text-blue-700', label: '招标人已审' },
  approved: { bg: 'bg-green-100', text: 'text-green-700', label: '已通过' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: '已驳回' },
}

function simulateUpload(): Attachment {
  const names = ['变更协议.pdf', '索赔材料.docx', '验收报告.pdf', '技术方案.pdf', '合同附件.jpg']
  const sizes = ['1.2 MB', '856 KB', '2.3 MB', '3.1 MB', '456 KB']
  const idx = Math.floor(Math.random() * names.length)
  return { id: Date.now().toString() + Math.random().toString(36).slice(2, 6), name: names[idx], size: sizes[idx] }
}

export default function Contract() {
  const { projectId } = useParams<{ projectId: string }>()
  const user = useAuthStore((s) => s.user)
  const [data, setData] = useState<ContractData | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [notFound, setNotFound] = useState(false)
  const [showSign, setShowSign] = useState(false)
  const [showAmend, setShowAmend] = useState(false)
  const [showAddMilestone, setShowAddMilestone] = useState(false)
  const [amendReason, setAmendReason] = useState('')
  const [amendType, setAmendType] = useState<'amendment' | 'claim'>('amendment')
  const [amendDocs, setAmendDocs] = useState<Attachment[]>([])
  const [amendAmountChange, setAmendAmountChange] = useState('')
  const [amendDurationChange, setAmendDurationChange] = useState('')
  const [signerName, setSignerName] = useState(user?.orgName || '')
  const [signatureContent, setSignatureContent] = useState('')
  const [signatureType, setSignatureType] = useState<'typed' | 'drawn'>('typed')
  const [newMilestoneName, setNewMilestoneName] = useState('')
  const [newMilestoneDate, setNewMilestoneDate] = useState('')
  const [newMilestonePayment, setNewMilestonePayment] = useState('')
  const [approvalModal, setApprovalModal] = useState<{ amendmentId: string; level: 'tenderer' | 'supervisor' } | null>(null)
  const [approvalComment, setApprovalComment] = useState('')
  const [acceptanceModal, setAcceptanceModal] = useState<Milestone | null>(null)
  const [acceptanceResult, setAcceptanceResult] = useState<'pass' | 'fail'>('pass')
  const [acceptanceOpinion, setAcceptanceOpinion] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'milestones'>('info')

  const loadData = () => {
    if (!projectId) return
    api.get<{ success: boolean; data: ContractData | null }>(`/contracts/project/${projectId}`)
      .then((res) => {
        const d = (res as any).data
        if (d) { setData(d); setNotFound(false) }
        else setNotFound(true)
      })
      .catch(() => setNotFound(true))
  }

  const loadMilestones = () => {
    if (!data?.id) return
    api.get<{ success: boolean; data: Milestone[] }>(`/contracts/${data.id}/milestones`)
      .then((res) => {
        const d = (res as any).data
        if (d) setMilestones(d)
      })
      .catch(() => setMilestones([]))
  }

  useEffect(() => { loadData() }, [projectId])
  useEffect(() => { if (data?.id && data.status !== 'draft') loadMilestones() }, [data?.id, data?.status])

  const handleCreate = async () => {
    try {
      const res = await api.post<{ success: boolean; data: ContractData }>('/contracts', { projectId })
      const d = (res as any).data
      if (d) { setData(d); setNotFound(false) }
    } catch { alert('创建合同失败') }
  }

  const handleSign = async () => {
    if (!data) return
    try {
      const body: any = {
        signerName: signerName || user?.orgName || '签署方',
        signatureType,
      }
      if (signatureType === 'typed') {
        body.signatureContent = signatureContent || signerName || user?.orgName || '签署方'
      } else {
        const canvas = canvasRef.current
        if (canvas) body.signatureContent = canvas.toDataURL('image/png')
        else body.signatureContent = signatureContent
      }
      body.signature = body.signatureContent
      const res = await api.post<{ success: boolean; data: ContractData }>(`/contracts/${data.id}/sign`, body)
      const d = (res as any).data
      if (d) setData(d)
      setShowSign(false)
    } catch { alert('签署失败') }
  }

  const handleAmend = async () => {
    if (!data || !amendReason.trim()) return
    try {
      const res = await api.post<{ success: boolean; data: ContractData }>(`/contracts/${data.id}/amend`, {
        reason: amendReason,
        type: amendType,
        documents: amendDocs,
        amountChange: amendAmountChange ? Number(amendAmountChange) : 0,
        durationChange: amendDurationChange ? Number(amendDurationChange) : 0,
      })
      const d = (res as any).data
      if (d) setData(d)
      setShowAmend(false)
      setAmendReason('')
      setAmendType('amendment')
      setAmendDocs([])
      setAmendAmountChange('')
      setAmendDurationChange('')
    } catch { alert('提交变更失败') }
  }

  const handleAddMilestone = async () => {
    if (!data || !newMilestoneName.trim() || !newMilestoneDate) return
    try {
      await api.post(`/contracts/${data.id}/milestones`, {
        name: newMilestoneName,
        plannedDate: newMilestoneDate,
        paymentAmount: newMilestonePayment ? Number(newMilestonePayment) : 0,
      })
      loadMilestones()
      setShowAddMilestone(false)
      setNewMilestoneName('')
      setNewMilestoneDate('')
      setNewMilestonePayment('')
    } catch { alert('添加里程碑失败') }
  }

  const handleUpdateMilestone = async (m: Milestone, updates: Partial<Milestone>) => {
    try {
      await api.put(`/contracts/milestones/${m.id}`, updates)
      loadMilestones()
    } catch { alert('更新里程碑失败') }
  }

  const handleApproval = async (approved: boolean) => {
    if (!approvalModal || !data) return
    try {
      const res = await api.post(`/contracts/${data.id}/amendments/${approvalModal.amendmentId}/approve`, {
        level: approvalModal.level,
        approved,
        comment: approvalComment,
      })
      const d = (res as any).data
      if (d) setData(d)
      setApprovalModal(null)
      setApprovalComment('')
    } catch { alert('审批操作失败') }
  }

  const handleAcceptance = async () => {
    if (!acceptanceModal) return
    try {
      await api.put(`/contracts/milestones/${acceptanceModal.id}`, {
        status: 'completed',
        actual_date: new Date().toISOString().slice(0, 10),
        acceptance_result: acceptanceResult,
        acceptance_opinion: acceptanceOpinion,
      })
      loadMilestones()
      setAcceptanceModal(null)
      setAcceptanceOpinion('')
      setAcceptanceResult('pass')
    } catch { alert('验收操作失败') }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    setDrawing(true)
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0F2B46'
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => setDrawing(false)

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const canApproveTenderer = user?.role === 'tenderer' || user?.role === 'admin'
  const canApproveSupervisor = user?.role === 'supervisor' || user?.role === 'admin'

  if (notFound) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center gap-3">
          <FileSignature size={24} className="text-[#C8A45C]" />
          <h1 className="text-xl font-semibold text-[#0F2B46]">合同管理</h1>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 mb-4">该项目暂无合同</p>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 bg-[#C8A45C] text-white px-6 py-2.5 rounded-lg hover:bg-[#C8A45C]/90 text-sm font-medium"
          >
            <Plus size={16} /> 创建合同草稿
          </button>
        </div>
      </div>
    )
  }

  if (!data) return <div className="text-center py-20 text-slate-400">加载中...</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileSignature size={24} className="text-[#C8A45C]" />
          <h1 className="text-xl font-semibold text-[#0F2B46]">合同管理</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 text-sm rounded-lg ${activeTab === 'info' ? 'bg-[#0F2B46] text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
          >合同信息</button>
          <button
            onClick={() => setActiveTab('milestones')}
            className={`px-4 py-2 text-sm rounded-lg ${activeTab === 'milestones' ? 'bg-[#0F2B46] text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
          >履约台账</button>
        </div>
      </div>

      {activeTab === 'info' && (
        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-3">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-full">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <FileText size={18} className="text-[#0F2B46]" />
                <h3 className="font-semibold text-[#0F2B46]">合同内容</h3>
              </div>
              <div className="p-6 max-h-[600px] overflow-y-auto text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-serif">
                {data.content}
              </div>
            </div>
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
                  <span className="font-medium text-xs">{data.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">合同金额</span>
                  <div className="text-right">
                    <span className="font-semibold text-[#0F2B46]">¥{(data.contract_amount || 0).toLocaleString()}</span>
                    {data.amendments && data.amendments.filter((a) => a.status === 'approved').length > 0 && (
                      <span className="ml-2 text-xs text-slate-400">
                        （含变更 {data.amendments.filter((a) => a.status === 'approved').reduce((s, a) => s + (a.amountChange || 0), 0) > 0 ? '+' : ''}¥{data.amendments.filter((a) => a.status === 'approved').reduce((s, a) => s + (a.amountChange || 0), 0).toLocaleString()}）
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">履约保证金</span>
                  <span className="font-semibold text-[#C8A45C]">¥{data.deposit?.toLocaleString() || 0}</span>
                </div>
                {data.signed_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">签署时间</span>
                    <span>{new Date(data.signed_at).toLocaleString('zh-CN')}</span>
                  </div>
                )}
                {data.signatureData && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">签署人</span>
                      <span className="font-medium">{data.signatureData.signerName || '—'}</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-slate-500 text-xs">电子签名</span>
                      {data.signatureData.signatureType === 'drawn' && data.signatureData.signatureContent?.startsWith('data:image') ? (
                        <div className="mt-1 border border-slate-200 rounded-lg p-2 bg-white">
                          <img src={data.signatureData.signatureContent} alt="签名" className="h-16" />
                        </div>
                      ) : (
                        <div className="mt-1 border border-slate-200 rounded-lg p-2 bg-white">
                          <span className="text-lg font-serif text-[#0F2B46] italic">{data.signatureData.signatureContent || '—'}</span>
                        </div>
                      )}
                    </div>
                  </>
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
              {(data.status === 'signed' || data.status === 'amending') && !showAmend && (
                <button
                  onClick={() => setShowAmend(true)}
                  className="w-full flex items-center justify-center gap-2 bg-[#0F2B46] text-white py-2.5 rounded-lg hover:bg-[#0F2B46]/90 text-sm font-medium"
                >
                  <AlertCircle size={16} /> 合同变更/索赔
                </button>
              )}
              {showAmend && (
                <div className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAmendType('amendment')}
                      className={`flex-1 text-sm py-1.5 rounded-lg ${amendType === 'amendment' ? 'bg-[#0F2B46] text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                    >合同变更</button>
                    <button
                      onClick={() => setAmendType('claim')}
                      className={`flex-1 text-sm py-1.5 rounded-lg ${amendType === 'claim' ? 'bg-[#0F2B46] text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                    >合同索赔</button>
                  </div>
                  <textarea value={amendReason} onChange={(e) => setAmendReason(e.target.value)}
                    placeholder="请输入变更/索赔原因..." rows={3}
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-[#C8A45C] resize-none" />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500">金额变动</label>
                      <input value={amendAmountChange} onChange={(e) => setAmendAmountChange(e.target.value)}
                        type="number" placeholder="0"
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#C8A45C]" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">工期变动(天)</label>
                      <input value={amendDurationChange} onChange={(e) => setAmendDurationChange(e.target.value)}
                        type="number" placeholder="0"
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#C8A45C]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">证明材料</label>
                    <div className="space-y-1">
                      {amendDocs.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between bg-white rounded px-2 py-1 text-xs border border-slate-100">
                          <span className="text-slate-700 truncate">{doc.name}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">{doc.size}</span>
                            <button onClick={() => setAmendDocs(amendDocs.filter((d) => d.id !== doc.id))} className="text-red-400 hover:text-red-600">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div
                      onClick={() => setAmendDocs([...amendDocs, simulateUpload()])}
                      className="border border-dashed border-slate-300 rounded-lg p-2 text-center text-xs text-slate-400 cursor-pointer hover:border-[#C8A45C] mt-1"
                    >
                      <Upload size={14} className="mx-auto mb-0.5" /> 添加文件
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setShowAmend(false); setAmendReason(''); setAmendDocs([]) }}
                      className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100">取消</button>
                    <button onClick={handleAmend} disabled={!amendReason.trim()}
                      className="text-sm px-4 py-2 rounded-lg bg-[#0F2B46] text-white hover:bg-[#0F2B46]/90 disabled:opacity-50">提交</button>
                  </div>
                </div>
              )}
              {data.status === 'completed' && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 justify-center py-2">
                  <CheckCircle2 size={16} /> 合同已完结
                </div>
              )}
            </div>

            {data.amendments && data.amendments.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-[#0F2B46] mb-3">变更记录</h3>
                <div className="space-y-3">
                  {data.amendments.map((a, i) => {
                    const aStatus = a.status || 'pending'
                    const aStatusConfig = amendmentStatusConfig[aStatus] || amendmentStatusConfig.pending
                    const showTendererApprove = aStatus === 'pending' && canApproveTenderer
                    const showSupervisorApprove = aStatus === 'tenderer_approved' && canApproveSupervisor
                    return (
                      <div key={a.id || i} className="border border-slate-100 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${a.type === 'claim' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                {a.type === 'claim' ? '索赔' : '变更'}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${aStatusConfig.bg} ${aStatusConfig.text}`}>
                                {aStatusConfig.label}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700">{a.reason}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                              <span>{new Date(a.date || '').toLocaleDateString('zh-CN')}</span>
                              {a.documents && a.documents.length > 0 && (
                                <span className="text-[#C8A45C]">{a.documents.length} 个附件</span>
                              )}
                              {(a.amountChange ?? 0) !== 0 && <span>金额变动：¥{a.amountChange}</span>}
                              {(a.durationChange ?? 0) !== 0 && <span>工期变动：{a.durationChange}天</span>}
                            </div>
                            {a.documents && a.documents.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {a.documents.map((doc, di) => (
                                  <span key={di} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{doc.name}</span>
                                ))}
                              </div>
                            )}
                            {a.tendererComment && (
                              <div className="mt-2 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                招标人意见：{a.tendererComment}
                              </div>
                            )}
                            {a.supervisorComment && (
                              <div className="mt-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                                监管意见：{a.supervisorComment}
                              </div>
                            )}
                          </div>
                        </div>
                        {(showTendererApprove || showSupervisorApprove) && (
                          <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2 justify-end">
                            <button
                              onClick={() => setApprovalModal({ amendmentId: a.id!, level: showTendererApprove ? 'tenderer' : 'supervisor' })}
                              className="text-xs px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600"
                            >审批</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'milestones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#0F2B46] flex items-center gap-2">
              <Clock size={18} className="text-[#C8A45C]" /> 履约台账
            </h3>
            {data.status !== 'draft' && (
              <button
                onClick={() => setShowAddMilestone(true)}
                className="flex items-center gap-1 text-sm bg-[#C8A45C] text-white px-4 py-2 rounded-lg hover:bg-[#C8A45C]/90"
              >
                <Plus size={16} /> 添加里程碑
              </button>
            )}
          </div>

          {milestones.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Clock size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">暂无履约里程碑，请添加</p>
            </div>
          ) : (
            <div className="space-y-3">
              {milestones.map((m) => {
                const isOverdue = m.status === 'overdue'
                return (
                  <div key={m.id} className={`bg-white rounded-xl border p-5 ${isOverdue ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {isOverdue && <Ban size={16} className="text-red-500" />}
                          <h4 className={`font-medium ${isOverdue ? 'text-red-800' : 'text-[#0F2B46]'}`}>{m.name}</h4>
                          <MilestoneStatusBadge status={m.status} />
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">计划完成</span>
                            <p className="font-medium">{m.planned_date}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">实际完成</span>
                            <p className="font-medium">{m.actual_date || '—'}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">付款金额</span>
                            <p className="font-semibold text-[#C8A45C]">¥{m.payment_amount?.toLocaleString() || 0}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">验收结果</span>
                            <p className={`font-medium ${m.acceptance_result === 'pass' ? 'text-green-600' : m.acceptance_result === 'fail' ? 'text-red-600' : 'text-slate-400'}`}>
                              {m.acceptance_result === 'pass' ? '合格' : m.acceptance_result === 'fail' ? '不合格' : '待验收'}
                            </p>
                          </div>
                        </div>
                        {m.acceptance_opinion && (
                          <div className="mt-2 text-sm">
                            <span className="text-slate-500">验收意见：</span>
                            <span className="text-slate-700">{m.acceptance_opinion}</span>
                          </div>
                        )}
                        {m.attachments && m.attachments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {m.attachments.map((att, ai) => (
                              <span key={ai} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded flex items-center gap-1">
                                <FileText size={10} /> {att.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0 ml-4">
                        {m.status !== 'completed' && (
                          <>
                            <button
                              onClick={() => setAcceptanceModal(m)}
                              className="text-xs px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600"
                            >完成验收</button>
                            <button
                              onClick={() => {
                                const newAtt = simulateUpload()
                                const existingAtts = m.attachments || []
                                handleUpdateMilestone(m, { attachments: [...existingAtts, newAtt] })
                              }}
                              className="text-xs px-3 py-1.5 bg-slate-500 text-white rounded hover:bg-slate-600"
                            >上传成果</button>
                          </>
                        )}
                        {m.status === 'overdue' && (
                          <button
                            onClick={() => setAcceptanceModal(m)}
                            className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded hover:bg-amber-600"
                          >补完验收</button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {showAddMilestone && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowAddMilestone(false)}>
              <div className="bg-white rounded-xl p-6 w-[480px] space-y-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-semibold text-[#0F2B46]">添加里程碑</h3>
                <div>
                  <label className="text-sm text-slate-700 mb-1 block">里程碑名称</label>
                  <input value={newMilestoneName} onChange={(e) => setNewMilestoneName(e.target.value)}
                    placeholder="如：基础工程验收" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C8A45C]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-slate-700 mb-1 block">计划完成日期</label>
                    <input value={newMilestoneDate} onChange={(e) => setNewMilestoneDate(e.target.value)}
                      type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C8A45C]" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-700 mb-1 block">付款金额</label>
                    <input value={newMilestonePayment} onChange={(e) => setNewMilestonePayment(e.target.value)}
                      type="number" placeholder="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C8A45C]" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowAddMilestone(false)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">取消</button>
                  <button onClick={handleAddMilestone} disabled={!newMilestoneName.trim() || !newMilestoneDate}
                    className="px-4 py-2 text-sm rounded-lg bg-[#C8A45C] text-white hover:bg-[#C8A45C]/90 disabled:opacity-50">添加</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showSign && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowSign(false)}>
          <div className="bg-white rounded-xl p-6 w-[520px] space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <PenLine size={20} className="text-[#C8A45C]" />
              <h3 className="font-semibold text-[#0F2B46]">电子签署确认</h3>
            </div>
            <div>
              <label className="text-sm text-slate-700 mb-1 block">签署人</label>
              <input value={signerName} onChange={(e) => setSignerName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C8A45C]" />
            </div>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setSignatureType('typed')}
                className={`flex-1 text-sm py-2 rounded-lg ${signatureType === 'typed' ? 'bg-[#0F2B46] text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
              >输入签名</button>
              <button
                onClick={() => setSignatureType('drawn')}
                className={`flex-1 text-sm py-2 rounded-lg ${signatureType === 'drawn' ? 'bg-[#0F2B46] text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
              >手写签名</button>
            </div>
            {signatureType === 'typed' ? (
              <div>
                <label className="text-sm text-slate-700 mb-1 block">签名内容</label>
                <input value={signatureContent} onChange={(e) => setSignatureContent(e.target.value)}
                  placeholder="请输入您的签名" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C8A45C]" />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-slate-700">手写签名区域</label>
                  <button onClick={clearCanvas} className="text-xs text-slate-400 hover:text-slate-600">清除</button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={470}
                  height={120}
                  className="border-2 border-slate-200 rounded-lg bg-white cursor-crosshair w-full"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowSign(false)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">取消</button>
              <button onClick={handleSign}
                className="px-4 py-2 text-sm rounded-lg bg-[#C8A45C] text-white hover:bg-[#C8A45C]/90 flex items-center gap-1">
                <PenLine size={14} /> 确认签署
              </button>
            </div>
          </div>
        </div>
      )}

      {approvalModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setApprovalModal(null)}>
          <div className="bg-white rounded-xl p-6 w-[400px] space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-[#0F2B46]">
              {approvalModal.level === 'tenderer' ? '招标人' : '监管部门'}审批
            </h3>
            <div>
              <label className="text-sm text-slate-700 mb-1 block">审批意见</label>
              <textarea value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)}
                rows={3} placeholder="请输入审批意见..." className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-[#C8A45C] resize-none" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setApprovalModal(null); setApprovalComment('') }}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">取消</button>
              <button onClick={() => handleApproval(false)}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600">驳回</button>
              <button onClick={() => handleApproval(true)}
                className="px-4 py-2 text-sm rounded-lg bg-green-500 text-white hover:bg-green-600">通过</button>
            </div>
          </div>
        </div>
      )}

      {acceptanceModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setAcceptanceModal(null)}>
          <div className="bg-white rounded-xl p-6 w-[440px] space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-[#0F2B46] flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-500" />
              完成验收 — {acceptanceModal.name}
            </h3>
            <div>
              <label className="text-sm text-slate-700 mb-2 block">验收结果</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAcceptanceResult('pass')}
                  className={`flex-1 text-sm py-2 rounded-lg ${acceptanceResult === 'pass' ? 'bg-green-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                >合格</button>
                <button
                  onClick={() => setAcceptanceResult('fail')}
                  className={`flex-1 text-sm py-2 rounded-lg ${acceptanceResult === 'fail' ? 'bg-red-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                >不合格</button>
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-700 mb-1 block">验收意见</label>
              <textarea value={acceptanceOpinion} onChange={(e) => setAcceptanceOpinion(e.target.value)}
                rows={3} placeholder="请输入验收意见..." className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-[#C8A45C] resize-none" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setAcceptanceModal(null); setAcceptanceOpinion('') }}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">取消</button>
              <button onClick={handleAcceptance}
                className="px-4 py-2 text-sm rounded-lg bg-[#C8A45C] text-white hover:bg-[#C8A45C]/90">确认验收</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
