import { ReactNode } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { LayoutDashboard, Calendar, Users, CreditCard, LogOut } from 'lucide-react'
import { clsx } from 'clsx'
import { useStore } from '../../store/useStore'
import { authApi } from '../../api'

const NAV_ITEMS = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/classes', icon: Calendar, label: 'Clases' },
  { to: '/admin/students', icon: Users, label: 'Alumnas' },
  { to: '/admin/payments', icon: CreditCard, label: 'Pagos' },
]

interface AdminLayoutProps {
  children?: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate()
  const user = useStore((s) => s.user)
  const logout = useStore((s) => s.logout)
  const showToast = useStore((s) => s.showToast)

  async function handleLogout() {
    try {
      await authApi.logout()
    } catch {
      // ignore
    }
    logout()
    showToast('Sesión cerrada', 'info')
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-off-white">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-30 h-14 bg-white/90 border-b border-nude-border liquid-glass flex items-center px-4 gap-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-section text-noir tracking-widest text-[12px]">BARRE</span>
          <span className="bg-nude-light text-nude-dark text-[10px] px-2 py-0.5 rounded-full font-body">
            Admin
          </span>
        </div>
        <span className="text-label text-stone hidden sm:block truncate max-w-[140px]">
          {user?.name}
        </span>
        <button
          onClick={handleLogout}
          className="tap-target p-1.5 rounded-md text-stone hover:text-noir transition-colors"
          aria-label="Cerrar sesión"
        >
          <LogOut size={18} strokeWidth={1.5} />
        </button>
      </header>

      {/* ── Sidebar (desktop) ────────────────────────────────────────────── */}
      <aside className="hidden md:flex fixed left-0 top-14 bottom-0 w-[200px] flex-col bg-white border-r border-nude-border pt-6 px-3 z-20">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-md tap-target text-label mb-1 transition-colors',
                isActive
                  ? 'bg-nude-light text-noir font-medium'
                  : 'text-stone hover:bg-off-white',
              )
            }
          >
            <Icon size={18} strokeWidth={1.5} />
            {label}
          </NavLink>
        ))}
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="pt-14 md:ml-[200px] pb-24 md:pb-10 min-h-screen">
        {children ?? <Outlet />}
      </main>

      {/* ── Bottom nav (mobile) ──────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/90 border-t border-nude-border liquid-glass flex pb-[env(safe-area-inset-bottom,0px)]">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex flex-1 flex-col items-center justify-center py-2 gap-0.5 tap-target transition-colors',
                isActive ? 'text-noir' : 'text-stone',
              )
            }
          >
            <Icon size={20} strokeWidth={1.5} />
            <span className="text-label text-[9px] uppercase tracking-wide">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
