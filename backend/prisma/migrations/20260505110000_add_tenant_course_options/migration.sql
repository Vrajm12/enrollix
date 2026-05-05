-- Add tenant-specific course options for multi-tenant course dropdowns
ALTER TABLE "tenants"
ADD COLUMN "course_options" JSONB NOT NULL DEFAULT '[]'::jsonb;
