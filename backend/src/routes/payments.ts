import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { MercadoPagoConfig, Preference } from 'mercadopago'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { createError } from '../middleware/errorHandler'
import { sendPushToAdmin } from '../services/webpush'

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

      const result = await preference.create({
        body: {
          items: [
            {
              id: pkg.id,
              title: pkg.name,
              unit_price: pkg.priceMXN,
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
          metadata: {
            userId: req.user!.id,
            packageId: pkg.id,
          },
          statement_descriptor: 'BARRE STUDIO',
        },
      })

      // Registrar pago pendiente con el ID de la preferencia
      await prisma.payment.create({
        data: {
          userId: req.user!.id,
          packageId: pkg.id,
          amountMXN: pkg.priceMXN,
          mpPaymentId: result.id ?? `pref_${Date.now()}`,
          status: 'PENDING',
        },
      })

      return res.json({
        preferenceId: result.id,
        initPoint: result.init_point,
      })
    } catch (err) {
      return next(err)
    }
  },
)

// ─── POST /api/payments/webhook ───────────────────────────────────────────────
// MercadoPago llama este endpoint — SIEMPRE responde 200
interface MPPayment {
  id: number
  status: string
  transaction_amount: number
  metadata: {
    user_id?: string
    package_id?: string
    userId?: string
    packageId?: string
  }
}

router.post('/webhook', async (req: Request, res: Response) => {
  // MercadoPago requiere siempre 200, manejar todo con try/catch
  try {
    const type = req.query['type'] as string | undefined
    const dataId = (req.query['data.id'] ?? req.body?.data?.id) as string | undefined

    if (type !== 'payment' || !dataId) {
      res.sendStatus(200)
      return
    }

    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN ?? ''

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    })

    if (!mpRes.ok) {
      console.error(`❌ Webhook: error al consultar MP payment ${dataId}: ${mpRes.status}`)
      res.sendStatus(200)
      return
    }

    const payment = (await mpRes.json()) as MPPayment

    if (payment.status !== 'approved') {
      console.log(`ℹ️  Webhook: payment ${dataId} con status ${payment.status} — ignorado`)
      res.sendStatus(200)
      return
    }

    // MP puede enviar metadata con snake_case o camelCase según la versión
    const userId = payment.metadata?.userId ?? payment.metadata?.user_id
    const packageId = payment.metadata?.packageId ?? payment.metadata?.package_id

    if (!userId || !packageId) {
      console.error(`❌ Webhook: metadata incompleta en payment ${dataId}`)
      res.sendStatus(200)
      return
    }

    const pkg = await prisma.package.findUnique({ where: { id: packageId } })
    if (!pkg) {
      console.error(`❌ Webhook: package ${packageId} no encontrado`)
      res.sendStatus(200)
      return
    }

    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setDate(now.getDate() + pkg.validDays)

    await prisma.$transaction(async (tx) => {
      // Upsert del pago con el ID real de MP
      await tx.payment.upsert({
        where: { mpPaymentId: payment.id.toString() },
        create: {
          userId,
          packageId,
          amountMXN: payment.transaction_amount,
          mpPaymentId: payment.id.toString(),
          status: 'APPROVED',
        },
        update: {
          status: 'APPROVED',
          amountMXN: payment.transaction_amount,
        },
      })

      // Crear o actualizar subscription
      const existingSub = await tx.subscription.findFirst({ where: { userId } })

      if (existingSub) {
        await tx.subscription.update({
          where: { id: existingSub.id },
          data: {
            packageId,
            classesLeft: pkg.classCount,
            expiresAt,
            isActive: true,
          },
        })
      } else {
        await tx.subscription.create({
          data: {
            userId,
            packageId,
            classesLeft: pkg.classCount,
            expiresAt,
            isActive: true,
          },
        })
      }
    })

    // Notificar al admin (no bloquea)
    const buyer = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    })

    sendPushToAdmin({
      title: '💳 Nueva compra',
      body: `${buyer?.name ?? userId} compró ${pkg.name} — $${pkg.priceMXN} MXN`,
    }).catch(() => null)

    console.log(`✅ Webhook: pago ${payment.id} aprobado para user ${userId}, paquete ${pkg.name}`)
  } catch (err) {
    console.error('❌ Webhook error:', err)
  }

  res.sendStatus(200)
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
