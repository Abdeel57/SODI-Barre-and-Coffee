export interface ClassSlot {
  classId: string
  name: string
  instructor: string
  /** Foto de la coach (data URL) — null si no tiene. */
  coachAvatar: string | null
  startTime: string
  durationMin: number
  maxCapacity: number
  availableSpots: number
  isBooked: boolean
  bookingId: string | null
  date: string
}

export interface WeekDay {
  date: string
  dayOfWeek: number
  dayLabel: string
  classes: ClassSlot[]
}

export interface Subscription {
  id: string
  packageId: string
  packageName: string
  classesLeft: number | null
  expiresAt: string
  daysLeft: number
  isActive: boolean
  isExpiringSoon: boolean
}

export interface Promo {
  label: string
  headline: string
  discountPct: number
  originalPriceMXN: number
  priceMXN: number
  savingsMXN: number
  endsAt: string | null
}

export interface Package {
  id: string
  name: string
  description: string | null
  classCount: number | null
  validDays: number
  /** Precio de lista. */
  priceMXN: number
  /** Precio que realmente se cobra hoy (promo aplicada, si hay). */
  finalPriceMXN: number
  promo: Promo | null
  label: string
}

export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'ATTENDED'
export type UserRole    = 'STUDENT' | 'ADMIN' | 'COACH'
export type Gender      = 'FEMALE' | 'MALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'

// ─── Coach ────────────────────────────────────────────────────────────────────
export interface CoachClass {
  id: string
  name: string
  instructor: string
  dayOfWeek: number
  dayLabel: string
  startTime: string
  durationMin: number
  maxCapacity: number
  isToday: boolean
  bookingsThisWeek: number
}

export interface AttendanceBooking {
  bookingId: string
  status: 'CONFIRMED' | 'ATTENDED'
  student: { id: string; name: string; email: string; avatar?: string | null }
}

export interface AttendanceData {
  classInfo: {
    id: string
    name: string
    instructor: string
    startTime: string
    durationMin: number
    date: string
  }
  bookings: AttendanceBooking[]
}

export interface User {
  id:                   string
  name:                 string
  email:                string
  role:                 UserRole
  onboardingCompleted:  boolean
  avatar?:              string | null
  gender?:              Gender | null
  birthDate?:           string | null
}

export interface HealthProfile {
  id:                    string
  userId:                string
  hasSurgeries:          boolean
  surgeriesDetail:       string | null
  isPregnant:            boolean
  pregnancyWeeks:        number | null
  bloodType:             string | null
  emergencyContactName:  string | null
  emergencyContactPhone: string | null
  allergies:             string | null
  injuries:              string | null
}

export interface Booking {
  id: string
  userId: string
  classId: string
  date: string
  status: BookingStatus
  createdAt: string
  class: {
    id: string
    name: string
    instructor: string
    coachAvatar: string | null
    startTime: string
    durationMin: number
  }
}

export interface PaymentHistory {
  id: string
  amountMXN: number
  status: string
  createdAt: string
  packageName: string | null
}

// ─── Tiers ────────────────────────────────────────────────────────────────────
export type TierId = 'none' | 'plie' | 'arabesque' | 'attitude' | 'prima'

export interface TierInfo {
  id:         TierId
  label:      string
  minClasses: number
  maxClasses: number | null
  color:      string       // ring color
  textColor:  string
  bg:         string       // badge background
}

export const TIERS: TierInfo[] = [
  { id: 'none',      label: '—',         minClasses: 0,  maxClasses: 0,    color: 'transparent',  textColor: '#9E9E9E', bg: '#F5F5F5'  },
  { id: 'plie',      label: 'Plié',      minClasses: 1,  maxClasses: 9,    color: '#E8B4B8',      textColor: '#8B5E63', bg: '#FDF0F1'  },
  { id: 'arabesque', label: 'Arabesque', minClasses: 10, maxClasses: 24,   color: '#C9A882',      textColor: '#7A5C3A', bg: '#F2EBE1'  },
  { id: 'attitude',  label: 'Attitude',  minClasses: 25, maxClasses: 49,   color: '#D4AF37',      textColor: '#7A6010', bg: '#FBF5DC'  },
  { id: 'prima',     label: 'Prima',     minClasses: 50, maxClasses: null, color: '#0D0D0D',      textColor: '#FFFFFF', bg: '#0D0D0D'  },
]

export const TIER_ICONS: Record<TierId, string | null> = {
  none:      null,
  plie:      '/tiers/plie.png',
  arabesque: '/tiers/arabesque.png',
  attitude:  '/tiers/attitude.png',
  prima:     '/tiers/prima.png',
}

export function getTierInfo(tierId: TierId): TierInfo {
  return TIERS.find((t) => t.id === tierId) ?? TIERS[0]
}

// ─── Rewards ──────────────────────────────────────────────────────────────────
export type RewardType   = 'CAFE_FREE' | 'FREE_CLASS'
export type RewardSource = 'MILESTONE' | 'PROMO_INAUGURACION' | 'ADMIN_GIFT'

export interface Reward {
  id:         string
  type:       RewardType
  code:       string
  isRedeemed: boolean
  redeemedAt: string | null
  createdAt:  string
  source?:    RewardSource
}

export interface MyRewardsData {
  totalClassesTaken: number
  /** Clases de cortesía disponibles para reservar. */
  bonusClasses:      number
  tier:              TierId
  tierLabel:         string
  rewards:           Reward[]
}

// ─── Promo de clase gratis (QR de inauguración) ───────────────────────────────
export interface PromoCampaign {
  slug:        string
  headline:    string
  subhead:     string
  description: string
  validDays:   number
  endsAt:      string | null
  /** Lugares restantes — null = sin límite. */
  spotsLeft:   number | null
  isOpen:      boolean
}
