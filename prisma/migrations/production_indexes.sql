-- =============================================================================
-- RTR-MRP COMPREHENSIVE DATABASE INDEXES FOR PRODUCTION
-- Run this after Prisma migrations to add optimized indexes
-- =============================================================================

-- =============================================================================
-- PART INDEXES (High-volume table)
-- =============================================================================

-- Primary search and filter indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_part_part_number ON "Part" ("partNumber");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_part_name ON "Part" ("name");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_part_category ON "Part" ("category");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_part_type ON "Part" ("partType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_part_active ON "Part" ("isActive");

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_part_category_active ON "Part" ("category", "isActive");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_part_tenant_number ON "Part" ("tenantId", "partNumber");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_part_tenant_category_active ON "Part" ("tenantId", "category", "isActive");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_part_supplier ON "Part" ("supplierId");

-- Full-text search index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_part_fulltext ON "Part" 
  USING GIN (to_tsvector('english', coalesce("partNumber", '') || ' ' || coalesce("name", '') || ' ' || coalesce("description", '')));

-- =============================================================================
-- INVENTORY INDEXES (High-volume, frequently queried)
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_part ON "Inventory" ("partId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_warehouse ON "Inventory" ("warehouseId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_quantity ON "Inventory" ("quantity");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_location ON "Inventory" ("locationCode");

-- Composite for stock queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_part_warehouse ON "Inventory" ("partId", "warehouseId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_tenant_part ON "Inventory" ("tenantId", "partId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_low_stock ON "Inventory" ("quantity", "minQuantity") WHERE "quantity" <= "minQuantity";

-- =============================================================================
-- WORK ORDER INDEXES (High-volume, complex queries)
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workorder_number ON "WorkOrder" ("woNumber");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workorder_status ON "WorkOrder" ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workorder_priority ON "WorkOrder" ("priority");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workorder_product ON "WorkOrder" ("productId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workorder_start ON "WorkOrder" ("startDate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workorder_due ON "WorkOrder" ("dueDate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workorder_completion ON "WorkOrder" ("completionDate");

-- Composite indexes for dashboard and filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workorder_status_priority ON "WorkOrder" ("status", "priority");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workorder_status_due ON "WorkOrder" ("status", "dueDate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workorder_tenant_status ON "WorkOrder" ("tenantId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workorder_tenant_status_due ON "WorkOrder" ("tenantId", "status", "dueDate");

-- Overdue work orders
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workorder_overdue ON "WorkOrder" ("dueDate", "status") 
  WHERE "status" NOT IN ('COMPLETED', 'CANCELLED', 'CLOSED');

-- =============================================================================
-- SALES ORDER INDEXES
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_salesorder_number ON "SalesOrder" ("orderNumber");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_salesorder_status ON "SalesOrder" ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_salesorder_customer ON "SalesOrder" ("customerId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_salesorder_date ON "SalesOrder" ("orderDate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_salesorder_requested ON "SalesOrder" ("requestedDate");

-- Composite indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_salesorder_status_date ON "SalesOrder" ("status", "orderDate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_salesorder_customer_status ON "SalesOrder" ("customerId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_salesorder_tenant_customer ON "SalesOrder" ("tenantId", "customerId");

-- =============================================================================
-- PURCHASE ORDER INDEXES
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchaseorder_number ON "PurchaseOrder" ("orderNumber");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchaseorder_status ON "PurchaseOrder" ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchaseorder_supplier ON "PurchaseOrder" ("supplierId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchaseorder_date ON "PurchaseOrder" ("orderDate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchaseorder_expected ON "PurchaseOrder" ("expectedDate");

-- Composite indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchaseorder_supplier_status ON "PurchaseOrder" ("supplierId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchaseorder_tenant_supplier ON "PurchaseOrder" ("tenantId", "supplierId");

-- =============================================================================
-- QUALITY RECORD INDEXES
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quality_workorder ON "QualityRecord" ("workOrderId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quality_result ON "QualityRecord" ("result");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quality_date ON "QualityRecord" ("inspectionDate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quality_inspector ON "QualityRecord" ("inspectorId");

-- Composite
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quality_workorder_result ON "QualityRecord" ("workOrderId", "result");

-- =============================================================================
-- CUSTOMER & SUPPLIER INDEXES
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_code ON "Customer" ("code");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_name ON "Customer" ("name");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_active ON "Customer" ("isActive");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_tenant ON "Customer" ("tenantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_code ON "Supplier" ("code");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_name ON "Supplier" ("name");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_active ON "Supplier" ("isActive");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_tenant ON "Supplier" ("tenantId");

-- Full-text search for customers/suppliers
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_fulltext ON "Customer"
  USING GIN (to_tsvector('english', coalesce("code", '') || ' ' || coalesce("name", '') || ' ' || coalesce("contactPerson", '')));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_fulltext ON "Supplier"
  USING GIN (to_tsvector('english', coalesce("code", '') || ' ' || coalesce("name", '') || ' ' || coalesce("contactPerson", '')));

-- =============================================================================
-- MRP INDEXES
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mrprun_date ON "MRPRun" ("runDate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mrprun_status ON "MRPRun" ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mrprun_tenant ON "MRPRun" ("tenantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mrpsuggestion_run ON "MRPSuggestion" ("mrpRunId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mrpsuggestion_part ON "MRPSuggestion" ("partId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mrpsuggestion_type ON "MRPSuggestion" ("suggestionType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mrpsuggestion_status ON "MRPSuggestion" ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mrpsuggestion_due ON "MRPSuggestion" ("dueDate");

-- =============================================================================
-- ACTIVITY LOG INDEXES (Audit trail - very high volume)
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activitylog_user ON "ActivityLog" ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activitylog_action ON "ActivityLog" ("action");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activitylog_resource ON "ActivityLog" ("resourceType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activitylog_resource_id ON "ActivityLog" ("resourceId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activitylog_created ON "ActivityLog" ("createdAt");

-- Composite for audit queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activitylog_tenant_user ON "ActivityLog" ("tenantId", "userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activitylog_tenant_resource ON "ActivityLog" ("tenantId", "resourceType", "resourceId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activitylog_user_created ON "ActivityLog" ("userId", "createdAt" DESC);

-- Partial index for recent logs (last 30 days optimization)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activitylog_recent ON "ActivityLog" ("createdAt" DESC)
  WHERE "createdAt" > (CURRENT_TIMESTAMP - INTERVAL '30 days');

-- =============================================================================
-- BOM INDEXES
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bomline_product ON "BOMLine" ("productId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bomline_part ON "BOMLine" ("partId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bomline_product_part ON "BOMLine" ("productId", "partId");

-- =============================================================================
-- USER INDEXES
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_email ON "User" ("email");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_role ON "User" ("role");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_active ON "User" ("isActive");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_tenant ON "User" ("tenantId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_department ON "User" ("department");

-- =============================================================================
-- WAREHOUSE & LOCATION INDEXES
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_warehouse_code ON "Warehouse" ("code");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_warehouse_active ON "Warehouse" ("isActive");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_warehouse_tenant ON "Warehouse" ("tenantId");

-- =============================================================================
-- MAINTENANCE ORDER INDEXES
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_number ON "MaintenanceOrder" ("orderNumber");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_equipment ON "MaintenanceOrder" ("equipmentId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_status ON "MaintenanceOrder" ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_type ON "MaintenanceOrder" ("type");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_scheduled ON "MaintenanceOrder" ("scheduledDate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_priority ON "MaintenanceOrder" ("priority");

-- =============================================================================
-- ANALYZE TABLES AFTER CREATING INDEXES
-- =============================================================================

ANALYZE "Part";
ANALYZE "Inventory";
ANALYZE "WorkOrder";
ANALYZE "SalesOrder";
ANALYZE "PurchaseOrder";
ANALYZE "QualityRecord";
ANALYZE "Customer";
ANALYZE "Supplier";
ANALYZE "MRPRun";
ANALYZE "MRPSuggestion";
ANALYZE "ActivityLog";
ANALYZE "BOMLine";
ANALYZE "User";
ANALYZE "Warehouse";
ANALYZE "MaintenanceOrder";

-- =============================================================================
-- USEFUL VIEWS FOR MONITORING
-- =============================================================================

-- View: Index usage statistics
CREATE OR REPLACE VIEW v_index_usage AS
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- View: Tables needing vacuum
CREATE OR REPLACE VIEW v_tables_need_vacuum AS
SELECT
    schemaname,
    relname as tablename,
    n_dead_tup as dead_tuples,
    n_live_tup as live_tuples,
    last_vacuum,
    last_autovacuum,
    CASE WHEN n_live_tup > 0 
         THEN round(100.0 * n_dead_tup / n_live_tup, 2) 
         ELSE 0 
    END as dead_ratio_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- View: Slow queries summary
CREATE OR REPLACE VIEW v_slow_queries AS
SELECT
    calls,
    round(total_exec_time::numeric, 2) as total_time_ms,
    round(mean_exec_time::numeric, 2) as avg_time_ms,
    round(max_exec_time::numeric, 2) as max_time_ms,
    rows,
    query
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- Queries averaging over 100ms
ORDER BY mean_exec_time DESC
LIMIT 20;

-- =============================================================================
-- MAINTENANCE FUNCTIONS
-- =============================================================================

-- Function: Rebuild bloated indexes
CREATE OR REPLACE FUNCTION rebuild_bloated_indexes()
RETURNS void AS $$
DECLARE
    idx RECORD;
BEGIN
    FOR idx IN 
        SELECT indexname, tablename
        FROM pg_stat_user_indexes
        WHERE pg_relation_size(indexrelid) > 1024 * 1024 * 100  -- > 100MB
    LOOP
        EXECUTE 'REINDEX INDEX CONCURRENTLY ' || idx.indexname;
        RAISE NOTICE 'Reindexed: %', idx.indexname;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function: Update table statistics
CREATE OR REPLACE FUNCTION update_all_statistics()
RETURNS void AS $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ANALYZE ' || tbl.tablename;
        RAISE NOTICE 'Analyzed: %', tbl.tablename;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PRINT SUMMARY
-- =============================================================================

DO $$
DECLARE
    idx_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO idx_count FROM pg_indexes WHERE schemaname = 'public';
    RAISE NOTICE '✅ Total indexes created: %', idx_count;
END $$;
