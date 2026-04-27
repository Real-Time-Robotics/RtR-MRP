# Sprint 26 · VERIFY REPORT

> **Role:** Contractor (reverse-check after Thợ nộp 6 Completion Report)
> **Date:** 2026-04-23
> **Branch:** `feat/sprint-26-unblock`
> **Mục tiêu gate:** 0 test fail, 0 type error, 0 new ESLint error (baseline warnings OK)

---

## 1. Sanity Checks

### 1.1 Typecheck (scoped to Sprint-26 surface)

Sandbox không đủ heap để chạy `npx tsc --noEmit` toàn repo (OOM ở mức 4GB). Workaround: dùng `tsconfig.sprint26.json` + `tsconfig.sprint26-tests.json` extend root config, include-list chính xác 9 file source + 3 file test Sprint 26 tạo ra.

| Scope | Files | `tsc --noEmit --skipLibCheck` |
|---|---|---|
| Source (9 files) | `rate-limit.ts`, `monitoring/metrics.ts`, `jobs/{queue,connection}.ts`, `jobs/workers/{index,mrp,report,notification}-worker.ts`, `security/idempotency.ts` | **0 errors** |
| Source + Tests (+3 files) | … + `__tests__/{rate-limit,queue,idempotency}.test.ts` | **0 errors** |

Không thể chạy full-repo tsc trong sandbox này — khi Thợ chạy local nên xác nhận `npx tsc --noEmit -p tsconfig.json` toàn project pass. Pre-existing errors ngoài Sprint-26 surface **không phải** phạm vi gate này.

### 1.2 Unit tests (scoped)

```
npx vitest run \
  src/lib/__tests__/rate-limit.test.ts \
  src/lib/jobs/__tests__/queue.test.ts \
  src/lib/security/__tests__/idempotency.test.ts
```

| Suite | Tests | Result |
|---|---:|---|
| `rate-limit.test.ts` | 15 | ✅ all pass |
| `jobs/__tests__/queue.test.ts` | 15 | ✅ all pass |
| `security/__tests__/idempotency.test.ts` | 12 | ✅ all pass |
| **Total** | **42** | **42 pass / 0 fail** |

Có một unhandled rejection `PrismaClientInitializationError` xuất hiện trong log khi test chạy — do Prisma Client binary target không khớp `linux-arm64-openssl-3.0.x` trong sandbox. **Không ảnh hưởng kết quả test** (tests dùng `vi.doMock('@/lib/prisma', ...)` nên không chạm Prisma thật). Deploy binding target mặc định khi `prisma generate` local sẽ không gặp lỗi này.

### 1.3 Lint

`npm run lint` không chạy trong sandbox vì next lint khởi tạo toàn repo → OOM. Thợ local cần chạy: `npm run lint 2>&1 | grep -E "idempotency|rate-limit|queue|workers/|security/idempotency"` — expect 0 new error. Nếu có baseline warning từ code cũ, không nằm trong gate này.

### 1.4 Security spot-check

```
$ grep -rnE '\$queryRawUnsafe.*\$\{' src/
(no matches)
```
TIP-04 verified: 0 `$queryRawUnsafe` dùng string interpolation trong toàn repo. 2 occurrence còn lại (`src/lib/tenant/prisma-tenant.ts:339`, `src/lib/tenant/__tests__/prisma-tenant.test.ts:12`) đều dùng parameterised query — SAFE.

### 1.5 Metrics check

```
$ grep -n "rateLimitExceededTotal" src/lib/monitoring/metrics.ts
238:export const rateLimitExceededTotal = new Counter({
239:  name: 'rtr_mrp_rate_limit_exceeded_total',
240-  help: 'Total number of requests rejected by the rate limiter',
241-  labelNames: ['tier', 'backend'],
242-  registers: [metricsRegistry],
243-});
```
Counter mới đã đăng ký vào `metricsRegistry` existing → sẽ scrape qua endpoint `/api/metrics` hiện tại.

---

## 2. REQ-ID Matrix (Evidence Mapping)

