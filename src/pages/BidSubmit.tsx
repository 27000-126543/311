import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Upload, Plus, X, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { api } from '@/utils/api'

interface ProjectInfo {
  name: string
  budget: number
  industry: string
  region: string
  qualifications: string[]
  scoringCriteria: { item: string; weight: number }[]
  deadline: string
}

interface VerifyResult {
  passed: boolean
  checks: { name: string; passed: boolean; message: string }[]
}

interface UploadedFile {
  id: string
  name: string
  size: string
}

export default function BidSubmit() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [quote, setQuote] = useState('')
  const [keyParams, setKeyParams] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }])
  const [documents, setDocuments] = useState<UploadedFile[]>([])
  const [license, setLicense] = useState<UploadedFile[]>([])
  const [performance, setPerformance] = useState<UploadedFile[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null)

  useEffect(() => {
    api.get<ProjectInfo>(`/projects/${projectId}`)
      .then(setProject)
      .catch(() => setProject(null))
  }, [projectId])

  const addParam = () => setKeyParams([...keyParams, { key: '', value: '' }])
  const removeParam = (i: number) => setKeyParams(keyParams.filter((_, idx) => idx !== i))
  const updateParam = (i: number, field: 'key' | 'value', val: string) => {
    const next = [...keyParams]
    next[i][field] = val
    setKeyParams(next)
  }

  const simulateUpload = (setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>, accepted: string) => {
    const demoFiles: Record<string, UploadedFile> = {
      pdf: { id: Date.now().toString(), name: '资质文件.pdf', size: '2.3 MB' },
      doc: { id: Date.now().toString(), name: '证明材料.docx', size: '1.1 MB' },
      img: { id: Date.now().toString(), name: '营业执照.jpg', size: '856 KB' },
    }
    const ext = accepted.split(',')[0].replace('.', '')
    setter((prev) => [...prev, demoFiles[ext] || demoFiles.pdf])
  }

  const removeFile = (setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>, id: string) => {
    setter((prev) => prev.filter((f) => f.id !== id))
  }

  const countdown = () => {
    if (!project?.deadline) return '--'
    const diff = new Date(project.deadline).getTime() - Date.now()
    if (diff <= 0) return '已截止'
    const d = Math.floor(diff / 86400000)
    const h = Math.floor((diff % 86400000) / 3600000)
    return `${d}天${h}小时`
  }

  const handleSubmit = async () => {
    if (!quote || !projectId) return
    setSubmitting(true)
    try {
      const res = await api.post<{ id: string }>('/bids', {
        projectId,
        quote: Number(quote),
        documents: [...documents, ...license, ...performance],
        keyParams: Object.fromEntries(keyParams.filter((p) => p.key).map((p) => [p.key, p.value])),
      })
      const verifyRes = await api.post<VerifyResult>(`/bids/${res.id}/verify`)
      setVerifyResult(verifyRes)
    } catch {
      alert('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (verifyResult) {
    return (
      <div className="max-w-lg mx-auto mt-16 animate-fade-in text-center">
        {verifyResult.passed ? (
          <>
            <CheckCircle size={72} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">校验通过！</h2>
            <div className="space-y-2 mt-6">
              {verifyResult.checks.map((c) => (
                <div key={c.name} className="flex items-center justify-center gap-2 text-green-700">
                  <CheckCircle size={18} /> <span>{c.name}</span> <span className="text-sm text-green-500">{c.message}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <XCircle size={72} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-red-600 mb-2">校验未通过</h2>
            <div className="space-y-2 mt-6">
              {verifyResult.checks.map((c) => (
                <div key={c.name} className={`flex items-center justify-center gap-2 ${c.passed ? 'text-green-700' : 'text-red-700'}`}>
                  {c.passed ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  <span>{c.name}</span>
                  <span className={`text-sm ${c.passed ? 'text-green-500' : 'text-red-500'}`}>{c.message}</span>
                </div>
              ))}
            </div>
          </>
        )}
        <button
          onClick={() => navigate('/bids')}
          className="mt-8 px-6 py-2.5 bg-[#0F2B46] text-[#C8A45C] rounded-lg font-medium hover:bg-[#163A5C] transition-colors"
        >
          返回投标列表
        </button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-[#0F2B46] mb-6">提交投标</h1>

      <div className="flex gap-6">
        <div className="w-[60%] space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <label className="block text-sm font-medium text-slate-700 mb-2">投标报价</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-[#0F2B46]">¥</span>
              <input
                type="number"
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder="请输入投标报价"
                className="w-full pl-10 pr-4 py-3 text-xl font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C8A45C] focus:border-transparent"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <label className="block text-sm font-medium text-slate-700 mb-2">关键参数</label>
            <div className="space-y-2">
              {keyParams.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={p.key}
                    onChange={(e) => updateParam(i, 'key', e.target.value)}
                    placeholder="参数名称"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A45C]"
                  />
                  <input
                    value={p.value}
                    onChange={(e) => updateParam(i, 'value', e.target.value)}
                    placeholder="参数值"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A45C]"
                  />
                  {keyParams.length > 1 && (
                    <button onClick={() => removeParam(i)} className="text-red-400 hover:text-red-600 px-1">
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addParam} className="mt-2 flex items-center gap-1 text-sm text-[#C8A45C] hover:text-[#A8893E]">
              <Plus size={16} /> 添加参数
            </button>
          </div>

          {[
            { label: '资质文件上传', files: documents, setter: setDocuments, accept: '.pdf,.doc,.docx,.jpg,.png', max: 5 },
            { label: '营业执照', files: license, setter: setLicense, accept: '.pdf,.jpg,.png', max: 1 },
            { label: '业绩证明', files: performance, setter: setPerformance, accept: '.pdf,.doc,.docx,.jpg,.png', max: 5 },
          ].map((section) => (
            <div key={section.label} className="bg-white rounded-xl border border-slate-200 p-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">{section.label}</label>
              {section.files.length < section.max && (
                <div
                  onClick={() => simulateUpload(section.setter, section.accept)}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#C8A45C] hover:bg-[#C8A45C]/5 transition-colors"
                >
                  <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-500">点击或拖拽上传</p>
                  <p className="text-xs text-slate-400 mt-1">支持 {section.accept}</p>
                </div>
              )}
              {section.files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {section.files.map((f) => (
                    <div key={f.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-slate-700">{f.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">{f.size}</span>
                        <button onClick={() => removeFile(section.setter, f.id)} className="text-red-400 hover:text-red-600">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button
            onClick={handleSubmit}
            disabled={submitting || !quote}
            className="w-full py-3 bg-[#0F2B46] text-[#C8A45C] rounded-lg font-semibold text-lg hover:bg-[#163A5C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '提交中...' : '提交投标'}
          </button>
        </div>

        <div className="w-[40%]">
          {project ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-6">
              <h3 className="text-lg font-semibold text-[#0F2B46] mb-4">{project.name}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">预算金额</span><span className="font-semibold text-[#0F2B46]">¥{project.budget.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">所属行业</span><span>{project.industry}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">所在地区</span><span>{project.region}</span></div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">截止时间</span>
                  <span className="flex items-center gap-1 text-red-500"><Clock size={14} />{countdown()}</span>
                </div>
              </div>

              {project.qualifications.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">资质要求</h4>
                  <ul className="space-y-1">
                    {project.qualifications.map((q) => (
                      <li key={q} className="flex items-start gap-1.5 text-sm text-slate-600">
                        <AlertCircle size={14} className="mt-0.5 text-[#C8A45C] shrink-0" />{q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {project.scoringCriteria.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">评分标准</h4>
                  <table className="w-full text-sm">
                    <thead><tr className="text-slate-500"><th className="text-left py-1">项目</th><th className="text-right py-1">权重</th></tr></thead>
                    <tbody>
                      {project.scoringCriteria.map((s) => (
                        <tr key={s.item} className="border-t border-slate-50"><td className="py-1.5 text-slate-700">{s.item}</td><td className="text-right text-[#C8A45C] font-medium">{s.weight}%</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center text-slate-400">加载项目信息...</div>
          )}
        </div>
      </div>
    </div>
  )
}
