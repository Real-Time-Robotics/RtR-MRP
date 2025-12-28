#!/bin/bash
# scripts/backup/restore-db.sh
# Database restore script for RTR MRP System

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/rtr-mrp/backups}"
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "========================================"
  echo "  RTR MRP Database Restore"
  echo "========================================"
  echo ""
  echo "Usage: $0 <backup-file>"
  echo ""
  echo "Available backups:"
  ls -lh "$BACKUP_DIR"/*.dump 2>/dev/null || echo "No backups found in $BACKUP_DIR"
  exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  # Check in backup directory
  if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
  else
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
  fi
fi

# Database config
DB_HOST="${PGHOST:-db}"
DB_PORT="${PGPORT:-5432}"
DB_NAME="${POSTGRES_DB:-rtr_mrp}"
DB_USER="${POSTGRES_USER:-rtr}"

echo "========================================"
echo "  RTR MRP Database Restore"
echo "========================================"
echo ""
echo "WARNING: This will restore the database from backup!"
echo ""
echo "Backup file: $BACKUP_FILE"
echo "Database: $DB_NAME"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

# Create a backup of current state first
CURRENT_BACKUP="pre-restore-$(date +%Y%m%d-%H%M%S)"
echo ""
echo "Creating backup of current state: $CURRENT_BACKUP"
./scripts/backup/backup-db.sh "$CURRENT_BACKUP"

# Restore
echo ""
echo "Restoring from: $BACKUP_FILE"
PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean \
  --if-exists \
  --verbose \
  "$BACKUP_FILE"

echo ""
echo "========================================"
echo "  Database restored successfully!"
echo "========================================"
echo "Previous state saved as: $CURRENT_BACKUP"
