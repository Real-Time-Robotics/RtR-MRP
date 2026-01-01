# RTR MRP - HANDOVER DOCUMENT
> Last updated: 2026-01-01 (AI Kernel + Mobile Upgrade Package)

---

## TRANG THAI HIEN TAI: Production Ready + Mobile Upgrade Package Available

### LENH TIEP TUC NHANH
Khi quay lai, chi can noi:
- **"continue"** / **"tiep tuc"** / **"handover"** - de tiep tuc cong viec
- **"kiem tra deployment"** - de xem trang thai Render
- **"fix bug [mo ta]"** - de sua loi
- **"them feature [mo ta]"** - de them tinh nang

---

## DA HOAN THANH (2026-01-01)

### NEW: Mobile Upgrade Package (LATEST)

#### Gói nâng cấp Mobile Shop Floor đã sẵn sàng!

**Location:** `docs/mobile-upgrade/`

| Folder | Nội dung |
|--------|----------|
| `01_CODER_PACK/` | Đặc tả kỹ thuật đầy đủ (2000+ dòng) |
| `02_EXISTING_CODE/` | PWA components, manifest, service worker |
| `03_GUIDES/` | Hướng dẫn thi công + Barcode scanner reference |
| `04_CHECKLIST/` | 100+ checkbox từng bước |

#### Features (20-27 ngày):
- PWA installable (Android/iOS)
- Camera barcode scanner (@zxing/library)
- Mobile Inventory (adjust, transfer, count)
- Mobile Receiving (PO workflow)
- Mobile Picking (pick lists)
- Work Orders mobile
- Offline support với sync

#### Bắt đầu:
```bash
# 1. Đọc README
cat docs/mobile-upgrade/README.md

# 2. Follow checklist
cat docs/mobile-upgrade/04_CHECKLIST/CHECKLIST_THI_CONG.md

# 3. Copy code từ CODER_PACK
cat docs/mobile-upgrade/01_CODER_PACK/CODER_PACK_PHASE12.md
```

---

### AI Kernel Integration

#### Files Installed
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

#### Usage
```bash
# Claude Code auto-reads CLAUDE.md
claude "Add new feature X"

# Or use specific prompt
claude --context docs/ai-prompts/code-review.md "Review src/app/api/v2/parts"

# Test context
claude "What project are you working on?"
# → Should answer: RTR-MRP
```

---

### Route Integration + Caching + Unit Tests

#### A. Route Integration (8/8 pages - COMPLETE)
Tat ca V2 pages da chuyen sang su dung connected components:

| Page | Route | Component | Status |
|------|-------|-----------|--------|
| Dashboard | `/v2/dashboard` | `DashboardConnected` | OK (da co) |
| Parts | `/v2/parts` | `PartsMasterConnected` | OK (moi) |
| Sales | `/v2/sales` | `SalesOrdersConnected` | OK (moi) |
| Production | `/v2/production` | `ProductionConnected` | OK (moi) |
| Quality | `/v2/quality` | `QualityConnected` | OK (moi) |
| Inventory | `/v2/inventory` | `InventoryConnected` | OK (moi) |
| BOM | `/v2/bom` | `BOMConnected` | OK (moi) |
| Analytics | `/v2/analytics` | `AnalyticsConnected` | OK (moi) |

#### B. API Caching (COMPLETE)
- Dashboard API: Cache 30s per user (`v2:dashboard:{userId}`)
- Parts API: Cache 60s cho list queries (ko search)
- Cache invalidation khi create new part

#### C. Unit Tests (41 tests - ALL PASS)
```bash
npm run test:run    # Chay tests
npm run test        # Watch mode
```

| Test File | Tests | Status |
|-----------|-------|--------|
| `cache.test.ts` | 14 | PASS |
| `validation.test.ts` | 27 | PASS |

**Test Coverage:**
- Cache get/set/delete/deletePattern/getOrSet
- Cache statistics (hits/misses/hitRate)
- Cache key builders
- Pagination/Sort/Search schemas
- Part query & create schemas
- Date range validation

---

