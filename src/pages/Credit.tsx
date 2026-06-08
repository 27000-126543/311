import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'
import { GaugeChart, TrendChart, DistributionChart } from '@/components/credit'
import {
  Award, TrendingUp, TrendingDown, AlertTriangle, Bell,
  ArrowUpDown, Shield, Star, XCircle, List,
} from 'lucide-react'

interface CreditRecord {
  id: string
  created_at: string
  type: string
  score_change: number
  reason: string
  project_id: string
  project: string
}

interface CreditData {
  bidderId: string
  username: string
  orgName: string
  currentScore: number
  totalChange: number
  records: CreditRecord[]
  trend: { month: string; score: number }[]
}

interface AlertItem {
  bidderId: string
  bidderName: string
  score: number
  threshold: number
  message: string
  alertId?: string
  alertStatus?: string
  restricted?: boolean
}

interface BidderScore {
  id: string
  name: string
  score: number
  region: string
  industry: string
}

const typeConfig: Record<string, { bg: string; text: string; label: string }> = {
  bid: { bg: 'bg-blue-100', text: 'text-blue-700', label: '投标' },
  win: { bg: 'bg-green-100', text: 'text-green-700', label: '中标' },
  fulfill: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '履约' },
  breach: { bg: 'bg-red-100', text: 'text-red-700', label: '违约' },
  objection: { bg: 'bg-amber-100', text: 'text-amber-700', label: '异议' },
  penalty: { bg: 'bg-red-100', text: 'text-red-700', label: '处罚' },
  interception: { bg: 'bg-red-100', text: 'text-red-700', label: '拦截' },
}

