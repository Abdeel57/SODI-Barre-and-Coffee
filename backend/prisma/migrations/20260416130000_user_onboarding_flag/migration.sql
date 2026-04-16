-- Add onboardingCompleted to User
-- Default false so existing users don't see the tutorial on next login.
-- New users get false on creation, becomes true once they finish the tutorial.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
