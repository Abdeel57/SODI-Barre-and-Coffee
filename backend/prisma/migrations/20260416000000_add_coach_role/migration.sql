-- Add COACH value to Role enum
ALTER TYPE "Role" ADD VALUE 'COACH';

-- Add coachId to Class
ALTER TABLE "Class" ADD COLUMN "coachId" TEXT;

ALTER TABLE "Class" ADD CONSTRAINT "Class_coachId_fkey"
  FOREIGN KEY ("coachId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Class_coachId_idx" ON "Class"("coachId");
