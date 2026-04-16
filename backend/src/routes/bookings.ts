import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { createError } from '../middleware/errorHandler'
import { sendPushToAdmin } from '../services/webpush'

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

    // 4. Verificar suscripción activa
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

    if (!subscription) {
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

    // 8. Transacción: crear booking + decrementar suscripción
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          userId,
          classId: cls.id,
          date: parsedDate,
          status: 'CONFIRMED',
        },
        include: {
          class: { select: { name: true, startTime: true, instructor: true } },
        },
      })

      if (subscription.classesLeft !== null) {
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
    const subscription = canRefund
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

      if (canRefund && subscription && subscription.classesLeft !== null) {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: { classesLeft: { increment: 1 } },
        })
      }

      return cancelled
    })

    return res.json({
      booking: updatedBooking,
      classRefunded: canRefund && subscription !== null,
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

    const [bookings, total] = await Promise.all([
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
            },
          },
        },
        orderBy: { date: 'desc' },
        take,
        skip,
      }),
      prisma.booking.count({ where }),
    ])

    return res.json({
      data: bookings,
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
