import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { createError } from '../middleware/errorHandler'
import { sendPushToAdmin } from '../services/webpush'
import { isClassActiveOn, toLocalDateString, toRangeDateString } from '../lib/classDates'
import { getCoachAvatarsByName, resolveCoachAvatar } from '../lib/coachAvatar'

const router = Router()

function getClassDateTime(date: Date, startTime: string): Date {
  const [hours, minutes] = startTime.split(':').map(Number)
  const dt = new Date(date)
  dt.setHours(hours, minutes, 0, 0)
  return dt
}

function normalizeDate(isoString: string): Date {
  const [year, month, day] = isoString.split('T')[0].split('-').map(Number)
  const d = new Date(year, month - 1, day, 0, 0, 0, 0)
  return d
}

// ─── POST /api/bookings ───────────────────────────────────────────────────────
const createBookingSchema = z.object({
  classId: z.string().min(1, 'classId requerido'),
  date: z.string().min(1, 'date requerida'),
})

router.post('/', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createBookingSchema.parse(req.body)
    const userId = req.user!.id

    // 1. Buscar la clase
    const cls = await prisma.class.findUnique({ where: { id: body.classId } })
    if (!cls || !cls.isActive) {
      return next(createError(404, 'Clase no encontrada o inactiva'))
    }

    // 2. Parsear fecha y verificar dayOfWeek
    const parsedDate = normalizeDate(body.date)
    if (isNaN(parsedDate.getTime())) {
      return next(createError(400, 'Fecha inválida'))
    }

    if (parsedDate.getDay() !== cls.dayOfWeek) {
      return next(createError(400, `Esta clase no se imparte el día seleccionado`))
    }

    // 2b. Verificar vigencia de la clase (fecha de inicio / fin)
    if (!isClassActiveOn(cls, toLocalDateString(parsedDate))) {
      const msg = cls.startDate && toLocalDateString(parsedDate) < toRangeDateString(cls.startDate)
        ? `Esta clase inicia el ${toRangeDateString(cls.startDate)}`
        : 'Esta clase ya no está disponible en esa fecha'
      return next(createError(400, msg))
    }

    // 3. Verificar que la clase sea en el futuro con al menos 60 min de anticipación
    const classDateTime = getClassDateTime(parsedDate, cls.startTime)
    const now = new Date()
    const diffMin = (classDateTime.getTime() - now.getTime()) / (1000 * 60)

    if (diffMin < 0) {
      return next(createError(400, 'No se pueden reservar clases en el pasado'))
    }
    if (diffMin < 60) {
      return next(createError(400, 'Reserva cerrada. La clase comienza en menos de 60 minutos'))
    }

    // 4. Verificar con qué se paga la clase: primero la cortesía, luego el paquete
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: now },
        OR: [
          { classesLeft: { gt: 0 } },
          { classesLeft: null }, // ilimitado
        ],
      },
    })

    const student = await prisma.user.findUnique({
      where:  { id: userId },
      select: { bonusClasses: true },
    })

    // La cortesía se gasta antes que el paquete pagado
    const useBonus = (student?.bonusClasses ?? 0) > 0

    if (!useBonus && !subscription) {
      return next(createError(403, 'Sin clases disponibles. Adquiere un paquete para continuar'))
    }

    // 5. Verificar que no exista ya un booking CONFIRMED para esta clase+fecha
    const existingBooking = await prisma.booking.findUnique({
      where: {
        userId_classId_date: {
          userId,
          classId: cls.id,
          date: parsedDate,
        },
      },
    })

    if (existingBooking?.status === 'CONFIRMED') {
      return next(createError(409, 'Ya tienes esta clase reservada'))
    }

    // 6. Verificar disponibilidad
    const confirmedCount = await prisma.booking.count({
      where: { classId: cls.id, date: parsedDate, status: 'CONFIRMED' },
    })

    if (confirmedCount >= cls.maxCapacity) {
      return next(createError(409, 'Clase llena. No hay lugares disponibles'))
    }

    // 7. Verificar que no haya otra clase a la misma hora ese día
    const sameDayBookings = await prisma.booking.findMany({
      where: { userId, date: parsedDate, status: 'CONFIRMED' },
      include: { class: true },
    })

    const overlap = sameDayBookings.some((b) => b.class.startTime === cls.startTime)
    if (overlap) {
      return next(createError(409, 'Ya tienes una clase a esa hora'))
    }

    // 8. Transacción: crear booking + descontar cortesía o suscripción
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          userId,
          classId: cls.id,
          date: parsedDate,
          status: 'CONFIRMED',
          usedBonus: useBonus,
        },
        include: {
          class: { select: { name: true, startTime: true, instructor: true } },
        },
      })

      if (useBonus) {
        await tx.user.update({
          where: { id: userId },
          data:  { bonusClasses: { decrement: 1 } },
        })

        // Marca el comprobante más antiguo sin usar como canjeado
        const pending = await tx.reward.findFirst({
          where:   { userId, type: 'FREE_CLASS', isRedeemed: false },
          orderBy: { createdAt: 'asc' },
          select:  { id: true },
        })
        if (pending) {
          await tx.reward.update({
            where: { id: pending.id },
            data:  { isRedeemed: true, redeemedAt: new Date() },
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

    // 9. Push al admin (no bloquea la respuesta)
    sendPushToAdmin({
      title: 'Nueva reserva',
      body: `${req.user!.email} reservó ${cls.name} para ${body.date} a las ${cls.startTime}`,
    }).catch(() => null)

    // 10. Responder 201
    return res.status(201).json(booking)
  } catch (err) {
    return next(err)
  }
})

// ─── DELETE /api/bookings/:id ─────────────────────────────────────────────────
router.delete('/:id', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    // 1. Buscar booking
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { class: true },
    })

    if (!booking) {
      return next(createError(404, 'Reserva no encontrada'))
    }

    // 2. Verificar que pertenece al usuario
    if (booking.userId !== userId) {
      return next(createError(403, 'No tienes permiso para cancelar esta reserva'))
    }

    // 3. Verificar que no esté ya cancelada
    if (booking.status !== 'CONFIRMED') {
      return next(createError(400, 'Esta reserva ya fue cancelada'))
    }

    // 4. Calcular si faltan más de 3 horas
    const classDateTime = getClassDateTime(new Date(booking.date), booking.class.startTime)
    const now = new Date()
    const diffHours = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    const canRefund = diffHours > 3

    // 5. Transacción: cancelar + devolver clase si aplica
    const refundBonus = canRefund && booking.usedBonus

    const subscription = canRefund && !booking.usedBonus
      ? await prisma.subscription.findFirst({
          where: { userId, isActive: true, classesLeft: { not: null } },
        })
      : null

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const cancelled = await tx.booking.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: {
          class: { select: { name: true, startTime: true } },
        },
      })

      if (refundBonus) {
        // Se pagó con cortesía: se devuelve el crédito y el comprobante vuelve a estar vigente
        await tx.user.update({
          where: { id: userId },
          data:  { bonusClasses: { increment: 1 } },
        })

        const usedReward = await tx.reward.findFirst({
          where:   { userId, type: 'FREE_CLASS', isRedeemed: true },
          orderBy: { redeemedAt: 'desc' },
          select:  { id: true },
        })
        if (usedReward) {
          await tx.reward.update({
            where: { id: usedReward.id },
            data:  { isRedeemed: false, redeemedAt: null },
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

    return res.json({
      booking: updatedBooking,
      classRefunded: refundBonus || (canRefund && subscription !== null),
      bonusRefunded: refundBonus,
    })
  } catch (err) {
    return next(err)
  }
})

// ─── GET /api/bookings/me ─────────────────────────────────────────────────────
router.get('/me', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const { status, limit = '20', page = '1' } = req.query

    const take = Math.min(parseInt(limit as string) || 20, 100)
    const skip = (Math.max(parseInt(page as string) || 1, 1) - 1) * take

    const where: {
      userId: string
      status?: 'CONFIRMED' | 'CANCELLED' | 'ATTENDED'
    } = { userId }

    if (status && ['CONFIRMED', 'CANCELLED', 'ATTENDED'].includes(status as string)) {
      where.status = status as 'CONFIRMED' | 'CANCELLED' | 'ATTENDED'
    }

    const [bookings, total, coachAvatarsByName] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          class: {
            select: {
              id: true,
              name: true,
              instructor: true,
              startTime: true,
              durationMin: true,
              coach: { select: { avatar: true } },
            },
          },
        },
        orderBy: { date: 'desc' },
        take,
        skip,
      }),
      prisma.booking.count({ where }),
      getCoachAvatarsByName(),
    ])

    // Aplanar la foto de la coach dentro de `class`
    const data = bookings.map((b) => {
      const { coach, ...cls } = b.class
      return {
        ...b,
        class: {
          ...cls,
          coachAvatar: resolveCoachAvatar({ instructor: cls.instructor, coach }, coachAvatarsByName),
        },
      }
    })

    return res.json({
      data,
      pagination: {
        total,
        page: parseInt(page as string) || 1,
        limit: take,
        pages: Math.ceil(total / take),
      },
    })
  } catch (err) {
    return next(err)
  }
})

export default router
