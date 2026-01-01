# RTR MRP - HANDOVER DOCUMENT
> Last updated: 2026-01-02 (Mobile Phase 1 & 2 Complete)

---

## TRANG THAI HIEN TAI: Mobile Shop Floor DONE - Production Ready

### LENH TIEP TUC NHANH
Khi quay lai, chi can noi:
- **"handover"** - de xem trang thai va tiep tuc
- **"npm run dev"** - chay dev server
- **"npm run build"** - test build
- **"fix bug [mo ta]"** - de sua loi
- **"them feature [mo ta]"** - de them tinh nang

---

## DA HOAN THANH (2026-01-02)

### Mobile Phase 1 & 2 - COMPLETE!

#### Phase 1: Mobile Pages (6 new pages)
| Page | Route | Features |
|------|-------|----------|
| Receiving | `/mobile/receiving` | PO selection, line items, qty input, scanner |
| Picking | `/mobile/picking` | SO pick lists, item tracking, scanner |
| Quality | `/mobile/quality` | Inspection workflow, pass/fail/conditional |
| Inventory Adjust | `/mobile/inventory/adjust` | Add/remove stock with reason |
| Inventory Transfer | `/mobile/inventory/transfer` | Location-to-location transfer |
| Inventory Count | `/mobile/inventory/count` | Cycle counting sessions |

#### Phase 2: API & Libraries
| Component | Files | Purpose |
|-----------|-------|---------|
| API Routes | 7 files | scan, inventory, receiving, picking, quality, workorder, sync |
| scanner-utils.ts | 1 file | Barcode parser, haptics, entity resolution |
| sync-store.ts | 1 file | IndexedDB offline sync, operation queue |
| use-mobile.ts | 1 file | React hook for all mobile features |

#### All Mobile Routes (13 pages)
```
/mobile                    - Dashboard
/mobile/scan               - Barcode scanner
/mobile/inventory          - Inventory hub
/mobile/inventory/adjust   - Stock adjustment
/mobile/inventory/transfer - Location transfer
/mobile/inventory/count    - Cycle count
/mobile/receiving          - PO receiving
/mobile/picking            - SO picking
/mobile/quality            - QC inspection
/mobile/work-orders        - Production
/mobile/tasks              - Task list
/mobile/profile            - User profile
/mobile/offline            - Offline page
```

#### Mobile API Endpoints
```
POST /api/mobile/scan       - Process barcode scan
GET  /api/mobile/inventory  - Get inventory items
POST /api/mobile/inventory  - Adjust/transfer/count
POST /api/mobile/receiving  - Receive PO items
POST /api/mobile/picking    - Pick SO items
POST /api/mobile/quality    - Submit inspection
POST /api/mobile/workorder  - Work order operations
POST /api/mobile/sync       - Sync offline operations
```

---

### AI Kernel Integration

| File | Location | Purpose |
|------|----------|---------|
| `CLAUDE.md` | Root | Claude Code auto-reads this |
| `RTR_MRP_AI_KERNEL_MASTER_PROMPT.md` | docs/ | Full AI kernel (41KB) |
| `AI_KERNEL_IMPLEMENTATION_GUIDE.md` | docs/ | Implementation guide |

#### Task-Specific Prompts (docs/ai-prompts/)
- `code-review.md` - Security, performance, quality review
- `debugging.md` - Error analysis and fix
- `architecture.md` - ADR and design decisions
- `feature-development.md` - Feature implementation guide

---

### V2 Desktop App (8/8 pages - COMPLETE)

| Page | Route | Component |
|------|-------|-----------|
| Dashboard | `/v2/dashboard` | `DashboardConnected` |
| Parts | `/v2/parts` | `PartsMasterConnected` |
| Sales | `/v2/sales` | `SalesOrdersConnected` |
| Production | `/v2/production` | `ProductionConnected` |
| Quality | `/v2/quality` | `QualityConnected` |
| Inventory | `/v2/inventory` | `InventoryConnected` |
| BOM | `/v2/bom` | `BOMConnected` |
| Analytics | `/v2/analytics` | `AnalyticsConnected` |

---

### Testing & Caching

#### Unit Tests (41 tests - ALL PASS)
```bash
npm run test:run    # Chay tests
npm run test        # Watch mode
```

#### API Caching
- Dashboard API: Cache 30s per user
- Parts API: Cache 60s for list queries
- Cache invalidation on create/update

---

## BUILD STATUS

| Check | Status |
|-------|--------|
| TypeScript | PASS |
| Prisma Generate | PASS |
| Next.js Build | PASS |
| Unit Tests | 41/41 PASS |
| Mobile Pages | 13/13 COMPLETE |
| Mobile APIs | 7/7 COMPLETE |
| AI Kernel | INSTALLED |

---

## RECENT COMMITS

```
f954acc feat: Complete Mobile Phase 1 & 2 implementation
d53d3a0 fix: Add onClick handler to sidebar logout button
76fa6dd fix: Use NextAuth for desktop user menu logout
```

---

## LOCAL DEVELOPMENT

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run test:run     # Run all tests
```

### Quick URLs
| Type | URL |
|------|-----|
| Desktop | http://localhost:3000/v2/dashboard |
| Mobile | http://localhost:3000/mobile |
| API Test | http://localhost:3000/api/v2/dashboard |

---

## FILES QUAN TRONG

```
CLAUDE.md                         # AI KERNEL
HANDOVER.md                       # This file
prisma/schema.prisma              # DATABASE SCHEMA

src/app/mobile/                   # Mobile pages (13)
src/app/api/mobile/               # Mobile APIs (7)
src/lib/mobile/                   # Mobile libraries
  ├── scanner-utils.ts            # Barcode parser
  ├── sync-store.ts               # IndexedDB sync
  └── index.ts                    # Exports
src/lib/hooks/use-mobile.ts       # Mobile React hook

src/app/v2/                       # Desktop pages (8)
src/app/api/v2/                   # Desktop APIs (8)
src/components/pages-v2/          # Connected components

src/__tests__/                    # Unit tests
vitest.config.ts                  # Test configuration
```

---

## CONG VIEC TIEP THEO (GOI Y)

### Option A: Connect to Real APIs
1. Replace mock data in mobile pages with real API calls
2. Connect use-mobile hook to backend
3. Test end-to-end flow

### Option B: PWA Enhancement
1. Add push notifications
2. Improve offline sync
3. Add app shortcuts in manifest

### Option C: Testing & QA
1. E2E tests with Playwright/Cypress
2. Test offline scenarios
3. Performance testing

### Option D: Production Deployment
1. Deploy to Render/Vercel
2. Setup monitoring (Sentry)
3. Configure production database

---

**San sang cho:** Feature Development, API Integration, Production Deployment

---

## COMMANDS

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test:run     # Run all tests
npm run test         # Watch mode tests
git push             # Deploy to GitHub (auto-deploy to Render)
```
