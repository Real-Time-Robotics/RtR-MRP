# Sprint 28 · BLUEPRINT — Production + Bridge Layer Foundation

**Approved:** 2026-04-27 by Lâm
**Branch:** `feat/sprint-28-production-shop-floor`
**Duration:** 2 tuần · 10 TIP · 4 wave

---

## 1. REQ-ID Map (14 REQ → TIP)

| REQ-ID | TIP | Priority |
|---|---|---|
| REQ-28-OP-1 (operator qty entry) | TIP-S28-04 | P0 |
| REQ-28-OP-2 (BOM realtime) | TIP-S28-04 | P1 |
| REQ-28-OP-3 (clock in/out) | TIP-S28-04 | P0 |
| REQ-28-SV-1 (shift dashboard) | TIP-S28-07 | P0 |
| REQ-28-SV-2 (auto-aggregate) | TIP-S28-06 | P0 |
| REQ-28-SV-3 (downtime quick) | TIP-S28-05 | P0 |
| REQ-28-QD-1 (daily plan UI) | TIP-S28-03 | P0 |
| REQ-28-QD-2 (re-plan late WO) | TIP-S28-03 | P1 |
| REQ-28-QD-3 (weekly capacity) | TIP-S28-03 | P2 (defer ok) |
| REQ-28-BT-1 (equipment status) | TIP-S28-05 | P1 |
| REQ-28-BT-2 (1-click downtime) | TIP-S28-05 | P0 |
| REQ-28-BT-3 (maintenance schedule) | TIP-S28-05 | P2 |
| REQ-28-TP-1 (production report) | TIP-S28-08 | P0 |
| REQ-28-TP-2 (export PDF/Excel) | TIP-S28-08 | P1 |

## 2. Task Graph (4 wave)

```
Wave 1 (parallel, foundation):
  ┌── TIP-S28-01 · Schema 4 entity mới + simplify 4 entity cũ
  └── TIP-S28-02 · Sidebar v2 cụm "Sản xuất" + role-gate

Wave 2 (depend Wave 1, parallel):
  ┌── TIP-S28-03 · Daily Production Plan API + UI quản đốc
  ├── TIP-S28-04 · Operator mobile: shift log + clock + qty entry
  └── TIP-S28-05 · Equipment + DowntimeRecord (báo sự cố 1-click)

Wave 3 (depend Wave 2):
  ┌── TIP-S28-06 · ShiftReport service (auto-aggregate)
  ├── TIP-S28-07 · Supervisor dashboard ca
  └── TIP-S28-08 · Production Report + export PDF/Excel

Wave 4 (depend Wave 1, parallel với Wave 2-3):
  ┌── TIP-S28-09 · Bridge Layer MVP (DataSource + MappingRule + upload UI + parser)
  └── TIP-S28-10 · Demo seed data + E2E smoke 5 personas
```

**Timeline:**
- Tuần 1: Wave 1 → Wave 2.
- Tuần 2: Wave 3 → Wave 4 → VERIFY.

## 3. TIP Summaries

### TIP-S28-01 · Schema foundation
**Scope:** Thêm 4 model: `DailyProductionPlan`, `DailyProductionPlanLine`, `ShiftReport`, `DataSource`, `MappingRule`. Simplify 4 entity (WorkCenter form 5 field core, LaborEntry rebrand display "ShiftLog", Shift drop overtime/efficiency UI, ShiftAssignment drop leave). Migration `prisma migrate diff + deploy` (non-TTY safe).
**Acceptance:** schema compile, prisma generate OK, migration apply không hang, 8 unit test schema.
**Non-scope:** không drop entity, không touch API hiện có.

### TIP-S28-02 · Sidebar cụm Sản xuất
**Scope:** `src/components/layout/sidebar-v2.tsx` thêm 1 group `production` role-gated `['production', 'admin']`, 6 sub-menu:
- Kế hoạch ngày (`/dashboard/production/daily-plan`)
- Báo cáo ca (`/dashboard/production/shift-report`)
- Operator (`/dashboard/production/shift-entry` mobile)
- Thiết bị (`/dashboard/production/equipment`)
- Sự cố máy (`/dashboard/production/downtime`)
- Báo cáo sản xuất (`/dashboard/production/report`)

