# Data Migration Report

**Date:** 2026-04-24T07:36:25.146Z
**File:** /Users/os/RtR/rtr-mrp-pr/data/DASHBOARD.xlsx
**Mode:** REAL
**Duration:** 16.0s

| Entity | Created | Updated | Skipped | Warnings |
|--------|---------|---------|---------|----------|
| Categories | 25 | 0 | 0 | 0 |
| Suppliers | 3 | 0 | 0 | 0 |
| Parts | 1049 | 0 | 0 | 0 |
| PartSuppliers | 0 | 0 | 1049 | 0 |
| Products (EBOX) | 3 | 0 | 0 | 0 |
| ModuleDesigns | 148 | 0 | 0 | 0 |
| BOM (EBOX) | 30 | 0 | 0 | 0 |
| BOM (Module) | 1763 | 0 | 90 | 90 |
| NumberingRules | 55 | 0 | 1 | 0 |
| SerialUnits | 280 | 0 | 0 | 280 |
| LotTransactions | 0 | 0 | 1465 | 0 |

**Total warnings:** 370

## Known Data Discrepancies (P1, tracked separately)

Details: [DATA_MIGRATION_RECONCILIATION.md](./DATA_MIGRATION_RECONCILIATION.md).
Missing parts: [DATA_MIGRATION_MISSING_PARTS.md](./DATA_MIGRATION_MISSING_PARTS.md).

Summary:
- LotTransactions 1076 vs expected 3082 — dedup by (part,date), actual raw rows 1465. Accepted.
- ModuleDesigns 148 vs Blueprint ~78 — 3 source sheets, less overlap than estimated. Accepted.
- BomLines EXTERNAL 7/1793 — only BOM_CHUAN has TYPE column, DU_AN defaults INTERNAL. Correct.
- Products count leak — report shows 3 EBOX, actual 75 (72 auto-created from DU_AN). Accepted.
- 56 missing parts — in DU_AN but not DANH_MUC. Flagged for Lâm review.