function TypeBadge({ type }: { type: string }) {
  const c = typeConfig[type] || typeConfig.bid
  return <span className={`text-xs px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>{c.label}</span>
}

function ScoreChange({ change }: { change: number }) {
  if (change > 0) return <span className="text-green-600 font-medium flex items-center gap-0.5"><TrendingUp size={12} />+{change}</span>
  if (change < 0) return <span className="text-red-600 font-medium flex items-center gap-0.5"><TrendingDown size={12} />{change}</span>
  return <span className="text-slate-400">0</span>
}

function CreditAlertCard({ alert, onSend, onRelease }: { alert: AlertItem; onSend: (id: string) => void; onRelease: (alertId: string) => void }) {
  const alreadySent = alert.alertStatus === 'active'
  const isReleased = alert.alertStatus === 'released'

  return (
    <div className={`border rounded-lg p-4 ${isReleased ? 'border-slate-200 bg-slate-50/50' : 'border-red-200 bg-red-50/50'}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={16} className={isReleased ? 'text-slate-400' : 'text-red-500'} />
            <span className={`font-medium text-sm ${isReleased ? 'text-slate-600' : 'text-red-800'}`}>{alert.bidderName}</span>
            {alreadySent && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">已限制投标</span>}
            {isReleased && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">已解除</span>}
          </div>
          <p className={`text-xs ${isReleased ? 'text-slate-500' : 'text-red-600'}`}>{alert.message}</p>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className={isReleased ? 'text-slate-400' : 'text-red-500'}>当前分数：<strong>{alert.score}</strong></span>
            <span className={isReleased ? 'text-slate-400' : 'text-red-400'}>及格线：{alert.threshold}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {!alreadySent && !isReleased && (
            <button
              onClick={() => onSend(alert.bidderId)}
              className="flex items-center gap-1 text-xs bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600"
            >
              <Bell size={12} /> 发送预警
            </button>
          )}
          {alreadySent && alert.alertId && (
            <button
              onClick={() => onRelease(alert.alertId!)}
              className="flex items-center gap-1 text-xs bg-green-500 text-white px-3 py-1.5 rounded hover:bg-green-600"
            >
              <Shield size={12} /> 解除限制
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Credit() {
  const { user, hasRole } = useAuthStore()
  const navigate = useNavigate()
  const [data, setData] = useState<CreditData | null>(null)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [bidders, setBidders] = useState<BidderScore[]>([])
  const [distribution, setDistribution] = useState<{ name: string; value: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'score' | 'name'>('score')

  const isAdmin = hasRole('admin', 'supervisor')

  const loadAlerts = () => {
    api.get<{ success: boolean; data: { lowCreditUsers: any[]; alerts: any[] } }>('/credit/alerts/list').then((res) => {
      const d = (res as any).data || res
      const lowUsers = d.lowCreditUsers || []
      const existingAlerts = d.alerts || []
      const alertMap = new Map<string, any>(existingAlerts.map((a: any) => [a.bidder_id, a] as [string, any]))
      const items: AlertItem[] = []
      for (const u of lowUsers) {
        const existing: any = alertMap.get(u.id)
        items.push({
          bidderId: u.id,
          bidderName: u.org_name || u.username,
          score: u.credit_score,
          threshold: 60,
          message: existing?.message || `信用分数 ${u.credit_score} 分低于及格线，建议限制参与投标`,
          alertId: existing?.id,
          alertStatus: existing?.status,
          restricted: existing?.restricted === 1,
        })
      }
      for (const a of existingAlerts) {
        if (!items.find(i => i.bidderId === a.bidder_id)) {
          const bidder = a.bidder_id
          items.push({
            bidderId: a.bidder_id,
            bidderName: a.bidder_id,
            score: 0,
            threshold: a.threshold || 60,
            message: a.message,
            alertId: a.id,
            alertStatus: a.status,
            restricted: a.restricted === 1,
          })
        }
      }
      setAlerts(items)
    }).catch(() => setAlerts([]))
  }

  useEffect(() => {
    const bidderId = isAdmin ? '' : (user?.id || '')
    if (bidderId) {
      api.get(`/credit/${bidderId}`).then((res) => {
        const d = (res as any).data
        if (d) {
          setData(d)
        }
      }).catch(() => {
        setData(null)
      }).finally(() => setLoading(false))
    } else {
      setData(null)
      setLoading(false)
    }

    if (isAdmin) {
      loadAlerts()
      api.get<any[]>('/credit/bidders/list').then(() => {
        setBidders([
          { id: '1', name: '中建三局', score: 88, region: '华东', industry: '建筑' },
          { id: '2', name: '中铁五局', score: 76, region: '西南', industry: '基建' },
          { id: '3', name: '华信建设', score: 42, region: '华北', industry: '建筑' },
          { id: '4', name: '远东工程', score: 55, region: '东北', industry: '市政' },
          { id: '5', name: '中交二航', score: 82, region: '华中', industry: '基建' },
        ])
      }).catch(() => setBidders([]))
      api.get<{ name: string; value: number }[]>('/credit/distribution/data').then(() => {
        setDistribution([
          { name: '建筑', value: 28 }, { name: '基建', value: 22 },
          { name: '市政', value: 18 }, { name: '信息化', value: 15 },
          { name: '园林', value: 10 }, { name: '其他', value: 7 },
        ])
      }).catch(() => setDistribution([]))
    }
  }, [isAdmin, user?.id])

  const handleSendAlert = async (bidderId: string) => {
    try {
      await api.post(`/credit/alerts/${bidderId}/send`)
      loadAlerts()
    } catch { alert('发送预警失败') }
  }

  const handleReleaseAlert = async (alertId: string) => {
    try {
      await api.post(`/credit/alerts/${alertId}/release`)
      loadAlerts()
    } catch { alert('解除限制失败') }
  }

  if (loading) return <div className="text-center py-20 text-slate-400">加载中...</div>

  const sorted = [...bidders].sort((a, b) => sortBy === 'score' ? b.score - a.score : a.name.localeCompare(b.name))

  const showBidderView = !isAdmin && data

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Award size={24} className="text-[#C8A45C]" />
        <h1 className="text-xl font-semibold text-[#0F2B46]">信用评价</h1>
        {data && !isAdmin && <span className="text-sm text-slate-500">{data.orgName || data.username}</span>}
      </div>

      {showBidderView && (
        <>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-[#0F2B46] mb-4 flex items-center gap-2">
                <Star size={18} className="text-[#C8A45C]" /> 信用评分
              </h3>
              <GaugeChart score={data.currentScore} />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-[#0F2B46] mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-[#C8A45C]" /> 信用趋势（近12月）
              </h3>
              <TrendChart data={data.trend} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-[#0F2B46]">信用记录</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="px-6 py-3 text-left font-medium">时间</th>
                  <th className="px-6 py-3 text-left font-medium">类型</th>
                  <th className="px-6 py-3 text-left font-medium">变动</th>
                  <th className="px-6 py-3 text-left font-medium">原因</th>
                  <th className="px-6 py-3 text-left font-medium">关联项目</th>
                </tr>
              </thead>
              <tbody>
                {data.records.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">暂无信用记录</td></tr>
                ) : (
                  data.records.map((r) => (
                    <tr key={r.id} className="border-t border-slate-50">
                      <td className="px-6 py-3 text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleString('zh-CN') : '—'}</td>
                      <td className="px-6 py-3"><TypeBadge type={r.type} /></td>
                      <td className="px-6 py-3"><ScoreChange change={r.score_change} /></td>
                      <td className="px-6 py-3 text-slate-700">{r.reason || '—'}</td>
                      <td className="px-6 py-3 text-slate-500">{r.project || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!isAdmin && !data && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Award size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">暂无信用数据</p>
        </div>
      )}

      {isAdmin && (
        <>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/restrictions')}
              className="flex items-center gap-2 bg-[#0F2B46] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#0F2B46]/90"
            >
              <List size={16} /> 限制名单
            </button>
          </div>

          {alerts.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-red-700 mb-4 flex items-center gap-2">
                <AlertTriangle size={18} /> 信用预警
              </h3>
              <div className="space-y-3">
                {alerts.map((a) => (
                  <CreditAlertCard key={a.bidderId} alert={a} onSend={handleSendAlert} onRelease={handleReleaseAlert} />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-[#0F2B46]">投标人信用排行</h3>
                <button onClick={() => setSortBy(sortBy === 'score' ? 'name' : 'score')}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#0F2B46]">
                  <ArrowUpDown size={12} /> {sortBy === 'score' ? '按分数' : '按名称'}
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="px-4 py-2 text-left font-medium">投标人</th>
                    <th className="px-4 py-2 text-left font-medium">行业</th>
                    <th className="px-4 py-2 text-right font-medium">分数</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((b) => (
                    <tr key={b.id} className="border-t border-slate-50">
                      <td className="px-4 py-2 font-medium">{b.name}</td>
                      <td className="px-4 py-2 text-slate-500">{b.industry}</td>
                      <td className={`px-4 py-2 text-right font-semibold ${b.score >= 60 ? 'text-green-600' : 'text-red-600'}`}>{b.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-[#0F2B46] mb-4 flex items-center gap-2">
                <Shield size={18} className="text-[#C8A45C]" /> 行业分布
              </h3>
              <DistributionChart data={distribution} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
