# HANDOVER - RTR-MRP Development Session
> **Last Updated:** 2026-02-13 (Vietnam Time)
> **Session:** Sprint 4 In Progress — Shipments, Warehouse Approval, PDF, BOM Explosion
> **Latest Commit:** `70663d3` - feat: Shipment system, lot selection, button standardization & checkbox fix
> **Branch:** `main` (clean, up to date with `nclamvn/main`)
> **Deploy:** Render LIVE
> **Total Commits:** 234

---

## TONG QUAN TINH TRANG DU AN — 13/02/2026

### Tinh trang hien tai: SPRINT 4 IN PROGRESS — Operations-Critical Features

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
| **Sprint 4: Audit Trail** | TODO | — |
| **Sprint 4: Approval Workflows (PO, WO)** | TODO | — |

### So lieu du an (Verified 02/13)

| Metric | Value |
|--------|-------|
| **Prisma Schema** | 5,666 dong |
| **Models** | 152 |
| **Enums** | 27 |
| **API Routes** | 253 route.ts files |
| **Total Commits** | 234 |
| **Lines of Code** | 300K+ |
| **Database** | 59 parts, 33 inventory, 5 warehouses |
| **Production** | https://rtr-mrp.onrender.com |
| **Git Status** | Clean — up to date with `nclamvn/main` |

### Cong viec da lam tu 21/01 den 12/02 (50 commits)

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

### Project Stats (Verified 02/13)

| Metric | Value |
|--------|-------|
| **Prisma Schema** | 5,666 lines |
| **Models** | 152 |
| **Enums** | 27 |
| **API Routes** | 253 route.ts files |
| **Lines of Code** | 300K+ |

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
- [x] **BOM Explosion → Create PO** (auto-create POs from BOM explosion) — NEW 02/12
- [x] MRP Planning (ATP/CTP, Pegging, Simulation)
- [x] Production (Work Orders, Routing, Capacity, OEE)
- [x] **Warehouse Approval Flow** (Production→PENDING→Kho confirm/reject) — NEW 02/11
- [x] **Material Issue** (ad-hoc + WO-based material issuing) — NEW 02/11
- [x] Quality (NCR, CAPA, Inspection Plans, Traceability)
- [x] Receiving Inspection Pipeline (PO→RECEIVING→QC→MAIN/HOLD/QUARANTINE)
- [x] Warehouse Management (5-warehouse: MAIN, RECEIVING, HOLD, QUARANTINE, SCRAP)
- [x] Inventory (Multi-warehouse, lot/serial, composite keys, partial transfer)
- [x] Purchasing (PO, Suppliers, Tax ID, Secondary suppliers)
- [x] Sales (SO, Customer tiers: Platinum/Gold/Silver/Bronze)
- [x] **Shipment System** (SO→Xuat kho→Lot selection→Delivery) — NEW 02/12
- [x] Finance (Costing, GL, Invoicing, multi-currency VND)
- [x] **PDF Generation** (PO, Invoice, Packing List, Work Order) — NEW 02/11
- [x] Excel Import/Export (Vietnamese support)
- [x] Mobile PWA (offline + barcode scanning)
- [x] Discussions (threaded on entities)
- [x] Sprint 3: Intelligence & Polish features
- [x] Report Scheduler
- [x] Part form UX (searchable dropdowns, smart navigation)
- [x] Customer Detail Page — NEW 02/11

### SPRINT ROADMAP - WHAT'S NEXT

#### SPRINT 4: OPERATIONS-CRITICAL (ACTIVE — Started 02/11)

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| PDF Generation (PO, Invoice, Packing List, WO) | **DONE** | Critical | `src/lib/documents/` — 5 files |
| Warehouse Approval Flow (Production receipts) | **DONE** | Critical | ProductionReceipt PENDING→CONFIRMED/REJECTED |
| Shipment System (SO xuất kho) | **DONE** | Critical | Shipment + lot selection |
| BOM Explosion → Create PO | **DONE** | High | `/api/bom/[id]/create-pos` |
| Material Issue (ad-hoc + WO) | **DONE** | High | `/inventory/issue` page |
| Button/Checkbox UI standardization | **DONE** | Medium | ui-v2 h-9, custom checkbox CSS |
| Audit Trail (who, when, old -> new) | TODO | **Critical** | Enterprise compliance, ChangeLog model |
| Approval Workflows (PO, WO release) | TODO | **Critical** | Multi-step, role-based |
| Excel Export nang cao (BOM tree, filters) | TODO | High | BOM indent format |
| Barcode/QR Generation + Print labels | TODO | High | |

