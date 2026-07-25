/**
 * Lugares apartados por horario fijo.
 *
 * Una regla de horario fijo aparta el lugar desde que se activa, aunque el cron
 * todavía no haya creado la reserva de esa semana. Un lugar cuenta como apartado
 * cuando la regla cubre esa fecha y **no existe ninguna fila de Booking** para
 * ese usuario+clase+fecha:
 *
 *   - Booking CONFIRMED  → ya se cuenta en confirmedCount, no se aparta doble.
 *   - Booking CANCELLED  → la alumna canceló esa semana a propósito; el lugar
 *                          se libera y el cron no la vuelve a crear (lápida).
 *   - Sin fila           → el lugar está apartado esperando al cron.
 */

import { prisma } from './prisma'
import { toLocalDateString } from './classDates'

interface RuleWindow {
  userId: string
  startDate: Date
  endDate: Date | null
}

function coversDate(rule: RuleWindow, dateStr: string): boolean {
  if (dateStr < toLocalDateString(rule.startDate)) return false
  if (rule.endDate && dateStr > toLocalDateString(rule.endDate)) return false
  return true
}

/**
 * Quiénes de esas alumnas pueden pagar la clase hoy (paquete vigente o cortesía).
 * Sin con qué pagar no se aparta lugar: la regla sigue viva y el lugar vuelve a
 * quedar apartado en cuanto renueven.
 */
async function getSolventUserIds(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set()

  const now = new Date()
  const [subscriptions, withBonus] = await Promise.all([
    prisma.subscription.findMany({
      where: {
        userId: { in: userIds },
        isActive: true,
        expiresAt: { gt: now },
        OR: [{ classesLeft: { gt: 0 } }, { classesLeft: null }],
      },
      select: { userId: true },
    }),
    prisma.user.findMany({
      where: { id: { in: userIds }, bonusClasses: { gt: 0 } },
      select: { id: true },
    }),
  ])

  const solvent = new Set(subscriptions.map((s) => s.userId))
  for (const u of withBonus) solvent.add(u.id)
  return solvent
}

/** Lugares apartados en una clase+fecha concreta. `excludeUserId` ignora la regla propia. */
export async function countHeldSeats(params: {
  classId: string
  date: Date
  excludeUserId?: string
}): Promise<number> {
  const { classId, date, excludeUserId } = params
  const dateStr = toLocalDateString(date)

  const rules = await prisma.recurringBooking.findMany({
    where: {
      classId,
      isActive: true,
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    select: { userId: true, startDate: true, endDate: true },
  })

  const covering = rules.filter((r) => coversDate(r, dateStr))
  if (covering.length === 0) return 0

  const [existing, solvent] = await Promise.all([
    prisma.booking.findMany({
      where: { classId, date, userId: { in: covering.map((r) => r.userId) } },
      select: { userId: true },
    }),
    getSolventUserIds(covering.map((r) => r.userId)),
  ])

  const booked = new Set(existing.map((b) => b.userId))
  return covering.filter((r) => !booked.has(r.userId) && solvent.has(r.userId)).length
}

export interface HeldSeatIndex {
  /** Lugares apartados por otras alumnas en esa clase+fecha ("YYYY-MM-DD"). */
  heldSeats(classId: string, dateStr: string): number
  /** ¿Esta alumna tiene horario fijo activo en esa clase para esa fecha? */
  recurringIdFor(classId: string, dateStr: string): string | null
}

/**
 * Índice en memoria para pintar una semana completa sin lanzar una query por celda.
 * Las reglas pasadas no apartan nada: solo cuentan de hoy en adelante.
 */
export async function buildHeldSeatIndex(params: {
  from: Date
  to: Date
  /** Alumna que está viendo el horario: su propio lugar apartado no le resta disponibilidad. */
  viewerId: string
}): Promise<HeldSeatIndex> {
  const { from, to, viewerId } = params
  const todayStr = toLocalDateString(new Date())

  const [rules, bookings] = await Promise.all([
    prisma.recurringBooking.findMany({
      where: {
        isActive: true,
        startDate: { lte: to },
        OR: [{ endDate: null }, { endDate: { gte: from } }],
      },
      select: { id: true, userId: true, classId: true, startDate: true, endDate: true },
    }),
    prisma.booking.findMany({
      where: { date: { gte: from, lte: to } },
      select: { userId: true, classId: true, date: true },
    }),
  ])

  const solvent = await getSolventUserIds([...new Set(rules.map((r) => r.userId))])

  const rulesByClass = new Map<string, typeof rules>()
  for (const rule of rules) {
    const list = rulesByClass.get(rule.classId)
    if (list) list.push(rule)
    else rulesByClass.set(rule.classId, [rule])
  }

  const bookedKeys = new Set(
    bookings.map((b) => `${b.userId}::${b.classId}::${toLocalDateString(new Date(b.date))}`),
  )

  return {
    heldSeats(classId, dateStr) {
      if (dateStr < todayStr) return 0
      const list = rulesByClass.get(classId)
      if (!list) return 0

      return list.filter(
        (r) =>
          r.userId !== viewerId &&
          solvent.has(r.userId) &&
          coversDate(r, dateStr) &&
          !bookedKeys.has(`${r.userId}::${classId}::${dateStr}`),
      ).length
    },

    recurringIdFor(classId, dateStr) {
      const list = rulesByClass.get(classId)
      if (!list) return null
      const own = list.find((r) => r.userId === viewerId && coversDate(r, dateStr))
      return own?.id ?? null
    },
  }
}
