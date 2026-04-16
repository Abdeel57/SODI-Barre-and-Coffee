'use strict'
/**
 * Seed de producción — IDEMPOTENTE.
 * Solo inserta datos si la base de datos está vacía.
 * NUNCA elimina datos existentes.
 */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const packageCount = await prisma.package.count()

  if (packageCount > 0) {
    console.log('✅ La base de datos ya tiene datos — seed omitido.')
    return
  }

  console.log('🌱 Primera ejecución — insertando datos iniciales...')

  // ─── Clases ──────────────────────────────────────────────────────────────────
  const classDefs = [
    { name: 'Barre Fundamentals', instructor: 'Sofía Reyes',   dayOfWeek: 1, startTime: '09:00', maxCapacity: 12 },
    { name: 'Barre Fundamentals', instructor: 'Sofía Reyes',   dayOfWeek: 3, startTime: '09:00', maxCapacity: 12 },
    { name: 'Barre Fundamentals', instructor: 'Sofía Reyes',   dayOfWeek: 5, startTime: '09:00', maxCapacity: 12 },
    { name: 'Barre Cardio',       instructor: 'Camila Torres', dayOfWeek: 2, startTime: '07:00', maxCapacity: 10 },
    { name: 'Barre Cardio',       instructor: 'Camila Torres', dayOfWeek: 4, startTime: '07:00', maxCapacity: 10 },
    { name: 'Barre Avanzado',     instructor: 'Sofía Reyes',   dayOfWeek: 6, startTime: '10:00', maxCapacity: 8  },
  ]

  await Promise.all(
    classDefs.map((c) =>
      prisma.class.create({ data: { ...c, durationMin: 55, isActive: true } })
    )
  )
  console.log(`  ✔ ${classDefs.length} clases creadas`)

  // ─── Paquetes ─────────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.package.create({ data: { name: '4 Clases',  classCount: 4,    validDays: 30, priceMXN: 680,  isActive: true } }),
    prisma.package.create({ data: { name: '8 Clases',  classCount: 8,    validDays: 45, priceMXN: 1200, isActive: true } }),
    prisma.package.create({ data: { name: 'Ilimitado', classCount: null, validDays: 30, priceMXN: 1800, isActive: true } }),
  ])
  console.log('  ✔ 3 paquetes creados')

  // ─── Admin inicial ────────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@estudio.com'
  const adminPass  = process.env.ADMIN_PASSWORD || 'Admin2024#'

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!existing) {
    const hash = await bcrypt.hash(adminPass, 12)
    await prisma.user.create({
      data: {
        name:         'Administrador SODI',
        email:        adminEmail,
        passwordHash: hash,
        role:         'ADMIN',
      },
    })
    console.log(`  ✔ Admin creado: ${adminEmail}`)
  }

  console.log('\n🎉 Seed inicial completado.')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
