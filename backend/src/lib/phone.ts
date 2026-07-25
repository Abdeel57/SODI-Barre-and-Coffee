/**
 * Utilidades de teléfono para permitir que una alumna entre a la app con su
 * número en vez de su correo (muchas no manejan email).
 */

/**
 * Deja el número en 10 dígitos nacionales, ignorando lada de país y formato.
 * "+52 664 123 4567" · "521-664-123-4567" · "6641234567" → "6641234567"
 * Devuelve null si no alcanza a ser un teléfono válido.
 */
export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 10) return null
  return digits.slice(-10)
}

/** true si el texto parece un correo y no un teléfono. */
export function looksLikeEmail(value: string): boolean {
  return value.includes('@')
}

/**
 * Correo interno para alumnas que no tienen uno. Nunca se le manda mail:
 * solo existe porque User.email es único y obligatorio en el esquema.
 */
export function internalEmailForPhone(normalizedPhone: string): string {
  return `${normalizedPhone}@sodi.local`
}

/** true si el correo fue generado por nosotros y no es de la alumna. */
export function isInternalEmail(email: string): boolean {
  return email.endsWith('@sodi.local')
}
