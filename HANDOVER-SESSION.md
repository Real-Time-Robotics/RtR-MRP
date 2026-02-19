# HANDOVER - RTR-MRP Development Session
> **Last Updated:** 2026-02-19 (Vietnam Time)
> **Session:** Sprint 28 — Runtime Bug Fixes (Webpack, React Warnings, API Contracts, Rate Limiting)
> **Latest Commit:** `970623a` - fix: resolve duplicate lotNumber column key in warehouse detail page
> **Branch:** `main`
> **Deploy:** Render LIVE
> **Total Commits:** 252

---

## TONG QUAN TINH TRANG DU AN — 16/02/2026

### Tinh trang hien tai: Runtime Bug Fixes Complete

Du an RTR-MRP da hoan thanh cac moc chinh sau:

| Moc | Tinh trang | Ngay hoan thanh |
|-----|------------|-----------------|
| Sprint 1: Core MRP | DONE | 01/2026 |
| Sprint 2: AI Phase 1-3 (Forecast, Quality, Auto-PO, Alerts) | DONE | 01/2026 |
| Sprint 3: Intelligence & Polish | DONE | 02/04/2026 |
| Bug Fixes tu Customer Feedback (6 bugs) | DONE | 01/21/2026 |
| SONG ANH 1:1 — Full Column Mapping (6 tables) | DONE | 01/21/2026 |
| UI Improvements (Dark mode, Demo badge, PWA) | DONE | 01/21–01/24/2026 |
| Advanced Analytics (Power BI-level dashboards) | DONE | 01/30/2026 |
| AI Smart Import Engine (Vietnamese headers) | DONE | 02/02–02/03/2026 |
| Supplier enhancements (Tax ID, Secondary suppliers) | DONE | 02/05/2026 |
| Warehouse Management System (4-warehouse + SCRAP) | DONE | 02/06–02/09/2026 |
| Receiving Inspection Pipeline (PO→QC→Warehouse) | DONE | 02/06/2026 |
| Production Data Sync (Local → Render) | DONE | 02/06/2026 |
| Warehouse Approval Flow (Production→Kho confirm) | DONE | 02/11/2026 |
| PDF Generation (PO, Invoice, Packing List, WO) | DONE | 02/11/2026 |
| Shipment System (SO→Xuất kho→Lot selection) | DONE | 02/12/2026 |
| BOM Explosion → Create PO flow | DONE | 02/12/2026 |
| Button/Checkbox UI standardization | DONE | 02/12/2026 |
| Audit Trail connected to 8 API routes | **DONE** | 02/13/2026 |
| Partial Shipment (xuat kho tung dong) | **DONE** | 02/13/2026 |
| Complete i18n System (Vietnamese/English toggle) | **DONE** | 02/14/2026 |
| Phase A+B Warehouse Flows (Hold, Scrap, NCR disposition) | **DONE** | 02/15/2026 |
| Feature Flags System | **DONE** | 02/15/2026 |
| AI Smart Import v2 + Scheduled Reports + Gantt Chart | **DONE** | 02/15/2026 |
| Prismy Design System (CSS tokens, theme alignment) | **DONE** | 02/16/2026 |
| Loading Pages (skeleton states) | **DONE** | 02/15/2026 |
| Sprints 19-27: Security, Tests, Perf, Code Quality | **DONE** | 02/17-18/2026 |
| Sprint 28: Runtime Bug Fixes (Webpack, React, API) | **DONE** | 02/19/2026 |
| **Sprint 5: SWR/API hooks migration** | IN PROGRESS | — |
| **Sprint 5: Approval Workflows (PO, WO)** | TODO | — |

### So lieu du an (Verified 02/19)

| Metric | Value |
|--------|-------|
| **Prisma Schema** | 5,702 dong |
| **Models** | 154 |
| **Enums** | 27 |
| **API Routes** | 273 route.ts files |
| **Total Commits** | 252 |
| **Lines of Code** | 310K+ |
| **Database** | 59 parts, 33 inventory, 5 warehouses |
| **Production** | https://rtr-mrp.onrender.com |
| **Git Status** | Branch `main` — clean |

### Cong viec da lam tu 21/01 den 16/02 (63 commits)

#### 01/21 — Bug Fixes & UI
- Fix 6 bugs tu customer feedback (leading zeros, part form tabs, default lead time, PO line qty, AI error explainer)
- SONG ANH 1:1 cho 6 data tables (Parts ~30 cols, Suppliers +6, Customers +4, PO +2, SO +3, Inventory +5)
- Dark mode support cho landing page + demo page
- Demo badge compact + PWA update popup fix

#### 01/24 — UI & Quality
- Inventory grid scroll fix
- UI contrast improvements, supplier filter, PO auto-number
- Quality module fixes

#### 01/30 — Analytics & Testing
- Advanced Analytics module (Power BI-level dashboards, KPIs)
- Workflow automation + unit tests
- AI scheduler tests alignment

#### 02/02–02/03 — AI Smart Import
- AI Smart Import Engine cho Excel imports (Vietnamese headers, auto-mapping, duplicate detect)
- Integration vao ImportWizard UI
- Unit tests cho AI Smart Import

#### 02/04 — Sprint 3 Complete
- Sprint 3: Intelligence & Polish features DONE
- Part form UX improvements (smart navigation, searchable dropdowns)
- Report Scheduler
- Multiple build fixes (Zod compatibility, Prisma JSON, Buffer/Uint8Array, nodemailer)

#### 02/05 — Supplier & Inventory
- Tax ID field cho suppliers (duplicate warning)
- Secondary suppliers field trong Part form + detail + Excel export
- Lot Number display trong inventory table
- Inventory adjustment preview (quantity after change)
- SavedView/SavedReport schema fixes

#### 02/06 — Warehouse Pipeline (MAJOR)
- **4-Warehouse System** (WH-MAIN, WH-RECEIVING, WH-HOLD, WH-QUARANTINE)
- **Receiving Inspection Pipeline** (PO → RECEIVING → QC → MAIN/HOLD/QUARANTINE)
- **Inventory Transfer System** (partial/full, audit trail)
- **Lot Number Management** (auto-generate, editable)
- **Data Integrity Fixes** + Ghost record cleanup
- **Production Data Sync** (pg_dump/pg_restore Local → Render)
- **ensure-warehouses.ts** build-time script