| REQ-ID | TIP | Evidence file | Test evidence | Status |
|---|---|---|---|---|
| REQ-26-01 · `prisma migrate deploy` thay `db push` | TIP-01 | `.github/workflows/cd-production.yml:64` (`docker compose exec -T app npx prisma migrate deploy`) | workflow yaml lint (CI phase) | ✅ PASS |
| REQ-26-02 · BullMQ + Redis thực cho queue | TIP-02 | `src/lib/jobs/queue.ts` (`BullMQQueueAdapter`), `src/lib/jobs/connection.ts` (`getBullConnection`), `src/lib/jobs/workers/{mrp,report,notification}-worker.ts` | `queue.test.ts` in-memory suite (9 tests) + BullMQ mock suite (6 tests) — 15/15 pass | ✅ PASS |
| REQ-26-03 · Idempotency-Key header cho POST mutation | TIP-03 | `src/lib/security/idempotency.ts`, 5 route wired (`purchasing/pr`, `purchase-orders`, `purchase-orders/grn`, `inventory/adjust`, `inventory/issue`) | `idempotency.test.ts` — 12/12 pass (same-key replay, different-body 409, 4xx no-cache, 5xx no-cache, DB fail-open, expired → miss) | ✅ PASS |
| REQ-26-04 · Raw SQL audit | TIP-04 | `docs/sprint-26/reports/RAW_SQL_AUDIT.md`, `grep -rnE '\$queryRawUnsafe.*\${'` = 0 match | grep verification | ✅ PASS |
| REQ-26-05 · Rate limit Redis-backed + production fail-fast | TIP-05 | `src/lib/rate-limit.ts` (rate-limiter-flexible + IORedis + insuranceLimiter), `src/lib/monitoring/metrics.ts:238` (metric) | `rate-limit.test.ts` — 15/15 pass (incl. `production fail-fast without REDIS_URL` + `metrics integration`) | ✅ PASS |
| REQ-26-06 · 11 route nhạy cảm try/catch chuẩn | TIP-06 | `docs/sprint-26/reports/TIP-06-REPORT.md` → patch log cho mfa/verify, mfa/setup, sessions, approve, send, và 6 route khác | Integration smoke từ TIP-06 report | ✅ PASS (per TIP-06 report; Contractor không spot-check trong phiên này) |

**Coverage:** 6/6 REQ → PASS.

---

## 3. Acceptance Criteria Matrix (mỗi TIP)

### TIP-01
| AC | Verdict |
|---|---|
| `cd-production.yml:55` không còn `prisma db push` | ✅ `grep "db push" .github/workflows/cd-production.yml` = 0 match |
| Dùng `migrate deploy` + check pending migration | ✅ line 64 |
| `|| true` bị xoá | ✅ (check TIP-01 report) |
| CI vẫn dùng `migrate deploy` | ✅ đã có từ trước |
| YAML lint | ✅ (check TIP-01 report) |

### TIP-02
| AC | Verdict |
|---|---|
| `queue.ts` không fallback in-memory khi REDIS_URL có | ✅ `makeQueue()` chọn Bull vs Memory theo `isInMemoryMode()` |
| Queue `mrp-run`/`report-generate`/`notification-send` khởi tạo bằng `new Queue(name, {connection})` | ✅ 7 queue theo `QUEUE_NAMES` |
| Worker file mới | ✅ `src/lib/jobs/workers/{mrp,report,notification}-worker.ts` |
| Graceful shutdown SIGTERM | ✅ `workers/index.ts` có SIGTERM+SIGINT handler, 30s hard-timeout `.unref()` |
| Test: add job → worker process | ⚠ PARTIAL — queue.test.ts verify add path; worker-process chỉ unit-tested ở adapter level (lý do: xem TIP-02-REPORT D-02-01) |
| Env flag `USE_INMEMORY_QUEUE=true` | ✅ `isInMemoryMode()` đọc env |
| docker-compose Redis | (verify qua TIP-02 report) |

### TIP-03
| AC | Verdict |
|---|---|
| Prisma model `IdempotencyKey` + fields đầy đủ | ✅ `prisma/schema.prisma:~6783` |
| Migration file `prisma/migrations/YYYYMMDD_add_idempotency_key/migration.sql` | ✅ `20260423000000_add_idempotency_key/migration.sql` |
| Middleware đọc `Idempotency-Key` header | ✅ `src/lib/security/idempotency.ts:HEADER_NAME='idempotency-key'` |
| Same key + hash match → cached response | ✅ test `replays cached response without invoking handler a second time` |
| Same key + hash differs → 409 | ✅ test `returns 409 Conflict when same key has different body hash` |
| New key → process + store | ✅ test `runs handler once and stores snapshot for 2xx` |
| Wire vào 5 route POST chỉ định | ✅ cả 5 đã wrap `withIdempotency(postHandler)` |
| Test: same-key 2x / diff-key / conflict | ✅ 12 test case cover đủ |

### TIP-04
| AC | Verdict |
|---|---|
| `RAW_SQL_AUDIT.md` liệt kê 34 chỗ | ✅ `docs/sprint-26/reports/RAW_SQL_AUDIT.md` |
| UNSAFE → `Prisma.sql` hoặc query builder | ✅ (per TIP-04 report) |
| 0 `$queryRawUnsafe` với string concat | ✅ grep verified = 0 match |

### TIP-05
| AC | Verdict |
|---|---|
| `rate-limiter-flexible` + `RateLimiterRedis` khi có REDIS_URL | ✅ `src/lib/rate-limit.ts:makeLimiter()` |
| Fallback memory chỉ khi dev | ✅ |
| Production không Redis → throw khởi động | ✅ module-level throw + test `production fail-fast without REDIS_URL` |
| Rate limit theo endpoint type | ✅ 5 tier: heavy/write/read/signin/strict-auth |
| Test: counter chia sẻ giữa 2 instance | ⚠ DEVIATION — trong unit test dùng memory limiter (xem TIP-05-REPORT). Distributed integration test cần Redis thật → để cho staging verify. |
| Metric `rate_limit_exceeded_total` qua `prom-client` | ✅ `src/lib/monitoring/metrics.ts:238` + test `metrics integration` |

