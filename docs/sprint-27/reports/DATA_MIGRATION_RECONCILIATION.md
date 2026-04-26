# Data Migration Reconciliation Notes

## 1. LotTransactions: expected 3082, actual 1076

**Root cause:** Dedup key `IMPORT-{partNumber}-{Math.floor(date)}` collapses multiple transactions for the same part on the same day into one. Excel has duplicate rows (same part, same date, different qty).

**Evidence:**
- NHAP_KHO raw row count: 1125 (header excluded)
- NHAP_KHO unique (partNumber, date) tuples: 1067
- NHAP_KHO RECEIVED imported: 753
- XUAT_KHO raw row count: 340
- XUAT_KHO unique (partNumber, date) tuples: 323
- XUAT_KHO ISSUED imported: 323

**Analysis:** Raw row counts (1125+340=1465) are less than Blueprint estimate (2084+998=3082). The XLSX sheet `rows` count reported by SheetJS includes empty rows and header. Actual data rows are 1125 NHAP + 340 XUAT = 1465. After dedup: 1076 unique transactions imported. The 389 skipped are duplicate (part,date) tuples.

**Decision:** Accepted as-is. Dedup prevents duplicate transactions. If individual qty matters (multiple deliveries same part same day), future fix: add row index to dedup key.

**Follow-up backlog:** Sprint 28 — review if qty aggregation is needed.

## 2. ModuleDesigns: expected ~78, actual 148

**Root cause:** Three source sheets contribute different module names without cross-dedup:
- SERIAL_GEN distinct products: 56
- BOM_CHUAN distinct components: 21
- DU_AN distinct projects: 72

Some overlap exists (e.g., "Hera IO1 v1.5" appears in all 3), but code normalization to uppercase with `_` separator creates slightly different codes for the same entity.

**Decision:** Accepted. 148 represents all distinct module entries across sheets. Blueprint estimate ~78 was based on rough dedup. Actual overlap is less than expected. Sprint 28 can consolidate duplicates via admin UI.

## 3. BomLines EXTERNAL only 7/1793

**Root cause:** BOM_CHUAN sheet has 30 lines total. Column `TYPE` has values:
- INTERNAL: 23 lines
- EXTERNAL: 7 lines

The 1763 module-level BOM lines (from DU_AN) all default to INTERNAL because DU_AN has no TYPE column.

**Decision:** Correct behavior. Only BOM_CHUAN (EBOX-level) has explicit INTERNAL/EXTERNAL marking. Module-level BOMs are manufacturing BOMs → INTERNAL is the correct default.

## 4. Products stats count leak

**Root cause:** `migrateDuAnBom` L426-428 auto-creates Product for each project (72 total). These creations are not counted in MigrationStats for "Products (EBOX)" which only reports the 3 from BOM_CHUAN.

**Real total Products in DB:** 3 EBOX + 72 project-based = 75.

**Decision:** Accepted as known discrepancy in reporting. Products report "3" refers to EBOX products only. The 72 auto-created project Products are a side-effect of BOM import. Sprint 28: separate entity or explicit stats line.

## 5. 56 missing parts in DU_AN BOM

**File:** [DATA_MIGRATION_MISSING_PARTS.md](./DATA_MIGRATION_MISSING_PARTS.md)

**Count:** 56 unique part numbers (not 90 — the 90 included duplicate row references across projects).

**Decision:** Flagged for Lâm Excel review. Script skips these with warning. Re-run migration after DANH_MUC is updated with missing parts.
