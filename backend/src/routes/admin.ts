import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { isAdmin } from '../middleware/isAdmin'
import { createError } from '../middleware/errorHandler'

const router = Router()

const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// Todas las rutas admin requieren auth + isAdmin
router.use(auth, isAdmin)

// ─── GET /api/admin/dashboard ─────────────────────────────────────────────────
router.get('/dashboard', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date()
    const todayDOW = now.getDay()

    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)

    const diffToMonday = todayDOW === 0 ? -6 : 1 - todayDOW
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() + diffToMonday)
    startOfWeek.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Clases de hoy
    const todaysClasses = await prisma.class.findMany({
      where: { isActive: true, dayOfWeek: todayDOW },
      orderBy: { startTime: 'asc' },
    })

    const classesWithBookings = await Promise.all(
      todaysClasses.map(async (cls) => {
        const bookings = await prisma.booking.findMany({
          where: {
            classId: cls.id,
            date: { gte: startOfToday, lte: endOfToday },
            status: 'CONFIRMED',
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        })

        return {
          classId: cls.id,
          name: cls.name,
          instructor: cls.instructor,
          startTime: cls.startTime,
          confirmedBookings: bookings.length,
          maxCapacity: cls.maxCapacity,
          occupancyPercent: Math.round((bookings.length / cls.maxCapacity) * 100),
          students: bookings.map((b) => b.user),
        }
      }),
    )

    // Stats en paralelo
    const [activeSubscriptions, revenueResult, bookingsThisWeek, totalStudents] =
      await Promise.all([
        prisma.subscription.count({
          where: { isActive: true, expiresAt: { gt: now } },
        }),
        prisma.payment.aggregate({
          where: {
            status: 'APPROVED',
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amountMXN: true },
        }),
        prisma.booking.count({
          where: {
            status: 'CONFIRMED',
            date: { gte: startOfWeek, lte: endOfWeek },
          },
        }),
        prisma.user.count({ where: { role: 'STUDENT' } }),
      ])

    res.json({
      today: {
        date: startOfToday.toISOString().split('T')[0],
        classes: classesWithBookings,
      },
      stats: {
        activeSubscriptions,
        revenueThisMonth: revenueResult._sum.amountMXN ?? 0,
        bookingsThisWeek,
        totalStudents,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/admin/students ──────────────────────────────────────────────────
router.get('/students', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, page = '1', limit = '20' } = req.query
    const take = Math.min(parseInt(limit as string) || 20, 100)
    const skip = (Math.max(parseInt(page as string) || 1, 1) - 1) * take

    const where = {
      role: { in: ['STUDENT', 'COACH'] as ('STUDENT' | 'COACH')[] },
      ...(search
        ? {
            OR: [
              { name: { contains: search as string, mode: 'insensitive' as const } },
              { email: { contains: search as string, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          subscription: {
            select: {
              classesLeft: true,
              expiresAt: true,
              isActive: true,
              package: { select: { name: true } },
            },
          },
          _count: { select: { bookings: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.user.count({ where }),
    ])

    const data = students.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      role: s.role,
      createdAt: s.createdAt,
      totalBookings: s._count.bookings,
      subscription: s.subscription
        ? {
            packageName: s.subscription.package.name,
            classesLeft: s.subscription.classesLeft,
            expiresAt: s.subscription.expiresAt,
            isActive: s.subscription.isActive,
          }
        : null,
    }))

    res.json({
      data,
      pagination: {
        total,
        page: parseInt(page as string) || 1,
        limit: take,
        pages: Math.ceil(total / take),
      },
    })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/admin/students/:id/subscription ───────────────────────────────
// Upsert: crea la suscripción si no existe, la actualiza si ya existe.
const patchSubscriptionSchema = z.object({
  packageId:   z.string().optional(),
  classesLeft: z.number().int().min(0).optional().nullable(),
  expiresAt:   z.string().optional(),
  isActive:    z.boolean().optional(),
})

router.patch(
  '/students/:id/subscription',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = patchSubscriptionSchema.parse(req.body)
      const userId = req.params['id']

      // Verificar que el usuario existe
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) return next(createError(404, 'Alumna no encontrada'))

      const existing = await prisma.subscription.findFirst({ where: { userId } })

      if (!existing) {
        // ── Crear nueva suscripción ─────────────────────────────────────────
        if (!body.packageId) {
          return next(createError(400, 'Se requiere un paquete para asignar el plan'))
        }
        const pkg = await prisma.package.findUnique({ where: { id: body.packageId } })
        if (!pkg || !pkg.isActive) return next(createError(404, 'Paquete no encontrado'))

        const expiresAt = body.expiresAt
          ? new Date(body.expiresAt)
          : new Date(Date.now() + pkg.validDays * 24 * 60 * 60 * 1000)

        const classesLeft = body.classesLeft !== undefined
          ? body.classesLeft
          : pkg.classCount   // null = ilimitado

        const created = await prisma.subscription.create({
          data: { userId, packageId: pkg.id, classesLeft, expiresAt, isActive: body.isActive ?? true },
          include: { package: { select: { name: true } } },
        })
        return res.status(201).json(created)
      }

      // ── Actualizar suscripción existente ──────────────────────────────────
      // Si cambia de paquete, recalcular classesLeft desde el nuevo paquete
      let newClassesLeft = existing.classesLeft
      if (body.packageId && body.packageId !== existing.packageId) {
        const pkg = await prisma.package.findUnique({ where: { id: body.packageId } })
        if (!pkg || !pkg.isActive) return next(createError(404, 'Paquete no encontrado'))
        newClassesLeft = pkg.classCount
      }
      if (body.classesLeft !== undefined) newClassesLeft = body.classesLeft

      const updated = await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          ...(body.packageId  && { packageId: body.packageId }),
          classesLeft: newClassesLeft,
          ...(body.expiresAt  && { expiresAt: new Date(body.expiresAt) }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
        include: { package: { select: { name: true } } },
      })
      return res.json(updated)
    } catch (err) {
      return next(err)
    }
  },
)

// ─── GET /api/admin/coaches ───────────────────────────────────────────────────
router.get('/coaches', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const coaches = await prisma.user.findMany({
      where: { role: { in: ['COACH', 'ADMIN'] } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    })
    res.json({ data: coaches })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/admin/students/:id/role ───────────────────────────────────────
const patchRoleSchema = z.object({
  role: z.enum(['STUDENT', 'COACH', 'ADMIN']),
})

router.patch('/students/:id/role', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = patchRoleSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { id: req.params['id'] } })
    if (!user) return next(createError(404, 'Usuario no encontrado'))

    const updated = await prisma.user.update({
      where: { id: req.params['id'] },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    })
    return res.json(updated)
  } catch (err) {
    return next(err)
  }
})

// ─── GET /api/admin/classes ───────────────────────────────────────────────────
router.get('/classes', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date()
    const diffToMonday = now.getDay() === 0 ? -6 : 1 - now.getDay()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() + diffToMonday)
    startOfWeek.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    const classes = await prisma.class.findMany({
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      include: {
        coach: { select: { id: true, name: true } },
        _count: {
          select: {
            bookings: {
              where: {
                status: 'CONFIRMED',
                date: { gte: startOfWeek, lte: endOfWeek },
              },
            },
          },
        },
      },
    })

    const data = classes.map((c) => ({
      id: c.id,
      name: c.name,
      instructor: c.instructor,
      dayOfWeek: c.dayOfWeek,
      dayLabel: DAY_LABELS[c.dayOfWeek],
      startTime: c.startTime,
      durationMin: c.durationMin,
      maxCapacity: c.maxCapacity,
      isActive: c.isActive,
      coachId: c.coachId,
      coachName: c.coach?.name ?? null,
      bookingsThisWeek: c._count.bookings,
    }))

    res.json({ data })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/admin/classes ──────────────────────────────────────────────────
const createClassSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  instructor: z.string().min(2, 'El instructor debe tener al menos 2 caracteres'),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:MM)'),
  durationMin: z.number().int().min(1).default(55),
  maxCapacity: z.number().int().min(1).max(30),
})

