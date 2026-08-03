import { Router, Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { MercadoPagoConfig, Preference } from 'mercadopago'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { createError } from '../middleware/errorHandler'
import { PROMO, promoPrice } from '../lib/promo'
import {
  applyMPPayment,
  fetchMPPayment,
  reconcilePayment,
  type ApplyResult,
} from '../services/payments'

const router = Router()

function getMPClient(): MercadoPagoConfig {
  const token = process.env.MP_ACCESS_TOKEN ?? ''
  return new MercadoPagoConfig({ accessToken: token })
}

// ─── POST /api/payments/create-preference ────────────────────────────────────
const createPreferenceSchema = z.object({
  packageId: z.string().min(1, 'packageId requerido'),
})

router.post(
  '/create-preference',
  auth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { packageId } = createPreferenceSchema.parse(req.body)

      const pkg = await prisma.package.findUnique({ where: { id: packageId } })
      if (!pkg || !pkg.isActive) {
        return next(createError(404, 'Paquete no encontrado o inactivo'))
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { name: true, email: true },
      })
      if (!user) return next(createError(404, 'Usuario no encontrado'))

      const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'
      const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000'

      const preference = new Preference(getMPClient())

      // Precio final con la promo de inauguración aplicada (si está vigente)
      const chargedPrice = promoPrice(pkg.priceMXN)
      const hasDiscount = chargedPrice < pkg.priceMXN

      // La fila se crea ANTES que la preferencia para poder mandar su id como
      // external_reference. Es lo que después permite preguntarle a MP qué pasó
      // con este checkout aunque el webhook nunca llegue.
      const pending = await prisma.payment.create({
        data: {
          userId: req.user!.id,
          packageId: pkg.id,
          amountMXN: chargedPrice,
          mpPaymentId: `pref_${randomUUID()}`,
          status: 'PENDING',
        },
      })

      try {
        const result = await preference.create({
          body: {
            items: [
              {
                id: pkg.id,
                title: hasDiscount
                  ? `${pkg.name} · -${PROMO.discountPct}% ${PROMO.label}`
                  : pkg.name,
                unit_price: chargedPrice,
                quantity: 1,
                currency_id: 'MXN',
              },
            ],
            payer: {
              name: user.name,
              email: user.email,
            },
            back_urls: {
              success: `${FRONTEND_URL}/packages?status=success&packageId=${pkg.id}`,
              failure: `${FRONTEND_URL}/packages?status=failure`,
              pending: `${FRONTEND_URL}/packages?status=pending`,
            },
            notification_url: `${BACKEND_URL}/api/payments/webhook`,
            external_reference: pending.id,
            metadata: {
              userId: req.user!.id,
              packageId: pkg.id,
            },
            statement_descriptor: 'BARRE STUDIO',
          },
        })

        await prisma.payment.update({
          where: { id: pending.id },
          data: { preferenceId: result.id ?? null },
        })

        return res.json({
          preferenceId: result.id,
          initPoint: result.init_point,
        })
      } catch (mpErr) {
        // Si MP falla, la fila pendiente no representa nada: se borra
        await prisma.payment.delete({ where: { id: pending.id } }).catch(() => null)
        throw mpErr
      }
    } catch (err) {
      return next(err)
    }
  },
)

// ─── POST /api/payments/webhook ───────────────────────────────────────────────
// MercadoPago llama este endpoint — SIEMPRE responde 200.
// Ya no es el único camino: si no llega, la app y el cron alcanzan el mismo
// resultado preguntándole a MP (ver services/payments.ts).
router.post('/webhook', async (req: Request, res: Response) => {
  // MercadoPago requiere siempre 200, manejar todo con try/catch
  try {
    const type = req.query['type'] as string | undefined
    const dataId = (req.query['data.id'] ?? req.body?.data?.id) as string | undefined

    if (type !== 'payment' || !dataId) {
      res.sendStatus(200)
      return
    }

    const payment = await fetchMPPayment(String(dataId))
    if (!payment) {
      res.sendStatus(200)
      return
    }

    const result = await applyMPPayment(payment)
    console.log(`[webhook] Pago ${dataId} (${payment.status}) → ${result}`)
  } catch (err) {
    console.error('❌ Webhook error:', err)
  }

  res.sendStatus(200)
})

// ─── POST /api/payments/reconcile ─────────────────────────────────────────────
// La app lo llama al volver del checkout. Antes la pantalla cantaba "¡Pago
// exitoso!" solo por el parámetro de la URL, sin preguntarle a nadie; si el
// webhook no había llegado, la alumna se quedaba sin paquete creyendo que pagó.
router.post('/reconcile', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id

    // Solo los checkouts recientes de esta alumna
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const pending = await prisma.payment.findMany({
      where: { userId, status: 'PENDING', createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    let outcome: ApplyResult = 'UNKNOWN'

    for (const row of pending) {
      const result = await reconcilePayment(row.id)
      if (result === 'APPROVED') {
        outcome = 'APPROVED'
        break
      }
      if (result === 'PENDING') outcome = 'PENDING'
      else if (result === 'REJECTED' && outcome === 'UNKNOWN') outcome = 'REJECTED'
    }

    // Si ya tenía paquete activo (p. ej. el webhook llegó primero), eso manda
    const subscription = await prisma.subscription.findFirst({
      where: { userId, isActive: true, expiresAt: { gt: new Date() } },
      include: { package: { select: { name: true } } },
    })

    return res.json({
      status: outcome,
      pendingCount: pending.length,
      subscription: subscription
        ? {
            packageName: subscription.package.name,
            classesLeft: subscription.classesLeft,
            expiresAt: subscription.expiresAt,
          }
        : null,
    })
  } catch (err) {
    return next(err)
  }
})

// ─── GET /api/payments/status/:mpPaymentId ────────────────────────────────────
router.get(
  '/status/:mpPaymentId',
  auth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payment = await prisma.payment.findUnique({
        where: { mpPaymentId: req.params['mpPaymentId'] },
      })

      if (!payment) {
        return next(createError(404, 'Pago no encontrado'))
      }

      if (payment.userId !== req.user!.id) {
        return next(createError(403, 'No tienes acceso a este pago'))
      }

      const pkg = await prisma.package.findUnique({
        where: { id: payment.packageId },
        select: { name: true },
      })

      return res.json({
        status: payment.status,
        amountMXN: payment.amountMXN,
        createdAt: payment.createdAt,
        packageName: pkg?.name ?? null,
      })
    } catch (err) {
      return next(err)
    }
  },
)

// ─── GET /api/payments/history ────────────────────────────────────────────────
router.get('/history', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user!.id, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
    })

    const packageIds = [...new Set(payments.map((p) => p.packageId))]
    const packages = await prisma.package.findMany({
      where: { id: { in: packageIds } },
      select: { id: true, name: true },
    })
    const pkgMap = new Map(packages.map((p) => [p.id, p.name]))

    const data = payments.map((p) => ({
      ...p,
      packageName: pkgMap.get(p.packageId) ?? null,
    }))

    return res.json({ data })
  } catch (err) {
    return next(err)
  }
})

export default router
