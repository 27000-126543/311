import { useState, useEffect } from 'react'
import { api } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'
import {
  Shield, XCircle, CheckCircle, Clock, AlertTriangle, Unlock, FileText, Ban, Send,
} from 'lucide-react'

interface RestrictionItem {
  id: string
  bidder_id: string
  username: string
  org_name: string
  credit_score: number
  threshold: number
  status: string
  restricted: number
  message: string
  created_at: string
}

interface InterceptionRecord {
  id: string
  bidder_id: string
  bidder_name: string
  type: string
  score_change: number
  reason: string
  project_id: string
  project: string
  created_at: string
}

export default function RestrictionList() {
  const { hasRole } = useAuthStore()
  const [restrictions, setRestrictions] = useState<RestrictionItem[]>([])
  const [history, setHistory] = useState<RestrictionItem[]>([])
  const [interceptions, setInterceptions] = useState<InterceptionRecord[]>([])
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'interceptions'>('active')
  const [loading, setLoading] = useState(true)

  const isSupervisor = hasRole('supervisor', 'admin')

  const loadData = () => {
    api.get<{ success: boolean; data: RestrictionItem[] }>('/credit/restrictions/list')
      .then((res) => {
        const d = (res as any).data || res
        setRestrictions(Array.isArray(d) ? d : [])
      })
      .catch(() => setRestrictions([]))
    api.get<{ success: boolean; data: RestrictionItem[] }>('/credit/restrictions/history')
      .then((res) => {
        const d = (res as any).data || res
        setHistory(Array.isArray(d) ? d : [])
      })
      .catch(() => setHistory([]))
    api.get('/credit/interceptions')
      .then((res) => {
        const d = (res as any).data
        setInterceptions(Array.isArray(d) ? d : [])
      })
      .catch(() => setInterceptions([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handleRelease = async (alertId: string) => {
    try {
      await api.post(`/credit/alerts/${alertId}/release`)
      loadData()
    } catch { alert('解除限制失败') }
  }

  if (loading) return <div className="text-center py-20 text-slate-400">加载中...</div>

  const activeRestrictions = restrictions
  const allHistory = history

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Shield size={24} className="text-[#C8A45C]" />
        <h1 className="text-xl font-semibold text-[#0F2B46]">限制名单</h1>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 text-sm rounded-lg ${activeTab === 'active' ? 'bg-[#0F2B46] text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
        >当前受限 ({activeRestrictions.length})</button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm rounded-lg ${activeTab === 'history' ? 'bg-[#0F2B46] text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
        >历史记录 ({allHistory.length})</button>
        <button
          onClick={() => setActiveTab('interceptions')}
          className={`px-4 py-2 text-sm rounded-lg ${activeTab === 'interceptions' ? 'bg-[#0F2B46] text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
        >投标拦截记录 ({interceptions.length})</button>
      </div>

      {activeTab === 'active' && (
        activeRestrictions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <CheckCircle size={48} className="mx-auto text-green-300 mb-4" />
            <p className="text-slate-500">当前没有被限制的投标人</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeRestrictions.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-red-200 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <XCircle size={18} className="text-red-500" />
                      <h4 className="font-semibold text-red-800">{r.org_name || r.username}</h4>
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">投标受限</span>
                    </div>
                    <p className="text-sm text-red-600 mb-2">{r.message}</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">信用分</span>
                        <p className="font-bold text-red-600">{r.credit_score}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">限制触发时间</span>
                        <p className="font-medium">{new Date(r.created_at).toLocaleDateString('zh-CN')}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">预警ID</span>
                        <p className="text-xs text-slate-400 font-mono">{r.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </div>
                  {isSupervisor && (
                    <button
                      onClick={() => handleRelease(r.id)}
                      className="flex items-center gap-1 text-sm bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 shrink-0 ml-4"
                    >
                      <Unlock size={14} /> 解除限制
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'history' && (
        allHistory.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">暂无预警历史记录</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="px-4 py-3 text-left font-medium">投标人</th>
                  <th className="px-4 py-3 text-center font-medium">信用分</th>
                  <th className="px-4 py-3 text-left font-medium">预警信息</th>
                  <th className="px-4 py-3 text-center font-medium">状态</th>
                  <th className="px-4 py-3 text-left font-medium">触发时间</th>
                  {isSupervisor && <th className="px-4 py-3 text-center font-medium">操作</th>}
                </tr>
              </thead>
              <tbody>
                {allHistory.map((r) => (
                  <tr key={r.id} className="border-t border-slate-50">
                    <td className="px-4 py-3 font-medium">{r.org_name || r.username || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${r.credit_score >= 60 ? 'text-green-600' : 'text-red-600'}`}>{r.credit_score}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs max-w-[200px] truncate">{r.message}</td>
                    <td className="px-4 py-3 text-center">
                      {r.status === 'active' ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">受限中</span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">已解除</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(r.created_at).toLocaleDateString('zh-CN')}</td>
                    {isSupervisor && (
                      <td className="px-4 py-3 text-center">
                        {r.status === 'active' && (
                          <button
                            onClick={() => handleRelease(r.id)}
                            className="text-xs text-green-600 hover:text-green-700 flex items-center gap-0.5 mx-auto"
                          >
                            <Unlock size={12} /> 解除
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {activeTab === 'interceptions' && (
        interceptions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Send size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">暂无投标拦截记录</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="px-4 py-3 text-left font-medium">投标人</th>
                  <th className="px-4 py-3 text-left font-medium">拦截原因</th>
                  <th className="px-4 py-3 text-left font-medium">关联项目</th>
                  <th className="px-4 py-3 text-center font-medium">类型</th>
                  <th className="px-4 py-3 text-left font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {interceptions.map((r) => (
                  <tr key={r.id} className="border-t border-slate-50">
                    <td className="px-4 py-3 font-medium">{r.bidder_name || r.bidder_id?.slice(0, 8) || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs max-w-[250px] truncate">{r.reason}</td>
                    <td className="px-4 py-3 text-slate-500">{r.project || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {r.type === 'penalty' ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-0.5 justify-center">
                          <Ban size={10} /> 拦截
                        </span>
                      ) : (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-0.5 justify-center">
                          <Send size={10} /> 正常提交
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleString('zh-CN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
