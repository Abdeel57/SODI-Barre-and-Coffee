import { prisma } from './prisma'

const DIACRITICS = /[̀-ͯ]/g

/** Nombre comparable: sin acentos, sin espacios extra, minusculas. */
function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/**
 * Mapa nombre-normalizado → foto de las coaches que tienen una.
 * Sirve de respaldo para clases donde `instructor` es texto libre y no se
 * asignó `coachId`.
 */
export async function getCoachAvatarsByName(): Promise<Map<string, string>> {
  const coaches = await prisma.user.findMany({
    where: { role: 'COACH', avatar: { not: null } },
    select: { name: true, avatar: true },
  })

  const map = new Map<string, string>()
  for (const c of coaches) {
    if (c.avatar) map.set(normalizeName(c.name), c.avatar)
  }
  return map
}

/** Foto de la coach de una clase: relación `coach` primero, nombre como respaldo. */
export function resolveCoachAvatar(
  cls: { instructor: string; coach?: { avatar: string | null } | null },
  avatarsByName: Map<string, string>,
): string | null {
  return cls.coach?.avatar ?? avatarsByName.get(normalizeName(cls.instructor)) ?? null
}
