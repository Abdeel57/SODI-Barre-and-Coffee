import { useState, useEffect, useCallback } from 'react'
import { WifiOff, CalendarX } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useSchedule } from '../hooks/useSchedule'
import { WeekCalendar } from '../components/WeekCalendar'
import { MonthCalendarSheet } from '../components/MonthCalendarSheet'
import { ClassCard } from '../components/ClassCard'
import { ClassDetailSheet } from '../components/ClassDetailSheet'
import { Skeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import type { ClassSlot } from '../types'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-nude-border border-l-[3px] border-l-nude rounded-md p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-md" />
        </div>
      </div>
    </div>
  )
}

export default function SchedulePage() {
  const user = useStore((s) => s.user)
  const [selectedDate,      setSelectedDate]      = useState(new Date())
  const [isTransitioning,   setIsTransitioning]   = useState(false)
  const [showMonthPicker,   setShowMonthPicker]   = useState(false)

  const {
    week,
    subscription,
    loading,
    error,
    bookingSlot,
    setBookingSlot,
    bookingLoading,
    cancelLoadingId,
    fetchWeek,
    book,
    cancel,
  } = useSchedule()

  useEffect(() => {
    fetchWeek(selectedDate)
  }, [selectedDate, fetchWeek])

  const handleSelectDate = useCallback((date: Date) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setSelectedDate(date)
      setIsTransitioning(false)
    }, 120)
  }, [])

  const selectedIso = selectedDate.toISOString().split('T')[0]
  const selectedDay = week.find((d) => d.date === selectedIso)
  const classes = selectedDay?.classes ?? []

  const hasClasses = useCallback(
    (date: Date) => {
      const iso = date.toISOString().split('T')[0]
      const day = week.find((d) => d.date === iso)
      return (day?.classes?.length ?? 0) > 0
    },
    [week],
  )

  const handleOpenDetail = useCallback(
    (slot: ClassSlot) => setBookingSlot(slot),
    [setBookingSlot],
  )

  const handleCancel = useCallback(
    (bookingId: string) => cancel(bookingId, selectedDate),
    [cancel, selectedDate],
  )

  const handleBook = useCallback(
    (slot: ClassSlot) => book(slot, selectedDate, () => setBookingSlot(null)),
    [book, selectedDate, setBookingSlot],
  )

  return (
    <div className="min-h-screen bg-off-white pb-nav page-enter">
      {/* Header */}
      <header className="px-5 pt-12 pb-4">
        <p className="text-section text-stone text-[11px]">SODI Barre & Coffee</p>
        <h1 className="text-hero text-noir mt-1">
          {greeting()}{user ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
      </header>

      {/* Sticky WeekCalendar */}
      <div className="sticky top-0 z-10 px-4 pb-3 pt-1 bg-off-white/90 backdrop-blur-sm border-b border-nude-border/40">
        <WeekCalendar
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          hasClasses={hasClasses}
          onOpenMonthPicker={() => setShowMonthPicker(true)}
        />
      </div>

      {/* Subscription banner */}
      {!loading && subscription && subscription.isExpiringSoon && (
        <div className="mx-4 mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-label text-amber-800">
            Tu paquete vence en{' '}
            <span className="font-medium">{subscription.daysLeft} día{subscription.daysLeft !== 1 ? 's' : ''}</span>.{' '}
            Renuévalo para seguir reservando.
          </p>
        </div>
      )}
      {!loading && !subscription && (
        <div className="mx-4 mt-4 rounded-lg bg-nude-light border border-nude-border px-4 py-3">
          <p className="text-label text-stone">
            Sin paquete activo.{' '}
            <span className="text-nude-dark underline underline-offset-2">Comprar paquete</span>
          </p>
        </div>
      )}

      {/* Class list */}
      <div
        className={`px-4 mt-5 transition-opacity duration-150 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
      >
        {loading ? (
          <div className="flex flex-col gap-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <WifiOff size={36} strokeWidth={1.2} className="text-stone/50" />
            <div className="text-center">
              <p className="text-title text-stone">Sin conexión</p>
              <p className="text-label text-stone/60 mt-1">
                No se pudo cargar el horario
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchWeek(selectedDate)}
            >
              Reintentar
            </Button>
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <CalendarX size={36} strokeWidth={1.2} className="text-stone/50" />
            <div className="text-center">
              <p className="text-title text-stone">Sin clases este día</p>
              <p className="text-label text-stone/60 mt-1">
                Selecciona otro día para ver el horario
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {classes.map((slot, index) => (
              <div
                key={`${slot.classId}-${slot.date}`}
                style={{ animationDelay: `${index * 75}ms` }}
                className="animate-[pageIn_0.35s_ease-out_both]"
              >
                <ClassCard
                  slot={slot}
                  cancelLoadingId={cancelLoadingId}
                  onOpenDetail={handleOpenDetail}
                  onCancel={handleCancel}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Class detail sheet */}
      <ClassDetailSheet
        slot={bookingSlot}
        subscription={subscription}
        bookingLoading={bookingLoading}
        cancelLoadingId={cancelLoadingId}
        onBook={handleBook}
        onCancel={handleCancel}
        onClose={() => setBookingSlot(null)}
      />

      {/* Month calendar picker */}
      <MonthCalendarSheet
        isOpen={showMonthPicker}
        onClose={() => setShowMonthPicker(false)}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        hasClasses={hasClasses}
      />
    </div>
  )
}
