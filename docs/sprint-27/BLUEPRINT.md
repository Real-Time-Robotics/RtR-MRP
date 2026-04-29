# Sprint 27 — Electronics/R&D Workflow + IA Restructure · BLUEPRINT

> Branch: `feat/sprint-27-electronics-ia` (tách từ `main` sau khi Sprint 26 merge)
> Mục tiêu: Phòng điện tử + R&D + kho + sản xuất tắt được Excel DASHBOARD, chuyển toàn bộ workflow sang app. Kèm IA restructure để 3 phòng cùng dùng được mà không ngợp.
> Thời lượng: 2 tuần.
>
> **Checkpoint:** Lâm cần trả lời `APPROVED` để spawn Thợ. Sau approve, Blueprint là khế ước — không đổi kiến trúc giữa sprint.

---

## 1. Requirements (REQ-ID mapping)

Lấy từ Vision Sprint 27 đã approve + DASHBOARD-da1f05cc.xlsx domain analysis.

| REQ-ID | Mô tả | Nguồn | Priority |
|---|---|---|---|
| REQ-27-01 | Part.category chuyển từ String flat sang FK đến `Category` taxonomy 2 tầng. Migrate 138 category rải rác về 20-30 nhóm chuẩn. | DASHBOARD DANH_MUC §Category=138 rải rác | P1 |
| REQ-27-02 | Thêm entity `ModuleDesign` thay cho khái niệm "Project". Mỗi module (Hera IO1 v1.5, Cube, ...) là 1 entity với prefix, version, sourceType. | DASHBOARD DU_AN 72 projects, SERIAL_GEN 13 rules | P0 |
| REQ-27-03 | Thêm field `BomLine.sourceType: INTERNAL \| EXTERNAL` phân biệt module tự gia công vs mua nguyên khối. | DASHBOARD BOM_CHUAN TYPE=INTERNAL/EXTERNAL | P0 |
| REQ-27-04 | Thêm entity `SerialUnit` (first-class per-unit serial tracking): serial unique, productId/moduleDesignId, status (TỒN/DÙNG/XUẤT/LỖI/TRẢ), source (GIA_CONG/NHAP), userId, inventoryLocationId. | DASHBOARD SERIAL_MASTER 280 rows + gap critical | P0 |
| REQ-27-05 | Thêm entity `SerialLink(parentId, childId)` để genealogy parent-child. Validate: parent serial có BOM ≥ child product type. | DASHBOARD SERIAL_LINK entity empty (ý đồ có, chưa dùng) | P0 |
| REQ-27-06 | Thêm entity `SerialNumberingRule` + service `generateSerial(productId)`. Format PREFIX-VER-DDMMYY-### (vd IO1-V15-091025-041). Counter tăng theo tháng, lưu state tránh trùng. | DASHBOARD SERIAL_GEN 13 rules | P0 |
| REQ-27-07 | Thêm entity `AssemblyOrder` — ghép child serial thành parent serial cho EBOX. Có flow: chọn BOM → scan child serial → validate → generate parent serial → tạo SerialLink. | DASHBOARD BOM_CHUAN EBOX_IO1/EBOX_DTC/EBOX_LPR + SERIAL_LINK ý đồ | P0 |
| REQ-27-08 | Wire `WorkOrder` → `ProductionReceipt` → sinh `SerialUnit` tự động khi WO complete + part/product có `serialControl=true`. | Luồng GIA CÔNG hiện tại trong DASHBOARD | P0 |
| REQ-27-09 | One-time data migration: import DASHBOARD-da1f05cc.xlsx vào DB. Scope: 1066 parts (DANH_MUC), 138 category, 280 serial (SERIAL_MASTER), 13 numbering rules (SERIAL_GEN), 31 BOM_CHUAN lines, 2819 DU_AN BOM lines, 2084 NHAP_KHO + 998 XUAT_KHO (lot_transactions). | DASHBOARD là source-of-truth hiện tại | P0 |
| REQ-27-10 | Mô hình RBAC 6 roles: `engineer`, `warehouse`, `production`, `procurement`, `admin`, `viewer`. User có 1+ role. Permission check ở tầng middleware. | Vision §Sidebar role-gated | P0 |
| REQ-27-11 | Sidebar refactor 8 cụm: Trang chủ / Công việc của tôi / Vận hành / Tra cứu / Kỹ thuật & R&D / Mua hàng / Kho / Báo cáo / Quản trị. 5 cụm chung ai cũng thấy, 4 cụm role-gated. | Vision §Sidebar restructure | P0 |
| REQ-27-12 | Trang "Vận hành" 5 action tối thiểu 3 cái implement Sprint 27: Gia công (Work Order), Lắp ráp (Assembly), Xuất hàng (Issue). 2 cái còn lại (Nhận hàng, Kiểm kho) dùng route hiện có wire vào. | Vision §Vận hành | P1 |
| REQ-27-13 | Trang "Tra cứu Serial" — unified search box nhập serial → trả về: product, status, source, user, ngày, location, parent (nếu có), list children (nếu có). | Vision §Tra cứu | P0 |
| REQ-27-14 | Ẩn khỏi sidebar chính (nhưng giữ route): Finance/Invoice/Payment, AI/ML/forecast, Multi-tenant/subscription/billing, Mobile-specific routes, Compliance menu (giữ field ở Part). Admin vẫn vào được qua Quản trị → Toggle. | Vision §Simplify | P1 |

