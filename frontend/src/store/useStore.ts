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
  pendingOnboarding: boolean    // true only after new registration — triggers the tutorial
  onboardingCompleted: boolean  // true once the tutorial is done/skipped — never shows again
  triggerOnboarding: () => void
  setOnboardingCompleted: () => void

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
      pendingOnboarding: false,
      onboardingCompleted: false,
      triggerOnboarding: () => set({ pendingOnboarding: true }),
      setOnboardingCompleted: () => set({ onboardingCompleted: true, pendingOnboarding: false }),

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
        pendingOnboarding: state.pendingOnboarding,
        onboardingCompleted: state.onboardingCompleted,
      }),
    },
  ),
)