router.post('/classes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createClassSchema.parse(req.body)

    const cls = await prisma.class.create({
      data: { ...body, isActive: true },
    })

    res.status(201).json(cls)
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/admin/classes/:id ─────────────────────────────────────────────
const updateClassSchema = z.object({
  name: z.string().min(2).optional(),
  instructor: z.string().min(2).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  durationMin: z.number().int().min(1).optional(),
  maxCapacity: z.number().int().min(1).max(30).optional(),
  isActive: z.boolean().optional(),
  coachId: z.string().nullable().optional(),
})

router.patch('/classes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = updateClassSchema.parse(req.body)

    const existing = await prisma.class.findUnique({ where: { id: req.params['id'] } })
    if (!existing) {
      return next(createError(404, 'Clase no encontrada'))
    }

    const updated = await prisma.class.update({
      where: { id: req.params['id'] },
      data: body,
    })

    return res.json(updated)
  } catch (err) {
    return next(err)
  }
})

// ─── GET /api/admin/payments ──────────────────────────────────────────────────
router.get('/payments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', status } = req.query

    const take = Math.min(parseInt(limit as string) || 20, 100)
    const skip = (Math.max(parseInt(page as string) || 1, 1) - 1) * take

    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED']
    const statusFilter =
      status && validStatuses.includes(status as string)
        ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' }
        : {}

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: statusFilter,
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.payment.count({ where: statusFilter }),
    ])

    const packageIds = [...new Set(payments.map((p) => p.packageId))]
    const packages = await prisma.package.findMany({
      where: { id: { in: packageIds } },
      select: { id: true, name: true },
    })
    const pkgMap = new Map(packages.map((p) => [p.id, p.name]))

    const data = payments.map((p) => ({
      id: p.id,
      mpPaymentId: p.mpPaymentId,
      status: p.status,
      amountMXN: p.amountMXN,
      createdAt: p.createdAt,
      packageName: pkgMap.get(p.packageId) ?? null,
      student: p.user,
    }))

    res.json({
      data,
      pagination: {
        total,
        page: parseInt(page as string) || 1,
        limit: take,
        pages: Math.ceil(total / take),
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
