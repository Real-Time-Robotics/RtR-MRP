# Sprint 27 · VERIFY Brief cho Thợ

**Mục tiêu:** chạy 8 step kiểm thử cuối Sprint 27 theo Blueprint §5. Trả results format rõ ràng để Chủ thầu tổng hợp `VERIFY_REPORT.md`.

**Branch:** `feat/sprint-27-electronics-ia` (HEAD ở `0fb0ed5`)

**Working dir:** `/Users/os/RtR/rtr-mrp-pr`

> **KHÔNG fix gì trong VERIFY phase** — chỉ chạy + report. Nếu phát hiện bug → log vào `ISSUES POP UP` của report cuối, Chủ thầu quyết Sprint 28 vs hot-fix.

---

## STEP 1 · Typecheck toàn repo

```bash
NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit 2>&1 | tee /tmp/sprint27-tsc.log
echo "---"
echo "Exit: $?"
echo "Error count:"
grep -c "error TS" /tmp/sprint27-tsc.log || echo "0"
```

**Trả:**
- Exit code
- Error count
- Nếu > 0: paste 5 error đầu tiên + đoán file nào (Sprint 27 vs pre-existing)

**Pass criteria:** 0 error mới so với baseline `main`. Nếu có error pre-existing → liệt kê, không treat as fail.

---

## STEP 2 · Lint

```bash
npm run lint 2>&1 | tee /tmp/sprint27-lint.log
echo "---"
echo "Exit: $?"
grep -c "warning" /tmp/sprint27-lint.log || echo "0"
grep -c "error"   /tmp/sprint27-lint.log || echo "0"
```

**Trả:**
- Exit code
- Warning count + error count
- Delta vs baseline (chạy `git stash && npm run lint && git stash pop` để so nếu thấy nghi ngờ)

**Pass criteria:** error = 0, warning không tăng so với baseline main.

---

## STEP 3 · Migration chain reset + deploy

```bash
# Backup DB trước
PGPASSWORD=<password> pg_dump -h localhost -U <user> <dbname> > /tmp/pre-verify-backup.sql

# Reset + deploy chain
npx prisma migrate reset --skip-seed --force 2>&1 | tee /tmp/sprint27-migrate-reset.log
echo "Reset exit: $?"

npx prisma migrate deploy 2>&1 | tee /tmp/sprint27-migrate-deploy.log
echo "Deploy exit: $?"

npx prisma migrate status 2>&1 | tail -20
```

**Trả:**
- Reset exit
- Deploy exit
- Migrate status output (phải show "Database schema is up to date")
- Số migration applied (phải >= 4 mới của Sprint 27: TIP-01, TIP-02, TIP-03, TIP-05)

**Pass criteria:** migration chain pass không hang advisory lock (Sprint 26 retrospective). Status up-to-date.

**Nếu hang:** chạy lệnh kill PID giữ lock theo Sprint 26 playbook (xem `docs/sprint-26/VERIFY_REPORT.md` nếu nhớ không rõ).

---

## STEP 4 · Data migration replay

```bash
# Trên DB sạch sau STEP 3
npm run migrate:dashboard -- --dry-run 2>&1 | tee /tmp/sprint27-data-dryrun.log
echo "Dry-run exit: $?"

# Verify dry-run KHÔNG ghi DB
psql -h localhost -U <user> -d <dbname> -c "SELECT count(*) FROM parts;"
# Expected: 0

# Real run
npm run migrate:dashboard 2>&1 | tee /tmp/sprint27-data-real.log
echo "Real-run exit: $?"

psql -h localhost -U <user> -d <dbname> -c "SELECT count(*) FROM parts;"
# Expected: ~1043

psql -h localhost -U <user> -d <dbname> -c "SELECT count(*) FROM serial_units WHERE status='IN_STOCK';"
# Expected: 273

psql -h localhost -U <user> -d <dbname> -c "SELECT count(*) FROM lot_transactions;"
# Expected: ~1076

psql -h localhost -U <user> -d <dbname> -c "SELECT count(*) FROM serial_numbering_rules WHERE prefix='IO1';"
# Expected: 1

psql -h localhost -U <user> -d <dbname> -c "SELECT \"sourceType\", count(*) FROM bom_lines GROUP BY \"sourceType\";"
# Expected: INTERNAL ~1786, EXTERNAL ~7

# Idempotency check
npm run migrate:dashboard 2>&1 | tail -20
psql -h localhost -U <user> -d <dbname> -c "SELECT count(*) FROM parts;"
# Expected: still ~1043 (no duplicates)
```

**Trả:**
- Dry-run exit + count parts after dry-run (phải = 0)
- Real-run exit + 5 query count results
- Idempotency: count after re-run = count after first real run