## DA HOAN THANH (2025-12-31)

### 0. UI-API Integration (8/8 pages)
Tao 8 Connected Pages su dung hooks tu `use-data.ts`:

| Page | File | Hook | Status |
|------|------|------|--------|
| Dashboard | `dashboard-connected.tsx` | `useDashboard()` | OK |
| Parts | `parts-master-connected.tsx` | `useParts()` | OK |
| Sales | `sales-orders-connected.tsx` | `useSalesOrders()` | OK |
| Production | `production-connected.tsx` | `useWorkOrders()` | OK |
| Quality | `quality-connected.tsx` | `useNCRs()` | OK |
| Inventory | `inventory-connected.tsx` | `useInventory()` | OK |
| BOM | `bom-connected.tsx` | `useBOMs()`, `useBOM()` | OK |
| Analytics | `analytics-connected.tsx` | `useAnalytics*()` | OK |

**Features:**
- Loading skeletons cho tung page
- Error states voi retry buttons
- Dark mode support (Tailwind dark:)
- Pagination, filtering, search
- Detail panels cho selected items
- Kanban/List view modes (Sales, Production, Quality)

### 1. Fix Prisma Schema Mismatches (CRITICAL)
Tat ca field names da duoc align voi `prisma/schema.prisma`:

| Model | Field Cu | Field Dung |
|-------|----------|------------|
| **Customer** | email | contactEmail |
| **Customer** | phone | contactPhone |
| **Customer** | address | billingAddress |
| **SalesOrder** | soNumber | orderNumber |
| **SalesOrder** | requestedDate | requiredDate |
| **SalesOrderLine** | discountPercent | discount |
| **WorkOrder** | dueDate | plannedEnd |
| **WorkOrder** | completionDate | actualEnd |
| **WorkOrder** | startDate | plannedStart |
| **WorkOrderOperation** | operationSeq | operationNumber |
| **WorkOrderOperation** | operationName | name |
| **Part** | minStock | minStockLevel |
| **Part** | critical | isCritical |
| **Part** | primarySupplier | partSuppliers (relation) |
| **Part** | inventoryItems | inventory |
| **BomLine** | productId | bomId |
| **BomLine** | module | moduleName |
| **BomLine** | critical | isCritical |
| **NCR** | capas | capa (singular) |
| **NCR** | costImpact | totalCost |
| **NCR** | dateCreated | createdAt |
| **CAPA** | dueDate | targetDate |
| **PartSupplier** | isPrimary | isPreferred |

### 2. Fix TypeScript Errors
| File | Van de | Cach fix |
|------|--------|----------|
| `card-animated.tsx` | Interface conflict | `Omit<HTMLAttributes, 'title'>` |
| `error-handler.ts` | ZodError API | `.errors` → `.issues` |
| `schemas.ts` | ZodError API | `.errors` → `.issues` |
| `sanitize.ts` | Map iteration | `for...of` → `forEach` |

### 3. API Routes V2 (8/8 routes - 100%)
| API | File | Status |
|-----|------|--------|
| Dashboard | `src/app/api/v2/dashboard/route.ts` | OK |
| Parts | `src/app/api/v2/parts/route.ts` | OK |
| Sales | `src/app/api/v2/sales/route.ts` | OK |
| Production | `src/app/api/v2/production/route.ts` | OK |
| Quality | `src/app/api/v2/quality/route.ts` | OK |
| Inventory | `src/app/api/v2/inventory/route.ts` | OK |
| BOM | `src/app/api/v2/bom/route.ts` | OK |
| Analytics | `src/app/api/v2/analytics/route.ts` | OK |

---

## DEPLOYMENT INFO

### Render.com
- **Web Service:** Auto-deploy tu GitHub `main` branch
- **Database:** PostgreSQL (managed by Render)
- **Build Command:** `npm run build`
- **Start Command:** `npm start`

