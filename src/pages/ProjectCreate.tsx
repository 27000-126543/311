import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Send, Plus, X, FileText } from 'lucide-react'
import { api } from '@/utils/api'

const industries = ['建筑工程', '信息技术', '医疗卫生', '教育培训', '交通运输', '能源环保']
const regions = ['华北', '华东', '华南', '西南', '西北']
const stepLabels = ['基本信息', '资质与评分', '模板与发布']

interface ScoringRow { name: string; weight: number; maxScore: number; description: string }
interface FormData {
  name: string; budget: number; industry: string; region: string
  description: string; deadline: string; qualifications: string[]; scoringCriteria: ScoringRow[]
}

const emptyScore: ScoringRow = { name: '', weight: 0, maxScore: 0, description: '' }

export default function ProjectCreate() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [qualInput, setQualInput] = useState('')
  const [templates, setTemplates] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState<FormData>({
    name: '', budget: 0, industry: '', region: '', description: '', deadline: '',
    qualifications: [], scoringCriteria: [{ ...emptyScore }],
  })

  function updateForm(patch: Partial<FormData>) {
    setForm(f => ({ ...f, ...patch }))
    setErrors({})
  }

  function addQualification() {
    const v = qualInput.trim()
    if (v && !form.qualifications.includes(v)) updateForm({ qualifications: [...form.qualifications, v] })
    setQualInput('')
  }

  function removeQualification(q: string) {
    updateForm({ qualifications: form.qualifications.filter(i => i !== q) })
  }

  function updateScoring(idx: number, patch: Partial<ScoringRow>) {
    const rows = [...form.scoringCriteria]
    rows[idx] = { ...rows[idx], ...patch }
    updateForm({ scoringCriteria: rows })
  }

  function addScoringRow() {
    updateForm({ scoringCriteria: [...form.scoringCriteria, { ...emptyScore }] })
  }

  function removeScoringRow(idx: number) {
    updateForm({ scoringCriteria: form.scoringCriteria.filter((_, i) => i !== idx) })
  }

  function validateStep(): boolean {
    const e: Record<string, string> = {}
    if (step === 0) {
      if (!form.name.trim()) e.name = '请输入项目名称'
      if (!form.budget || form.budget <= 0) e.budget = '请输入有效预算'
      if (!form.industry) e.industry = '请选择行业'
      if (!form.region) e.region = '请选择地区'
      if (!form.deadline) e.deadline = '请选择截止日期'
    }
    if (step === 1) {
      const tw = form.scoringCriteria.reduce((s, r) => s + (r.weight || 0), 0)
      if (tw !== 100 && form.scoringCriteria.length > 0) e.weight = `权重总和为${tw}%，需为100%`
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function nextStep() {
    if (!validateStep()) return
    if (step === 1) {
      try {
        const res = await api.get<any[]>('/projects/templates?industry=' + encodeURIComponent(form.industry))
        setTemplates(res || [])
      } catch { setTemplates([]) }
    }
    setStep(s => s + 1)
  }

  function applyTemplate(t: any) {
    if (t.qualifications) updateForm({ qualifications: t.qualifications })
    if (t.scoringCriteria) updateForm({ scoringCriteria: t.scoringCriteria })
  }

  async function publish() {
    if (!validateStep()) return
    setSubmitting(true)
    try {
      const res: any = await api.post('/projects', form)
      const id = res?.id || res?.projectId
      if (id) await api.post('/projects/' + id + '/publish')
      navigate('/projects')
    } catch { setErrors({ submit: '发布失败，请重试' }) } finally { setSubmitting(false) }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i < step ? 'bg-[#0F2B46] text-white' : i === step ? 'bg-[#C8A45C] text-white' : 'bg-slate-200 text-slate-500'
              }`}>{i < step ? '✓' : i + 1}</div>
              <span className={`mt-1 text-xs ${i <= step ? 'text-[#0F2B46] font-medium' : 'text-slate-400'}`}>{label}</span>
            </div>
            {i < stepLabels.length - 1 && <div className={`h-0.5 flex-1 mx-2 ${i < step ? 'bg-[#0F2B46]' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#0F2B46]">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-slate-600 mb-1">项目名称 *</label>
                <input value={form.name} onChange={e => updateForm({ name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A45C]" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">预算金额 (元) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">¥</span>
                  <input type="number" value={form.budget || ''} onChange={e => updateForm({ budget: Number(e.target.value) })} className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A45C]" />
                </div>
                {errors.budget && <p className="text-red-500 text-xs mt-1">{errors.budget}</p>}
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">所属行业 *</label>
                <select value={form.industry} onChange={e => updateForm({ industry: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A45C]">
                  <option value="">请选择</option>
                  {industries.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
                {errors.industry && <p className="text-red-500 text-xs mt-1">{errors.industry}</p>}
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">所属地区 *</label>
                <select value={form.region} onChange={e => updateForm({ region: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A45C]">
                  <option value="">请选择</option>
                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {errors.region && <p className="text-red-500 text-xs mt-1">{errors.region}</p>}
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">截止日期 *</label>
                <input type="date" value={form.deadline} onChange={e => updateForm({ deadline: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A45C]" />
                {errors.deadline && <p className="text-red-500 text-xs mt-1">{errors.deadline}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-slate-600 mb-1">项目描述</label>
                <textarea rows={3} value={form.description} onChange={e => updateForm({ description: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A45C]" />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-[#0F2B46]">资质与评分</h3>
            <div>
              <label className="block text-sm text-slate-600 mb-2">资质要求</label>
              <div className="flex gap-2 mb-2">
                <input value={qualInput} onChange={e => setQualInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addQualification())} placeholder="输入资质要求后回车" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A45C]" />
                <button onClick={addQualification} className="px-3 py-2 bg-[#0F2B46] text-white rounded-lg text-sm hover:bg-[#1a3d5e] transition-colors"><Plus size={16} /></button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.qualifications.map(q => (
                  <span key={q} className="flex items-center gap-1 text-xs bg-[#0F2B46]/5 text-[#0F2B46] px-2 py-1 rounded-full">{q}<button onClick={() => removeQualification(q)} className="text-slate-400 hover:text-red-500"><X size={12} /></button></span>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-2">评分标准</label>
              {errors.weight && <p className="text-red-500 text-xs mb-2">{errors.weight}</p>}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 text-slate-600"><th className="px-2 py-2 text-left font-medium">名称</th><th className="px-2 py-2 text-left font-medium w-20">权重%</th><th className="px-2 py-2 text-left font-medium w-20">满分</th><th className="px-2 py-2 text-left font-medium">说明</th><th className="px-2 py-2 w-10"></th></tr></thead>
                  <tbody>
                    {form.scoringCriteria.map((row, idx) => (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="px-2 py-1.5"><input value={row.name} onChange={e => updateScoring(idx, { name: e.target.value })} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" /></td>
                        <td className="px-2 py-1.5"><input type="number" value={row.weight || ''} onChange={e => updateScoring(idx, { weight: Number(e.target.value) })} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" /></td>
                        <td className="px-2 py-1.5"><input type="number" value={row.maxScore || ''} onChange={e => updateScoring(idx, { maxScore: Number(e.target.value) })} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" /></td>
                        <td className="px-2 py-1.5"><input value={row.description} onChange={e => updateScoring(idx, { description: e.target.value })} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" /></td>
                        <td className="px-2 py-1.5">{form.scoringCriteria.length > 1 && <button onClick={() => removeScoringRow(idx)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={addScoringRow} className="mt-2 flex items-center gap-1 text-sm text-[#C8A45C] hover:underline"><Plus size={14} />添加评分项</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[#0F2B46]">模板与发布</h3>
            {templates.length > 0 && (
              <div>
                <label className="block text-sm text-slate-600 mb-3">推荐模板</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((t, i) => (
                    <div key={i} className="border border-slate-200 rounded-lg p-4 hover:border-[#C8A45C] transition-colors">
                      <div className="flex items-center gap-2 mb-2"><FileText size={16} className="text-[#C8A45C]" /><span className="font-medium text-sm text-[#0F2B46]">{t.name || `模板${i + 1}`}</span></div>
                      {t.matchScore != null && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-10 h-10 rounded-full border-2 border-[#C8A45C] flex items-center justify-center text-xs font-medium text-[#C8A45C]">{t.matchScore}%</div>
                          <span className="text-xs text-slate-500">匹配度</span>
                        </div>
                      )}
                      <p className="text-xs text-slate-500 mb-3 line-clamp-2">{t.description || '暂无描述'}</p>
                      <button onClick={() => applyTemplate(t)} className="w-full py-1.5 text-xs rounded-lg border border-[#0F2B46] text-[#0F2B46] hover:bg-[#0F2B46] hover:text-white transition-colors">应用模板</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm text-slate-600 mb-3">信息预览</label>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-slate-400">项目名称：</span>{form.name || '-'}</div>
                  <div><span className="text-slate-400">预算：</span>¥{form.budget ? form.budget.toLocaleString() : '-'}元</div>
                  <div><span className="text-slate-400">行业：</span>{form.industry || '-'}</div>
                  <div><span className="text-slate-400">地区：</span>{form.region || '-'}</div>
                  <div><span className="text-slate-400">截止日期：</span>{form.deadline || '-'}</div>
                </div>
                {form.description && <div><span className="text-slate-400">描述：</span>{form.description}</div>}
                {form.qualifications.length > 0 && <div><span className="text-slate-400">资质要求：</span>{form.qualifications.join('、')}</div>}
                {form.scoringCriteria.some(r => r.name) && <div><span className="text-slate-400">评分项：</span>{form.scoringCriteria.filter(r => r.name).map(r => r.name).join('、')}</div>}
              </div>
            </div>
            {errors.submit && <p className="text-red-500 text-sm">{errors.submit}</p>}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button disabled={step === 0} onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 px-5 py-2 text-sm rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors">
          <ChevronLeft size={16} />上一步
        </button>
        {step < 2 ? (
          <button onClick={nextStep} className="flex items-center gap-1 px-5 py-2 text-sm rounded-lg bg-[#0F2B46] text-white hover:bg-[#1a3d5e] transition-colors">下一步<ChevronRight size={16} /></button>
        ) : (
          <button onClick={publish} disabled={submitting} className="flex items-center gap-1 px-5 py-2 text-sm rounded-lg bg-[#C8A45C] text-white hover:bg-[#b8933f] transition-colors disabled:opacity-60"><Send size={16} />{submitting ? '发布中...' : '发布招标'}</button>
        )}
      </div>
    </div>
  )
}
