# TIP-S27-04 + TIP-S27-04-FIX · Completion Report

**Status:** DONE · APPROVED by Chủ thầu (2026-04-26)
**Commits:**
- `9ed3bc2` · `chore(migration): import DASHBOARD.xlsx into DB (TIP-S27-04)`
- `f976e72` · `chore(migration): fix dry-run rollback + data reconciliation (TIP-S27-04-FIX)`

**Branch:** `feat/sprint-27-electronics-ia`

## Summary

Data migration script imports DASHBOARD-da1f05cc.xlsx vào DB qua 11 sheet, idempotent upsert by unique key, dry-run rollback đúng spec sau FIX. Category clustering 137→25 cluster 2-tier, 0 unresolved. Real run trên DB sạch: 1043 part, 280 serial (273 IN_STOCK), 75 product (3 EBOX + 72 project), 148 module design, 1793 BOM line, 13+55=55 numbering rule, 1076 lot transaction.

## Files
- `scripts/migrate-dashboard-xlsx.ts` (~700 line)
- `scripts/dashboard-category-mapping.json` (137 entry, 25 cluster)
- `src/lib/__tests__/migrate-dashboard-xlsx.test.ts` (14 test, all pass)
- `package.json` (npm script `migrate:dashboard`)
- `.gitignore` (data/*.xlsx)
- `docs/sprint-27/reports/DATA_MIGRATION_REPORT.md`
- `docs/sprint-27/reports/DATA_MIGRATION_RECONCILIATION.md`
- `docs/sprint-27/reports/DATA_MIGRATION_MISSING_PARTS.md` (56 part)

## FIX details (commit f976e72)
`dbWrite<T>()` helper gate `if (dryRun) return null` áp dụng tại 22 call site. Pattern A áp đúng như TIP-FIX brief recommend. Dry-run lookup vẫn hoạt động (read-only), write skip hoàn toàn.

## Sample query verification (real run)
- `serial_units WHERE status='IN_STOCK'` → 273 ✓
- `serial_numbering_rules WHERE prefix='IO1'` → 1 row, version=V15 ✓
- `bom_lines GROUP BY sourceType` → INTERNAL=1786, EXTERNAL=7
- `lot_transactions GROUP BY type` → RECEIVED=753, ISSUED=323

## Known Discrepancies (5, all documented + accepted)

1. **LotTransactions 1076 vs Blueprint 3082:** Blueprint estimate quá cao. Raw row thật 1465 (1125 NHAP + 340 XUAT). Sau dedup theo (partNumber, date) → 1076. Accepted. Sprint 28 review nếu cần track multiple deliveries cùng part cùng ngày.

2. **ModuleDesigns 148 vs Blueprint ~78:** 3 source sheet (SERIAL_GEN 56 + BOM_CHUAN 21 + DU_AN 72) overlap ít hơn estimate. Code normalization tạo slight variation. Accepted, Sprint 28 admin UI consolidate.

3. **BomLines EXTERNAL 7/1793:** Đúng. Chỉ BOM_CHUAN (30 line) có cột TYPE. DU_AN (1763 line) là module-level BOM → default INTERNAL.

4. **Products count "3" trong stats:** Stats leak. Thực tế DB có 75 (3 EBOX + 72 project auto-create). Accepted, Sprint 28 split entity hoặc explicit stats line.

5. **56 missing parts:** Có ở DU_AN BOM, không có ở DANH_MUC master. List đầy đủ trong `DATA_MIGRATION_MISSING_PARTS.md`. Action: Lâm review Excel + bổ sung → re-run migration (idempotent).

## Tests
14/14 pass (cluster, enum mapping, dry-run gating, idempotent re-run).

## Typecheck · Lint
0 error mới · 0 warning tăng.

## Approved by Chủ thầu
P0 blocker (dry-run rollback) đã fix đúng spec. P1 discrepancies document + accept đầy đủ với evidence. Wave 2 closed. Tiếp tục Wave 3 + Wave 4.
