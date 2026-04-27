# Sprint 26 — Unblock go-live · BLUEPRINT

> Branch: `feat/sprint-26-unblock` (tách từ `feat/purchase-request-module`)
> Mục tiêu: nâng điểm **Sẵn sàng vận hành 59 → 74** để deploy single-tenant cho 1 khách pilot.
> Thời lượng thực tế: 2 tuần. Session này: ưu tiên code + test + CI check; deploy staging do Lâm tự chạy.
>
> **Checkpoint:** Lâm cần trả lời `APPROVED` để spawn Thợ. Sau approve, Blueprint là khế ước — không đổi kiến trúc giữa sprint.

---

## 1. Requirements (REQ-ID mapping)

| REQ-ID | Mô tả | Nguồn | Priority |
|---|---|---|---|
| REQ-26-01 | Production deploy dùng `prisma migrate deploy` thay `db push` | MATURITY §4 rủi ro #1 | P0 |
| REQ-26-02 | Queue MRP/report/notification chạy trên BullMQ + Redis thực | MATURITY §4 rủi ro #2 | P0 |
| REQ-26-03 | Mọi POST mutation ở PR/PO/GRN/Inventory-adjust nhận `Idempotency-Key` header; retry trả cùng response | MATURITY §4 rủi ro #3 | P0 |
| REQ-26-04 | Không còn `$queryRawUnsafe` với input nối chuỗi; 34 chỗ `$queryRaw*` được audit, chuyển `Prisma.sql` template hoặc whitelist | MATURITY §4 rủi ro #4 | P1 |
| REQ-26-05 | Rate limit backed bằng Redis (sliding window hoặc token bucket) | MATURITY §4 rủi ro #5 | P1 |
| REQ-26-06 | 11 route nhạy cảm (MFA, approve, send) có try/catch chuẩn + trả error shape đồng nhất | MATURITY §3 điểm yếu #4 | P1 |

---

## 2. Task Graph

```
          ┌── TIP-01 (CI migrate deploy) ── độc lập
          │
          ├── TIP-02 (BullMQ Redis) ────── độc lập, share Redis với TIP-05
          │
root ─────┼── TIP-03 (Idempotency middleware) ── có DB migration riêng
          │
          ├── TIP-04 (Raw SQL audit) ───── độc lập
          │
          ├── TIP-05 (Rate limit Redis) ── phụ thuộc Redis client (có sẵn)
          │
          └── TIP-06 (try/catch 11 route) ── độc lập
```

**Parallel strategy:** TIP-01, 04, 06 chạy song song wave 1 (độc lập, không đụng shared infra). TIP-02 và 05 wave 2 (share Redis client, tránh conflict lock file). TIP-03 wave 3 (có migration riêng, verify sau cùng).

**Commit strategy:** 1 commit/TIP, conventional commits (`feat(ops):`, `fix(security):`, `chore(ci):`). Sau verify, squash hoặc giữ nguyên tùy Lâm quyết PR-time.

---

## 3. TIP Summaries

### TIP-01 · `chore(ci): migrate deploy in production workflow`
**Acceptance:**
- `.github/workflows/cd-production.yml:55` không còn `prisma db push`
- Dùng `prisma migrate deploy` + check pending migration
- `|| true` bị xoá — lỗi migration phải fail pipeline
- `.github/workflows/ci.yml` vẫn dùng `migrate deploy` ở job test (đã có)
- Thêm 1 integration test nhỏ verify workflow cú pháp hợp lệ (yaml lint)

### TIP-02 · `feat(jobs): enable BullMQ with Redis for background queues`
**Acceptance:**
- `src/lib/jobs/queue.ts` không còn in-memory fallback khi `REDIS_URL` có
- Queue `mrp-run`, `report-generate`, `notification-send` khởi tạo bằng `new Queue(name, { connection })`
- Worker file mới `src/lib/jobs/workers/*.ts` cho mỗi queue
- Graceful shutdown handler khi SIGTERM
- Test unit: mock Redis, verify add job → worker process
- Env flag: `USE_INMEMORY_QUEUE=true` giữ lại cho dev offline
- Update `docker-compose.infrastructure.yml` nếu thiếu Redis (đã có — verify)

### TIP-03 · `feat(api): idempotency-key middleware for POST mutations`
**Acceptance:**
- Prisma model `IdempotencyKey` mới: `id`, `key` (unique), `tenantId`, `method`, `path`, `requestHash`, `responseStatus`, `responseBody`, `createdAt`, `expiresAt` (24h)
- Migration file `prisma/migrations/YYYYMMDD_add_idempotency_key/migration.sql`
- Middleware `src/lib/security/idempotency.ts` đọc `Idempotency-Key` header
  - Nếu key tồn tại + requestHash khớp → trả cached response
  - Nếu key tồn tại + requestHash khác → 409 Conflict
  - Nếu key mới → process, lưu response
- Wire vào các route POST: `/api/purchasing/pr`, `/api/purchase-orders`, `/api/purchase-orders/grn`, `/api/inventory/adjust`, `/api/inventory/issue`
- Test: post cùng key 2 lần → lần 2 trả cached; post key khác → process thường; key trùng + body khác → 409