#### 02/11 — Warehouse Approval + PDF + BOM + Material Issue (MAJOR)
- **Warehouse Approval Flow**: ProductionReceipt model (PENDING/CONFIRMED/REJECTED)
  - Production tao phieu PENDING, Kho confirm/reject
  - Inventory chi update khi warehouse confirmed
  - WO detail hien thi 3-state receipt status
  - Warehouse detail them tab "Phieu cho nhap kho" voi confirm/reject actions
- **PDF Generation**: 4 document types (PO, Invoice, Packing List, Work Order)
  - `src/lib/documents/pdf-base.ts` — base class voi Vietnamese locale
  - `src/lib/documents/po-document.ts` — Purchase Order PDF
  - `src/lib/documents/invoice-document.ts` — Invoice PDF
  - `src/lib/documents/packing-list-document.ts` — Packing List PDF
  - `src/lib/documents/wo-document.ts` — Work Order PDF
- **BOM Management**: Line manager, status switcher, create BOM header button
- **Material Issue**: Ad-hoc issue page + WO issue endpoint
- **Customer Detail Page** + Product detail API
- **Quality Inspection** enhancements
- **Combobox improvements**, Part form enhancements

#### 02/12 — Shipment System + BOM Explosion PO + UI Polish
- **Shipment System (NEW)**:
  - Shipment + ShipmentLine models (PREPARING/SHIPPED/DELIVERED)
  - Manual lot selection + quantity input khi shipping
  - `confirmShipment()` supports user-specified lot allocations with validation
  - API: POST `/api/orders/[id]/ship`, GET/PATCH `/api/shipments/[id]`
- **BOM Explosion → Create PO**: API `/api/bom/[id]/create-pos` tu BOM explosion ket qua
- **Button Standardization**: Tat ca detail pages ui-v2 sm h-8→h-9
- **Checkbox Fix**: Native checkbox dark/black color → custom CSS appearance:none
- **Production Receiving** improvements

#### 02/13 — Audit Trail + Partial Shipment + Toolbar
- **Audit Trail CONNECTED** to 8 API routes (Parts, Inventory, Customers, Suppliers, Orders, Production, PO)
  - `src/lib/audit/route-audit.ts` — reusable audit utility for API routes
  - Auto-logs CREATE/UPDATE/DELETE with field-level change tracking
  - History tab hien thi timeline tren 6 detail pages
- **Partial Shipment** — xuat kho tung dong san pham (per-line shipping)
- **Toolbar Standardization** — h-9 across all pages (button/dropdown/search)

#### 02/14 — Complete i18n System (MAJOR)
- **i18n System** with global language toggle (Vietnamese/English)
  - `src/lib/i18n/language-context.tsx` — 1,600+ lines translations
  - Language toggle in header (all pages)
  - All 50+ dashboard pages converted to use i18n
  - All forms (Part, Customer, Supplier, Sales Order, Purchase Order)
  - All tables (Parts, Customers, Suppliers, Orders, PO)
  - Inventory, BOM, MRP, Quality, Finance, Analytics pages
- **Env validation skip** during build phase (fix Render deploy)
- **Warehouse page i18n** — remove hardcoded Vietnamese

#### 02/15 — Warehouse Quality Flows + Sprint 3 Features + Loading States (MAJOR)
- **Phase A+B Warehouse Flows** (+2,752 lines):
  - **Quality Hold page** (`/quality/hold`) — manage HOLD inventory with release/scrap decisions
  - **Quality Scrap page** (`/quality/scrap`) — manage SCRAP/disposable inventory
  - **NCR Disposition Dialog** — execute disposition (rework, scrap, return-to-supplier, use-as-is)
  - **Feature Flags System** (`src/lib/features/feature-flags.ts`) — enable/disable features
  - **Settings Warehouse page** (`/settings/warehouse`) — warehouse configuration UI
  - **MRP Engine enhancement** — improved planning logic (+349 lines)
  - **Hold Service** (`src/lib/quality/hold-service.ts`) — hold inventory management
  - **Scrap Service** (`src/lib/quality/scrap-service.ts`) — scrap disposal workflow
  - **NCR Disposition Service** (`src/lib/quality/ncr-disposition-service.ts`) — execute NCR actions
  - New API routes: hold, scrap, NCR execute-disposition, shipment pick, feature-flags
- **Sprint 3 Features** (+3,827 lines):
  - **AI Smart Import v2** (`/import/smart`) — 765 lines, full smart import page
  - **AI Analyzer** (`src/lib/import/ai-analyzer.ts`) — AI-powered import analysis
  - **Import Executor** (`src/lib/import/import-executor.ts`) — batch import execution
  - **Scheduled Reports** — report generator with PDF/Excel rendering
  - **Production Gantt Chart** (`/production/schedule`) — 783 lines, interactive Gantt
  - **Schedule Conflict Detection** (`src/lib/production/schedule-conflict.ts`)
  - **Gantt Data Service** (`src/lib/production/gantt-data.ts`)
  - New API routes: import/analyze, import/execute, production/schedule, production/reschedule, reports/generate, reports/history, reports/send
- **Loading Pages** — skeleton loading states for BOM, Home, Inventory, Parts, Production
- **Internal Auth** (`src/lib/api/internal-auth.ts`) — server-to-server auth
- **Login page dark theme** + heading color fix on dark backgrounds

#### 02/16 — Prismy Design System
- **Prismy Design Tokens** (`src/styles/prismy-tokens.css`) — CSS custom properties
  - Darker green for light theme (brand alignment)
  - Updated `theme.css` and `globals.css` with new color system
  - Updated `tailwind.config.ts` with Prismy color palette
- **SmartLayout** — table layout fixes for Parts, Orders pages
- **Customer Portal** — updated with Prismy theme colors
- **Charts** — updated color references across all chart components

#### 02/17–02/18 — Sprints 19-27: Comprehensive Quality Improvements
- **Security**: withAuth HOC migration, Zod validation on all API routes, sanitized error messages, rate limiting
- **Testing**: Added tests for 30+ API route groups (core business, AI, discussions, auth, etc.)
- **Performance**: DB query optimizations, aria-labels for accessibility
- **Code Quality**: Removed console.log, fixed `any` types, split large components (part-form, header, mobile-ui-kit, etc.)
- **SEO**: Added metadata to all dashboard pages

