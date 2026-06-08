import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/utils/api'
import { AlertTriangle, Clock, ChevronRight, Ban } from 'lucide-react'

interface OverdueMilestone {
  id: string
  contract_id: string
  name: string
  planned_date: string
  actual_date: string | null
  payment_amount: number
  acceptance_result: string
  acceptance_opinion: string
  status: string
  project_id: string
  project_name: string
  attachments: any[]
}

export default function OverdueMilestones() {
  const navigate = useNavigate()
  const [milestones, setMilestones] = useState<OverdueMilestone[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/contracts/overdue/milestones')
      .then((res) => {
        const d = (res as any).data
        if (d) setMilestones(d)
      })
      .catch(() => setMilestones([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-20 text-slate-400">加载中...</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <AlertTriangle size={24} className="text-red-500" />
        <h1 className="text-xl font-semibold text-[#0F2B46]">逾期履约列表</h1>
        <span className="text-sm text-slate-500">共 {milestones.length} 个逾期节点</span>
      </div>

      {milestones.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Clock size={48} className="mx-auto text-green-300 mb-4" />
          <p className="text-slate-500">当前无逾期履约节点</p>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((m) => (
            <div key={m.id} className="bg-white rounded-xl border border-red-200 p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Ban size={16} className="text-red-500" />
                    <h4 className="font-medium text-red-800">{m.name}</h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">已逾期</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">所属项目</span>
                      <p className="font-medium text-[#0F2B46]">{m.project_name || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">计划完成</span>
                      <p className="font-medium text-red-600">{m.planned_date}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">付款金额</span>
                      <p className="font-semibold text-[#C8A45C]">¥{m.payment_amount?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">逾期天数</span>
                      <p className="font-bold text-red-600">
                        {Math.floor((new Date().getTime() - new Date(m.planned_date).getTime()) / 86400000)} 天
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/contracts/${m.project_id}`)}
                  className="flex items-center gap-1 text-sm text-[#C8A45C] hover:text-[#C8A45C]/80 shrink-0 ml-4"
                >
                  查看合同 <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