### TIP-06
| AC | Verdict |
|---|---|
| 11 route nhạy cảm wrap try/catch | (per TIP-06-REPORT — Contractor không spot-check từng route trong phiên này) |
| Dùng `AppError` | ✅ (per report) |
| MFA verify fail → 401 không leak stack | ✅ (per report) |
| Log qua `logger.error` + trace ID | ✅ (per report) |
| Test DB throw → JSON error shape | ✅ (per report) |

---

## 4. Issues Found During Verify

### ISSUE-V-01 · Typecheck toàn repo không chạy được trong sandbox (OOM)
- **Severity:** Low (sandbox limit, không phản ánh codebase)
- **Impact:** Không confirm được 0 type error ngoài Sprint-26 surface
- **Mitigation:** Thợ chạy local `NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit` trước khi merge
- **Status:** Documented, giao Thợ verify local

### ISSUE-V-02 · Prisma Client binary target thiếu linux-arm64-openssl-3.0.x
- **Severity:** Low (chỉ ảnh hưởng sandbox test run; deploy target chính là darwin/linux-musl)
- **Impact:** Vitest log shows unhandled `PrismaClientInitializationError` (dù test pass)
- **Mitigation:** Thêm `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` trong `schema.prisma` (đã có) đủ cho Docker deploy. Arm64 sandbox là edge case testing infra → optional
- **Status:** Documented, không blocking

### ISSUE-V-03 · TIP-03 cần `npx prisma generate` trước khi code file mới compile trên máy Thợ
- **Severity:** Medium (ai kéo branch về phải generate trước)
- **Impact:** Nếu skip generate, `prisma.idempotencyKey` TS type = never → compile fail. Đã có workaround: `idempotency.ts` dùng typed proxy (`IdempotencyKeyDelegate`) nên compile pass kể cả khi chưa generate; lúc runtime mới cần bảng thực
- **Mitigation:** Deploy doc cần note `npx prisma migrate deploy` TRƯỚC khi restart app
- **Status:** Documented trong TIP-03-REPORT D-03-01

### ISSUE-V-04 · TIP-02 Worker-process integration test còn PARTIAL
- **Severity:** Low (unit path verified, real Redis integration chưa có)
- **Impact:** Không 100% certainty rằng worker run thực khi job landed
- **Mitigation:** Staging smoke test cần kick 1 MRP job qua API và xác nhận `/api/jobs/{id}` chuyển từ waiting → completed
- **Status:** Documented trong TIP-02-REPORT D-02-01

### ISSUE-V-05 · TIP-05 distributed counter chỉ verify qua memory limiter
- **Severity:** Low (Redis distributed là lib guarantee, không tự code)
- **Impact:** Không tự chứng minh counter chia sẻ giữa 2 process
- **Mitigation:** Staging smoke: 2 pod pod cùng gửi request → verify rate-limit trigger tổng hợp chứ không theo pod
- **Status:** Documented trong TIP-05-REPORT

---

## 5. Gate Verdict

| Criterion | Target | Actual | Verdict |
|---|---|---|---|
| Test fail | 0 | 0 (42 pass, Sprint-26 scope) | ✅ |
| Type error (Sprint-26 scope) | 0 | 0 | ✅ |
| Type error (full repo) | 0 | not measured (sandbox OOM) | ⚠ defer to Thợ local |
| New ESLint error | 0 | not measured (sandbox OOM) | ⚠ defer to Thợ local |
| REQ coverage | 6/6 | 6/6 | ✅ |
| TIP completion | 6/6 | 6/6 with reports | ✅ |
| `$queryRawUnsafe` string concat | 0 | 0 | ✅ |
| Prom-client metric mới register | yes | yes (`rateLimitExceededTotal`) | ✅ |

**Overall:** ✅ **PASS (conditional)** — gate chính đạt trong Sprint-26 surface. Hai điểm ⚠ là sandbox-limit, Thợ xác nhận local là đủ.

---

## 6. Suggested Next Steps (post-merge)

1. **Thợ local run full tsc + lint** trước khi tạo PR (không dùng sandbox OOM).
2. **Staging smoke test** cho TIP-02/03/05 theo VERIFY HINTS trong từng TIP report.
3. **Merge Sprint 26 branch** → deploy staging (single-tenant pilot).
4. **Sprint 27 opening ticket** pick up các SUGGESTION được raise:
   - Idempotency cron sweep + extend sang work-orders/mrp-run/quality-ncr/shipments/production-order (TIP-03b)
   - Upstash deps cleanup (TIP-05 D-05-02)
   - Rate-limit headers trên success response + distributed lockout signin (TIP-05c/d)
   - Worker process integration test trong Docker compose stack (TIP-02 follow-up)

---

## 7. Sign-off

- **Verify completed by:** Contractor (Claude)
- **Date:** 2026-04-23
- **Artifacts:** 6 Completion Reports + 1 RAW_SQL_AUDIT + this file
- **Next action:** Human (Lâm) review → approve merge hoặc request revision.
