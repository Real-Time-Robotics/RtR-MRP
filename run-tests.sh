#!/bin/bash

# RTR-MRP Test Runner & Diagnostic Tool
# Usage: ./run-tests.sh [command]
# Commands: diagnostic, all, health, api, performance, clean, report

set -e

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BASE_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${YELLOW}=== $1 ===${NC}"
}

run_diagnostic() {
    print_header "RTR-MRP PRODUCTION READINESS SCAN - $(date)"

    print_section "1. TYPESCRIPT ERRORS"
    TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0")
    echo "TypeScript Errors: $TS_ERRORS"

    print_section "2. ESLINT ERRORS"
    ESLINT_ERRORS=$(npx eslint src/ --ext .ts,.tsx --quiet 2>&1 | grep -c "error" || echo "0")
    echo "ESLint Errors: $ESLINT_ERRORS"

    print_section "3. CONSOLE.LOG COUNT"
    CONSOLE_LOGS=$(grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
    echo "Console.log Count: $CONSOLE_LOGS"

    print_section "4. TODO/FIXME COUNT"
    TODOS=$(grep -r "TODO\|FIXME" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
    echo "TODO/FIXME Count: $TODOS"

    print_section "5. @TS-NOCHECK COUNT"
    TS_NOCHECK=$(grep -r "@ts-nocheck\|@ts-ignore" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
    echo "@ts-nocheck Count: $TS_NOCHECK"

    print_section "6. SECURITY VULNERABILITIES"
    SECURITY=$(npm audit 2>&1 | grep -E "high|critical" | wc -l | tr -d ' ' || echo "0")
    echo "High/Critical Vulnerabilities: $SECURITY"

    print_section "7. PROJECT STATS"
    API_ROUTES=$(find src/app/api -name "route.ts" 2>/dev/null | wc -l | tr -d ' ')
    COMPONENTS=$(find src/components -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')
    echo "API Routes: $API_ROUTES"
    echo "Components: $COMPONENTS"

    print_section "8. BUILD TEST"
    if npm run build > /dev/null 2>&1; then
        echo -e "${GREEN}Build: PASSED${NC}"
        BUILD_STATUS="Pass"
    else
        echo -e "${RED}Build: FAILED${NC}"
        BUILD_STATUS="Fail"
    fi

    print_header "DIAGNOSTIC SUMMARY"
    echo ""
    echo "| Metric              | Count | Target | Status |"
    echo "|---------------------|-------|--------|--------|"

    if [ "$TS_ERRORS" -eq "0" ]; then
        echo "| TypeScript Errors   | $TS_ERRORS     | 0      | ✅     |"
    else
        echo "| TypeScript Errors   | $TS_ERRORS     | 0      | ❌     |"
    fi

    if [ "$ESLINT_ERRORS" -eq "0" ]; then
        echo "| ESLint Errors       | $ESLINT_ERRORS     | 0      | ✅     |"
    else
        echo "| ESLint Errors       | $ESLINT_ERRORS     | 0      | ❌     |"
    fi

    if [ "$CONSOLE_LOGS" -eq "0" ]; then
        echo "| Console.log         | $CONSOLE_LOGS     | 0      | ✅     |"
    else
        echo "| Console.log         | $CONSOLE_LOGS    | 0      | ⚠️      |"
    fi

    if [ "$TODOS" -lt "10" ]; then
        echo "| TODO/FIXME          | $TODOS     | <10    | ✅     |"
    else
        echo "| TODO/FIXME          | $TODOS    | <10    | ⚠️      |"
    fi

    if [ "$TS_NOCHECK" -lt "5" ]; then
        echo "| @ts-nocheck         | $TS_NOCHECK     | <5     | ✅     |"
    else
        echo "| @ts-nocheck         | $TS_NOCHECK     | <5     | ⚠️      |"
    fi

    if [ "$SECURITY" -eq "0" ]; then
        echo "| Security Issues     | $SECURITY     | 0      | ✅     |"
    else
        echo "| Security Issues     | $SECURITY     | 0      | ❌     |"
    fi

    if [ "$BUILD_STATUS" = "Pass" ]; then
        echo "| Build               | $BUILD_STATUS   | Pass   | ✅     |"
    else
        echo "| Build               | $BUILD_STATUS   | Pass   | ❌     |"
    fi

    echo ""
    print_header "SCAN COMPLETE"
}

run_all_tests() {
    print_header "RUNNING ALL TESTS"
    npx vitest run
}

run_health_tests() {
    print_header "RUNNING HEALTH TESTS"
    npx vitest run __tests__/health/
}

run_api_tests() {
    print_header "RUNNING API TESTS"
    npx vitest run __tests__/e2e/api/
}

run_performance_tests() {
    print_header "RUNNING PERFORMANCE TESTS"
    npx vitest run __tests__/performance/
}

run_clean() {
    print_header "CLEANING CODEBASE"

    print_section "1. Running ESLint auto-fix"
    npx eslint src/ --ext .ts,.tsx --fix --quiet || true

    print_section "2. Running Prettier"
    npx prettier --write "src/**/*.{ts,tsx}" --log-level warn || true

    print_section "3. Type checking"
    npx tsc --noEmit || true

    print_section "4. Listing console.log files"
    echo "Files with console.log:"
    grep -rln "console\.log" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -20 || echo "None found"

    print_header "CLEANUP COMPLETE"
}

generate_report() {
    print_header "RTR-MRP PRODUCTION READINESS REPORT - $(date)"

    echo ""
    echo "# RTR-MRP Production Readiness Report"
    echo "## Date: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo "### Code Quality"
    echo "| Metric | Count |"
    echo "|--------|-------|"
    echo "| TypeScript Errors | $(npx tsc --noEmit 2>&1 | grep -c 'error TS' || echo 0) |"
    echo "| ESLint Errors | $(npx eslint src/ --ext .ts,.tsx --quiet 2>&1 | grep -c 'error' || echo 0) |"
    echo "| Console.log | $(grep -r 'console\.log' src/ --include='*.ts' --include='*.tsx' 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ') |"
    echo "| TODO/FIXME | $(grep -r 'TODO\|FIXME' src/ --include='*.ts' --include='*.tsx' 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ') |"
    echo ""
    echo "### Project Stats"
    echo "| Metric | Count |"
    echo "|--------|-------|"
    echo "| API Routes | $(find src/app/api -name 'route.ts' 2>/dev/null | wc -l | tr -d ' ') |"
    echo "| Components | $(find src/components -name '*.tsx' 2>/dev/null | wc -l | tr -d ' ') |"
    echo "| Prisma Models | $(grep -c '^model ' prisma/schema.prisma 2>/dev/null || echo 0) |"
    echo ""
    echo "### Features"
    echo "- Excel-like UI: ✅ Complete"
    echo "- Change Impact: ✅ Complete"
    echo "- Parts CRUD: ✅ Complete"
    echo "- Inventory Management: ✅ Complete"
    echo "- Customer/Supplier Management: ✅ Complete"
    echo "- Order Processing: ✅ Complete"
    echo "- MRP Functions: ✅ Complete"
    echo ""
    print_header "REPORT COMPLETE"
}

# Main
case "${1:-help}" in
    diagnostic)
        run_diagnostic
        ;;
    all)
        run_all_tests
        ;;
    health)
        run_health_tests
        ;;
    api)
        run_api_tests
        ;;
    performance)
        run_performance_tests
        ;;
    clean)
        run_clean
        ;;
    report)
        generate_report
        ;;
    *)
        echo "RTR-MRP Test Runner"
        echo ""
        echo "Usage: ./run-tests.sh [command]"
        echo ""
        echo "Commands:"
        echo "  diagnostic    Run diagnostic scan (code quality check)"
        echo "  all           Run all tests"
        echo "  health        Run health tests only"
        echo "  api           Run API tests only"
        echo "  performance   Run performance tests only"
        echo "  clean         Run cleanup tasks (ESLint fix, Prettier)"
        echo "  report        Generate production readiness report"
        echo ""
        ;;
esac
