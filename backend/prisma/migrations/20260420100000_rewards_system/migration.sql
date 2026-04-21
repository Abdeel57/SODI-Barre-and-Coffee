-- Add totalClassesTaken to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totalClassesTaken" INTEGER NOT NULL DEFAULT 0;

-- Backfill: count ATTENDED bookings for existing users
UPDATE "User" u
SET "totalClassesTaken" = (
  SELECT COUNT(*) FROM "Booking" b
  WHERE b."userId" = u.id AND b.status = 'ATTENDED'
);

-- Create RewardType enum
DO $$ BEGIN
  CREATE TYPE "RewardType" AS ENUM ('CAFE_FREE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create Reward table
CREATE TABLE IF NOT EXISTS "Reward" (
  "id"         TEXT         NOT NULL,
  "userId"     TEXT         NOT NULL,
  "type"       "RewardType" NOT NULL,
  "code"       TEXT         NOT NULL,
  "isRedeemed" BOOLEAN      NOT NULL DEFAULT false,
  "redeemedAt" TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on code
CREATE UNIQUE INDEX IF NOT EXISTS "Reward_code_key" ON "Reward"("code");

-- Foreign key
ALTER TABLE "Reward" DROP CONSTRAINT IF EXISTS "Reward_userId_fkey";
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Auto-generate rewards for existing students who already hit milestones
-- (10 classes → CAFE_FREE), only if they don't already have one
INSERT INTO "Reward" ("id", "userId", "type", "code", "isRedeemed", "createdAt")
SELECT
  gen_random_uuid()::text,
  u.id,
  'CAFE_FREE'::"RewardType",
  gen_random_uuid()::text,
  false,
  NOW()
FROM "User" u
WHERE u."totalClassesTaken" >= 10
  AND u.role = 'STUDENT'
  AND NOT EXISTS (
    SELECT 1 FROM "Reward" r
    WHERE r."userId" = u.id AND r.type = 'CAFE_FREE'
  );
