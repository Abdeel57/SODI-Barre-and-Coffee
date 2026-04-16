import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

export type ToastType = 'success' | 'error' | 'info'

interface Toast {
  message: string
  type: ToastType
}

interface Store {
  // ── Auth ──────────────────────────────────────────────────────────────
  user: User | null
  accessToken: string | null
  setAuth: (user: User, accessToken: string) => void
  logout: () => void
  isAdmin: () => boolean

  // ── Onboarding ────────────────────────────────────────────────────────
  // Stored server-side on User.onboardingCompleted.
  // This method updates the local copy optimistically after the API call.
  markOnboardingComplete: () => void

  // ── UI ────────────────────────────────────────────────────────────────
  toast: Toast | null
  showToast: (message: string, type: ToastType) => void
  hideToast: () => void
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // ── Auth ────────────────────────────────────────────────────────
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      logout: () => set({ user: null, accessToken: null }),
      isAdmin: () => get().user?.role === 'ADMIN',

      // ── Onboarding ──────────────────────────────────────────────────
      markOnboardingComplete: () =>
        set((s) => ({
          user: s.user ? { ...s.user, onboardingCompleted: true } : null,
        })),

      // ── UI ──────────────────────────────────────────────────────────
      toast: null,
      showToast: (message, type) => set({ toast: { message, type } }),
      hideToast: () => set({ toast: null }),
    }),
    {
      name: 'sodi-store',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
    },
  ),
)
