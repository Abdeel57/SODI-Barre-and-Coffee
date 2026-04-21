import { prisma } from '../lib/prisma'
import { sendPushToUser, sendPushToAdmin } from './webpush'

// ─── Tier definitions ─────────────────────────────────────────────────────────
export type TierId = 'none' | 'plie' | 'arabesque' | 'attitude' | 'prima'

export interface Tier {
  id:         TierId
  label:      string
  minClasses: number
  maxClasses: number | null
}

export const TIERS: Tier[] = [
  { id: 'none',      label: '—',         minClasses: 0,  maxClasses: 0    },
  { id: 'plie',      label: 'Plié',      minClasses: 1,  maxClasses: 9    },
  { id: 'arabesque', label: 'Arabesque', minClasses: 10, maxClasses: 24   },
  { id: 'attitude',  label: 'Attitude',  minClasses: 25, maxClasses: 49   },
  { id: 'prima',     label: 'Prima',     minClasses: 50, maxClasses: null },
]

export function getTier(totalClasses: number): Tier {
  if (totalClasses >= 50) return TIERS[4]
  if (totalClasses >= 25) return TIERS[3]
  if (totalClasses >= 10) return TIERS[2]
  if (totalClasses >= 1)  return TIERS[1]
  return TIERS[0]
}

// Clases que otorgan una recompensa al alcanzarlas exactamente
const REWARD_MILESTONES: Record<number, 'CAFE_FREE'> = {
  10: 'CAFE_FREE',
}

// ─── Called when a booking is newly marked as ATTENDED ───────────────────────
export async function onClassAttended(userId: string): Promise<void> {
  const user = await prisma.user.update({
    where: { id: userId },
    data:  { totalClassesTaken: { increment: 1 } },
    select: { totalClassesTaken: true, name: true },
  })

  const count = user.totalClassesTaken
  const rewardType = REWARD_MILESTONES[count]

  if (rewardType) {
    // Avoid duplicates
    const existing = await prisma.reward.findFirst({
      where: { userId, type: rewardType },
    })
    if (!existing) {
      await prisma.reward.create({
        data: { userId, type: rewardType },
      })

      // Notify the student
      sendPushToUser(userId, {
        title: '🎉 ¡Premio desbloqueado!',
        body:  '¡Llegaste a 10 clases! Tienes un café gratis esperándote.',
      }).catch(() => null)

      // Notify admin
      sendPushToAdmin({
        title: '☕ Premio generado',
        body:  `${user.name} alcanzó 10 clases y ganó un café gratis.`,
      }).catch(() => null)
    }
  }
}

// ─── Called when a booking is reverted from ATTENDED → CONFIRMED ─────────────
export async function onClassUnattended(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data:  { totalClassesTaken: { decrement: 1 } },
  })
}
