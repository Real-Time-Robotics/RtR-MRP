#!/bin/sh
# docker/scripts/entrypoint.sh
# Container entrypoint script for RTR MRP System

set -e

echo "========================================"
echo "  RTR MRP System - Starting Up"
echo "========================================"

# Wait for database
echo "Waiting for database..."
while ! nc -z db 5432; do
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
npx prisma migrate deploy

# Verify database connection
echo "Verifying database connection..."
npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1

echo "========================================"
echo "  All checks passed. Starting app..."
echo "========================================"

# Execute the main command
exec "$@"
