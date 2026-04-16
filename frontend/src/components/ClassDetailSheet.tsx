import { MapPin, Clock, Users } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { BottomSheet } from './ui/BottomSheet'
import { Button } from './ui/Button'
import type { ClassSlot, Subscription } from '../types'

interface ClassDetailSheetProps {
  slot: ClassSlot | null
  subscription: Subscription | null
  bookingLoading: boolean
  cancelLoadingId: string | null
  onBook: (slot: ClassSlot) => void
  onCancel: (bookingId: string) => void
  onClose: () => void
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function ClassDetailSheet({
  slot,
  subscription,
  bookingLoading,
  cancelLoadingId,
  onBook,
  onCancel,
  onClose,
}: ClassDetailSheetProps) {
  if (!slot) return null

  const hasSubscription = !!subscription?.isActive
  const isFull = slot.availableSpots === 0 && !slot.isBooked
  const isCancelLoading = cancelLoadingId === slot.bookingId

  const dateLabel = (() => {
    try {
      const d = new Date(slot.date + 'T00:00:00')
      return format(d, "EEEE d 'de' MMMM", { locale: es })
    } catch {
      return slot.date
    }
  })()

  const endMinutes =
    slot.startTime
      .split(':')
      .reduce((acc, v, i) => acc + Number(v) * (i === 0 ? 60 : 1), 0) + slot.durationMin
  const endHour = Math.floor(endMinutes / 60)
  const endMin = endMinutes % 60
  const endPeriod = endHour >= 12 ? 'PM' : 'AM'
  const endHour12 = endHour % 12 || 12
  const timeRange = `${formatTime(slot.startTime)} – ${endHour12}:${endMin.toString().padStart(2, '0')} ${endPeriod}`

  return (
    <BottomSheet isOpen={!!slot} onClose={onClose}>
      {/* Gradient header */}
      <div className="relative -mx-5 -mt-2 mb-5 px-5 pt-6 pb-5 bg-gradient-to-b from-nude-light/60 to-transparent rounded-t-xl">
        <p className="text-section text-stone text-[10px] uppercase tracking-widest mb-1 capitalize">
          {dateLabel}
        </p>
        <h2 className="text-hero text-[28px] text-noir leading-tight">{slot.name}</h2>

        {/* Instructor avatar row */}
        <div className="flex items-center gap-2 mt-3">
          <div className="w-8 h-8 rounded-full bg-nude flex items-center justify-center shrink-0">
            <span className="text-label text-[11px] text-noir font-medium">
              {getInitials(slot.instructor)}
            </span>
          </div>
          <span className="text-label text-stone">{slot.instructor}</span>
        </div>
      </div>

      {/* Details grid */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-nude-light flex items-center justify-center shrink-0">
            <Clock size={15} strokeWidth={1.5} className="text-nude-dark" />
          </div>
          <div>
            <p className="text-label text-[11px] text-stone uppercase tracking-wide">Horario</p>
            <p className="text-label text-noir">{timeRange} · {slot.durationMin} min</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-nude-light flex items-center justify-center shrink-0">
            <MapPin size={15} strokeWidth={1.5} className="text-nude-dark" />
          </div>
          <div>
            <p className="text-label text-[11px] text-stone uppercase tracking-wide">Lugar</p>
            <p className="text-label text-noir">SODI Barre & Coffee</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-nude-light flex items-center justify-center shrink-0">
            <Users size={15} strokeWidth={1.5} className="text-nude-dark" />
          </div>
          <div>
            <p className="text-label text-[11px] text-stone uppercase tracking-wide">Disponibilidad</p>
            <p className="text-label text-noir">
              {slot.isBooked
                ? 'Ya tienes lugar reservado'
                : isFull
                  ? 'Clase llena'
                  : `${slot.availableSpots} lugar${slot.availableSpots !== 1 ? 'es' : ''} disponible${slot.availableSpots !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      {/* Subscription status */}
      {!slot.isBooked && (
        <div className="mb-5 rounded-lg border border-nude-border bg-nude-light/40 px-4 py-3">
          {hasSubscription ? (
            <p className="text-label text-stone">
              <span className="text-noir font-medium">
                {subscription!.classesLeft !== null
                  ? `${subscription!.classesLeft} clase${subscription!.classesLeft !== 1 ? 's' : ''}`
                  : 'Clases ilimitadas'}
              </span>{' '}
              restantes en tu paquete
              {subscription!.isExpiringSoon && (
                <span className="text-amber-600"> · Vence pronto</span>
              )}
            </p>
          ) : (
            <p className="text-label text-stone">
              Sin paquete activo.{' '}
              <span className="text-nude-dark underline underline-offset-2">Ver paquetes</span>
            </p>
          )}
        </div>
      )}

      {/* Action button — 4 cases */}
      <div className="pb-2">
        {slot.isBooked ? (
          <Button
            variant="ghost"
            size="lg"
            loading={isCancelLoading}
            onClick={() => slot.bookingId && onCancel(slot.bookingId)}
            className="w-full"
          >
            Cancelar reserva
          </Button>
        ) : isFull ? (
          <Button variant="secondary" size="lg" disabled className="w-full">
            Clase llena
          </Button>
        ) : !hasSubscription ? (
          <Button variant="secondary" size="lg" disabled className="w-full">
            Necesitas un paquete activo
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            loading={bookingLoading}
            onClick={() => onBook(slot)}
            className="w-full"
          >
            Reservar lugar
          </Button>
        )}
      </div>
    </BottomSheet>
  )
}