---

## 2. Task Graph

```
Wave 1 (schema foundation, parallel):
  ┌── TIP-S27-01 (Schema foundations: Category + ModuleDesign + BomLine.sourceType)
  └── TIP-S27-05 (RBAC: Role model + 6 roles + permission middleware) ── độc lập

Wave 2 (depends on Wave 1, parallel):
  ┌── TIP-S27-02 (Serial domain: SerialUnit + SerialLink + NumberingRule + service)
  └── TIP-S27-04 (Data migration: import DASHBOARD.xlsx)

Wave 3 (depends on TIP-S27-02):
  └── TIP-S27-03 (Assembly flow: AssemblyOrder + WO→Serial wiring)

Wave 4 (depends on TIP-S27-05):
  └── TIP-S27-06 (Sidebar IA: 8 cụm component + role-gated)

Wave 5 (depends on Wave 3 + 4, parallel):
  ┌── TIP-S27-07 (Vận hành MVP: 3 action pages)
  └── TIP-S27-08 (Tra cứu Serial + route hiding)
```

**Timeline:**
- Tuần 1: Wave 1 + Wave 2 (schema + RBAC + data migration)
- Tuần 2: Wave 3 + Wave 4 + Wave 5 (assembly flow + sidebar + pages)

**Commit strategy:** 1 commit/TIP, conventional commits (`feat(schema):`, `feat(serial):`, `feat(ui):`, `chore(migration):`). 8 commit total.

---

## 3. TIP Summaries

### TIP-S27-01 · `feat(schema): category taxonomy + moduleDesign + BomLine.sourceType`

**Scope:**
- Thêm Prisma model `Category` với hierarchy 2 tầng (`parentId: String?`, self-relation).
- Thêm Prisma model `ModuleDesign` (id, code unique — vd HERA_IO1_V15, name, version, prefix, isInternal Boolean, bomHeaderId FK, status ACTIVE/DEPRECATED/DEVELOPMENT).
- Đổi `Part.category` từ String sang `categoryId String?` (nullable để backward-compat) + relation.
- Thêm field `BomLine.sourceType: BomSourceType { INTERNAL, EXTERNAL }`.

**Migration file:** `prisma/migrations/YYYYMMDD_add_taxonomy_moduledesign_bomline_sourcetype/migration.sql`

**Acceptance:**
- Schema compile, `prisma generate` pass.
- `prisma migrate dev` apply thành công trên máy local (không hang advisory lock — nhớ Sprint 26 retrospective).
- Rollback migration test được: `prisma migrate resolve --rolled-back <name>` rồi re-apply OK.
- Unit test: `Category.parent` self-relation query đúng 2 tầng; `BomLine.sourceType` default = INTERNAL.
- Grep: `Part.category: String` không còn trong src/ (replaced by categoryId).

**Non-scope:** KHÔNG migrate data, chỉ schema. Data migration ở TIP-S27-04.

---

### TIP-S27-02 · `feat(serial): SerialUnit + SerialLink + SerialNumberingRule + generator service`

