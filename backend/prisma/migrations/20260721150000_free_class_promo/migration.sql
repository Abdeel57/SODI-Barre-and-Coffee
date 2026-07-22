-- Clases de cortesía (promo de inauguración / regalos del staff)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bonusClasses" INTEGER NOT NULL DEFAULT 0;

-- Marca de la reserva que se pagó con una clase de cortesía
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "usedBonus" BOOLEAN NOT NULL DEFAULT false;

-- Nuevo tipo de premio: clase gratis
ALTER TYPE "RewardType" ADD VALUE IF NOT EXISTS 'FREE_CLASS';

-- Origen del premio: MILESTONE | PROMO_INAUGURACION | ADMIN_GIFT
ALTER TABLE "Reward" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'MILESTONE';

CREATE INDEX IF NOT EXISTS "Reward_userId_source_idx" ON "Reward"("userId", "source");
