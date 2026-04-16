import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { createError } from '../middleware/errorHandler'

const router = Router()

const COOKIE_NAME = 'refreshToken'

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    path: '/',
  }
}

function generateTokens(payload: { id: string; email: string; role: string }) {
  const secret = process.env.JWT_SECRET ?? ''
  const refreshSecret = process.env.JWT_REFRESH_SECRET ?? ''
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '15m'
  const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d'

  const accessToken = jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions)
  const refreshToken = jwt.sign(payload, refreshSecret, { expiresIn: refreshExpiresIn } as jwt.SignOptions)

  return { accessToken, refreshToken }
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
const registerSchema = z.object({
  name:      z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email:     z.string().email('Email inválido'),
  phone:     z.string().optional(),
  password:  z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  gender:    z.enum(['FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  birthDate: z.string().optional(),
})

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body)

    // ── Validación de edad mínima (16 años) ───────────────────────────────────
    if (body.birthDate) {
      const birth = new Date(body.birthDate)
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const m = today.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
      if (age < 16) {
        return next(createError(400, 'Debes tener al menos 16 años para registrarte'))
      }
    }

    const existing = await prisma.user.findUnique({ where: { email: body.email } })
    if (existing) {
      return next(createError(409, 'Ya existe una cuenta con ese email'))
    }

    const passwordHash = await bcrypt.hash(body.password, 12)

    const user = await prisma.user.create({
      data: {
        name:         body.name,
        email:        body.email,
        phone:        body.phone,
        passwordHash,
        role:         'STUDENT',
        gender:       body.gender,
        birthDate:    body.birthDate ? new Date(body.birthDate) : undefined,
      },
      select: { id: true, name: true, email: true, role: true, onboardingCompleted: true },
    })

    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    })

    res.cookie(COOKIE_NAME, refreshToken, cookieOptions())

    return res.status(201).json({
      user,
      accessToken,
    })
  } catch (err) {
    return next(err)
  }
})

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
})

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = loginSchema.parse(req.body)

    const user = await prisma.user.findUnique({ where: { email: body.email } })
    if (!user) {
      return next(createError(404, 'No existe una cuenta con ese email'))
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash)
    if (!valid) {
      return next(createError(401, 'Credenciales incorrectas'))
    }

    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    })

    res.cookie(COOKIE_NAME, refreshToken, cookieOptions())

    return res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, onboardingCompleted: user.onboardingCompleted },
      accessToken,
    })
  } catch (err) {
    return next(err)
  }
})

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post('/refresh', (req: Request, res: Response, next: NextFunction) => {
  try {
    const token: string | undefined = req.cookies[COOKIE_NAME]

    if (!token) {
      return next(createError(401, 'Refresh token no encontrado'))
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET ?? ''

    const payload = jwt.verify(token, refreshSecret) as {
      id: string
      email: string
      role: string
    }

    const secret = process.env.JWT_SECRET ?? ''
    const expiresIn = process.env.JWT_EXPIRES_IN ?? '15m'
    const accessToken = jwt.sign(
      { id: payload.id, email: payload.email, role: payload.role },
      secret,
      { expiresIn } as jwt.SignOptions,
    )

    return res.json({ accessToken })
  } catch {
    return next(createError(401, 'Refresh token inválido o expirado'))
  }
})

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, { path: '/' })
  res.json({ ok: true })
})

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        onboardingCompleted: true,
        createdAt: true,
        subscription: {
          select: {
            id: true,
            classesLeft: true,
            expiresAt: true,
            isActive: true,
            package: { select: { name: true, priceMXN: true } },
          },
        },
      },
    })

    if (!user) {
      return next(createError(404, 'Usuario no encontrado'))
    }

    return res.json(user)
  } catch (err) {
    return next(err)
  }
})

export default router
