import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  user: { id: string; username: string; role: string; orgName: string; creditScore?: number } | null
  login: (token: string, user: AuthState['user']) => void
  logout: () => void
  isAuthenticated: () => boolean
  hasRole: (...roles: string[]) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      isAuthenticated: () => !!get().token,
      hasRole: (...roles) => !!get().user && roles.includes(get().user!.role),
    }),
    { name: 'auth-storage' }
  )
)
