# RTR-MRP × BOMIST — Báo cáo Khả thi V2 (hiệu chỉnh theo X-Ray)

**Ngày:** 23/04/2026
**Thay đổi so với V1:** Cập nhật theo kết quả X-Ray codebase — project đang ở giai đoạn stabilization (3 commits/tháng 4 so với 179 commits/tháng 1), đang có `feat/purchase-request-module` in-flight, Claude là AI primary, fix/feat ratio 56:29. Đề xuất được phase-hoá lại cho phù hợp.

---

## 1. Delta so với V1 — 4 điểm X-Ray làm thay đổi đánh giá

| Nhận định V1 | X-Ray cho thấy | Hệ quả với đề xuất |
|---|---|---|
| "Effort 3-5 sprint cho 1 backend + 1 frontend" | Velocity đã giảm từ 179 commits/tháng (Jan) xuống 3 commits/tháng (Apr). Team đang stabilize. | Không nên mở một mảng mới 3-5 sprint monolith. Phải **cắt lát mỏng**, mỗi lát shippable độc lập, không khoá team khỏi bug-fix. |
| "Thêm 2 model PartAttribute / AttributeDefinition" | Schema đã 179 models, 6,781 dòng, 459 index. Fix ratio 56% → database churn đã nặng. | Schema addition phải **additive-only, tách commit**, kèm migration plan rõ. Mỗi model mới = một PR riêng, có test. |
| "Nexar/Octopart adapter ~500 LOC" | Có `feat/purchase-request-module` đang mở (3,136 dòng thêm, 8 API endpoints, 3 UI components). Phòng khám quy tắc: một feature branch tại một thời điểm. | **Hoãn cho đến khi PR module merge**. Ưu tiên ghép đôi Octopart vào PR module (PR line → MPN lookup) làm bước đầu — tận dụng momentum thay vì mở front mới. |
| "AI primary: Gemini" | AI primary thực tế là **Claude** (Anthropic SDK 0.71), OpenAI/Gemini là fallback. Đã có infra AI streaming. | Mở ra một **moat thật** mà BOMIST không có: Claude-powered datasheet → parametric attribute extraction. Đây là differentiator, không phải feature phụ. |

---

## 2. Hiệu chỉnh phán đoán chiến lược

V1 nói: "Build thay BOMIST, 3-5 sprint."

V2 nói: **"Phase-hoá thành 4 pha rời, mỗi pha shippable trong ≤1 sprint, mỗi pha có customer value độc lập."** Nếu sau Phase 1-2 customer electronics không đủ để justify, có thể dừng và không lỗ gì vì tất cả đều là additive + đã có customer đang dùng.

**Phân tích lại bối cảnh:**

1. **Team đang nợ technical debt**: 199 fix commits vs 104 feat commits. Mở module mới quy mô lớn khi fix-to-feat = 1.9:1 = thiết kế thêm bug mới.
2. **Chưa có khách hàng điện tử xác nhận** (theo yêu cầu ban đầu anh nói "điện tử là chính" — nhưng README nói "drone và thiết bị công nghệ cao"). Cần xác minh ít nhất 1-2 khách pilot trước khi đầu tư đầy đủ.
3. **PR module merge trước**: đang +3,136 dòng, 25 file. Merge xong mới nên mở branch khác — nếu không sẽ có conflict schema migration.
4. **Test gap đã là risk sẵn**: 279 test files cho 361 API routes (~77% coverage giả định 1:1). Mọi module mới phải đi kèm test, không được làm tệ hơn.

---

## 3. Roadmap V2 — 4 Phase độc lập

### Phase 0 — "Data Onramp" (1 sprint, có thể làm song song PR module merge)

**Mục tiêu:** Cho phép khách hàng điện tử nhập dữ liệu từ BOMIST vào RTR-MRP mà **không cần thay đổi schema**.

**Scope:**
- Thêm preset mapping "BOMIST CSV" vào `src/app/api/import` sẵn có (đã có `/analyze`, `/execute`, `/rollback`, `/mappings`).
- Mapping: BOMIST `reference` → `Part.partNumber`, BOMIST `manufacturer` → `Part.manufacturer`, BOMIST `mpn` → `Part.manufacturerPn`, BOMIST `datasheet` → `Part.datasheetUrl`, BOMIST `qty` → `Inventory.quantity`.
- Support `.bomist_dump` format (JSON) — parse và chunk thành các ImportJob.
- UI: thêm entry "Import from BOMIST" trong `/data-setup`.