#### 02/19 — Sprint 28: Runtime Bug Fixes (5 commits)
- **Webpack module resolution fix**: File/directory naming conflict (`data-table.tsx` vs `data-table/` directory) — deleted conflicting parent files for 3 components
- **React setState-during-render fix**: Moved `useVirtualizer` from DataTable parent into DataTableBody child component
- **Duplicate column key fixes**: Removed duplicate `warehouseName` in inventory-table, renamed duplicate `lotNumber` to `poReference` in warehouse detail
- **API response contract fix**: Pages checked `json.success` but `paginatedSuccess()` never returns a `success` field — changed to `res.ok` check
- **Rate limit fix**: Raised in-memory rate limit from 100 to 500 req/min (local dev shares single IP `unknown`)
- **SWR fetcher hardening**: All 3 SWR fetchers (discussions page, thread-panel, use-part-analysis) now throw on non-ok responses instead of silently parsing error bodies as valid data

---

## HANDOVER CHECKPOINT - 19/02/2026

### Completed 02/19 — Sprint 28: Runtime Bug Fixes (5 commits)

| Commit | Description |
|--------|-------------|
| `3b7899d` | fix: resolve webpack module resolution conflict between file and directory names |
| `6fe0875` | fix: resolve React warnings for setState-during-render and duplicate keys |
| `2fe1e74` | fix: warehouses pages check res.ok instead of non-existent json.success |
| `5aef789` | fix: rate limit too low + SWR fetchers swallow API errors |
| `970623a` | fix: resolve duplicate lotNumber column key in warehouse detail page |

**Root causes identified and fixed:**

1. **Webpack "Cannot read properties of undefined (reading 'call')"** — File/directory naming conflicts: `data-table.tsx` alongside `data-table/` directory caused webpack to resolve the wrong module. Deleted 3 conflicting parent files (`data-table.tsx`, `import-wizard.tsx`, `part-form-dialog.tsx`).

2. **React "Cannot update component DataTable while rendering DataTableBody"** — `useVirtualizer` hook owned by parent DataTable had its state read by child DataTableBody during render, triggering cross-component state updates. Fixed by moving `useVirtualizer` into DataTableBody.

3. **React "Encountered two children with same key"** — Duplicate column keys in table definitions: `warehouseName` (inventory-table.tsx) and `lotNumber` (warehouse detail page). Fixed by removing/renaming the duplicates.

4. **"Failed to fetch warehouses" (always fails)** — Response contract mismatch. Page checked `whJson.success` but `paginatedSuccess()` returns `{ data, pagination, meta }` (no `success` field). Changed to check `whRes.ok` (HTTP status).

5. **429 Too Many Requests flooding** — Middleware in-memory rate limit was 100 req/min. In local dev, all requests share IP `unknown`. Dashboard fires 6-7 simultaneous API calls + SWR refresh intervals. Raised to 500 req/min.

6. **Discussions page crash "Cannot read properties of undefined (reading 'find')"** — SWR fetchers (`res => res.json()`) never checked `res.ok`. When API returned 429 error, the error JSON was parsed as valid data. Then `data?.threads.find()` crashed because error object has no `threads`. Fixed all 3 SWR fetchers to throw on non-ok responses.

**Files modified:**
```
src/components/ui-v2/data-table/data-table.tsx          — Created (moved from parent)
src/components/ui-v2/data-table/data-table-body.tsx     — Added useVirtualizer internally
src/components/ui-v2/data-table/index.ts                — Updated exports
src/components/ui-v2/data-table.tsx                     — DELETED (naming conflict)
src/components/excel/import-wizard.tsx                  — DELETED (naming conflict)
src/components/parts/part-form-dialog.tsx               — DELETED (naming conflict)
src/components/inventory/inventory-table.tsx             — Removed duplicate warehouseName column
src/app/(dashboard)/warehouses/page.tsx                 — Fixed res.ok check
src/app/(dashboard)/warehouses/[id]/page.tsx            — Fixed res.ok check + duplicate lotNumber key
src/app/(dashboard)/discussions/page.tsx                — Fixed fetcher + optional chaining
src/middleware.ts                                       — Raised rate limit 100→500
src/hooks/use-part-analysis.ts                          — Fixed fetcher
src/components/discussions/thread-panel.tsx              — Fixed fetcher
```

**Codebase-wide scan result:** No remaining duplicate column keys across all 30+ table definitions.

---

## HANDOVER CHECKPOINT - 16/02/2026

### Completed 02/13–02/16 (13 commits, +14,659 / -5,563 lines)

**New Models Added (2):**
- Schema extended with Hold/Scrap quality workflow models (+34 lines)

**New Services (8):**
- `src/lib/audit/route-audit.ts` — Reusable audit trail for API routes
- `src/lib/quality/hold-service.ts` — HOLD inventory management
- `src/lib/quality/scrap-service.ts` — Scrap disposal workflow
- `src/lib/quality/ncr-disposition-service.ts` — NCR execution service
- `src/lib/import/ai-analyzer.ts` — AI-powered import analysis
- `src/lib/import/import-executor.ts` — Batch import executor
- `src/lib/production/gantt-data.ts` — Gantt chart data
- `src/lib/production/schedule-conflict.ts` — Conflict detection

**New API Routes (15+):**
```
GET    /api/quality/hold                           — List HOLD inventory
POST   /api/quality/hold/[inventoryId]/decision    — Release/scrap decision
GET    /api/quality/scrap                          — List SCRAP inventory
POST   /api/quality/scrap/[inventoryId]/dispose    — Dispose scrap
POST   /api/quality/ncr/[id]/execute-disposition   — Execute NCR action
POST   /api/shipments/[id]/pick                    — Pick for shipment
GET    /api/settings/feature-flags                 — Feature flags
POST   /api/import/analyze                         — AI import analysis
POST   /api/import/execute                         — Execute import
GET    /api/production/schedule                    — Production schedule data
POST   /api/production/reschedule                  — Reschedule work order
POST   /api/reports/generate                       — Generate report
GET    /api/reports/history                        — Report history
POST   /api/reports/send                           — Email report
GET    /api/internal/parts                         — Internal parts API
GET    /api/internal/work-orders                   — Internal WO API
GET    /api/internal/inventory/summary             — Internal inventory
```

**New UI Pages/Components:**
- `/quality/hold` — Quality Hold management page (427 lines)
- `/quality/scrap` — Quality Scrap management page (473 lines)
- `/import/smart` — AI Smart Import page (765 lines)
- `/production/schedule` — Production Gantt Chart (783 lines, enhanced)
- `/settings/warehouse` — Warehouse settings page (220 lines)
- NCR Disposition Dialog component (269 lines)
- Job Progress Toast component (160 lines)
- Loading skeleton pages (BOM, Home, Inventory, Parts, Production)
- Page transition component

