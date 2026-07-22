export interface TodayClass {
  classId: string
  name: string
  instructor: string
  startTime: string
  confirmedBookings: number
  maxCapacity: number
  occupancyPercent: number
  students: { id: string; name: string; email: string }[]
}

export interface DashboardData {
  today: {
    date: string
    classes: TodayClass[]
  }
  stats: {
    activeSubscriptions: number
    revenueThisMonth: number
    bookingsThisWeek: number
    totalStudents: number
  }
}

export interface AdminClass {
  id: string
  name: string
  instructor: string
  dayOfWeek: number
  dayLabel: string
  startTime: string
  startDate: string | null // "YYYY-MM-DD" — 1ª fecha en que se imparte
  endDate: string | null   // "YYYY-MM-DD" — última fecha inclusive
  durationMin: number
  maxCapacity: number
  isActive: boolean
  coachId: string | null
  coachName: string | null
  bookingsThisWeek: number
}

export interface CoachUser {
  id: string
  name: string
  email: string
  role: 'COACH' | 'ADMIN'
}

export interface AdminStudent {
  id: string
  name: string
  email: string
  phone: string | null
  role: 'STUDENT' | 'COACH' | 'ADMIN'
  avatar: string | null
  createdAt: string
  totalBookings: number
  totalClassesTaken: number
  /** Clases de cortesía disponibles (promo de inauguración / regalo del staff). */
  bonusClasses: number
  tier: string
  tierLabel: string
  subscription: {
    packageName: string
    classesLeft: number | null
    expiresAt: string
    isActive: boolean
  } | null
}

export interface AdminCoachClass {
  id: string
  name: string
  dayOfWeek: number
  startTime: string
}

export interface AdminCoach {
  id: string
  name: string
  email: string
  phone: string | null
  role: 'COACH'
  avatar: string | null
  createdAt: string
  coachClasses: AdminCoachClass[]
}

export interface DeleteBlockedError {
  reason: 'HAS_PAYMENTS'
  paymentCount: number
}

export interface AdminPayment {
  id: string
  amountMXN: number
  status: string
  createdAt: string
  mpPaymentId: string
  packageName: string | null
  student: { name: string; email: string }
}
