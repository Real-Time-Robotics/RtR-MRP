# ROLLBACK PLAN - PHASE 5-6: FRONTEND VIRTUALIZATION

**Phase:** Phase 5-6 - Frontend Virtualization
**Date:** 01/01/2026
**Owner:** Frontend Team

---

## 1. THAY DOI TRONG PHASE NAY

### 1.1 New Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| @tanstack/react-virtual | ^3.x | DOM virtualization |

### 1.2 New Components
| File | Purpose | Rollback Action |
|------|---------|-----------------|
| `src/components/ui/virtualized-table.tsx` | Virtualized table | Delete file |
| `src/components/ui/virtualized-list.tsx` | Virtualized list | Delete file |
| `src/hooks/use-infinite-data.ts` | Infinite scroll hook | Delete file |

---

## 2. DIEU KIEN ROLLBACK

### Tu dong Rollback neu:
- [ ] Virtualization causing visual glitches
- [ ] Scroll performance worse than before
- [ ] Memory usage increasing over time (memory leak)

### Manual Rollback neu:
- [ ] Stakeholder yeu cau
- [ ] Accessibility issues with virtualization
- [ ] Mobile device compatibility issues

---

## 3. QUY TRINH ROLLBACK

### 3.1 Revert to Non-Virtualized Components
```bash
# Remove virtualized components
rm src/components/ui/virtualized-table.tsx
rm src/components/ui/virtualized-list.tsx
rm src/hooks/use-infinite-data.ts

# Revert any pages using virtualized components
git checkout HEAD~1 -- src/app/(dashboard)/production/page.tsx
# (repeat for any updated pages)
```

### 3.2 Remove Dependency (Optional)
```bash
npm uninstall @tanstack/react-virtual
```

### 3.3 Rebuild Application
```bash
npm run build
```

---

## 4. VIRTUALIZATION COMPONENTS

### VirtualizedTable
- Purpose: Render large tables (1000+ rows) efficiently
- Features:
  - Fixed row height virtualization
  - Sticky header support
  - Custom cell renderers
  - Row click handlers
- Performance: Only renders ~20-30 visible rows at a time

### VirtualizedList
- Purpose: Render large lists efficiently
- Features:
  - Variable height support
  - Gap between items
  - Custom item renderers
  - Overscan for smooth scrolling

### InfiniteVirtualizedList
- Purpose: Infinite scroll with virtualization
- Features:
  - Automatic load more on scroll
  - Loading states
  - Cursor-based pagination support

---

## 5. PERFORMANCE EXPECTATIONS

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Initial render (1000 rows) | 2-5s | <100ms | <200ms |
| Scroll performance | Laggy | 60fps | 60fps |
| Memory usage (10k rows) | 500MB+ | ~50MB | <100MB |
| DOM nodes | 10,000+ | ~100 | <200 |

---

## 6. VERIFICATION CHECKLIST

### Truoc khi Deploy:
- [ ] Virtualized components tested with large datasets
- [ ] Scroll performance verified (60fps)
- [ ] Memory usage checked over time
- [ ] Mobile compatibility tested

### Sau khi Deploy:
- [ ] No visual glitches during scroll
- [ ] Fast initial render
- [ ] Smooth scrolling experience
- [ ] Keyboard navigation works

### Sau khi Rollback (if needed):
- [ ] Non-virtualized tables restored
- [ ] Pagination working correctly
- [ ] No missing data

---

## 7. BROWSER SUPPORT

### Tested Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Known Issues
- Safari: May need `-webkit-overflow-scrolling: touch` for mobile

---

**Approved by:** _______________
**Date:** _______________
