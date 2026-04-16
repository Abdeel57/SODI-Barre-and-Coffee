import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Package, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { authApi, packagesApi, paymentsApi, pushApi } from '../api'
import { useStore } from '../store/useStore'
import { usePush } from '../hooks/usePush'
import { Skeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import type { Subscription, PaymentHistory } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(amount)
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ on }: { on: boolean }) {
  return (
    <div
      className={`w-10 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5 ${
        on ? 'bg-noir' : 'bg-nude-border'
      }`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          on ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const navigate = useNavigate()
  const user = useStore((s) => s.user)
  const logout = useStore((s) => s.logout)
  const showToast = useStore((s) => s.showToast)
  const { permission, requestPermission } = usePush()

  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [payments, setPayments] = useState<PaymentHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [subRes, payRes] = await Promise.all([
        packagesApi.mySubscription().catch(() => null),
        paymentsApi.history().catch(() => null),
      ])
      setSubscription((subRes?.data?.subscription as Subscription) ?? null)
      setPayments(((payRes?.data?.data as PaymentHistory[]) ?? []).slice(0, 3))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleTogglePush() {
    if (pushLoading) return
    if (permission === 'granted') {
      setPushLoading(true)
      try {
        await pushApi.unsubscribe()
        showToast('Notificaciones desactivadas', 'info')
      } catch {
        showToast('Error al desactivar notificaciones', 'error')
      } finally {
        setPushLoading(false)
      }
    } else {
      await requestPermission()
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await authApi.logout()
    } catch {
      // Ignore — logout locally regardless
    }
    logout()
    showToast('Sesión cerrada', 'info')
    navigate('/login', { replace: true })
  }

  const initial = user?.name?.charAt(0).toUpperCase() ?? '?'

  return (
    <div className="min-h-screen bg-off-white pb-24 page-enter">
      {/* Header / Avatar */}
      <header className="pt-12 px-6 pb-6">
        {loading ? (
          <div className="flex flex-col">
            <Skeleton className="w-[72px] h-[72px] rounded-full" />
            <Skeleton className="h-6 w-40 rounded mt-4" />
            <Skeleton className="h-3 w-32 rounded mt-2" />
          </div>
        ) : (
          <>
            <div className="w-[72px] h-[72px] rounded-full bg-nude-light border-2 border-nude flex items-center justify-center">
              <span className="text-hero text-[28px] text-nude-dark font-display">{initial}</span>
            </div>
            <h1 className="text-hero text-[28px] text-noir mt-4 leading-tight">{user?.name}</h1>
            <p className="text-label text-stone mt-1">{user?.email}</p>
          </>
        )}
      </header>

      {/* Subscription card */}
      <div className="mx-4">
        {loading ? (
          <Skeleton className="h-32 w-full rounded-lg" />
        ) : (
          <div className="bg-white border border-nude-border rounded-lg p-5 liquid-glass">
            <p className="text-section text-stone text-[10px] uppercase tracking-widest mb-3">MI PLAN</p>
            {subscription?.isActive ? (
              <>
                <p className="text-title text-noir text-[22px]">{subscription.packageName}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Package size={16} strokeWidth={1.5} className="text-nude shrink-0" />
                  <p className="text-label text-stone">
                    {subscription.classesLeft !== null
                      ? `${subscription.classesLeft} clases restantes`
                      : 'Ilimitado'}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Calendar size={16} strokeWidth={1.5} className="text-nude shrink-0" />
                  <p className="text-label text-stone">
                    Vence el{' '}
                    {(() => {
                      try {
                        return format(
                          parseISO(subscription.expiresAt.split('T')[0]),
                          "d 'de' MMMM",
                          { locale: es },
                        )
                      } catch {
                        return subscription.expiresAt
                      }
                    })()}
                  </p>
                </div>
                {subscription.isExpiringSoon && (
                  <button
                    onClick={() => navigate('/packages')}
                    className="w-full bg-nude-light rounded text-nude-dark text-xs px-3 py-2 mt-3 text-left"
                  >
                    ⚠️ Tu plan vence pronto · Renueva aquí →
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center py-4 gap-2">
                <Package size={32} strokeWidth={1.2} className="text-nude-border" />
                <p className="text-title text-stone text-[18px]">Sin plan activo</p>
                <Button variant="secondary" size="sm" className="mt-1" onClick={() => navigate('/packages')}>
                  Ver paquetes
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment history */}
      <div className="mt-6">
        <p className="text-section text-stone text-[10px] uppercase tracking-widest px-6 mb-3">MIS PAGOS</p>
        {loading ? (
          <div className="px-6 flex flex-col gap-2">
            <Skeleton className="h-10 w-full rounded" />
            <Skeleton className="h-10 w-full rounded" />
          </div>
        ) : payments.length === 0 ? (
          <p className="text-label text-stone px-6">Sin pagos registrados</p>
        ) : (
          payments.map((p) => (
            <div
              key={p.id}
              className="flex justify-between items-center px-6 py-3 border-b border-nude-border"
            >
              <div>
                <p className="text-label text-noir">{p.packageName ?? 'Paquete'}</p>
                <p className="text-stone text-xs mt-0.5">
                  {(() => {
                    try {
                      return format(parseISO(p.createdAt), 'dd MMM yyyy', { locale: es })
                    } catch {
                      return p.createdAt
                    }
                  })()}
                </p>
              </div>
              <p className="text-label text-noir">{formatMXN(p.amountMXN)}</p>
            </div>
          ))
        )}
      </div>

      {/* Account options */}
      <div className="mt-6">
        <p className="text-section text-stone text-[10px] uppercase tracking-widest px-6 mb-2">CUENTA</p>

        {/* Push notifications */}
        <button
          className="flex items-center gap-3 px-6 py-4 border-b border-nude-border w-full tap-target"
          onClick={handleTogglePush}
          disabled={pushLoading}
        >
          <Bell size={20} strokeWidth={1.5} className="text-nude shrink-0" />
          <span className="text-label flex-1 text-left">Notificaciones</span>
          <Toggle on={permission === 'granted'} />
        </button>

        {/* Logout */}
        <button
          className="flex items-center gap-3 px-6 py-4 border-b border-nude-border w-full tap-target"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <LogOut size={20} strokeWidth={1.5} className="text-stone shrink-0" />
          <span className="text-label text-stone flex-1 text-left">
            {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </span>
        </button>
      </div>

      <p className="text-stone text-xs text-center py-6">v1.0.0</p>
    </div>
  )
}
