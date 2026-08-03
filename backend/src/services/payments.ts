/**
 * Conciliación de pagos con MercadoPago.
 *
 * El webhook de MP no siempre llega (reintentos agotados, deploy caído, URL mal
 * configurada). Antes eso dejaba a la alumna pagada y sin paquete, y a nadie se
 * enteraba. Aquí vive la única versión de "este pago de MP ya está aprobado,
 * aplícalo", y la usan por igual el webhook, la app al volver del checkout y el
 * cron que barre los pendientes.
 */

import { prisma } from '../lib/prisma'
import { sendPushToAdmin, sendPushToUser } from './webpush'

export interface MPPayment {
  id: number
  status: string
  status_detail?: string
  transaction_amount: number
  external_reference?: string | null
  metadata?: {
    user_id?: string
    package_id?: string
    userId?: string
    packageId?: string
  }
}

export type ApplyResult = 'APPROVED' | 'PENDING' | 'REJECTED' | 'UNKNOWN'

const MP_API = 'https://api.mercadopago.com'

function mpHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN ?? ''}` }
}

/** Consulta un pago puntual de MP por su id. */
export async function fetchMPPayment(paymentId: string): Promise<MPPayment | null> {
  try {
    const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, { headers: mpHeaders() })
    if (!res.ok) {
      console.error(`[payments] MP ${paymentId} respondió ${res.status}`)
      return null
    }
    return (await res.json()) as MPPayment
  } catch (err) {
    console.error(`[payments] Error consultando MP ${paymentId}:`, err)
    return null
  }
}

/**
 * Busca los pagos de un checkout. Primero por `external_reference` (nuestro id
 * de Payment, que mandamos al crear la preferencia) y si no hay nada, por el id
 * de la preferencia — así también se alcanzan las filas viejas, anteriores a
 * que empezáramos a mandar la referencia.
 */
export async function searchMPPayments(params: {
  externalReference?: string | null
  preferenceId?: string | null
}): Promise<MPPayment[]> {
  const queries: string[] = []
  if (params.externalReference) queries.push(`external_reference=${encodeURIComponent(params.externalReference)}`)
  if (params.preferenceId) queries.push(`preference_id=${encodeURIComponent(params.preferenceId)}`)

  for (const query of queries) {
    try {
      const res = await fetch(`${MP_API}/v1/payments/search?${query}`, { headers: mpHeaders() })
      if (!res.ok) continue

      const body = (await res.json()) as { results?: MPPayment[] }
      const results = body.results ?? []
      if (results.length > 0) return results
    } catch (err) {
      console.error('[payments] Error buscando pagos en MP:', err)
    }
  }

  return []
}

/** De una lista de pagos del mismo checkout, el que manda: aprobado > pendiente > rechazado. */
export function pickRelevantPayment(payments: MPPayment[]): MPPayment | null {
  if (payments.length === 0) return null
  return (
    payments.find((p) => p.status === 'approved') ??
    payments.find((p) => p.status === 'pending' || p.status === 'in_process' || p.status === 'authorized') ??
    payments[0]
  )
}

function isRejected(status: string): boolean {
  return status === 'rejected' || status === 'cancelled' || status === 'refunded' || status === 'charged_back'
}

/**
 * Aplica un pago de MercadoPago: actualiza la fila de Payment y activa el
 * paquete si está aprobado. Idempotente — se puede llamar mil veces con el
 * mismo pago sin duplicar nada ni regalar clases de más.
 */
export async function applyMPPayment(mp: MPPayment): Promise<ApplyResult> {
  const mpPaymentId = mp.id.toString()

  // La fila pendiente que abrió este checkout, si la referencia viene
  const pendingRow = mp.external_reference
    ? await prisma.payment.findUnique({ where: { id: mp.external_reference } })
    : null

  const userId = pendingRow?.userId ?? mp.metadata?.userId ?? mp.metadata?.user_id
  const packageId = pendingRow?.packageId ?? mp.metadata?.packageId ?? mp.metadata?.package_id

  if (!userId || !packageId) {
    console.error(`[payments] Pago ${mpPaymentId} sin usuario o paquete identificable`)
    return 'UNKNOWN'
  }

  // ── Rechazado: se marca y no se toca el paquete ────────────────────────────
  if (isRejected(mp.status)) {
    if (pendingRow && pendingRow.status === 'PENDING') {
      await prisma.payment.update({
        where: { id: pendingRow.id },
        data: { status: 'REJECTED', resolvedAt: new Date(), lastCheckedAt: new Date() },
      })
    }
    return 'REJECTED'
  }

  // ── Todavía no se acredita ─────────────────────────────────────────────────
  if (mp.status !== 'approved') {
    if (pendingRow) {
      await prisma.payment.update({
        where: { id: pendingRow.id },
        data: { lastCheckedAt: new Date() },
      })
    }
    return 'PENDING'
  }

  // ── Aprobado ───────────────────────────────────────────────────────────────
  const pkg = await prisma.package.findUnique({ where: { id: packageId } })
  if (!pkg) {
    console.error(`[payments] Paquete ${packageId} no encontrado para el pago ${mpPaymentId}`)
    return 'UNKNOWN'
  }

  const alreadyApplied = await prisma.payment.findUnique({ where: { mpPaymentId } })
  if (alreadyApplied?.status === 'APPROVED') {
    return 'APPROVED' // ya se procesó antes (webhook + cron pisándose)
  }

  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setDate(now.getDate() + pkg.validDays)

  await prisma.$transaction(async (tx) => {
    if (alreadyApplied) {
      // Ya existía la fila con el id real: solo cambia de estado
      await tx.payment.update({
        where: { id: alreadyApplied.id },
        data: {
          status: 'APPROVED',
          amountMXN: mp.transaction_amount,
          resolvedAt: now,
          lastCheckedAt: now,
        },
      })
      // La pendiente que abrió el checkout queda de sobra
      if (pendingRow && pendingRow.id !== alreadyApplied.id && pendingRow.status === 'PENDING') {
        await tx.payment.delete({ where: { id: pendingRow.id } })
      }
    } else if (pendingRow) {
      // Se reutiliza la fila pendiente: una sola fila por compra
      await tx.payment.update({
        where: { id: pendingRow.id },
        data: {
          mpPaymentId,
          status: 'APPROVED',
          amountMXN: mp.transaction_amount,
          resolvedAt: now,
          lastCheckedAt: now,
        },
      })
    } else {
      await tx.payment.create({
        data: {
          userId,
          packageId,
          amountMXN: mp.transaction_amount,
          mpPaymentId,
          status: 'APPROVED',
          resolvedAt: now,
          lastCheckedAt: now,
        },
      })
    }

    const existingSub = await tx.subscription.findFirst({ where: { userId } })

    if (existingSub) {
      await tx.subscription.update({
        where: { id: existingSub.id },
        data: { packageId, classesLeft: pkg.classCount, expiresAt, isActive: true },
      })
    } else {
      await tx.subscription.create({
        data: { userId, packageId, classesLeft: pkg.classCount, expiresAt, isActive: true },
      })
    }
  })

  const buyer = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })

  sendPushToAdmin({
    title: '💳 Nueva compra',
    body: `${buyer?.name ?? userId} compró ${pkg.name} — $${mp.transaction_amount} MXN`,
  }).catch(() => null)

  console.log(`[payments] ✅ Pago ${mpPaymentId} aplicado a ${userId} — ${pkg.name}`)
  return 'APPROVED'
}

/**
 * Le pregunta a MercadoPago por una fila pendiente y la resuelve.
 * `notifyRecovery` avisa cuando el dinero ya estaba cobrado y el paquete no se
 * había activado: eso es justo el caso que dejaba a la alumna pagando sin clases.
 */
export async function reconcilePayment(
  paymentRowId: string,
  opts: { notifyRecovery?: boolean } = {},
): Promise<ApplyResult> {
  const row = await prisma.payment.findUnique({ where: { id: paymentRowId } })
  if (!row) return 'UNKNOWN'
  if (row.status === 'APPROVED') return 'APPROVED'

  const payments = await searchMPPayments({
    externalReference: row.id,
    preferenceId: row.preferenceId ?? row.mpPaymentId,
  })

  const relevant = pickRelevantPayment(payments)

  if (!relevant) {
    // MP no conoce ningún pago de este checkout: nunca llegó a pagar
    await prisma.payment.update({
      where: { id: row.id },
      data: { lastCheckedAt: new Date() },
    })
    return 'UNKNOWN'
  }

  const result = await applyMPPayment(relevant)

  if (result === 'APPROVED' && opts.notifyRecovery) {
    // El dinero estaba cobrado y el paquete no se había activado
    console.warn(`[payments] ⚠️  Pago recuperado fuera del webhook: ${relevant.id} (fila ${row.id})`)

    sendPushToUser(row.userId, {
      title: '✅ Tu pago se acreditó',
      body: 'Ya tienes tu paquete activo. ¡Puedes reservar tus clases!',
    }).catch(() => null)

    sendPushToAdmin({
      title: '⚠️ Pago recuperado',
      body: 'Un pago cobrado no se había activado y se aplicó solo. Revisa el panel de pagos.',
    }).catch(() => null)
  }

  return result
}
