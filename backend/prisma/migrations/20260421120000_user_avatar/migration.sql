-- Add avatar field to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatar" TEXT;
