/**
 * Reglas de reserva y cancelación, en un solo lugar.
 *
 * Las usan tanto la ruta manual (POST /api/bookings) como el cron de horarios
 * fijos, para que no existan dos versiones del cobro de clases.
 */

import { prisma } from '../lib/prisma'
import { isClassActiveOn, toLocalDateString, toRangeDateString } from '../lib/classDates'
import { countHeldSeats } from '../lib/recurringSeats'

/** Minutos de anticipación mínimos para poder reservar. */
export const MIN_LEAD_MINUTES = 60
/** Horas antes de la clase en las que cancelar todavía devuelve la clase. */
export const REFUND_WINDOW_HOURS = 3

export function getClassDateTime(date: Date, startTime: string): Date {
  const [hours, minutes] = startTime.split(':').map(Number)
  const dt = new Date(date)
  dt.setHours(hours, minutes, 0, 0)
  return dt
}

/** "2026-07-29" o ISO completo → medianoche local, que es como se guarda Booking.date. */
export function normalizeDate(isoString: string): Date {
  const [year, month, day] = isoString.split('T')[0].split('-').map(Number)
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

export type BookingErrorCode =
  | 'CLASS_NOT_FOUND'
  | 'INVALID_DATE'
  | 'WRONG_DAY'
  | 'OUT_OF_RANGE'
  | 'PAST'
  | 'TOO_LATE'
  | 'NO_CREDITS'
  | 'ALREADY_BOOKED'
  | 'FULL'
  | 'OVERLAP'

export interface BookingFailure {
  ok: false
  code: BookingErrorCode
  status: number
  message: string
}

export interface BookingSuccess {
  ok: true
  usedBonus: boolean
  booking: {
    id: string
    userId: string
    classId: string
    date: Date
    status: string
    createdAt: Date
    usedBonus: boolean
    recurringId: string | null
    class: { name: string; startTime: string; instructor: string }
  }
}

export type AttemptBookingResult = BookingSuccess | BookingFailure

function fail(code: BookingErrorCode, status: number, message: string): BookingFailure {
  return { ok: false, code, status, message }
}

/**
 * Crea la reserva aplicando todas las validaciones: día, vigencia, anticipación,
 * saldo (cortesía antes que paquete), cupo (incluyendo lugares apartados por
 * horarios fijos) y choque de horario.
 */
export async function attemptBooking(params: {
  userId: string
  classId: string
  /** Medianoche local del día de la clase. */
  date: Date
  /** Regla de horario fijo que origina la reserva, si aplica. */
  recurringId?: string | null
}): Promise<AttemptBookingResult> {
  const { userId, classId, date, recurringId = null } = params

  // 1. Clase vigente
  const cls = await prisma.class.findUnique({ where: { id: classId } })
  if (!cls || !cls.isActive) {
    return fail('CLASS_NOT_FOUND', 404, 'Clase no encontrada o inactiva')
  }

  if (isNaN(date.getTime())) {
    return fail('INVALID_DATE', 400, 'Fecha inválida')
  }

  if (date.getDay() !== cls.dayOfWeek) {
    return fail('WRONG_DAY', 400, 'Esta clase no se imparte el día seleccionado')
  }

  const dateStr = toLocalDateString(date)
  if (!isClassActiveOn(cls, dateStr)) {
    const msg =
      cls.startDate && dateStr < toRangeDateString(cls.startDate)
        ? `Esta clase inicia el ${toRangeDateString(cls.startDate)}`
        : 'Esta clase ya no está disponible en esa fecha'
    return fail('OUT_OF_RANGE', 400, msg)
  }

  // 2. Anticipación
  const classDateTime = getClassDateTime(date, cls.startTime)
  const now = new Date()
  const diffMin = (classDateTime.getTime() - now.getTime()) / (1000 * 60)

  if (diffMin < 0) {
    return fail('PAST', 400, 'No se pueden reservar clases en el pasado')
  }
  if (diffMin < MIN_LEAD_MINUTES) {
    return fail('TOO_LATE', 400, 'Reserva cerrada. La clase comienza en menos de 60 minutos')
  }

  // 3. Con qué se paga: primero la cortesía, luego el paquete
  const [subscription, student] = await Promise.all([
    prisma.subscription.findFirst({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: now },
        OR: [{ classesLeft: { gt: 0 } }, { classesLeft: null }],
      },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { bonusClasses: true } }),
  ])

  const useBonus = (student?.bonusClasses ?? 0) > 0

  if (!useBonus && !subscription) {
    return fail('NO_CREDITS', 403, 'Sin clases disponibles. Adquiere un paquete para continuar')
  }

  // 4. Reserva previa para esa clase+fecha
  const existingBooking = await prisma.booking.findUnique({
    where: { userId_classId_date: { userId, classId: cls.id, date } },
  })

  if (existingBooking?.status === 'CONFIRMED') {
    return fail('ALREADY_BOOKED', 409, 'Ya tienes esta clase reservada')
  }

  // 5. Cupo — los lugares apartados por horario fijo cuentan como ocupados
  const [confirmedCount, heldSeats] = await Promise.all([
    prisma.booking.count({ where: { classId: cls.id, date, status: 'CONFIRMED' } }),
    countHeldSeats({ classId: cls.id, date, excludeUserId: userId }),
  ])

  if (confirmedCount + heldSeats >= cls.maxCapacity) {
    return fail('FULL', 409, 'Clase llena. No hay lugares disponibles')
  }

  // 6. Otra clase a la misma hora ese día
  const sameDayBookings = await prisma.booking.findMany({
    where: { userId, date, status: 'CONFIRMED' },
    include: { class: true },
  })

  if (sameDayBookings.some((b) => b.class.startTime === cls.startTime)) {
    return fail('OVERLAP', 409, 'Ya tienes una clase a esa hora')
  }

  // 7. Crear/revivir la reserva y descontar la clase
  const include = { class: { select: { name: true, startTime: true, instructor: true } } }

  const booking = await prisma.$transaction(async (tx) => {
    // Si quedó una reserva cancelada de ese mismo día se reutiliza la fila:
    // la unique (userId, classId, date) no permite crear otra.
    const newBooking = existingBooking
      ? await tx.booking.update({
          where: { id: existingBooking.id },
          data: {
            status: 'CONFIRMED',
            usedBonus: useBonus,
            recurringId: recurringId ?? existingBooking.recurringId,
          },
          include,
        })
      : await tx.booking.create({
          data: { userId, classId: cls.id, date, status: 'CONFIRMED', usedBonus: useBonus, recurringId },
          include,
        })

    if (useBonus) {
      await tx.user.update({
        where: { id: userId },
        data: { bonusClasses: { decrement: 1 } },
      })

      // Marca el comprobante más antiguo sin usar como canjeado
      const pending = await tx.reward.findFirst({
        where: { userId, type: 'FREE_CLASS', isRedeemed: false },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })
      if (pending) {
        await tx.reward.update({
          where: { id: pending.id },
          data: { isRedeemed: true, redeemedAt: new Date() },
        })
      }
    } else if (subscription && subscription.classesLeft !== null) {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: { classesLeft: { decrement: 1 } },
      })
    }

    return newBooking
  })

  return { ok: true, usedBonus: useBonus, booking }
}