Skeleton page cho 6 route. Tests update sidebar matrix +6 group → +6 test case role × group.
**Acceptance:** production role thấy 6 cụm trong sidebar; 6 route render skeleton không 404.

### TIP-S28-03 · Daily Production Plan
**Scope:**
- API `/api/production/daily-plan` CRUD + line management.
- UI `/dashboard/production/daily-plan` quản đốc:
  - Lịch tuần (7 ngày column).
  - Drag/drop WO từ "WO chưa gán" sang ngày + work center.
  - Click line → mở dialog assign operator + thời gian.
  - Auto-flag WO trễ (dueDate < today + status != COMPLETED).
- Weekly capacity view P2 (đơn giản: tổng work center capacity per day vs assigned WO qty).
**Acceptance:** quản đốc tạo plan tuần + drag/drop hoạt động + WO trễ flag đỏ.

### TIP-S28-04 · Operator mobile shift entry
**Scope:**
- Trang `/dashboard/production/shift-entry` mobile-first 375px responsive.
- Operator login → thấy:
  - Card "Bắt đầu ca" (chọn work center + ca → tạo ShiftAssignment + LaborEntry start).
  - List WO assigned ca này.
  - Click 1 WO → form nhập qty produced + qty scrap → submit tạo LaborEntry per-WO.
  - Card "Kết thúc ca" → đóng LaborEntry, tổng kết.
  - BOM của WO collapsible (REQ-28-OP-2).
- API `/api/production/shift-entry/start`, `/append-qty`, `/end`.
**Acceptance:** flow operator clock-in → 3 WO entry → clock-out → ShiftAssignment + N LaborEntry sinh đúng.

### TIP-S28-05 · Equipment + Downtime
**Scope:**
- Trang `/dashboard/production/equipment` list + status badge.
- Trang `/dashboard/production/downtime` list + filter.
- Operator UI (TIP-04 mobile): nút "Báo sự cố" trong WO card → dialog 1-click chọn lý do (4 option) + free text → API tạo DowntimeRecord.
- Lịch maintenance 7 ngày tới (REQ-28-BT-3) trên dashboard quản đốc TIP-03 (chỉ widget).
**Acceptance:** operator báo downtime 1-click → record tạo + supervisor thấy realtime trong dashboard.

### TIP-S28-06 · ShiftReport service auto-aggregate
**Scope:**
- Service `src/lib/production/shift-report.ts`:
  - `generateShiftReport(shiftAssignmentId | date+workCenterId)`.
  - Aggregate từ LaborEntry (qty/scrap) + DowntimeRecord (downtime min) + ProductionReceipt (output confirmed).
  - Cache result vào model `ShiftReport`.
  - Re-generate idempotent (delete + recreate).
- BullMQ job: cuối ca tự generate (cron 14:30 + 22:30 + 06:30 ứng 3 ca).
- API `/api/production/shift-report?date=&workCenterId=`.
**Acceptance:** sau ca, ShiftReport tạo auto + số liệu match LaborEntry tổng.

### TIP-S28-07 · Supervisor dashboard ca
**Scope:**
- Trang `/dashboard/production/shift-report` supervisor view:
  - Hiện ca đang chạy: WO list + progress bar + operator + scrap.
  - Toàn cảnh ca trước.
  - Khoảng giữa: WO list assigned + status (chưa bắt đầu/đang làm/xong/dừng).
  - Click WO → drill xuống LaborEntry list + DowntimeRecord.
- Realtime update qua polling 30s (hoặc Redis pub/sub Sprint 29).
**Acceptance:** supervisor xem ca thấy data live, click WO drill OK.

### TIP-S28-08 · Production Report
**Scope:**
- Trang `/dashboard/production/report` trưởng phòng:
  - Filter: range date (today/this week/this month/custom).
  - KPI cards: tổng output, scrap %, on-time %, OT hours (từ LaborEntry).
  - Top 5 WO trễ + Top 5 máy downtime.
  - Chart: output theo ngày, scrap rate trend.
