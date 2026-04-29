# TIP-S27-04-FIX · Follow-up: dry-run rollback + data reconciliation notes

## HEADER
- **Parent TIP:** TIP-S27-04 (commit `9ed3bc2`)
- **Branch:** `feat/sprint-27-electronics-ia` (tiếp tục)
- **Commit message:** `chore(migration): fix dry-run rollback + data reconciliation (TIP-S27-04-FIX)`
- **Goal:** fix 1 blocker + document 4 known data discrepancies. Không đụng Wave 3, không mở scope mới.

---

## CONTEXT

Completion Report TIP-S27-04 báo DONE 14/14 test pass. Verify chi tiết phát hiện:

**Blocker (P0):** `--dry-run` flag không rollback. Code không có `if (!dryRun)` gate quanh 22 Prisma write call site. Chạy `npm run migrate:dashboard -- --dry-run` vẫn ghi DB thực → break workflow "Lâm review trước khi commit thật". TIP spec ghi rõ: *"chạy full parsing + validation nhưng wrap trong prisma.$transaction và rollback ở cuối"*.

**Data discrepancies (P1, cần investigate + document, không block Wave 3):**
1. LotTransactions: expected 3082 (2084 NHAP + 998 XUAT), actual 1076. Nguyên nhân suspect: dedup key `IMPORT-{partNumber}-{date}` skip các transaction cùng part cùng date. Cần verify reality.
2. ModuleDesigns: expected ~78 (Blueprint estimate), actual 148. Nguyên nhân suspect: không dedup chéo giữa SERIAL_GEN + BOM_CHUAN Component + DU_AN Project → duplicate by name.
3. BomLines EXTERNAL: chỉ 7/1793 lines (0.4%). BOM_CHUAN cột TYPE phải có nhiều hơn. Có thể đọc sai tên column.
4. 90 parts missing trong DU_AN (có ở BOM Module, không có ở DANH_MUC). Cần list 90 partNumber vào file riêng để Lâm review Excel.
5. Products stats count sai: report "3" nhưng `migrateDuAnBom` L418 auto-create Product cho mỗi project (72 thêm). Count không leak vào MigrationStats.

---

## TASK

### 1) Fix dry-run rollback (P0 — BLOCKER)

**Chọn 1 trong 2 pattern:**

**Pattern A — Gate per-write (đơn giản, khuyến nghị):**
- Pass `dryRun: boolean` xuống mỗi migrate function signature.
- Tạo helper ở top file:
  ```ts
  async function dbWrite<T>(fn: () => Promise<T>, counter: { count: number }): Promise<T | null> {
    counter.count++;
    if (dryRun) return null;
    return await fn();
  }
  ```
- Hoặc đơn giản hơn: gate từng `create/upsert/update/delete` bằng:
  ```ts
  if (!dryRun) {
    await prisma.category.upsert({ ... });
  }
  stats.created++;
  ```
- Quan trọng: khi dry-run, **vẫn phải `findUnique/findFirst` để lookup** (cần read để validate FK + counting). Chỉ skip write.
- Edge case: khi dry-run lookup trả null (ví dụ Part chưa tồn tại) → code không được crash. Dùng placeholder id ảo hoặc skip nhánh cần write + in warning "would create X".

**Pattern B — $transaction rollback (nguyên bản TIP spec):**
```ts
try {
  await prisma.$transaction(async (tx) => {
    // toàn bộ migrate calls dùng `tx` thay vì `prisma`
    ...
    if (dryRun) {
      throw new Error('__DRY_RUN_ROLLBACK__');
    }
  }, { timeout: 300000 });  // 5 phút
} catch (err) {
  if (err.message === '__DRY_RUN_ROLLBACK__') {
    console.log('Dry-run rolled back. No changes committed.');
  } else {
    throw err;
  }
}
```
Pattern B cleaner nhưng cần refactor toàn bộ script dùng `tx` context. Prisma long transaction có thể timeout với 3082 row LotTransaction.

**Khuyến nghị:** Pattern A — nhanh, đủ nghĩa, không risk transaction timeout.

