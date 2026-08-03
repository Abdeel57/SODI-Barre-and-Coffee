-- Amarra el registro pendiente con el pago real de MercadoPago.
-- Sin esto, cada compra dejaba dos filas sueltas (una PENDING con el id de la
-- preferencia y una APPROVED con el id del pago) que nunca se cruzaban.
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "preferenceId"  TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "resolvedAt"    TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "lastCheckedAt" TIMESTAMP(3);

-- Backfill: en las filas pendientes viejas, mpPaymentId guardaba justamente el
-- id de la preferencia. Los ids de pago reales de MP son numéricos, los de
-- preferencia no, así que se distinguen por ahí. Esto las vuelve reconciliables.
UPDATE "Payment"
SET "preferenceId" = "mpPaymentId"
WHERE "status" = 'PENDING'
  AND "preferenceId" IS NULL
  AND "mpPaymentId" !~ '^[0-9]+$';

-- Nullable: Postgres permite varios NULL en un índice único
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_preferenceId_key" ON "Payment"("preferenceId");

CREATE INDEX IF NOT EXISTS "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");
