export interface ClassSlot {
  classId: string
  name: string
  instructor: string
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

export interface Package {
  id: string
  name: string
  description: string | null
  classCount: number | null
  validDays: number
  priceMXN: number
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
  student: { id: string; name: string; email: string }
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