**Scope:**
- Thêm Prisma model `SerialUnit`:
  ```
  id, serial (unique), productId?, moduleDesignId?, partId?,
  status: SerialStatus { IN_STOCK, ALLOCATED, CONSUMED, SHIPPED, SCRAPPED, RETURNED },
  source: SerialSource { MANUFACTURED, RECEIVED, IMPORTED },
  inventoryId? (where it physically is), warehouseId?, locationCode?,
  createdByUserId, createdAt, updatedAt,
  productionReceiptId?, grnItemId?,
  notes, meta Json?
  ```
- Thêm Prisma model `SerialLink`:
  ```
  id, parentSerialId, childSerialId,
  bomLineId? (link về dòng BOM đã dùng),
  assemblyOrderId?,
  linkedAt, linkedByUserId
  @@unique([childSerialId])  ← child chỉ có 1 parent
  ```
- Thêm Prisma model `SerialNumberingRule`:
  ```
  id, moduleDesignId unique,
  prefix (vd "IO1"), version (vd "V15"),
  counterLastMMYY (Int? — store MMYY format: 0925 = Sep 2025),
  counter Int @default(0),
  template String (vd "{prefix}-{version}-{ddmmyy}-{###}"),
  updatedAt
  ```
- Service `src/lib/serial/numbering.ts`:
  - `generateSerial(moduleDesignId: string, now?: Date): Promise<string>`
  - Atomic transaction (SELECT FOR UPDATE hoặc Prisma `$transaction` với retry) để tránh race condition sinh trùng.
  - Reset counter khi MMYY khác: nếu `counterLastMMYY !== currentMMYY` → counter = 1, update `counterLastMMYY`.
- API routes:
  - `POST /api/serial/generate` — body `{moduleDesignId}` → trả `{serial}`
  - `GET /api/serial/:serial` — trả full info (SerialUnit + parent link + children links)
  - `POST /api/serial/:serial/status` — body `{status, note}` → update

**Acceptance:**
- `prisma migrate dev` pass.
- Unit test `numbering.test.ts`:
  - Generate 10 serial same module → counter tăng 1,2,...,10.
  - Generate across month boundary (mock Date) → counter reset to 1 khi sang tháng mới.
  - Concurrent `Promise.all` 50 generate → 50 serial unique (không trùng).
- Unit test `serial-api.test.ts`:
  - POST /api/serial/generate → 201, serial match format.
  - GET /api/serial/:serial → 200, đầy đủ fields.
  - POST status → 200, update DB.
- Integration test với Postgres thật (trong CI test profile).

---

### TIP-S27-03 · `feat(assembly): AssemblyOrder + WO→serial wiring`

**Scope:**
- Thêm Prisma model `AssemblyOrder`:
  ```
  id, aoNumber (unique),
  productId (EBOX), bomHeaderId,
  targetQuantity,
  status: AssemblyOrderStatus { DRAFT, IN_PROGRESS, COMPLETED, CANCELLED },
  parentSerialId? (serial EBOX sinh ra),
  assignedToUserId?,
  createdAt, startedAt?, completedAt?,
  notes
  ```
- Flow Assembly (API):
  - `POST /api/assembly` tạo AO, status = DRAFT.
  - `POST /api/assembly/:id/scan-child` body `{childSerial}` → validate:
    - SerialUnit status = IN_STOCK
    - product của child nằm trong BOM của EBOX parent
    - chưa được dùng ở AO khác (check SerialLink unique)
  - `POST /api/assembly/:id/complete` body `{}` → validate đủ BOM lines → call `generateSerial(bomHeader.productId)` → tạo SerialUnit parent → tạo SerialLink cho từng child → mark children status = CONSUMED → update AO status = COMPLETED.

- Wire WorkOrder → ProductionReceipt → SerialUnit:
  - Sửa `POST /api/manufacturing/:id/complete` (route hiện tại hoặc thêm mới).
  - Khi WO.completedQty tăng và `Product.serialControl === true` (hoặc check qua ModuleDesign):
    - Loop completedQty lần, call `generateSerial(moduleDesignId)`, tạo SerialUnit với source=MANUFACTURED, productionReceiptId, status=IN_STOCK.
  - Không break logic ProductionReceipt hiện có.

