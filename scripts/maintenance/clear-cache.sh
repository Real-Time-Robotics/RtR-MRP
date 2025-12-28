#!/bin/bash
# scripts/maintenance/clear-cache.sh
# Clear Redis cache for RTR MRP System

set -e

echo "========================================"
echo "  Clear Redis Cache"
echo "========================================"

COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.yml}"

echo "Flushing all Redis data..."
docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli FLUSHALL

echo ""
echo "Cache cleared successfully!"
