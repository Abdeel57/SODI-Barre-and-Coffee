import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { sendPushToUser } from './webpush'
import { runRecurringBookings } from './recurring'
import { reconcilePayment } from './payments'
import { STUDIO_TZ, studioDateString } from '../lib/studioTime'
import { getClassDateTime, normalizeDate } from './booking'

// Los horarios de abajo son hora del estudio, no del servidor: sin esto el
// aviso "de las 8:00 AM" salía a la 1 de la madrugada en Tijuana.
const CRON_OPTS = { timezone: STUDIO_TZ }

export function startScheduler(): void {
  // ─── Job 1: Recordatorios de clase cada 30 min ──────────────────────────────
  cron.schedule('*/30 * * * *', async () => {
    try {
      const now = new Date()
      const windowStart = new Date(now.getTime() + 110 * 60 * 1000) // +1h50m
      const windowEnd = new Date(now.getTime() + 130 * 60 * 1000)   // +2h10m

      // Hoy y mañana del estudio: una clase de la noche cae en el día UTC
      // siguiente, y con una sola ventana de "hoy" se quedaba sin recordatorio.
      const days = [
        normalizeDate(studioDateString(now)),
        normalizeDate(studioDateString(new Date(now.getTime() + 24 * 60 * 60 * 1000))),
      ]

      const bookings = await prisma.booking.findMany({
        where: {
          status: 'CONFIRMED',
          date: { in: days },
          user: { pushToken: { not: null } },
        },
        include: {
          class: { select: { name: true, startTime: true, dayOfWeek: true } },
          user: { select: { id: true, pushToken: true } },
        },
      })

      let sent = 0

      for (const booking of bookings) {
        // Verificar que el día de la clase coincida con el día del booking
        const bookingDayOfWeek = new Date(booking.date).getDay()
        if (bookingDayOfWeek !== booking.class.dayOfWeek) continue

        const classDateTime = getClassDateTime(new Date(booking.date), booking.class.startTime)

        if (classDateTime >= windowStart && classDateTime <= windowEnd) {
          await sendPushToUser(booking.userId, {
            title: '⏰ Tu clase empieza pronto',
            body: `${booking.class.name} a las ${booking.class.startTime} — ¡Nos vemos!`,
          }).catch(() => null)
          sent++
        }
      }

      if (sent > 0) {
        console.log(`[scheduler] 📣 ${sent} recordatorios de clase enviados`)
      }
    } catch (err) {
      console.error('[scheduler] ❌ Error en job de recordatorios:', err)
    }
  }, CRON_OPTS)

  // ─── Job 2: Alertas de vencimiento diarias a las 8:00 AM ──────────────────
  cron.schedule('0 8 * * *', async () => {
    try {
      const now = new Date()

      const startOfToday = new Date(now)
      startOfToday.setHours(0, 0, 0, 0)

      const threeDaysFromNow = new Date(now)
      threeDaysFromNow.setDate(now.getDate() + 3)
      threeDaysFromNow.setHours(23, 59, 59, 999)

      const subscriptions = await prisma.subscription.findMany({
        where: {
          isActive: true,
          expiresAt: { gte: startOfToday, lte: threeDaysFromNow },
          user: { pushToken: { not: null } },
        },
        include: {
          user: { select: { id: true } },
        },
      })

      let sent = 0

      for (const sub of subscriptions) {
        const daysLeft = Math.ceil(
          (sub.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        )

        await sendPushToUser(sub.userId, {
          title: '📅 Tu paquete está por vencer',
          body: `Te quedan ${daysLeft} día${daysLeft === 1 ? '' : 's'}. ¡Renueva para no perder tus clases!`,
        }).catch(() => null)

        sent++
      }

      if (sent > 0) {
        console.log(`[scheduler] 📅 ${sent} alertas de vencimiento enviadas`)
      }
    } catch (err) {
      console.error('[scheduler] ❌ Error en job de vencimiento:', err)
    }
  }, CRON_OPTS)

  // ─── Job 3: Horarios fijos, diario a las 5:00 AM ──────────────────────────
  // Empuja el horizonte de reservas de las alumnas con horario fijo.
  cron.schedule('0 5 * * *', async () => {
    try {
      const { created, notified } = await runRecurringBookings()
      if (created > 0 || notified > 0) {
        console.log(`[scheduler] 📌 Horarios fijos: ${created} reservas creadas, ${notified} avisos`)
      }
    } catch (err) {
      console.error('[scheduler] ❌ Error en job de horarios fijos:', err)
    }
  }, CRON_OPTS)

  // ─── Job 4: Conciliar pagos pendientes cada 15 min ────────────────────────
  // Red de seguridad por si el webhook de MercadoPago no llegó: sin esto, una
  // alumna podía quedar cobrada y sin paquete hasta que reclamara.
  cron.schedule('*/15 * * * *', async () => {
    try {
      const now = Date.now()
      // Se le da margen al webhook antes de ir a preguntar
      const olderThan = new Date(now - 10 * 60 * 1000)
      // Más allá de una semana ya no vale la pena seguir preguntando
      const notBefore = new Date(now - 7 * 24 * 60 * 60 * 1000)

      const stale = await prisma.payment.findMany({
        where: {
          status: 'PENDING',
          createdAt: { lte: olderThan, gte: notBefore },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true },
      })

      let recovered = 0

      for (const row of stale) {
        const result = await reconcilePayment(row.id, { notifyRecovery: true })
        if (result === 'APPROVED') recovered++
      }

      if (recovered > 0) {
        console.log(`[scheduler] 💳 ${recovered} pago(s) cobrados que no se habían activado — resueltos`)
      }
    } catch (err) {
      console.error('[scheduler] ❌ Error en job de conciliación de pagos:', err)
    }
  }, CRON_OPTS)

  console.log(
    `⏱️  Scheduler iniciado en ${STUDIO_TZ} (recordatorios 30min, vencimientos 8:00 AM, horarios fijos 5:00 AM, pagos cada 15min)`,
  )
}
