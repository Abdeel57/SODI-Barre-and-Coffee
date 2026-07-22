import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { promoPayload } from '../lib/promo'

const router = Router()

// ─── GET /api/packages ────────────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const packages = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: { priceMXN: 'asc' },
    })

    const data = packages.map((pkg) => {
      const promo = promoPayload(pkg.priceMXN)

      return {
      id: pkg.id,
      name: pkg.name,
      description: pkg.description ?? null,
      classCount: pkg.classCount,
      validDays: pkg.validDays,
      priceMXN: pkg.priceMXN,
      /** Lo que realmente se cobra hoy (con promo aplicada, si hay). */
      finalPriceMXN: promo?.priceMXN ?? pkg.priceMXN,
      promo,
      label:
        pkg.classCount === null
          ? `Ilimitado · ${pkg.validDays} días`
          : `${pkg.classCount} clases · ${pkg.validDays} días`,
      }
    })

    res.json({ data })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/packages/my-subscription ───────────────────────────────────────
router.get('/my-subscription', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date()

    const [subscription, user] = await Promise.all([
      prisma.subscription.findFirst({
        where: {
          userId: req.user!.id,
          isActive: true,
          expiresAt: { gt: now },
        },
        include: {
          package: { select: { name: true } },
        },
      }),
      prisma.user.findUnique({
        where:  { id: req.user!.id },
        select: { bonusClasses: true },
      }),
    ])

    // Las cortesías se pueden usar aunque no haya paquete activo
    const bonusClasses = user?.bonusClasses ?? 0

    if (!subscription) {
      return res.json({ subscription: null, bonusClasses })
    }

    const daysLeft = Math.ceil(
      (subscription.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )

    return res.json({
      bonusClasses,
      subscription: {
        id: subscription.id,
        packageId: subscription.packageId,
        packageName: subscription.package.name,
        classesLeft: subscription.classesLeft,
        expiresAt: subscription.expiresAt,
        daysLeft,
        isActive: subscription.isActive,
        isExpiringSoon: daysLeft <= 3,
      },
    })
  } catch (err) {
    return next(err)
  }
})

export default router