#### SPRINT 5: POLISH & SCALE

| Task | Status | Priority |
|------|--------|----------|
| Role-based Dashboards (CEO, Kho, SX, Mua hang) | TODO | High |
| AI Import nang cao (PDF bao gia, reconciliation) | TODO | Medium |
| Gantt Chart cho Production | TODO | Medium |
| Backup & Recovery | TODO | High |
| UX Polish (keyboard shortcuts, saved filters) | TODO | Low |
| Increase test coverage (243 routes, ~10 test files) | TODO | Medium |

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
prisma/schema.prisma                    # 152 models, 27 enums, 5666 lines
scripts/ensure-warehouses.ts            # Build-time warehouse creation (5 standard)
src/app/(dashboard)/warehouses/         # Warehouse management UI + pending receipts
src/app/(dashboard)/quality/receiving/  # Receiving inspection UI
src/app/(dashboard)/inventory/issue/    # Material issue page (NEW)
src/app/api/quality/inspections/        # Inspection API + inventory moves
src/app/api/inventory/[id]/route.ts     # Transfer logic
src/app/api/inventory/issue/route.ts    # Ad-hoc material issue (NEW)
src/app/api/warehouse-receipts/         # Warehouse approval flow (NEW)
src/app/api/production/[id]/            # WO + receive + issue (NEW)
src/app/api/orders/[id]/ship/route.ts   # Shipment creation (NEW)
src/app/api/shipments/                  # Shipment management (NEW)
src/app/api/bom/[id]/create-pos/        # BOM→PO creation (NEW)
src/app/api/purchase-orders/[id]/       # PO receiving → WH-RECEIVING
src/app/api/                            # 253 API route files
src/lib/documents/                      # PDF generators: PO, Invoice, WO, Packing List (NEW)
src/lib/ai/                             # All AI modules
src/lib/excel/                          # Excel import/export + AI
src/components/bom/                     # BOM components: line manager, status, tree (ENHANCED)
src/components/                         # 50+ feature component sets
CLAUDE.md                               # AI coding conventions
HANDOVER-SESSION.md                     # This file
```

---

## RISK & TECHNICAL DEBT

| # | Van de | Muc do | Ghi chu |
|---|--------|--------|---------|
| 1 | Test coverage thap | HIGH | 253 API routes nhung chi ~10 test files |
| 2 | Audit Trail chua co | HIGH | Can ChangeLog model cho enterprise compliance |
| 3 | Approval Workflows chua co | HIGH | PO/WO release can multi-step approval |
| 4 | V2 API chua hoan thanh | MEDIUM | Hau het routes con o V1 |
| 5 | Warehouse type la String | LOW | Khong phai enum, can validate trong code |
| 6 | pg_dump version mismatch | LOW | Prod v18, local v14 — phai dung pg_dump v18 |
| 7 | Zod z.record() | FIXED | Da fix 02/04 — can explicit key schema |
| 8 | Prisma JSON fields | FIXED | Da fix — cast to object truoc khi save |
| 9 | Buffer/Uint8Array | FIXED | Da fix — NextResponse can Uint8Array |
| 10 | Nodemailer | FIXED | Da fix — dynamic import only |

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
```

**Tong ket:** Du an da UAT Ready, 234 commits, 152 models, 253 API routes, 300K+ LOC.
Sprint 4 dang trien khai — da hoan thanh PDF, Shipments, Warehouse Approval, BOM→PO.
Con lai: Audit Trail + Approval Workflows.

---

## KHI TRO LAI

**Noi voi Claude:** "Doc HANDOVER-SESSION.md de tiep tuc"

**Viec tiep theo nen lam (theo thu tu uu tien):**
1. Audit Trail (who, when, old → new) - **Critical** cho enterprise compliance
2. Approval Workflows (PO, WO release) - **Critical** multi-step, role-based
3. Excel Export nang cao (BOM tree, filters) - High
4. Barcode/QR Generation + Print labels - High
5. Role-based Dashboards (CEO, Kho, SX, Mua hang) - High
6. Tang test coverage (target: 50%+ API routes) - Medium
7. Data sync Local → Production (pg_dump/pg_restore) - khi can

---

*Cap nhat lan cuoi: 2026-02-13 VN*
*Du an: RTR-MRP - Material Requirements Planning System*
*Handover prepared by: Claude Opus 4.6*
