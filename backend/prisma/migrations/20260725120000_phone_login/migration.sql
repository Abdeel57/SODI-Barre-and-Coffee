-- Teléfono normalizado (10 dígitos) para iniciar sesión con el número
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneNormalized" TEXT;

-- Backfill: últimos 10 dígitos de los teléfonos ya capturados
UPDATE "User"
SET "phoneNormalized" = RIGHT(REGEXP_REPLACE("phone", '\D', '', 'g'), 10)
WHERE "phone" IS NOT NULL
  AND "phoneNormalized" IS NULL
  AND LENGTH(REGEXP_REPLACE("phone", '\D', '', 'g')) >= 10;

-- Índice no único a propósito: si el histórico trae números repetidos el deploy
-- no debe romperse. La unicidad se valida al crear la cuenta.
CREATE INDEX IF NOT EXISTS "User_phoneNormalized_idx" ON "User"("phoneNormalized");
