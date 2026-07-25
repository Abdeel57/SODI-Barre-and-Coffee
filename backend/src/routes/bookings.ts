import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { createError } from '../middleware/errorHandler'
import { sendPushToAdmin } from '../services/webpush'
import { attemptBooking, cancelBooking, normalizeDate } from '../services/booking'
import { getCoachAvatarsByName, resolveCoachAvatar } from '../lib/coachAvatar'

const router = Router()

// ─── POST /api/bookings ───────────────────────────────────────────────────────
const createBookingSchema = z.object({
  classId: z.string().min(1, 'classId requerido'),
  date: z.string().min(1, 'date requerida'),
})

router.post('/', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createBookingSchema.parse(req.body)
    const userId = req.user!.id

    const result = await attemptBooking({
      userId,
      classId: body.classId,
      date: normalizeDate(body.date),
    })

    if (!result.ok) {
      return next(createError(result.status, result.message))
    }

    // Push al admin (no bloquea la respuesta)
    sendPushToAdmin({
      title: 'Nueva reserva',
      body: `${req.user!.email} reservó ${result.booking.class.name} para ${body.date} a las ${result.booking.class.startTime}`,
    }).catch(() => null)

    return res.status(201).json(result.booking)
  } catch (err) {
    return next(err)
  }
})

// ─── DELETE /api/bookings/:id ─────────────────────────────────────────────────
router.delete('/:id', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await cancelBooking({ bookingId: req.params.id, userId: req.user!.id })

    if (!result.ok) {
      return next(createError(result.status, result.message))
    }

    return res.json({
      booking: result.booking,
      classRefunded: result.classRefunded,
      bonusRefunded: result.bonusRefunded,
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
