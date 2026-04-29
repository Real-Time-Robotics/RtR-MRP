# TIP-S27-02 · Completion Report

**Status:** DONE · APPROVED by Chủ thầu (Lâm, 2026-04-24)
**Commit:** `2fb0129` · `feat(serial): SerialUnit + SerialLink + SerialNumberingRule + generator service (TIP-S27-02)`
**Branch:** `feat/sprint-27-electronics-ia`

## Summary
Serial domain implemented theo Blueprint §3 TIP-S27-02. 3 Prisma model + 2 enum + 9 back-ref. Generator service `generateSerial()` với Serializable transaction + retry 3 lần (P2034 backoff 10–50ms) + counter rollover theo MMYY. 3 API routes role-gated (`engineer|production|admin` cho generate; all-authenticated cho GET; `warehouse|production|admin` cho status update) với Zod + `ALLOWED_TRANSITIONS` map.

## Files
- `prisma/migrations/20260424000002_sprint27_02_serial_domain/migration.sql` (135 lines)
- `prisma/schema.prisma` (+128 lines: 3 model + 2 enum + 9 back-ref)
- `src/lib/serial/numbering.ts` (126 lines)
- `src/lib/serial/__tests__/numbering.test.ts` (180 lines, 7 test)
- `src/app/api/serial/generate/route.ts`
- `src/app/api/serial/[serial]/route.ts`
- `src/app/api/serial/[serial]/status/route.ts`
- `src/app/api/serial/__tests__/serial-api.test.ts` (183 lines, 6 test)

## Tests
- `numbering.test.ts`: 7/7 pass
- `serial-api.test.ts`: 6/6 pass
- Total: **13/13 pass**

## Typecheck · Lint
0 error mới · không tăng warning.

## Migration
Name: `20260424000002_sprint27_02_serial_domain`. Applied qua `prisma migrate deploy` (non-TTY safe path, không hang). Kết quả: 3 table, 2 enum, 13 index, 13 foreign key.

## DEVIATION (1)

**Vấn đề:** Concurrent test (50 `Promise.all` generate) chuyển thành sequential do mock `$transaction` không simulate được DB-level serialization conflict (P2034 không fire trong Jest mock env).

**Ảnh hưởng production code:** không. Code dùng `Prisma.TransactionIsolationLevel.Serializable` + retry 3 lần + backoff. Race condition chỉ trigger trên Postgres thật, không trên Jest mock.

**Ảnh hưởng test coverage:** 1 test case trong Blueprint (concurrent 50 → 50 unique) bị downgrade thành sequential 50 → 50 unique. Race safety không được chứng minh ở unit test level.

**Backlog để Verify phase / Sprint 28:**
- Viết integration test `src/lib/serial/__tests__/numbering.integration.test.ts` chạy với Postgres thật trong CI profile (giống Sprint 26 integration test pattern).
- Test fire 50 concurrent `generateSerial()` → assert 50 serial unique + counter cuối = 50 + không exception ngoài P2034 retry.
- Ghi vào Sprint 27 `VERIFY_REPORT.md` §Known Gaps.

## Approved by Chủ thầu
Deviation chấp nhận vì limitation của Jest mock, không phải code bug. Integration test được ghi vào Verify backlog, không block Wave 3.

Wave 2 mở tiếp TIP-S27-04 (data migration DASHBOARD.xlsx) chạy song song.
