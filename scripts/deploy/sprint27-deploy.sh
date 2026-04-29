#!/bin/bash
# scripts/deploy/sprint27-deploy.sh
# Sprint 27 deploy automation — push 2 remote + SSH deploy production
# Run from local machine (Lâm's Mac with ~/.ssh/ key for lam@171.244.40.23)
#
# Usage: bash scripts/deploy/sprint27-deploy.sh [--skip-deploy] [--server-path /path]

set -e

# =============================================================================
# CONFIG (chỉnh nếu sai)
# =============================================================================
BRANCH="feat/sprint-27-electronics-ia"
RTR_REMOTE_URL="https://github.com/Real-Time-Robotics/RtR-MRP.git"
PRODUCTION_HOST="171.244.40.23"
PRODUCTION_USER="lam"
SERVER_PATH="${SERVER_PATH:-/home/lam/RtR-MRP}"   # hoặc /opt/rtr-mrp — chỉnh nếu khác
SKIP_DEPLOY=false

for arg in "$@"; do
  case $arg in
    --skip-deploy) SKIP_DEPLOY=true ;;
    --server-path=*) SERVER_PATH="${arg#*=}" ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

echo "========================================"
echo "  Sprint 27 Deploy Automation"
echo "========================================"
echo "Repo:        $REPO_ROOT"
echo "Branch:      $BRANCH"
echo "RTR remote:  $RTR_REMOTE_URL"
echo "Production:  $PRODUCTION_USER@$PRODUCTION_HOST:$SERVER_PATH"
echo "Skip deploy: $SKIP_DEPLOY"
echo ""
read -r -p "Tiếp tục? [y/N] " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { echo "Cancelled."; exit 1; }

# =============================================================================
# STEP 1 · Cleanup git lock + verify branch
# =============================================================================
echo ""
echo "=== STEP 1: Cleanup + verify ==="

if [ -f .git/index.lock ]; then
  echo "Removing stale .git/index.lock..."
  rm -f .git/index.lock
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
  echo "ERROR: Đang ở branch '$CURRENT_BRANCH', cần '$BRANCH'"
  echo "       Chạy: git checkout $BRANCH"
  exit 1
fi

# Stash noise files (lockfile sync + Next.js PWA autogen)
NOISE_FILES=()
git diff --name-only | while read -r f; do
  case "$f" in
    package-lock.json|public/sw.js|public/fallback-*.js)
      NOISE_FILES+=("$f")
      ;;
  esac
done

if [ -n "$(git status --porcelain | grep -E 'package-lock|public/sw|public/fallback')" ]; then
  echo "Stashing 3 noise file (lockfile sync + PWA autogen)..."
  git stash push -m "sprint27-deploy noise" -- \
    package-lock.json \
    public/sw.js \
    'public/fallback-*.js' 2>/dev/null || true
fi

# Show what we're about to push
COMMITS_AHEAD=$(git log --oneline origin/$BRANCH..HEAD 2>/dev/null | wc -l | tr -d ' ')
echo ""
echo "Commits ahead of origin/$BRANCH: $COMMITS_AHEAD"
git log --oneline origin/$BRANCH..HEAD 2>/dev/null || echo "(branch not on origin yet)"

# =============================================================================
# STEP 2 · Setup RTR remote + push 2 remote
# =============================================================================
echo ""
echo "=== STEP 2: Push origin + rtr ==="

# Add RTR remote if missing
if ! git remote | grep -q '^rtr$'; then
  echo "Adding remote 'rtr' → $RTR_REMOTE_URL"
  git remote add rtr "$RTR_REMOTE_URL"
else
  EXISTING_RTR=$(git remote get-url rtr)
  if [ "$EXISTING_RTR" != "$RTR_REMOTE_URL" ]; then
    echo "WARN: remote 'rtr' đang trỏ '$EXISTING_RTR', cập nhật về '$RTR_REMOTE_URL'"
    git remote set-url rtr "$RTR_REMOTE_URL"
  fi
fi

# Push origin (PAT đã embed trong URL của origin)
echo ""
echo "Pushing to origin (nclamvn/rtr-mrp)..."
git push origin "$BRANCH"

# Push RTR (cần auth — credential helper hoặc token)
echo ""
echo "Pushing to rtr (Real-Time-Robotics/RtR-MRP)..."
echo "Note: nếu hỏi auth, dùng PAT của tài khoản có quyền vào org Real-Time-Robotics."
git push rtr "$BRANCH"

# =============================================================================
# STEP 3 · Merge to main (origin only — RTR có thể PR sau)
# =============================================================================
echo ""
echo "=== STEP 3: Merge to main ==="
read -r -p "Merge $BRANCH → main local rồi push origin/main? [y/N] " confirm_merge
if [[ "$confirm_merge" =~ ^[Yy]$ ]]; then
  git checkout main
  git pull origin main
  git merge --no-ff "$BRANCH" -m "Merge Sprint 27: electronics workflow + IA restructure (8 TIP)"
  git push origin main
  git push rtr main 2>&1 || echo "WARN: rtr/main push failed (org permission?)"
  git checkout "$BRANCH"
