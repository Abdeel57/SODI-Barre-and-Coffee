/**
 * Horario fijo ("quiero esta clase todos los miércoles").
 *
 * La regla no reserva sola: aparta el lugar y este servicio va creando los
 * Booking de las próximas HORIZON_WEEKS semanas. Cada reserva creada descuenta
 * una clase igual que una reserva manual, así que el paquete nunca se gasta de
 * golpe. Si una semana no se puede crear (sin clases, clase llena) se salta y
 * se avisa una sola vez por fecha; la regla sigue viva y se reanuda sola.
 */

import { prisma } from '../lib/prisma'
import { isClassActiveOn, toLocalDateString, toRangeDateString } from '../lib/classDates'
import { studioToday } from '../lib/studioTime'
import { attemptBooking, BookingErrorCode, normalizeDate } from './booking'
import { sendPushToUser } from './webpush'

/** Semanas por adelantado que se mantienen reservadas. */
export const HORIZON_WEEKS = 4
/** Horarios fijos activos por alumna. Evita que alguien aparte media semana. */
export const MAX_ACTIVE_RULES = 3

const DAY_LABELS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export function dayLabel(dayOfWeek: number): string {
  return DAY_LABELS[dayOfWeek] ?? ''
}

/** Hoy según el estudio, no según el servidor (que corre en UTC). */
function startOfToday(): Date {
  return normalizeDate(studioToday())
}

interface OccurrenceClass {
  dayOfWeek: number
  startDate: Date | null
  endDate: Date | null
}

interface RuleWindow {
  startDate: Date
  endDate: Date | null
}

/**
 * Fechas (medianoche local) en las que toca la clase dentro del horizonte,
 * ya filtradas por la vigencia de la clase y la de la regla.
 */
export function occurrenceDates(params: {
  cls: OccurrenceClass
  rule?: RuleWindow
  from?: Date
  weeks?: number
}): Date[] {
  const { cls, rule, from = startOfToday(), weeks = HORIZON_WEEKS } = params

  const first = new Date(from)
  first.setHours(0, 0, 0, 0)
  // Adelantar hasta el primer día de la semana que coincide
  first.setDate(first.getDate() + ((cls.dayOfWeek - first.getDay() + 7) % 7))

  // -1 para que siempre caigan exactamente `weeks` ocurrencias, empiece el día que empiece
  const limit = new Date(from)
  limit.setHours(0, 0, 0, 0)
  limit.setDate(limit.getDate() + weeks * 7 - 1)

  const dates: Date[] = []
  for (const cursor = first; cursor <= limit; cursor.setDate(cursor.getDate() + 7)) {
    const date = new Date(cursor)
    const dateStr = toLocalDateString(date)

    if (!isClassActiveOn(cls, dateStr)) continue
    if (rule) {
      if (dateStr < toLocalDateString(rule.startDate)) continue
      if (rule.endDate && dateStr > toLocalDateString(rule.endDate)) continue
    }
    dates.push(date)
  }

  return dates
}

export interface MaterializeResult {
  created: number
  /** Fechas que no se pudieron reservar, de la más próxima a la más lejana. */
  failures: Array<{ date: Date; code: BookingErrorCode; message: string }>
}

const SILENT_FAILURES: BookingErrorCode[] = ['TOO_LATE', 'PAST', 'WRONG_DAY', 'OUT_OF_RANGE', 'ALREADY_BOOKED']

/** Crea las reservas que falten para una regla dentro del horizonte. */
export async function materializeRule(ruleId: string): Promise<MaterializeResult> {
  const rule = await prisma.recurringBooking.findUnique({
    where: { id: ruleId },
    include: { class: true },
  })

  const result: MaterializeResult = { created: 0, failures: [] }
  if (!rule || !rule.isActive) return result

  // La clase se dio de baja o ya terminó → el horario fijo muere con ella
  const todayStr = studioToday()
  const classEnded = rule.class.endDate && todayStr > toRangeDateString(rule.class.endDate)
  if (!rule.class.isActive || classEnded) {
    await deactivateRule(rule.id)
    return result
  }

  const dates = occurrenceDates({ cls: rule.class, rule })
  if (dates.length === 0) return result

  // Las fechas que ya tienen fila (confirmada o cancelada a mano) no se tocan:
  // una cancelación puntual no se debe recrear.
  const existing = await prisma.booking.findMany({
    where: { userId: rule.userId, classId: rule.classId, date: { in: dates } },
    select: { date: true },
  })
  const taken = new Set(existing.map((b) => toLocalDateString(new Date(b.date))))

  for (const date of dates) {
    if (taken.has(toLocalDateString(date))) continue

    const attempt = await attemptBooking({
      userId: rule.userId,
      classId: rule.classId,
      date,
      recurringId: rule.id,
    })

    if (attempt.ok) {
      result.created++
    } else if (!SILENT_FAILURES.includes(attempt.code)) {
      result.failures.push({ date, code: attempt.code, message: attempt.message })
    }
  }

  return result
}

export async function deactivateRule(ruleId: string): Promise<void> {
  await prisma.recurringBooking.update({
    where: { id: ruleId },
    data: { isActive: false, cancelledAt: new Date() },
  })
}

function failureMessage(code: BookingErrorCode, className: string, dateStr: string): string {
  switch (code) {
    case 'NO_CREDITS':
      return `Te quedaste sin clases y no pudimos apartar tu ${className} del ${dateStr}. Renueva tu paquete para no perder tu lugar.`
    case 'FULL':
      return `Tu ${className} del ${dateStr} se llenó y no pudimos apartarte lugar.`
    case 'OVERLAP':
      return `Ya tienes otra clase a esa hora el ${dateStr}, así que saltamos tu horario fijo.`
    default:
      return `No pudimos apartar tu ${className} del ${dateStr}.`
  }
}

/** Job diario: empuja el horizonte de todas las reglas activas. */
export async function runRecurringBookings(): Promise<{ created: number; notified: number }> {
  const rules = await prisma.recurringBooking.findMany({
    where: { isActive: true },
    select: { id: true, userId: true, lastNotifiedFor: true, class: { select: { name: true } } },
  })

  let created = 0
  let notified = 0

  for (const rule of rules) {
    try {
      const result = await materializeRule(rule.id)
      created += result.created

      const nextFailure = result.failures[0]
      if (!nextFailure) continue

      // Un solo aviso por ocurrencia: si sigue fallando la misma fecha, no se repite
      const alreadyNotified =
        rule.lastNotifiedFor &&
        toLocalDateString(new Date(rule.lastNotifiedFor)) === toLocalDateString(nextFailure.date)
      if (alreadyNotified) continue

      await prisma.recurringBooking.update({
        where: { id: rule.id },
        data: { lastNotifiedFor: nextFailure.date },
      })

      const label = new Intl.DateTimeFormat('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(nextFailure.date)

      await sendPushToUser(rule.userId, {
        title: '📌 Tu horario fijo',
        body: failureMessage(nextFailure.code, rule.class.name, label),
      }).catch(() => null)

      notified++
    } catch (err) {
      console.error(`[recurring] ❌ Error en la regla ${rule.id}:`, err)
    }
  }

  return { created, notified }
}
