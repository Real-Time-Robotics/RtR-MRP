# Đánh giá độ hoàn thiện RTR-MRP

> Bản audit toàn diện bốn trục — Tính năng, Chất lượng mã, Sẵn sàng vận hành, UX.
> Nhánh: `feat/purchase-request-module` · Thời điểm: 23/04/2026 · Quy mô: 483K LOC · 179 models · 361 routes · 303 test files · 54 E2E specs.

---

## 1. Điểm tổng

| Trục | Điểm | Nhận định một câu |
|---|---|---|
| Tính năng | **74/100** | Độ rộng ấn tượng, nhưng UOM/TransferOrder/Webhook còn là schema chết. |
| Chất lượng mã | **72/100** | Kỷ luật TypeScript cao; thiếu pre-commit guardrail và test coverage. |
| Sẵn sàng vận hành | **59/100** | Ba lỗ hổng chặn go-live: `db push`, queue in-memory, thiếu idempotency. |
| Trải nghiệm người dùng | **63/100** | Kiến trúc UX chắc; a11y, i18n, onboarding còn trống. |
| **Tổng** | **67/100** | **Pre-production / Pilot-ready.** Đủ để pilot nội bộ; còn 5–7 rủi ro chặn multi-tenant go-live. |

### Heatmap nhanh

```
Tính năng          ████████████████░░░░░░░░  74
Chất lượng mã      ███████████████░░░░░░░░░  72
Sẵn sàng vận hành  ████████████░░░░░░░░░░░░  59
Trải nghiệm UX     █████████████░░░░░░░░░░░  63
```

---

## 2. Trục Tính năng — 74/100

### Bảng điểm module

| Module | Điểm | Đã có | Thiếu then chốt |
|---|---|---|---|
| Master Data | 72 | Part, BOM, Warehouse, Supplier, Customer, PartAlternate/Revision/Certification | UOM model + conversion (chỉ là `String @default("EA")`), Location/Bin trong Warehouse |
| Sales | 78 | Quotation full lifecycle, SO, Shipment pick, SalesInvoice, pricing rules | Shipment list/create/cancel, Delivery Note, Packing List, RMA, Credit Note |
| Purchasing | 85 | PR 9-state, PO, GRN, 3-Way Match, supplier scoring | RFQ/tender, supplier portal 2 chiều, blanket/contract PO |
| Planning | 82 | MRP, ATP/CTP, pegging, simulation, multi-site gợi ý | MPS tách biệt, DRP hoàn chỉnh, time-fence |
| Production | 80 | WorkOrder, Routing, WorkCenter, OEE, shop-floor, scheduler, subcontracting | Backflush rule UI, Andon/realtime, Kanban loop |
| Warehouse | 70 | Issue, Adjust, Cycle count, ABC, expiry, PickList, mobile scan | **TransferOrder API rỗng** (model có), bin hierarchy, Serial model riêng |
| Quality | 88 | Inspection, NCR 9-state, CAPA + Action + History, CoC, SPC page, scrap/rework | SPC control chart nâng cao, PPAP/APQP |
| Traceability | 75 | `/api/quality/traceability/[lotNumber]`, LotTransaction log xuyên suốt | Genealogy tree UI, forward trace qua relation graph |
| Reporting | 82 | Dashboard + widget/KPI/template, ReportSchedule, Excel export/templates | Query builder ad-hoc, cron runner thực |
| Integration | 35 | Barcode/ScanLog, TenantApiKey + TenantWebhook models, v2 API | **`/api/webhooks/**` và `/api/edi/**` rỗng**; không có ERP connector |

### Gap nghiêm trọng

**UOM dead.** `uom String @default("EA")` inline (`prisma/schema.prisma:3435`, `:3565`). Không convert được kg↔tấn, m↔mm → MRP sai số khi NCC giao đơn vị khác đơn vị tồn.

**TransferOrder API rỗng.** Model tồn tại (`schema.prisma:4101`) nhưng `/api/transfer-orders` không có file. Multi-site MRP gợi ý transfer nhưng không thực thi được.

**Webhook/EDI là dead schema.** `TenantWebhook` có (`schema.prisma:5200`) nhưng không có endpoint delivery. Không đẩy SO/PO tự động sang khách/NCC — vẫn phải Excel qua lại.

