import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-noir/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={clsx(
          'relative w-full max-w-sm bg-white rounded-lg shadow-xl',
          'page-enter',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          {title && <h2 className="text-title text-noir">{title}</h2>}
          <button
            onClick={onClose}
            className={clsx(
              'tap-target ml-auto p-1 rounded-full',
              'text-stone hover:text-noir transition-colors',
            )}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  )
}
