# ROLLBACK PLAN - PHASE 3: CACHING LAYER

**Phase:** Phase 3 - Redis/Memory Cache Setup
**Date:** 01/01/2026
**Owner:** Backend Team

---

## 1. THAY DOI TRONG PHASE NAY

### 1.1 Enhanced Cache Module
| File | Change Description | Rollback Action |
|------|-------------------|-----------------|
| `src/lib/cache/redis.ts` | Added cacheKeys, cacheTTL, cachePatterns, stats | Revert to previous version |
| `src/app/api/cache/stats/route.ts` | New cache stats endpoint | Delete file |

### 1.2 API Routes with Caching
| File | Change Description | Git Commit |
|------|-------------------|------------|
| `src/app/api/production/route.ts` | Added cache to GET, invalidation in POST | TBD |
| `src/app/api/dashboard/route.ts` | Added caching with 1-minute TTL | TBD |

---

## 2. DIEU KIEN ROLLBACK

### Tu dong Rollback neu:
- [ ] Cache causing data inconsistency
- [ ] Stale data shown after updates
- [ ] Memory usage > 80% on server
- [ ] Cache-related errors > 5% of requests

### Manual Rollback neu:
- [ ] Stakeholder yeu cau
- [ ] Cache hit rate < 10% (ineffective)
- [ ] Unexpected behavior from cached data

---

## 3. QUY TRINH ROLLBACK

### 3.1 Clear All Cache (Immediate)
```bash
# If cache is causing issues, clear it first
curl -X POST http://localhost:3000/api/cache/stats \
  -H "Content-Type: application/json" \
  -d '{"action": "clear"}'
```

### 3.2 Revert Code Changes
```bash
# Remove caching from API routes
git checkout HEAD~1 -- src/app/api/production/route.ts
git checkout HEAD~1 -- src/app/api/dashboard/route.ts
git checkout HEAD~1 -- src/lib/cache/redis.ts

# Remove new endpoint
rm -rf src/app/api/cache/stats
```

### 3.3 Rebuild Application
```bash
npm run build
npm run start
```

---

## 4. CACHE CONFIGURATION

### TTL Settings
| Cache Type | TTL | Use Case |
|------------|-----|----------|
| SHORT | 30s | Work orders, frequently changing data |
| MEDIUM | 60s | Dashboard stats, list summaries |
| STANDARD | 5m | Parts catalog, reference data |
| LONG | 1h | Static configuration |
| EXTENDED | 24h | Rarely changing reference data |

### Cache Key Patterns
- `mrp:work-orders:*` - Work order list queries
- `mrp:sales-orders:*` - Sales order list queries
- `mrp:dashboard:*` - Dashboard statistics
- `mrp:parts:*` - Parts catalog queries

---

## 5. VERIFICATION CHECKLIST

### Truoc khi Deploy:
- [ ] Cache clear endpoint working
- [ ] TTL values appropriate for data freshness needs
- [ ] Cache invalidation tested on write operations

### Sau khi Deploy:
- [ ] Cache hit rate > 30% after warm-up
- [ ] Response times improved for cached endpoints
- [ ] No stale data issues reported
- [ ] Memory usage stable

### Sau khi Rollback (if needed):
- [ ] All cache cleared
- [ ] API routes returning fresh data
- [ ] Response times at baseline (slower but accurate)

---

## 6. PERFORMANCE EXPECTATIONS

| Metric | Without Cache | With Cache | Target |
|--------|---------------|------------|--------|
| Dashboard API | 200-500ms | <50ms | <100ms |
| Work Orders List | 300-800ms | <100ms | <200ms |
| Cache Hit Rate | N/A | >50% | >60% |
| Memory Usage | Baseline | +50-100MB | <200MB added |

---

## 7. MONITORING

### Cache Metrics to Monitor
```bash
# Get cache stats
curl http://localhost:3000/api/cache/stats
```

### Expected Response
```json
{
  "success": true,
  "stats": {
    "hits": 1234,
    "misses": 456,
    "hitRate": 73,
    "timestamp": "2026-01-01T12:00:00.000Z"
  }
}
```

---

**Approved by:** _______________
**Date:** _______________
