// ─── Promoción de inauguración ────────────────────────────────────────────────
// Fuente de verdad del descuento. El backend calcula SIEMPRE el precio final:
// el frontend solo lo muestra, y MercadoPago cobra exactamente este monto.
//
// Para terminar la promo: `active: false` (o poner una fecha en `endsAt`).

export const PROMO = {
  active: true,
  /** Descuento en porcentaje sobre el precio de lista. */
  discountPct: 30,
  /** Texto corto para badges/pills. */
  label: 'Inauguración',
  /** Titular del banner. */
  headline: 'Promo de inauguración',
  /** Fecha de fin (ISO) — `null` = hasta nuevo aviso. */
  endsAt: null as string | null,
} as const

/** ¿La promo está vigente ahora mismo? */
export function isPromoActive(now: Date = new Date()): boolean {
  if (!PROMO.active) return false
  if (PROMO.endsAt && now >= new Date(PROMO.endsAt)) return false
  return true
}

/**
 * Precio con descuento, redondeado hacia abajo al múltiplo de $5 más cercano.
 * Redondear hacia abajo garantiza que el descuento real nunca sea menor
 * al 30% anunciado (ej. 180 → 125 = -30.5%).
 */
export function promoPrice(priceMXN: number): number {
  if (!isPromoActive()) return priceMXN
  const discounted = priceMXN * (1 - PROMO.discountPct / 100)
  return Math.max(1, Math.floor(discounted / 5) * 5)
}

// ─── Campaña de clase gratis (QR de inauguración) ─────────────────────────────
// Un QR público apunta a `${FRONTEND_URL}/promo/<slug>`. Quien lo escanea entra
// con su cuenta y reclama 1 clase de cortesía — una sola vez por cuenta.

export const FREE_CLASS_CAMPAIGN = {
  active: true,
  /** Va en la URL del QR: /promo/inauguracion */
  slug: 'inauguracion',
  headline: 'Tu primera clase va por nuestra cuenta',
  subhead: 'Promo de inauguración',
  description:
    'Escaneaste el código de SODI Barre & Coffee. Reclama una clase de cortesía y resérvala cuando quieras desde la app.',
  /** Cupo total de la campaña. `null` = sin límite. */
  maxClaims: 100 as number | null,
  /** Días de vigencia de la cortesía una vez reclamada (informativo). */
  validDays: 30,
  /** Fecha límite para reclamar (ISO) — `null` = hasta agotar cupo. */
  endsAt: null as string | null,
} as const

export function isCampaignOpen(now: Date = new Date()): boolean {
  if (!FREE_CLASS_CAMPAIGN.active) return false
  if (FREE_CLASS_CAMPAIGN.endsAt && now >= new Date(FREE_CLASS_CAMPAIGN.endsAt)) return false
  return true
}

/** Origen que se guarda en `Reward.source`. */
export const REWARD_SOURCE = {
  milestone: 'MILESTONE',
  campaign: 'PROMO_INAUGURACION',
  gift: 'ADMIN_GIFT',
} as const

/** Bloque de promo que se adjunta a cada paquete en la API. */
export function promoPayload(priceMXN: number) {
  if (!isPromoActive()) return null
  const finalPrice = promoPrice(priceMXN)
  if (finalPrice >= priceMXN) return null

  return {
    label: PROMO.label,
    headline: PROMO.headline,
    discountPct: PROMO.discountPct,
    originalPriceMXN: priceMXN,
    priceMXN: finalPrice,
    savingsMXN: priceMXN - finalPrice,
    endsAt: PROMO.endsAt,
  }
}
