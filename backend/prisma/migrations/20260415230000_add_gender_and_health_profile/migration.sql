-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "gender"    "Gender",
ADD COLUMN "birthDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "HealthProfile" (
    "id"                    TEXT NOT NULL,
    "userId"                TEXT NOT NULL,
    "hasSurgeries"          BOOLEAN NOT NULL DEFAULT false,
    "surgeriesDetail"       TEXT,
    "isPregnant"            BOOLEAN NOT NULL DEFAULT false,
    "pregnancyWeeks"        INTEGER,
    "bloodType"             TEXT,
    "emergencyContactName"  TEXT,
    "emergencyContactPhone" TEXT,
    "allergies"             TEXT,
    "injuries"              TEXT,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HealthProfile_userId_key" ON "HealthProfile"("userId");

-- AddForeignKey
ALTER TABLE "HealthProfile" ADD CONSTRAINT "HealthProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
