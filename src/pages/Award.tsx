import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'
import {
  Trophy, Clock, AlertTriangle, Send, Upload, X,
  ChevronDown, ChevronUp, Stamp, FileText, Check, Ban,
} from 'lucide-react'

interface Bidder {
  id: string
  name: string
  quote: number
  score: number
  rank: number
}

interface Objection {
  id: string
  content: string
  evidence: string[]
  submitter_name?: string
  submitter_org?: string
  created_at: string
  level1_status: string
  level1_comment?: string
  level2_status: string
  level2_comment?: string
  level3_status: string
  level3_comment?: string
}

interface AwardData {
  projectName: string
  winner: { name: string; quote: number; score: number }
  publicityStart: string
  publicityEnd: string
  bidders: Bidder[]
  objections?: Objection[]
}

function ApprovalFlow({ obj }: { obj: Objection }) {
  const levels = [
    { label: '招标人', status: obj.level1_status, comment: obj.level1_comment },
    { label: '交易中心', status: obj.level2_status, comment: obj.level2_comment },
    { label: '监管部门', status: obj.level3_status, comment: obj.level3_comment },
  ]
  return (
    <div className="flex items-center gap-2 mt-2 flex-wrap">
      {levels.map((a, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
            a.status === 'approved' ? 'bg-green-100 text-green-700' :
            a.status === 'rejected' ? 'bg-red-100 text-red-700' :
            'bg-amber-100 text-amber-700'
          }`}>
            {a.status === 'approved' ? <Check size={12} /> :
             a.status === 'rejected' ? <Ban size={12} /> :
             <Clock size={12} />}
            {a.label}
          </div>
          {a.comment && <span className="text-xs text-slate-400">({a.comment})</span>}
          {i < levels.length - 1 && <span className="text-slate-300">→</span>}
        </div>
      ))}
    </div>
  )
}

function ObjectionCard({ obj, userRole, onAction }: {
  obj: Objection
  userRole: string
  onAction: (objId: string, level: string, action: 'approved' | 'rejected', comment: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [comment, setComment] = useState('')
  const isTimeout = (Date.now() - new Date(obj.created_at).getTime()) > 72 * 3600 * 1000

  const getNextLevel = (): string | null => {
    if (obj.level1_status === 'pending' && (userRole === 'tenderer' || userRole === 'admin')) return 'tenderer'
    if (obj.level1_status === 'approved' && obj.level2_status === 'pending' && (userRole === 'admin')) return 'center'
    if (obj.level2_status === 'approved' && obj.level3_status === 'pending' && (userRole === 'supervisor' || userRole === 'admin')) return 'supervisor'
    return null
  }
  const nextLevel = getNextLevel()

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white">
      <div className="flex justify-between items-start cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1">
          <p className="text-sm text-slate-700">{obj.content}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            <span>{obj.submitter_name || obj.submitter_org || '匿名'}</span>
            <span>{new Date(obj.created_at).toLocaleString('zh-CN')}</span>
          </div>
          <ApprovalFlow obj={obj} />
        </div>
        <div className="flex items-center gap-2">
          {isTimeout && (
            <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">
              <AlertTriangle size={12} /> 超72小时
            </span>
          )}
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {expanded && nextLevel && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
          <span className="text-xs text-slate-500">{nextLevel === 'tenderer' ? '招标人' : nextLevel === 'center' ? '交易中心' : '监管部门'}审批:</span>
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="审批意见"
            className="flex-1 text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-[#C8A45C]"
          />
          <button onClick={() => { onAction(obj.id, nextLevel, 'approved', comment); setComment('') }}
            className="text-xs bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">通过</button>
          <button onClick={() => { onAction(obj.id, nextLevel, 'rejected', comment); setComment('') }}
            className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">驳回</button>
        </div>
      )}
    </div>
  )
}

export default function Award() {
  const { projectId } = useParams<{ projectId: string }>()
  const user = useAuthStore((s) => s.user)
  const userRole = user?.role || ''
  const [data, setData] = useState<AwardData | null>(null)
  const [objections, setObjections] = useState<Objection[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formContent, setFormContent] = useState('')
  const [formEvidence, setFormEvidence] = useState<string[]>([])

  const loadData = () => {
    api.get<{ success: boolean; data: any }>(`/awards/${projectId}`).then((res) => {
      const d = (res as any).data || res
      if (d && d.winner_bid_id) {
        setData({
          projectName: '中标项目',
          winner: { name: '中标候选人', quote: 0, score: 0 },
          publicityStart: d.published_at ? d.published_at.substring(0, 10) : '',
          publicityEnd: d.published_at ? new Date(new Date(d.published_at).getTime() + 7 * 86400000).toISOString().substring(0, 10) : '',
          bidders: [],
        })
      }
    }).catch(() => {
      setData({
        projectName: '示范项目招标',
        winner: { name: '中建三局', quote: 12500000, score: 92.5 },
        publicityStart: '2026-06-01',
        publicityEnd: '2026-06-07',
        bidders: [
          { id: '1', name: '中建三局', quote: 12500000, score: 92.5, rank: 1 },
          { id: '2', name: '中铁五局', quote: 13100000, score: 85.3, rank: 2 },
          { id: '3', name: '中交二航', quote: 12800000, score: 81.7, rank: 3 },
        ],
        objections: [],
      })
    })

    api.get<{ success: boolean; data: Objection[] }>(`/objections/${projectId}`).then((res) => {
      const list = (res as any).data || res
      setObjections(Array.isArray(list) ? list : [])
    }).catch(() => setObjections([]))
  }

  useEffect(() => { loadData() }, [projectId])

  if (!data) return <div className="text-center py-20 text-slate-400">加载中...</div>

  const daysLeft = Math.max(0, Math.ceil(
    (new Date(data.publicityEnd).getTime() - Date.now()) / 86400000
  ))

  const handleSubmitObjection = async () => {
    if (!formContent.trim() || !user) return
    try {
      await api.post('/objections', {
        projectId,
        submitterId: user.id,
        content: formContent,
        evidence: formEvidence,
      })
      setFormContent('')
      setFormEvidence([])
      setShowForm(false)
      loadData()
    } catch {
      alert('提交异议失败')
    }
  }

  const handleApproval = async (objId: string, level: string, action: 'approved' | 'rejected', comment: string) => {
    try {
      await api.post(`/objections/${objId}/approve`, { level, approved: action === 'approved', comment })
      loadData()
    } catch {
      alert('审批操作失败')
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="relative bg-white rounded-xl border-4 border-double border-red-700/30 p-8 overflow-hidden">
        <div className="absolute top-6 right-8 opacity-10">
          <Stamp size={120} className="text-red-600" />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-[#C8A45C] tracking-widest">中标公示</h1>
          <div className="mt-2 h-0.5 w-32 mx-auto bg-gradient-to-r from-transparent via-[#C8A45C] to-transparent" />
        </div>
        <div className="space-y-4">
          <div className="text-center">
            <span className="text-lg font-semibold text-[#0F2B46]">{data.projectName}</span>
          </div>
          <div className="bg-gradient-to-r from-[#C8A45C]/10 to-[#C8A45C]/5 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={20} className="text-[#C8A45C]" />
              <span className="font-semibold text-[#0F2B46]">中标候选人</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-slate-500">名称：</span><span className="font-semibold">{data.winner.name}</span></div>
              <div><span className="text-slate-500">报价：</span><span className="font-semibold text-[#C8A45C]">¥{data.winner.quote.toLocaleString()}</span></div>
              <div><span className="text-slate-500">得分：</span><span className="font-semibold text-[#C8A45C]">{data.winner.score}</span></div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm bg-slate-50 rounded-lg p-4">
            <div><span className="text-slate-500">公示期：</span>{data.publicityStart} 至 {data.publicityEnd}</div>
            <div className={`flex items-center gap-2 font-semibold ${daysLeft > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              <Clock size={16} />
              {daysLeft > 0 ? `剩余 ${daysLeft} 天` : '公示已结束'}
            </div>
          </div>
        </div>
      </div>

      {data.bidders.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <FileText size={18} className="text-[#0F2B46]" />
            <h2 className="font-semibold text-[#0F2B46]">投标人列表</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="px-6 py-3 text-left font-medium">排名</th>
                <th className="px-6 py-3 text-left font-medium">投标人</th>
                <th className="px-6 py-3 text-right font-medium">报价（元）</th>
                <th className="px-6 py-3 text-right font-medium">得分</th>
              </tr>
            </thead>
            <tbody>
              {data.bidders.map((b) => (
                <tr key={b.id} className={`border-t border-slate-50 ${b.rank === 1 ? 'bg-[#C8A45C]/5' : ''}`}>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      b.rank === 1 ? 'bg-[#C8A45C] text-white' : 'bg-slate-200 text-slate-600'
                    }`}>{b.rank}</span>
                  </td>
                  <td className="px-6 py-3 font-medium">{b.name}</td>
                  <td className="px-6 py-3 text-right">¥{b.quote.toLocaleString()}</td>
                  <td className="px-6 py-3 text-right font-semibold">{b.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#0F2B46] flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" /> 异议提交
          </h2>
          {!showForm && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1 text-sm bg-[#0F2B46] text-white px-4 py-2 rounded-lg hover:bg-[#0F2B46]/90">
              <Send size={14} /> 提交异议
            </button>
          )}
        </div>
        {showForm && (
          <div className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50">
            <textarea value={formContent} onChange={(e) => setFormContent(e.target.value)}
              placeholder="请输入异议内容..." rows={4}
              className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-[#C8A45C] resize-none" />
            <div
              onClick={() => setFormEvidence([...formEvidence, `证据材料_${formEvidence.length + 1}.pdf`])}
              className="border border-dashed border-slate-300 rounded-lg p-4 text-center text-sm text-slate-400 cursor-pointer hover:border-[#C8A45C]"
            >
              <Upload size={20} className="mx-auto mb-1" /> 点击上传证据材料
            </div>
            {formEvidence.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formEvidence.map((e, i) => (
                  <span key={i} className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded flex items-center gap-1">
                    {e}
                    <X size={12} className="cursor-pointer" onClick={() => setFormEvidence(formEvidence.filter((_, idx) => idx !== i))} />
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowForm(false); setFormEvidence([]) }} className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100">取消</button>
              <button onClick={handleSubmitObjection} disabled={!formContent.trim()} className="text-sm px-4 py-2 rounded-lg bg-[#C8A45C] text-white hover:bg-[#C8A45C]/90 disabled:opacity-50">提交</button>
            </div>
          </div>
        )}
      </div>

      {objections.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-[#0F2B46] mb-4 flex items-center gap-2">
            <X size={18} className="text-red-500" /> 异议列表
          </h2>
          <div className="space-y-3">
            {objections.map((obj) => (
              <ObjectionCard key={obj.id} obj={obj} userRole={userRole} onAction={handleApproval} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
