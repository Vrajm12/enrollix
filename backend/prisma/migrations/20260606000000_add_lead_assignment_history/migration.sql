CREATE TABLE "lead_assignment_logs" (
  "id" TEXT NOT NULL,
  "lead_id" INTEGER NOT NULL,
  "tenant_id" INTEGER NOT NULL,
  "old_assigned_to" INTEGER,
  "new_assigned_to" INTEGER,
  "assigned_by" INTEGER,
  "action_type" TEXT NOT NULL,
  "source_module" TEXT NOT NULL,
  "batch_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_assignment_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lead_assignment_batches" (
  "batch_id" TEXT NOT NULL,
  "tenant_id" INTEGER NOT NULL,
  "assigned_by" INTEGER,
  "assigned_to" INTEGER,
  "lead_count" INTEGER NOT NULL,
  "pincode" TEXT,
  "source" TEXT,
  "start_range" INTEGER NOT NULL,
  "end_range" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_assignment_batches_pkey" PRIMARY KEY ("batch_id")
);

CREATE INDEX "lead_assignment_logs_tenant_id_idx" ON "lead_assignment_logs"("tenant_id");
CREATE INDEX "lead_assignment_logs_lead_id_idx" ON "lead_assignment_logs"("lead_id");
CREATE INDEX "lead_assignment_logs_old_assigned_to_idx" ON "lead_assignment_logs"("old_assigned_to");
CREATE INDEX "lead_assignment_logs_new_assigned_to_idx" ON "lead_assignment_logs"("new_assigned_to");
CREATE INDEX "lead_assignment_logs_assigned_by_idx" ON "lead_assignment_logs"("assigned_by");
CREATE INDEX "lead_assignment_logs_batch_id_idx" ON "lead_assignment_logs"("batch_id");
CREATE INDEX "lead_assignment_logs_created_at_idx" ON "lead_assignment_logs"("created_at");

CREATE INDEX "lead_assignment_batches_tenant_id_idx" ON "lead_assignment_batches"("tenant_id");
CREATE INDEX "lead_assignment_batches_assigned_by_idx" ON "lead_assignment_batches"("assigned_by");
CREATE INDEX "lead_assignment_batches_assigned_to_idx" ON "lead_assignment_batches"("assigned_to");
CREATE INDEX "lead_assignment_batches_created_at_idx" ON "lead_assignment_batches"("created_at");
