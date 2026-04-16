'use strict'
/**
 * Seed de producción — IDEMPOTENTE.
 * - El admin se garantiza en CADA deploy (upsert por email).
 * - Clases y paquetes solo se insertan si la DB está vacía.
 * - NUNCA elimina datos existentes.
 */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL    || 'admin@estudio.com'
  const adminPass  = process.env.ADMIN_PASSWORD || 'Admin2024#'

  // ─── Admin: siempre garantizado ───────────────────────────────────────────────
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })

  if (existingAdmin) {
    if (existingAdmin.role !== 'ADMIN') {
      await prisma.user.update({ where: { email: adminEmail }, data: { role: 'ADMIN' } })
      console.log(`  ✔ Rol actualizado a ADMIN: ${adminEmail}`)
    } else {
      console.log(`  ✔ Admin ya existe: ${adminEmail}`)
    }
  } else {
    const hash = await bcrypt.hash(adminPass, 12)
    await prisma.user.create({
      data: { name: 'Administrador SODI', email: adminEmail, passwordHash: hash, role: 'ADMIN' },
    })
    console.log(`  ✔ Admin creado: ${adminEmail}`)
  }

  // ─── Coach Sofía Reyes: siempre garantizado ───────────────────────────────────
  const coachEmail = 'coach@sodibarre.com'
  const coachPass  = 'Coach2024#'
  let coachId

  const existingCoach = await prisma.user.findUnique({ where: { email: coachEmail } })
  if (existingCoach) {
    coachId = existingCoach.id
    if (existingCoach.role !== 'COACH') {
      await prisma.user.update({ where: { email: coachEmail }, data: { role: 'COACH' } })
      console.log(`  ✔ Rol actualizado a COACH: ${coachEmail}`)
    } else {
      console.log(`  ✔ Coach ya existe: ${coachEmail}`)
    }
  } else {
    const hash = await bcrypt.hash(coachPass, 12)
    const coach = await prisma.user.create({
      data: { name: 'Sofía Reyes', email: coachEmail, passwordHash: hash, role: 'COACH' },
    })
    coachId = coach.id
    console.log(`  ✔ Coach creada: ${coachEmail}`)
  }

  // Vincular clases de "Sofía Reyes" al coach (solo las que aún no tienen coachId)
  const linkedCount = await prisma.class.updateMany({
    where: { instructor: 'Sofía Reyes', coachId: null },
    data:  { coachId },
  })
  if (linkedCount.count > 0) {
    console.log(`  ✔ ${linkedCount.count} clases vinculadas a Sofía Reyes`)
  }

  // ─── Clases y paquetes: solo si la DB está vacía ──────────────────────────────
  const packageCount = await prisma.package.count()

  if (packageCount > 0) {
    console.log('  ✔ Clases y paquetes ya existen — omitidos.')
    console.log('\n🎉 Seed completado.')
    return
  }

  console.log('🌱 Primera ejecución — insertando clases y paquetes...')

  const classDefs = [
    { name: 'Barre Fundamentals', instructor: 'Sofía Reyes',   dayOfWeek: 1, startTime: '09:00', maxCapacity: 12, coachId },
    { name: 'Barre Fundamentals', instructor: 'Sofía Reyes',   dayOfWeek: 3, startTime: '09:00', maxCapacity: 12, coachId },
    { name: 'Barre Fundamentals', instructor: 'Sofía Reyes',   dayOfWeek: 5, startTime: '09:00', maxCapacity: 12, coachId },
    { name: 'Barre Cardio',       instructor: 'Camila Torres', dayOfWeek: 2, startTime: '07:00', maxCapacity: 10 },
    { name: 'Barre Cardio',       instructor: 'Camila Torres', dayOfWeek: 4, startTime: '07:00', maxCapacity: 10 },
    { name: 'Barre Avanzado',     instructor: 'Sofía Reyes',   dayOfWeek: 6, startTime: '10:00', maxCapacity: 8,  coachId },
  ]

  await Promise.all(
    classDefs.map((c) =>
      prisma.class.create({ data: { ...c, durationMin: 55, isActive: true } })
    )
  )
  console.log(`  ✔ ${classDefs.length} clases creadas`)

  await Promise.all([
    prisma.package.create({ data: { name: '4 Clases',  classCount: 4,    validDays: 30, priceMXN: 680,  isActive: true } }),
    prisma.package.create({ data: { name: '8 Clases',  classCount: 8,    validDays: 45, priceMXN: 1200, isActive: true } }),
    prisma.package.create({ data: { name: 'Ilimitado', classCount: null, validDays: 30, priceMXN: 1800, isActive: true } }),
  ])
  console.log('  ✔ 3 paquetes creados')

  console.log('\n🎉 Seed completado.')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
