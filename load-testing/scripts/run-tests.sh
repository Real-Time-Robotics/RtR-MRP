#!/bin/bash
# =============================================================================
# RTR-MRP - LOAD TEST RUNNER
# Unified script to run all load tests
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
RESULTS_DIR="load-tests/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create results directory
mkdir -p "$RESULTS_DIR"

# =============================================================================
# FUNCTIONS
# =============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}=============================================${NC}"
    echo ""
}

check_dependencies() {
    print_header "Checking Dependencies"
    
    # Check K6
    if command -v k6 &> /dev/null; then
        echo -e "${GREEN}✓ k6 installed: $(k6 version)${NC}"
    else
        echo -e "${YELLOW}⚠ k6 not installed. Install: https://k6.io/docs/getting-started/installation/${NC}"
    fi
    
    # Check Artillery
    if command -v artillery &> /dev/null; then
        echo -e "${GREEN}✓ artillery installed: $(artillery version)${NC}"
    else
        echo -e "${YELLOW}⚠ artillery not installed. Install: npm install -g artillery${NC}"
    fi
    
    echo ""
}

check_server() {
    print_header "Checking Server Health"
    
    echo "Testing: $BASE_URL/api/health"
    
    if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" | grep -q "200"; then
        echo -e "${GREEN}✓ Server is healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Server is not responding${NC}"
        echo "Please ensure the server is running at $BASE_URL"
        return 1
    fi
}

run_k6_smoke() {
    print_header "K6 Smoke Test"
    
    if ! command -v k6 &> /dev/null; then
        echo -e "${YELLOW}Skipping: k6 not installed${NC}"
        return
    fi
    
    k6 run \
        --env BASE_URL="$BASE_URL" \
        --out json="$RESULTS_DIR/k6-smoke-$TIMESTAMP.json" \
        --summary-export="$RESULTS_DIR/k6-smoke-summary-$TIMESTAMP.json" \
        load-tests/k6/main.js \
        --scenario smoke
    
    echo -e "${GREEN}✓ K6 smoke test completed${NC}"
}

run_k6_load() {
    print_header "K6 Load Test"
    
    if ! command -v k6 &> /dev/null; then
        echo -e "${YELLOW}Skipping: k6 not installed${NC}"
        return
    fi
    
    k6 run \
        --env BASE_URL="$BASE_URL" \
        --out json="$RESULTS_DIR/k6-load-$TIMESTAMP.json" \
        --summary-export="$RESULTS_DIR/k6-load-summary-$TIMESTAMP.json" \
        load-tests/k6/main.js \
        --scenario load
    
    echo -e "${GREEN}✓ K6 load test completed${NC}"
}

run_k6_stress() {
    print_header "K6 Stress Test"
    
    if ! command -v k6 &> /dev/null; then
        echo -e "${YELLOW}Skipping: k6 not installed${NC}"
        return
    fi
    
    k6 run \
        --env BASE_URL="$BASE_URL" \
        --out json="$RESULTS_DIR/k6-stress-$TIMESTAMP.json" \
        --summary-export="$RESULTS_DIR/k6-stress-summary-$TIMESTAMP.json" \
        load-tests/k6/main.js \
        --scenario stress
    
    echo -e "${GREEN}✓ K6 stress test completed${NC}"
}

run_k6_api() {
    print_header "K6 API Endpoint Tests"
    
    if ! command -v k6 &> /dev/null; then
        echo -e "${YELLOW}Skipping: k6 not installed${NC}"
        return
    fi
    
    k6 run \
        --env BASE_URL="$BASE_URL" \
        --out json="$RESULTS_DIR/k6-api-$TIMESTAMP.json" \
        --summary-export="$RESULTS_DIR/k6-api-summary-$TIMESTAMP.json" \
        load-tests/k6/api-tests.js
    
    echo -e "${GREEN}✓ K6 API tests completed${NC}"
}

