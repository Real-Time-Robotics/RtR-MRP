#!/bin/bash
# scripts/deploy/deploy.sh
# Deployment script for RTR MRP System

set -e

echo "========================================"
echo "  RTR MRP System Deployment"
echo "========================================"
echo ""

# Configuration
APP_DIR="${APP_DIR:-/opt/rtr-mrp}"
COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.yml}"

cd "$APP_DIR"

# Pull latest changes
echo "Pulling latest changes..."
git pull origin main

# Pull new images
echo ""
echo "Pulling Docker images..."
docker-compose -f "$COMPOSE_FILE" pull

# Create pre-deploy backup
echo ""
echo "Creating pre-deploy backup..."
./scripts/backup/backup-db.sh "pre-deploy-$(date +%Y%m%d-%H%M%S)"

# Deploy with zero-downtime
echo ""
echo "Deploying application..."
docker-compose -f "$COMPOSE_FILE" up -d --no-deps app

# Wait for app to be ready
echo ""
echo "Waiting for application to be ready..."
sleep 10

# Run migrations
echo ""
echo "Running database migrations..."
docker-compose -f "$COMPOSE_FILE" exec -T app npx prisma migrate deploy

# Health check
echo ""
echo "Running health check..."
MAX_ATTEMPTS=10
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  if curl -sf http://localhost:3000/api/health > /dev/null; then
    echo "Health check passed!"
    break
  fi

  if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "Health check failed after $MAX_ATTEMPTS attempts"
    echo "Rolling back..."
    ./scripts/deploy/rollback.sh
    exit 1
  fi

  echo "Attempt $ATTEMPT failed, retrying in 5 seconds..."
  ATTEMPT=$((ATTEMPT + 1))
  sleep 5
done

# Cleanup
echo ""
echo "Cleaning up old images..."
docker system prune -f

echo ""
echo "========================================"
echo "  Deployment completed successfully!"
echo "========================================"
echo ""
echo "Application status:"
docker-compose -f "$COMPOSE_FILE" ps
