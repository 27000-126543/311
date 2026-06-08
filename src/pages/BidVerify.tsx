import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { api } from '@/utils/api'

interface CheckItem {
  name: string
  passed: boolean
  message: string
}

interface VerifyData {
  passed: boolean
  checks: CheckItem[]
  rejectReason?: string
}

export default function BidVerify() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const stateData = location.state as VerifyData | null

  const [data, setData] = useState<VerifyData | null>(stateData || null)
  const [loading, setLoading] = useState(!stateData)

  useEffect(() => {
    if (stateData) return
    api.get<VerifyData>(`/bids/${id}/verify`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [id, stateData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-slate-400">加载校验结果...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <XCircle size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400">未找到校验结果</p>
          <button
            onClick={() => navigate('/bids')}
            className="mt-4 text-sm text-[#C8A45C] hover:text-[#A8893E]"
          >
            返回投标列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto mt-8 animate-fade-in">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className={`px-8 py-8 text-center ${data.passed ? 'bg-green-50' : 'bg-red-50'}`}>
          {data.passed ? (
            <CheckCircle size={64} className="mx-auto text-green-500 mb-3" />
          ) : (
            <XCircle size={64} className="mx-auto text-red-500 mb-3" />
          )}
          <h2 className={`text-xl font-bold ${data.passed ? 'text-green-700' : 'text-red-700'}`}>
            {data.passed ? '校验通过' : '校验未通过'}
          </h2>
          <p className={`text-sm mt-1 ${data.passed ? 'text-green-600' : 'text-red-600'}`}>
            {data.passed ? '您的投标已通过自动校验，等待审核' : '您的投标未通过自动校验，请根据原因修改后重新提交'}
          </p>
        </div>

        <div className="px-8 py-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">校验项目</h3>
          <div className="space-y-3">
            {data.checks.map((check) => (
              <div
                key={check.name}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  check.passed ? 'bg-green-50/50' : 'bg-red-50/50'
                }`}
              >
                {check.passed ? (
                  <CheckCircle size={20} className="text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className={`text-sm font-medium ${check.passed ? 'text-green-700' : 'text-red-700'}`}>
                    {check.name}
                  </div>
                  <div className={`text-xs mt-0.5 ${check.passed ? 'text-green-600' : 'text-red-600'}`}>
                    {check.message}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!data.passed && data.rejectReason && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">退回原因</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
                {data.rejectReason}
              </div>
            </div>
          )}
        </div>

        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={() => navigate('/bids')}
            className="flex items-center gap-2 text-sm text-[#0F2B46] hover:text-[#C8A45C] transition-colors font-medium"
          >
            <ArrowLeft size={16} />
            返回投标列表
          </button>
        </div>
      </div>
    </div>
  )
}