**Acceptance:**
- [ ] Reset DB: `npx prisma migrate reset --skip-seed --force`.
- [ ] `npm run migrate:dashboard -- --dry-run` → exit 0, in count như cũ.
- [ ] Query ngay sau: `SELECT count(*) FROM parts;` → **0** (hoặc chỉ row từ seed, không có data Dashboard).
- [ ] `npm run migrate:dashboard` (real) → pass, data đầy đủ như lần trước.
- [ ] Chạy `--dry-run` lần 2 sau khi DB đã có data → count hiển thị "0 created, N skipped" hoặc "N updated" không thay đổi data thực tế. Lần 2 dry-run không gây thay đổi.

### 2) Data reconciliation report (P1)

Tạo file mới: `docs/sprint-27/reports/DATA_MIGRATION_RECONCILIATION.md`

Nội dung bắt buộc (dưới đây là template, Thợ fill real data):

```markdown
# Data Migration Reconciliation Notes

## 1. LotTransactions: expected 3082, actual 1076

**Root cause:** dedup key `IMPORT-{partNumber}-{date}` skip duplicate.

**Evidence:**
- NHAP_KHO raw row count: <X>
- NHAP_KHO unique (partNumber, date) tuple count: <Y>
- NHAP_KHO RECEIVED imported: 753
- XUAT_KHO raw row count: <X>
- XUAT_KHO unique (partNumber, date) tuple count: <Y>
- XUAT_KHO ISSUED imported: 323

**Analysis:** <1-2 câu giải thích: dedup skip X rows because .../or Excel có Y duplicate rows/or script bug ở chỗ Z>

**Decision:** <keep as-is because ... | add counter suffix to dedup key to keep duplicates | other>

**Follow-up backlog:** <nếu cần>

## 2. ModuleDesigns: expected ~78, actual 148

**Root cause:** <khảo sát → viết>

**Evidence (list 3 source sheet, count unique từng sheet, overlap):**
- SERIAL_GEN distinct moduleDesign name: 55
- BOM_CHUAN Component distinct: 30
- DU_AN Project distinct: 72
- Cross-sheet overlap: <N>

**Decision:** <nếu 148 đúng thì document Blueprint estimate sai; nếu script bug thì fix dedup>

## 3. BomLines EXTERNAL only 7/1793

**Root cause:** <check column header trong BOM_CHUAN: là "TYPE" hay "Source" hay "Loại"? Grep col value distinct list>

**Evidence:**
- BOM_CHUAN column header row: <list column headers>
- Distinct TYPE values: <list value + count>

**Decision:** <nếu đọc đúng col + Excel data thực sự 7 EXTERNAL thì OK, document; nếu đọc sai col thì fix>

## 4. Products stats count leak

**Root cause:** `migrateDuAnBom` L418 auto-create Product per project, không append vào MigrationStats.

**Fix (optional trong TIP-FIX này hoặc pending):** thêm return stat `productsAutoCreated` và log.

**Real total Products in DB:** <query actual count> = 3 EBOX + <N> project-based.

**Decision:** <fix count leak in this TIP | document as known discrepancy | split into separate entity DuAnProducts>

## 5. 90 missing parts in DU_AN BOM

**File:** `docs/sprint-27/reports/DATA_MIGRATION_MISSING_PARTS.md` (separate file — full list of 90 partNumber + project name)

**Decision:** <Lâm review Excel + add 90 parts to DANH_MUC | script auto-create placeholder (not recommended because no supplier/category) | import as-is with "UNKNOWN_PART_<n>" placeholder + flag for follow-up>
```

### 3) Missing parts list (P1)

Tạo file mới: `docs/sprint-27/reports/DATA_MIGRATION_MISSING_PARTS.md`

Format:
```markdown
# 90 Parts in DU_AN BOM but not in DANH_MUC master

| Row | Project | Part Number | Quantity | Notes |
|-----|---------|-------------|----------|-------|
| 1   | Hera IO1 | <partNumber> | <qty> | <row context if relevant> |
| ... |

**Total: 90 parts across N projects.**

**Action:** Lâm review Excel → bổ sung vào DANH_MUC → re-run migration script (idempotent).
```

### 4) Update DATA_MIGRATION_REPORT.md

Append section cuối:

