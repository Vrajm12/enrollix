ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "region" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "city" TEXT;

CREATE INDEX IF NOT EXISTS "leads_region_idx" ON "leads"("region");
CREATE INDEX IF NOT EXISTS "leads_city_idx" ON "leads"("city");