### Environment Variables (Render Dashboard)
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-app.onrender.com
```

### Git Workflow
```bash
# Sua code
npm run build                 # Test build local
git add -A && git commit -m "message"
git push                      # Auto deploy to Render
```

---

## LOCAL DEVELOPMENT

### Start Dev Server
```bash
npm run dev                   # http://localhost:3000 (hoac 3001, 3002)
```

### V2 Pages
| Page | URL |
|------|-----|
| Dashboard | http://localhost:3000/v2/dashboard |
| Parts | http://localhost:3000/v2/parts |
| Sales | http://localhost:3000/v2/sales |
| Production | http://localhost:3000/v2/production |
| Quality | http://localhost:3000/v2/quality |
| Inventory | http://localhost:3000/v2/inventory |
| BOM | http://localhost:3000/v2/bom |
| Analytics | http://localhost:3000/v2/analytics |

### Test API
```bash
curl --http1.1 -s "http://localhost:3000/api/v2/dashboard"
curl --http1.1 -s "http://localhost:3000/api/v2/inventory?pageSize=10"
```

---

## TROUBLESHOOTING

### Build Fail - Prisma Error
```bash
npx prisma generate           # Regenerate client
# Kiem tra field names trong prisma/schema.prisma
```

### Build Fail - TypeScript
- ZodError dung `.issues` KHONG phai `.errors`
- Interface extends HTMLAttributes? Dung `Omit<>`
- Map iteration? Dung `forEach` thay vi `for...of`

### Database Issues
```bash
npx prisma db push            # Push schema to DB
npx prisma studio             # Open DB GUI
```

---

## CONG VIEC TIEP THEO (GOI Y)

### Option A: Testing & QA
1. Test CRUD operations tren tat ca pages
2. Test edge cases (empty data, errors, slow network)
3. E2E tests voi Playwright/Cypress

### Option B: Them tinh nang
1. Real-time updates (WebSocket)
2. Export PDF/Excel
3. Email notifications
4. Advanced reporting

### Option C: Production Deployment
1. Deploy to Render/Vercel
2. Setup monitoring (Sentry)
3. Configure production database
4. SSL certificate

---

## FILES QUAN TRONG

```
CLAUDE.md                     # AI KERNEL - Claude Code reads this!
prisma/schema.prisma          # DATABASE SCHEMA (SOURCE OF TRUTH)
src/app/api/v2/               # API routes (with caching)
src/lib/hooks/use-data.ts     # Data fetching hooks
src/lib/cache/redis.ts        # Cache layer (memory/Redis)
src/lib/validation/schemas.ts # Zod validation schemas
src/app/v2/                   # V2 UI pages (connected)
src/components/pages-v2/      # V2 components
  ├── *-connected.tsx         # Connected pages (8 files)
  └── *.tsx                   # Original mock pages
src/__tests__/                # Unit tests
  ├── cache.test.ts           # Cache tests
  └── validation.test.ts      # Validation tests
docs/
  ├── RTR_MRP_AI_KERNEL_MASTER_PROMPT.md  # Full AI kernel
  ├── AI_KERNEL_IMPLEMENTATION_GUIDE.md   # Implementation guide
  └── ai-prompts/             # Task-specific prompts
      ├── code-review.md
      ├── debugging.md
      ├── architecture.md
      └── feature-development.md
vitest.config.ts              # Test configuration
.env                          # Local env vars
HANDOVER.md                   # This file
```

---

## RECENT COMMITS

```
e6897e5 fix: Comprehensive Prisma schema alignment for production build
f419fc2 Fix Part field names: minStock → minStockLevel
5aa4bdd Fix SalesOrder field name: soNumber → orderNumber
f4968a9 Fix Inventory field names
85dedf5 Fix WorkOrder field names in analytics API
```

---

## BUILD STATUS

| Check | Status |
|-------|--------|
| TypeScript | PASS |
| Prisma Generate | PASS |
| Next.js Build | PASS |
| Unit Tests | 41/41 PASS |
| API Caching | ACTIVE |
| Route Integration | 8/8 COMPLETE |
| AI Kernel | INSTALLED |

---

**San sang cho:** AI-Assisted Development, Feature Development, Production Deployment

---

## COMMANDS

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test:run     # Run all tests
npm run test         # Watch mode tests
```
