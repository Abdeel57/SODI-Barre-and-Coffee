import { api } from './index'

export const coachApi = {
  getClasses: () => api.get('/api/coach/classes'),

  getAttendance: (classId: string, date: string) =>
    api.get(`/api/coach/classes/${classId}/attendance`, { params: { date } }),

  updateAttendance: (
    classId: string,
    data: { date: string; attendance: { bookingId: string; attended: boolean }[] },
  ) => api.patch(`/api/coach/classes/${classId}/attendance`, data),
}
