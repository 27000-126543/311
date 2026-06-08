import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'
import ReactECharts from 'echarts-for-react'
import { ClipboardCheck, Send, Trophy, Loader2 } from 'lucide-react'

interface Criteria { criteriaId: string; name: string; weight: number }
interface ProjectData { id: string; name: string; budget: number; industry: string; scoring_criteria: Criteria[] }
interface BidData { id: string; quote: number; status: string }
interface RankItem { bidId: string; quote: number; avgScore: number; evalCount: number }

const bidderLabel = (i: number) => `投标人${String.fromCharCode(65 + i)}`

export default function Evaluation() {
  const { projectId } = useParams()
  const { user } = useAuthStore()
  const [project, setProject] = useState<ProjectData | null>(null)
  const [bids, setBids] = useState<BidData[]>([])
  const [activeBid, setActiveBid] = useState(0)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [ranking, setRanking] = useState<RankItem[]>([])
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    if (!projectId) return
    api.get<{ success: boolean; data: ProjectData }>(`/projects/${projectId}`)
      .then((r) => { if (r.success && r.data) setProject(r.data) })
      .catch(() => {})
    api.get<{ success: boolean; data: BidData[] }>(`/bids?projectId=${projectId}`)
      .then((r) => { if (r.success) setBids((r.data || []).filter((b) => b.status !== 'rejected')) })
      .catch(() => {})
  }, [projectId])

  const totalScore = Object.values(scores).reduce((sum, v) => sum + (v || 0), 0)

  const handleSubmit = async () => {
    if (!user || !project || !bids[activeBid]) return
    setSubmitting(true)
    try {
      const scoreList = project.scoring_criteria.map((c) => ({
        criteriaId: c.criteriaId,
        score: scores[c.criteriaId] || 0,
      }))
      await api.post(`/evaluation/${projectId}/score`, {
        expertId: user.id, bidId: bids[activeBid].id, scores: scoreList, comment,
      })
      setScores({})
      setComment('')
      fetchResult()
    } catch {}
    setSubmitting(false)
  }

  const fetchResult = async () => {
    try {
      const r = await api.get<{ success: boolean; data: { ranking: RankItem[] } }>(`/evaluation/${projectId}/result`)
      if (r.success && r.data?.ranking?.length) {
        setRanking(r.data.ranking)
        setShowResult(true)
      }
    } catch {}
  }

  const chartOption = {
    tooltip: { trigger: 'axis' as const },
    grid: { left: 60, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category' as const, data: ranking.map((_, i) => bidderLabel(i)) },
    yAxis: { type: 'value' as const, name: '综合得分' },
    series: [{
      type: 'bar' as const,
      data: ranking.map((r) => r.avgScore),
      itemStyle: { color: '#C8A45C' },
      barWidth: '40%',
    }],
  }

  if (!project) return <div className="p-6 text-slate-400">加载中...</div>

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardCheck className="text-[#0F2B46]" /> 在线评标
        </h1>
        <div className="mt-2 flex flex-wrap gap-6 text-sm text-slate-500">
          <span>项目: <b className="text-slate-700">{project.name}</b></span>
          <span>预算: <b className="text-slate-700">¥{project.budget.toLocaleString()}</b></span>
          <span>行业: <b className="text-slate-700">{project.industry}</b></span>
        </div>
      </div>

      {!showResult ? (
        <>
          {bids.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {bids.map((b, i) => (
                <button
                  key={b.id} onClick={() => setActiveBid(i)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeBid === i
                      ? 'bg-[#0F2B46] text-white'
                      : 'bg-white text-slate-600 border border-slate-300 hover:border-[#C8A45C]'
                  }`}
                >
                  {bidderLabel(i)}
                </button>
              ))}
            </div>
          )}

          {bids[activeBid] && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{bidderLabel(activeBid)}</h2>
                <span className="text-sm text-slate-500">报价: ¥{bids[activeBid].quote.toLocaleString()}</span>
              </div>
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 text-slate-500">评分项</th>
                    <th className="text-center py-2 px-3 text-slate-500">权重</th>
                    <th className="text-center py-2 px-3 text-slate-500">满分</th>
                    <th className="text-center py-2 px-3 text-slate-500">评分</th>
                  </tr>
                </thead>
                <tbody>
                  {project.scoring_criteria.map((c) => (
                    <tr key={c.criteriaId} className="border-b border-slate-100">
                      <td className="py-2 px-3">{c.name}</td>
                      <td className="text-center py-2 px-3">{c.weight}%</td>
                      <td className="text-center py-2 px-3">{c.weight}</td>
                      <td className="text-center py-2 px-3">
                        <input
                          type="number" min={0} max={c.weight}
                          value={scores[c.criteriaId] ?? ''}
                          onChange={(e) => setScores((prev) => ({
                            ...prev,
                            [c.criteriaId]: Math.min(Math.max(Number(e.target.value), 0), c.weight),
                          }))}
                          className="w-20 text-center border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-[#C8A45C]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="py-2 px-3">合计</td>
                    <td className="text-center py-2 px-3">100%</td>
                    <td className="text-center py-2 px-3">100</td>
                    <td className="text-center py-2 px-3 text-[#C8A45C]">{totalScore}</td>
                  </tr>
                </tfoot>
              </table>
              <textarea
                value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder="评语（选填）" rows={3}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4 focus:ring-2 focus:ring-[#C8A45C]"
              />
              <button
                onClick={handleSubmit} disabled={submitting}
                className="px-6 py-2.5 bg-[#C8A45C] text-white rounded-lg font-medium hover:bg-[#b8944f] disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? <><Loader2 className="animate-spin" size={16} /> 提交中...</> : <><Send size={16} /> 提交评分</>}
              </button>
            </div>
          )}

          <button onClick={fetchResult} className="text-[#C8A45C] hover:underline text-sm flex items-center gap-1">
            <Trophy size={14} /> 查看评标结果
          </button>
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Trophy size={20} className="text-[#C8A45C]" /> 评标结果排名
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-slate-500">排名</th>
                  <th className="text-left py-3 px-4 text-slate-500">投标人</th>
                  <th className="text-left py-3 px-4 text-slate-500">报价</th>
                  <th className="text-left py-3 px-4 text-slate-500">综合得分</th>
                  <th className="text-left py-3 px-4 text-slate-500">状态</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={r.bidId} className={`border-b border-slate-100 ${i === 0 ? 'bg-amber-50' : ''}`}>
                    <td className="py-3 px-4 font-bold">{i + 1}</td>
                    <td className="py-3 px-4">{bidderLabel(i)}</td>
                    <td className="py-3 px-4">¥{r.quote.toLocaleString()}</td>
                    <td className="py-3 px-4 font-semibold text-[#C8A45C]">{r.avgScore}</td>
                    <td className="py-3 px-4">
                      {i === 0 && <span className="bg-[#C8A45C] text-white text-xs px-2 py-1 rounded-full">中标候选人</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-sm font-semibold mb-2">综合得分对比</h3>
            <ReactECharts option={chartOption} style={{ height: 300 }} />
          </div>
          <button onClick={() => setShowResult(false)} className="text-sm text-slate-500 hover:underline">← 返回评分</button>
        </div>
      )}
    </div>
  )
}
