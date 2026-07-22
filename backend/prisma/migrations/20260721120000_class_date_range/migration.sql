-- Vigencia de la clase recurrente: desde qué fecha se imparte y hasta cuándo
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
