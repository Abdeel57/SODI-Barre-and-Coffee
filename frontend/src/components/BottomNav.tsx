import { NavLink, useLocation } from 'react-router-dom'
import { Calendar, BookOpen, CreditCard, User } from 'lucide-react'
import { clsx } from 'clsx'
import { useStore } from '../store/useStore'

interface NavItem {
  to: string
  icon: typeof Calendar
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/schedule', icon: Calendar, label: 'Horario' },
  { to: '/bookings', icon: BookOpen, label: 'Reservas' },
  { to: '/packages', icon: CreditCard, label: 'Paquetes' },
  { to: '/profile', icon: User, label: 'Perfil' },
]

export function BottomNav() {
  const user = useStore((s) => s.user)
  const { pathname } = useLocation()

  // Hide on admin/coach routes or when not authenticated
  if (!user || pathname.startsWith('/admin') || pathname.startsWith('/coach')) return null

  return (
    <nav
      className={clsx(
        'fixed bottom-0 inset-x-0 z-30',
        'liquid-glass border-t border-nude-border',
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex h-16">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'tap-target flex-1 flex flex-col items-center justify-center gap-0.5',
                'transition-colors duration-150',
                isActive ? 'text-noir' : 'text-stone',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={1.5} />
                {isActive && (
                  <span className="text-label text-[10px] leading-none">{label}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
