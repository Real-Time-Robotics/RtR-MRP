#!/bin/bash

# =============================================================================
# RTR MRP - SECURITY AUDIT SCRIPT
# Run this script to check for common security issues
# =============================================================================

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    RTR MRP Security Audit Script      ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

ISSUES_FOUND=0

# 1. Check for .env files
echo -e "${BLUE}[1/10] Checking for exposed .env files...${NC}"
if [ -f ".env" ]; then
    echo -e "${RED}❌ CRITICAL: .env file found in project root!${NC}"
    echo -e "${YELLOW}   Action: Remove .env and use environment variables${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✓ No .env file in root${NC}"
fi

if [ -f ".env.local" ]; then
    echo -e "${RED}❌ WARNING: .env.local file found${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# 2. Check for hardcoded secrets
echo -e "\n${BLUE}[2/10] Checking for hardcoded secrets...${NC}"
SECRET_PATTERNS="(password|secret|api.?key|token|private.?key).*[:=].*['\"][^'\"]{8,}"
SECRETS=$(grep -rniE "$SECRET_PATTERNS" src/ --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null | grep -v "process.env" | grep -v ".example" | head -10 || true)
if [ -n "$SECRETS" ]; then
    echo -e "${RED}❌ Potential hardcoded secrets found:${NC}"
    echo "$SECRETS"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✓ No obvious hardcoded secrets${NC}"
fi

# 3. Check for console.log statements
echo -e "\n${BLUE}[3/10] Checking for console.log statements...${NC}"
CONSOLE_COUNT=$(grep -rn "console\.\(log\|debug\|warn\|error\)" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
if [ "$CONSOLE_COUNT" -gt 50 ]; then
    echo -e "${RED}❌ Found $CONSOLE_COUNT console statements (should use logger)${NC}"
    echo -e "${YELLOW}   Top files:${NC}"
    grep -rn "console\.\(log\|debug\|warn\|error\)" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | cut -d: -f1 | sort | uniq -c | sort -rn | head -5
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
elif [ "$CONSOLE_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $CONSOLE_COUNT console statements${NC}"
else
    echo -e "${GREEN}✓ No console statements found${NC}"
fi

# 4. Check for 'any' types
echo -e "\n${BLUE}[4/10] Checking for TypeScript 'any' types...${NC}"
ANY_COUNT=$(grep -rn ": any" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
if [ "$ANY_COUNT" -gt 30 ]; then
    echo -e "${RED}❌ Found $ANY_COUNT 'any' types (weak type safety)${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
elif [ "$ANY_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $ANY_COUNT 'any' types${NC}"
else
    echo -e "${GREEN}✓ No 'any' types found${NC}"
fi

# 5. Check API routes for authentication
echo -e "\n${BLUE}[5/10] Checking API routes for authentication...${NC}"
API_FILES=$(find src/app/api -name "route.ts" 2>/dev/null | wc -l | tr -d ' ')
AUTH_FILES=$(grep -rl "withAuth\|requireAuth\|getServerSession\|auth()" src/app/api --include="route.ts" 2>/dev/null | wc -l | tr -d ' ')
UNAUTH_COUNT=$((API_FILES - AUTH_FILES))
if [ "$UNAUTH_COUNT" -gt 10 ]; then
    echo -e "${RED}❌ $UNAUTH_COUNT of $API_FILES API routes may lack authentication${NC}"
    echo -e "${YELLOW}   Routes without auth checks:${NC}"
    for f in $(find src/app/api -name "route.ts" 2>/dev/null); do
        if ! grep -q "withAuth\|requireAuth\|getServerSession\|auth()" "$f"; then
            echo "   - $f"
        fi
    done | head -10
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
elif [ "$UNAUTH_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠ $UNAUTH_COUNT routes may need auth review${NC}"
else
    echo -e "${GREEN}✓ All routes have authentication${NC}"
fi

# 6. Check for input validation
echo -e "\n${BLUE}[6/10] Checking for input validation...${NC}"
VALIDATION_FILES=$(grep -rl "validateRequest\|schema.parse\|safeParse" src/app/api --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
if [ "$VALIDATION_FILES" -lt 5 ]; then
    echo -e "${YELLOW}⚠ Only $VALIDATION_FILES API files use validation schemas${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✓ Input validation found in $VALIDATION_FILES files${NC}"
fi

# 7. Check for large files (potential code smell)
echo -e "\n${BLUE}[7/10] Checking for overly large files...${NC}"
LARGE_FILES=$(find src -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs wc -l 2>/dev/null | sort -rn | head -10 | awk '$1 > 500 {print $0}' | head -5)
if [ -n "$LARGE_FILES" ]; then
    echo -e "${YELLOW}⚠ Large files (>500 lines):${NC}"
    echo "$LARGE_FILES"
else
    echo -e "${GREEN}✓ No overly large files${NC}"
fi

# 8. Check for TODO/FIXME comments
echo -e "\n${BLUE}[8/10] Checking for TODO/FIXME comments...${NC}"
TODO_COUNT=$(grep -rn "TODO\|FIXME\|HACK\|XXX" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
if [ "$TODO_COUNT" -gt 10 ]; then
    echo -e "${YELLOW}⚠ Found $TODO_COUNT TODO/FIXME comments${NC}"
else
    echo -e "${GREEN}✓ Only $TODO_COUNT TODO comments${NC}"
fi

# 9. Check for weak CSP
echo -e "\n${BLUE}[9/10] Checking Content Security Policy...${NC}"
if grep -q "unsafe-eval.*unsafe-inline" next.config.mjs 2>/dev/null; then
    if [ "$NODE_ENV" = "production" ]; then
        echo -e "${RED}❌ CSP allows unsafe-eval and unsafe-inline in production${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${YELLOW}⚠ CSP allows unsafe patterns (OK for development)${NC}"
    fi
else
    echo -e "${GREEN}✓ CSP appears configured${NC}"
fi

# 10. Check dependencies for vulnerabilities
echo -e "\n${BLUE}[10/10] Checking npm dependencies...${NC}"
if command -v npm &> /dev/null; then
    AUDIT_RESULT=$(npm audit --json 2>/dev/null | head -1 || echo '{}')
    if echo "$AUDIT_RESULT" | grep -q '"high"\|"critical"'; then
        echo -e "${RED}❌ npm audit found high/critical vulnerabilities${NC}"
        echo -e "${YELLOW}   Run: npm audit fix${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}✓ No critical npm vulnerabilities${NC}"
    fi
else
    echo -e "${YELLOW}⚠ npm not found, skipping audit${NC}"
fi

# Summary
echo -e "\n${BLUE}========================================${NC}"
if [ "$ISSUES_FOUND" -gt 0 ]; then
    echo -e "${RED}Security Audit Complete: $ISSUES_FOUND issue(s) found${NC}"
    echo -e "${YELLOW}Please review and fix the issues above${NC}"
    exit 1
else
    echo -e "${GREEN}Security Audit Complete: No critical issues found!${NC}"
    exit 0
fi
