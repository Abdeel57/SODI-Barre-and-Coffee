import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { BottomSheet } from './ui/BottomSheet'

interface MonthCalendarSheetProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date
  onSelectDate: (date: Date) => void
  hasClasses?: (date: Date) => boolean
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// Returns all cells for a calendar grid (Mon–Sun) including leading/trailing nulls
function getCalendarGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)

  // Monday = 0 … Sunday = 6
  const startPad = (first.getDay() + 6) % 7  // shift so Mon=0
  const endPad   = (7 - ((last.getDate() + startPad) % 7)) % 7

  const cells: (Date | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
  for (let i = 0; i < endPad; i++) cells.push(null)
  return cells
}

export function MonthCalendarSheet({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  hasClasses,
}: MonthCalendarSheetProps) {
  const [viewYear,  setViewYear]  = useState(() => selectedDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(() => selectedDate.getMonth())

  const today = new Date()
  const cells = getCalendarGrid(viewYear, viewMonth)

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  function handleSelect(date: Date) {
    onSelectDate(date)
    onClose()
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={prevMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-nude-light transition-colors tap-target"
          aria-label="Mes anterior"
        >
          <ChevronLeft size={18} strokeWidth={1.5} className="text-stone" />
        </button>

        <h2 className="font-display text-[20px] font-light text-noir">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h2>

        <button
          onClick={nextMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-nude-light transition-colors tap-target"
          aria-label="Mes siguiente"
        >
          <ChevronRight size={18} strokeWidth={1.5} className="text-stone" />
        </button>
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="flex items-center justify-center h-7">
            <span className="text-label text-[10px] uppercase tracking-wider text-stone">{d}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />

          const isSelected  = isSameDay(date, selectedDate)
          const isToday     = isSameDay(date, today)
          const hasDot      = hasClasses ? hasClasses(date) : false

          return (
            <button
              key={date.toISOString()}
              onClick={() => handleSelect(date)}
              className={clsx(
                'tap-target flex flex-col items-center justify-center h-11 rounded-xl transition-colors duration-150',
                isSelected
                  ? 'bg-noir'
                  : isToday
                  ? 'bg-nude-light'
                  : 'hover:bg-nude-light/60',
              )}
            >
              <span
                className={clsx(
                  'text-[15px] leading-none font-body',
                  isSelected ? 'text-white font-medium' :
                  isToday    ? 'text-nude-dark font-medium' :
                  'text-noir',
                )}
              >
                {date.getDate()}
              </span>
              {hasDot && (
                <div
                  className={clsx(
                    'w-1 h-1 rounded-full mt-0.5',
                    isSelected ? 'bg-nude' : 'bg-nude',
                  )}
                />
              )}
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}
