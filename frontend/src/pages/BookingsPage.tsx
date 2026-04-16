import { useState, useEffect, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarCheck, BookOpen } from 'lucide-react'
import { format, parseISO, isAfter, addHours } from 'date-fns'
import { es } from 'date-fns/locale'
import { bookingsApi } from '../api'
import { useStore } from '../store/useStore'
import { Skeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import type { Booking } from '../types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

function canCancel(booking: Booking): boolean {
  if (booking.status !== 'CONFIRMED') return false
  const [y, mo, d] = booking.date.split('T')[0].split('-').map(Number)
  const [h, min] = booking.class.startTime.split(':').map(Number)
  const classStart = new Date(y, mo - 1, d, h, min)
  return isAfter(classStart, addHours(new Date(), 3))
}

// ─── SkeletonCard ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white border border-nude-border border-l-[3px] border-l-nude rounded-md p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  )
}

// ─── BookingCard ─────────────────────────────────────────────────────────────

interface BookingCardProps {
  booking: Booking
  onCancelled: () => void
}

const BookingCard = memo(function BookingCard({ booking, onCancelled }: BookingCardProps) {
  const showToast = useStore((s) => s.showToast)
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  const borderColor =
    booking.status === 'CONFIRMED'
      ? 'border-l-nude'
      : booking.status === 'ATTENDED'
        ? 'border-l-noir'
        : 'border-l-nude-border'

  const dateLabel = (() => {
    try {
      const d = parseISO(booking.date.split('T')[0])
      return format(d, "EEE d 'de' MMMM", { locale: es })
    } catch {
      return booking.date
    }
  })()

  async function handleCancel() {
    setLoading(true)
    try {
      await bookingsApi.cancel(booking.id)
      showToast('Reserva cancelada', 'info')
      onCancelled()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      showToast(e.response?.data?.error ?? 'Error al cancelar', 'error')
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  return (
    <div className={`bg-white border border-nude-border rounded-md p-4 border-l-[3px] ${borderColor}`}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <p className="text-label text-stone capitalize">{dateLabel}</p>
        {booking.status === 'CONFIRMED' && (
          <span className="text-label text-[10px] bg-noir text-white px-2.5 py-0.5 rounded-full shrink-0">
            Confirmada
          </span>
        )}
        {booking.status === 'CANCELLED' && (
          <span className="text-label text-[10px] bg-nude-light text-stone px-2.5 py-0.5 rounded-full shrink-0">
            Cancelada
          </span>
        )}
        {booking.status === 'ATTENDED' && (
          <span className="text-label text-[10px] bg-noir text-white px-2.5 py-0.5 rounded-full shrink-0">
            Asistida
          </span>
        )}
      </div>

      <h3 className="text-title text-[20px] text-noir leading-tight">{booking.class.name}</h3>
      <p className="text-label text-stone mt-0.5">
        {booking.class.instructor} · {formatTime(booking.class.startTime)} · {booking.class.durationMin} min
      </p>

      {canCancel(booking) && (
        <div className="mt-3">
          {confirming ? (
            <div className="flex items-center gap-3">
              <p className="text-label text-stone flex-1 text-[12px]">¿Cancelar esta reserva?</p>
              <Button variant="ghost" size="sm" loading={loading} onClick={handleCancel}>
                Sí, cancelar
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
                No
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
              Cancelar reserva
            </Button>
          )}
        </div>
      )}
    </div>
  )
})

// ─── Vacío ────────────────────────────────────────────────────────────────────

function EmptyUpcoming() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2">
      <CalendarCheck size={36} strokeWidth={1.2} className="text-nude" />
      <p className="text-title text-stone mt-1 text-center">Sin reservas próximas</p>
      <p className="text-label text-stone/60 text-center">Reserva tu primera clase en el horario</p>
      <Button variant="secondary" size="sm" className="mt-2" onClick={() => navigate('/schedule')}>
        Ver horario
      </Button>
    </div>
  )
}

function EmptyHistory() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2">
      <BookOpen size={36} strokeWidth={1.2} className="text-nude" />
      <p className="text-title text-stone mt-1 text-center">Sin clases anteriores</p>
      <p className="text-label text-stone/60 text-center">Tu historial aparecerá aquí</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'upcoming' | 'history'

export default function BookingsPage() {
  const showToast = useStore((s) => s.showToast)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('upcoming')

  const fetchBookings = useCallback(async () => {
    try {
      const res = await bookingsApi.myBookings({ limit: 100 })
      setBookings(res.data.data as Booking[])
    } catch {
      showToast('Error al cargar reservas', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcoming = bookings
    .filter((b) => {
      if (b.status !== 'CONFIRMED') return false
      const d = new Date(b.date.split('T')[0] + 'T00:00:00')
      return d >= today
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  const history = bookings
    .filter((b) => {
      if (b.status === 'CONFIRMED') {
        const d = new Date(b.date.split('T')[0] + 'T00:00:00')
        return d < today
      }
      return true
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  const list = tab === 'upcoming' ? upcoming : history

  return (
    <div className="min-h-screen bg-off-white pb-24 page-enter">
      <header className="px-5 pt-12 pb-4">
        <p className="text-section text-stone text-[11px]">MIS CLASES</p>
        <h1 className="text-hero text-noir mt-1">Reservas</h1>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 px-5 pb-4">
        <button
          onClick={() => setTab('upcoming')}
          className={`text-label px-4 py-1.5 rounded-full transition-colors duration-150 ${
            tab === 'upcoming' ? 'bg-noir text-white' : 'text-stone'
          }`}
        >
          Próximas
          {upcoming.length > 0 && (
            <span className={`ml-1.5 text-[10px] ${tab === 'upcoming' ? 'text-nude' : 'text-stone/50'}`}>
              {upcoming.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('history')}
          className={`text-label px-4 py-1.5 rounded-full transition-colors duration-150 ${
            tab === 'history' ? 'bg-noir text-white' : 'text-stone'
          }`}
        >
          Historial
        </button>
      </div>

      {/* List */}
      <div className="px-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : list.length === 0 ? (
          tab === 'upcoming' ? <EmptyUpcoming /> : <EmptyHistory />
        ) : (
          <div className="flex flex-col gap-3">
            {list.map((b, i) => (
              <div
                key={b.id}
                style={{ animationDelay: `${i * 60}ms` }}
                className="animate-[pageIn_0.3s_ease-out_both]"
              >
                <BookingCard booking={b} onCancelled={fetchBookings} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
