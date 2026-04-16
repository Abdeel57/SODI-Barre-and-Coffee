import { useEffect } from 'react'
import { CheckCircle, XCircle, Info } from 'lucide-react'
import { clsx } from 'clsx'
import { useStore } from '../../store/useStore'
import type { ToastType } from '../../store/useStore'

const iconMap: Record<ToastType, JSX.Element> = {
  success: <CheckCircle size={16} className="text-emerald-500 shrink-0" />,
  error: <XCircle size={16} className="text-red-500 shrink-0" />,
  info: <Info size={16} className="text-nude shrink-0" />,
}

export function Toast() {
  const toast = useStore((s) => s.toast)
  const hideToast = useStore((s) => s.hideToast)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(hideToast, 3000)
    return () => clearTimeout(timer)
  }, [toast, hideToast])

  if (!toast) return null

  return (
    <div
      className={clsx(
        'fixed bottom-24 left-1/2 -translate-x-1/2 z-50',
        'liquid-glass-strong bg-white/95 rounded-lg',
        'max-w-[280px] w-max px-4 py-3',
        'flex items-center gap-2.5',
        'page-enter',
      )}
      role="alert"
      aria-live="polite"
    >
      {iconMap[toast.type]}
      <p className="text-label text-[13px] text-noir leading-snug">{toast.message}</p>
    </div>
  )
}