**Serial tracking yếu.** `NCR.serialNumbers Json?` chỉ là JSON blob, không có model Serial riêng. Không truy vết được từng serial thiết bị — ngành điện tử/y tế không đáp ứng.

**Shipment thiếu endpoint chính.** Chỉ có `/api/shipments/[id]/pick/route.ts`; không list/create/cancel; không có packing list, delivery note PDF.

### So sánh ngành

| Hạng mục | RTR-MRP vs Odoo | RTR-MRP vs SAP S/4HANA |
|---|---|---|
| Master Data | **Nhỉnh hơn Odoo Community** (PartCertification ROHS/REACH/ITAR) | Kém (không có UOM categories) |
| Quality 9-state + CAPA tách bảng | **Vượt Odoo Manufacturing** | Ngang SAP QM |
| Planning (ATP/CTP, pegging, simulation) | **Ngang Odoo Enterprise** | Kém (không time-fence, không aggregate planning) |
| 3-Way Match | Ngang NetSuite | Kém (không có PO blanket/contract) |
| Integration | **Thua xa** (Odoo có 40+ connector) | **Thua xa** (SAP có IDoc/BAPI) |
| AI layer (forecast, auto-PO, auto-schedule) | **Vượt tất cả** (không hệ mở nào có Claude infra tích hợp sẵn) | — |

---

## 3. Trục Chất lượng mã — 72/100

### Các con số đo trực tiếp

| Chỉ số | Giá trị | Nhận xét |
|---|---|---|
| Source LOC | 483.991 / 2.262 file | Khớp X-Ray |
| Unit/integration tests | 303 file | Tỷ lệ 15,3% — thấp so với chuẩn 30–40% |
| E2E Playwright specs | 54 | Có stress, mobile, data-integrity |
| `strict: true` | Bật | `tsconfig.json:7` |
| `any` trong source | 21 (trừ test) | Xuất sắc |
| `@ts-ignore` | 0 | Xuất sắc |
| `@ts-expect-error` | 15 | Chấp nhận được |
| TODO/FIXME/HACK | 3 | Rất ít nợ tường minh |
| `eslint-disable` | 108 | Đáng lưu ý |
| Route có try/catch | 350/361 (97%) | 11 route hở — gồm MFA và approve |
| Zod usage | 2.355 matches | Validation phủ dày |
| Conventional commits | 48/50 gần nhất | Discipline cao |
| Pre-commit / Prettier / Husky | **KHÔNG có** | Thiếu guardrail |
| File lớn nhất | 1.724 dòng (`supplier-data-extractor.ts`) | Monster |

### Điểm mạnh

Kỷ luật TypeScript hiếm gặp ở codebase 483K LOC: strict bật, chỉ 21 `any` production, 0 `@ts-ignore`. Error handler chuẩn hoá (`src/lib/error-handler.ts:28` với `AppError` + 6 subclass). 97% route có try/catch. Hệ thống docs (`/docs` > 40 file: API, ARCHITECTURE, RUNBOOKS, rollback-plans/PHASE1..8).

### Điểm yếu

- Thiếu pre-commit hook — dev có thể commit code lỗi; ESLint chỉ ở mức `warn`.
- Test ratio 15,3% — nhiều module lớn (supplier-risk, scheduling-engine) không có test cặp đôi.
- 10 file > 1.000 dòng, đa số trong `src/lib/ai/*` — vi phạm single-responsibility.
- 11 route nhạy cảm thiếu try/catch: `compliance/mfa/verify`, `compliance/mfa/setup`, `purchase-orders/[id]/approve`, `quotations/[id]/send` — rò stack trace và fail-open MFA.
- 108 `eslint-disable` + 39 `console.error` — nhiều hơn mặt bằng codebase có logger riêng.

---

## 4. Trục Sẵn sàng vận hành — 59/100

### Bảng điểm 6 mục

