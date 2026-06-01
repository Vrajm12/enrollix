ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "campaign" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "partner_source" TEXT;
CREATE INDEX IF NOT EXISTS "leads_tenant_id_campaign_idx" ON "leads"("tenant_id", "campaign");
CREATE INDEX IF NOT EXISTS "leads_tenant_id_partner_source_idx" ON "leads"("tenant_id", "partner_source");

CREATE TABLE IF NOT EXISTS "integration_api_keys" (
  "id" SERIAL NOT NULL,
  "tenant_id" INTEGER NOT NULL,
  "partner" TEXT NOT NULL,
  "name" TEXT,
  "api_key_hash" TEXT NOT NULL,
  "api_key_prefix" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "rate_limit_per_min" INTEGER NOT NULL DEFAULT 60,
  "last_used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "integration_api_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "integration_api_keys_partner_api_key_hash_key"
  ON "integration_api_keys"("partner", "api_key_hash");
CREATE INDEX IF NOT EXISTS "integration_api_keys_tenant_id_partner_is_active_idx"
  ON "integration_api_keys"("tenant_id", "partner", "is_active");

ALTER TABLE "integration_api_keys"
  ADD CONSTRAINT "integration_api_keys_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
