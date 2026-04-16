import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { usePush } from '../hooks/usePush'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SNOOZE_KEY = 'sodi-notif-prompt-snoozed'
const SNOOZE_MS  = 3 * 24 * 60 * 60 * 1000 // 3 days

function isSnoozed(): boolean {
  const ts = localStorage.getItem(SNOOZE_KEY)
  if (!ts) return false
  return Date.now() - parseInt(ts) < SNOOZE_MS
}

function snooze() {
  localStorage.setItem(SNOOZE_KEY, String(Date.now()))
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export function NotificationPrompt() {
  const user                              = useStore((s) => s.user)
  const { permission, requestPermission } = usePush()
  const [visible, setVisible]             = useState(false)
  const [loading, setLoading]             = useState(false)

  useEffect(() => {
    // Only show in standalone mode, only for students, only if not yet decided
    if (!user || user.role !== 'STUDENT') return
    if (!isStandalone()) return
    if (permission !== 'default') return
    if (isSnoozed()) return

    // Brief delay so the page finishes loading before we interrupt
    const t = setTimeout(() => setVisible(true), 2000)
    return () => clearTimeout(t)
  }, [user, permission])

  if (!visible) return null

  function handleDismiss() {
    snooze()
    setVisible(false)
  }

  async function handleActivate() {
    setLoading(true)
    await requestPermission()
    setLoading(false)
    setVisible(false)
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ animation: 'landingFadeUp 0.35s cubic-bezier(0.22,1,0.36,1) both' }}
    >
      {/* Dimmed background */}
      <div
        className="absolute inset-0 bg-noir/50"
        onClick={handleDismiss}
      />

      {/* Card */}
      <div className="relative w-full max-w-sm mx-3 mb-6 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-stone hover:bg-nude-light transition-colors"
          aria-label="Cerrar"
        >
          <X size={14} strokeWidth={2} />
        </button>

        {/* Icon strip */}
        <div className="bg-nude-light px-6 pt-7 pb-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-nude/30 flex items-center justify-center shrink-0">
            <Bell size={22} strokeWidth={1.5} className="text-nude-dark" />
          </div>
          <div>
            <p className="text-noir font-body font-medium text-[15px] leading-tight">
              Activa recordatorios de tus clases
            </p>
            <p className="text-stone text-[12px] font-body mt-0.5">
              Te avisamos antes de que empiece tu clase
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pt-4 pb-6 flex flex-col gap-4">
          <p className="text-stone text-[13px] font-body leading-relaxed">
            Recibe una notificación antes de cada clase para que nunca se te olvide.
            Puedes desactivarlas en cualquier momento desde tu perfil.
          </p>

          <button
            onClick={handleActivate}
            disabled={loading}
            className="w-full py-3.5 rounded-sm bg-noir text-white text-label tracking-wide transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? 'Activando…' : 'Activar notificaciones'}
          </button>

          <button
            onClick={handleDismiss}
            className="text-stone text-[13px] font-body text-center hover:text-noir transition-colors"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  )
}
