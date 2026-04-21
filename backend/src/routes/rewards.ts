import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { getTier } from '../services/rewards'

const router = Router()

// ─── GET /api/rewards/mine ────────────────────────────────────────────────────
// Returns the student's tier, totalClassesTaken, and their rewards list
router.get('/mine', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id

    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { totalClassesTaken: true },
    })

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    const rewards = await prisma.reward.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      select:  { id: true, type: true, code: true, isRedeemed: true, redeemedAt: true, createdAt: true },
    })

    const tier = getTier(user.totalClassesTaken)

    return res.json({
      totalClassesTaken: user.totalClassesTaken,
      tier: tier.id,
      tierLabel: tier.label,
      rewards,
    })
  } catch (err) {
    return next(err)
  }
})

export default router
