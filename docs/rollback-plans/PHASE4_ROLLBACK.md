# ROLLBACK PLAN - PHASE 4: RATE LIMITING & CACHE WARMING

**Phase:** Phase 4 - Rate Limiting & Cache Warming
**Date:** 01/01/2026
**Owner:** Backend Team

---

## 1. THAY DOI TRONG PHASE NAY

### 1.1 New Files Created
| File | Purpose | Rollback Action |
|------|---------|-----------------|
| `src/lib/cache/cache-warmer.ts` | Cache warming service | Delete file |
| `src/app/api/cache/warm/route.ts` | Cache warming endpoint | Delete file |

### 1.2 Enhanced Files
| File | Change Description | Git Commit |
|------|-------------------|------------|
| `src/lib/security/rate-limiter.ts` | Added graceful degradation, new configs | Revert |
| `src/app/api/dashboard/route.ts` | Added rate limiting | Revert |
| `src/app/api/production/route.ts` | Added rate limiting | Revert |

---

## 2. DIEU KIEN ROLLBACK

### Tu dong Rollback neu:
- [ ] Legitimate users blocked by rate limiting
- [ ] Cache warming causing performance issues
- [ ] Rate limit errors > 5% of requests

### Manual Rollback neu:
- [ ] Stakeholder yeu cau
- [ ] Rate limits too restrictive
- [ ] Cache warming consuming too much resources

---

## 3. QUY TRINH ROLLBACK

### 3.1 Disable Rate Limiting (Quick Fix)
```typescript
// In rate-limiter.ts, change all limits to very high values
export const rateLimitConfigs = {
  api: { windowMs: 60000, maxRequests: 10000 },
  // ... set all to high values
};
```

### 3.2 Disable Cache Warming
```bash
# Stop scheduled warming if running
# In your startup code, comment out:
# startScheduledWarming();
```

### 3.3 Full Revert
```bash
# Revert rate limiter changes
git checkout HEAD~1 -- src/lib/security/rate-limiter.ts

# Revert API routes
git checkout HEAD~1 -- src/app/api/dashboard/route.ts
git checkout HEAD~1 -- src/app/api/production/route.ts

# Remove new files
rm src/lib/cache/cache-warmer.ts
rm -rf src/app/api/cache/warm
```

---

## 4. RATE LIMIT CONFIGURATIONS

### Current Settings
| Endpoint Type | Window | Max Requests | Purpose |
|--------------|--------|--------------|---------|
| api | 1 min | 100 | General endpoints |
| auth | 1 min | 10 | Authentication |
| login | 5 min | 5 | Login attempts |
| export | 1 min | 5 | Heavy operations |
| ai | 1 min | 20 | AI/ML endpoints |
| dashboard | 1 min | 60 | Dashboard polling |
| list | 1 min | 120 | Paginated lists |
| write | 1 min | 30 | Create/Update/Delete |

### Graceful Degradation Thresholds
- **Warning**: 70% of limit used
- **Critical**: 90% of limit used

---

## 5. CACHE WARMING SCHEDULE

### Default Configuration
- Interval: 5 minutes
- Targets:
  - Dashboard stats (TTL: 60s)
  - Work orders first page (TTL: 30s)
  - Sales orders first page (TTL: 30s)
  - Parts list (TTL: 300s)
  - Suppliers list (TTL: 300s)

---

## 6. VERIFICATION CHECKLIST

### Truoc khi Deploy:
- [ ] Rate limits tested with expected traffic
- [ ] Cache warming runs without errors
- [ ] Graceful degradation tested

### Sau khi Deploy:
- [ ] Rate limit headers present in responses
- [ ] No legitimate users blocked
- [ ] Cache hit rate improved after warming
- [ ] Response times stable

### Sau khi Rollback (if needed):
- [ ] Rate limiting disabled/relaxed
- [ ] Cache warming stopped
- [ ] Normal traffic restored

---

## 7. MONITORING

### Rate Limit Metrics
```bash
# Check response headers
curl -I http://localhost:3000/api/dashboard
# Look for: X-RateLimit-Limit, X-RateLimit-Remaining
```

### Cache Warming Status
```bash
# Trigger manual warming and check results
curl -X POST http://localhost:3000/api/cache/warm
```

---

**Approved by:** _______________
**Date:** _______________
