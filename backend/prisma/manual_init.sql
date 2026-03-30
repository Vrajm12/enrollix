-- Manual schema bootstrap for environments where Prisma schema engine is blocked.

DO $$
BEGIN
  CREATE TYPE "Role" AS ENUM ('ADMIN', 'COUNSELOR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "LeadStatus" AS ENUM ('LEAD', 'CONTACTED', 'INTERESTED', 'QUALIFIED', 'APPLIED', 'ENROLLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ActivityType" AS ENUM ('CALL', 'WHATSAPP', 'EMAIL', 'NOTE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "MessageDirection" AS ENUM ('OUTBOUND', 'INBOUND');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "Priority" AS ENUM ('COLD', 'WARM', 'HOT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role "Role" NOT NULL DEFAULT 'COUNSELOR',
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NULL,
  address TEXT NULL,
  parent_contact TEXT NULL,
  course TEXT NULL,
  source TEXT NULL,
  status "LeadStatus" NOT NULL DEFAULT 'LEAD',
  priority "Priority" NOT NULL DEFAULT 'COLD',
  next_follow_up TIMESTAMP(3) NULL,
  assigned_to INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL
);

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS priority "Priority" NOT NULL DEFAULT 'COLD',
  ADD COLUMN IF NOT EXISTS next_follow_up TIMESTAMP(3) NULL;

CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type "ActivityType" NOT NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  next_follow_up TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sent_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  message TEXT NOT NULL,
  status "MessageStatus" NOT NULL DEFAULT 'PENDING',
  direction "MessageDirection" NOT NULL,
  phone_number TEXT NOT NULL,
  message_id TEXT NULL,
  media_url TEXT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS sms_messages (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sent_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  message TEXT NOT NULL,
  status "MessageStatus" NOT NULL DEFAULT 'PENDING',
  direction "MessageDirection" NOT NULL,
  phone_number TEXT NOT NULL,
  message_id TEXT NULL,
  provider TEXT NOT NULL DEFAULT 'twilio',
  cost DOUBLE PRECISION DEFAULT 0,
  error_code TEXT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  generated_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  data JSONB NOT NULL,
  filters JSONB NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users(email);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON activities(lead_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_lead_id_idx ON whatsapp_messages(lead_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_sent_by_idx ON whatsapp_messages(sent_by);
CREATE INDEX IF NOT EXISTS sms_messages_lead_id_idx ON sms_messages(lead_id);
CREATE INDEX IF NOT EXISTS sms_messages_sent_by_idx ON sms_messages(sent_by);
CREATE INDEX IF NOT EXISTS reports_generated_by_idx ON reports(generated_by);
