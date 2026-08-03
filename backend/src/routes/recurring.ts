import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { createError } from '../middleware/errorHandler'
import { toLocalDateString, toRangeDateString } from '../lib/classDates'
import { countHeldSeats } from '../lib/recurringSeats'
import { studioToday } from '../lib/studioTime'
import { cancelBooking, normalizeDate } from '../services/booking'
import {
  HORIZON_WEEKS,
  MAX_ACTIVE_RULES,
  dayLabel,
  materializeRule,
  occurrenceDates,
} from '../services/recurring'
import { getCoachAvatarsByName, resolveCoachAvatar } from '../lib/coachAvatar'

const router = Router()

interface RuleClass {
  id: string
  name: string
  instructor: string
  dayOfWeek: number
  startTime: string
  durationMin: number
  coach: { avatar: string | null } | null
}

function serializeRule(
  rule: { id: string; classId: string; startDate: Date; endDate: Date | null; createdAt: Date },
  cls: RuleClass,
  coachAvatars: Map<string, string>,
  nextDates: Date[],
) {
  return {
    id: rule.id,
    classId: rule.classId,
    name: cls.name,
    instructor: cls.instructor,
    coachAvatar: resolveCoachAvatar(cls, coachAvatars),
    dayOfWeek: cls.dayOfWeek,
    dayLabel: dayLabel(cls.dayOfWeek),
    startTime: cls.startTime,
    durationMin: cls.durationMin,
    endDate: rule.endDate ? toRangeDateString(rule.endDate) : null,
    createdAt: rule.createdAt,
    /** Próximas fechas ya apartadas dentro del horizonte. */
    nextDates: nextDates.map(toLocalDateString),
  }
}

// ─── GET /api/recurring ───────────────────────────────────────────────────────
router.get('/', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [rules, coachAvatars] = await Promise.all([
      prisma.recurringBooking.findMany({
        where: { userId: req.user!.id, isActive: true },
        include: { class: { include: { coach: { select: { avatar: true } } } } },
        orderBy: { createdAt: 'asc' },
      }),
      getCoachAvatarsByName(),
    ])

    const data = rules.map((rule) =>
      serializeRule(rule, rule.class, coachAvatars, occurrenceDates({ cls: rule.class, rule })),
    )

    return res.json({ data, maxRules: MAX_ACTIVE_RULES, horizonWeeks: HORIZON_WEEKS })
  } catch (err) {
    return next(err)
  }
})

// ─── POST /api/recurring ──────────────────────────────────────────────────────
const createSchema = z.object({
  classId: z.string().min(1, 'classId requerido'),
})

router.post('/', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classId } = createSchema.parse(req.body)
    const userId = req.user!.id
    const now = new Date()

    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: { coach: { select: { avatar: true } } },
    })
    if (!cls || !cls.isActive) {
      return next(createError(404, 'Clase no encontrada o inactiva'))
    }

    // 1. Tope de horarios fijos por alumna
    const [activeRules, existing] = await Promise.all([
      prisma.recurringBooking.count({ where: { userId, isActive: true } }),
      prisma.recurringBooking.findUnique({
        where: { userId_classId: { userId, classId } },
      }),
    ])

    if (existing?.isActive) {
      return next(createError(409, 'Ya tienes horario fijo en esta clase'))
    }
    if (activeRules >= MAX_ACTIVE_RULES) {
      return next(
        createError(409, `Puedes tener hasta ${MAX_ACTIVE_RULES} horarios fijos a la vez`),
      )
    }

    // 2. Solo con paquete o cortesía: el lugar se aparta, no se puede apartar de gratis
    const [subscription, student] = await Promise.all([
      prisma.subscription.findFirst({
        where: {
          userId,
          isActive: true,
          expiresAt: { gt: now },
          OR: [{ classesLeft: { gt: 0 } }, { classesLeft: null }],
        },
        select: { id: true },
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { bonusClasses: true } }),
    ])

    if (!subscription && (student?.bonusClasses ?? 0) === 0) {
      return next(
        createError(403, 'Necesitas un paquete activo para apartar un horario fijo'),
      )
    }

    // 3. Debe quedar al menos un lugar libre en la próxima ocurrencia
    const upcoming = occurrenceDates({ cls })
    if (upcoming.length === 0) {
      return next(createError(400, 'Esta clase ya no tiene fechas disponibles'))
    }

    const nextDate = upcoming[0]
    const [confirmedCount, heldSeats] = await Promise.all([
      prisma.booking.count({ where: { classId, date: nextDate, status: 'CONFIRMED' } }),
      countHeldSeats({ classId, date: nextDate, excludeUserId: userId }),
    ])

    if (confirmedCount + heldSeats >= cls.maxCapacity) {
      return next(createError(409, 'Esta clase está llena, no podemos apartarte un lugar fijo'))
    }

    // 4. Crear (o revivir) la regla y materializar el horizonte de inmediato
    const startDate = normalizeDate(studioToday())

    const rule = await prisma.recurringBooking.upsert({
      where: { userId_classId: { userId, classId } },
      create: { userId, classId, startDate },
      update: { isActive: true, startDate, endDate: null, cancelledAt: null, lastNotifiedFor: null },
    })

    const result = await materializeRule(rule.id)
    const coachAvatars = await getCoachAvatarsByName()

    return res.status(201).json({
      recurring: serializeRule(
        { ...rule, startDate },
        cls,
        coachAvatars,
        occurrenceDates({ cls, rule: { startDate, endDate: null } }),
      ),
      created: result.created,
      skipped: result.failures.map((f) => ({
        date: toLocalDateString(f.date),
        reason: f.message,
      })),
    })
  } catch (err) {
    return next(err)
  }
})

// ─── DELETE /api/recurring/:id ────────────────────────────────────────────────
// Baja el horario fijo y libera sus reservas futuras (devolviendo la clase
// cuando faltan más de 3 h, igual que una cancelación normal).
router.delete('/:id', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id

    const rule = await prisma.recurringBooking.findUnique({ where: { id: req.params.id } })
    if (!rule) {
      return next(createError(404, 'Horario fijo no encontrado'))
    }
    if (rule.userId !== userId) {
      return next(createError(403, 'No tienes permiso para cancelar este horario fijo'))
    }

    await prisma.recurringBooking.update({
      where: { id: rule.id },
      data: { isActive: false, cancelledAt: new Date() },
    })

    const today = normalizeDate(studioToday())

    const futureBookings = await prisma.booking.findMany({
      where: { recurringId: rule.id, status: 'CONFIRMED', date: { gte: today } },
      select: { id: true },
    })

    let cancelled = 0
    let refunded = 0

    for (const booking of futureBookings) {
      const result = await cancelBooking({ bookingId: booking.id, userId })
      if (result.ok) {
        cancelled++
        if (result.classRefunded) refunded++
      }
    }

    return res.json({ cancelled, refunded })
  } catch (err) {
    return next(err)
  }
})

export default router
