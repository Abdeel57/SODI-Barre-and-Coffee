import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'

const router = Router()

const healthSchema = z.object({
  hasSurgeries:          z.boolean().default(false),
  surgeriesDetail:       z.string().optional(),
  isPregnant:            z.boolean().default(false),
  pregnancyWeeks:        z.number().int().positive().optional().nullable(),
  bloodType:             z.string().optional(),
  emergencyContactName:  z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  allergies:             z.string().optional(),
  injuries:              z.string().optional(),
})

// ─── GET /api/profile/health ──────────────────────────────────────────────────
router.get('/health', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.healthProfile.findUnique({
      where: { userId: req.user!.id },
    })
    return res.json(profile ?? null)
  } catch (err) {
    return next(err)
  }
})

// ─── PUT /api/profile/health ──────────────────────────────────────────────────
router.put('/health', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = healthSchema.parse(req.body)

    const profile = await prisma.healthProfile.upsert({
      where:  { userId: req.user!.id },
      create: { userId: req.user!.id, ...body },
      update: body,
    })

    return res.json(profile)
  } catch (err) {
    return next(err)
  }
})

export default router
