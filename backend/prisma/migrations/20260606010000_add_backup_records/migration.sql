CREATE TYPE "BackupStatus" AS ENUM ('CREATED', 'FAILED', 'RESTORED', 'RESTORE_FAILED', 'DELETED');

CREATE TABLE "backup_records" (
  "id" SERIAL NOT NULL,
  "filename" TEXT NOT NULL,
  "file_path" TEXT NOT NULL,
  "file_size" BIGINT NOT NULL DEFAULT 0,
  "status" "BackupStatus" NOT NULL,
  "created_by_user_id" INTEGER,
  "restored_by_user_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "restored_at" TIMESTAMP(3),
  "notes" TEXT,
  "checksum" TEXT,
  CONSTRAINT "backup_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "backup_records_status_idx" ON "backup_records"("status");
CREATE INDEX "backup_records_created_at_idx" ON "backup_records"("created_at");
CREATE INDEX "backup_records_created_by_user_id_idx" ON "backup_records"("created_by_user_id");
CREATE INDEX "backup_records_restored_by_user_id_idx" ON "backup_records"("restored_by_user_id");
