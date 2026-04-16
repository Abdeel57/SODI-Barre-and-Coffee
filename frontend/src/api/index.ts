import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useStore } from '../store/useStore'

const BASE_URL = import.meta.env.VITE_API_URL || ''

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request: attach access token ──────────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useStore.getState().accessToken
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response: handle 401 with refresh ────────────────────────────────────────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function processQueue(err: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (err) reject(err)
    else resolve(token!)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    const isUnauthorized = error.response?.status === 401
    const isRefreshRoute = originalRequest?.url?.includes('/auth/refresh')

    if (!isUnauthorized || isRefreshRoute || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`
        }
        return api(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const { data } = await api.post<{ accessToken: string }>('/api/auth/refresh')
      const newToken = data.accessToken

      useStore.getState().setAuth(useStore.getState().user!, newToken)
      processQueue(null, newToken)

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
      }

      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      useStore.getState().logout()
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

// ── Typed API functions ───────────────────────────────────────────────────────
export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  phone?: string
  password: string
}

export const authApi = {
  register: (data: RegisterData) => api.post('/api/auth/register', data),
  login: (data: LoginData) => api.post('/api/auth/login', data),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me'),
}

export const classesApi = {
  getWeek: (date?: string) => api.get('/api/classes/week', { params: { date } }),
}

export const bookingsApi = {
  create: (data: { classId: string; date: string }) =>
    api.post('/api/bookings', data),
  cancel: (id: string) => api.delete(`/api/bookings/${id}`),
  myBookings: (params?: { status?: string; limit?: number; page?: number }) =>
    api.get('/api/bookings/me', { params }),
}

export const packagesApi = {
  list: () => api.get('/api/packages'),
  mySubscription: () => api.get('/api/packages/my-subscription'),
  createPreference: (packageId: string) =>
    api.post('/api/payments/create-preference', { packageId }),
}

export const paymentsApi = {
  history: () => api.get('/api/payments/history'),
  status: (mpPaymentId: string) => api.get(`/api/payments/status/${mpPaymentId}`),
}

export const pushApi = {
  subscribe: (subscription: PushSubscriptionJSON) =>
    api.post('/api/push/subscribe', subscription),
  unsubscribe: () => api.delete('/api/push/unsubscribe'),
}