**i18n System:**
- `src/lib/i18n/language-context.tsx` — 1,744 lines full translation system
- Vietnamese/English toggle in header
- All 50+ pages, all forms, all tables converted

**Prismy Design System:**
- `src/styles/prismy-tokens.css` — CSS design tokens
- Updated theme colors across entire app (39 files)

### Commits (02/13–02/16)
```
ac29200 feat: darker Prismy green in light theme + fix table layout with SmartLayout
c800a06 chore: add loading pages, internal auth, and test files
b1e933b feat: Sprint 3 — AI Smart Import, Scheduled Reports, Production Gantt Chart
62b808f feat: Phase A+B warehouse flows — feature flags, quality workflows, and UI pages
fe2d3b1 fix: Heading color override on dark backgrounds (login left panel)
be3ab53 fix: Login page dark theme colors + full i18n support
f298989 fix: Add i18n support to warehouse page — remove hardcoded Vietnamese
b0e0391 fix: Skip env validation during build phase to prevent Render deploy failure
892d1e2 feat: Complete i18n system with global language toggle
875111f docs: Update handover session notes
b335743 fix: Standardize toolbar button/dropdown/search height to h-9 across all pages
b2fa938 feat: Partial shipment — xuất kho từng dòng sản phẩm
36ba206 feat: Connect audit trail to CRUD operations across 8 API routes
```

---

## HANDOVER CHECKPOINT - 12/02/2026

### Completed 02/11–02/12 (2 commits, +8,791 lines)

**New Models Added (3):**
- `ProductionReceipt` — Warehouse approval for production output
- `Shipment` — Shipping management for sales orders
- `ShipmentLine` — Line items in shipments

**New API Routes (10):**
```
POST   /api/production/[id]/receive     — Create production receipt
POST   /api/production/[id]/issue       — Issue materials to WO
POST   /api/inventory/issue             — Ad-hoc material issue
GET    /api/warehouse-receipts          — List pending receipts
POST   /api/warehouse-receipts/[id]/confirm — Confirm receipt
POST   /api/warehouse-receipts/[id]/reject  — Reject receipt
GET    /api/products/[id]               — Product detail
POST   /api/orders/[id]/ship            — Create shipment
GET    /api/shipments/[id]              — Shipment detail
POST   /api/bom/[id]/create-pos         — Create POs from BOM explosion
```

**New UI Pages/Components:**
- Material Issue page (`/inventory/issue`)
- BOM Line Manager component
- BOM Status Switcher
- Create BOM Header Button
- Customer Detail page
- Shipment flow in Sales Order detail
- Enhanced BOM Explosion with create-PO flow

**PDF Document System:**
- `src/lib/documents/pdf-base.ts` — Base class, Vietnamese locale, header/footer
- `src/lib/documents/po-document.ts` — Purchase Order PDF
- `src/lib/documents/invoice-document.ts` — Invoice PDF
- `src/lib/documents/packing-list-document.ts` — Packing List PDF
- `src/lib/documents/wo-document.ts` — Work Order PDF

### Commits (02/11–02/12)
```
70663d3 feat: Shipment system, lot selection, button standardization & checkbox fix
979c807 feat: Add warehouse approval flow for production receipts + multiple enhancements
```

---

## HANDOVER CHECKPOINT - 06/02/2026 (Evening)

### Completed This Session (02/06)

**Warehouse Management System (NEW)**
- Trang tổng quan kho `/warehouses` — 4 stat cards + warehouse cards grid
- Trang chi tiết kho `/warehouses/[id]` — SmartGrid Excel-like inventory table
- Sidebar thêm "KHO" navigation item
- Màu theo loại: MAIN(xanh lá), RECEIVING(xanh dương), HOLD(vàng), QUARANTINE(đỏ)

**4-Warehouse Architecture (STANDARDIZED)**
- `WH-MAIN` (MAIN) — Kho chính, hàng đã QC pass
- `WH-RECEIVING` (RECEIVING) — Khu nhận hàng, chờ kiểm tra QC
- `WH-HOLD` (HOLD) — Khu chờ xử lý, hàng conditional
- `WH-QUARANTINE` (QUARANTINE) — Khu cách ly, hàng lỗi

**Receiving Inspection Pipeline (MAJOR)**
- PO received → inventory vào WH-RECEIVING (không phải WH-MAIN nữa)
- Inspection PASS → WH-MAIN/STOCK
- Inspection CONDITIONAL → accepted→WH-HOLD, rejected→WH-QUARANTINE
- Inspection FAIL → WH-QUARANTINE
- Auto-subtract từ RECEIVING sau khi inspection complete
- Duplicate inspection safeguard (HTTP 409)
- NCR auto-created cho FAIL/CONDITIONAL

**Lot Number Management**
- Auto-generate lot khi tạo inspection mới (format: `LOT-{PO}-{line}`)
- Pencil/Lock icon toggle cho edit manual
- Lot editable trong inspection detail (pending/in_progress)
- Lot number gửi kèm khi start + complete inspection

**Inventory Transfer System**
- Location Code dropdown (STOCK, RECEIVING, HOLD, QUARANTINE)
- Partial/full transfer giữa các kho
- Transfer quantity input với preview
- Audit trail qua `lot_transactions` table

**Data Integrity Fixes**
- Reconciled corrupted data (Part-1029, PART-1035-2, PART-1018)
- Cleaned ghost RECEIVING records từ old inspections
- Fixed Stock Information bug (excluded current record from calculation)
- Fixed `||` vs `??` for zero-value handling

**Warehouse Standardization**
- `ensure-warehouses.ts` — build-time script tạo 4 kho chuẩn
- Fixed WH-MAIN type: `mixed` → `MAIN`
- Removed legacy WH-FG, WH-RAW từ production
- Đồng bộ tất cả nguồn tạo warehouse (seed.ts, demo/seed, setup route)

**Production Data Sync**
- Local PostgreSQL → Production PostgreSQL (Render) full sync via pg_dump/pg_restore
- Backup production trước sync: `prod_backup_before_sync.dump`
- Verified: code + data identical trên cả hai environments

### Commits (02/06)
```
6aa9da8 fix: Standardize warehouse system — 4 warehouses only
3dfbde1 feat: Auto-create required warehouses on deploy
f7b4f71 feat: Warehouse management, receiving inspection pipeline & inventory transfers
```

