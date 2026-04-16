import { clsx } from 'clsx'

interface WeekCalendarProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  hasClasses?: (date: Date) => boolean
}

const SHORT_DAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']

function getWeekDays(base: Date): Date[] {
  const day = base.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(base)
  monday.setDate(base.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function WeekCalendar({ selectedDate, onSelectDate, hasClasses }: WeekCalendarProps) {
  const today = new Date()
  const week = getWeekDays(selectedDate)

  return (
    <div className="liquid-glass rounded-xl px-2 py-3">
      <div className="flex overflow-x-auto no-scrollbar gap-1">
        {week.map((day) => {
          const isSelected = isSameDay(day, selectedDate)
          const isToday = isSameDay(day, today)
          const dow = day.getDay()
          const showDot = hasClasses ? hasClasses(day) : dow !== 0

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={clsx(
                'tap-target flex flex-col items-center justify-center',
                'min-w-[44px] h-14 rounded-[10px] flex-1',
                'transition-colors duration-150',
                isSelected ? 'bg-noir' : 'hover:bg-nude-light',
              )}
            >
              <span
                className={clsx(
                  'text-label text-[9px] uppercase tracking-wider mb-0.5',
                  isSelected ? 'text-nude' : 'text-stone',
                )}
              >
                {SHORT_DAYS[dow]}
              </span>
              <span
                className={clsx(
                  'text-title text-[20px] leading-none',
                  isSelected ? 'text-white' : isToday ? 'text-nude' : 'text-noir',
                )}
              >
                {day.getDate()}
              </span>
              {showDot && (
                <div
                  className={clsx(
                    'w-1 h-1 rounded-full mt-1',
                    isSelected ? 'bg-nude' : 'bg-nude',
                  )}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
