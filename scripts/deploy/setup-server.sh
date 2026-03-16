#!/bin/bash
# scripts/deploy/setup-server.sh
# Initial server setup for RTR-MRP on VPS
# Run once as user "hung" on 171.244.40.23
#
# Usage:
#   bash setup-server.sh

set -e

DEPLOY_DIR="/home/hung/rtr-mrp"
REPO_URL="git@github.com:$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')"

echo "========================================"
echo "  RTR-MRP Server Setup"
echo "========================================"

# 1. Create deploy directory
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

# 2. Clone repository (skip if already cloned)
if [ ! -d ".git" ]; then
  echo ">> Cloning repository..."
  git clone "$REPO_URL" .
else
  echo ">> Repository already exists, pulling latest..."
  git pull
fi

# 3. Create Docker network for Caddy (skip if exists)
echo ">> Ensuring Docker network 'caddy' exists..."
docker network create caddy 2>/dev/null && echo "Network created" || echo "Network already exists"

# 4. Setup environment file
if [ ! -f ".env" ]; then
  cp .env.production.example .env
  echo ""
  echo "========================================"
  echo "  ACTION REQUIRED: Edit .env file"
  echo "  nano $DEPLOY_DIR/.env"
  echo ""
  echo "  Minimum required:"
  echo "  - POSTGRES_PASSWORD (openssl rand -hex 32)"
  echo "  - NEXTAUTH_SECRET   (openssl rand -base64 32)"
  echo "  - AUTH_SECRET       (same as NEXTAUTH_SECRET)"
  echo "========================================"
  echo ""
  read -p "Press Enter after editing .env to continue..."
else
  echo ">> .env already exists, skipping..."
fi

# 5. Create log directory for deployments
mkdir -p /var/log/rtr-mrp 2>/dev/null || sudo mkdir -p /var/log/rtr-mrp && sudo chown hung:hung /var/log/rtr-mrp

# 6. Build and start services
echo ">> Building and starting services..."
docker compose up -d --build

# 7. Wait for services and run initial migration
echo ">> Waiting 30s for services to start..."
sleep 30
docker compose exec -T app npx prisma migrate deploy || true

# 8. Seed demo data (optional)
read -p ">> Seed demo data? (y/N): " seed_answer
if [[ "$seed_answer" =~ ^[Yy]$ ]]; then
  docker compose exec -T app npx prisma db seed
fi

echo ""
echo "========================================"
echo "  Setup complete!"
echo "  App running at: https://mrp.rtrobotics.com"
echo ""
echo "  Check status: docker compose ps"
echo "  View logs:    docker compose logs -f app"
echo "========================================"
