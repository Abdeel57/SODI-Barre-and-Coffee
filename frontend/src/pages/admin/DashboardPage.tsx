import { useState, useEffect } from 'react'
import { Bell, Users, Calendar, CreditCard, Package, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { adminApi } from '../../api/admin'
import { useStore } from '../../store/useStore'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { Input } from '../../components/ui/Input'
import type { DashboardData, TodayClass } from '../../types/admin'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMXN(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType
  value: string
  label: string
}) {
  return (
    <div className="bg-white border border-nude-border rounded-lg p-4 liquid-glass flex flex-col gap-1">
      <Icon size={20} strokeWidth={1.5} className="text-nude mb-1" />
      <span className="font-display text-3xl font-light text-noir leading-none">{value}</span>
      <span className="text-label text-stone">{label}</span>
    </div>
  )
}

// ─── TodayClassCard ───────────────────────────────────────────────────────────

function TodayClassCard({ cls }: { cls: TodayClass }) {
  const [expanded, setExpanded] = useState(false)
  const isFull = cls.occupancyPercent >= 80

  return (
    <div className="bg-white border border-nude-border rounded-lg mx-4 mb-3">
      <div className="flex items-center justify-between p-4">
        <div>
          <p className="text-label font-medium text-noir">{cls.name}</p>
          <p className="text-stone text-xs mt-0.5">{formatTime(cls.startTime)}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-label text-stone">
            {cls.confirmedBookings}/{cls.maxCapacity}
          </span>
          <div className="w-16 h-1 bg-nude-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isFull ? 'bg-noir' : 'bg-nude'}`}
              style={{ width: `${cls.occupancyPercent}%` }}
            />
          </div>
        </div>
      </div>

      {cls.students.length > 0 && (
        <>
          <div className="border-t border-nude-border" />
          <button
            className="flex items-center gap-1.5 px-4 py-2 text-label text-nude tap-target w-full"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Ocultar' : `Ver alumnas (${cls.students.length})`}
          </button>
          {expanded && (
            <div className="px-4 pb-3 flex flex-col">
              {cls.students.map((s) => (
                <div key={s.id} className="flex items-center gap-2 py-1.5">
                  <div className="w-6 h-6 rounded-full bg-nude-light flex items-center justify-center shrink-0">
                    <span className="text-[10px] text-nude-dark font-medium">
                      {s.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-label text-noir truncate">{s.name}</p>
                    <p className="text-stone text-xs truncate">{s.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Push Modal ───────────────────────────────────────────────────────────────

function PushModal({ onClose }: { onClose: () => void }) {
  const showToast = useStore((s) => s.showToast)
  const [target, setTarget] = useState<'all' | 'inactive'>('all')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    if (!title.trim() || !body.trim()) return
    setLoading(true)
    try {
      const res = await adminApi.sendPush({ target, title: title.trim(), body: body.trim() })
      const { sent } = res.data as { sent: number }
      showToast(`Notificación enviada a ${sent} alumna${sent !== 1 ? 's' : ''}`, 'success')
      onClose()
    } catch {
      showToast('Error al enviar notificación', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-label text-stone">Destinatarias</label>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value as 'all' | 'inactive')}
          className="w-full border border-nude-border rounded-sm px-4 py-3 text-label bg-white text-noir focus:outline-none focus:border-nude"
        >
          <option value="all">Todas las alumnas</option>
          <option value="inactive">Sin reservas esta semana</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <label className="text-label text-stone">Título</label>
          <span className="text-stone text-xs">{title.length}/50</span>
        </div>
        <Input
          placeholder="Ej. ¡Nueva clase disponible!"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 50))}
          maxLength={50}
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <label className="text-label text-stone">Mensaje</label>
          <span className="text-stone text-xs">{body.length}/120</span>
        </div>
        <textarea
          rows={3}
          maxLength={120}
          placeholder="Ej. Reserva tu lugar para la clase de mañana"
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 120))}
          className="w-full border border-nude-border rounded-sm px-4 py-3 text-label text-noir bg-white placeholder:text-stone focus:outline-none focus:border-nude resize-none"
        />
      </div>

      <Button
        variant="primary"
        size="lg"
        loading={loading}
        disabled={!title.trim() || !body.trim()}
        onClick={handleSend}
        className="w-full"
      >
        Enviar notificación
      </Button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const showToast = useStore((s) => s.showToast)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pushOpen, setPushOpen] = useState(false)

  useEffect(() => {
    adminApi
      .getDashboard()
      .then((r) => setData(r.data as DashboardData))
      .catch(() => showToast('Error al cargar el dashboard', 'error'))
      .finally(() => setLoading(false))
  }, [showToast])

  const dateLabel = (() => {
    const s = format(new Date(), "EEEE, d 'de' MMMM", { locale: es })
    return s.charAt(0).toUpperCase() + s.slice(1)
  })()

  return (
    <div className="min-h-screen bg-off-white pb-8 page-enter">
      <header className="px-5 pt-8 pb-4">
        <p className="text-section text-stone text-[11px]">RESUMEN</p>
        <h1 className="text-hero text-noir mt-1 text-[32px]">{dateLabel}</h1>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 px-4 mt-2">
        {loading ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)
        ) : (
          <>
            <StatCard icon={Users} value={String(data?.stats.totalStudents ?? 0)} label="Alumnas activas" />
            <StatCard icon={Calendar} value={String(data?.stats.bookingsThisWeek ?? 0)} label="Reservas esta semana" />
            <StatCard icon={CreditCard} value={formatMXN(data?.stats.revenueThisMonth ?? 0)} label="Ingresos del mes" />
            <StatCard icon={Package} value={String(data?.stats.activeSubscriptions ?? 0)} label="Planes activos" />
          </>
        )}
      </div>

      {/* Today's classes */}
      <p className="text-section text-stone text-[11px] px-4 mt-8 mb-3">CLASES DE HOY</p>
      {loading ? (
        <div className="mx-4 flex flex-col gap-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      ) : data?.today.classes.length === 0 ? (
        <p className="text-label text-stone px-4">No hay clases programadas para hoy</p>
      ) : (
        data?.today.classes.map((cls) => <TodayClassCard key={cls.classId} cls={cls} />)
      )}

      {/* FAB */}
      <div className="fixed bottom-24 right-4 md:bottom-8 md:right-6 z-20">
        <Button
          variant="primary"
          size="sm"
          onClick={() => setPushOpen(true)}
          className="liquid-glass-strong flex items-center gap-2 shadow-lg"
        >
          <Bell size={16} strokeWidth={1.5} />
          Notificar alumnas
        </Button>
      </div>

      <BottomSheet isOpen={pushOpen} onClose={() => setPushOpen(false)} title="Enviar notificación">
        <PushModal onClose={() => setPushOpen(false)} />
      </BottomSheet>
    </div>
  )
}
