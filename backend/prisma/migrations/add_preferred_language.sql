-- Add preferred language column to User and AdminUser tables
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferredLanguage" VARCHAR(5) DEFAULT 'es';
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "preferredLanguage" VARCHAR(5) DEFAULT 'es';