### Key Lesson Learned
**Code vs Data**: `git push` chỉ deploy code, KHÔNG sync database data.
- Warehouse records tạo trực tiếp trong local DB không tự động có trên production
- Giải pháp: `ensure-warehouses.ts` chạy mỗi build + `pg_dump/pg_restore` cho full sync
- Production backup luôn trước khi sync: `pg_dump → prod_backup_before_sync.dump`

---

## PROJECT OVERVIEW

### Identity
| Attribute | Value |
|-----------|-------|
| **Project** | RTR-MRP (Real-Time Resource - Material Requirements Planning) |
| **Purpose** | Manufacturing intelligence system for drone companies (Vietnamese market) |
| **Stack** | Next.js 14 + TypeScript 5 + Prisma 5.22 + PostgreSQL + Redis + AI |
| **Status** | UAT Ready - Sprint 3 Complete + Warehouse Pipeline |
| **Repo** | `/Users/mac/AnhQuocLuong/rtr-mrp` |
| **GitHub** | https://github.com/nclamvn/rtr-mrp |
| **Production** | https://rtr-mrp.onrender.com |
| **Demo** | https://rtr-mrp.onrender.com/demo |

### Database (Synced 02/06)
| Environment | Host | Version | Records |
|-------------|------|---------|---------|
| Local | `postgresql://mac@localhost:5432/rtr_mrp` | PostgreSQL 14 | 59 parts, 33 inventory, 4 warehouses |
| Production | Render PostgreSQL (Singapore) | PostgreSQL 18 | **Identical to local** |

### Project Stats (Verified 02/16)

| Metric | Value |
|--------|-------|
| **Prisma Schema** | 5,702 lines |
| **Models** | 154 |
| **Enums** | 27 |
| **API Routes** | 273 route.ts files |
| **Lines of Code** | 310K+ |

### Tech Stack Detail
```
Frontend:   Next.js 14 (App Router) + React 18 + TypeScript 5
UI:         Tailwind CSS + shadcn/ui + Radix UI + Recharts
Backend:    Next.js API Routes + Prisma ORM 5.22
Database:   PostgreSQL (local v14, prod v18) — 100+ indexes
Cache:      Redis/Upstash (in-memory fallback)
Queue:      BullMQ (background jobs)
Auth:       NextAuth.js v5 + JWT + RBAC (4 roles)
AI:         Anthropic + Google Gemini + OpenAI (fallback)
Testing:    Vitest (unit) + Playwright (E2E)
Mobile:     PWA (offline + barcode scanning)
Deploy:     Render (auto-deploy on git push)
Sync:       pg_dump v18 + pg_restore (local ↔ production)
```

---

## WAREHOUSE & LOGISTICS ARCHITECTURE

### 5-Warehouse System
```
PO Received → WH-RECEIVING (RECEIVING)
                    │
              QC Inspection
                    │
         ┌──────────┼──────────┐
         │          │          │
       PASS    CONDITIONAL   FAIL
         │       │      │      │
    WH-MAIN  WH-HOLD  WH-QUARANTINE → WH-SCRAP (disposable)
    (STOCK)  (accepted) (rejected)
```

### Production → Warehouse Approval Flow (NEW 02/11)
```
Work Order COMPLETED → ProductionReceipt (PENDING)
                              │
                    Warehouse Manager reviews
                              │
                    ┌─────────┼─────────┐
                    │                   │
                CONFIRMED           REJECTED
                    │                   │
            Inventory updated     No inventory change
            (WH-MAIN + lot)       (reason recorded)
```

### Shipment Flow (NEW 02/12)
```
Sales Order CONFIRMED → Ship button
                           │
                    Lot Selection UI
                    (manual qty per lot)
                           │
                    Shipment created (PREPARING)
                           │
                    Inventory deducted per lot
                           │
                    SO status → SHIPPED
```

### Key Files
```
src/app/(dashboard)/warehouses/page.tsx        — Warehouse overview
src/app/(dashboard)/warehouses/[id]/page.tsx   — Warehouse detail + pending receipts tab
src/app/(dashboard)/quality/receiving/         — Inspection pages (list, new, detail)
src/app/(dashboard)/inventory/issue/page.tsx   — Material issue page (NEW)
src/app/api/quality/inspections/[id]/route.ts  — Inspection completion + inventory moves
src/app/api/inventory/[id]/route.ts            — Transfer logic (partial/full)
src/app/api/inventory/issue/route.ts           — Ad-hoc material issue (NEW)
src/app/api/purchase-orders/[id]/route.ts      — PO receiving → WH-RECEIVING
src/app/api/warehouse-receipts/                — Warehouse approval flow (NEW)
src/app/api/production/[id]/receive/route.ts   — Production receipt (NEW)
src/app/api/orders/[id]/ship/route.ts          — Shipment creation (NEW)
src/app/api/shipments/[id]/route.ts            — Shipment detail (NEW)
src/lib/documents/                             — PDF generators (NEW)
scripts/ensure-warehouses.ts                   — Build-time warehouse creation
```

### Inventory Transfer Logic (`/api/inventory/[id]` PATCH)
```
locationCode mapping:
  STOCK      → warehouse type MAIN
  RECEIVING  → warehouse type RECEIVING
  HOLD       → warehouse type HOLD
  QUARANTINE → warehouse type QUARANTINE

Partial transfer: subtract from source, add/create in target
Full transfer: move record or merge into existing
Audit trail: lot_transactions with from/to warehouse + location
```

---

## SCHEMA - CRITICAL CONTEXT

### Verified Correct Field Names (DO NOT CHANGE)

| Entity | Field | Correct | Wrong (old) |
|--------|-------|---------|-------------|
| Part | Name | `name` | ~~partName~~ |
| Inventory | Quantity | `quantity` | ~~onHand~~ |
| Inventory | Key | Composite `[partId, warehouseId, lotNumber]` | ~~partId unique~~ |
| Warehouse | Model | EXISTS | ~~Doesn't exist~~ |
| Warehouse | Type | `String` (MAIN/RECEIVING/HOLD/QUARANTINE) | ~~enum~~ |

