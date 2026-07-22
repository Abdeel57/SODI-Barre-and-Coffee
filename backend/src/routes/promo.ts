import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { auth, optionalAuth } from '../middleware/auth'
import { createError } from '../middleware/errorHandler'
import { FREE_CLASS_CAMPAIGN, isCampaignOpen, REWARD_SOURCE } from '../lib/promo'
import { grantFreeClass, hasClaimedCampaign, countCampaignClaims } from '../services/rewards'
import { sendPushToAdmin, sendPushToUser } from '../services/webpush'

const router = Router()

function campaignInfo(claims: number) {
  const spotsLeft =
    FREE_CLASS_CAMPAIGN.maxClaims === null
      ? null
      : Math.max(0, FREE_CLASS_CAMPAIGN.maxClaims - claims)

  return {
    slug:        FREE_CLASS_CAMPAIGN.slug,
    headline:    FREE_CLASS_CAMPAIGN.headline,
    subhead:     FREE_CLASS_CAMPAIGN.subhead,
    description: FREE_CLASS_CAMPAIGN.description,
    validDays:   FREE_CLASS_CAMPAIGN.validDays,
    endsAt:      FREE_CLASS_CAMPAIGN.endsAt,
    spotsLeft,
    isOpen:      isCampaignOpen() && (spotsLeft === null || spotsLeft > 0),
  }
}

// ─── GET /api/promo/:slug ─────────────────────────────────────────────────────
// Público: la landing del QR necesita mostrarse antes de iniciar sesión.
router.get('/:slug', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.params['slug'] !== FREE_CLASS_CAMPAIGN.slug) {
      return next(createError(404, 'Promoción no encontrada'))
    }

    const claims = await countCampaignClaims()
    const alreadyClaimed = req.user ? await hasClaimedCampaign(req.user.id) : false

    return res.json({ campaign: campaignInfo(claims), alreadyClaimed })
  } catch (err) {
    return next(err)
  }
})

// ─── POST /api/promo/:slug/claim ─────────────────────────────────────────────
router.post('/:slug/claim', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.params['slug'] !== FREE_CLASS_CAMPAIGN.slug) {
      return next(createError(404, 'Promoción no encontrada'))
    }
    if (!isCampaignOpen()) {
      return next(createError(410, 'Esta promoción ya terminó'))
    }

    const userId = req.user!.id

    if (await hasClaimedCampaign(userId)) {
      return next(createError(409, 'Ya reclamaste tu clase de cortesía'))
    }

    // Cupo — se valida al momento del canje, no al mostrar la landing
    const claims = await countCampaignClaims()
    if (FREE_CLASS_CAMPAIGN.maxClaims !== null && claims >= FREE_CLASS_CAMPAIGN.maxClaims) {
      return next(createError(410, 'Se agotaron los lugares de esta promoción'))
    }

    const { reward, bonusClasses } = await grantFreeClass(userId, REWARD_SOURCE.campaign)

    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { name: true },
    })

    sendPushToUser(userId, {
      title: '🎁 Clase de cortesía activada',
      body:  'Ya puedes reservar tu clase gratis desde el horario.',
    }).catch(() => null)

    sendPushToAdmin({
      title: '🎁 Clase gratis reclamada',
      body:  `${user?.name ?? userId} reclamó la promo de inauguración (${claims + 1}${
        FREE_CLASS_CAMPAIGN.maxClaims ? `/${FREE_CLASS_CAMPAIGN.maxClaims}` : ''
      })`,
    }).catch(() => null)

    return res.status(201).json({
      ok: true,
      code: reward.code,
      bonusClasses,
      campaign: campaignInfo(claims + 1),
    })
  } catch (err) {
    return next(err)
  }
})

export default router
