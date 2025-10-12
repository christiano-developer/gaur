/**
 * GAUR Police System Authentication Store
 * Zustand-based state management for authentication
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Officer, LoginRequest } from '@/types/auth'
import { apiClient } from '@/lib/api'

interface AuthState {
  officer: Officer | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<boolean>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
  clearError: () => void
  hasPermission: (resource: string, action: string) => boolean
  hasRole: (roleName: string) => boolean
  hasMinimumLevel: (level: number) => boolean
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      officer: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null })

        try {
          const response = await apiClient.login(credentials)

          if (response.success && response.data) {
            set({
              officer: response.data.officer,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            })
            return true
          } else {
            set({
              error: response.error || 'Login failed',
              isLoading: false,
              isAuthenticated: false,
              officer: null,
            })
            return false
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
            isAuthenticated: false,
            officer: null,
          })
          return false
        }
      },

      logout: async () => {
        set({ isLoading: true })

        try {
          await apiClient.logout()
        } catch (error) {
          console.error('Logout error:', error)
        } finally {
          set({
            officer: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        }
      },

      loadUser: async () => {
        const token = typeof window !== 'undefined'
          ? localStorage.getItem('gaur_access_token')
          : null

        if (!token) {
          set({ isAuthenticated: false, officer: null })
          return
        }

        set({ isLoading: true })

        try {
          const response = await apiClient.getProfile()

          if (response.success && response.data) {
            set({
              officer: response.data,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            })
          } else {
            // Token might be invalid, clear it
            apiClient.clearToken()
            set({
              officer: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            })
          }
        } catch (error) {
          apiClient.clearToken()
          set({
            officer: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        }
      },

      clearError: () => set({ error: null }),

      // Permission helpers
      hasPermission: (resource: string, action: string) => {
        const { officer } = get()
        if (!officer) return false

        return officer.permissions.some(
          (permission) =>
            permission.resource === resource && permission.action === action
        )
      },

      hasRole: (roleName: string) => {
        const { officer } = get()
        if (!officer) return false

        return officer.role_names.includes(roleName)
      },

      hasMinimumLevel: (level: number) => {
        const { officer } = get()
        if (!officer) return false

        return officer.minimum_role_level >= level
      },
    }),
    {
      name: 'gaur-auth-storage',
      partialize: (state) => ({
        officer: state.officer,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)