**Code impact:** ~400 LOC, 0 schema change. **Không cần feature branch riêng** — có thể đi chung với PR module hotfix.

**Value:** Khách hàng đang dùng BOMIST có thể trial RTR-MRP ngay, không bị mất dữ liệu. Đây là **rào cản gia nhập thấp nhất** để thu hút electronics customer.

**Test:** 5-8 unit test cho mapping logic, 1 integration test E2E với file `.bomist_dump` mẫu.

---

### Phase 1 — "MPN Lookup in PR" (1 sprint, bắt đầu sau khi PR module merge)

**Mục tiêu:** Tận dụng PR module đang in-flight. Khi user tạo PR line, nếu `Part.manufacturerPn` có giá trị, tự động kéo giá real-time từ Octopart/Nexar → ghi vào PR line + `PartCostHistory`.

**Scope:**
- `src/lib/integrations/octopart.ts`: adapter Nexar với rate-limit, cache Redis TTL 24h.
- Env: thêm `NEXAR_CLIENT_ID`, `NEXAR_CLIENT_SECRET` (free tier) — per-tenant storage qua `TenantApiKey` (đã có model sẵn, `prisma/schema.prisma:5146`).
- API: `POST /api/purchasing/pr/[id]/lines/[lineId]/refresh-quote`.
- UI: nút "🔄 Quote" trên từng PR line trong `pr-detail.tsx` (đã có).
- Fallback: nếu không có Nexar key, dùng giá từ `PartSupplier` như cũ.

**Code impact:** ~500 LOC backend + ~80 LOC UI. **Zero schema change** — ghi vào `PartCostHistory` (đã có).

**Value:** Khách điện tử thấy được giá thực từ Mouser/Digikey **trong workflow mua hàng của họ**. Đây là moment of truth — nếu họ bị thuyết phục bước này, phase 2 có justification.

**Test:** mock Nexar API; 3 integration test (có key, không có key, rate limit hit).

---

### Phase 2 — "Parametric Search" (2 sprint, chỉ nếu Phase 1 có customer uptake)

**Mục tiêu:** Tìm linh kiện theo thông số kỹ thuật ("10kΩ 0603 1% resistor").

**Scope:**
- Thêm `PartAttribute` + `AttributeDefinition` model (V1 đã đề xuất).
- Seed 30 AttributeDefinition cho 8 category cốt lõi: Resistor, Capacitor, Inductor, Diode, Transistor/MOSFET, IC/MCU, Crystal, Connector.
- Auto-extract attribute từ dữ liệu đã import BOMIST (field `description` thường có "10kΩ 0603 1%" regex-able).
- UI filter trong `PartsTable` — slider cho số (R, L, C, V), dropdown cho enum (package), search chip.

**Code impact:** 2 model migration + ~1,000 LOC (seed + extractor + UI filter + API).

**Gating:** Chỉ khởi động nếu có **≥2 khách hàng electronics signed** sau Phase 1. Nếu không, dừng ở Phase 1 — vẫn đã có giá trị rõ ràng.

**Test:** unit cho attribute extractor (30+ case), integration cho filter query, E2E cho filter UI.

---

### Phase 3 — "Claude-powered Datasheet Extraction" (1 sprint)

**Mục tiêu moat:** Dùng Claude đã có sẵn để đọc PDF datasheet → tự điền `PartAttribute`. BOMIST **không có** khả năng này.

**Scope:**
- `src/lib/ai/datasheet-extractor.ts`: Claude với tool use, input PDF (đã có AWS S3 storage), output JSON attribute.
- Prompt: "Extract these fields: capacitance_uF, tolerance_pct, voltage_V, package, temperature_min_C, temperature_max_C, part_number". Nếu không tìm thấy → `null`, không hallucinate.
- Route `POST /api/parts/[id]/extract-attributes` → gọi khi upload datasheet mới.
- Human-in-loop: extract kết quả hiển thị ở UI với checkbox "Approve" trước khi commit vào DB.
- Confidence score + link tới đoạn trích trong PDF (citation).

**Code impact:** ~600 LOC, không schema change mới (PartAttribute đã có ở Phase 2).

**Value:** Đây là **tính năng BOMIST không thể copy trong ngắn hạn** (họ không có AI infra). Đây chính là lý do tại sao phải tự build thay vì connect.

**Test:** unit với 5 datasheet mẫu (R/C/MCU/MOSFET/crystal), so sánh kết quả với ground truth.

---

### Phase 4 — "Polish" (0.5 sprint)

