/**
 * Vigencia de las clases recurrentes.
 *
 * `Class.startDate` / `Class.endDate` se guardan a medianoche UTC para que
 * representen un día del calendario sin arrastrar la hora ni el huso horario.
 * Todas las comparaciones se hacen sobre strings "YYYY-MM-DD", que ordenan
 * lexicográficamente igual que cronológicamente.
 */

export interface ClassDateRange {
  startDate: Date | null
  endDate: Date | null
}

/** "YYYY-MM-DD" de una fecha de vigencia (guardada a medianoche UTC). */
export function toRangeDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

/** "2026-08-01" → Date a medianoche UTC. Devuelve null si el formato no es válido. */
export function parseRangeDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return isNaN(date.getTime()) ? null : date
}

/** "YYYY-MM-DD" de un día del calendario local (el que usa el horario semanal). */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** ¿La clase se imparte en esa fecha ("YYYY-MM-DD")? Solo valida vigencia, no el día de la semana. */
export function isClassActiveOn(cls: ClassDateRange, dateStr: string): boolean {
  if (cls.startDate && dateStr < toRangeDateString(cls.startDate)) return false
  if (cls.endDate && dateStr > toRangeDateString(cls.endDate)) return false
  return true
}
