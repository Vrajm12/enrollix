ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "locality" TEXT;
CREATE INDEX IF NOT EXISTS "leads_tenant_id_locality_idx" ON "leads"("tenant_id", "locality");
