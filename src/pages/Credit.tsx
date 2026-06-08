import { useState, useEffect } from 'react'
import { api } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'
import { GaugeChart, TrendChart, DistributionChart } from '@/components/credit'
import {
  Award, TrendingUp, TrendingDown, AlertTriangle, Bell,
  ArrowUpDown, Shield, Star, XCircle,
} from 'lucide-react'

interface CreditRecord {
  id: string
  time: string
  type: string
  change: number
  reason: string
  project: string
}

interface CreditData {
  score: number
  trend: { month: string; score: number }[]
  records: CreditRecord[]
}

interface AlertItem {
  bidderId: string
  bidderName: string
  score: number
  threshold: number
  message: string
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

function CreditAlertCard({ alert, onSend }: { alert: AlertItem; onSend: (id: string) => void }) {
  return (
    <div className="border border-red-200 bg-red-50/50 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={16} className="text-red-500" />
            <span className="font-medium text-sm text-red-800">{alert.bidderName}</span>
          </div>
          <p className="text-xs text-red-600">{alert.message}</p>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="text-red-500">当前分数：<strong>{alert.score}</strong></span>
            <span className="text-red-400">及格线：{alert.threshold}</span>
          </div>
        </div>
        <button
          onClick={() => onSend(alert.bidderId)}
          className="flex items-center gap-1 text-xs bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 shrink-0"
        >
          <Bell size={12} /> 发送预警
        </button>
      </div>
    </div>
  )
}

export default function Credit() {
  const { user, hasRole } = useAuthStore()
  const [data, setData] = useState<CreditData | null>(null)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [bidders, setBidders] = useState<BidderScore[]>([])
  const [distribution, setDistribution] = useState<{ name: string; value: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'score' | 'name'>('score')

  const isAdmin = hasRole('admin', 'supervisor')

  useEffect(() => {
    const bidderId = isAdmin ? '' : (user?.id || '')
    api.get<CreditData>(`/credit/${bidderId}`).then(setData).catch(() => {
      setData({
        score: 78,
        trend: [
          { month: '2025-07', score: 72 }, { month: '2025-08', score: 71 },
          { month: '2025-09', score: 74 }, { month: '2025-10', score: 73 },
          { month: '2025-11', score: 76 }, { month: '2025-12', score: 75 },
          { month: '2026-01', score: 77 }, { month: '2026-02', score: 76 },
          { month: '2026-03', score: 79 }, { month: '2026-04', score: 78 },
          { month: '2026-05', score: 80 }, { month: '2026-06', score: 78 },
        ],
        records: [
          { id: '1', time: '2026-06-01', type: 'win', change: 5, reason: '中标优质项目', project: '市政道路改造' },
          { id: '2', time: '2026-05-15', type: 'fulfill', change: 3, reason: '按时完成履约', project: '智慧校园建设' },
          { id: '3', time: '2026-04-20', type: 'bid', change: 1, reason: '正常参与投标', project: '供水管网改造' },
          { id: '4', time: '2026-03-10', type: 'objection', change: -2, reason: '异议被驳回', project: '桥梁加固工程' },
          { id: '5', time: '2026-02-01', type: 'penalty', change: -8, reason: '违规串标处罚', project: '园林景观项目' },
        ],
      })
    }).finally(() => setLoading(false))

    if (isAdmin) {
      api.get<AlertItem[]>('/credit/alerts/list').then(setAlerts).catch(() => {
        setAlerts([
          { bidderId: 'B001', bidderName: '华信建设', score: 42, threshold: 60, message: '信用分数严重低于及格线，建议限制参与投标' },
          { bidderId: 'B002', bidderName: '远东工程', score: 55, threshold: 60, message: '信用分数低于及格线，需关注履约情况' },
        ])
      })
      api.get<BidderScore[]>('/credit/bidders/list').then(setBidders).catch(() => {
        setBidders([
          { id: '1', name: '中建三局', score: 88, region: '华东', industry: '建筑' },
          { id: '2', name: '中铁五局', score: 76, region: '西南', industry: '基建' },
          { id: '3', name: '华信建设', score: 42, region: '华北', industry: '建筑' },
          { id: '4', name: '远东工程', score: 55, region: '东北', industry: '市政' },
          { id: '5', name: '中交二航', score: 82, region: '华中', industry: '基建' },
        ])
      })
      api.get<{ name: string; value: number }[]>('/credit/distribution/data').then(setDistribution).catch(() => {
        setDistribution([
          { name: '建筑', value: 28 }, { name: '基建', value: 22 },
          { name: '市政', value: 18 }, { name: '信息化', value: 15 },
          { name: '园林', value: 10 }, { name: '其他', value: 7 },
        ])
      })
    }
  }, [isAdmin, user?.id])

  if (loading || !data) return <div className="text-center py-20 text-slate-400">加载中...</div>

  const sorted = [...bidders].sort((a, b) => sortBy === 'score' ? b.score - a.score : a.name.localeCompare(b.name))

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Award size={24} className="text-[#C8A45C]" />
        <h1 className="text-xl font-semibold text-[#0F2B46]">信用评价</h1>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-[#0F2B46] mb-4 flex items-center gap-2">
            <Star size={18} className="text-[#C8A45C]" /> 信用评分
          </h3>
          <GaugeChart score={data.score} />
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
            {data.records.map((r) => (
              <tr key={r.id} className="border-t border-slate-50">
                <td className="px-6 py-3 text-slate-500">{r.time}</td>
                <td className="px-6 py-3"><TypeBadge type={r.type} /></td>
                <td className="px-6 py-3"><ScoreChange change={r.change} /></td>
                <td className="px-6 py-3 text-slate-700">{r.reason}</td>
                <td className="px-6 py-3 text-slate-500">{r.project}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <>
          {alerts.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-red-700 mb-4 flex items-center gap-2">
                <AlertTriangle size={18} /> 信用预警
              </h3>
              <div className="space-y-3">
                {alerts.map((a) => (
                  <CreditAlertCard key={a.bidderId} alert={a} onSend={async (id) => {
                    await api.post(`/credit/alerts/${id}/send`)
                  }} />
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
