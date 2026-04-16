import { ReactNode } from 'react'
import { clsx } from 'clsx'

type BadgeVariant = 'available' | 'filling' | 'full' | 'booked'

interface BadgeProps {
  variant: BadgeVariant
  children?: ReactNode
}

const variantClasses: Record<BadgeVariant, string> = {
  available: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  filling: 'bg-amber-50 text-amber-700 border border-amber-200',
  full: 'bg-nude-light text-stone border border-nude-border',
  booked: 'bg-noir text-white',
}

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={clsx(
        'text-label text-[10px] px-2.5 py-0.5 rounded-full inline-flex items-center',
        variantClasses[variant],
      )}
    >
      {variant === 'full' ? 'Clase llena' : children}
    </span>
  )
}
