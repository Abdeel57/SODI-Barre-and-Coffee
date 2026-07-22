import { useRef, useState } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, LogOut, Camera } from 'lucide-react'
import { clsx } from 'clsx'
import { useStore } from '../../store/useStore'
import { authApi, profileApi } from '../../api'
import { CoachAvatar } from '../CoachAvatar'
import { compressImage } from '../../lib/image'

const NAV_ITEMS = [
  { to: '/coach/dashboard', icon: LayoutDashboard, label: 'Mis clases' },
  { to: '/coach/attendance', icon: ClipboardList, label: 'Lista' },
]

export function CoachLayout() {
  const navigate = useNavigate()
  const user = useStore((s) => s.user)
  const accessToken = useStore((s) => s.accessToken)
  const setAuth = useStore((s) => s.setAuth)
  const logout = useStore((s) => s.logout)
  const showToast = useStore((s) => s.showToast)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // La foto se muestra a las alumnas en el horario y al reservar
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user || !accessToken) return
    e.target.value = ''
    setAvatarUploading(true)
    try {
      const compressed = await compressImage(file)
      await profileApi.updateAvatar(compressed)
      setAuth({ ...user, avatar: compressed }, accessToken)
      showToast('Foto actualizada', 'success')
    } catch {
      showToast('Error al subir la foto', 'error')
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handleLogout() {
    try { await authApi.logout() } catch { /* ignore */ }
    logout()
    showToast('Sesión cerrada', 'info')
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-off-white">
      {/* ── Top bar — padding-top respeta notch/isla dinámica en iOS PWA ─── */}
      <header
        className="fixed top-0 inset-x-0 z-30 bg-white/90 border-b border-nude-border liquid-glass"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="h-14 flex items-center px-4 gap-3">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-section text-noir tracking-widest text-[12px]">BARRE</span>
            <span className="bg-nude-light text-nude-dark text-[10px] px-2 py-0.5 rounded-full font-body">
              Coach
            </span>
          </div>
          <span className="text-label text-stone hidden sm:block truncate max-w-[140px]">
            {user?.name}
          </span>

          {/* Foto de la coach — la ven las alumnas al reservar */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="relative tap-target shrink-0"
            aria-label="Cambiar mi foto"
          >
            <CoachAvatar name={user?.name ?? '?'} avatar={user?.avatar} size={32} />
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-noir rounded-full flex items-center justify-center border border-white">
              {avatarUploading
                ? <span className="w-2 h-2 border border-white/50 border-t-white rounded-full animate-spin" />
                : <Camera size={8} className="text-white" />
              }
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />

          <button
            onClick={handleLogout}
            className="tap-target p-1.5 rounded-md text-stone hover:text-noir transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* ── Sidebar (desktop) ────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex fixed left-0 bottom-0 w-[200px] flex-col bg-white border-r border-nude-border pt-6 px-3 z-20"
        style={{ top: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}
      >
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
      <main
        className="md:ml-[200px] pb-nav md:pb-10 min-h-screen"
        style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}
      >
        <Outlet />
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
