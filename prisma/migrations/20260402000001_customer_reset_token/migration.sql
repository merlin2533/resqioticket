-- AlterTable Customer: add password reset fields
ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "resetToken"       TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP(3);
