import { ReactNode, useEffect, useState } from 'react'
import { clsx } from 'clsx'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      setIsClosing(false)
    } else if (shouldRender) {
      setIsClosing(true)
      const timer = setTimeout(() => {
        setShouldRender(false)
        setIsClosing(false)
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Scroll + position lock — prevents background scroll AND iOS bounce while sheet is open
  useEffect(() => {
    if (shouldRender) {
      const scrollY = window.scrollY
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
    } else {
      const scrollY = parseInt(document.body.style.top || '0') * -1
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY)
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
    }
  }, [shouldRender])

  if (!shouldRender) return null

  return (
    <div className="fixed inset-0 z-40">
      {/* Overlay */}
      <div
        className={clsx(
          'absolute inset-0 bg-noir/40',
          isClosing ? 'animate-[fadeOut_0.25s_ease-out_forwards]' : 'animate-[fadeIn_0.2s_ease-out]',
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={clsx(
          'absolute bottom-0 inset-x-0',
          'liquid-glass bg-white/95 rounded-t-2xl',
          'max-h-[85dvh] overflow-y-auto no-scrollbar',
          'pb-[env(safe-area-inset-bottom,16px)]',
          isClosing ? 'bottom-sheet-exit' : 'bottom-sheet-enter',
        )}
      >
        {/* Handle */}
        <div className="flex justify-center mt-3 mb-2">
          <div className="w-8 h-1 bg-nude-border rounded-full" />
        </div>

        {title && (
          <div className="px-5 pb-3">
            <h2 className="text-title text-noir">{title}</h2>
          </div>
        )}

        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  )
}