- StorageLocation tree (Site → Cabinet → Drawer → Bin → Reel) — nâng cấp `Inventory.locationCode`.
- Reel counter (SMD) — smart counter theo lần pick.
- Swagger/OpenAPI auto-gen từ Zod schemas.
- Dashboard widget "Top 10 MPN used across active BOMs" — tận dụng `AnalyticsDashboard` + `KPIDefinition` đã có.

---

## 4. Ma trận chiến lược V2

| Pha | Effort | Schema change | Rủi ro | Customer value | Gate | Reversible |
|---|---|---|---|---|---|---|
| 0 — Data Onramp | 1 sprint | 0 | Thấp | Onboarding BOMIST user | Ship ngay | Có |
| 1 — MPN Lookup in PR | 1 sprint | 0 | Thấp | Real-time pricing trong PR | Sau khi PR module merge | Có (feature flag) |
| 2 — Parametric Search | 2 sprint | +2 model | Trung | Tìm kiếm chuyên sâu | ≥2 khách electronics ký | Có (additive only) |
| 3 — Claude datasheet AI | 1 sprint | 0 | Thấp (AI infra có sẵn) | **Moat vs BOMIST** | Sau Phase 2 | Có |
| 4 — Polish | 0.5 sprint | +1 model (StorageLocation) | Thấp | UX completeness | Khách nhiều kho | Có |

**Tổng effort tối đa:** 5.5 sprint (~11 tuần). **Tối thiểu khả thi để có value:** 2 sprint (Phase 0+1).

---

## 5. Ba điểm thay đổi then chốt so với V1

1. **Không mở front mới ngay.** Chờ PR module merge. Phase 0 có thể làm song song vì chỉ touch `/api/import`.
2. **Tận dụng PR module làm beachhead.** Thay vì xây standalone "Component Library", đóng gói MPN lookup trực tiếp vào PR line — user thấy value trong workflow hiện có của họ.
3. **Claude là differentiator, không phải tính năng phụ.** V1 chỉ đề cập cache Nexar; V2 đặt datasheet extraction ở vị trí moat. Đây là lý do kỹ thuật tại sao "Build" vẫn đúng đường: RTR-MRP có thứ BOMIST không thể sao chép trong 6 tháng.

---

## 6. Gate quyết định trước khi bắt đầu

Trước khi ship Phase 1, cần trả lời:

1. **Có ít nhất 1 khách hàng electronics pilot không?** (Confirm với sales). Nếu không, dừng ở Phase 0.
2. **PR module đã merge chưa?** (Mở `git log feat/purchase-request-module` check status). Nếu chưa, chỉ làm Phase 0.
3. **Team có capacity 1 engineer cho 2 sprint không?** (Velocity hiện tại 3 commits/tháng cho thấy team bận; có thể cần outsource hoặc hoãn 1 tháng).
4. **Nexar free tier đủ không?** Check quota: free tier = 1,000 requests/month. Nếu kỳ vọng >1,000 PR line/tháng, cần plan $99/mo.

---

## 7. Tóm tắt khuyến nghị

- **Tuần 1-2:** Phase 0 (Data Onramp) — zero-risk, onboard BOMIST user.
- **Tuần 3-5:** Phase 1 (MPN Lookup in PR) — real value trong workflow existing.
- **Gate customer check.**
- **Tuần 6-9:** Phase 2 (Parametric Search) — nếu có uptake.
- **Tuần 10-11:** Phase 3 (Claude datasheet AI) — moat.
- **Tuần 12:** Phase 4 polish + tuyên bố "BOMIST-ready".

Nếu dừng ở Phase 1 (4-5 tuần), RTR-MRP đã có thể demo "nhập dữ liệu BOMIST + giá real-time Mouser/Digikey trong PR" — đủ cho sales electronics. Nếu đi hết Phase 4 (11-12 tuần), RTR-MRP **vượt BOMIST** về tính năng điện tử cốt lõi, lại có thêm toàn bộ MRP/Quality/Finance — giá trị rất khác.

---

## Nguồn tham khảo

- Báo cáo V1: `/Users/os/RtR/mrp/BOMIST_FEASIBILITY_REPORT.md`
- X-Ray project 2026-04-23 (cung cấp trực tiếp bởi user)
- [BOMIST — Pricing](https://bomist.com/pricing), [BOMIST API docs](https://docs.bomist.com/features/api)
- Codebase: `prisma/schema.prisma`, `src/app/api/**`, `src/lib/ai/**` (commit hiện tại)
