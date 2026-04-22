import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Check } from 'lucide-react'
import { format, parseISO, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { coachApi } from '../../api/coach'
import { useStore } from '../../store/useStore'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import type { AttendanceData, AttendanceBooking } from '../../types'

export default function CoachAttendancePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const showToast = useStore((s) => s.showToast)

  const classId = searchParams.get('classId') ?? ''
  const dateParam = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  const [data, setData] = useState<AttendanceData | null>(null)
  const [attended, setAttended] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchAttendance = useCallback(() => {
    if (!classId) return
    setLoading(true)
    coachApi.getAttendance(classId, dateParam)
      .then((r) => {
        const d = r.data as AttendanceData
        setData(d)
        const map: Record<string, boolean> = {}
        d.bookings.forEach((b: AttendanceBooking) => {
          map[b.bookingId] = b.status === 'ATTENDED'
        })
        setAttended(map)
      })
      .catch(() => showToast('Error al cargar la lista', 'error'))
      .finally(() => setLoading(false))
  }, [classId, dateParam, showToast])

  useEffect(() => { fetchAttendance() }, [fetchAttendance])

  function changeDate(delta: number) {
    const d = new Date(dateParam + 'T12:00:00')
    const next = delta > 0 ? addDays(d, 1) : subDays(d, 1)
    setSearchParams({ classId, date: next.toISOString().split('T')[0] })
  }

  async function handleSave() {
    if (!data) return
    setSaving(true)
    try {
      const attendance = data.bookings.map((b) => ({
        bookingId: b.bookingId,
        attended:  attended[b.bookingId] ?? false,
      }))
      await coachApi.updateAttendance(classId, { date: dateParam, attendance })
      showToast('Lista guardada', 'success')
      fetchAttendance()
    } catch {
      showToast('Error al guardar la lista', 'error')
    } finally {
      setSaving(false)
    }
  }

  const dateLabel = (() => {
    try {
      return format(parseISO(dateParam), "EEEE d 'de' MMMM", { locale: es })
    } catch {
      return dateParam
    }
  })()

  return (
    <div className="min-h-screen bg-off-white pb-8 page-enter">
      {/* Header */}
      <header className="px-4 pt-8 pb-2">
        <button
          onClick={() => navigate('/coach/dashboard')}
          className="flex items-center gap-1 text-stone text-xs mb-3 tap-target -ml-1"
        >
          <ChevronLeft size={16} />
          Mis clases
        </button>
        {data ? (
          <>
            <p className="text-section text-stone text-[11px]">LISTA DE ASISTENCIA</p>
            <h1 className="text-hero text-noir mt-0.5">{data.classInfo.name}</h1>
            <p className="text-stone text-xs mt-0.5">{data.classInfo.instructor} · {data.classInfo.startTime}</p>
          </>
        ) : (
          <div className="h-12" />
        )}
      </header>

      {/* Date nav */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-y border-nude-border mb-4">
        <button
          onClick={() => changeDate(-1)}
          className="tap-target p-2 text-stone hover:text-noir transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-label text-noir capitalize text-sm">{dateLabel}</p>
        <button
          onClick={() => changeDate(1)}
          className="tap-target p-2 text-stone hover:text-noir transition-colors rotate-180"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="mx-4 flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-md" />)}
        </div>
      ) : !data || data.bookings.length === 0 ? (
        <div className="mx-4 px-4 py-8 bg-white border border-nude-border rounded-md text-center">
          <p className="text-label text-stone">Sin reservas para esta fecha.</p>
        </div>
      ) : (
        <>
          <div className="mx-4 mb-4 flex flex-col gap-2">
            {data.bookings.map((b) => {
              const isPresent = attended[b.bookingId] ?? false
              return (
                <button
                  key={b.bookingId}
                  onClick={() => setAttended((prev) => ({ ...prev, [b.bookingId]: !prev[b.bookingId] }))}
                  className={`w-full flex items-center gap-3 p-4 rounded-md border transition-colors text-left ${
                    isPresent
                      ? 'bg-noir border-noir text-white'
                      : 'bg-white border-nude-border text-noir'
                  }`}
                >
                  <div className="relative w-8 h-8 shrink-0">
                    <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center border transition-colors ${
                      isPresent ? 'border-white' : 'border-nude-border bg-nude-light'
                    }`}>
                      {b.student.avatar
                        ? <img src={b.student.avatar} alt={b.student.name} className="w-full h-full object-cover" />
                        : <span className="font-display text-[13px] text-nude-dark">{b.student.name.charAt(0).toUpperCase()}</span>
                      }
                    </div>
                    {isPresent && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow">
                        <Check size={9} className="text-noir" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-label font-medium truncate">{b.student.name}</p>
                    <p className={`text-xs truncate ${isPresent ? 'text-white/70' : 'text-stone'}`}>
                      {b.student.email}
                    </p>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wide shrink-0 ${isPresent ? 'text-white/80' : 'text-stone'}`}>
                    {isPresent ? 'Presente' : 'Ausente'}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="px-4">
            <p className="text-stone text-xs text-center mb-3">
              {Object.values(attended).filter(Boolean).length} de {data.bookings.length} presentes
            </p>
            <Button
              variant="primary"
              size="lg"
              loading={saving}
              onClick={handleSave}
              className="w-full"
            >
              Guardar lista
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
