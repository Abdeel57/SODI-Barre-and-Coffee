import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Package, Calendar, Heart, KeyRound, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { clsx } from 'clsx'
import { authApi, packagesApi, paymentsApi, pushApi, profileApi } from '../api'
import { useStore } from '../store/useStore'
import { usePush } from '../hooks/usePush'
import { Skeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { BottomSheet } from '../components/ui/BottomSheet'
import type { Subscription, PaymentHistory, HealthProfile } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatMXN(amount: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(amount)
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ on }: { on: boolean }) {
  return (
    <div className={`w-10 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5 ${on ? 'bg-noir' : 'bg-nude-border'}`}>
      <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${on ? 'translate-x-4' : 'translate-x-0'}`} />
    </div>
  )
}

// ─── Health toggle button ─────────────────────────────────────────────────────
function HealthToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={clsx(
        'flex items-center justify-between w-full px-4 py-3 rounded-sm border transition-colors duration-200',
        checked ? 'border-nude bg-nude/10 text-noir' : 'border-nude-border bg-white text-stone',
      )}
    >
      <span className="font-body text-[14px] text-left">{label}</span>
      <span className={clsx('w-9 h-5 rounded-full flex items-center transition-colors duration-200 shrink-0 ml-3', checked ? 'bg-nude justify-end' : 'bg-stone/30 justify-start')}>
        <span className="w-4 h-4 rounded-full bg-white shadow mx-0.5" />
      </span>
    </button>
  )
}

// ─── Shared input styles ──────────────────────────────────────────────────────
const fieldCls = clsx(
  'w-full border border-nude-border rounded-sm px-4 py-3',
  'font-body text-[16px] text-noir placeholder:text-stone bg-white',
  'focus:outline-none focus:border-nude transition-colors appearance-none',
)
const labelCls = 'text-[12px] text-stone'

// ─── Section row ──────────────────────────────────────────────────────────────
function ProfileRow({ icon, label, onClick, right }: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  right?: React.ReactNode
}) {
  return (
    <button
      className="flex items-center gap-3 px-6 py-4 border-b border-nude-border w-full tap-target"
      onClick={onClick}
    >
      <span className="shrink-0">{icon}</span>
      <span className="text-label flex-1 text-left">{label}</span>
      {right ?? <ChevronRight size={16} strokeWidth={1.5} className="text-nude-border" />}
    </button>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ProfilePage() {
  const navigate  = useNavigate()
  const user      = useStore((s) => s.user)
  const logout    = useStore((s) => s.logout)
  const showToast = useStore((s) => s.showToast)
  const { permission, requestPermission, sendTestPush } = usePush()

  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [payments,     setPayments]     = useState<PaymentHistory[]>([])
  const [health,       setHealth]       = useState<HealthProfile | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [loggingOut,   setLoggingOut]   = useState(false)
  const [pushLoading,  setPushLoading]  = useState(false)

  // ── Sheets ────────────────────────────────────────────────────────────────
  const [healthOpen,   setHealthOpen]   = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

  // ── Health form ───────────────────────────────────────────────────────────
  const [hasSurgeries,    setHasSurgeries]    = useState(false)
  const [surgeriesDetail, setSurgeriesDetail] = useState('')
  const [isPregnant,      setIsPregnant]      = useState(false)
  const [pregnancyWeeks,  setPregnancyWeeks]  = useState('')
  const [bloodType,       setBloodType]       = useState('')
  const [emergencyName,   setEmergencyName]   = useState('')
  const [emergencyPhone,  setEmergencyPhone]  = useState('')
  const [allergies,       setAllergies]       = useState('')
  const [injuries,        setInjuries]        = useState('')
  const [healthSaving,    setHealthSaving]    = useState(false)

  // ── Password form ─────────────────────────────────────────────────────────
  const [currentPwd,   setCurrentPwd]   = useState('')
  const [newPwd,       setNewPwd]       = useState('')
  const [confirmPwd,   setConfirmPwd]   = useState('')
  const [pwdError,     setPwdError]     = useState('')
  const [pwdSaving,    setPwdSaving]    = useState(false)

  // ── Load data ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [subRes, payRes, healthRes] = await Promise.all([
        packagesApi.mySubscription().catch(() => null),
        paymentsApi.history().catch(() => null),
        profileApi.getHealth().catch(() => null),
      ])
      setSubscription((subRes?.data?.subscription as Subscription) ?? null)
      setPayments(((payRes?.data?.data as PaymentHistory[]) ?? []).slice(0, 3))

      const h = healthRes?.data as HealthProfile | null
      if (h) {
        setHealth(h)
        setHasSurgeries(h.hasSurgeries)
        setSurgeriesDetail(h.surgeriesDetail ?? '')
        setIsPregnant(h.isPregnant)
        setPregnancyWeeks(h.pregnancyWeeks?.toString() ?? '')
        setBloodType(h.bloodType ?? '')
        setEmergencyName(h.emergencyContactName ?? '')
        setEmergencyPhone(h.emergencyContactPhone ?? '')
        setAllergies(h.allergies ?? '')
        setInjuries(h.injuries ?? '')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Save health ───────────────────────────────────────────────────────────
  async function handleSaveHealth() {
    setHealthSaving(true)
    try {
      await profileApi.updateHealth({
        hasSurgeries,
        surgeriesDetail:       hasSurgeries ? surgeriesDetail.trim() || undefined : undefined,
        isPregnant,
        pregnancyWeeks:        isPregnant && pregnancyWeeks ? parseInt(pregnancyWeeks) : null,
        bloodType:             bloodType || undefined,
        emergencyContactName:  emergencyName.trim()  || undefined,
        emergencyContactPhone: emergencyPhone.trim() || undefined,
        allergies:             allergies.trim()  || undefined,
        injuries:              injuries.trim()   || undefined,
      })
      showToast('Perfil de salud actualizado', 'success')
      setHealthOpen(false)
      fetchData()
    } catch {
      showToast('Error al guardar', 'error')
    } finally {
      setHealthSaving(false)
    }
  }

  // ── Save password ─────────────────────────────────────────────────────────
  async function handleSavePassword() {
    setPwdError('')
    if (newPwd.length < 8)        return setPwdError('Mínimo 8 caracteres')
    if (newPwd !== confirmPwd)    return setPwdError('Las contraseñas no coinciden')
    if (!currentPwd)              return setPwdError('Ingresa tu contraseña actual')
    setPwdSaving(true)
    try {
      await profileApi.updatePassword({ currentPassword: currentPwd, newPassword: newPwd })
      showToast('Contraseña actualizada', 'success')
      setPasswordOpen(false)
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setPwdError(msg ?? 'Error al actualizar la contraseña')
    } finally {
      setPwdSaving(false)
    }
  }

  // ── Push notifications ────────────────────────────────────────────────────
  async function handleTogglePush() {
    if (pushLoading) return
    if (permission === 'granted') {
      setPushLoading(true)
      try {
        await pushApi.unsubscribe()
        showToast('Notificaciones desactivadas', 'info')
      } catch {
        showToast('Error al desactivar', 'error')
      } finally {
        setPushLoading(false)
      }
    } else {
      await requestPermission()
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  async function handleLogout() {
    setLoggingOut(true)
    try { await authApi.logout() } catch { /* ignore */ }
    logout()
    showToast('Sesión cerrada', 'info')
    navigate('/login', { replace: true })
  }

  const initial = user?.name?.charAt(0).toUpperCase() ?? '?'

  // ── Health summary text ───────────────────────────────────────────────────
  const healthSummary = health
    ? [
        health.hasSurgeries && 'Cirugías',
        health.isPregnant   && 'Embarazo',
        health.bloodType    && `Sangre ${health.bloodType}`,
        health.emergencyContactName && 'Contacto de emergencia',
      ].filter(Boolean).join(' · ') || 'Completado'
    : 'Sin información'

  return (
    <div className="min-h-screen bg-off-white pb-nav page-enter">

      {/* ── Header / Avatar ────────────────────────────────────────────── */}
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

      {/* ── Plan activo ────────────────────────────────────────────────── */}
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
                    {subscription.classesLeft !== null ? `${subscription.classesLeft} clases restantes` : 'Ilimitado'}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Calendar size={16} strokeWidth={1.5} className="text-nude shrink-0" />
                  <p className="text-label text-stone">
                    Vence el{' '}
                    {(() => { try { return format(parseISO(subscription.expiresAt.split('T')[0]), "d 'de' MMMM", { locale: es }) } catch { return subscription.expiresAt } })()}
                  </p>
                </div>
                {subscription.isExpiringSoon && (
                  <button onClick={() => navigate('/packages')} className="w-full bg-nude-light rounded text-nude-dark text-xs px-3 py-2 mt-3 text-left">
                    ⚠️ Tu plan vence pronto · Renueva aquí →
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center py-4 gap-2">
                <Package size={32} strokeWidth={1.2} className="text-nude-border" />
                <p className="text-title text-stone text-[18px]">Sin plan activo</p>
                <Button variant="secondary" size="sm" className="mt-1" onClick={() => navigate('/packages')}>Ver paquetes</Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Historial de pagos ─────────────────────────────────────────── */}
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
            <div key={p.id} className="flex justify-between items-center px-6 py-3 border-b border-nude-border">
              <div>
                <p className="text-label text-noir">{p.packageName ?? 'Paquete'}</p>
                <p className="text-stone text-xs mt-0.5">
                  {(() => { try { return format(parseISO(p.createdAt), 'dd MMM yyyy', { locale: es }) } catch { return p.createdAt } })()}
                </p>
              </div>
              <p className="text-label text-noir">{formatMXN(p.amountMXN)}</p>
            </div>
          ))
        )}
      </div>

      {/* ── Salud ──────────────────────────────────────────────────────── */}
      <div className="mt-6">
        <p className="text-section text-stone text-[10px] uppercase tracking-widest px-6 mb-2">SALUD</p>
        <ProfileRow
          icon={<Heart size={20} strokeWidth={1.5} className="text-nude" />}
          label="Perfil de salud"
          onClick={() => setHealthOpen(true)}
          right={
            <div className="flex items-center gap-2">
              <span className="text-stone text-[11px] max-w-[140px] truncate">{healthSummary}</span>
              <ChevronRight size={16} strokeWidth={1.5} className="text-nude-border shrink-0" />
            </div>
          }
        />
      </div>

      {/* ── Cuenta ─────────────────────────────────────────────────────── */}
      <div className="mt-6">
        <p className="text-section text-stone text-[10px] uppercase tracking-widest px-6 mb-2">CUENTA</p>

        <button
          className="flex items-center gap-3 px-6 py-4 border-b border-nude-border w-full tap-target"
          onClick={handleTogglePush}
          disabled={pushLoading}
        >
          <Bell size={20} strokeWidth={1.5} className="text-nude shrink-0" />
          <span className="text-label flex-1 text-left">Notificaciones</span>
          <Toggle on={permission === 'granted'} />
        </button>

        {permission === 'granted' && (
          <button
            className="flex items-center gap-3 px-6 py-3 border-b border-nude-border w-full tap-target"
            onClick={sendTestPush}
          >
            <Bell size={16} strokeWidth={1.5} className="text-stone shrink-0" />
            <span className="text-label text-stone text-[13px] flex-1 text-left">Enviar notificación de prueba</span>
          </button>
        )}

        <ProfileRow
          icon={<KeyRound size={20} strokeWidth={1.5} className="text-stone" />}
          label="Cambiar contraseña"
          onClick={() => { setPwdError(''); setCurrentPwd(''); setNewPwd(''); setConfirmPwd(''); setPasswordOpen(true) }}
        />

        <button
          className="flex items-center gap-3 px-6 py-4 border-b border-nude-border w-full tap-target"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <LogOut size={20} strokeWidth={1.5} className="text-stone shrink-0" />
          <span className="text-label text-stone flex-1 text-left">{loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</span>
        </button>
      </div>

      <p className="text-stone text-xs text-center py-6">v1.0.0</p>

      {/* ════════════════════════════════════════════════════════════════
          BOTTOM SHEET — Perfil de salud
      ════════════════════════════════════════════════════════════════ */}
      <BottomSheet isOpen={healthOpen} onClose={() => setHealthOpen(false)} title="Perfil de salud">
        <p className="text-stone text-[12px] mb-5 leading-relaxed">
          Esta información es confidencial y nos ayuda a brindarte una clase segura.
        </p>

        <div className="flex flex-col gap-4">
          <HealthToggle label="¿Has tenido alguna cirugía?" checked={hasSurgeries} onChange={setHasSurgeries} />
          {hasSurgeries && (
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Describe tus cirugías (opcional)</label>
              <textarea rows={2} placeholder="Ej: rodilla derecha, 2022..." value={surgeriesDetail}
                onChange={(e) => setSurgeriesDetail(e.target.value)} className={fieldCls + ' resize-none'} />
            </div>
          )}

          <HealthToggle label="¿Estás embarazada?" checked={isPregnant} onChange={setIsPregnant} />
          {isPregnant && (
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Semanas de gestación</label>
              <input type="number" min={1} max={42} placeholder="Ej: 12" value={pregnancyWeeks}
                onChange={(e) => setPregnancyWeeks(e.target.value)} className={fieldCls} />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Tipo de sangre</label>
            <select value={bloodType} onChange={(e) => setBloodType(e.target.value)}
              className={clsx(fieldCls, !bloodType && 'text-stone')}>
              <option value="">No sé / Prefiero no decir</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Contacto de emergencia — Nombre</label>
            <input type="text" placeholder="Juan González" value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)} className={fieldCls} />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Contacto de emergencia — Teléfono</label>
            <input type="tel" placeholder="664 123 4567" value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)} className={fieldCls} />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Alergias (opcional)</label>
            <textarea rows={2} placeholder="Ej: látex, mariscos..." value={allergies}
              onChange={(e) => setAllergies(e.target.value)} className={fieldCls + ' resize-none'} />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Lesiones o condiciones físicas (opcional)</label>
            <textarea rows={2} placeholder="Ej: lumbalgia, escoliosis..." value={injuries}
              onChange={(e) => setInjuries(e.target.value)} className={fieldCls + ' resize-none'} />
          </div>

          <Button variant="primary" size="lg" loading={healthSaving} onClick={handleSaveHealth} className="w-full mt-2">
            Guardar cambios
          </Button>
        </div>
      </BottomSheet>

      {/* ════════════════════════════════════════════════════════════════
          BOTTOM SHEET — Cambiar contraseña
      ════════════════════════════════════════════════════════════════ */}
      <BottomSheet isOpen={passwordOpen} onClose={() => setPasswordOpen(false)} title="Cambiar contraseña">
        <div className="flex flex-col gap-4 mt-2">
          <Input
            label="Contraseña actual"
            type="password"
            placeholder="••••••••"
            value={currentPwd}
            onChange={(e) => setCurrentPwd(e.target.value)}
            autoComplete="current-password"
          />
          <Input
            label="Nueva contraseña"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            autoComplete="new-password"
          />
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            placeholder="Repite la nueva contraseña"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            autoComplete="new-password"
          />
          {pwdError && <p className="text-red-500 text-[12px]">{pwdError}</p>}
          <Button variant="primary" size="lg" loading={pwdSaving} onClick={handleSavePassword} className="w-full mt-1">
            Actualizar contraseña
          </Button>
        </div>
      </BottomSheet>

    </div>
  )
}
