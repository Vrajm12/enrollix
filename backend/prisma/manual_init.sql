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

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role "Role" NOT NULL DEFAULT 'COUNSELOR',
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  assigned_to INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type "ActivityType" NOT NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  next_follow_up TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON activities(lead_id);
