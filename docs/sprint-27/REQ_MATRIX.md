# Sprint 27 · REQ-ID Matrix

> Cross-reference: 14 REQ-ID (Blueprint §1) → 8 TIP → commit → file evidence → test evidence.
> Đối chiếu trước khi VERIFY phase tổng. Tham chiếu cuối Sprint cho audit + Sprint 28 planning.

| REQ-ID | Mô tả ngắn | TIP | Commit | Schema/file evidence | Test evidence | Status |
|---|---|---|---|---|---|---|
| **REQ-27-01** | Part.category String → FK Category 2-tier, migrate 138→25 cluster | TIP-01 (schema) + TIP-04 (data) | `b905a8e` + `9ed3bc2`+`f976e72` | `prisma/schema.prisma` model `Category` + `Part.categoryId String?` · `scripts/dashboard-category-mapping.json` (137 entry, 25 cluster) | `src/lib/__tests__/schema-sprint27-01.test.ts` (Category 2-tier) | ✓ DONE (categoryRef migration of 775 String usages → Sprint 28) |
| **REQ-27-02** | ModuleDesign entity (prefix, version, isInternal, status) | TIP-01 + TIP-04 | `b905a8e` + `9ed3bc2` | `prisma/schema.prisma` model `ModuleDesign` + enum `ModuleDesignStatus` · 148 ModuleDesign import từ 3 sheet | `schema-sprint27-01.test.ts` | ✓ DONE |
| **REQ-27-03** | BomLine.sourceType: INTERNAL \| EXTERNAL | TIP-01 | `b905a8e` | `prisma/schema.prisma` enum `BomSourceType` + `BomLine.sourceType BomSourceType @default(INTERNAL)` | `schema-sprint27-01.test.ts` (sourceType default) | ✓ DONE (DB: INTERNAL=1786, EXTERNAL=7) |
| **REQ-27-04** | SerialUnit first-class entity (status×6, source×3, location, user) | TIP-02 | `2fb0129` | `prisma/schema.prisma` model `SerialUnit` + enums `SerialStatus`, `SerialSource` · 280 SerialUnit imported (273 IN_STOCK) | `src/lib/serial/__tests__/numbering.test.ts` (7 test) · `src/app/api/serial/__tests__/serial-api.test.ts` (6 test) | ✓ DONE |
| **REQ-27-05** | SerialLink parent-child genealogy (childSerialId unique) | TIP-02 (model) + TIP-03 (FK) | `2fb0129` + `429c4bc` | `prisma/schema.prisma` model `SerialLink` · `assemblyOrderId` FK relation L7060 (TIP-03 convert) | `src/lib/assembly/__tests__/service.test.ts` (genealogy test) | ✓ DONE |
| **REQ-27-06** | SerialNumberingRule + generateSerial service (atomic + month rollover) | TIP-02 | `2fb0129` | `model SerialNumberingRule` · `src/lib/serial/numbering.ts` (Serializable + retry 3× + backoff) | `numbering.test.ts` 7/7 (rollover, sequential 50, counter > 999) | ✓ DONE (concurrent integration test pending Sprint 28 — see TIP-S27-02-REPORT) |
| **REQ-27-07** | AssemblyOrder + scan-child + complete generate parent serial | TIP-03 | `429c4bc` | `model AssemblyOrder` + enum `AssemblyOrderStatus` · `src/lib/assembly/service.ts` (`completeAssemblyOrder` atomic) · 8 API route | `src/lib/assembly/__tests__/service.test.ts` 9/9 · `src/app/api/assembly/__tests__/api.test.ts` 6/6 | ✓ DONE |
| **REQ-27-08** | WO complete → auto sinh SerialUnit nếu serialControl | TIP-03 | `429c4bc` | `src/lib/mrp-engine/work-order.ts` `generateSerialsForCompletedWO` · wrap trong WO complete transaction | `src/app/api/manufacturing/__tests__/wo-serial-wiring.test.ts` 3/3 (non-regression + happy + no-rule) | ✓ DONE |
| **REQ-27-09** | Import DASHBOARD.xlsx (1066 part, 280 serial, 13+ rule, BOM 2 level, lot transactions) | TIP-04 + TIP-04-FIX | `9ed3bc2` + `f976e72` | `scripts/migrate-dashboard-xlsx.ts` 690 line · idempotent dbWrite() · 11 sheet import | `src/lib/__tests__/migrate-dashboard-xlsx.test.ts` 14 test (cluster + enum + dry-run gating) | ✓ DONE (5 known discrepancies documented in `RECONCILIATION.md`, 56 missing parts in `MISSING_PARTS.md`) |
| **REQ-27-10** | RBAC 6 roles + middleware + per-user assignment | TIP-05 | `33ce159` | `model Role` + `model UserRole` · `src/lib/auth/rbac.ts` `hasRole`, `requireRole`, `getUserRoles` · seed 6 role idempotent · `/api/users/:id/roles` admin-gated | `src/lib/auth/__tests__/rbac.test.ts` 12/12 | ✓ DONE (39 user.role String usages migration → Sprint 28) |
| **REQ-27-11** | Sidebar refactor 8 cụm (5 chung + 3 role-gated) | TIP-06 | `fc9e6e0` | `src/components/layout/sidebar-v2.tsx` 9 cụm group config · `getUserRoles` server-side fetch · `FEATURE_FLAGS.SIDEBAR_V2` rollback | `src/components/layout/__tests__/sidebar-v2.test.tsx` 10/10 (role × group matrix) · `sidebar-feature-flag.test.tsx` 3/3 | ✓ DONE |
| **REQ-27-12** | Vận hành 3 action: Gia công · Lắp ráp · Xuất hàng (2 còn lại link route hiện có) | TIP-07 | `b188e3f` | `/dashboard/operations/work-order/page.tsx` · `/operations/assembly/page.tsx` + `[id]/page.tsx` · `/operations/issue/page.tsx` · cập nhật landing card | `work-order/__tests__/page.test.tsx` 3 · `assembly/__tests__/list.test.tsx` 2 · `assembly/[id]/__tests__/detail.test.tsx` 4 · `issue/__tests__/page.test.tsx` 3 = **12/12** | ✓ DONE |
| **REQ-27-13** | Tra cứu Serial unified search (parent + children + meta) | TIP-08 | `0fb0ed5` | `/dashboard/search/serial/page.tsx` (search box) + `[serial]/page.tsx` (deep link server) · `src/components/serial/serial-detail-card.tsx` | `search/serial/__tests__/page.test.tsx` 4 · `serial-detail-card` 3 = **7/7** | ✓ DONE |
| **REQ-27-14** | Ẩn 5 cụm route (Finance/AI/Multi-tenant/Mobile/Compliance) qua flag, giữ route | TIP-08 | `0fb0ed5` | `src/lib/feature-flags.ts` 5 flag `SHOW_*` (default false) · `sidebar-v2.tsx` 5 group thêm `featureFlag?` field · `/dashboard/admin/feature-flags/page.tsx` read-only display | `admin/feature-flags/__tests__/page.test.tsx` 2 · `sidebar-v2.test.tsx` extended +3 (admin × flag matrix) = **5/5** | ✓ DONE (route persistence DB → Sprint 28) |

