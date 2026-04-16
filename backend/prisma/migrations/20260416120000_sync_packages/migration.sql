-- Add description column to Package (safe if already exists)
ALTER TABLE "Package" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Deactivate all pre-existing packages so they no longer appear in the store,
-- but old Subscription rows that reference them remain valid (no FK violation).
UPDATE "Package" SET "isActive" = false;

-- Upsert the 7 official SODI packages with stable IDs.
-- ON CONFLICT makes this idempotent (safe to run multiple times).
INSERT INTO "Package" ("id", "name", "description", "classCount", "validDays", "priceMXN", "isActive")
VALUES
  ('pkg_prueba',     'Clase de Prueba',     'Tu primera clase en SODI Barre',                          1,  30,  180,  true),
  ('pkg_valoracion', 'Clase de Valoración', 'Para embarazadas, con lesiones o más de 69 años',         1,  30,  150,  true),
  ('pkg_suelta',     'Clase Suelta',         NULL,                                                      1,  30,  200,  true),
  ('pkg_4clases',    '4 Clases',             NULL,                                                      4,  30,  600,  true),
  ('pkg_8clases',    '8 Clases',             NULL,                                                      8,  30,  1000, true),
  ('pkg_12clases',   '12 Clases',            NULL,                                                      12, 30,  1200, true),
  ('pkg_20clases',   '20 Clases',            NULL,                                                      20, 30,  1600, true)
ON CONFLICT ("id") DO UPDATE SET
  "name"        = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "classCount"  = EXCLUDED."classCount",
  "validDays"   = EXCLUDED."validDays",
  "priceMXN"    = EXCLUDED."priceMXN",
  "isActive"    = EXCLUDED."isActive";