**Acceptance:**
- Unit test `assembly.test.ts`:
  - Tạo AO → scan đủ child → complete → parent serial sinh ra, 10 SerialLink tạo đúng, children status=CONSUMED.
  - Scan child không đúng BOM → 400.
  - Scan child đã CONSUMED → 400.
  - Complete khi thiếu BOM lines → 400.
- Unit test `wo-serial-wiring.test.ts`:
  - WO complete với product serial-controlled → N serial sinh ra, status IN_STOCK, linked về ProductionReceipt.
  - WO complete với product non-serial → không sinh serial (non-regression).

---

### TIP-S27-04 · `chore(migration): import DASHBOARD.xlsx into DB`

**Scope:**
- Script `scripts/migrate-dashboard-xlsx.ts`:
  - Đọc `DASHBOARD-da1f05cc.xlsx` từ path chỉ định.
  - Thứ tự import (tôn trọng FK):
    1. `Category` — từ DANH_MUC col "Category" distinct (138 values) → cluster về 20-30 nhóm (phải có mapping table trong script, review trước).
    2. `Part` — từ DANH_MUC 1066 rows. Match category qua mapping. Upsert by partNumber.
    3. `Supplier` — từ DANH_MUC col "Supplier" (3 distinct). Upsert by name.
    4. `PartSupplier` — từ DANH_MUC (part, supplier, price). Upsert.
    5. `Product` (EBOX) — từ BOM_CHUAN col Product distinct (EBOX_IO1, EBOX_DTC, EBOX_LPR). Upsert by sku.
    6. `ModuleDesign` — từ SERIAL_GEN 13 rows + BOM_CHUAN col Component + DU_AN col Project distinct. Cluster về unique list. Upsert by code.
    7. `BomHeader` + `BomLine` — 2 BOM:
       - EBOX level (BOM_CHUAN): parent=EBOX Product, child=ModuleDesign, `sourceType = TYPE` (INTERNAL/EXTERNAL).
       - Module level (DU_AN): parent=ModuleDesign, child=Part, 2819 lines.
    8. `SerialNumberingRule` — từ SERIAL_GEN 13 rows. Map: Product tên → moduleDesignId, prefix, version, counter, counterLastMMYY.
    9. `SerialUnit` — từ SERIAL_MASTER 280 rows. Map Status "TỒN" → IN_STOCK, "ĐÃ XUẤT" → SHIPPED. Source "GIA CÔNG" → MANUFACTURED, "NHẬP" → RECEIVED. User HAI/hải → match User.
    10. `LotTransaction` — từ NHAP_KHO 2084 + XUAT_KHO 998 rows. Map Date, partId, qty, type=RECEIVED/ISSUED.
  - Idempotent: chạy lại không trùng (upsert by unique key).
  - Dry-run flag: `--dry-run` in ra số lượng sẽ import mà không commit.
  - Log output: số row thành công + lỗi chi tiết per entity.

**Acceptance:**
- `npm run migrate:dashboard -- --dry-run` chạy không lỗi, in ra count chuẩn.
- `npm run migrate:dashboard` chạy thật trên DB local sạch:
  - 1066 parts imported
  - 20-30 category (review mapping)
  - ~80 moduleDesign (cluster từ 72 projects + 13 rules + BOM components)
  - 3 product (EBOX)
  - 2 BomHeader (EBOX_IO1, EBOX_DTC, EBOX_LPR) + 30 BomLine
  - ~80 BomHeader module-level + 2819 BomLine
  - 13 SerialNumberingRule
  - 280 SerialUnit
  - 3082 LotTransaction
- Chạy lại script → upsert idempotent, không tạo duplicate.
- Sample query sau migrate:
  - `SELECT count(*) FROM serial_units WHERE status='IN_STOCK'` → 273
  - `SELECT * FROM serial_numbering_rules WHERE prefix='IO1'` → 1 row, version V15
  - `SELECT sourceType, count(*) FROM bom_lines GROUP BY sourceType` → INTERNAL, EXTERNAL counts match DASHBOARD.

**Non-scope:** Không migrate LAP_RAP_LOG (đang trống) và "Câu trả lời biểu mẫu 2" (chỉ 8 row thử nghiệm).

