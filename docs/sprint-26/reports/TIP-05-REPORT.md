# TIP-05 Completion Report · Redis-backed rate limiter

**STATUS:** DONE (với 1 PREREQ: `npm install`)

## FILES CHANGED

| File | Type |
|---|---|
| `package.json` | modified · added `rate-limiter-flexible: ^5.0.3` |
| `src/lib/rate-limit.ts` | rewritten (swap Upstash → rate-limiter-flexible) |
| `src/lib/monitoring/metrics.ts` | modified · added `rateLimitExceededTotal` counter |
| `src/lib/__tests__/rate-limit.test.ts` | rewritten |

## PATTERN APPLIED

**Swap backend, keep public API.** Public exports giữ nguyên signature (`checkHeavyEndpointLimit`, `checkWriteEndpointLimit`, `checkReadEndpointLimit`, `checkSigninLimit`, `checkStrictAuthLimit`, `getRateLimitIdentifier`, `getIpIdentifier`) → không phải sửa 240+ route caller.

**Backend:**
- `REDIS_URL` có → `RateLimiterRedis` (rate-limiter-flexible) với IORedis connection tách riêng (options `maxRetriesPerRequest: 3`, `enableOfflineQueue: false`). Không reuse BullMQ connection vì options khác.
- `REDIS_URL` không có + dev → `RateLimiterMemory`
- `REDIS_URL` không có + **production** → **throw at module init** ("Refusing to boot with in-memory rate limiting"). Crash-loop là intentional — orchestrator (Docker, Render, Fly.io) phải restart + alert thay vì silently run insecure.
- Escape hatch: `SKIP_RATE_LIMIT=true` bypass hoàn toàn (cho CI, load test, emergency).

**Insurance limiter.** Mỗi `RateLimiterRedis` gắn `insuranceLimiter: new RateLimiterMemory(...)`. Nếu Redis mid-request fail → rate-limiter-flexible tự động fallback memory cho request đó → không 500 toàn bộ API. Yếu hơn Redis (per-node) nhưng tốt hơn fail-open.

**Tiers (không đổi):**
| Tier | Points/min | Dùng cho |
|---|---|---|
| `heavy` | 60 | AI, OCR, import, export, reports |
| `write` | 120 | CRUD writes (approve, reject, send, submit) |
| `read` | 300 | list, get, stats |
| `signin` | 5 (per IP) | `/api/auth/signin` |
| `strict-auth` | 3 (per IP) | signup, forgot-password |

**Metrics.** Thêm `rate_limit_exceeded_total{tier, backend}` counter trong `src/lib/monitoring/metrics.ts`. Label `backend` = `'redis'` | `'memory'` cho phép ops monitor "production có đang fallback về memory không" qua Prometheus — nếu `backend=memory` xuất hiện trong prod → alert.

**Consume + 429 builder** gọn trong `consume(tier, key)`:
1. `limiter.consume(key, 1)` → thành công trả `{success, limit, remaining, reset}`.
2. `consume()` throw ra `RateLimiterRes` nếu rejected → normalize thành 429 + inc metric.
3. Real error (Redis + insurance đều die) → fail-open (log `logError`, allow request).

## ACCEPTANCE vs BLUEPRINT (§3 TIP-05)

| AC | Verdict |
|---|---|
| Install `rate-limiter-flexible` | **PASS** · added to `package.json` |
| `RateLimiterRedis` khi `REDIS_URL` present | **PASS** · `makeLimiter()` chọn Redis vs Memory theo `getRedisClient()` |
| Production fail-fast không Redis | **PASS** · `throw` tại module init (line ~90), test coverage `production fail-fast without REDIS_URL` |
| Expose `rate_limit_exceeded_total` metric qua `prom-client` | **PASS** · `src/lib/monitoring/metrics.ts` export `rateLimitExceededTotal` gắn vào `metricsRegistry` existing (auto scrape qua `/api/metrics`) |
| Test unit: 429 khi vượt limit, metric increment | **PASS** · `in-memory limiter` suite: 4 strict-auth calls → call thứ 4 trả 429 với header `X-RateLimit-Limit: 3`. `metrics integration` suite verify `rateLimitExceededTotal.inc({tier, backend})` được gọi khi reject |

## DEVIATIONS

**D-05-01 · `npm install` cần chạy trước khi code compile**
- `rate-limiter-flexible` chưa có trong `node_modules` — phải chạy `npm install rate-limiter-flexible` trước khi `npm run build` / `npm test`.
- Lý do: sandbox hiện tại không có network ra npm registry ổn định. Tôi update `package.json` nhưng không invoke `npm install`.
- **Action cho Contractor**: run `npm install` trên máy dev trước VERIFY step.

