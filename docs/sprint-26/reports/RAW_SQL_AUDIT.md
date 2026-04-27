# Sprint 26 · TIP-04 · Raw SQL Audit

> Scope: toàn bộ `$queryRaw*` và `$executeRaw*` trong `src/` (excl. test mocks).
> Criteria: mọi interpolation `${...}` phải bind qua tagged template (Prisma tự bind $N), hoặc whitelist regex trước khi nối chuỗi. Không còn `$queryRawUnsafe.*\${` hay `$executeRawUnsafe.*\${` không có gate.

---

## Tổng quan

| Kind | Count | Production code | Test mocks |
|---|---|---|---|
| `$queryRaw` (tagged template) | 14 call | 11 | — |
| `$queryRawUnsafe` | 2 | 1 (wrapped) + 0 | 1 mock |
| `$executeRawUnsafe` | 2 | 2 | — |
| **Tổng production** | **14** | **14** | — |

Sau audit: **0 UNSAFE form còn lại**. 1 chỗ fix trong sprint này (`data-setup/reset`).

---

## Chi tiết từng call

### 1. SAFE — static SQL (không input)

| # | File:Line | SQL pattern | Verdict |
|---|---|---|---|
| 1 | `src/lib/monitoring/health.ts:51` | `SELECT 1` | SAFE · healthcheck |
| 2 | `src/app/api/health/route.ts:20` | `SELECT 1` | SAFE · healthcheck |
| 3 | `src/lib/optimization/database/index.ts:407` | `SELECT 1` | SAFE · connection test |
| 4 | `src/lib/dashboard/role-dashboard-service.ts:89` | `SELECT COUNT(DISTINCT p.id) FROM parts p JOIN inventory i ...` (no interp) | SAFE |
| 5 | `src/lib/notifications/trigger-service.ts:135` | low-stock aggregate, no input | SAFE |
| 6 | `src/lib/notifications/daily-digest.ts:64` | low-stock count, no input | SAFE |
| 7 | `src/app/api/cost-optimization/suppliers/route.ts:13` | supplier spend aggregate | SAFE |
| 8 | `src/app/api/cost-optimization/suppliers/opportunities/route.ts:20` | spend by supplier | SAFE |
| 9 | `src/app/api/cost-optimization/suppliers/opportunities/route.ts:50` | parts per supplier | SAFE |
| 10 | `src/app/api/cost-optimization/suppliers/opportunities/route.ts:106` | part with multi suppliers | SAFE |
| 11 | `src/app/api/data-setup/reset/route.ts:41` | `SELECT tablename FROM pg_tables WHERE schemaname='public'` | SAFE |

### 2. SAFE — tagged template with bound params

| # | File:Line | Input | Verdict |
|---|---|---|---|
| 12 | `src/lib/ai/autonomous/po-suggestion-engine.ts:576` | `${partId}` (UUID from route), `${ninetyDaysAgo}` (Date) | SAFE · Prisma tagged template auto-binds params as `$N`; no string concat |

### 3. SAFE — wrapped Unsafe helper with gate

| # | File:Line | Shape | Verdict |
|---|---|---|---|
| 13 | `src/lib/tenant/prisma-tenant.ts:318-344` (`tenantQuery`) | Helper wraps `$queryRawUnsafe(sql, ...params)`. Gates before call: (a) tenantId UUID regex, (b) dangerous keyword regex (`DROP\|DELETE\|TRUNCATE\|ALTER\|CREATE\|GRANT`), (c) params passed separately, not interpolated. | SAFE · controlled surface; params are `$N` bound by Prisma |

### 4. SAFE — whitelisted identifier interpolation (dynamic table name)

| # | File:Line | Input | Verdict |
|---|---|---|---|
| 14 | `src/lib/optimization/database/index.ts:510-556` (`bulkUpsert`) | `tableName` + field names gated by `/^[a-zA-Z_][a-zA-Z0-9_]*$/`; values bound via `$N` | SAFE · identifier gate is the accepted Postgres pattern (Prisma không có identifier template) |

### 5. FIXED trong sprint này

| # | File:Line | Trước | Sau | Verdict |
|---|---|---|---|---|
| 15 | `src/app/api/data-setup/reset/route.ts:52` | `$executeRawUnsafe(\`TRUNCATE TABLE "${table}" CASCADE\`)` — table từ `pg_tables` (DB-controlled) nhưng không gate regex | Thêm `validIdentifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/`, filter tableNames trước loop; interpolation giữ nguyên vì Postgres không hỗ trợ identifier template. Commit trong TIP-04. | SAFE · defense in depth |

---

## Verification

```bash
# Pattern chính: $queryRawUnsafe với template interp
$ grep -rn '\$queryRawUnsafe.*\${' src/ | wc -l
0

# Pattern anh em: $executeRawUnsafe với template interp
$ grep -rn '\$executeRawUnsafe.*\${' src/ | grep -v '/__tests__/' | wc -l
1   # data-setup/reset/route.ts:52 — giờ đã có regex gate ở dòng trên

# Tổng raw SQL production
$ grep -rn '\$queryRaw\|\$executeRaw' src/ --include='*.ts' | grep -v '/__tests__/' | wc -l
14
```

Note: Kết quả `1` cho `$executeRawUnsafe.*\${` là kỳ vọng — chỗ duy nhất còn interpolation là `TRUNCATE TABLE`, đã được gate bằng whitelist regex ngay trước đó. Prisma không cung cấp `Prisma.sql` cho identifier nên đây là pattern hợp lệ.

---

## Kết luận

Không chỗ nào production code tiếp nhận SQL hoặc identifier từ user input mà interpolate trực tiếp. Hai lớp bảo vệ:

1. **Tagged template Prisma (`$queryRaw\`SELECT ... WHERE x = ${value}\``)** — 11/14 call. Prisma tự chuyển `${value}` thành `$N` prepared statement.
2. **Identifier whitelist (`/^[a-zA-Z_][a-zA-Z0-9_]*$/`)** — 2/14 call (`bulkUpsert`, `data-setup/reset`). Áp cho tên bảng/cột, không cho giá trị.

Duy nhất `tenantQuery` còn dùng `$queryRawUnsafe` nhưng có 3 gate (UUID, keyword blacklist, param separation) — theo Blueprint §1 REQ-26-04 criteria "whitelist" đã đạt.

**Acceptance:** REQ-26-04 PASS.
