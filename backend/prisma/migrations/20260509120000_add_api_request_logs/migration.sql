CREATE TABLE "api_request_logs" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" INTEGER,
  "user_id" INTEGER,
  "method" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "status_code" INTEGER NOT NULL,
  "duration_ms" INTEGER NOT NULL,
  "request_size" INTEGER,
  "response_size" INTEGER,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "api_request_logs_tenant_id_idx" ON "api_request_logs"("tenant_id");
CREATE INDEX "api_request_logs_user_id_idx" ON "api_request_logs"("user_id");
CREATE INDEX "api_request_logs_status_code_idx" ON "api_request_logs"("status_code");
CREATE INDEX "api_request_logs_created_at_idx" ON "api_request_logs"("created_at");
CREATE INDEX "api_request_logs_path_idx" ON "api_request_logs"("path");
