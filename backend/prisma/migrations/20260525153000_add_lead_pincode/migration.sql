ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "pincode" TEXT;
CREATE INDEX IF NOT EXISTS "leads_tenant_id_pincode_idx" ON "leads"("tenant_id", "pincode");
