import { api } from './index'

export const adminApi = {
  // Dashboard
  getDashboard: () => api.get('/api/admin/dashboard'),

  // Clases
  getClasses: () => api.get('/api/admin/classes'),
  createClass: (data: {
    name: string
    instructor: string
    dayOfWeek: number
    startTime: string
    durationMin: number
    maxCapacity: number
  }) => api.post('/api/admin/classes', data),
  updateClass: (
    id: string,
    data: Partial<{
      name: string
      instructor: string
      dayOfWeek: number
      startTime: string
      durationMin: number
      maxCapacity: number
      isActive: boolean
    }>,
  ) => api.patch(`/api/admin/classes/${id}`, data),
  toggleClass: (id: string, isActive: boolean) =>
    api.patch(`/api/admin/classes/${id}`, { isActive }),

  // Alumnas
  getStudents: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get('/api/admin/students', { params }),
  updateSubscription: (
    id: string,
    data: { packageId?: string; classesLeft?: number | null; expiresAt?: string; isActive?: boolean },
  ) => api.patch(`/api/admin/students/${id}/subscription`, data),
  getPackages: () => api.get('/api/packages'),

  // Pagos
  getPayments: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/api/admin/payments', { params }),

  // Push
  sendPush: (data: { target: 'all' | 'inactive'; title: string; body: string }) =>
    api.post('/api/push/send', data),
}
