import webpush from 'web-push'
import { prisma } from '../lib/prisma'

let vapidConfigured = false

function initVapid(): void {
  // VAPID_PUBLIC_KEY y VITE_VAPID_KEY son la misma clave pública — aceptamos cualquiera
  const publicKey  = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const email      = process.env.VAPID_EMAIL

  if (!publicKey)  console.warn('⚠️  Falta VAPID_PUBLIC_KEY (o VITE_VAPID_KEY)')
  if (!privateKey) console.warn('⚠️  Falta VAPID_PRIVATE_KEY')
  if (!email)      console.warn('⚠️  Falta VAPID_EMAIL')

  if (publicKey && privateKey && email) {
    try {
      webpush.setVapidDetails(email, publicKey, privateKey)
      vapidConfigured = true
      console.log('✅ VAPID configurado')
    } catch (err) {
      console.error('❌ Error al configurar VAPID (clave inválida):', err)
    }
  } else {
    console.warn('⚠️  VAPID keys no configuradas — push notifications desactivadas')
  }
}

initVapid()

interface PushPayload {
  title: string
  body: string
  data?: Record<string, unknown>
}

async function sendPush(pushToken: string, userId: string, payload: PushPayload): Promise<void> {
  if (!vapidConfigured) return

  try {
    const subscription = JSON.parse(pushToken) as webpush.PushSubscription
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
      }),
    )
  } catch (err: unknown) {
    const error = err as { statusCode?: number }
    // Token expirado, inválido o VAPID mismatch — eliminar de DB
    if (error.statusCode === 410 || error.statusCode === 404 || error.statusCode === 403) {
      await prisma.user.update({
        where: { id: userId },
        data: { pushToken: null },
      }).catch(() => null)
    }
  }
}

export async function sendPushToAdmin(payload: PushPayload): Promise<void> {
  if (!vapidConfigured) return

  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', pushToken: { not: null } },
    select: { id: true, pushToken: true },
  })

  await Promise.allSettled(
    admins
      .filter((a): a is { id: string; pushToken: string } => a.pushToken !== null)
      .map((a) => sendPush(a.pushToken, a.id, payload)),
  )
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!vapidConfigured) return

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushToken: true },
  })

  if (!user?.pushToken) return

  await sendPush(user.pushToken, userId, payload)
}