run_artillery_smoke() {
    print_header "Artillery Smoke Test"
    
    if ! command -v artillery &> /dev/null; then
        echo -e "${YELLOW}Skipping: artillery not installed${NC}"
        return
    fi
    
    BASE_URL="$BASE_URL" artillery run \
        --output "$RESULTS_DIR/artillery-smoke-$TIMESTAMP.json" \
        load-tests/artillery/smoke.yml
    
    # Generate HTML report
    artillery report \
        --output "$RESULTS_DIR/artillery-smoke-$TIMESTAMP.html" \
        "$RESULTS_DIR/artillery-smoke-$TIMESTAMP.json"
    
    echo -e "${GREEN}✓ Artillery smoke test completed${NC}"
}

run_artillery_load() {
    print_header "Artillery Load Test"
    
    if ! command -v artillery &> /dev/null; then
        echo -e "${YELLOW}Skipping: artillery not installed${NC}"
        return
    fi
    
    BASE_URL="$BASE_URL" artillery run \
        --output "$RESULTS_DIR/artillery-load-$TIMESTAMP.json" \
        load-tests/artillery/main.yml
    
    # Generate HTML report
    artillery report \
        --output "$RESULTS_DIR/artillery-load-$TIMESTAMP.html" \
        "$RESULTS_DIR/artillery-load-$TIMESTAMP.json"
    
    echo -e "${GREEN}✓ Artillery load test completed${NC}"
}

run_artillery_stress() {
    print_header "Artillery Stress Test"
    
    if ! command -v artillery &> /dev/null; then
        echo -e "${YELLOW}Skipping: artillery not installed${NC}"
        return
    fi
    
    BASE_URL="$BASE_URL" artillery run \
        --output "$RESULTS_DIR/artillery-stress-$TIMESTAMP.json" \
        load-tests/artillery/stress.yml
    
    # Generate HTML report
    artillery report \
        --output "$RESULTS_DIR/artillery-stress-$TIMESTAMP.html" \
        "$RESULTS_DIR/artillery-stress-$TIMESTAMP.json"
    
    echo -e "${GREEN}✓ Artillery stress test completed${NC}"
}

show_results() {
    print_header "Test Results"
    
    echo "Results saved to: $RESULTS_DIR"
    echo ""
    ls -la "$RESULTS_DIR"/*$TIMESTAMP* 2>/dev/null || echo "No results found"
}

usage() {
    echo "RTR-MRP Load Test Runner"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  check       Check dependencies and server health"
    echo "  smoke       Run smoke tests (K6 + Artillery)"
    echo "  load        Run load tests (K6 + Artillery)"
    echo "  stress      Run stress tests (K6 + Artillery)"
    echo "  api         Run API endpoint tests (K6)"
    echo "  k6-all      Run all K6 tests"
    echo "  artillery   Run all Artillery tests"
    echo "  all         Run all tests"
    echo ""
    echo "Environment Variables:"
    echo "  BASE_URL    Target URL (default: http://localhost:3000)"
    echo ""
    echo "Examples:"
    echo "  $0 smoke"
    echo "  BASE_URL=https://staging.example.com $0 load"
}

# =============================================================================
# MAIN
# =============================================================================

case "${1:-}" in
    check)
        check_dependencies
        check_server
        ;;
    smoke)
        check_server
        run_k6_smoke
        run_artillery_smoke
        show_results
        ;;
    load)
        check_server
        run_k6_load
        run_artillery_load
        show_results
        ;;
    stress)
        check_server
        run_k6_stress
        run_artillery_stress
        show_results
        ;;
    api)
        check_server
        run_k6_api
        show_results
        ;;
    k6-all)
        check_server
        run_k6_smoke
        run_k6_api
        run_k6_load
        run_k6_stress
        show_results
        ;;
    artillery)
        check_server
        run_artillery_smoke
        run_artillery_load
        run_artillery_stress
        show_results
        ;;
    all)
        check_dependencies
        check_server
        run_k6_smoke
        run_artillery_smoke
        run_k6_api
        run_k6_load
        run_artillery_load
        run_k6_stress
        run_artillery_stress
        show_results
        ;;
    *)
        usage
        ;;
esac

echo ""
echo -e "${GREEN}Done!${NC}"
