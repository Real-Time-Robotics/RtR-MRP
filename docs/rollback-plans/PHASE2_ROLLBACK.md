# ROLLBACK PLAN - PHASE 2: SERVER-SIDE PAGINATION

**Phase:** Phase 2 - Server-side Pagination
**Date:** 01/01/2026
**Owner:** Backend Team

---

## 1. THAY DOI TRONG PHASE NAY

### 1.1 New Files Created
| File | Purpose | Rollback Action |
|------|---------|-----------------|
| `src/lib/pagination.ts` | Pagination utilities | Delete file |
| `src/hooks/use-paginated-data.ts` | React hook for paginated data | Delete file |
| `src/components/ui/pagination.tsx` | Pagination UI component | Delete file |

### 1.2 API Route Changes
| File | Change Description | Git Commit |
|------|-------------------|------------|
| `src/app/api/production/route.ts` | Added pagination to GET work orders | TBD |
| `src/app/api/orders/route.ts` | Added pagination to GET sales orders | TBD |
| `src/app/api/parts/route.ts` | Added pagination to GET parts | TBD |
| `src/app/api/suppliers/route.ts` | Added pagination to GET suppliers | TBD |

### 1.3 Frontend Changes
| File | Change Description | Git Commit |
|------|-------------------|------------|
| `src/app/(dashboard)/production/page.tsx` | Use paginated hook + UI | TBD |

---

## 2. DIEU KIEN ROLLBACK

### Tu dong Rollback neu:
- [ ] API response format breaks frontend components
- [ ] Error rate > 10% on affected endpoints
- [ ] P95 latency > 5s for paginated queries

### Manual Rollback neu:
- [ ] Stakeholder yeu cau
- [ ] Data inconsistency detected
- [ ] Frontend rendering issues

---

## 3. QUY TRINH ROLLBACK

### 3.1 Revert API Routes
```bash
# Revert all API route changes
git checkout HEAD~1 -- src/app/api/production/route.ts
git checkout HEAD~1 -- src/app/api/orders/route.ts
git checkout HEAD~1 -- src/app/api/parts/route.ts
git checkout HEAD~1 -- src/app/api/suppliers/route.ts
```

### 3.2 Revert Frontend
```bash
# Revert production page
git checkout HEAD~1 -- src/app/(dashboard)/production/page.tsx
```

### 3.3 Remove New Files (Optional)
```bash
# These files don't affect old code, but can be removed
rm src/lib/pagination.ts
rm src/hooks/use-paginated-data.ts
rm src/components/ui/pagination.tsx
```

### 3.4 Rebuild Application
```bash
npm run build
npm run start
```

---

## 4. API RESPONSE FORMAT

### Before (No Pagination)
```json
[
  { "id": "wo-1", "woNumber": "WO-00001", ... },
  { "id": "wo-2", "woNumber": "WO-00002", ... }
]
```

### After (With Pagination)
```json
{
  "data": [
    { "id": "wo-1", "woNumber": "WO-00001", ... }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalItems": 20302,
    "totalPages": 407,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "meta": {
    "took": 45,
    "cached": false
  }
}
```

---

## 5. VERIFICATION CHECKLIST

### Truoc khi Deploy:
- [ ] All API tests pass
- [ ] Frontend components handle new response format
- [ ] No breaking changes to mobile/external clients

### Sau khi Deploy:
- [ ] Production page loads correctly
- [ ] Pagination controls work (next, prev, page size)
- [ ] Search and filter work with pagination
- [ ] Response times improved (< 500ms for paginated queries)

### Sau khi Rollback (if needed):
- [ ] API returns array format again
- [ ] Production page displays all data
- [ ] No errors in console

---

## 6. PERFORMANCE EXPECTATIONS

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Work Orders API response | ~8-15s | <500ms | <1s |
| Sales Orders API response | ~3-5s | <300ms | <500ms |
| Parts API response | ~1-2s | <200ms | <300ms |
| Initial page load | ~10s | <2s | <3s |

---

**Approved by:** _______________
**Date:** _______________
