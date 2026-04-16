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
  classCount: number | null
  validDays: number
  priceMXN: number
  label: string
}

export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'ATTENDED'
export type UserRole = 'STUDENT' | 'ADMIN'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
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
