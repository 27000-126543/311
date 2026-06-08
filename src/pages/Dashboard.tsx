import { useEffect, useState, useCallback } from 'react'
import ReactECharts from 'echarts-for-react'
import { Activity, DollarSign, TrendingDown, Users } from 'lucide-react'
import { api } from '@/utils/api'

interface OverviewData {
  summary: { totalProjects: number; totalBids: number; totalContracts: number; totalUsers: number; totalBudget: number; avgCreditScore: number }
  today: { newProjects: number; newBids: number }
  projectStatus: { bidding: number; evaluating: number; awarded: number }
  statusDistribution: { status: string; count: number }[]
  creditDistribution: { level: string; count: number }[]
  monthlyTrends: { month: string; projects: number; bids: number }[]
}

interface RecentProject {
  name: string
  industry: string
  budget: number
  status: string
  bid_count?: number
}

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-500/20 text-gray-300' },
  published: { label: '已发布', color: 'bg-blue-500/20 text-blue-300' },
  bidding: { label: '招标中', color: 'bg-amber-500/20 text-amber-300' },
  evaluating: { label: '评标中', color: 'bg-purple-500/20 text-purple-300' },
  awarded: { label: '已定标', color: 'bg-green-500/20 text-green-300' },
  contracted: { label: '已签约', color: 'bg-emerald-500/20 text-emerald-300' },
  completed: { label: '已完成', color: 'bg-emerald-600/20 text-emerald-300' },
  failed: { label: '已流标', color: 'bg-red-500/20 text-red-300' },
}

const statCards = [
  { key: 'todayTx', label: '今日交易量', icon: Activity, fmt: (v: number) => String(v), color: 'text-blue-400' },
  { key: 'totalAmt', label: '成交金额(万元)', icon: DollarSign, fmt: (v: number) => (v / 10000).toFixed(1), color: 'text-[#C8A45C]' },
  { key: 'failRate', label: '流标率', icon: TrendingDown, fmt: (v: number) => v.toFixed(1) + '%', color: 'text-red-400' },
  { key: 'expertRate', label: '专家使用率', icon: Users, fmt: (v: number) => v.toFixed(1) + '%', color: 'text-emerald-400' },
]

function StatCard({ card, value }: { card: typeof statCards[number]; value: number }) {
  const Icon = card.icon
  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-5 hover:shadow-[0_0_20px_rgba(200,164,92,0.15)] transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/60 text-sm">{card.label}</span>
        <Icon size={20} className={card.color} />
      </div>
      <div className="text-3xl font-bold text-white">{card.fmt(value)}</div>
    </div>
  )
}

function monthlyOption(data: OverviewData['monthlyTrends']) {
  return {
    backgroundColor: 'transparent',
    textStyle: { color: '#fff' },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,43,70,0.9)', borderColor: '#C8A45C', textStyle: { color: '#fff' } },
    legend: { textStyle: { color: '#fff' }, top: 0, data: ['项目数', '投标数'] },
    grid: { left: 50, right: 50, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: data.map((d: { month: string }) => d.month), axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } }, axisLabel: { color: '#fff' } },
    yAxis: [
      { type: 'value', name: '项目', nameTextStyle: { color: 'rgba(255,255,255,0.5)' }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }, axisLabel: { color: '#fff' } },
      { type: 'value', name: '投标', nameTextStyle: { color: 'rgba(255,255,255,0.5)' }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } }, splitLine: { show: false }, axisLabel: { color: '#fff' } },
    ],
    series: [
      { name: '项目数', type: 'bar', data: data.map((d: { projects: number }) => d.projects), itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#1e3a5f' }] } }, barWidth: 18 },
      { name: '投标数', type: 'line', yAxisIndex: 1, data: data.map((d: { bids: number }) => d.bids), itemStyle: { color: '#C8A45C' }, lineStyle: { color: '#C8A45C', width: 2 }, smooth: true, symbol: 'circle', symbolSize: 6 },
    ],
  }
}

function creditOption(data: OverviewData['creditDistribution']) {
  const levels = ['较差', '一般', '良好', '优秀']
  const sorted = levels.map(l => data.find(d => d.level === l) || { level: l, count: 0 })
  const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981']
  return {
    backgroundColor: 'transparent',
    textStyle: { color: '#fff' },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,43,70,0.9)', borderColor: '#C8A45C', textStyle: { color: '#fff' } },
    grid: { left: 60, right: 30, top: 10, bottom: 30 },
    xAxis: { type: 'value', axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }, axisLabel: { color: '#fff' } },
    yAxis: { type: 'category', data: sorted.map(d => d.level), axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } }, axisLabel: { color: '#fff' } },
    series: [{ type: 'bar', data: sorted.map((d: { count: number }, i: number) => ({ value: d.count, itemStyle: { color: colors[i], borderRadius: [0, 4, 4, 0] } })), barWidth: 20 }],
  }
}

export default function Dashboard() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [projects, setProjects] = useState<RecentProject[]>([])

  const fetchData = useCallback(async () => {
    try {
      const [ovRes, pjRes] = await Promise.all([
        api.get<any>('/analytics/overview'),
        api.get<any>('/projects?pageSize=5'),
      ])
      if (ovRes.data) setOverview(ovRes.data)
      if (pjRes.data?.list) setProjects(pjRes.data.list)
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, 5000)
    return () => clearInterval(timer)
  }, [fetchData])

  if (!overview) return (
    <div className="min-h-full bg-[#0a1628] -m-6 p-6 flex items-center justify-center text-white/40">
      数据加载中...
    </div>
  )

  const { summary, today, statusDistribution, creditDistribution, monthlyTrends } = overview
  const totalP = statusDistribution.reduce((s, d) => s + d.count, 0) || 1
  const failedCount = statusDistribution.find(d => d.status === 'failed')?.count || 0
  const values = [
    today.newBids + today.newProjects,
    summary.totalBudget,
    (failedCount / totalP) * 100,
    Math.min(95, (summary.totalBids / Math.max(summary.totalProjects, 1)) * 30),
  ]

  return (
    <div className="min-h-full bg-[#0a1628] -m-6 p-6 space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-white text-xl font-semibold">数据概览</h1>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          实时
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {statCards.map((card, i) => <StatCard key={card.key} card={card} value={values[i]} />)}
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <h3 className="text-white/80 text-sm mb-2">月度交易趋势</h3>
          <ReactECharts option={monthlyOption(monthlyTrends)} style={{ height: 280 }} />
        </div>
        <div className="col-span-2 bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <h3 className="text-white/80 text-sm mb-2">信用分分布</h3>
          <ReactECharts option={creditOption(creditDistribution)} style={{ height: 280 }} />
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
        <h3 className="text-white/80 text-sm mb-3">最近项目</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/40 border-b border-white/10">
              <th className="text-left py-2 font-normal">项目名称</th>
              <th className="text-left py-2 font-normal">行业</th>
              <th className="text-right py-2 font-normal">预算</th>
              <th className="text-center py-2 font-normal">状态</th>
              <th className="text-right py-2 font-normal">投标数</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p, i) => (
              <tr key={i} className="border-b border-white/5 text-white/80">
                <td className="py-2.5">{p.name}</td>
                <td className="py-2.5">{p.industry}</td>
                <td className="py-2.5 text-right">{(p.budget / 10000).toFixed(1)}万</td>
                <td className="py-2.5 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusMap[p.status]?.color || 'bg-gray-500/20 text-gray-300'}`}>
                    {statusMap[p.status]?.label || p.status}
                  </span>
                </td>
                <td className="py-2.5 text-right">{p.bid_count ?? '-'}</td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-center text-white/30">暂无项目</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