---

### TIP-S27-05 · `feat(auth): RBAC role model + 6 roles + permission middleware`

**Scope:**
- Thêm Prisma model `Role`:
  ```
  id, code (unique: "engineer"|"warehouse"|"production"|"procurement"|"admin"|"viewer"),
  name, description
  ```
- Thêm Prisma model `UserRole(userId, roleId)` many-to-many.
- Seed 6 role records.
- Middleware `src/lib/auth/rbac.ts`:
  - `hasRole(user, role: RoleCode): boolean`
  - `requireRole(...roles: RoleCode[])` HOF wrap handler, return 403 nếu user không có role.
  - Default admin có all roles.
- Compose với existing `withPermission`:
  ```
  export const GET = withPermission(
    requireRole('engineer', 'admin')(handler),
    { read: 'modules:read' }
  );
  ```
- Cập nhật `/api/users/[id]/roles` để admin assign role.

**Acceptance:**
- Schema compile + migrate pass.
- Seed 6 roles chạy OK (idempotent).
- Unit test `rbac.test.ts`:
  - User có role 'engineer' → `hasRole('engineer')` true, `hasRole('warehouse')` false.
  - `requireRole('admin')` wrap handler: user thường → 403, admin → pass.
  - User không có role nào → 403 mọi route role-gated.
- Migration script gán role default cho existing user (admin đầu tiên = 'admin' full, còn lại = 'viewer' — để Lâm re-assign sau).

---

### TIP-S27-06 · `feat(ui): sidebar IA refactor — 8 cụm, role-gated`

**Scope:**
- Component mới `src/components/layout/sidebar-v2.tsx` với 8 cụm:
  1. 🏠 Trang chủ (all)
  2. ✓ Công việc của tôi (all)
  3. ▶ Vận hành (all, 5 submenu)
  4. 🔍 Tra cứu (all, 4 submenu)
  5. 🔧 Kỹ thuật & R&D (engineer + admin)
  6. 🛒 Mua hàng (procurement + admin)
  7. 📦 Kho (warehouse + admin)
  8. 📊 Báo cáo (all)
  9. ⚙️ Quản trị (admin only)
- Render: đọc user roles từ session, hide cụm nếu không match.
- Feature flag `SIDEBAR_V2=true` để bật/tắt (default true, nhưng giữ sidebar cũ accessible qua flag cho rollback).
- Replace usage trong `src/app/(dashboard)/layout.tsx`.
- Cập nhật 5 landing routes: `/dashboard/my-work`, `/dashboard/operations`, `/dashboard/search`, `/dashboard/reports`, `/dashboard/admin` (nếu chưa có, tạo skeleton page).

**Acceptance:**
- Render sidebar: engineer role → thấy cụm 1,2,3,4,**5**,8 (không thấy 6,7,9).
- Render: warehouse → thấy 1,2,3,4,**7**,8.
- Render: admin → thấy tất cả.
- Snapshot test (playwright hoặc react-testing-library) cho 6 role × sidebar matrix.
- A11y: keyboard-navigable, aria-expanded, role="navigation".
- Feature flag work: set `SIDEBAR_V2=false` → render sidebar cũ.

---

### TIP-S27-07 · `feat(ui): vận hành 3 action pages — Gia công, Lắp ráp, Xuất hàng`

**Scope:**
- `/dashboard/operations/work-order` — list WO theo status + button "Complete" trigger `/api/manufacturing/:id/complete` (TIP-S27-03).
- `/dashboard/operations/assembly` — list AssemblyOrder + UI scan child serial + complete (wire vào TIP-S27-03).
- `/dashboard/operations/issue` — form chọn serial (search hoặc scan) + type (XUẤT CHÍNH / XUẤT LẺ) + call `/api/serial/:serial/status` với status=SHIPPED.
- 2 action còn lại Sprint 27 KHÔNG implement UI mới, chỉ link sang route hiện có:
  - "Nhận hàng" link sang `/dashboard/warehouse-receipts` (route có sẵn).
  - "Kiểm kho" link sang `/dashboard/warehouse/cycle-count` (nếu có, nếu không thì disabled badge "Sprint 28").

