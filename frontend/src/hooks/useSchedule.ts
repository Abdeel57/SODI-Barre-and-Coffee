import { useState, useCallback, useRef } from 'react'
import { classesApi, bookingsApi, packagesApi, recurringApi } from '../api'
import { useStore } from '../store/useStore'
import type { WeekDay, ClassSlot, Subscription } from '../types'

interface ScheduleState {
  week: WeekDay[]
  subscription: Subscription | null
  /** Clases de cortesía disponibles — se pueden usar sin paquete activo. */
  bonusClasses: number
  loading: boolean
  error: boolean
}

export function useSchedule() {
  const showToast = useStore((s) => s.showToast)
  const [state, setState] = useState<ScheduleState>({
    week: [],
    subscription: null,
    bonusClasses: 0,
    loading: true,
    error: false,
  })
  const [bookingSlot, setBookingSlot] = useState<ClassSlot | null>(null)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [cancelLoadingId, setCancelLoadingId] = useState<string | null>(null)
  const [recurringLoading, setRecurringLoading] = useState(false)
  const prefetchRef = useRef<string | null>(null)

  const fetchWeek = useCallback(
    async (date: Date, silent = false) => {
      if (!silent) setState((s) => ({ ...s, loading: true, error: false }))
      try {
        const iso = date.toISOString().split('T')[0]
        const [weekRes, subRes] = await Promise.all([
          classesApi.getWeek(iso),
          packagesApi.mySubscription().catch(() => null),
        ])
        setState({
          week: weekRes.data.week as WeekDay[],
          subscription: (subRes?.data?.subscription as Subscription) ?? null,
          bonusClasses: (subRes?.data?.bonusClasses as number) ?? 0,
          loading: false,
          error: false,
        })

        // Prefetch next day in background
        const nextDay = new Date(date)
        nextDay.setDate(nextDay.getDate() + 1)
        const nextIso = nextDay.toISOString().split('T')[0]
        if (prefetchRef.current !== nextIso) {
          prefetchRef.current = nextIso
          classesApi.getWeek(nextIso).catch(() => undefined)
        }
      } catch {
        setState((s) => ({ ...s, loading: false, error: true }))
      }
    },
    [],
  )

  const book = useCallback(
    async (slot: ClassSlot, date: Date, onSuccess: () => void) => {
      setBookingLoading(true)
      try {
        await bookingsApi.create({
          classId: slot.classId,
          date: slot.date.split('T')[0],
        })
        setBookingSlot(null)
        showToast('¡Clase reservada!', 'success')
        onSuccess()
        fetchWeek(date, true)
      } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: string } } }
        showToast(e.response?.data?.error ?? 'Error al reservar', 'error')
      } finally {
        setBookingLoading(false)
      }
    },
    [showToast, fetchWeek],
  )

  const cancel = useCallback(
    async (bookingId: string, date: Date) => {
      setCancelLoadingId(bookingId)
      try {
        await bookingsApi.cancel(bookingId)
        showToast('Reserva cancelada', 'info')
        fetchWeek(date, true)
      } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: string } } }
        showToast(e.response?.data?.error ?? 'Error al cancelar', 'error')
      } finally {
        setCancelLoadingId(null)
      }
    },
    [showToast, fetchWeek],
  )

  /**
   * Activa o cancela el horario fijo de una clase.
   * Al activarlo se apartan de inmediato las próximas semanas; al cancelarlo se
   * liberan las reservas futuras y se devuelven las clases que apliquen.
   */
  const toggleRecurring = useCallback(
    async (slot: ClassSlot, date: Date) => {
      setRecurringLoading(true)
      try {
        if (slot.isRecurring && slot.recurringId) {
          const { data } = await recurringApi.remove(slot.recurringId)
          const cancelled = (data?.cancelled as number) ?? 0
          showToast(
            cancelled > 0
              ? `Horario fijo cancelado · ${cancelled} reserva${cancelled > 1 ? 's' : ''} liberada${cancelled > 1 ? 's' : ''}`
              : 'Horario fijo cancelado',
            'info',
          )
        } else {
          const { data } = await recurringApi.create(slot.classId)
          const created = (data?.created as number) ?? 0
          showToast(
            created > 0
              ? `¡Listo! Apartamos tus próximas ${created} clase${created > 1 ? 's' : ''}`
              : 'Horario fijo activado',
            'success',
          )
        }
        setBookingSlot(null)
        fetchWeek(date, true)
      } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: string } } }
        showToast(e.response?.data?.error ?? 'Error al actualizar tu horario fijo', 'error')
      } finally {
        setRecurringLoading(false)
      }
    },
    [showToast, fetchWeek],
  )

  return {
    ...state,
    bookingSlot,
    setBookingSlot,
    bookingLoading,
    cancelLoadingId,
    recurringLoading,
    fetchWeek,
    book,
    cancel,
    toggleRecurring,
  }
}
