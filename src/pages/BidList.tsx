import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Clock, Eye } from 'lucide-react'
import { api } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'

type BidStatus = 'pending' | 'verified' | 'rejected' | 'opened' | 'scored'

interface Bid {
  id: string
  project_id: string
  project_name?: string
  projectName?: string
  quote: number
  status: BidStatus
  created_at: string
  reject_reason?: string
  key_params?: Record<string, string>
  keyParams?: Record<string, string>
}

const statusConfig: Record<BidStatus, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'bg-amber-100 text-amber-700' },
  verified: { label: '已通过', color: 'bg-green-100 text-green-700' },
  rejected: { label: '已退回', color: 'bg-red-100 text-red-700' },
  opened: { label: '已开标', color: 'bg-blue-100 text-blue-700' },
  scored: { label: '已评分', color: 'bg-purple-100 text-purple-700' },
}

const tabs: { key: BidStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'verified', label: '已通过' },
  { key: 'rejected', label: '已退回' },
  { key: 'opened', label: '已开标' },
  { key: 'scored', label: '已评分' },
]

export default function BidList() {
  const user = useAuthStore((s) => s.user)
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<BidStatus | 'all'>('all')

  useEffect(() => {
    if (!user) return
    setLoading(true)
    api.get<{ success: boolean; data: Bid[] }>('/bids?bidderId=' + user.id)
      .then((res) => {
        const list = (res as any).data || res
        setBids(Array.isArray(list) ? list : [])
      })
      .catch(() => setBids([]))
      .finally(() => setLoading(false))
  }, [user])

  const filtered = activeTab === 'all' ? bids : bids.filter((b) => b.status === activeTab)
  const getName = (b: Bid) => b.projectName || b.project_name || '未知项目'
  const getParams = (b: Bid) => b.keyParams || b.key_params
  const getReason = (b: Bid) => b.reject_reason
  const getProjectId = (b: Bid) => b.project_id
  const getTime = (b: Bid) => b.created_at ? new Date(b.created_at).toLocaleString('zh-CN') : '--'

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0F2B46]">我的投标</h1>
        <p className="text-slate-500 mt-1">查看和管理您提交的所有投标</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-[#0F2B46] text-[#C8A45C]'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <FileText size={48} className="mx-auto mb-3 opacity-50" />
          <p>暂无投标记录</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((bid) => (
            <div
              key={bid.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Link
                      to={`/projects/${getProjectId(bid)}`}
                      className="text-lg font-semibold text-[#0F2B46] hover:text-[#C8A45C] transition-colors truncate"
                    >
                      {getName(bid)}
                    </Link>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[bid.status].color}`}>
                      {statusConfig[bid.status].label}
                    </span>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-slate-500">
                    <span>
                      投标报价：<span className="text-[#0F2B46] font-semibold">¥{bid.quote.toLocaleString()}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      提交时间：{getTime(bid)}
                    </span>
                  </div>

                  {getParams(bid) && Object.keys(getParams(bid)!).length > 0 && (
                    <div className="mt-2 flex gap-3 flex-wrap">
                      {Object.entries(getParams(bid)!).map(([k, v]) => (
                        <span key={k} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                          {k}：{v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {(bid.status === 'verified' || bid.status === 'rejected') && (
                  <Link
                    to={`/bids/verify/${bid.id}`}
                    className="flex items-center gap-1 text-sm text-[#C8A45C] hover:text-[#A8893E] transition-colors ml-4 shrink-0"
                  >
                    <Eye size={16} />
                    查看校验结果
                  </Link>
                )}
              </div>

              {bid.status === 'rejected' && getReason(bid) && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600">
                  退回原因：{getReason(bid)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
