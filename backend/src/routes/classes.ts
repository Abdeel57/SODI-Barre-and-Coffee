import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'

const router = Router()

const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function getWeekDays(baseDate: Date): Date[] {
  const day = baseDate.getDay() // 0=Dom
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(baseDate)
  monday.setDate(baseDate.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// ─── GET /api/classes/week ────────────────────────────────────────────────────
router.get('/week', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateParam = req.query['date'] as string | undefined
    const baseDate = dateParam ? new Date(dateParam) : new Date()

    if (isNaN(baseDate.getTime())) {
      res.status(400).json({ error: 'Fecha inválida' })
      return
    }

    const weekDays = getWeekDays(baseDate)
    const userId = req.user!.id

    // Obtener todas las clases activas una sola vez
    const allClasses = await prisma.class.findMany({
      where: { isActive: true },
    })

    // Obtener todos los bookings de la semana del usuario
    const weekStart = weekDays[0]
    const weekEnd = new Date(weekDays[6])
    weekEnd.setHours(23, 59, 59, 999)

    const userBookings = await prisma.booking.findMany({
      where: {
        userId,
        date: { gte: weekStart, lte: weekEnd },
        status: 'CONFIRMED',
      },
    })

    // Obtener conteo de bookings confirmados por clase+fecha en la semana
    const allConfirmedBookings = await prisma.booking.groupBy({
      by: ['classId', 'date'],
      where: {
        date: { gte: weekStart, lte: weekEnd },
        status: 'CONFIRMED',
      },
      _count: { id: true },
    })

    const confirmedCountMap = new Map<string, number>()
    for (const b of allConfirmedBookings) {
      const key = `${b.classId}::${toISODate(new Date(b.date))}`
      confirmedCountMap.set(key, b._count.id)
    }

    const userBookingMap = new Map<string, string>()
    for (const b of userBookings) {
      const key = `${b.classId}::${toISODate(new Date(b.date))}`
      userBookingMap.set(key, b.id)
    }

    const week = weekDays.map((day) => {
      const dow = day.getDay()
      const dateStr = toISODate(day)

      const dayClasses = allClasses
        .filter((c) => c.dayOfWeek === dow)
        .map((c) => {
          const mapKey = `${c.id}::${dateStr}`
          const confirmedCount = confirmedCountMap.get(mapKey) ?? 0
          const bookingId = userBookingMap.get(mapKey) ?? null

          // Construir datetime de la clase para este día
          const [h, m] = c.startTime.split(':').map(Number)
          const classDateTime = new Date(day)
          classDateTime.setHours(h, m, 0, 0)

          return {
            classId: c.id,
            name: c.name,
            instructor: c.instructor,
            startTime: c.startTime,
            durationMin: c.durationMin,
            maxCapacity: c.maxCapacity,
            availableSpots: Math.max(0, c.maxCapacity - confirmedCount),
            isBooked: bookingId !== null,
            bookingId,
            date: classDateTime.toISOString(),
          }
        })
        .sort((a, b) => a.startTime.localeCompare(b.startTime))

      return {
        date: dateStr,
        dayOfWeek: dow,
        dayLabel: DAY_LABELS[dow],
        classes: dayClasses,
      }
    })

    res.json({ week })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/classes ─────────────────────────────────────────────────────────
router.get('/', auth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const classes = await prisma.class.findMany({
      where: { isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })
    res.json({ data: classes })
  } catch (err) {
    next(err)
  }
})

export default router
