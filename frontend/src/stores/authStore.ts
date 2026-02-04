import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, CognitiveProfile, LoginRequest } from '@/types'
import { apiClient } from '@/services/api'

interface AuthState {
  user: User | null
  cognitiveProfile: CognitiveProfile | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
  checkAuth: () => void
  updateProfile: (profile: Partial<CognitiveProfile>) => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      cognitiveProfile: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null })
        try {
          const response = await apiClient.post<{
            access_token: string
            user: User
          }>('/auth/login', credentials)
          
          const { access_token, user } = response.data
          
          // Store token
          localStorage.setItem('orbit_token', access_token)
          
          // Fetch cognitive profile
          let cognitiveProfile = null
          try {
            const profileResponse = await apiClient.get<CognitiveProfile>('/users/me/profile')
            cognitiveProfile = profileResponse.data
          } catch {
            // Profile might not exist yet for new users
          }
          
          set({
            user,
            cognitiveProfile,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Login failed'
          set({ error: message, isLoading: false })
        }
      },

      logout: () => {
        localStorage.removeItem('orbit_token')
        set({
          user: null,
          cognitiveProfile: null,
          token: null,
          isAuthenticated: false,
        })
      },

      checkAuth: () => {
        const token = localStorage.getItem('orbit_token')
        if (token && !get().isAuthenticated) {
          // Validate token by fetching user
          apiClient.get<User>('/users/me')
            .then((response) => {
              set({
                user: response.data,
                token,
                isAuthenticated: true,
              })
            })
            .catch(() => {
              localStorage.removeItem('orbit_token')
              set({ isAuthenticated: false })
            })
        }
      },

      updateProfile: (profile) => {
        const current = get().cognitiveProfile
        if (current) {
          set({ cognitiveProfile: { ...current, ...profile } })
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'orbit-auth',
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
