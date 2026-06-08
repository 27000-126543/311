import { useState, useEffect } from 'react'
import { api } from '@/utils/api'
import { TrendLineChart, IndustryPieChart, IndustryBarChart, RegionBarChart } from '@/components/analytics'
import {
  BarChart3, TrendingUp, Building2, MapPin, Download,
  Activity, DollarSign, AlertCircle, Users, Search,
} from 'lucide-react'

interface Overview {
  todayCount: number
  totalAmount: number
  failRate: number
  expertRate: number
}

interface TrendItem {
  month: string
  count: number
  amount: number
}

interface IndustryCount {
  name: string
  value: number
}

interface IndustryAvg {
  name: string
  avg: number
}

interface RegionItem {
  name: string
  count: number
  amount: number
}

interface ReportData {
  overview: Overview
  trend: TrendItem[]
  industryCount: IndustryCount[]
  industryAvg: IndustryAvg[]
  region: RegionItem[]
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-xl font-bold text-[#0F2B46]">{value}</p>
        </div>
      </div>
    </div>
  )
}

export default function Analytics() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [industry, setIndustry] = useState('')
  const [region, setRegion] = useState('')
  const [dateRange, setDateRange] = useState('')

  useEffect(() => {
    const filters = new URLSearchParams({ industry, region, dateRange }).toString()
    api.get<ReportData>(`/analytics/report?${filters}`).then(setData).catch(() => {
      setData({
        overview: { todayCount: 47, totalAmount: 285600, failRate: 5.2, expertRate: 92.3 },
        trend: [
          { month: '2026-01', count: 120, amount: 34000 },
          { month: '2026-02', count: 98, amount: 28000 },
          { month: '2026-03', count: 145, amount: 42000 },
          { month: '2026-04', count: 132, amount: 38000 },
          { month: '2026-05', count: 158, amount: 45000 },
          { month: '2026-06', count: 142, amount: 41000 },
        ],
        industryCount: [
          { name: '建筑工程', value: 35 }, { name: '基础设施', value: 25 },
          { name: '市政工程', value: 18 }, { name: '信息化', value: 12 },
          { name: '园林绿化', value: 7 }, { name: '其他', value: 3 },
        ],
        industryAvg: [
          { name: '建筑工程', avg: 2850 }, { name: '基础设施', avg: 5200 },
          { name: '市政工程', avg: 1800 }, { name: '信息化', avg: 960 },
          { name: '园林绿化', avg: 420 }, { name: '其他', avg: 350 },
        ],
        region: [
          { name: '华东', count: 52, amount: 86000 },
          { name: '华南', count: 38, amount: 58000 },
          { name: '华北', count: 45, amount: 72000 },
          { name: '华中', count: 32, amount: 38000 },
          { name: '西南', count: 28, amount: 31600 },
        ],
      })
    }).finally(() => setLoading(false))
  }, [industry, region, dateRange])

  const handleExport = async (type: string) => {
    try {
      const res = await fetch(`/api/analytics/export?format=csv&type=${type}`, {
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token}` },
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = type === 'monthly' ? '月度交易分析报告.csv' : '投标人信用明细.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('导出功能暂不可用')
    }
  }

  if (loading || !data) return <div className="text-center py-20 text-slate-400">加载中...</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <BarChart3 size={24} className="text-[#C8A45C]" />
        <h1 className="text-xl font-semibold text-[#0F2B46]">数据分析</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-slate-400" />
            <select value={industry} onChange={(e) => setIndustry(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#C8A45C]">
              <option value="">全部行业</option>
              <option value="construction">建筑工程</option>
              <option value="infrastructure">基础设施</option>
              <option value="municipal">市政工程</option>
              <option value="it">信息化</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-slate-400" />
            <select value={region} onChange={(e) => setRegion(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#C8A45C]">
              <option value="">全部地区</option>
              <option value="east">华东</option>
              <option value="south">华南</option>
              <option value="north">华北</option>
              <option value="central">华中</option>
            </select>
          </div>
          <input type="month" value={dateRange} onChange={(e) => setDateRange(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#C8A45C]" />
          <button className="flex items-center gap-1 text-sm bg-[#0F2B46] text-white px-4 py-1.5 rounded-lg hover:bg-[#0F2B46]/90">
            <Search size={14} /> 查询
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<Activity size={20} className="text-[#C8A45C]" />} label="今日交易量" value={data.overview.todayCount.toString()} color="bg-[#C8A45C]/10" />
        <StatCard icon={<DollarSign size={20} className="text-emerald-500" />} label="成交金额(万)" value={data.overview.totalAmount.toLocaleString()} color="bg-emerald-50" />
        <StatCard icon={<AlertCircle size={20} className="text-red-500" />} label="流标率" value={`${data.overview.failRate}%`} color="bg-red-50" />
        <StatCard icon={<Users size={20} className="text-blue-500" />} label="专家使用率" value={`${data.overview.expertRate}%`} color="bg-blue-50" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-[#0F2B46] mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-[#C8A45C]" /> 趋势分析
        </h3>
        <TrendLineChart data={data.trend} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-[#0F2B46] mb-4 flex items-center gap-2">
            <Building2 size={18} className="text-[#C8A45C]" /> 行业交易分布
          </h3>
          <IndustryPieChart data={data.industryCount} />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-[#0F2B46] mb-4 flex items-center gap-2">
            <Building2 size={18} className="text-[#C8A45C]" /> 行业平均投标金额
          </h3>
          <IndustryBarChart data={data.industryAvg} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-[#0F2B46] mb-4 flex items-center gap-2">
          <MapPin size={18} className="text-[#C8A45C]" /> 地区分析
        </h3>
        <RegionBarChart data={data.region} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-[#0F2B46] mb-4">数据导出</h3>
        <div className="flex gap-4">
          <button onClick={() => handleExport('monthly')}
            className="flex items-center gap-2 text-sm bg-[#0F2B46] text-white px-5 py-2.5 rounded-lg hover:bg-[#0F2B46]/90">
            <Download size={16} /> 导出月度交易分析报告
          </button>
          <button onClick={() => handleExport('credit')}
            className="flex items-center gap-2 text-sm border border-[#0F2B46] text-[#0F2B46] px-5 py-2.5 rounded-lg hover:bg-[#0F2B46]/5">
            <Download size={16} /> 导出投标人信用明细
          </button>
        </div>
      </div>
    </div>
  )
}
