import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { createError } from '../middleware/errorHandler'

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

// ─── PUT /api/profile/password ────────────────────────────────────────────────
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida'),
  newPassword:     z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
})

router.put('/password', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = passwordSchema.parse(req.body)

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user?.passwordHash) {
      return next(createError(400, 'No tienes contraseña configurada'))
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) {
      return next(createError(401, 'La contraseña actual es incorrecta'))
    }

    const hash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: req.user!.id },
      data:  { passwordHash: hash },
    })

    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
})

// ─── PATCH /api/profile/avatar ───────────────────────────────────────────────
const avatarSchema = z.object({
  avatar: z.string()
    .max(200_000, 'La imagen es demasiado grande (máx ~150 KB)')
    .refine((v) => v.startsWith('data:image/'), 'Formato de imagen inválido'),
})

router.patch('/avatar', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { avatar } = avatarSchema.parse(req.body)
    await prisma.user.update({ where: { id: req.user!.id }, data: { avatar } })
    return res.json({ ok: true, avatar })
  } catch (err) {
    return next(err)
  }
})

// ─── DELETE /api/profile/avatar ──────────────────────────────────────────────
router.delete('/avatar', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({ where: { id: req.user!.id }, data: { avatar: null } })
    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
})

// ─── PATCH /api/profile/onboarding ───────────────────────────────────────────
// Marks the tutorial as completed for this user (server-side, device-independent)
router.patch('/onboarding', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data:  { onboardingCompleted: true },
    })
    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
})

export default router
