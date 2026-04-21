import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { isCoach } from '../middleware/isCoach'
import { onClassAttended, onClassUnattended } from '../services/rewards'

const router = Router()
router.use(auth, isCoach)

// ─── GET /api/coach/classes ───────────────────────────────────────────────────
// Clases asignadas a este coach para la semana actual
router.get('/classes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coachId = req.user!.id

    const now = new Date()
    const diffToMonday = now.getDay() === 0 ? -6 : 1 - now.getDay()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() + diffToMonday)
    startOfWeek.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    const classes = await prisma.class.findMany({
      where:   { coachId, isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      include: {
        _count: {
          select: {
            bookings: {
              where: { status: 'CONFIRMED', date: { gte: startOfWeek, lte: endOfWeek } },
            },
          },
        },
      },
    })

    const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const todayDOW = now.getDay()

    const data = classes.map((c) => ({
      id:              c.id,
      name:            c.name,
      instructor:      c.instructor,
      dayOfWeek:       c.dayOfWeek,
      dayLabel:        DAY_LABELS[c.dayOfWeek],
      startTime:       c.startTime,
      durationMin:     c.durationMin,
      maxCapacity:     c.maxCapacity,
      isToday:         c.dayOfWeek === todayDOW,
      bookingsThisWeek: c._count.bookings,
    }))

    return res.json({ data, today: todayDOW })
  } catch (err) {
    return next(err)
  }
})

// ─── GET /api/coach/classes/:classId/attendance ───────────────────────────────
// Lista de alumnas con reserva CONFIRMED o ATTENDED para esta clase en una fecha
router.get('/classes/:classId/attendance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classId } = req.params
    const dateParam = req.query['date'] as string | undefined

    const date = dateParam ? new Date(dateParam) : new Date()
    const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0)
    const endOfDay   = new Date(date); endOfDay.setHours(23, 59, 59, 999)

    const cls = await prisma.class.findUnique({ where: { id: classId } })
    if (!cls) return res.status(404).json({ error: 'Clase no encontrada' })

    const bookings = await prisma.booking.findMany({
      where: {
        classId,
        date:   { gte: startOfDay, lte: endOfDay },
        status: { in: ['CONFIRMED', 'ATTENDED'] },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { user: { name: 'asc' } },
    })

    return res.json({
      classInfo: {
        id:          cls.id,
        name:        cls.name,
        instructor:  cls.instructor,
        startTime:   cls.startTime,
        durationMin: cls.durationMin,
        date:        startOfDay.toISOString().split('T')[0],
      },
      bookings: bookings.map((b) => ({
        bookingId: b.id,
        status:    b.status,
        student:   b.user,
      })),
    })
  } catch (err) {
    return next(err)
  }
})

// ─── PATCH /api/coach/classes/:classId/attendance ─────────────────────────────
// Actualizar lista de asistencia en batch
const attendanceSchema = z.object({
  date:       z.string(),
  attendance: z.array(z.object({
    bookingId: z.string(),
    attended:  z.boolean(),
  })),
})

router.patch('/classes/:classId/attendance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = attendanceSchema.parse(req.body)

    // Fetch current statuses to detect actual transitions
    const bookingIds = body.attendance.map((a) => a.bookingId)
    const currentBookings = await prisma.booking.findMany({
      where:  { id: { in: bookingIds } },
      select: { id: true, status: true, userId: true },
    })
    const currentMap = new Map(currentBookings.map((b) => [b.id, b]))

    await Promise.all(
      body.attendance.map(({ bookingId, attended }) =>
        prisma.booking.update({
          where: { id: bookingId },
          data:  { status: attended ? 'ATTENDED' : 'CONFIRMED' },
        }),
      ),
    )

    // Fire reward triggers for status transitions (fire-and-forget)
    for (const { bookingId, attended } of body.attendance) {
      const current = currentMap.get(bookingId)
      if (!current) continue

      if (attended && current.status === 'CONFIRMED') {
        onClassAttended(current.userId).catch(() => null)
      } else if (!attended && current.status === 'ATTENDED') {
        onClassUnattended(current.userId).catch(() => null)
      }
    }

    return res.json({ ok: true, updated: body.attendance.length })
  } catch (err) {
    return next(err)
  }
})

export default router