| Mục | Điểm | Bằng chứng |
|---|---|---|
| Security | 72 | Auth Gateway JWT qua `jose.jwtVerify`, RBAC 2 tầng (role + permission), 206/250 route có Zod, Trivy scan CI, 9 security headers. **Trừ**: 36 chỗ `$queryRaw*`, MFA chỉ stub, rate limit in-memory, JWT fallback sang `NEXTAUTH_SECRET`. |
| Performance | 65 | 180 `@@index`, cache 2 lớp Redis + LRU 5000, `optimizePackageImports`, `prom-client`. **Trừ**: pagination thưa, 33 chỗ `include` vs 25 chỗ `select` → over-fetching. |
| Observability | 55 | Logger tự xây, Sentry lazy-load, `/api/health` check DB thực, `/api/metrics`. **Trừ**: 427 `console.log` còn trong source, không có OpenTelemetry, health không check Redis thực. |
| Deployment | 62 | 5 workflow CI/CD đầy đủ, Trivy, docker, 4 seed scripts, 7 rollback plans. **Trừ**: `prisma db push` trong production, không staging gate, deploy SSH single-host. |
| Resilience | 40 | `$transaction` 124 chỗ/51 file, retry/backoff ở AI layer, distributed lock Redis. **Trừ**: Queue BullMQ là **in-memory mock** (comment "BullMQ disabled for Render compatibility"); **idempotency = 0 match** trong toàn src. |
| DR / Backup | 60 | `pg_dump` cron 2AM UTC, retention 30 ngày, restore script, DR-PROCEDURES.md. **Trừ**: không restore drill, không backup file storage, không PITR, không công bố RPO/RTO. |

### Top 5 rủi ro chặn go-live

1. **`prisma db push` trong production deploy** — `.github/workflows/cd-production.yml:55` dùng `db push --skip-generate || true` thay cho `migrate deploy`. Phá migration history, nuốt lỗi.
2. **Queue BullMQ là in-memory mock** — `src/lib/jobs/queue.ts:3`. Job MRP/report/notification sẽ mất khi process restart hoặc scale ngang.
3. **Thiếu idempotency toàn hệ thống** — `grep -r idempotency src/` trả 0. Click đúp hoặc retry mạng tạo bản ghi trùng ở PR/PO/GRN/Inventory adjust.
4. **36 vị trí `$queryRaw`/`$queryRawUnsafe`** cần audit SQLi từng chỗ.
5. **Rate limit và distributed lock in-memory** — khi scale ≥2 instance, mỗi pod có counter riêng → bruteforce login vượt giới hạn × N pods.

### Checklist còn thiếu

Thay `prisma db push` bằng `migrate deploy`; bật BullMQ thực với Redis; thêm `Idempotency-Key` middleware cho mọi POST mutation; audit 36 chỗ `$queryRaw*`; rate limit backed bằng Redis; xoá/guard 427 `console.log`; bật OpenTelemetry; restore drill CI; backup S3 cho attachments; staging gate + manual approval; blue/green deploy; công bố RPO/RTO + PITR; MFA enforcement middleware; CSP bỏ `unsafe-inline`/`unsafe-eval`.

---

## 5. Trục Trải nghiệm người dùng — 63/100

### Ma trận CRUD

| Entity | List | Detail | Create | Edit | Delete | Bulk |
|---|---|---|---|---|---|---|
| Part, PO, PR, SO, Supplier, Customer | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| BOM | ✓ | ✓ | ✓ | một phần | một phần | ✗ |
| WO, GRN, Inspection | ✓ | ✓ | ✓ | một phần | ✗ | ✗ |
| NCR, CAPA | ✓ | một phần | ✓ | ✗ | ✗ | ✗ |

Core entities đủ; quality module CRUD mới một nửa — user phải dùng API trực tiếp để edit NCR/CAPA.

### Điểm 10 tiêu chí

| Tiêu chí | Điểm | Ghi chú |
|---|---|---|
| CRUD completeness | 7 | Core đủ; quality side incomplete |
| Form quality | 7 | 10/21 form dùng Zod; còn lại validate ad-hoc |
| Loading/Error/Empty | 8 | ~100 loading.tsx + 90 error.tsx + 22 not-found.tsx; 45 skeleton variants |
| i18n | 6 | Tự xây `useLanguage` + `locales/{vi,en}.json`; UI hardcode lẫn lộn VN/EN |
| Responsive | 6 | Có mobile-nav/ui-kit; page con desktop-first |
| Accessibility | 4 | `aria-*` thưa; Radix base không thay được audit WCAG |
| Navigation consistency | 8 | `ModernAppShell` + `MinimalistSidebar` + `smart-breadcrumb` nhất quán |
| Onboarding | 2 | Không tour, không welcome wizard, không demo data cho user mới |
| Feedback loop | 8 | `sonner` toast dày đặc, confirm dialog, mutation hook chuẩn |
| Bulk & Export | 7 | `BulkActionsBar` + Excel export/import; chưa lan tới quality/production |

