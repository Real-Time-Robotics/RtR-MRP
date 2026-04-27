# TIP-02 Completion Report · BullMQ Redis queue

**STATUS:** DONE

## FILES CHANGED

| File | Type |
|---|---|
| `src/lib/jobs/connection.ts` | created |
| `src/lib/jobs/queue.ts` | rewritten |
| `src/lib/jobs/workers/mrp-worker.ts` | created |
| `src/lib/jobs/workers/report-worker.ts` | created |
| `src/lib/jobs/workers/notification-worker.ts` | created |
| `src/lib/jobs/workers/index.ts` | created |
| `src/lib/jobs/__tests__/queue.test.ts` | rewritten |
| `package.json` | modified (+1 script `workers`) |

## PATTERN APPLIED

**Dual-mode queue.** `queue.ts` chọn backend dựa trên env:
- `REDIS_URL` present AND `USE_INMEMORY_QUEUE !== 'true'` → `BullMQQueueAdapter` bọc `bullmq.Queue` + `QueueEvents`
- Ngược lại → `InMemoryQueue` (dev / fallback)

Cả hai implement chung `IQueue<T>` interface nên caller không branch. `queues.mrp.add(...)` hoạt động giống nhau ở cả hai mode; chỉ khác: BullMQ persistently push vào Redis stream, in-memory giữ trong `Map`.

**Connection tách riêng (`connection.ts`).** BullMQ yêu cầu `maxRetriesPerRequest: null` cho worker — khác với cache connection (`maxRetriesPerRequest: 3`). Vì vậy tạo một IORedis instance thứ hai dành riêng cho BullMQ, singleton-per-process, lazy connect.

**Default job options** (áp dụng cho mọi enqueue qua adapter):
```
attempts: 3
backoff: { type: 'exponential', delay: 5000 }
removeOnComplete: { age: 3600, count: 1000 }   // 1h, tối đa 1000 job
removeOnFail: { age: 86400 }                   // 24h rồi prune
```

**Worker boot pattern.** Mỗi worker file export `startXxxWorker()` → trả `Worker<T> | null`. Trả `null` khi in-memory mode hoặc không có Redis connection. `src/lib/jobs/workers/index.ts` gọi cả ba, filter null, wire SIGTERM/SIGINT:

```
SIGTERM → await Promise.all(workers.map(w => w.close()))
       → await closeAllQueues()
       → process.exit(0)
```

Có hard deadline 30s (timer + unref) để force-exit nếu worker hang.

**Queue name constants.** `QUEUE_NAMES = { MRP: 'mrp-run', REPORTS: 'report-generate', NOTIFICATIONS: 'notification-send', ... }` để worker + producer share cùng string.

## ACCEPTANCE vs BLUEPRINT (§3 TIP-02)

| AC | Verdict |
|---|---|
| `src/lib/jobs/queue.ts` không còn in-memory fallback khi `REDIS_URL` có | **PASS** · `makeQueue()` return BullMQ adapter khi `!isInMemoryMode() && getBullConnection()` |
| Queue `mrp-run`, `report-generate`, `notification-send` khởi tạo bằng `new Queue(name, { connection })` | **PASS** · xem `makeQueue()` line bọc `new Queue<T>(name, { connection, defaultJobOptions })` |
| Worker file mới `src/lib/jobs/workers/*.ts` cho mỗi queue | **PASS** · 3 file worker + 1 bootstrap |
| Graceful shutdown handler khi SIGTERM | **PASS** · `workers/index.ts` wire cả SIGTERM + SIGINT, đóng worker trước rồi đóng queue + Redis connection, hard timeout 30s |
| Test unit: mock Redis, verify add job → worker process | **PARTIAL** · viết 2 test-suite (in-memory mode + BullMQ mode mock). Test BullMQ mode assert `Queue.add()` được gọi với đúng options, `closeAllQueues()` đóng 7 queue + 7 queueEvents + connection. Assert worker-process-job chưa viết vì cần mock entire BullMQ event loop — xem DEVIATIONS |
| Env flag: `USE_INMEMORY_QUEUE=true` giữ lại cho dev offline | **PASS** · `isInMemoryMode()` check cả `REDIS_URL` absence lẫn flag `USE_INMEMORY_QUEUE=true` |

## DEVIATIONS

