import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { sendPushToUser } from './webpush'

export function startScheduler(): void {
  // ─── Job 1: Recordatorios de clase cada 30 min ──────────────────────────────
  cron.schedule('*/30 * * * *', async () => {
    try {
      const now = new Date()
      const windowStart = new Date(now.getTime() + 110 * 60 * 1000) // +1h50m
      const windowEnd = new Date(now.getTime() + 130 * 60 * 1000)   // +2h10m

      const startOfToday = new Date(now)
      startOfToday.setHours(0, 0, 0, 0)
      const endOfToday = new Date(now)
      endOfToday.setHours(23, 59, 59, 999)

      const bookings = await prisma.booking.findMany({
        where: {
          status: 'CONFIRMED',
          date: { gte: startOfToday, lte: endOfToday },
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

        // Calcular datetime exacto de la clase
        const [hours, minutes] = booking.class.startTime.split(':').map(Number)
        const classDateTime = new Date(booking.date)
        classDateTime.setHours(hours, minutes, 0, 0)

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
  })

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
  })

  console.log('⏱️  Scheduler iniciado (recordatorios cada 30min, vencimientos 8:00 AM)')
}