**Pass criteria:** dry-run 0 parts. Real run match expected counts. Idempotent.

---

## STEP 5 · Test all

```bash
npm test -- --run 2>&1 | tee /tmp/sprint27-test.log
echo "Exit: $?"
grep -E "Tests.*passed|Tests.*failed|Test Files" /tmp/sprint27-test.log | tail -10
```

**Trả:**
- Exit code
- Tests passed / failed (paste 3 dòng tóm tắt cuối)
- Nếu có test fail Sprint 27: paste tên test
- Pre-existing fail count (ghi nhận, không fix trong VERIFY)

**Pass criteria:** Sprint 27 tests 100% pass. Baseline pre-existing fail không tăng.

---

## STEP 6 · Role smoke test E2E

Chạy `npm run dev` + login lần lượt 3 dev user (tạo qua `prisma seed-roles.ts` + `assign-default-roles.ts`):

### A · Engineer role

1. Login user role `engineer`.
2. Verify sidebar 6 cụm: Trang chủ · Công việc của tôi · Vận hành · Tra cứu · **Kỹ thuật & R&D** · Báo cáo.
3. Vào "Vận hành" → click 3 action thấy được, không 403.
4. Vào "Kỹ thuật & R&D" → submenu render.
5. Truy cập `/dashboard/admin` URL trực tiếp → expected 403 hoặc redirect (vì engineer không phải admin).

### B · Warehouse role

1. Login user role `warehouse`.
2. Sidebar 6 cụm: Trang chủ · Công việc · Vận hành · Tra cứu · **Kho** · Báo cáo.
3. Vận hành → "Xuất hàng" → mở form, scan 1 serial test → submit (nếu DB có serial demo từ STEP 4).

### C · Production role

1. Login user role `production`.
2. Sidebar 5 cụm: Trang chủ · Công việc · Vận hành · Tra cứu · Báo cáo.
3. Vào "Vận hành" → "Gia công":
   - Tạo 1 WO test (manual) hoặc dùng WO có sẵn từ migration.
   - Click "Hoàn thành" với product có ModuleDesign → verify serial sinh trong toast/log.
4. Vào "Lắp ráp":
   - Tạo AO test (chọn EBOX có BOM 3 line × 2 qty).
   - Start AO.
   - Scan 6 child serial từ DB demo data.
   - Complete → verify modal hiển thị parent serial.
5. Tra cứu serial vừa tạo → verify children tree đầy đủ 6 child.

**Trả cho mỗi role:**
- Sidebar count cụm visible
- Pass/fail cho từng action
- Screenshot hoặc dump (optional)

**Pass criteria:** 3/3 role pass smoke. Lắp ráp end-to-end tạo được parent serial từ 6 child.

---

## STEP 7 · Security spot-check

```bash
# Test role-gated route khi user không có role
curl -X GET http://localhost:3000/api/users/<some-user-id>/roles \
  -H "Cookie: <session-cookie-of-viewer-user>"
# Expected: 403

curl -X POST http://localhost:3000/api/serial/generate \
  -H "Cookie: <session-cookie-of-viewer>" \
  -H "Content-Type: application/json" \
  -d '{"moduleDesignId":"some-id"}'
# Expected: 403

# Test RBAC bypass flag (must NOT work in production-like env)
NODE_ENV=production curl ... # if applicable
```

**Trả:**
- Status code mỗi test
- Confirm 403 khi expected

**Pass criteria:** mọi role-gated endpoint trả 403 cho user thiếu role.

---

## STEP 8 · Final summary

Trả 1 tóm tắt cuối:
```
SPRINT 27 VERIFY SUMMARY
─────────────────────────
STEP 1 Typecheck:    PASS / FAIL (X errors)
STEP 2 Lint:         PASS / FAIL (W warnings, E errors)
STEP 3 Migration:    PASS / FAIL (N migrations applied, advisory lock: yes/no)
STEP 4 Data replay:  PASS / FAIL (parts=X, serial=Y, idempotent: yes/no)
STEP 5 Tests:        PASS / FAIL (Sprint 27: A/B, pre-existing fail: C)
STEP 6 Smoke E2E:    PASS / FAIL (engineer/warehouse/production)
STEP 7 Security:     PASS / FAIL (403 confirmed: yes/no)

ISSUES POP UP:
  - <list any blocker found>
  - <or "none">

OVERALL: READY TO MERGE / NEEDS-FIX
```

Đính kèm 4 log file `/tmp/sprint27-*.log` (paste tail 20 dòng mỗi file) để Chủ thầu tổng hợp.
