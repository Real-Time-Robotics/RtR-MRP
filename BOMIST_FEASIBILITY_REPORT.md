# RTR-MRP × BOMIST — Báo cáo Khả thi Tích hợp / Thay thế

**Ngày:** 23/04/2026
**Phạm vi:** Đánh giá khả năng Connect / Integrate / Build-Replace phần mềm quản lý linh kiện điện tử BOMIST trong bối cảnh codebase RTR-MRP hiện tại.
**Giả định nền:** Lĩnh vực điện tử là trọng tâm chính của RTR-MRP (PCBA, drone, thiết bị công nghệ cao).
**Nguồn đánh giá:** Đọc trực tiếp `prisma/schema.prisma` (6,781 dòng, 158 models), tree API (291 routes), tài liệu BOMIST chính thức (`docs.bomist.com`, `bomist.com`).

---

## 1. Tóm tắt điều hành

RTR-MRP **đã có sẵn ~85–90% khả năng** của BOMIST ở tầng dữ liệu. Các trường đặc thù cho điện tử như `manufacturerPn`, `manufacturer`, `datasheetUrl`, `lifecycleStatus` (DEVELOPMENT→EOL), `rohsCompliant`, `reachCompliant`, `itarControlled`, price-breaks 3 tier, `PartAlternate`, `PartSupplier` (multi-supplier), `PartDocument` (DATASHEET/DRAWING/...), `PartCertification` (ROHS/REACH/CE/UL), `PartRevision` (ECR/ECO) đều đã tồn tại trong schema. Hệ thống barcode (CODE128/QR/DATAMATRIX), label template (ZPL/HTML), ScanLog cũng đã có.

Ba khoảng trống thực sự so với BOMIST:

1. **Thuộc tính tham số (parametric attributes)** — RTR-MRP chỉ có `tags: String[]` và `category/subCategory/partType`, chưa có model key-value có kiểu dữ liệu để tìm kiếm dạng "10kΩ 0603 1%".
2. **Tích hợp Octopart/Nexar** để kéo giá/tồn kho real-time từ Mouser, Digikey, Farnell, TME — chưa có API key hay adapter nào trong `.env.example`.
3. **Khái niệm "Project/Workspace"** của BOMIST (kiểu DIY/hardware team) — RTR-MRP dùng `Product + BomHeader + WorkOrder`, khác triết lý nhưng phù hợp hơn cho sản xuất công nghiệp.

**Kết luận nhanh:** Không cần "connect 2 chiều" với BOMIST (BOMIST chạy local trên desktop người dùng, không phải cloud SaaS → không thể sync tin cậy từ Next.js server). Khuyến nghị **Build một module "Component Library for Electronics"** nhỏ gọn bên trong RTR-MRP (nới schema thêm 2 model + 1 connector Octopart), effort ước tính **3–5 sprint** cho 1 backend + 1 frontend.

---

## 2. Hiện trạng codebase RTR-MRP

### 2.1 Kiến trúc & quy mô

| Chỉ số | Giá trị |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript 5 |
| Database | PostgreSQL + Prisma ORM |
| Cache/Queue | Redis + BullMQ pattern |
| Auth | NextAuth.js 5 |
| AI | Anthropic SDK 0.71, Google Gemini, OpenAI |
| Storage | AWS S3 (đã cấu hình) |
| Tổng dòng mã | ~378,000 |
| Prisma models | **158** |
| API routes | **291** |
| Tests | 2,695 cases, 102 files |
| Test E2E | Playwright (parts, bom, production, discussions) |

### 2.2 Part model — đã sẵn sàng cho điện tử

Đọc trực tiếp `prisma/schema.prisma:204-366`:

**Đặc tả kỹ thuật đã có:**
- `manufacturer`, `manufacturerPn` — MPN đầy đủ
- `datasheetUrl`, `drawingUrl`, `specDocument`
- `lifecycleStatus`: `DEVELOPMENT | PROTOTYPE | ACTIVE | PHASE_OUT | OBSOLETE | EOL`
- `revision`, `revisionDate`, `effectivityDate`, `obsoleteDate`