### Core Models
```prisma
model Part {
  partNumber    String   @unique
  name          String                    // NOT partName
  category      PartCategory @default(COMPONENT)
  unit          String   @default("pcs")
  unitCost      Float    @default(0)
  minStock      Int      @default(0)
  reorderPoint  Int      @default(0)
  safetyStock   Int      @default(0)
  critical      Boolean  @default(false)
  lotControl    Boolean  @default(false)
  serialControl Boolean  @default(false)
}

model Inventory {
  partId        String
  warehouseId   String
  lotNumber     String?
  quantity      Float    @default(0)     // NOT onHand
  reservedQty   Float    @default(0)
  availableQty  Float    @default(0)
  locationCode  String?                  // STOCK, RECEIVING, HOLD, QUARANTINE
  @@unique([partId, warehouseId, lotNumber])
}

model Warehouse {
  code    String  @unique
  name    String
  type    String?  // MAIN, RECEIVING, HOLD, QUARANTINE, SCRAP
  status  String   @default("active")
  // Standard: WH-MAIN, WH-RECEIVING, WH-HOLD, WH-QUARANTINE, WH-SCRAP
}

model ProductionReceipt {
  receiptNumber  String  @unique
  workOrderId    String  @unique
  productId      String
  quantity       Int
  lotNumber      String
  warehouseId    String
  status         String  @default("PENDING")  // PENDING | CONFIRMED | REJECTED
  requestedBy    String
  confirmedBy    String?
  rejectedBy     String?
}

model Shipment {
  shipmentNumber  String  @unique
  salesOrderId    String  @unique
  customerId      String
  status          String  @default("PREPARING")  // PREPARING | SHIPPED | DELIVERED
  carrier         String?
  trackingNumber  String?
}

model ShipmentLine {
  shipmentId  String
  lineNumber  Int
  productId   String
  quantity    Int
  @@unique([shipmentId, lineNumber])
}
```

---

## FEATURE COMPLETION STATUS

### DONE
- [x] AI Smart Import Engine (Vietnamese headers, auto-mapping, duplicate detect)
- [x] AI Phase 1-3 (Forecast, Quality, Supplier Risk, Auto-PO, Auto-Schedule, Alerts)
- [x] BOM Management (multi-level, explode, where-used, line manager, status switcher)
- [x] BOM Explosion → Create PO (auto-create POs from BOM explosion)
- [x] MRP Planning (ATP/CTP, Pegging, Simulation)
- [x] Production (Work Orders, Routing, Capacity, OEE)
- [x] **Production Gantt Chart** (`/production/schedule` — interactive, drag reschedule) — NEW 02/15
- [x] Warehouse Approval Flow (Production→PENDING→Kho confirm/reject)
- [x] Material Issue (ad-hoc + WO-based material issuing)
- [x] Quality (NCR, CAPA, Inspection Plans, Traceability)
- [x] **Quality Hold Management** (`/quality/hold` — release/scrap decisions) — NEW 02/15
- [x] **Quality Scrap Management** (`/quality/scrap` — disposal workflow) — NEW 02/15
- [x] **NCR Disposition Execution** (rework, scrap, return, use-as-is) — NEW 02/15
- [x] Receiving Inspection Pipeline (PO→RECEIVING→QC→MAIN/HOLD/QUARANTINE)
- [x] Warehouse Management (5-warehouse: MAIN, RECEIVING, HOLD, QUARANTINE, SCRAP)
- [x] Inventory (Multi-warehouse, lot/serial, composite keys, partial transfer)
- [x] Purchasing (PO, Suppliers, Tax ID, Secondary suppliers)
- [x] Sales (SO, Customer tiers: Platinum/Gold/Silver/Bronze)
- [x] Shipment System (SO→Xuat kho→Lot selection→Delivery)
- [x] **Partial Shipment** (per-line shipping) — NEW 02/13
- [x] Finance (Costing, GL, Invoicing, multi-currency VND)
- [x] PDF Generation (PO, Invoice, Packing List, Work Order)
- [x] Excel Import/Export (Vietnamese support)
- [x] **AI Smart Import v2** (`/import/smart` — full-page AI import) — NEW 02/15
- [x] Mobile PWA (offline + barcode scanning)
- [x] Discussions (threaded on entities)
- [x] Sprint 3: Intelligence & Polish features
- [x] Report Scheduler
- [x] **Scheduled Reports with PDF/Excel rendering** — NEW 02/15
- [x] Part form UX (searchable dropdowns, smart navigation)
- [x] Customer Detail Page
- [x] **Audit Trail** connected to 8 API routes (field-level changes) — NEW 02/13
- [x] **Complete i18n System** (Vietnamese/English, all pages/forms/tables) — NEW 02/14
- [x] **Feature Flags System** — NEW 02/15
- [x] **Prismy Design System** (CSS tokens, brand colors) — NEW 02/16
- [x] **Loading Skeleton Pages** (BOM, Home, Inventory, Parts, Production) — NEW 02/15

### SPRINT ROADMAP - WHAT'S NEXT

#### SPRINT 4: OPERATIONS-CRITICAL (COMPLETE)

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| PDF Generation (PO, Invoice, Packing List, WO) | **DONE** | Critical | `src/lib/documents/` — 5 files |
| Warehouse Approval Flow (Production receipts) | **DONE** | Critical | ProductionReceipt PENDING→CONFIRMED/REJECTED |
| Shipment System (SO xuất kho) | **DONE** | Critical | Shipment + lot selection + partial |
| BOM Explosion → Create PO | **DONE** | High | `/api/bom/[id]/create-pos` |
| Material Issue (ad-hoc + WO) | **DONE** | High | `/inventory/issue` page |
| Button/Checkbox UI standardization | **DONE** | Medium | ui-v2 h-9, custom checkbox CSS |
| Audit Trail (who, when, old → new) | **DONE** | Critical | `route-audit.ts` + 8 API routes |
| i18n System (Vietnamese/English) | **DONE** | Critical | 1,744 lines translations |
| Quality Workflows (Hold, Scrap, NCR) | **DONE** | High | 3 new pages + 3 services |
| Production Gantt Chart | **DONE** | High | Interactive with reschedule |
| Scheduled Reports (PDF/Excel) | **DONE** | High | Generate + email |
| Feature Flags | **DONE** | Medium | Enable/disable features |
| Prismy Design System | **DONE** | Medium | CSS tokens, brand alignment |

#### SPRINT 5: POLISH & SCALE (ACTIVE)

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| SWR/API hooks migration | **IN PROGRESS** | High | `use-api-data.ts`, SWR provider |
| Approval Workflows (PO, WO release) | TODO | **Critical** | Multi-step, role-based |
| Excel Export nang cao (BOM tree, filters) | TODO | High | BOM indent format |
| Barcode/QR Generation + Print labels | TODO | High | |
| Role-based Dashboards (CEO, Kho, SX, Mua hang) | TODO | High | |
| Backup & Recovery | TODO | High | |
| UX Polish (keyboard shortcuts, saved filters) | TODO | Low | |
| Increase test coverage (273 routes, ~10 test files) | TODO | Medium | |

