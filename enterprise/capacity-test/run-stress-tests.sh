#!/bin/bash
# =============================================================================
# RTR-MRP STRESS & CHAOS TEST RUNNER
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
RESULTS_DIR="$(dirname "$0")/results"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║               RTR-MRP STRESS & CHAOS TEST SUITE                            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}Target: ${BASE_URL}${NC}"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo "Install with: brew install k6"
    exit 1
fi

# Check if server is running
echo -e "${BLUE}Checking server health...${NC}"
if ! curl -sf "${BASE_URL}/api/health" > /dev/null; then
    echo -e "${RED}Error: Server is not responding at ${BASE_URL}${NC}"
    echo "Start the server with: npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ Server is healthy${NC}"
echo ""

# Function to run quick test
run_quick_test() {
    echo -e "${BLUE}Running QUICK stress test (5 min)...${NC}"

    k6 run \
        --env BASE_URL="$BASE_URL" \
        --duration 5m \
        --vus 50 \
        --out json="$RESULTS_DIR/quick-stress-$TIMESTAMP.json" \
        "$(dirname "$0")/capacity-test.js" \
        2>&1 | tee "$RESULTS_DIR/quick-stress-$TIMESTAMP.log"
}

# Function to run chaos test
run_chaos_test() {
    echo -e "${BLUE}Running CHAOS test (22 min)...${NC}"

    k6 run \
        --env BASE_URL="$BASE_URL" \
        --out json="$RESULTS_DIR/chaos-$TIMESTAMP.json" \
        "$(dirname "$0")/chaos-test.js" \
        2>&1 | tee "$RESULTS_DIR/chaos-$TIMESTAMP.log"
}

# Function to run quick chaos test
run_quick_chaos_test() {
    echo -e "${BLUE}Running QUICK chaos test (3 min)...${NC}"

    # Run just the first few scenarios
    k6 run \
        --env BASE_URL="$BASE_URL" \
        --duration 3m \
        --vus 20 \
        --out json="$RESULTS_DIR/quick-chaos-$TIMESTAMP.json" \
        "$(dirname "$0")/chaos-test.js" \
        2>&1 | tee "$RESULTS_DIR/quick-chaos-$TIMESTAMP.log"
}

# Function to run full capacity test
run_full_capacity_test() {
    echo -e "${BLUE}Running FULL capacity test (78 min)...${NC}"

    k6 run \
        --env BASE_URL="$BASE_URL" \
        --out json="$RESULTS_DIR/capacity-full-$TIMESTAMP.json" \
        "$(dirname "$0")/capacity-test.js" \
        2>&1 | tee "$RESULTS_DIR/capacity-full-$TIMESTAMP.log"
}

# Main menu
case "${1:-quick}" in
    quick)
        run_quick_test
        ;;
    chaos)
        run_chaos_test
        ;;
    quick-chaos)
        run_quick_chaos_test
        ;;
    full)
        run_full_capacity_test
        ;;
    all)
        run_quick_test
        echo ""
        run_chaos_test
        ;;
    *)
        echo "Usage: $0 {quick|chaos|quick-chaos|full|all}"
        echo ""
        echo "  quick       - Quick stress test (5 min, 50 VUs)"
        echo "  chaos       - Full chaos test (22 min, various scenarios)"
        echo "  quick-chaos - Quick chaos test (3 min)"
        echo "  full        - Full capacity test (78 min)"
        echo "  all         - Run both quick and chaos tests"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                        TEST COMPLETE                                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Results saved to: $RESULTS_DIR"
echo ""
