DROP INDEX IF EXISTS "leads_city_idx";
DROP INDEX IF EXISTS "leads_region_idx";

ALTER TABLE "tenants"
ALTER COLUMN "course_options" SET DEFAULT '[]'::jsonb;