- Button "Export PDF" + "Export Excel":
  - PDF qua reportlab/skill `pdf` template.
  - Excel qua xlsx (đã có dep) — sheet KPI + sheet detail.
**Acceptance:** trưởng phòng filter range, export 2 format thành công.

### TIP-S28-09 · Bridge Layer MVP
**Scope:**
- Schema `DataSource` + `MappingRule` (đã có ở TIP-01).
- API:
  - `POST /api/data-sources` create source (type=excel_upload).
  - `POST /api/data-sources/:id/upload` multipart file → parse Excel → preview rows.
  - `POST /api/data-sources/:id/mappings` lưu mapping declarative.
  - `POST /api/data-sources/:id/sync` apply mapping → upsert canonical.
- UI `/dashboard/admin/data-sources`:
  - List source + upload button.
  - Mapping editor: cột Excel → field canonical (dropdown + autocomplete).
  - Dry-run preview table (10 row đầu apply mapping).
  - Apply button → trigger ingestion.
- Service `src/lib/bridge/{ingestion,mapping}.ts`.
- Reuse pattern Sprint 27 TIP-S27-04 (idempotent upsert, dbWrite gate).
**Acceptance:** admin upload 1 Excel mẫu phòng, define mapping 5 cột, dry-run preview OK, apply → data vào canonical (vd 10 part mới import vào DB).

### TIP-S28-10 · Demo seed + E2E smoke
**Scope:**
- Seed script `prisma/seed-production.ts`:
  - 5 user demo (1 quản đốc, 2 supervisor, 5 operator, 1 bảo trì, 1 trưởng phòng) + role assigned.
  - 3 WorkCenter (SMT, Hand Assembly, QC).
  - 3 Shift (Sáng 06-14, Chiều 14-22, Đêm 22-06).
  - 5 WO test.
- E2E smoke test (Playwright nếu có, RTL nếu không):
  - Quản đốc tạo daily plan → WO assigned.
  - Operator clock-in → WO entry qty → clock-out.
  - Supervisor dashboard thấy ca live.
  - ShiftReport auto-generate cuối ca.
  - Trưởng phòng export PDF.
**Acceptance:** seed chạy idempotent, 5 smoke pass.

## 4. Constraints

- **KHÔNG drop entity hiện có** — chỉ HIDE khỏi sidebar/UI, route legacy access giữ.
- **KHÔNG đụng Sprint 27 code** ngoài extend (sidebar-v2 thêm group, không xóa group cũ).
- **KHÔNG dùng `prisma migrate dev`** (non-TTY hang).
- **Reuse** `requireRole` Sprint 27, BullMQ Sprint 26, generateSerial nếu có serial-controlled product.
- **KHÔNG tự ý thêm package.** `xlsx` đã có. PDF dùng skill `pdf` hoặc `react-pdf`.
- **i18n:** tiếng Việt UI, tiếng Anh code/log.
- **A11y:** mobile shift-entry có aria-label, button kích thước ≥ 44×44 px (touch target).
- **Mobile-first** TIP-04 + TIP-07 — RTL test viewport 375px.

## 5. Verify Plan

Sau khi 10 TIP nộp Completion Report:

1. Typecheck `npx tsc --noEmit` 0 error mới.
2. Lint không tăng warning.
3. Migration chain reset+deploy clean (Sprint 26+27+28).
4. Tests ≥80 pass + REQ-ID matrix.
5. E2E 5 personas smoke (operator/supervisor/quản đốc/bảo trì/trưởng phòng).
6. Bridge layer demo: upload 1 Excel mẫu phòng → import canonical.
7. `VERIFY_REPORT.md` Sprint 28.

## 6. Rollback

- Schema rollback: migration revert SQL Lâm cấp (mỗi migration TIP-01 có down script).
- Sidebar rollback: `NEXT_PUBLIC_SIDEBAR_V2=false` → legacy sidebar.
- Bridge layer rollback: `DROP TABLE data_sources, mapping_rules` không ảnh hưởng entity khác.

## 7. Lâm chỉ cần trả 1 câu

**APPROVED** → tôi spawn TIP-S28-01 + TIP-S28-02 (Wave 1 parallel) ngay.
