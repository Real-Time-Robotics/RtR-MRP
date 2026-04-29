#!/bin/bash
# scripts/deploy/recover-server.sh
# Recovery script: clone repo lại trên server + rebuild + deploy
# Chạy từ Mac local: bash scripts/deploy/recover-server.sh

set -e

SERVER="lam@171.244.40.23"
REPO_URL="https://github.com/Real-Time-Robotics/RtR-MRP.git"
SERVER_PATH="/home/lam/RtR-MRP"

echo "=== RTR-MRP Server Recovery ==="
echo "Server: $SERVER"
echo "Path:   $SERVER_PATH"
echo ""
echo "Script sẽ SSH vào server và:"
echo "  1. Clone lại repo từ GitHub"
echo "  2. Copy .env từ backup hoặc tạo mới"
echo "  3. Build Docker image"
echo "  4. Start containers"
echo "  5. Run Prisma migrate"
echo ""
read -r -p "Tiếp tục? [y/N] " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || exit 1

echo ""
echo "SSH vào server... (nhập password khi hỏi)"
echo ""

ssh -t "$SERVER" bash -s << 'REMOTE_SCRIPT'
set -e

SERVER_PATH="/home/lam/RtR-MRP"
REPO_URL="https://github.com/Real-Time-Robotics/RtR-MRP.git"

echo "=== Step 1: Check + Clone ==="

# Check if directory exists
if [ -d "$SERVER_PATH" ] && [ -f "$SERVER_PATH/package.json" ]; then
    echo "Repo exists at $SERVER_PATH"
    cd "$SERVER_PATH"
    git fetch origin
    git checkout main
    git pull origin main
else
    echo "Repo missing — cloning..."
    # Check if parent dir exists
    if [ ! -d "$(dirname $SERVER_PATH)" ]; then
        mkdir -p "$(dirname $SERVER_PATH)"
    fi

    # Try to find if moved elsewhere
    FOUND=$(find /home /opt -name "RtR-MRP" -type d 2>/dev/null | head -1)
    if [ -n "$FOUND" ] && [ -f "$FOUND/package.json" ]; then
        echo "Found repo at $FOUND — using it"
        SERVER_PATH="$FOUND"
        cd "$SERVER_PATH"
        git fetch origin
        git checkout main
        git pull origin main
    else
        cd "$(dirname $SERVER_PATH)"
        git clone "$REPO_URL" "$(basename $SERVER_PATH)"
        cd "$SERVER_PATH"
    fi
fi

echo "Repo ready at: $(pwd)"
echo "HEAD: $(git log --oneline -1)"

echo ""
echo "=== Step 2: Check .env ==="
if [ ! -f .env ]; then
    echo ".env missing — checking backups..."
    BACKUP_ENV=$(find /home/lam/backups -name ".env" 2>/dev/null | head -1)
    if [ -n "$BACKUP_ENV" ]; then
        echo "Found backup .env at $BACKUP_ENV — copying"
        cp "$BACKUP_ENV" .env
    else
        echo "WARNING: No .env found. Creating minimal .env..."
        cat > .env << 'ENVEOF'
DATABASE_URL=postgresql://rtr:rtr_secret_2024@rtr-db:5432/rtr_mrp?schema=public
NEXTAUTH_URL=https://mrp.rtrobotics.com
NEXTAUTH_SECRET=change-me-in-production
NEXT_PUBLIC_APP_URL=https://mrp.rtrobotics.com
REDIS_URL=redis://redis:6379
NODE_ENV=production
ENVEOF
        echo "Minimal .env created — edit later with correct secrets"
    fi
else
    echo ".env exists"
fi

echo ""
echo "=== Step 3: Docker cleanup ==="
docker system prune -af 2>/dev/null || true
df -h / 2>/dev/null || echo "(df unavailable)"

echo ""
echo "=== Step 4: Docker build (app only, skip ml-service) ==="
docker compose build app --no-cache

echo ""
echo "=== Step 5: Docker up (app + db + redis only) ==="
docker compose up -d rtr-db redis app

echo ""
echo "=== Step 6: Wait + Migrate ==="
sleep 15
docker exec rtr-mrp node node_modules/prisma/build/index.js migrate deploy

echo ""
echo "=== Step 7: Health check ==="
sleep 5
curl -sf https://mrp.rtrobotics.com/api/health && echo "" && echo "HEALTH: OK" || echo "HEALTH: FAIL (check docker logs)"

echo ""
echo "=== Recovery complete at $(date) ==="
REMOTE_SCRIPT

echo ""
echo "=== Done ==="
echo "Check: https://mrp.rtrobotics.com"
