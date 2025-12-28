#!/bin/bash
# scripts/deploy/rollback.sh
# Rollback script for RTR MRP System

set -e

echo "========================================"
echo "  RTR MRP System Rollback"
echo "========================================"
echo ""

APP_DIR="${APP_DIR:-/opt/rtr-mrp}"
COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-/opt/rtr-mrp/backups}"

cd "$APP_DIR"

# Find the latest pre-deploy backup
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/pre-deploy-*.dump 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
  echo "WARNING: No pre-deploy backup found!"
  echo "Proceeding with code rollback only..."
else
  echo "Found backup: $LATEST_BACKUP"
fi

# Rollback to previous image
echo ""
echo "Rolling back to previous version..."
docker-compose -f "$COMPOSE_FILE" down app

# Checkout previous commit
echo "Reverting to previous commit..."
git checkout HEAD~1

# Rebuild and start
echo "Rebuilding and starting..."
docker-compose -f "$COMPOSE_FILE" up -d --build app

# Wait for startup
sleep 15

# Restore database if backup exists
if [ -n "$LATEST_BACKUP" ]; then
  echo ""
  echo "Restoring database from backup..."
  docker-compose -f "$COMPOSE_FILE" run --rm backup /scripts/restore-db.sh "$LATEST_BACKUP"
fi

# Health check
echo ""
echo "Running health check..."
sleep 10
if curl -sf http://localhost:3000/api/health > /dev/null; then
  echo ""
  echo "========================================"
  echo "  Rollback completed successfully!"
  echo "========================================"
else
  echo ""
  echo "========================================"
  echo "  WARNING: Health check failed after rollback!"
  echo "  Manual intervention may be required."
  echo "========================================"
  exit 1
fi