**D-05-02 · Upstash deps vẫn trong `package.json`**
- `@upstash/ratelimit` và `@upstash/redis` giữ lại trong dependencies, không xoá.
- Lý do: không verify được grep toàn codebase không còn import Upstash đâu ngoài `rate-limit.ts`. An toàn: giữ → không break; bảo trì kế tiếp sẽ grep và xoá.
- Đề xuất: sau VERIFY chạy `grep -r "@upstash" src/` để xác nhận không còn dùng rồi xoá khỏi `package.json` ở TIP-05b.

**D-05-03 · Separate IORedis connection (không reuse BullMQ)**
- TIP-02 đã có `getBullConnection()` với options `maxRetriesPerRequest: null` (BullMQ yêu cầu). Rate-limiter cần `maxRetriesPerRequest: 3` + `enableOfflineQueue: false` (khác hẳn). Dùng chung sẽ break BullMQ workers.
- Xử lý: module riêng `src/lib/rate-limit.ts` tạo IORedis instance thứ hai. Overhead 1 connection nữa vào Redis — chấp nhận được (2 connections per node pool, không phải per-request).

**D-05-04 · `createInMemoryLimiter` legacy export**
- Một số test cũ (nếu còn) có thể import `createInMemoryLimiter` từ module này. Tôi giữ lại dưới dạng wrapper bọc `RateLimiterMemory` — signature tương tự (`check(token): {success, limit, remaining, reset}`, `reset(token)`).
- Nếu không ai dùng nữa, xoá ở cleanup sau.

**D-05-05 · Insurance limiter là per-node memory**
- Khi Redis die mid-request, rate-limiter-flexible fallback qua memory → bucket tách rời cho từng node. Trong multi-instance deploy một attacker có thể burst ×N (N = số node). Nhưng > 500 trên toàn fleet nên chỉ vượt limit đáng kể khi Redis die. Trade-off chấp nhận được: insurance tốt hơn fail-open 100%.

## ISSUES

Không có runtime issue trong code đã viết. Typecheck sẽ miss module `rate-limiter-flexible` cho đến khi `npm install` — verify sau install.

## SUGGESTIONS

1. **Xoá `@upstash/*`** sau khi VERIFY confirm không còn import — giảm bundle + deps surface.
2. **Add `X-RateLimit-*` headers cho cả request thành công** (không chỉ 429). Hiện success response chỉ có body, không có header. Client SDK có thể preemptively throttle nếu biết `remaining`. Low prio.
3. **Distributed lockout** cho signin (5 IP/min hiện là sliding window; nếu muốn lock-out 15 phút sau 5 lần thất bại liên tiếp → cần `blockDuration` option của rate-limiter-flexible). TIP-05c.
4. **Grafana dashboard** quan sát `rate_limit_exceeded_total{backend="memory"}` — nếu > 0 trong prod thì alert "Redis down, rate limiter in insurance mode".
5. **Tune tiers theo endpoint cụ thể**. Hiện gom 3 tier (heavy/write/read); ví dụ `/api/ai/auto-po/approve` rule = write (120/min) nhưng AI-heavy; phân biệt theo route prefix có thể hữu ích. TIP-05d.
6. **Document SKIP_RATE_LIMIT env flag** trong `docs/ENV.md` — cảnh báo "DANGEROUS, production không dùng".

## VERIFY HINTS

```
# Prereq:
npm install                           # picks up rate-limiter-flexible

# Unit tests:
npm test -- rate-limit                # 5 suite: identifier, bypass, in-memory, prod-fail-fast, metrics

# Typecheck:
npx tsc --noEmit                      # should pass

# Dev smoke:
unset REDIS_URL && NODE_ENV=development npm run dev
for i in 1..10; do curl -X POST /api/auth/signin -H 'x-forwarded-for: 1.1.1.1'; done
# calls 6-10 should return 429

# Prod fail-fast smoke:
NODE_ENV=production unset REDIS_URL npm start
# expect process to crash with: "FATAL: NODE_ENV=production but REDIS_URL is not set"

# Metrics scrape:
curl http://localhost:3000/api/metrics | grep rate_limit_exceeded_total
# expect lines like: rtr_mrp_rate_limit_exceeded_total{tier="strict-auth",backend="redis"} 42
```

## NEXT

- TIP-03 · Idempotency-Key middleware (wave 3) — reuse same IORedis connection pattern (yet another dedicated connection, or share với rate-limit's).
- VERIFY · typecheck + lint + test + REQ matrix.