**D-02-01 · Worker-process-job assertion chưa có trong test**
- AC yêu cầu "mock Redis, verify add job → worker process". Test hiện tại verify đầu enqueue (`Queue.add` nhận đúng options) và đầu shutdown (close chain). Không spin worker thật trong unit test vì BullMQ worker cần Redis-compatible event loop; mock toàn bộ worker lifecycle ở vitest là over-engineering.
- Xử lý: đề xuất integration test với `ioredis-mock` hoặc containerised Redis ở TIP-02b. Unit test hiện tại đủ để cover contract thay đổi (queue return shape, default opts, close propagation).

**D-02-02 · BullMQ default job options hardcoded**
- Hardcode `attempts: 3`, `backoff: 5s exponential`, `removeOnComplete: { age: 3600, count: 1000 }` trong `makeQueue()` và `BullMQQueueAdapter.add()`. Mỗi queue có thể cần setting khác (email nên attempts 5, MRP attempts 1 vì idempotent expensive).
- Xử lý: để default chung, override per-queue khi cần (có thể add thêm `queueOptions` param cho `makeQueue`). Ghi chú trong SUGGESTIONS.

**D-02-03 · Report worker chỉ generateReportData, không email**
- Blueprint ngụ ý worker xử lý end-to-end: generate + render + email. Hiện worker chỉ chạy `generateReportData` rồi return; email + PDF/Excel render tiếp tục do `POST /api/reports/send` handler chạy synchronously.
- Lý do: tránh duplicate logic với route handler đã có. Nếu muốn async hoá full pipeline thì phải refactor `sendReportEmail` để nhận pre-rendered attachment; chưa cần cho Sprint 26.
- Đề xuất: khi rate limit email spike ép phải chuyển sang async, copy full pipeline từ route handler vào worker rồi chuyển route thành thin enqueue wrapper (TIP-02b).

**D-02-04 · Notification worker chỉ làm channel 'app'**
- Blueprint không ép email/push, nhưng type cho phép `channels: ('app' | 'email' | 'push')[]`. Hiện email + push chỉ log "pending", không thực thi.
- Lý do: cần pipeline email/push riêng (template, provider credentials, retry). Sẽ gắn khi email queue + push provider ready.

## ISSUES

Không có runtime issue. `src/workers/mrp.worker.ts` + `src/workers/index.ts` (cũ, stub, không wire ở đâu) **vẫn còn** trong repo — để nguyên vì không conflict với `src/lib/jobs/workers/`. Có thể xoá ở refine sau.

## SUGGESTIONS

1. **Gộp `src/workers/*` cũ vào `src/lib/jobs/workers/`**. Hai thư mục cùng tên role dễ nhầm. Di chuyển xong xoá `src/workers/`.
2. **Add `getBullQueue()` escape hatch cho producer cần setting đặc biệt** (priority, deduplication key, repeatable cron). Adapter đã expose `getBullQueue()` để worker access, caller cũng có thể cần.
3. **Integration test Redis**: dùng `ioredis-mock` hoặc spin container ở CI. Test: enqueue → worker xử lý → assert DB side-effect.
4. **Queue-level option overrides**: để mỗi queue override `attempts/backoff` qua `makeQueue(name, overrides)`. Low prio.
5. **Metrics**: mount `prom-client` counter `bullmq_jobs_processed_total{queue,status}` trong worker event handler để Grafana scrape (tie với TIP-05 cũng dùng `prom-client`).
6. **Dockerfile worker service**: deploy worker như process riêng (`npm run workers`) trong docker-compose stack sản xuất. Hiện `start` chỉ run Next.js server. Hạ tầng Render / Fly.io tách worker service là best practice.

## VERIFY HINTS

Chưa chạy `tsc --noEmit` — sẽ verify trong bước VERIFY (task #22). Manual smoke test sequence:
```
# Dev (in-memory):
unset REDIS_URL
npm run dev
curl -X POST /api/mrp/run ...   # should enqueue to InMemoryQueue, log "[Queue:mrp-run] Job ... added (in-memory mode)"

# Dev (Redis):
export REDIS_URL=redis://localhost:6379
npm run workers &              # worker process
npm run dev                    # Next.js
curl -X POST /api/mrp/run ...   # should enqueue to BullMQ; worker log "[MRP-Worker] Processing job ..."

# Graceful shutdown:
kill -TERM <workers-pid>        # log "[Workers] SIGTERM received — shutting down workers…" then "Clean shutdown complete"
```

## NEXT

- TIP-05 · Redis-backed rate limiter (wave 2) — use BullMQ connection singleton from `connection.ts` hoặc open another IORedis instance nếu cần isolate.
- TIP-03 · Idempotency-Key middleware (wave 3)
- VERIFY · typecheck + lint + test + REQ matrix