---

## DEPLOYMENT & SYNC

### Build Pipeline (Render)
```
npm install
→ npx prisma generate
→ npx prisma migrate deploy
→ npm run build (includes: prisma db push + ensure-warehouses.ts + next build + tsc)
→ npm run db:add-demo
```

### Database Sync (Local → Production)
```bash
# 1. Export local
/opt/homebrew/opt/postgresql@18/bin/pg_dump postgresql://mac@localhost:5432/rtr_mrp \
  --format=custom --compress=9 -f local_export.dump

# 2. Get production URL
curl -s -H "Authorization: Bearer <API_KEY>" \
  "https://api.render.com/v1/postgres/dpg-d5a8ii1r0fns73871rs0-a/connection-info" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['externalConnectionString'])"

# 3. Backup production first!
/opt/homebrew/opt/postgresql@18/bin/pg_dump "$PROD_URL" \
  --format=custom --compress=9 -f prod_backup.dump

# 4. Restore local → production
/opt/homebrew/opt/postgresql@18/bin/pg_restore \
  --clean --if-exists --no-owner --no-acl -d "$PROD_URL" local_export.dump

# NOTE: pg_dump v18 required (prod is v18, local pg_dump v14 won't work)
# Install: brew install postgresql@18
# Path: /opt/homebrew/opt/postgresql@18/bin/pg_dump
```

### Render Service Info
```
Service:  rtr-mrp (srv-d5a8l81r0fns73872uhg)
Database: rtr-mrp-db (dpg-d5a8ii1r0fns73871rs0-a)
Region:   Singapore
Plan:     Starter (service) + Basic 256MB (database)
API Key:  ~/.render/cli.yaml
```

---

## AUTHENTICATION

### RBAC Roles

| Role | Parts | Inventory | Production | Reports | Users |
|------|-------|-----------|------------|---------|-------|
| ADMIN | CRUD | CRUD | CRUD | Read | CRUD |
| MANAGER | CRUD | CRUD | CRUD | Read | Read |
| OPERATOR | Read | Update | CRUD | - | - |
| VIEWER | Read | Read | Read | Read | - |

### Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin (Test) | admin@rtr.com | admin123456@ |
| Demo | demo@rtr-mrp.com | DemoMRP@2026! |

---

## API ROUTES - IMPORTANT

### V1 (Primary - `/api/*`)
```
GET/POST   /api/parts                          - Parts CRUD
GET/POST   /api/inventory                      - Inventory management
PATCH      /api/inventory/[id]                 - Transfer + location change
POST       /api/inventory/movements            - Stock movements
POST       /api/inventory/issue                - Ad-hoc material issue (NEW)
GET/POST   /api/warehouses                     - Warehouse management
GET        /api/warehouse-receipts             - List pending receipts (NEW)
POST       /api/warehouse-receipts/[id]/confirm - Confirm receipt (NEW)
POST       /api/warehouse-receipts/[id]/reject  - Reject receipt (NEW)
GET/POST   /api/quality/inspections            - Receiving inspections
PUT        /api/quality/inspections/[id]       - Update + complete inspection
GET/POST   /api/production                     - Work orders
POST       /api/production/[id]/receive        - Create production receipt (NEW)
POST       /api/production/[id]/issue          - Issue materials to WO (NEW)
POST       /api/orders/[id]/ship               - Create shipment (NEW)
GET/PATCH  /api/shipments/[id]                 - Shipment detail (NEW)
GET        /api/products/[id]                  - Product detail (NEW)
POST       /api/bom/[id]/create-pos            - Create POs from BOM explosion (NEW)
GET/POST   /api/customers                      - Customer management
GET/POST   /api/suppliers                      - Supplier management
GET        /api/dashboard                      - Dashboard aggregations
POST       /api/mrp/run                        - Trigger MRP calculation
GET        /api/export                         - Bulk data export
GET        /api/health                         - Basic health check
```

### NON-EXISTENT ROUTES (do NOT use)
```
/api/v2/parts       -> Use /api/parts
/api/v2/inventory   -> Use /api/inventory
/api/v2/dashboard   -> Use /api/dashboard
/api/inventory/adjust -> Use /api/inventory/movements
```

---

## KNOWN TECHNICAL DEBT

1. **Zod compatibility** - All `z.record()` calls need explicit key schema (fixed 02/04)
2. **Prisma JSON fields** - Must cast to `object` or `object[]` before save
3. **Buffer/Uint8Array** - NextResponse needs Uint8Array, not Buffer
4. **Nodemailer** - Dynamic import only (optional dependency)
5. **Test coverage gap** - 243 API routes but only ~10 test files
6. **V2 API incomplete** - Most routes still on V1
7. **Warehouse type is String** - Not enum, accepts any value (validate in code)
8. **pg_dump version** - Production v18, local v14 — must use `/opt/homebrew/opt/postgresql@18/bin/pg_dump`

---

## QUICK START COMMANDS

```bash
# Start development
cd /Users/mac/AnhQuocLuong/rtr-mrp
npm run dev

# Build
npm run build

# Ensure warehouses exist
npx tsx scripts/ensure-warehouses.ts

# Run unit tests
npm test -- --run

# Prisma Studio
npx prisma studio

# Database sync to production
# See "DEPLOYMENT & SYNC" section above

# Git push to production (auto-deploy on Render)
git push nclamvn main

# Manual Render deploy
render deploys create srv-d5a8l81r0fns73872uhg --confirm -o json
```

---

## IMPORTANT FILES

