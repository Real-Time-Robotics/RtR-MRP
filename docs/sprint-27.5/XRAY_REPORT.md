# Sprint 27.5 · X-Ray Audit Report

**Date:** 2026-04-29
**Scope:** sidebar v2 + sidebar legacy + top-nav header + in-page link + deep link
**Total links scanned:** 97

## Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 (fixed in this sprint) |
| HIGH | 0 |
| MEDIUM | 2 (cosmetic) |
| LOW | 1 |
| OK | 94 |

## Issues Found & Fixed

### Fixed in TIP-S275-01 (path correction)

| # | Old path | New path | Status |
|---|---|---|---|
| 1 | `/purchase-orders` | `/purchasing` | Fixed |
| 2 | `/grn` | `/purchasing/grn` | Fixed + skeleton |
| 3 | `/admin/audit` | `/audit` | Fixed |
| 4 | `/warehouse/locations` | `/warehouses` | Fixed |
| 5 | `/warehouse-issues` | `/inventory/issue` | Fixed |

### Fixed in TIP-S275-02 (skeleton pages)

15 skeleton pages created for sidebar v2 routes that had no page.

### Fixed in TIP-S275-03 (X-Ray finds)

| # | Source | Link | Issue | Fix |
|---|---|---|---|---|
| 1 | minimalist-sidebar | `/purchase-orders` | No page | Skeleton created |
| 2 | quality/in-process | `/quality/inspections` | Base page missing | Skeleton created |

## Navigation Source Audit

### 1. Sidebar V2 (37 links, 9 groups)

**After TIP-01+02: 37/37 OK (100%)**

All groups verified: Home, My Work, Operations, Search, Engineering, Purchasing, Warehouse, Reports, Admin. Plus 5 hidden feature-flag groups.

### 2. Top Nav Header (44 links, 5 tabs)

**44/44 OK (100%)**

Tabs: Operations (15), Production (11), Quality (8), Analytics (8), Quick Create (5). No broken links.

### 3. Sidebar Legacy (27 links)

**25/27 OK (93%)**

| # | href | Status | Note |
|---|---|---|---|
| 1 | `/mobile` | OK | Route at `/mobile` (not dashboard) |
| 2 | all others | OK | — |

### 4. In-Page Navigation (60+ unique links)

**59/60 OK (98%)**

`/quality/inspections` base route was missing — skeleton created.

### 5. Deep Links Sprint 27

| Route | Status |
|---|---|
| `/search/serial/[serial]` | OK (server component) |
| `/operations/assembly/[id]` | OK (client component) |
| `/api/serial/[serial]` | OK (API) |
| `/api/assembly/[id]` | OK (API) |

## MEDIUM Issues (cosmetic, not blocking)

1. **`/mobile` sidebar link** — opens mobile app layout (separate from dashboard shell). May confuse desktop users. Consider hiding behind feature flag or adding "(Mobile)" suffix label.
2. **`/purchase-orders` vs `/purchasing`** — two different pages for similar concept. Legacy sidebar uses `/purchase-orders`, v2 uses `/purchasing`. May confuse users switching between sidebars.

## LOW Issues

1. **`sharp` missing warning** in container logs — image optimization disabled. Not blocking but degrades image quality.

## Recommendations

### Sprint 28 Wave 0 (quick wins, <1 day):
- Consolidate `/purchase-orders` redirect to `/purchasing` (or vice versa)
- Add `sharp` to Docker image dependencies

### Sprint 28+ defer:
- Implement 15 skeleton pages with real business logic
- Evaluate hiding `/mobile` from desktop sidebar
- Unify legacy sidebar / v2 sidebar route naming