```markdown
## Known Data Discrepancies (P1, tracked separately)

Chi tiết phân tích: [DATA_MIGRATION_RECONCILIATION.md](./DATA_MIGRATION_RECONCILIATION.md).
Missing parts: [DATA_MIGRATION_MISSING_PARTS.md](./DATA_MIGRATION_MISSING_PARTS.md).

Summary:
- LotTransactions 1076 vs expected 3082 — dedup behavior, <accepted|fixed>.
- ModuleDesigns 148 vs Blueprint ~78 — <reason>, <accepted|fixed>.
- BomLines EXTERNAL 7/1793 — <reason>, <accepted|fixed>.
- Products count leak — <accepted|fixed>.
- 90 missing parts — tracked for Lâm review.
```

### 5) Unit test bổ sung (P1)

Thêm test vào `src/lib/__tests__/migrate-dashboard-xlsx.test.ts` (ít nhất 2):
1. `dry-run không ghi DB`: spy on `prisma.*.create` → call count = 0 sau dry-run.
2. `dry-run vẫn count chính xác`: dry-run → stats.parts.created === 1043 (match real run).

---

## ACCEPTANCE

- [ ] Script fix pattern (A hoặc B), dry-run không ghi DB.
- [ ] Reset DB + dry-run → `SELECT count(*) FROM parts;` = 0.
- [ ] Real run sau dry-run → data đúng như lần trước (1043 part, 280 serial, ...).
- [ ] `DATA_MIGRATION_RECONCILIATION.md` đầy đủ 5 section với real evidence + decision.
- [ ] `DATA_MIGRATION_MISSING_PARTS.md` đủ 90 part với project + quantity.
- [ ] `DATA_MIGRATION_REPORT.md` append section "Known Data Discrepancies".
- [ ] 2 test mới pass.
- [ ] `npx tsc --noEmit` 0 error.
- [ ] `npm run lint` không tăng warning.
- [ ] Commit gộp vào 1 commit: `chore(migration): fix dry-run rollback + data reconciliation (TIP-S27-04-FIX)`.

---

## CONSTRAINTS

- **KHÔNG** re-run real migration nếu không cần — giữ data hiện tại. Test dry-run trên DB đã có data cũng hợp lệ.
- **KHÔNG** mở rộng scope: không fix ModuleDesigns 148, không dedup lại, không sửa Products count leak trong code — chỉ document. Các fix này pending Sprint 28 hoặc Verify phase.
- **KHÔNG** commit file Excel vào git. Check `.gitignore` đã có `data/*.xlsx` (TIP gốc đã thêm).
- **KHÔNG** xóa 90 missing part data từ DU_AN import — keep as skipped, document for Lâm review.
- Reuse Prisma client singleton. Không tạo instance mới.
- Ambiguity nhỏ → tự quyết + ghi DEVIATIONS.

---

## COMPLETION REPORT FORMAT

```
STATUS: DONE
BRANCH: feat/sprint-27-electronics-ia
COMMIT: <hash> chore(migration): fix dry-run rollback + data reconciliation (TIP-S27-04-FIX)

FIX: dry-run gate pattern <A|B> applied at N call sites.
VERIFY: `npx prisma migrate reset --skip-seed --force && npm run migrate:dashboard -- --dry-run` → 0 parts in DB afterward. ✓

RECONCILIATION REPORT: docs/sprint-27/reports/DATA_MIGRATION_RECONCILIATION.md
  - 5 discrepancy documented with evidence + decision
MISSING PARTS: docs/sprint-27/reports/DATA_MIGRATION_MISSING_PARTS.md
  - <N> parts listed (expected ~90)

FILES CHANGED:
  M scripts/migrate-dashboard-xlsx.ts
  M src/lib/__tests__/migrate-dashboard-xlsx.test.ts
  M docs/sprint-27/reports/DATA_MIGRATION_REPORT.md
  A docs/sprint-27/reports/DATA_MIGRATION_RECONCILIATION.md
  A docs/sprint-27/reports/DATA_MIGRATION_MISSING_PARTS.md

TESTS: X/X pass (2 new dry-run tests included)
TYPECHECK: 0 error
LINT: no new warning

KEY DECISIONS MADE IN RECONCILIATION:
  - LotTransactions 1076: <accepted|fix applied>
  - ModuleDesigns 148:   <accepted|fix applied>
  - BomLines EXTERNAL 7: <accepted|fix applied>
  - Products count leak: <accepted|fix applied>
  - 90 missing parts:    flagged for Lâm Excel review

DEVIATIONS: <list>
SUGGESTIONS: <list>

Wave 2 fully closed sau TIP-FIX này. Chờ Wave 3 TIP.
```