### TIP-04 · `security(db): audit raw SQL usage, migrate to Prisma.sql`
**Acceptance:**
- Tạo `docs/sprint-26/reports/RAW_SQL_AUDIT.md` liệt kê 34 chỗ (file:line, function, input source, verdict SAFE/UNSAFE)
- Tất cả UNSAFE chuyển sang `Prisma.sql` template hoặc Prisma query builder
- Không còn `$queryRawUnsafe` với string concat trong src/
- Grep verification: `grep -rn '\$queryRawUnsafe.*\${' src/ | wc -l` = 0
- Nếu chỗ nào cần giữ raw vì performance, ghi rõ lý do + input validation trong comment

### TIP-05 · `fix(security): redis-backed rate limiter`
**Acceptance:**
- `src/lib/security/rate-limiter.ts` dùng `rate-limiter-flexible` với `RateLimiterRedis` khi `REDIS_URL` có
- Fallback in-memory chỉ khi dev (`NODE_ENV !== 'production'`)
- Production không có Redis → throw error khởi động, không fallback
- Middleware `src/middleware.ts` áp dụng rate limit theo endpoint type (auth: 10/60s, api: 100/60s, export: 5/300s)
- Test: mock Redis, verify counter chia sẻ giữa 2 instance mô phỏng
- Metric `rate_limit_exceeded_total` xuất qua `prom-client`

### TIP-06 · `fix(api): try/catch and error shape for 11 sensitive routes`
**Acceptance:**
- 11 route sau có try/catch bao toàn body:
  - `src/app/api/compliance/mfa/verify/route.ts`
  - `src/app/api/compliance/mfa/setup/route.ts`
  - `src/app/api/compliance/sessions/route.ts`
  - `src/app/api/purchase-orders/[id]/approve/route.ts`
  - `src/app/api/quotations/[id]/send/route.ts`
  - (6 route khác Thợ tự tìm qua grep `route.ts` không có `try`)
- Error trả về dùng `AppError` từ `src/lib/error-handler.ts`
- MFA verify fail → 401 không leak stack trace
- Log lỗi qua `logger.error` với trace ID, không `console.error`
- Test: mock DB throw → route trả JSON shape `{ error: string, code: string }`

---

## 4. Constraints & Boundaries

- **Không đổi Prisma schema ngoài TIP-03** (chỉ thêm `IdempotencyKey` model)
- **Không touch branch khác**, không rebase `feat/purchase-request-module`
- **Không xoá `console.log` lan man** — đó là việc của Sprint 27
- **Không tự ý thêm package** ngoài: `rate-limiter-flexible` (TIP-05), `bullmq` (đã có trong deps — verify)
- **Reuse `AppError`** từ `src/lib/error-handler.ts`, không tạo error class mới
- **Reuse Redis client** từ `src/lib/cache/redis.ts`, không tạo connection riêng
- **i18n:** error message bằng tiếng Anh (internal), Vietnamese chỉ dùng khi response cho end-user

---

## 5. Verify Plan

Sau khi Thợ nộp Completion Report cho cả 6 TIP:

1. **Typecheck toàn repo:** `npx tsc --noEmit`
2. **Lint:** `npm run lint` (ESLint)
3. **Unit test:** `npm test` — pass 100%
4. **Integration test cho TIP-02/03/05:** chạy theo hướng dẫn trong Completion Report
5. **REQ-ID matrix:** mapping từng REQ → TIP → test file chứng minh
6. **Security spot-check TIP-04:** regrep `$queryRawUnsafe` với biến, phải rỗng
7. **Metrics check TIP-05:** xác nhận `prom-client` register mới
8. **Final report** `docs/sprint-26/VERIFY_REPORT.md`

---

## 6. Rollback Plan

Nếu TIP-03 gây side effect trên Prisma migrate production:
- Revert commit TIP-03
- Rollback migration: `prisma migrate resolve --rolled-back <migration_name>`
- Xoá bảng `IdempotencyKey` bằng SQL thủ công

Nếu TIP-02 break dev:
- Set env `USE_INMEMORY_QUEUE=true` để fallback

Nếu TIP-05 block login:
- Set env `DISABLE_RATE_LIMIT=true` tạm thời + restart

---

## 7. Deliverables cuối Sprint 26

- Branch `feat/sprint-26-unblock` với 6 commit
- 6 Completion Report trong `docs/sprint-26/reports/TIP-0X-REPORT.md`
- 1 `VERIFY_REPORT.md` tổng
- 1 `RAW_SQL_AUDIT.md` (từ TIP-04)
- 0 test fail, 0 type error, 0 new ESLint error (baseline warnings OK)

---

## 8. Câu Lâm cần trả lời

**APPROVED** → tôi bắt đầu spawn Thợ ngay.
**REVISE: [nội dung]** → tôi sửa Blueprint theo hướng dẫn.
**REJECT** → dừng, quay lại Vision.
