/**
 * Hora del estudio.
 *
 * El servidor corre en UTC (Railway), pero las clases pasan en Tijuana. El
 * código tomaba la hora de la clase ("18:00") y la interpretaba como hora del
 * servidor, así que ubicaba cada clase 7 horas antes de lo que realmente es:
 * la de las 6 PM se cerraba a las 10 AM porque el servidor la creía pasada.
 *
 * Aquí se convierte una hora de pared del estudio al instante real, sin
 * depender de la zona en la que corra el proceso.
 */

export const STUDIO_TZ = process.env.STUDIO_TZ ?? 'America/Tijuana'

/** Milisegundos que UTC va adelante de la zona del estudio en ese instante. */
function utcAheadOfStudio(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STUDIO_TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)

  // La hora de pared del estudio, leída como si fuera UTC
  const asIfUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24, // algunas versiones de ICU devuelven 24 para medianoche
    get('minute'),
    get('second'),
  )

  return instant.getTime() - asIfUtc
}

/**
 * Instante real de una hora de pared del estudio.
 * `studioInstant('2026-08-03', '18:00')` → las 6 PM de Tijuana de ese día.
 */
export function studioInstant(dateStr: string, timeStr = '00:00'): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm] = timeStr.split(':').map(Number)

  const guess = Date.UTC(y, m - 1, d, hh, mm, 0, 0)
  // Dos pasadas por si el offset cambia justo ese día (cambio de horario)
  const first = utcAheadOfStudio(new Date(guess))
  const second = utcAheadOfStudio(new Date(guess + first))

  return new Date(guess + second)
}

/** "YYYY-MM-DD" del día del calendario en el que cae ese instante, en el estudio. */
export function studioDateString(instant: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: STUDIO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
}

/** "YYYY-MM-DD" de hoy en el estudio. */
export function studioToday(now: Date = new Date()): string {
  return studioDateString(now)
}
