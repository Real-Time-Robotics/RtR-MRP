#!/bin/bash
# scripts/backup/backup-db.sh
# Database backup script for RTR MRP System

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/rtr-mrp/backups}"
BACKUP_NAME="${1:-backup-$(date +%Y%m%d-%H%M%S)}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Database config from environment
DB_HOST="${PGHOST:-db}"
DB_PORT="${PGPORT:-5432}"
DB_NAME="${POSTGRES_DB:-rtr_mrp}"
DB_USER="${POSTGRES_USER:-rtr}"

echo "========================================"
echo "  RTR MRP Database Backup"
echo "========================================"
echo "Backup name: $BACKUP_NAME"
echo "Target dir: $BACKUP_DIR"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup (custom format for pg_restore)
echo "Creating backup..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=custom \
  --compress=9 \
  --verbose \
  > "$BACKUP_DIR/${BACKUP_NAME}.dump" 2>&1

# Also create SQL backup for portability
echo "Creating SQL backup..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=plain \
  | gzip > "$BACKUP_DIR/${BACKUP_NAME}.sql.gz"

# Calculate sizes
DUMP_SIZE=$(du -h "$BACKUP_DIR/${BACKUP_NAME}.dump" | cut -f1)
SQL_SIZE=$(du -h "$BACKUP_DIR/${BACKUP_NAME}.sql.gz" | cut -f1)

echo ""
echo "========================================"
echo "  Backup completed successfully!"
echo "========================================"
echo "Files created:"
echo "  - ${BACKUP_NAME}.dump ($DUMP_SIZE)"
echo "  - ${BACKUP_NAME}.sql.gz ($SQL_SIZE)"
echo ""

# Cleanup old backups
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "*.dump" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

echo ""
echo "Current backups:"
ls -lh "$BACKUP_DIR" | head -10
