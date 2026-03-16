#!/bin/sh
# docker/scripts/entrypoint.sh
# Container entrypoint script for RTR MRP System

set -e

echo "========================================"
echo "  RTR MRP System - Starting Up"
echo "========================================"

# Wait for database
echo "Waiting for database..."
while ! nc -z rtr-db 5432; do
  sleep 1
done
echo "Database is ready"

# Wait for Redis
echo "Waiting for Redis..."
while ! nc -z redis 6379; do
  sleep 1
done
echo "Redis is ready"

# Run database migrations
echo "Running database migrations..."
node /app/node_modules/prisma/build/index.js migrate deploy

echo "========================================"
echo "  All checks passed. Starting app..."
echo "========================================"

# Execute the main command
exec "$@"