**Acceptance:**
- 3 page render không lỗi, e2e smoke test: login warehouse user → thấy vận hành tab → click từng action → load được data.
- Assembly UI: scan serial text input → validate realtime qua API → hiển thị BOM completion progress (X/N children).
- Issue UI: chọn 1 serial → confirm → serial_units.status = SHIPPED + lot_transactions thêm row.

---

### TIP-S27-08 · `feat(ui): tra cứu serial + hide deprecated routes`

**Scope:**
- Trang `/dashboard/search/serial` — search box unified:
  - Input: paste serial hoặc scan barcode.
  - Call `GET /api/serial/:serial`.
  - Render card: Serial, Product, Status (badge), Source, User, Date, Location, Parent serial (link nếu có), Children count (expandable list nếu có).
  - History timeline: list LotTransaction + ScanLog liên quan serial này, sort by date DESC.
- Route hiding (chỉnh sidebar v2 + thêm feature flag):
  - Finance: `/dashboard/finance/*` — hide menu, giữ route.
  - AI/ML: `/dashboard/ai/*`, `/dashboard/ml/*` — hide.
  - Multi-tenant: `/dashboard/tenants/*`, `/dashboard/subscription/*` — hide.
  - Mobile-specific: `/dashboard/mobile/*` — nếu có.
  - Compliance menu: `/dashboard/compliance/*` — hide (Part field vẫn hiển thị ở Part detail).
- Admin toggle ở `/dashboard/admin/feature-flags` để bật lại từng cụm.

**Acceptance:**
- Tra cứu serial: gõ `IO1-V15-081025-041` → trả đủ info trong <500ms.
- Tra cứu EBOX serial → thấy children list 10 module serial, click vào mở child detail.
- Sidebar default: Finance/AI/Multi-tenant/Mobile/Compliance menu không hiển thị.
- Admin vào Feature Flags → bật Finance → sidebar thêm cụm Finance ngay.
- Unit test: filter sidebar theo flag + role matrix đúng.

---

## 4. Constraints & Boundaries

- **KHÔNG xóa route hiện có** khi "ẩn". Chỉ hide khỏi sidebar qua flag. Route vẫn chạy khi truy cập trực tiếp URL.
- **KHÔNG đụng Sprint 26 code** (idempotency, rate limit, BullMQ, raw SQL audit). Chỉ extend.
- **KHÔNG rebase branch khác.** Làm trên `feat/sprint-27-electronics-ia` tách từ `main` sau khi Sprint 26 merge (nếu chưa merge thì tách từ `feat/sprint-26-unblock`).
- **Reuse `withPermission`** Sprint 26 + extend bằng `requireRole` HOF mới. Không thay thế.
- **KHÔNG tự ý thêm package** ngoài: `xlsx` hoặc `exceljs` (TIP-S27-04, nếu chưa có). Verify trước.
- **KHÔNG đụng Prisma schema ngoài 5 entity đã liệt kê** (Category, ModuleDesign, BomLine.sourceType, SerialUnit, SerialLink, SerialNumberingRule, AssemblyOrder, Role, UserRole).
- **i18n:** UI hiển thị tiếng Việt cho user (phòng điện tử + kho dùng tiếng Việt là chính). Error message internal vẫn tiếng Anh.
- **Accessibility:** mọi component mới có aria + keyboard navigation.
- **Testing:** mỗi TIP phải có unit test. TIP UI (06,07,08) cần ít nhất 1 integration test với Playwright nếu setup đã có, hoặc RTL nếu không.

---

## 5. Verify Plan

Sau khi Thợ nộp Completion Report cho cả 8 TIP:

