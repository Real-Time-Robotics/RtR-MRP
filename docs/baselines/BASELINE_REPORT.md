# Performance Baseline Report

**Generated:** 2026-01-01T07:18:13.994Z
**Environment:** development

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | 10 |
| Passed | 0 |
| Slow | 0 |
| Failed | 10 |
| Avg Response Time | 2ms |
| P95 Response Time | 6ms |

---

## Detailed Results

| Endpoint | Method | Avg (ms) | Min (ms) | Max (ms) | P95 (ms) | Status |
|----------|--------|----------|----------|----------|----------|--------|
| /api/parts | GET | 9 | 1 | 37 | 37 | ❌ fail |
| /api/suppliers | GET | 2 | 1 | 2 | 2 | ❌ fail |
| /api/customers | GET | 2 | 1 | 3 | 3 | ❌ fail |
| /api/work-orders | GET | 1 | 1 | 2 | 2 | ❌ fail |
| /api/sales-orders | GET | 2 | 1 | 2 | 2 | ❌ fail |
| /api/purchase-orders | GET | 1 | 1 | 2 | 2 | ❌ fail |
| /api/inventory | GET | 2 | 1 | 2 | 2 | ❌ fail |
| /api/dashboard/stats | GET | 1 | 1 | 2 | 2 | ❌ fail |
| /api/mrp/planning | GET | 1 | 1 | 2 | 2 | ❌ fail |
| /api/quality/ncrs | GET | 2 | 1 | 3 | 3 | ❌ fail |

---

## Slow Endpoints (Need Optimization)

No slow endpoints detected.

---

## Recommendations

1. Endpoints with response time > 500ms should be optimized
2. Consider adding database indexes for slow queries
3. Implement caching for frequently accessed data
4. Use pagination for list endpoints

---

*This baseline will be used to measure optimization improvements.*
