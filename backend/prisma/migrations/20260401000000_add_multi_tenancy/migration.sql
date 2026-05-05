-- CreateEnum - Add new roles
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'TENANT_ADMIN';

-- CreateTable - Tenants
CREATE TABLE "tenants" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "max_users" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex - Unique slug
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- Insert default tenant for existing data
INSERT INTO "tenants" ("name", "slug", "description", "max_users", "is_active", "created_at", "updated_at")
VALUES ('Default Tenant', 'default-tenant', 'Default tenant for existing data', 100, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable - Users: Add tenant_id
ALTER TABLE "users" ADD COLUMN "tenant_id" INTEGER;

-- Migrate existing users to default tenant
UPDATE "users" SET "tenant_id" = 1 WHERE "tenant_id" IS NULL;

-- Make tenant_id NOT NULL
ALTER TABLE "users" ALTER COLUMN "tenant_id" SET NOT NULL;

-- Add foreign key for users -> tenants
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update unique constraint on users email (now unique per tenant, not globally)
DROP INDEX IF EXISTS "users_email_key";
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_email_key" UNIQUE("tenant_id", "email");

-- Create index on users tenant_id
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- AlterTable - Leads: Add tenant_id
ALTER TABLE "leads" ADD COLUMN "tenant_id" INTEGER;

-- Migrate existing leads to default tenant
UPDATE "leads" SET "tenant_id" = 1 WHERE "tenant_id" IS NULL;

-- Make tenant_id NOT NULL
ALTER TABLE "leads" ALTER COLUMN "tenant_id" SET NOT NULL;

-- Add foreign key for leads -> tenants
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes on leads
CREATE INDEX "leads_tenant_id_idx" ON "leads"("tenant_id");
CREATE INDEX "leads_assigned_to_idx" ON "leads"("assigned_to");

-- AlterTable - Activities: Add tenant_id
ALTER TABLE "activities" ADD COLUMN "tenant_id" INTEGER;

-- Migrate existing activities to default tenant
UPDATE "activities" SET "tenant_id" = 1 WHERE "tenant_id" IS NULL;

-- Make tenant_id NOT NULL
ALTER TABLE "activities" ALTER COLUMN "tenant_id" SET NOT NULL;

-- Add foreign key for activities -> tenants
ALTER TABLE "activities" ADD CONSTRAINT "activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes on activities
CREATE INDEX "activities_tenant_id_idx" ON "activities"("tenant_id");
CREATE INDEX "activities_lead_id_idx" ON "activities"("lead_id");

-- AlterTable - WhatsApp Messages: Add tenant_id
ALTER TABLE "whatsapp_messages" ADD COLUMN "tenant_id" INTEGER;

-- Migrate existing whatsapp messages to default tenant
UPDATE "whatsapp_messages" SET "tenant_id" = 1 WHERE "tenant_id" IS NULL;

-- Make tenant_id NOT NULL
ALTER TABLE "whatsapp_messages" ALTER COLUMN "tenant_id" SET NOT NULL;

-- Add foreign key for whatsapp_messages -> tenants
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes on whatsapp_messages
CREATE INDEX "whatsapp_messages_tenant_id_idx" ON "whatsapp_messages"("tenant_id");

-- AlterTable - SMS Messages: Add tenant_id
ALTER TABLE "sms_messages" ADD COLUMN "tenant_id" INTEGER;

-- Migrate existing SMS messages to default tenant
UPDATE "sms_messages" SET "tenant_id" = 1 WHERE "tenant_id" IS NULL;

-- Make tenant_id NOT NULL
ALTER TABLE "sms_messages" ALTER COLUMN "tenant_id" SET NOT NULL;

-- Add foreign key for sms_messages -> tenants
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes on sms_messages
CREATE INDEX "sms_messages_tenant_id_idx" ON "sms_messages"("tenant_id");

-- AlterTable - Reports: Add tenant_id
ALTER TABLE "reports" ADD COLUMN "tenant_id" INTEGER;

-- Migrate existing reports to default tenant
UPDATE "reports" SET "tenant_id" = 1 WHERE "tenant_id" IS NULL;

-- Make tenant_id NOT NULL
ALTER TABLE "reports" ALTER COLUMN "tenant_id" SET NOT NULL;

-- Add foreign key for reports -> tenants
ALTER TABLE "reports" ADD CONSTRAINT "reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes on reports
CREATE INDEX "reports_tenant_id_idx" ON "reports"("tenant_id");
