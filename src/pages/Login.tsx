import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, User, Lock, Briefcase, FileText, GraduationCap, Settings, Shield } from 'lucide-react'
import { api } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'

const roles = [
  { key: 'tenderer', label: '招标方', icon: Briefcase },
  { key: 'bidder', label: '投标方', icon: FileText },
  { key: 'expert', label: '评审专家', icon: GraduationCap },
  { key: 'admin', label: '管理中心', icon: Settings },
  { key: 'supervisor', label: '监管部门', icon: Shield },
]

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState('tenderer')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!username || !password) { setError('请输入用户名和密码'); return }
    setError('')
    setLoading(true)
    try {
      const res = await api.post<any>('/auth/login', { username, password, role: selectedRole })
      useAuthStore.getState().login(res.data.token, res.data.user)
      navigate('/')
    } catch {
      setError('登录失败，请检查用户名和密码')
    }
    setLoading(false)
  }

  return (
    <div className="h-screen flex bg-gradient-to-br from-[#0F2B46] to-[#1a365d]">
      <div
        className="w-3/5 flex flex-col items-center justify-center relative overflow-hidden"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(200,164,92,0.03) 40px, rgba(200,164,92,0.03) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(200,164,92,0.03) 40px, rgba(200,164,92,0.03) 41px)`,
        }}
      >
        <Building2 size={64} className="text-[#C8A45C]/30 mb-8" />
        <h1 className="text-4xl font-bold text-[#C8A45C] mb-4 font-serif tracking-wider">
          智慧招投标与信用监管平台
        </h1>
        <p className="text-white/40 text-lg tracking-[1em]">公平 · 公正 · 公开</p>
      </div>

      <div className="w-2/5 flex items-center justify-center p-8">
        <div className="w-full max-w-sm bg-white/10 backdrop-blur-xl rounded-2xl p-8">
          <h2 className="text-white text-xl font-semibold mb-6 text-center">系统登录</h2>

          <div className="flex gap-1 mb-6 overflow-x-auto pb-2 scrollbar-none">
            {roles.map(role => {
              const Icon = role.icon
              return (
                <button
                  key={role.key}
                  onClick={() => setSelectedRole(role.key)}
                  className={`flex flex-col items-center px-2 py-2 rounded-t text-xs whitespace-nowrap transition-colors ${
                    selectedRole === role.key
                      ? 'text-[#C8A45C] border-b-2 border-[#C8A45C] bg-white/5'
                      : 'text-white/50 hover:text-white/70'
                  }`}
                >
                  <Icon size={16} className="mb-1" />
                  {role.label}
                </button>
              )
            })}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2.5 border border-white/10 focus-within:border-[#C8A45C]/50 transition-colors">
              <User size={16} className="text-white/40 shrink-0" />
              <input
                type="text"
                placeholder="用户名"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
              />
            </div>
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2.5 border border-white/10 focus-within:border-[#C8A45C]/50 transition-colors">
              <Lock size={16} className="text-white/40 shrink-0" />
              <input
                type="password"
                placeholder="密码"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full mt-5 bg-[#C8A45C] text-[#0F2B46] font-bold py-2.5 rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? '登录中...' : '登 录'}
          </button>

          <p className="text-white/30 text-xs mt-4 text-center leading-relaxed">
            演示账号: tenderer1/bidder1/expert1/admin1/supervisor1 密码: 123456
          </p>
        </div>
      </div>
    </div>
  )
}
