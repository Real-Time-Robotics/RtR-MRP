-- Sprint 28 TIP-S28-01: Production + Bridge Foundation
-- 6 models, 3 enums, 12+ indexes

-- Enums
CREATE TYPE "DailyPlanStatus" AS ENUM ('DRAFT', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "DataSourceType" AS ENUM ('EXCEL_UPLOAD', 'GSHEET', 'CSV');
CREATE TYPE "SyncTier" AS ENUM ('REALTIME', 'POLL', 'ONDEMAND');

-- DailyProductionPlan
CREATE TABLE "daily_production_plans" (
    "id" TEXT NOT NULL,
    "planNumber" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "workCenterId" TEXT NOT NULL,
    "status" "DailyPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdByUserId" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_production_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "daily_production_plans_planNumber_key" ON "daily_production_plans"("planNumber");
CREATE UNIQUE INDEX "daily_production_plans_date_workCenterId_key" ON "daily_production_plans"("date", "workCenterId");
CREATE INDEX "daily_production_plans_date_idx" ON "daily_production_plans"("date");
CREATE INDEX "daily_production_plans_workCenterId_idx" ON "daily_production_plans"("workCenterId");
CREATE INDEX "daily_production_plans_status_idx" ON "daily_production_plans"("status");

-- DailyProductionPlanLine
CREATE TABLE "daily_production_plan_lines" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "plannedQty" INTEGER NOT NULL,
    "assignedToUserId" TEXT,
    "estimatedStartTime" TEXT,
    "estimatedEndTime" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_production_plan_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "daily_production_plan_lines_planId_sequence_key" ON "daily_production_plan_lines"("planId", "sequence");
CREATE INDEX "daily_production_plan_lines_planId_idx" ON "daily_production_plan_lines"("planId");
CREATE INDEX "daily_production_plan_lines_workOrderId_idx" ON "daily_production_plan_lines"("workOrderId");
CREATE INDEX "daily_production_plan_lines_assignedToUserId_idx" ON "daily_production_plan_lines"("assignedToUserId");

-- ShiftReport
CREATE TABLE "shift_reports" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "shiftId" TEXT NOT NULL,
    "workCenterId" TEXT,
    "totalOutput" INTEGER NOT NULL DEFAULT 0,
    "totalScrap" INTEGER NOT NULL DEFAULT 0,
    "scrapRate" DOUBLE PRECISION,
    "totalLaborMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDowntimeMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "headcountPlanned" INTEGER NOT NULL DEFAULT 0,
    "headcountActual" INTEGER NOT NULL DEFAULT 0,
    "laborEntryIds" JSONB,
    "downtimeRecordIds" JSONB,
    "productionReceiptIds" JSONB,
    "workOrderIds" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shift_reports_date_shiftId_workCenterId_key" ON "shift_reports"("date", "shiftId", "workCenterId");
CREATE INDEX "shift_reports_date_idx" ON "shift_reports"("date");
CREATE INDEX "shift_reports_shiftId_date_idx" ON "shift_reports"("shiftId", "date");
CREATE INDEX "shift_reports_workCenterId_date_idx" ON "shift_reports"("workCenterId", "date");

-- DataSource
CREATE TABLE "data_sources" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "DataSourceType" NOT NULL DEFAULT 'EXCEL_UPLOAD',
    "ownerDept" TEXT,
    "url" TEXT,
    "fileId" TEXT,
    "syncTier" "SyncTier" NOT NULL DEFAULT 'ONDEMAND',
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "data_sources_code_key" ON "data_sources"("code");
CREATE INDEX "data_sources_type_idx" ON "data_sources"("type");
CREATE INDEX "data_sources_status_idx" ON "data_sources"("status");

-- MappingRule
CREATE TABLE "mapping_rules" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "targetEntity" TEXT NOT NULL,
    "columnMappings" JSONB NOT NULL,
    "authorityFields" JSONB,
    "validations" JSONB,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mapping_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mapping_rules_sourceId_version_key" ON "mapping_rules"("sourceId", "version");
CREATE INDEX "mapping_rules_sourceId_isActive_idx" ON "mapping_rules"("sourceId", "isActive");

-- SyncJob
CREATE TABLE "sync_jobs" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "mappingVersion" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rowsRead" INTEGER NOT NULL DEFAULT 0,
    "rowsCreated" INTEGER NOT NULL DEFAULT 0,
    "rowsUpdated" INTEGER NOT NULL DEFAULT 0,
    "rowsConflict" INTEGER NOT NULL DEFAULT 0,
    "rowsError" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "triggeredByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sync_jobs_sourceId_status_idx" ON "sync_jobs"("sourceId", "status");
CREATE INDEX "sync_jobs_status_idx" ON "sync_jobs"("status");
CREATE INDEX "sync_jobs_createdAt_idx" ON "sync_jobs"("createdAt");

-- Foreign Keys
ALTER TABLE "daily_production_plans" ADD CONSTRAINT "daily_production_plans_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "daily_production_plans" ADD CONSTRAINT "daily_production_plans_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "daily_production_plans" ADD CONSTRAINT "daily_production_plans_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "daily_production_plan_lines" ADD CONSTRAINT "daily_production_plan_lines_planId_fkey" FOREIGN KEY ("planId") REFERENCES "daily_production_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_production_plan_lines" ADD CONSTRAINT "daily_production_plan_lines_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_production_plan_lines" ADD CONSTRAINT "daily_production_plan_lines_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "shift_reports" ADD CONSTRAINT "shift_reports_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shift_reports" ADD CONSTRAINT "shift_reports_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shift_reports" ADD CONSTRAINT "shift_reports_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "mapping_rules" ADD CONSTRAINT "mapping_rules_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "data_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mapping_rules" ADD CONSTRAINT "mapping_rules_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "data_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
