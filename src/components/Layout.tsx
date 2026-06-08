import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import {
  LayoutDashboard,
  FileText,
  Plus,
  Send,
  Shield,
  Users,
  BarChart3,
  Scale,
  FileCheck,
  Award,
  Eye,
  LogOut,
  ChevronLeft,
  Building2,
} from 'lucide-react'

interface NavItem {
  path: string
  label: string
  icon: React.ReactNode
  roles?: string[]
}

const commonNav: NavItem[] = [
  { path: '/', label: '首页大屏', icon: <LayoutDashboard size={18} /> },
  { path: '/projects', label: '招标公告', icon: <FileText size={18} /> },
]

const roleNav: Record<string, NavItem[]> = {
  tenderer: [
    { path: '/projects/create', label: '发布项目', icon: <Plus size={18} />, roles: ['tenderer'] },
  ],
  bidder: [
    { path: '/bids', label: '我的投标', icon: <Send size={18} />, roles: ['bidder'] },
    { path: '/credit', label: '信用评价', icon: <Award size={18} />, roles: ['bidder'] },
  ],
  expert: [
    { path: '/evaluation/_list', label: '评标任务', icon: <FileCheck size={18} />, roles: ['expert'] },
  ],
  admin: [
    { path: '/experts', label: '专家抽取', icon: <Users size={18} />, roles: ['admin'] },
    { path: '/analytics', label: '数据分析', icon: <BarChart3 size={18} />, roles: ['admin'] },
    { path: '/objections/_list', label: '异议管理', icon: <Scale size={18} />, roles: ['admin'] },
  ],
  supervisor: [
    { path: '/analytics', label: '数据分析', icon: <BarChart3 size={18} />, roles: ['supervisor'] },
    { path: '/credit', label: '信用监管', icon: <Shield size={18} />, roles: ['supervisor'] },
    { path: '/objections/_list', label: '异议管理', icon: <Scale size={18} />, roles: ['supervisor'] },
  ],
}

const roleLabel: Record<string, string> = {
  tenderer: '招标方',
  bidder: '投标方',
  expert: '评审专家',
  admin: '管理员',
  supervisor: '监管方',
}

const roleBadgeColor: Record<string, string> = {
  tenderer: 'bg-blue-500/20 text-blue-300',
  bidder: 'bg-emerald-500/20 text-emerald-300',
  expert: 'bg-purple-500/20 text-purple-300',
  admin: 'bg-amber-500/20 text-amber-300',
  supervisor: 'bg-red-500/20 text-red-300',
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  const navItems = [
    ...commonNav,
    ...(user?.role ? (roleNav[user.role] || []) : []),
  ]

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role || '')
  )

  return (
    <div className="flex h-screen bg-slate-100">
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-64'
        } bg-[#0F2B46] flex flex-col transition-all duration-300 relative`}
      >
        <div className="h-16 flex items-center justify-center border-b border-white/10 px-4">
          <Building2 size={24} className="text-[#C8A45C] shrink-0" />
          {!collapsed && (
            <span className="ml-2 text-white font-semibold text-sm whitespace-nowrap">
              智慧招投标平台
            </span>
          )}
        </div>

        <nav className="flex-1 py-4 overflow-y-auto sidebar-scroll">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 mx-2 rounded text-sm transition-colors ${
                  isActive
                    ? 'text-[#C8A45C] bg-white/5 border-l-2 border-[#C8A45C]'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-[#0F2B46] border border-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white"
        >
          <ChevronLeft
            size={14}
            className={`transition-transform ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Eye size={18} className="text-slate-400" />
            <span className="text-slate-500 text-sm">欢迎回来</span>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-700">{user.username}</span>
                  <span className="text-xs">{user.orgName}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      roleBadgeColor[user.role] || 'bg-slate-500/20 text-slate-300'
                    }`}
                  >
                    {roleLabel[user.role] || user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-1 text-slate-400 hover:text-red-500 transition-colors text-sm"
                >
                  <LogOut size={16} />
                  退出
                </button>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
