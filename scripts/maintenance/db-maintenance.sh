#!/bin/bash
# =============================================================================
# RTR-MRP - DATABASE MAINTENANCE SCRIPT
# Run periodically to optimize database performance
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-rtr_mrp}"
DB_USER="${DB_USER:-postgres}"

PSQL="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"

# =============================================================================
# FUNCTIONS
# =============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}=============================================${NC}"
    echo ""
}

check_connection() {
    print_header "Checking Database Connection"
    
    if $PSQL -c "SELECT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Database connection successful${NC}"
        return 0
    else
        echo -e "${RED}✗ Cannot connect to database${NC}"
        return 1
    fi
}

analyze_tables() {
    print_header "Analyzing Tables"
    
    $PSQL << 'EOF'
DO $$
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
END $$;
EOF
    
    echo -e "${GREEN}✓ All tables analyzed${NC}"
}

vacuum_tables() {
    print_header "Vacuuming Tables"
    
    $PSQL << 'EOF'
-- Show tables that need vacuuming
SELECT 
    schemaname,
    relname as tablename,
    n_dead_tup as dead_tuples,
    n_live_tup as live_tuples,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC
LIMIT 10;
EOF

    echo ""
    echo "Running VACUUM ANALYZE..."
    
    $PSQL -c "VACUUM ANALYZE;"
    
    echo -e "${GREEN}✓ Vacuum completed${NC}"
}

check_indexes() {
    print_header "Checking Index Health"
    
    echo "Unused indexes (consider dropping):"
    $PSQL << 'EOF'
SELECT
    schemaname || '.' || relname as table,
    indexrelname as index,
    idx_scan as scans,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
  AND indexrelname NOT LIKE '%_unique'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;
EOF

    echo ""
    echo "Most used indexes:"
    $PSQL << 'EOF'
SELECT
    schemaname || '.' || relname as table,
    indexrelname as index,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC
LIMIT 10;
EOF
    
    echo -e "${GREEN}✓ Index check completed${NC}"
}

check_bloat() {
    print_header "Checking Table Bloat"
    
    $PSQL << 'EOF'
SELECT
    schemaname || '.' || relname as table,
    pg_size_pretty(pg_relation_size(relid)) as size,
    n_dead_tup as dead_rows,
    n_live_tup as live_rows,
    CASE WHEN n_live_tup > 0 
         THEN round(100.0 * n_dead_tup / n_live_tup, 2) 
         ELSE 0 
    END as bloat_ratio
FROM pg_stat_user_tables
WHERE pg_relation_size(relid) > 1024 * 1024  -- > 1MB
ORDER BY n_dead_tup DESC
LIMIT 10;
EOF
    
    echo -e "${GREEN}✓ Bloat check completed${NC}"
}

check_long_queries() {
    print_header "Checking Long Running Queries"
    
    $PSQL << 'EOF'
SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  AND state != 'idle'
ORDER BY duration DESC;
EOF
    
    echo -e "${GREEN}✓ Long query check completed${NC}"
}

check_connections() {
    print_header "Checking Connections"
    
    $PSQL << 'EOF'
SELECT
    state,
    count(*) as connections,
    round(100.0 * count(*) / (SELECT count(*) FROM pg_stat_activity), 2) as percentage
FROM pg_stat_activity
GROUP BY state
ORDER BY connections DESC;
EOF

    echo ""
    echo "Connection summary:"
    $PSQL << 'EOF'
SELECT
    (SELECT count(*) FROM pg_stat_activity) as total_connections,
    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
    round(100.0 * (SELECT count(*) FROM pg_stat_activity) / 
                  (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'), 2) as usage_percent;
EOF
    
    echo -e "${GREEN}✓ Connection check completed${NC}"
}

reindex_bloated() {
    print_header "Reindexing Bloated Indexes"
    
    $PSQL << 'EOF'
DO $$
DECLARE
    idx RECORD;
    bloat_threshold BIGINT := 100 * 1024 * 1024; -- 100MB
BEGIN
    FOR idx IN 
        SELECT indexname, tablename
        FROM pg_stat_user_indexes
        WHERE pg_relation_size(indexrelid) > bloat_threshold
    LOOP
        RAISE NOTICE 'Reindexing: %', idx.indexname;
        EXECUTE 'REINDEX INDEX CONCURRENTLY ' || idx.indexname;
    END LOOP;
END $$;
EOF
    
    echo -e "${GREEN}✓ Reindex completed${NC}"
}

generate_report() {
    print_header "Generating Maintenance Report"
    
    REPORT_FILE="maintenance_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "RTR-MRP Database Maintenance Report"
        echo "Generated: $(date)"
        echo "Database: $DB_NAME @ $DB_HOST"
        echo ""
        echo "============================================"
        echo ""
        
        echo "DATABASE SIZE:"
        $PSQL -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));"
        
        echo ""
        echo "TOP 10 LARGEST TABLES:"
        $PSQL << 'EOF'
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname || '.' || tablename)) as index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
LIMIT 10;
EOF
        
        echo ""
        echo "INDEX COUNT:"
        $PSQL -t -c "SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';"
        
    } > "$REPORT_FILE"
    
    echo -e "${GREEN}✓ Report generated: $REPORT_FILE${NC}"
}

usage() {
    echo "RTR-MRP Database Maintenance Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  check       Check database health"
    echo "  analyze     Analyze all tables"
    echo "  vacuum      Vacuum all tables"
    echo "  indexes     Check index health"
    echo "  bloat       Check table bloat"
    echo "  queries     Check long running queries"
    echo "  connections Check connection usage"
    echo "  reindex     Reindex bloated indexes"
    echo "  report      Generate maintenance report"
    echo "  full        Run full maintenance"
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST     Database host (default: localhost)"
    echo "  DB_PORT     Database port (default: 5432)"
    echo "  DB_NAME     Database name (default: rtr_mrp)"
    echo "  DB_USER     Database user (default: postgres)"
}

# =============================================================================
# MAIN
# =============================================================================

case "${1:-}" in
    check)
        check_connection
        ;;
    analyze)
        check_connection && analyze_tables
        ;;
    vacuum)
        check_connection && vacuum_tables
        ;;
    indexes)
        check_connection && check_indexes
        ;;
    bloat)
        check_connection && check_bloat
        ;;
    queries)
        check_connection && check_long_queries
        ;;
    connections)
        check_connection && check_connections
        ;;
    reindex)
        check_connection && reindex_bloated
        ;;
    report)
        check_connection && generate_report
        ;;
    full)
        check_connection
        analyze_tables
        vacuum_tables
        check_indexes
        check_bloat
        check_connections
        generate_report
        echo ""
        echo -e "${GREEN}🎉 Full maintenance completed!${NC}"
        ;;
    *)
        usage
        ;;
esac