```
prisma/schema.prisma                    # 154 models, 27 enums, 5702 lines
scripts/ensure-warehouses.ts            # Build-time warehouse creation (5 standard)
src/app/(dashboard)/warehouses/         # Warehouse management UI + pending receipts
src/app/(dashboard)/quality/receiving/  # Receiving inspection UI
src/app/(dashboard)/quality/hold/       # Quality hold management (NEW 02/15)
src/app/(dashboard)/quality/scrap/      # Quality scrap management (NEW 02/15)
src/app/(dashboard)/import/smart/       # AI Smart Import page (NEW 02/15)
src/app/(dashboard)/production/schedule/ # Production Gantt Chart (ENHANCED 02/15)
src/app/(dashboard)/settings/warehouse/ # Warehouse settings (NEW 02/15)
src/app/(dashboard)/inventory/issue/    # Material issue page
src/app/api/quality/hold/               # Hold inventory API (NEW 02/15)
src/app/api/quality/scrap/              # Scrap inventory API (NEW 02/15)
src/app/api/quality/ncr/[id]/execute-disposition/ # NCR execution (NEW 02/15)
src/app/api/import/analyze|execute/     # AI import APIs (NEW 02/15)
src/app/api/production/schedule|reschedule/ # Gantt APIs (NEW 02/15)
src/app/api/reports/generate|history|send/ # Report APIs (NEW 02/15)
src/app/api/settings/feature-flags/     # Feature flags API (NEW 02/15)
src/app/api/internal/                   # Internal auth APIs (NEW 02/15)
src/app/api/warehouse-receipts/         # Warehouse approval flow
src/app/api/                            # 273 API route files
src/lib/audit/route-audit.ts            # Reusable audit trail (NEW 02/13)
src/lib/i18n/language-context.tsx        # i18n system — 1,744 lines (NEW 02/14)
src/lib/features/feature-flags.ts        # Feature flag system (NEW 02/15)
src/lib/quality/hold-service.ts          # Hold management (NEW 02/15)
src/lib/quality/scrap-service.ts         # Scrap disposal (NEW 02/15)
src/lib/quality/ncr-disposition-service.ts # NCR execution (NEW 02/15)
src/lib/import/ai-analyzer.ts            # AI import analysis (NEW 02/15)
src/lib/import/import-executor.ts        # Import executor (NEW 02/15)
src/lib/production/gantt-data.ts         # Gantt chart data (NEW 02/15)
src/lib/production/schedule-conflict.ts  # Conflict detection (NEW 02/15)
src/lib/reports/report-generator.ts      # Report generation (NEW 02/15)
src/lib/reports/pdf-renderer.ts          # PDF rendering (NEW 02/15)
src/lib/reports/excel-renderer.ts        # Excel rendering (NEW 02/15)
src/lib/documents/                      # PDF generators: PO, Invoice, WO, Packing List
src/lib/ai/                             # All AI modules
src/lib/env.ts                           # Environment validation (NEW 02/14)
src/styles/prismy-tokens.css             # Prismy design tokens (NEW 02/16)
src/components/quality/ncr-disposition-dialog.tsx # NCR dialog (NEW 02/15)
src/components/jobs/job-progress-toast.tsx # Job progress (NEW 02/14)
CLAUDE.md                               # AI coding conventions
HANDOVER-SESSION.md                     # This file
```

---

## RISK & TECHNICAL DEBT

| # | Van de | Muc do | Ghi chu |
|---|--------|--------|---------|
| 1 | Test coverage thap | HIGH | 273 API routes nhung chi ~10 test files |
| 2 | Approval Workflows chua co | HIGH | PO/WO release can multi-step approval |
| 3 | SWR migration chua xong | MEDIUM | Branch uncommitted, can merge |
| 4 | V2 API chua hoan thanh | MEDIUM | Hau het routes con o V1 |
| 5 | Warehouse type la String | LOW | Khong phai enum, can validate trong code |
| 6 | pg_dump version mismatch | LOW | Prod v18, local v14 — phai dung pg_dump v18 |
| 7 | Audit Trail | DONE | Connected to 8 routes (02/13) |
| 8 | Zod z.record() | FIXED | Da fix 02/04 |
| 9 | Prisma JSON fields | FIXED | Da fix |
| 10 | Buffer/Uint8Array | FIXED | Da fix |
| 11 | Nodemailer | FIXED | Da fix — dynamic import only |

---

## TIMELINE TONG HOP

```
12/2025     Project khoi tao, Core MRP setup
01/01–01/09 Schema investigation, Context drift fix, Enterprise tools v1.3
01/09–01/19 AI Phase 3 Complete (Auto-PO, Auto-Schedule, Alerts) — AI Maturity 80%
01/21       Bug fixes (6 bugs), SONG ANH 1:1, UI improvements
01/24       UI contrast, supplier filter, PO auto-number, quality fixes
01/30       Advanced Analytics, Workflow automation, Unit tests
02/02–02/03 AI Smart Import Engine
02/04       Sprint 3 COMPLETE + build fixes
02/05       Supplier enhancements + Inventory improvements
02/06       Warehouse Pipeline COMPLETE + Production data sync
02/09       WH-SCRAP + Combobox fix
02/11       Warehouse Approval Flow + PDF Generation + BOM + Material Issue (MAJOR)
02/12       Shipment System + BOM Explosion→PO + UI standardization
02/13       Audit Trail (8 routes) + Partial Shipment + Toolbar h-9
02/14       Complete i18n System (Vi/En) + Env validation fix
02/15       Quality Workflows (Hold/Scrap/NCR) + Gantt + Smart Import v2 + Reports (MAJOR)
02/16       Prismy Design System + SmartLayout
02/17–02/18 Sprints 19-27: Security, Tests, Performance, Code Quality (MAJOR)
02/19       Sprint 28: Runtime Bug Fixes — Webpack, React, API contracts, rate limiting
```

**Tong ket:** Du an da Production Ready, 252 commits, 154 models, 273 API routes, 310K+ LOC.
Sprint 4 COMPLETE. Sprints 19-28 COMPLETE (quality + bug fixes).
Sprint 5 dang trien khai — SWR migration + Approval Workflows.

---

## KHI TRO LAI

**Noi voi Claude:** "Doc HANDOVER-SESSION.md de tiep tuc"

**Viec tiep theo nen lam (theo thu tu uu tien):**
1. Approval Workflows (PO, WO release) - **Critical** multi-step, role-based
2. Excel Export nang cao (BOM tree, filters) - High
3. Barcode/QR Generation + Print labels - High
4. Role-based Dashboards (CEO, Kho, SX, Mua hang) - High
5. SWR/API hooks migration - Medium (partially started)
6. Tang test coverage (target: 50%+ of 273 API routes) - Medium
7. Data sync Local → Production (pg_dump/pg_restore) - khi can

**Luu y ve branch hien tai:**
- Branch `main` — clean, up to date
- All runtime bugs from browser console fixed
- Codebase scan confirmed: no remaining duplicate column keys

---

*Cap nhat lan cuoi: 2026-02-19 VN*
*Du an: RTR-MRP - Material Requirements Planning System*
*Handover prepared by: Claude Opus 4.6*