export interface CancelSuccess {
  ok: true
  booking: { id: string; status: string; class: { name: string; startTime: string } }
  classRefunded: boolean
  bonusRefunded: boolean
}

export type CancelResult = CancelSuccess | BookingFailure

/**
 * Cancela una reserva y devuelve la clase si faltan más de 3 horas.
 * La fila queda en CANCELLED: eso libera el lugar y, si venía de un horario
 * fijo, evita que el cron la vuelva a crear.
 */
export async function cancelBooking(params: {
  bookingId: string
  userId: string
}): Promise<CancelResult> {
  const { bookingId, userId } = params

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { class: true },
  })

  if (!booking) {
    return fail('CLASS_NOT_FOUND', 404, 'Reserva no encontrada')
  }
  if (booking.userId !== userId) {
    return fail('CLASS_NOT_FOUND', 403, 'No tienes permiso para cancelar esta reserva')
  }
  if (booking.status !== 'CONFIRMED') {
    return fail('ALREADY_BOOKED', 400, 'Esta reserva ya fue cancelada')
  }

  const classDateTime = getClassDateTime(new Date(booking.date), booking.class.startTime)
  const diffHours = (classDateTime.getTime() - Date.now()) / (1000 * 60 * 60)
  const canRefund = diffHours > REFUND_WINDOW_HOURS

  const refundBonus = canRefund && booking.usedBonus

  const subscription =
    canRefund && !booking.usedBonus
      ? await prisma.subscription.findFirst({
          where: { userId, isActive: true, classesLeft: { not: null } },
        })
      : null

  const updatedBooking = await prisma.$transaction(async (tx) => {
    const cancelled = await tx.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
      include: { class: { select: { name: true, startTime: true } } },
    })

    if (refundBonus) {
      // Se pagó con cortesía: se devuelve el crédito y el comprobante vuelve a estar vigente
      await tx.user.update({
        where: { id: userId },
        data: { bonusClasses: { increment: 1 } },
      })

      const usedReward = await tx.reward.findFirst({
        where: { userId, type: 'FREE_CLASS', isRedeemed: true },
        orderBy: { redeemedAt: 'desc' },
        select: { id: true },
      })
      if (usedReward) {
        await tx.reward.update({
          where: { id: usedReward.id },
          data: { isRedeemed: false, redeemedAt: null },
        })
      }
    } else if (canRefund && subscription && subscription.classesLeft !== null) {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: { classesLeft: { increment: 1 } },
      })
    }

    return cancelled
  })

  return {
    ok: true,
    booking: updatedBooking,
    classRefunded: refundBonus || (canRefund && subscription !== null),
    bonusRefunded: refundBonus,
  }
}