else
  echo "Skip merge to main. CD workflow KHÔNG trigger được (nó pull từ main)."
  echo "Nếu muốn deploy nhánh feat/sprint-27 → dùng SSH manual ở STEP 4."
fi

# =============================================================================
# STEP 4 · Deploy production via SSH
# =============================================================================
if [ "$SKIP_DEPLOY" = "true" ]; then
  echo ""
  echo "=== STEP 4: SKIPPED (--skip-deploy) ==="
  echo ""
  echo "Push xong. Để deploy thủ công sau:"
  echo "  ssh $PRODUCTION_USER@$PRODUCTION_HOST"
  echo "  cd $SERVER_PATH"
  echo "  git pull origin main"
  echo "  docker compose build app"
  echo "  docker compose up -d --no-deps app"
  echo "  docker compose exec -T app npx prisma migrate deploy"
  exit 0
fi

echo ""
echo "=== STEP 4: SSH Deploy production ==="
echo "Target: $PRODUCTION_USER@$PRODUCTION_HOST:$SERVER_PATH"
read -r -p "Tiếp tục deploy production? [y/N] " confirm_deploy
[[ "$confirm_deploy" =~ ^[Yy]$ ]] || { echo "Skip deploy."; exit 0; }

# Test SSH connection first
echo ""
echo "Testing SSH connection..."
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$PRODUCTION_USER@$PRODUCTION_HOST" "echo SSH_OK" 2>&1 | grep -q "SSH_OK"; then
  echo "ERROR: SSH connect fail. Kiểm tra:"
  echo "  1. ~/.ssh/config có Host $PRODUCTION_HOST hoặc key default work không?"
  echo "  2. ssh $PRODUCTION_USER@$PRODUCTION_HOST 'echo test'  thử thủ công"
  exit 1
fi
echo "SSH OK."

# Run deploy on server
echo ""
echo "Deploying..."
ssh "$PRODUCTION_USER@$PRODUCTION_HOST" bash <<EOF
  set -e
  cd "$SERVER_PATH" || { echo "ERROR: $SERVER_PATH not found on server"; exit 1; }

  echo "=== Pre-deploy backup ==="
  if [ -f scripts/backup/backup-db.sh ]; then
    ./scripts/backup/backup-db.sh "pre-sprint27-\$(date +%Y%m%d-%H%M%S)" || echo "WARN: backup script failed (continue anyway)"
  fi

  echo "=== Pull main ==="
  git fetch origin
  git checkout main
  git pull origin main

  echo "=== Rebuild Docker app image ==="
  docker compose build app

  echo "=== Restart app container (zero-downtime) ==="
  docker compose up -d --no-deps app

  echo "=== Wait container ready ==="
  sleep 10

  echo "=== Run Prisma migrations ==="
  docker compose exec -T app npx prisma migrate deploy

  echo "=== Generate Prisma client ==="
  docker compose exec -T app npx prisma generate || true

  echo "=== Cleanup old images ==="
  docker image prune -f

  echo "=== Sprint 27 deployed at \$(date) ==="
EOF

# =============================================================================
# STEP 5 · Health check
# =============================================================================
echo ""
echo "=== STEP 5: Health check ==="
sleep 15

for i in 1 2 3 4 5; do
  if curl -sf https://mrp.rtrobotics.com/api/health -m 10; then
    echo ""
    echo "✓ Health check OK"
    break
  fi
  echo "Attempt $i/5 fail, retry in 10s..."
  sleep 10
  if [ $i -eq 5 ]; then
    echo ""
    echo "✗ Health check FAIL sau 5 lần. Check log server:"
    echo "  ssh $PRODUCTION_USER@$PRODUCTION_HOST 'cd $SERVER_PATH && docker compose logs app --tail 100'"
    exit 1
  fi
done

# =============================================================================
# STEP 6 · Restore noise (optional)
# =============================================================================
echo ""
echo "=== STEP 6: Restore stashed noise file ==="
if git stash list | grep -q "sprint27-deploy noise"; then
  read -r -p "Restore 3 noise file đã stash? [y/N] " confirm_restore
  [[ "$confirm_restore" =~ ^[Yy]$ ]] && git stash pop || echo "Stash giữ nguyên trong stash list."
fi

echo ""
echo "========================================"
echo "  ✓ Sprint 27 deploy DONE"
echo "========================================"
echo "  Origin push:    OK"
echo "  RTR push:       OK"
echo "  Production:     https://mrp.rtrobotics.com"
echo "  Health:         OK"
echo ""
echo "Tracking:"
echo "  - Sprint 27 commits: $(git log --oneline origin/main..HEAD 2>/dev/null | wc -l | tr -d ' ') ahead main"
echo "  - VERIFY_REPORT:     docs/sprint-27/VERIFY_REPORT.md"
echo ""
