-- Horario fijo: "quiero esta clase todos los miércoles"
CREATE TABLE IF NOT EXISTS "RecurringBooking" (
    "id"              TEXT NOT NULL,
    "userId"          TEXT NOT NULL,
    "classId"         TEXT NOT NULL,
    "isActive"        BOOLEAN NOT NULL DEFAULT true,
    "startDate"       TIMESTAMP(3) NOT NULL,
    "endDate"         TIMESTAMP(3),
    "lastNotifiedFor" TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt"     TIMESTAMP(3),

    CONSTRAINT "RecurringBooking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RecurringBooking_userId_classId_key"
    ON "RecurringBooking"("userId", "classId");

CREATE INDEX IF NOT EXISTS "RecurringBooking_classId_isActive_idx"
    ON "RecurringBooking"("classId", "isActive");

ALTER TABLE "RecurringBooking"
    DROP CONSTRAINT IF EXISTS "RecurringBooking_userId_fkey";
ALTER TABLE "RecurringBooking"
    ADD CONSTRAINT "RecurringBooking_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecurringBooking"
    DROP CONSTRAINT IF EXISTS "RecurringBooking_classId_fkey";
ALTER TABLE "RecurringBooking"
    ADD CONSTRAINT "RecurringBooking_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reserva generada por un horario fijo (null = reserva manual)
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "recurringId" TEXT;

CREATE INDEX IF NOT EXISTS "Booking_recurringId_idx" ON "Booking"("recurringId");

ALTER TABLE "Booking"
    DROP CONSTRAINT IF EXISTS "Booking_recurringId_fkey";
ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_recurringId_fkey"
    FOREIGN KEY ("recurringId") REFERENCES "RecurringBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