---

## Tổng quan coverage

- **14/14 REQ-ID:** đã implement.
- **8/8 TIP:** committed atomic.
- **9 commit Sprint 27** trên `feat/sprint-27-electronics-ia` (1 TIP có 2 commit do FIX: TIP-04 + TIP-04-FIX).
- **Tests Wave 1-5:** 12 (TIP-05) + 13 (TIP-02) + 14 (TIP-04) + 18 (TIP-03) + 13 (TIP-06) + 12 (TIP-07) + 12 (TIP-08) + 7 (TIP-01 schema) = **101 unit/component test** Sprint 27. Pre-Sprint-27 baseline pass nguyên.

## Carry-over Sprint 28

Đã ghi rõ trong từng REPORT:

1. **Migrate 775 `Part.category` String usage** → `categoryId` FK (REQ-27-01 follow-up).
2. **Migrate 39 `user.role` String usage** → RBAC `UserRole` (REQ-27-10 follow-up).
3. **Concurrent serial integration test** với Postgres thật (REQ-27-06 — TIP-S27-02 deviation).
4. **5 data discrepancies** (`DATA_MIGRATION_RECONCILIATION.md` — REQ-27-09):
   - LotTransactions dedup behavior (1076 vs 3082 estimate).
   - ModuleDesigns 148 (vs ~78 estimate) cross-sheet consolidation qua admin UI.
   - Products count leak in MigrationStats.
   - 56 missing parts trong DU_AN — Lâm review Excel + bổ sung DANH_MUC.
5. **Feature flag persist DB** thay vì env-only (REQ-27-14 nice-to-have).
6. **Cycle Count + Receipt** UI (Vận hành 2 action còn lại — REQ-27-12 phần B).