### Top 5 điểm gãy UX

1. **i18n chắp vá** — metadata, label, toast VN/EN lẫn lộn. Chuẩn hoá toàn UI qua `useLanguage` hoặc `next-intl`.
2. **Accessibility gần như trống** — thiếu `aria-label` cho icon-button, không skip-link. Cần audit WCAG 2.1 AA.
3. **Onboarding = 0** — user mới không biết bắt đầu từ đâu. Cần welcome wizard + demo tenant.
4. **Form validation không đồng đều** — 11 form ad-hoc. Chuẩn hoá `react-hook-form + zodResolver + FormMessage`.
5. **Quality module CRUD một nửa** — NCR/CAPA/Inspection chỉ list + new, không edit/delete UI.

---

## 6. Bức tranh tổng hợp

### Bốn sự thật khó chịu

Nhiều tính năng là **schema chết**: UOM, TransferOrder, Webhook, Serial tracking — có model nhưng không có route/UI kết nối. Đây là dấu hiệu của giai đoạn "vẽ kiến trúc rộng, build chậm hơn thiết kế".

Sản phẩm đã qua giai đoạn MVP nhưng **chưa tới production** ở nghĩa đa-instance. Ba rủi ro chặn: `db push` trong prod, queue in-memory, thiếu idempotency. Single-node single-tenant đi được; multi-pod không được.

**Code quality discipline cao hơn UX discipline.** TypeScript strict + error handler chuẩn + Conventional Commits cho thấy kỹ thuật tốt; nhưng a11y/i18n/onboarding bị bỏ qua — cho thấy chưa có product designer hoặc chưa có user testing thật.

**Claude AI layer là moat thật**. Không hệ mở nào (Odoo/ERPNext/Tryton) có forecast/auto-PO/auto-scheduler tích hợp LLM như RTR-MRP. Nhưng moat này chỉ có giá trị nếu phần lõi MRP đủ ổn để người dùng tin tưởng.

### Ba lộ trình đề xuất

**Sprint 26 (2 tuần) — Unblock go-live.**
Đủ để deploy single-tenant cho 1 khách pilot.

- Thay `prisma db push` → `migrate deploy`.
- Bật BullMQ Redis thực cho MRP run + report + notification.
- Middleware `Idempotency-Key` cho POST mutation ở PR/PO/GRN/Inventory.
- Audit 36 chỗ `$queryRaw*`, whitelist hoặc chuyển `Prisma.sql`.
- Rate limit Redis-backed.

**Sprint 27–28 (1 tháng) — Lấp schema chết.**
Để tránh marketing gọi tên tính năng mà user không dùng được.

- Model UOM + conversion table, backfill `String` hiện tại.
- `/api/transfer-orders` CRUD + list + execute.
- `/api/shipments` list/create/cancel + delivery note PDF.
- Serial model riêng + migration từ `Json?`.
- Webhook delivery endpoint + retry.

**Sprint 29–31 (1,5 tháng) — Nâng chuẩn UX & a11y.**
Đủ để demo cho khách Enterprise.

- Chuẩn hoá i18n toàn UI qua `next-intl`.
- Audit WCAG 2.1 AA, thêm `aria-*` cho icon-button, skip-link.
- Onboarding wizard + demo tenant seed.
- Hoàn thiện CRUD quality module (edit/delete NCR/CAPA).
- Chuẩn hoá 11 form còn lại sang Zod.

Sau 3 lộ trình: điểm tổng dự kiến lên **82/100**, đủ để pitch Enterprise và bán SaaS multi-tenant.

---

## 7. Dẫn chứng kỹ thuật

Các con số trong báo cáo này đều đo trực tiếp bằng grep/find/wc trên codebase thời điểm audit. Nếu cần verify lại:

```bash
find src -name "*.test.*" -o -name "*.spec.*" | wc -l          # test files
find src/app/api -name "route.ts" | wc -l                      # routes
grep -rE "^model " prisma/schema.prisma | wc -l                # Prisma models
grep -c "strict" tsconfig.json                                 # strict mode
grep -rn "idempotency" src/ | wc -l                            # idempotency (= 0)
grep -rn "\$queryRaw" src/ | wc -l                             # raw SQL
```

---

*Báo cáo được tổng hợp từ 4 audit song song. Mỗi trục dựa trên đọc schema, route, middleware, config thực tế — không phỏng đoán.*
