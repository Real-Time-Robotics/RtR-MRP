#!/bin/bash

# =============================================================================
# RTR MRP - SECURITY APPLY SCRIPT
# Applies security updates to API routes and validates changes
# =============================================================================

set -e

echo "=================================================="
echo "RTR MRP - Security Update Script"
echo "=================================================="
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
SECURED_COUNT=0
ISSUES_COUNT=0

echo "Checking security modules..."
echo ""

# Check required security modules exist
REQUIRED_MODULES=(
  "src/lib/auth/middleware.ts"
  "src/lib/security/sanitize.ts"
  "src/lib/error-handler.ts"
  "src/lib/logger.ts"
)

for module in "${REQUIRED_MODULES[@]}"; do
  if [ -f "$PROJECT_ROOT/$module" ]; then
    echo -e "${GREEN}[OK]${NC} $module"
  else
    echo -e "${RED}[MISSING]${NC} $module"
    ISSUES_COUNT=$((ISSUES_COUNT + 1))
  fi
done

echo ""
echo "Checking secured API routes..."
echo ""

# Check API routes for withAuth pattern
API_ROUTES=(
  "src/app/api/v2/dashboard/route.ts"
  "src/app/api/v2/sales/route.ts"
  "src/app/api/v2/production/route.ts"
  "src/app/api/v2/quality/route.ts"
  "src/app/api/v2/inventory/route.ts"
  "src/app/api/v2/bom/route.ts"
  "src/app/api/v2/analytics/route.ts"
  "src/app/api/v2/parts/route.ts"
)

for route in "${API_ROUTES[@]}"; do
  if [ -f "$PROJECT_ROOT/$route" ]; then
    if grep -q "withAuth" "$PROJECT_ROOT/$route"; then
      echo -e "${GREEN}[SECURED]${NC} $route"
      SECURED_COUNT=$((SECURED_COUNT + 1))
    else
      echo -e "${YELLOW}[UNSECURED]${NC} $route"
      ISSUES_COUNT=$((ISSUES_COUNT + 1))
    fi
  else
    echo -e "${RED}[NOT FOUND]${NC} $route"
    ISSUES_COUNT=$((ISSUES_COUNT + 1))
  fi
done

echo ""
echo "Checking for security patterns..."
echo ""

# Check for remaining console.log statements
CONSOLE_COUNT=$(grep -r "console\.log" src/app/api --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
if [ "$CONSOLE_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}[WARNING]${NC} Found $CONSOLE_COUNT console.log statements in API routes"
else
  echo -e "${GREEN}[OK]${NC} No console.log statements in API routes"
fi

# Check for 'any' type usage
ANY_COUNT=$(grep -r ": any" src/app/api --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
if [ "$ANY_COUNT" -gt 10 ]; then
  echo -e "${YELLOW}[WARNING]${NC} Found $ANY_COUNT 'any' type usages (consider stronger typing)"
fi

# Check for hardcoded credentials
CREDENTIAL_CHECK=$(grep -rE "(password|secret|key)\s*[:=]\s*['\"]" src/ --include="*.ts" 2>/dev/null | grep -v ".d.ts" | grep -v "node_modules" | wc -l | tr -d ' ')
if [ "$CREDENTIAL_CHECK" -gt 0 ]; then
  echo -e "${RED}[CRITICAL]${NC} Possible hardcoded credentials found!"
else
  echo -e "${GREEN}[OK]${NC} No obvious hardcoded credentials"
fi

# Check CSP headers
if grep -q "Content-Security-Policy" next.config.mjs 2>/dev/null || grep -q "Content-Security-Policy" next.config.js 2>/dev/null; then
  echo -e "${GREEN}[OK]${NC} CSP headers configured"
else
  echo -e "${YELLOW}[WARNING]${NC} CSP headers not found in next.config"
fi

echo ""
echo "=================================================="
echo "SUMMARY"
echo "=================================================="
echo -e "Secured Routes: ${GREEN}$SECURED_COUNT${NC}"
echo -e "Issues Found:   ${RED}$ISSUES_COUNT${NC}"
echo ""

if [ "$ISSUES_COUNT" -eq 0 ]; then
  echo -e "${GREEN}All security checks passed!${NC}"
  exit 0
else
  echo -e "${YELLOW}Some issues need attention. Please review above.${NC}"
  exit 1
fi
