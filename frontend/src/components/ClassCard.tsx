import { memo } from 'react'
import { User } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import type { ClassSlot } from '../types'

interface ClassCardProps {
  slot: ClassSlot
  cancelLoadingId: string | null
  onOpenDetail: (slot: ClassSlot) => void
  onCancel: (bookingId: string) => void
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

export const ClassCard = memo(function ClassCard({
  slot,
  cancelLoadingId,
  onOpenDetail,
  onCancel,
}: ClassCardProps) {
  const { availableSpots, isBooked, bookingId } = slot
  const isCancelLoading = cancelLoadingId === bookingId

  const badgeVariant = isBooked
    ? 'booked'
    : availableSpots === 0
      ? 'full'
      : availableSpots <= 4
        ? 'filling'
        : 'available'

  const badgeLabel = isBooked
    ? 'Reservada ✓'
    : availableSpots === 0
      ? undefined
      : availableSpots <= 4
        ? `Últimos ${availableSpots}`
        : `${availableSpots} lugares`

  return (
    <button
      className={clsx(
        'bg-white border border-nude-border rounded-md p-4 text-left w-full',
        'border-l-[3px] transition-opacity duration-150 active:opacity-80',
        isBooked ? 'border-l-noir' : 'border-l-nude',
        availableSpots === 0 && !isBooked ? 'opacity-60' : '',
      )}
      onClick={() => onOpenDetail(slot)}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-label text-stone mb-0.5">{formatTime(slot.startTime)}</p>
          <h3 className="text-title text-[20px] text-noir leading-tight truncate">
            {slot.name}
          </h3>
          <p className="text-label text-stone flex items-center gap-1 mt-0.5">
            <User size={14} strokeWidth={1.5} />
            {slot.instructor}
          </p>
        </div>

        {/* Right side: badge + button */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Badge variant={badgeVariant}>{badgeLabel}</Badge>

          {isBooked ? (
            <Button
              variant="ghost"
              size="sm"
              loading={isCancelLoading}
              onClick={(e) => {
                e.stopPropagation()
                bookingId && onCancel(bookingId)
              }}
            >
              Cancelar
            </Button>
          ) : availableSpots === 0 ? (
            <Button variant="secondary" size="sm" disabled>
              Llena
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onOpenDetail(slot)
              }}
            >
              Reservar
            </Button>
          )}
        </div>
      </div>
    </button>
  )
})
