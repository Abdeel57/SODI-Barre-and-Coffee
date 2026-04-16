import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { isAdmin } from '../middleware/isAdmin'
import { sendPushToUser } from '../services/webpush'
import { createError } from '../middleware/errorHandler'

const router = Router()

// ─── POST /api/push/subscribe ─────────────────────────────────────────────────
const subscribeSchema = z.object({
  endpoint: z.string().min(1, 'endpoint requerido'),
  keys: z.object({
    p256dh: z.string().min(1, 'p256dh requerida'),
    auth: z.string().min(1, 'auth requerida'),
  }),
})

router.post('/subscribe', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = subscribeSchema.parse(req.body)

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { pushToken: JSON.stringify(body) },
    })

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/push/send (admin) ──────────────────────────────────────────────
const sendSchema = z.object({
  target: z.enum(['all', 'inactive', 'userId']),
  userId: z.string().optional(),
  title: z.string().min(1, 'title requerido'),
  body: z.string().min(1, 'body requerido'),
})

router.post(
  '/send',
  auth,
  isAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = sendSchema.parse(req.body)

      if (body.target === 'userId' && !body.userId) {
        return next(createError(400, 'userId es requerido cuando target es "userId"'))
      }

      let userIds: string[] = []

      if (body.target === 'all') {
        const users = await prisma.user.findMany({
          where: { pushToken: { not: null } },
          select: { id: true },
        })
        userIds = users.map((u) => u.id)
      } else if (body.target === 'inactive') {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const activeBookings = await prisma.booking.findMany({
          where: { status: 'CONFIRMED', createdAt: { gte: sevenDaysAgo } },
          select: { userId: true },
          distinct: ['userId'],
        })
        const activeIds = activeBookings.map((b) => b.userId)

        const inactiveUsers = await prisma.user.findMany({
          where: { pushToken: { not: null }, id: { notIn: activeIds } },
          select: { id: true },
        })
        userIds = inactiveUsers.map((u) => u.id)
      } else if (body.userId) {
        userIds = [body.userId]
      }

      await Promise.allSettled(
        userIds.map((id) =>
          sendPushToUser(id, { title: body.title, body: body.body }),
        ),
      )

      return res.json({ sent: userIds.length })
    } catch (err) {
      return next(err)
    }
  },
)

// ─── DELETE /api/push/unsubscribe ─────────────────────────────────────────────
router.delete('/unsubscribe', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { pushToken: null },
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
