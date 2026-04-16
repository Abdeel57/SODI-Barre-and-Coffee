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
  createdAt: string
  totalBookings: number
  subscription: {
    packageName: string
    classesLeft: number | null
    expiresAt: string
    isActive: boolean
  } | null
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