1. **Typecheck toàn repo:** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` — 0 error.
2. **Lint:** `npm run lint` — không tăng số warning so với main.
3. **Unit test:** `npm test` — Sprint 27 tests pass 100%, pre-existing 27 fail không tăng.
4. **Migration clean:** `npx prisma migrate reset --skip-seed` rồi `npx prisma migrate deploy` trên DB local sạch — pass không hang.
5. **Data migration dry-run + real:** chạy `scripts/migrate-dashboard-xlsx.ts` — count khớp expected.
6. **REQ-ID matrix:** mapping REQ-27-01..14 → TIP → test file chứng minh + evidence screenshot.
7. **Smoke test 3 phòng (role-play):**
   - Login engineer → sidebar đúng 6 cụm → vào Kỹ thuật → tạo ModuleDesign mới → release BOM.
   - Login warehouse → sidebar 6 cụm khác → vào Kho → kiểm low stock.
   - Login production → vào Vận hành → Gia công → complete WO → serial sinh ra.
   - Login (same production) → Vận hành → Lắp ráp → scan 10 child serial → complete → EBOX serial generated + 10 SerialLink.
   - Tra cứu serial EBOX vừa tạo → thấy tree parent-children đầy đủ.
8. **Security spot-check:** role-gated route truy cập bằng user không role → 403.
9. **Final report:** `docs/sprint-27/VERIFY_REPORT.md`.

---

## 6. Rollback Plan

Nếu TIP-S27-04 (data migration) corrupt data:
- Script có `--dry-run` đã chạy trước.
- Backup DB trước khi chạy thật: `pg_dump ... > pre-sprint27.sql`.
- Rollback: restore từ backup + `prisma migrate resolve --rolled-back`.

Nếu TIP-S27-02 SerialUnit gây conflict với route cũ:
- `SerialUnit` là entity mới, không thay route cũ. Chỉ extend.
- Nếu generator sinh trùng: disable auto-generate flag, quay về manual gõ serial qua API cũ.

Nếu TIP-S27-06 Sidebar v2 break navigation:
- Set env `SIDEBAR_V2=false` → revert về sidebar cũ ngay.

Nếu TIP-S27-05 RBAC block admin:
- Fallback: env `RBAC_BYPASS=true` tạm thời disable check (chỉ dev).

---

## 7. Deliverables cuối Sprint 27

- Branch `feat/sprint-27-electronics-ia` với 8 commit.
- 8 Completion Report trong `docs/sprint-27/reports/TIP-S27-0X-REPORT.md`.
- 1 `VERIFY_REPORT.md` tổng.
- 1 `DATA_MIGRATION_REPORT.md` (từ TIP-S27-04) kèm mapping 138 category → cluster.
- Script `scripts/migrate-dashboard-xlsx.ts` hoạt động idempotent.
- 0 test fail, 0 type error, 0 new ESLint error.
- DB local sau migrate: 1066 parts, 280 serial, ~80 moduleDesign, đủ 13 numbering rule.
- Sidebar v2 bật mặc định, 3 phòng login được thấy menu riêng.

---

## 8. Rủi ro đã nhận diện

| Rủi ro | Khả năng | Impact | Giảm thiểu |
|---|---|---|---|
| 138 category clustering không đồng thuận với Lâm | Medium | Medium | Thợ đưa mapping file review-able trước khi chạy migrate thật. |
| Serial numbering race condition sinh trùng khi gia công concurrent | Medium | High | SELECT FOR UPDATE + retry + unique constraint ở DB. Unit test 50 concurrent. |
| ModuleDesign code clash giữa SERIAL_GEN (13) + BOM_CHUAN (10) + DU_AN (72) | High | Medium | Script cluster trước + Thợ đưa list review. |
| User hiện tại chưa có role → RBAC block | High | High | Migration script default: first admin user = 'admin' full, còn lại 'viewer'. Lâm tự re-assign qua Quản trị. |
| Sidebar v2 làm mất navigation cũ | Low | High | Feature flag SIDEBAR_V2 giữ rollback path. |
| Assembly BOM validation quá strict block lắp ráp thực tế (có trường hợp dùng part substitute) | Medium | Medium | Support `alternateGroup` hiện có trong BomLine + flag `allowSubstitute` trong AssemblyOrder. |

---

## 9. Câu Lâm cần trả lời

**APPROVED** → tôi spawn 8 TIP cho Thợ theo wave 1→5.
**APPROVED WITH NOTE: [x]** → tôi điều chỉnh chi tiết rồi spawn.
**REVISE: [nội dung]** → tôi sửa Blueprint theo hướng dẫn.
**REJECT** → dừng, quay lại Vision.

---

*Blueprint v1.0 — Chủ thầu viết cho Sprint 27. Sau approve là khế ước.*