**Tuân thủ (quan trọng cho điện tử xuất khẩu):**
- `rohsCompliant: Boolean`, `reachCompliant: Boolean`
- `itarControlled`, `ndaaCompliant`, `eccn`, `hsCode`, `countryOfOrigin`

**Mua hàng:**
- `moq`, `orderMultiple`, `standardPack`, `leadTimeDays`
- `priceBreakQty1/2/3` + `priceBreakCost1/2/3` (3 tier)
- `abcClass`, `buyerCode`

**Model liên quan đã có:**
- `PartSupplier` — supplier-part-number, giá theo currency, qualification date/expiry, preferred flag
- `PartAlternate` — Form-Fit-Function / Functional / Emergency / Approved-Vendor, conversion factor
- `PartDocument` — loại DRAWING/DATASHEET/SPECIFICATION/CERTIFICATE/TEST_REPORT/MSDS/MANUAL/OTHER
- `PartCertification` — ROHS/REACH/CE/UL/ISO/AS9100/ITAR/NDAA/COC/COA + issue/expiry date
- `PartRevision` — ECR/ECO numbers, approval workflow
- `PartCostHistory`, `PartCost`, `PartCostRollup`
- `PartSubstitute`

### 2.3 BOM — đã có Reference Designator và Alternates

`BomLine` (`prisma/schema.prisma:720-782`) có đủ:
- `referenceDesignator` (M1, U1, R47 — đặc thù PCB)
- `findNumber` (item # trên drawing)
- `positionX/Y/Z` (cho assembly instruction / pick-and-place)
- `alternateGroup` + `isPrimary` (cho AVL — Approved Vendor List)
- `phantom`, `subAssembly`
- `bomType`: ENGINEERING / MANUFACTURING / CONFIGURABLE / PLANNING / SERVICE
- `scrapPercent`, `scrapRate`
- `effectivityDate`, `obsoleteDate`, `revision`

### 2.4 Barcode / Inventory / Label

- `BarcodeDefinition`: CODE128, CODE39, QR, DATAMATRIX, EAN13 — đủ cho nhãn reel SMD
- `ScanLog` — trace đủ (RECEIVING, PICKING, LOOKUP)
- `LabelTemplate` — ZPL (máy Zebra), HTML, PDF, có sẵn QR toggle
- `Inventory` có `lotNumber`, `locationCode`, `expiryDate` (quan trọng cho linh kiện nhạy ẩm — MSL)

### 2.5 Modules RTR-MRP CÓ mà BOMIST KHÔNG có

Đây là lý do RTR-MRP là hệ thống cao hơn một bậc:

- **Sales Orders, Quotations, Customers** (BOMIST chỉ mua, không bán)
- **Production / Work Orders / Routing / Capacity / OEE**
- **Quality**: NCR, CAPA, InspectionPlan, DefectCode, CertificateOfConformance
- **Finance**: GL Account, PurchaseInvoice, SalesInvoice, JournalEntry
- **MRP Engine**: MrpRun, PlannedOrder, Pegging, ATP/CTP, Simulation
- **AI/ML**: Demand Forecast, Lead Time Predictor, Supplier Risk Scorer
- **Advanced**: TransferOrder, MaintenanceOrder, Skills, Shifts, Tenant (multi-tenant SaaS)

### 2.6 Khoảng trống so với BOMIST

| Hạng mục | RTR-MRP hiện tại | BOMIST có | Gap |
|---|---|---|---|
| Parametric attribute | `tags[]` + `category` phẳng | Key-value có kiểu (resistance, tolerance, package, voltage…) | **Trung bình** |
| Octopart/Nexar API | Không có | Native, free via Nexar | **Có, nhưng dễ build** |
| Mouser/Digikey direct | Không có | Qua Octopart | **Dễ build adapter** |
| Storage hierarchy (cabinet → drawer → bin → reel) | `locationCode: String` phẳng | Cây lồng nhau | **Nhỏ** |
| Reel counter (smart counting) | Không | Có (cho SMD reel) | **Nhỏ** |
| Project-centric BOM (hobbyist view) | Product+WorkOrder (công nghiệp) | Project có BOM riêng | **Triết lý khác — không phải gap thực** |
| Swagger UI / REST API docs | Chưa rõ có OpenAPI gen | Có tại `:3333/_swagger_ui` | **Nên bổ sung** |
| `.bomist_dump` workspace export | Có `/api/import` + `/api/export` nhưng schema riêng | Format riêng | **Không cần** |

---

## 3. Hiện trạng BOMIST

### 3.1 Kiến trúc sản phẩm

BOMIST là **desktop app** (Electron hoặc tương tự) chạy local, có local REST API exposed ở `localhost:3333/_swagger_ui`. Có chế độ "Server Edition" cho team, dữ liệu có thể sync.

**Hệ quả quan trọng:** BOMIST không phải là cloud API có thể gọi từ server Next.js — nó là ứng dụng chạy trên máy người dùng. Để "connect 2 chiều" cần hoặc (a) người dùng luôn bật BOMIST + mở port, hoặc (b) đồng bộ qua file (.bomist_dump / CSV). Phương án (a) không khả thi cho SaaS production, phương án (b) thực chất là "import/export định kỳ" chứ không phải real-time integration.

### 3.2 Tính năng BOMIST

- **Parts inventory** với on-hand qty, storage location, barcode
- **BOM** đa revision, cost rollup
- **Quoting** qua Nexar API (Mouser, Digikey, Farnell, TME) — miễn phí
- **Import/Export**: CSV (parts, BOMs), JSON/HTML/PDF, `.bomist_dump` full workspace
- **REST API** local với filter query (ví dụ `GET /parts?part.manufacturer=Microchip&limit=10`)

### 3.3 Giá

| Plan | Giá | Giới hạn |
|---|---|---|
| Free | $0 | 1 user, 100 parts, 3 products |
| Maker | $18/tháng | Cá nhân (VAT-inclusive) |
| Pro | $60/tháng | Hiển thị giá, full features |
| Team | $225/tháng | Nhiều người dùng |
| Enterprise | $350/tháng | Tuỳ chỉnh |

Với một doanh nghiệp 5-10 người cần theo dõi giá linh kiện thật, chi phí thực tế là **Pro hoặc Team ~$720–$2,700/năm**. Đây là chi phí cần cân với effort xây module trong RTR-MRP.

---

## 4. Ba phương án — phân tích chi tiết

### 4.1 Phương án A: CONNECT (tích hợp 2 chiều RTR-MRP ↔ BOMIST)

**Cơ chế khả thi:**
- Người dùng cài BOMIST trên desktop, bật API local.
- Dùng `bomist-scripts` (Node.js, có trên GitHub của BOMIST) để định kỳ export `.bomist_dump` hoặc CSV.
- RTR-MRP có endpoint `/api/import/bomist` nhận file, ánh xạ vào `Part`, `BomHeader`, `BomLine`.
- Chiều ngược (RTR-MRP → BOMIST): gen CSV theo schema BOMIST, import thủ công trong BOMIST.

**Ưu:**
- Nhanh nhất để có kết quả: 1 sprint cho CSV importer hai chiều.
- Giữ được investment của user nếu họ đã dùng BOMIST.

**Nhược (nặng):**
- **Không phải real-time**: mỗi desktop instance là một source of truth riêng → conflict khi có >1 người dùng BOMIST cùng edit.
- **Vendor lock trên 2 hệ thống**: bug ở một bên nhân đôi nghiệp vụ.
- **Không tận dụng được strength RTR-MRP**: MRP run, Sales Order, Quality không đồng bộ với BOMIST, người dùng vẫn phải nhập hai lần ở ranh giới Sales/Production.
- **BOMIST license vẫn phải trả** ($720+/năm).

**Khuyến nghị:** Không làm. Đây là giải pháp chữa cháy, không phải chiến lược.

### 4.2 Phương án B: INTEGRATE (nhúng tính năng BOMIST vào RTR-MRP)

**Ý tưởng:** Coi BOMIST như "nguồn cảm hứng UX" và port các tính năng thiếu vào RTR-MRP dưới dạng module "Component Library".

**Scope cần thêm:**

1. **Parametric attributes** — thêm 2 model Prisma:
```prisma
model PartAttribute {
  id          String   @id @default(cuid())
  partId      String
  attributeId String   // FK to AttributeDefinition
  valueText   String?
  valueNumber Float?
  valueUnit   String?  // Ω, µF, V, mA, °C…
  part        Part     @relation(fields: [partId], references: [id], onDelete: Cascade)
  definition  AttributeDefinition @relation(fields: [attributeId], references: [id])
  @@index([partId])
  @@index([attributeId, valueNumber])
}
model AttributeDefinition {
  id         String  @id @default(cuid())
  code       String  @unique  // "resistance", "tolerance", "package"
  name       String
  dataType   String  // "number", "text", "enum"
  unit       String?
  enumValues String[] @default([])
  categories String[] @default([])  // áp dụng cho category nào
}
```

2. **Octopart/Nexar adapter** — `src/lib/integrations/octopart.ts`:
   - Hàm `searchPart(mpn, manufacturer)` → trả về giá từ Mouser/Digikey/Farnell.
   - Route `/api/parts/[id]/quote` để refresh giá, ghi vào `PartCostHistory`.
   - Ước tính: 300-500 LOC, cần 1 Nexar API key (free tier).

3. **Storage hierarchy** — mở rộng `Inventory.locationCode` thành model `StorageLocation` cây lồng (Site → Cabinet → Drawer → Bin → Reel) + `reelRemaining` cho SMD.

4. **Parts bulk import UX** — đã có `/api/import`, chỉ cần thêm preset "BOMIST CSV mapping" (`reference`, `manufacturer`, `mpn`, `description`, `qty` → ánh xạ tự động).

5. **Swagger UI** — generate OpenAPI từ Zod schemas (đã dùng Zod), expose tại `/docs/api`.

**Effort ước tính:**

| Sprint | Output |
|---|---|
| 1 | Schema migration + CRUD PartAttribute + AttributeDefinition seed cho 20 category điện tử (R/C/L/IC/MCU/Crystal/LED...) |
| 2 | UI filter parametric trong PartsTable (Resistance slider, Tolerance dropdown, Package chip) |
| 3 | Octopart/Nexar adapter + route quote + UI "Refresh price" button |
| 4 | StorageLocation tree + migration dữ liệu cũ + reel counter |
| 5 | BOMIST CSV importer preset + Swagger UI + E2E tests |

Tổng: **3-5 sprint** (6-10 tuần) cho 1 backend + 1 frontend + 0.5 QA.

**Ưu:**
- One source of truth, tận dụng 100% RTR-MRP hiện tại (Sales, MRP, Quality, Finance).
- Không phí BOMIST license.
- Tài sản là của mình, thuộc data model của mình, extend sau dễ.

**Nhược:**
- Thời gian đầu tư lớn hơn A.
- Nexar API có rate limit (cần cache ở Redis — đã có sẵn).

### 4.3 Phương án C: BUILD (thay thế toàn bộ BOMIST)

Phương án này **trùng 95% với Integrate (B)**. Khác biệt duy nhất: "Build" nghĩa là tuyên bố chính thức RTR-MRP là đủ cho use case BOMIST → không còn chạy BOMIST song song. Có thể mất thêm 1 sprint cho onboarding tooling (import toàn bộ workspace `.bomist_dump` bao gồm cả attachments).

**Đây là khuyến nghị.** Chỉ cần thực thi B và truyền thông rõ với đội sản xuất rằng "BOMIST không còn cần thiết từ sprint N+5".

---

## 5. Ma trận quyết định

| Tiêu chí | A — Connect | B — Integrate | C — Build |
|---|---|---|---|
| Effort (sprint) | 1 | 3-5 | 4-6 |
| Chi phí license/năm | $720-$2,700 | $0 | $0 |
| Single source of truth | Không | Có | Có |
| Tận dụng MRP/Quality/Finance | Một phần | Toàn bộ | Toàn bộ |
| Real-time Octopart | Qua BOMIST | Trực tiếp | Trực tiếp |
| Rủi ro vendor (BOMIST EOL, breaking change) | Cao | Không | Không |
| Phụ thuộc desktop của user | Có | Không | Không |
| Phù hợp SaaS multi-tenant | **Không** | Có | Có |
| Kiểm soát UX | Thấp | Cao | Cao |

---

## 6. Khuyến nghị

**Chọn phương án B (Integrate) với định hướng C (Build-Replace)**, thực thi theo roadmap:

1. **Sprint 1-2 (MVP)**: Parametric attribute + Octopart adapter. Sau sprint 2 đã có thể demo cho khách điện tử "tìm tụ 10µF 25V 0603" và "kéo giá Mouser/Digikey về RTR-MRP".
2. **Sprint 3-4**: Storage hierarchy + reel counter + BOMIST CSV importer preset.
3. **Sprint 5**: Swagger/OpenAPI + E2E. Tuyên bố "ready to replace BOMIST" cho nội bộ.
4. **Sprint 6+**: Onboard khách hàng điện tử đầu tiên, thu feedback, iterate.

**Lý do chọn B/C thay vì A:**
- BOMIST là desktop app, kiến trúc không đồng thuận với SaaS Next.js.
- RTR-MRP đã có 85-90% model cần thiết — gap còn lại nhỏ hơn so với effort duy trì 2 hệ thống.
- RTR-MRP có Sales/Production/Quality/Finance mà BOMIST không có — nếu khách điện tử chấp nhận RTR-MRP, họ được một hệ thống toàn diện chứ không phải "chỉ kho linh kiện".

**Rủi ro cần quản lý:**
- Nexar API rate limit → bắt buộc cache Redis + TTL hợp lý (24-48h cho giá).
- Data migration từ khách đang dùng BOMIST → viết sẵn importer ngay trong sprint 5.
- Parametric schema có thể bùng nổ nếu không quản category rõ ràng → cần AttributeDefinition catalog curate từ đầu.

---

## 7. Next actions đề xuất

1. Xác nhận hướng B với team engineering + sales điện tử (nếu có khách ứng viên).
2. Đăng ký Nexar developer account (free) để lấy API key, test quota.
3. Tạo feature branch `feat/component-library-electronics` và seed 20 AttributeDefinition điện tử (resistor, capacitor, inductor, diode, transistor, MCU, MOSFET, crystal, connector, LED...).
4. Thiết kế UI filter "Parametric search" — reference lại UX của BOMIST / Octopart để rút kinh nghiệm, không copy.
5. Viết ADR (Architecture Decision Record) cho quyết định này vào `docs/`.

---

## Nguồn tham khảo

- [BOMIST — Homepage](https://bomist.com/)
- [BOMIST — Pricing](https://bomist.com/pricing)
- [BOMIST — API docs](https://docs.bomist.com/features/api)
- [BOMIST — Parts reference](https://docs.bomist.com/reference/parts)
- [BOMIST — Octopart integration](https://bomist.com/product/octopart-integration)
- [BOMIST — Import/Export guide](https://bomist.com/learn/import-and-export/)
- [BOMIST — Import parts guide](https://docs.bomist.com/guides/how-to-import-parts)
- [BOMIST GitHub (bomist-scripts)](https://github.com/BOMIST)
- [BOMIST 2026 pricing — GetApp](https://www.getapp.com/all-software/a/bomist/)

Codebase evidence: `prisma/schema.prisma`, `src/app/api/parts/route.ts`, `src/app/api/import/*`, `.env.example` — repo `rtr-mrp-pr` commit hiện tại.
