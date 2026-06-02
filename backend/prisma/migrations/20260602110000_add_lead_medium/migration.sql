ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "medium" TEXT;
CREATE INDEX IF NOT EXISTS "leads_tenant_id_medium_idx" ON "leads"("tenant_id", "medium");
