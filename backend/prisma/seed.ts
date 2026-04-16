import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Limpiar tablas en orden correcto
  await prisma.booking.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.user.deleteMany()
  await prisma.class.deleteMany()
  await prisma.package.deleteMany()

  // ─── Clases ────────────────────────────────────────────────────────────────
  const classDefs = [
    // Barre Fundamentals: Lun(1), Mié(3), Vie(5)
    { name: 'Barre Fundamentals', instructor: 'Sofía Reyes', dayOfWeek: 1, startTime: '09:00', maxCapacity: 12 },
    { name: 'Barre Fundamentals', instructor: 'Sofía Reyes', dayOfWeek: 3, startTime: '09:00', maxCapacity: 12 },
    { name: 'Barre Fundamentals', instructor: 'Sofía Reyes', dayOfWeek: 5, startTime: '09:00', maxCapacity: 12 },
    // Barre Cardio: Mar(2), Jue(4)
    { name: 'Barre Cardio', instructor: 'Camila Torres', dayOfWeek: 2, startTime: '07:00', maxCapacity: 10 },
    { name: 'Barre Cardio', instructor: 'Camila Torres', dayOfWeek: 4, startTime: '07:00', maxCapacity: 10 },
    // Barre Avanzado: Sáb(6)
    { name: 'Barre Avanzado', instructor: 'Sofía Reyes', dayOfWeek: 6, startTime: '10:00', maxCapacity: 8 },
  ]

  const classes = await Promise.all(
    classDefs.map((c) =>
      prisma.class.create({
        data: { ...c, durationMin: 55, isActive: true },
      }),
    ),
  )
  console.log(`✅ ${classes.length} clases creadas`)

  // ─── Paquetes ──────────────────────────────────────────────────────────────
  const packages = await Promise.all([
    prisma.package.create({
      data: { name: '4 Clases', classCount: 4, validDays: 30, priceMXN: 680, isActive: true },
    }),
    prisma.package.create({
      data: { name: '8 Clases', classCount: 8, validDays: 45, priceMXN: 1200, isActive: true },
    }),
    prisma.package.create({
      data: { name: 'Ilimitado', classCount: null, validDays: 30, priceMXN: 1800, isActive: true },
    }),
  ])
  console.log(`✅ ${packages.length} paquetes creados`)

  // ─── Usuarios ──────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin2024#', 12)
  const admin = await prisma.user.create({
    data: {
      name: 'Administrador SODI',
      email: 'admin@estudio.com',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  })

  const studentHash = await bcrypt.hash('Test2024#', 12)
  const student = await prisma.user.create({
    data: {
      name: 'Alumna Test',
      email: 'alumna@test.com',
      passwordHash: studentHash,
      role: Role.STUDENT,
    },
  })
  console.log(`✅ 2 usuarios creados (admin: ${admin.email}, alumna: ${student.email})`)

  // ─── Suscripción para la alumna ────────────────────────────────────────────
  const packageDe4 = packages[0]
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  await prisma.subscription.create({
    data: {
      userId: student.id,
      packageId: packageDe4.id,
      classesLeft: 3,
      expiresAt,
      isActive: true,
    },
  })
  console.log(`✅ Suscripción activa creada para ${student.email} (3 clases restantes)`)

  console.log('\n🎉 Seed completado exitosamente')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
