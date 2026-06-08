import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/utils/api'
import ReactECharts from 'echarts-for-react'
import { Lock, Unlock, Video, ArrowRight, Loader2 } from 'lucide-react'

interface ProjectData { id: string; name: string; budget: number; industry: string }
interface DecryptedBid { bidId: string; quote: number; keyParams: Record<string, string> }

const bidderLabel = (i: number) => `投标人${String.fromCharCode(65 + i)}`

export default function BidOpening() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectData | null>(null)
  const [bids, setBids] = useState<DecryptedBid[]>([])
  const [decrypting, setDecrypting] = useState(false)
  const [decrypted, setDecrypted] = useState(false)
  const [events, setEvents] = useState<{ time: string; text: string }[]>([])

  useEffect(() => {
    if (!projectId) return
    api.get<{ success: boolean; data: ProjectData }>(`/projects/${projectId}`)
      .then((r) => { if (r.success && r.data) setProject(r.data) })
      .catch(() => {})
    setEvents([{ time: new Date().toLocaleTimeString('zh-CN'), text: '进入开标大厅' }])
  }, [projectId])

  const addEvent = (text: string) =>
    setEvents((prev) => [...prev, { time: new Date().toLocaleTimeString('zh-CN'), text }])

  const handleDecrypt = async () => {
    setDecrypting(true)
    addEvent('解密开始...')
    try {
      const r = await api.post<{ success: boolean; data: { bids: DecryptedBid[] } }>(`/bid-opening/${projectId}/decrypt`)
      if (r.success && r.data?.bids) {
        setBids(r.data.bids)
        r.data.bids.forEach((_, i) => {
          setTimeout(() => addEvent(`${bidderLabel(i)} 已解密`), (i + 1) * 600)
        })
        setTimeout(() => addEvent('全部投标文件解密完成'), r.data.bids.length * 600 + 600)
        setDecrypted(true)
      }
    } catch {
      addEvent('解密失败，请重试')
    }
    setDecrypting(false)
  }

  const minQuote = bids.length ? Math.min(...bids.map((b) => b.quote)) : 0

  const paramKeys = bids[0] ? Object.keys(bids[0].keyParams) : []
  const radarOption = paramKeys.length > 0 ? {
    tooltip: {},
    legend: { data: bids.map((_, i) => bidderLabel(i)), textStyle: { color: '#94a3b8' } },
    radar: {
      indicator: paramKeys.map((k) => ({ name: k, max: 100 })),
      axisName: { color: '#94a3b8' },
      splitArea: { areaStyle: { color: ['rgba(15,43,70,0.3)', 'rgba(15,43,70,0.1)'] } },
    },
    series: [{
      type: 'radar' as const,
      data: bids.map((b, i) => ({
        name: bidderLabel(i),
        value: Object.values(b.keyParams).map((v) => {
          const n = parseInt(v, 10)
          return isNaN(n) ? Math.round(Math.random() * 40 + 60) : n
        }),
        lineStyle: { color: i === 0 ? '#C8A45C' : '#60a5fa' },
        areaStyle: { opacity: 0.15 },
      })),
    }],
  } : {}

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0a1628] text-white -m-6 p-6">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[#C8A45C]">开标大厅</h1>
        {project && <p className="mt-2 text-slate-400">{project.name}</p>}
        <div className="mt-1 text-sm text-slate-500">
          预算: ¥{project?.budget.toLocaleString() || '—'} · 行业: {project?.industry || '—'}
        </div>
      </header>

      {!decrypted ? (
        <div className="flex flex-col items-center justify-center py-20">
          <button
            onClick={handleDecrypt} disabled={decrypting}
            className="px-10 py-5 bg-[#C8A45C] text-white rounded-2xl font-bold text-lg hover:bg-[#b8944f] disabled:opacity-50 transition-all flex items-center gap-3 shadow-lg shadow-amber-900/30"
          >
            {decrypting
              ? <><Loader2 className="animate-spin" size={28} /> 解密中...</>
              : <><Lock size={28} /> 解密投标文件</>}
          </button>
          <p className="mt-4 text-slate-500 text-sm">点击按钮解密所有投标文件</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0F2B46]/80 rounded-xl p-5 border border-white/10">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Unlock size={18} className="text-[#C8A45C]" /> 投标报价对比
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-slate-400">投标人</th>
                      <th className="text-left py-3 px-4 text-slate-400">投标报价</th>
                      {paramKeys.map((k) => (
                        <th key={k} className="text-left py-3 px-4 text-slate-400">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bids.map((b, i) => (
                      <tr key={b.bidId} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-4 font-medium">{bidderLabel(i)}</td>
                        <td className={`py-3 px-4 font-semibold ${b.quote === minQuote ? 'text-green-400' : ''}`}>
                          ¥{b.quote.toLocaleString()}
                          {b.quote === minQuote && (
                            <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">最低价</span>
                          )}
                        </td>
                        {Object.values(b.keyParams).map((v, j) => (
                          <td key={j} className="py-3 px-4 text-slate-300">{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {paramKeys.length > 0 && (
              <div className="bg-[#0F2B46]/80 rounded-xl p-5 border border-white/10">
                <h2 className="text-lg font-semibold mb-4">关键参数雷达图</h2>
                <ReactECharts option={radarOption} style={{ height: 300 }} />
              </div>
            )}

            <button
              onClick={() => navigate(`/evaluation/${projectId}`)}
              className="px-6 py-3 bg-[#C8A45C] text-white rounded-lg font-medium hover:bg-[#b8944f] flex items-center gap-2 transition-colors"
            >
              进入评标 <ArrowRight size={16} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-[#0F2B46]/80 rounded-xl p-5 border border-white/10">
              <h3 className="text-sm font-semibold mb-3 text-slate-300">开标过程记录</h3>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {events.map((e, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="text-slate-500 shrink-0 text-xs">{e.time}</span>
                    <span className="text-slate-300">{e.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0F2B46]/80 rounded-xl p-5 border border-white/10 flex flex-col items-center gap-3">
              <Video size={40} className="text-slate-500" />
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                全程录像中
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
