import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { coachApi } from '../../api/coach'
import { useStore } from '../../store/useStore'
import { Skeleton } from '../../components/ui/Skeleton'
import type { CoachClass } from '../../types'

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const DAY_LABELS: Record<number, string> = {
  0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
  4: 'Jueves', 5: 'Viernes', 6: 'Sábado',
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// Returns the ISO date (YYYY-MM-DD) for the next occurrence of a given dayOfWeek
function nextDateForDOW(dow: number): string {
  const today = new Date()
  const todayDOW = today.getDay()
  const diff = (dow - todayDOW + 7) % 7
  const d = new Date(today)
  d.setDate(today.getDate() + diff)
  return d.toISOString().split('T')[0]
}

export default function CoachDashboardPage() {
  const navigate = useNavigate()
  const showToast = useStore((s) => s.showToast)
  const [classes, setClasses] = useState<CoachClass[]>([])
  const [today, setToday] = useState<number>(new Date().getDay())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    coachApi.getClasses()
      .then((r) => {
        const { data, today: todayDOW } = r.data as { data: CoachClass[]; today: number }
        setClasses(data)
        setToday(todayDOW)
      })
      .catch(() => showToast('Error al cargar tus clases', 'error'))
      .finally(() => setLoading(false))
  }, [showToast])

  function goToAttendance(cls: CoachClass) {
    const date = nextDateForDOW(cls.dayOfWeek)
    navigate(`/coach/attendance?classId=${cls.id}&date=${date}`)
  }

  const grouped = DAY_ORDER.reduce<Record<number, CoachClass[]>>((acc, d) => {
    acc[d] = classes.filter((c) => c.dayOfWeek === d)
    return acc
  }, {} as Record<number, CoachClass[]>)

  return (
    <div className="min-h-screen bg-off-white pb-8 page-enter">
      <header className="px-4 pt-8 pb-4">
        <p className="text-section text-stone text-[11px]">COACH</p>
        <h1 className="text-hero text-noir mt-0.5">Mis clases</h1>
      </header>

      {loading ? (
        <div className="mx-4 flex flex-col gap-3 mt-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-md" />)}
        </div>
      ) : classes.length === 0 ? (
        <div className="mx-4 mt-6 px-4 py-8 bg-white border border-nude-border rounded-md text-center">
          <p className="text-label text-stone">No tienes clases asignadas.</p>
          <p className="text-xs text-stone mt-1">Pide al administrador que te asigne clases.</p>
        </div>
      ) : (
        DAY_ORDER.map((d) => {
          const list = grouped[d]
          if (!list || list.length === 0) return null
          return (
            <div key={d}>
              <p className={`text-section text-[11px] px-4 mt-6 mb-2 uppercase ${d === today ? 'text-noir font-semibold' : 'text-stone'}`}>
                {DAY_LABELS[d]}{d === today ? ' — Hoy' : ''}
              </p>
              {list.map((cls) => (
                <div
                  key={cls.id}
                  className={`bg-white border rounded-md mx-4 mb-2 p-4 ${cls.isToday ? 'border-nude shadow-sm' : 'border-nude-border'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-label font-medium text-noir truncate">{cls.name}</p>
                      <p className="text-stone text-xs mt-0.5">
                        {formatTime(cls.startTime)} · {cls.durationMin} min
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-label text-stone text-xs">{cls.bookingsThisWeek} / {cls.maxCapacity}</p>
                      <p className="text-stone text-[10px]">esta semana</p>
                    </div>
                  </div>
                  <button
                    onClick={() => goToAttendance(cls)}
                    className="mt-3 text-label text-noir text-xs border border-nude-border rounded-sm px-3 py-1.5 hover:bg-nude-light transition-colors"
                  >
                    Pasar lista
                  </button>
                </div>
              ))}
            </div>
          )
        })
      )}
    </div>
  )
}
