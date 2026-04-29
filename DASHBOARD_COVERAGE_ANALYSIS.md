# DASHBOARD.xlsx vs RTR-MRP — phân tích bao phủ

> File `DASHBOARD.xlsx` là hệ thống **phòng R&D đang dùng** để quản lý linh kiện, BOM prototype, serial mẫu thử trên Google Sheets. Nó là **một lớp trong toàn bộ vận hành** — không phải toàn bộ vận hành. RTR-MRP được thiết kế như một "ERP thu nhỏ" bao phủ cả R&D, Sản xuất, Bán hàng, Mua hàng, Chất lượng.
>
> Báo cáo này:
> (1) Phân tích cấu trúc file R&D, (2) Ánh xạ vào RTR-MRP, (3) Chấm bao phủ R&D, (4) Định vị phần RTR-MRP có mà R&D không có — đúng hay sai là tùy có phục vụ sản xuất hay không.
>
> Thời điểm audit: 23/04/2026. Data range: 24/03 → 23/04/2026.

---

## 1. Cấu trúc file — 17 sheets, 6,500 record thực

File là export Google Sheets (dấu hiệu: 6,298 formula dạng `__xludf.DUMMYFUNCTION` — wrapper của Google Sheets dynamic array functions như `ARRAYFORMULA`, `FILTER`, `UNIQUE`).

### Ma trận sheet

| # | Sheet | Data rows thực | Formula | Vai trò |
|---|---|---|---|---|
| 1 | **DASHBOARD** | 894 | 2,712 | Trang chủ: COUNTA/SUM tổng + search linh kiện + explode BOM dự án |
| 2 | **DANH_MUC** | 1,049 | 0 | **Master data** — catalog linh kiện |
| 3 | **DATA_ALL** | 1,311 | 0 | View flatten master |
| 4 | **DATA** | 13 | 13 | Product list (`UNIQUE(FILTER(...))`) |
| 5 | **DU_AN** | 1,853 | 0 | **BOM theo project** (72 projects) |
| 6 | **BOM_CHUAN** | 30 | 0 | **BOM sản phẩm final** (3 EBOX: IO1, DTC, LPR) |
| 7 | **NHAP_KHO** | 1,125 | 0 | **Log nhập kho** |
| 8 | **XUAT_KHO** | 340 | 0 | **Log xuất kho** |
| 9 | **TON_KHO** | 1,022 | 1,022 | **Tồn kho** (ARRAYFORMULA: Nhập−Xuất) |
| 10 | **LOW_STOCK** | 79 | 317 | Auto-filter (`FILTER(TON_KHO < min)`) |
| 11 | **MUA_HANG** | 405 | 3,205 | **Gợi ý mua** auto từ LOW_STOCK |
| 12 | **SERIAL_MASTER** | 280 | 0 | **Serial active** (TỒN/ĐÃ XUẤT) |
| 13 | **SERIAL_GEN** | 52 | 53 | **Generator** (prefix + version + counter per product) |
| 14 | **XUAT_LOG** | 8 | 0 | Log xuất serial (rất ít dùng) |
| 15 | **SERIAL_LINK** | 0 | 0 | Parent-Child (chưa dùng) |
| 16 | **LAP_RAP_LOG** | 0 | 0 | Grid lắp ráp (chưa dùng) |
| 17 | **Câu trả lời biểu mẫu 2** | 7 | 0 | **Google Form responses** (nhập/xuất) |

### Thống kê dữ liệu

**Master catalog (DANH_MUC):** 1,049 parts · 138 categories · 3 suppliers · 3 locations

- Categories top: RES (211), CAP (179), IC (133), PCB (68), DIODE (27), MOSFET (23), CONN (17), LED (15)
- 959/1,049 parts từ Yageo · location chỉ có K1/K2/K3
- Coverage: min_stock 1,047/1,049 (99.8%) · price 3/1,049 (0.3% — giá chưa nhập) · description 970/1,049 (92%)

**Project BOM (DU_AN):** 72 projects · 1,853 BOM lines

- Project lớn nhất: HeraLink Hybrid 2.1 (163 parts), Heralink Main Tablet v1.0.1 (148), Hera Sight2 ENC v1.1 (112)
- Các Hera board: IO1/IO2, RTK, Core, PD, BMS, Comm, Jetson, Speaker-Light, Sub, Backup Power…

**Stock (TON_KHO):** 1,022 SKU active — 343 zero · 25 <10 · 223 10–100 · 431 >100

**Transactions (30 ngày gần nhất, 24/03–23/04/2026):**
- Nhập: 1,125 record (959 "Nhập lại kho củ" = migration data + 166 nhập thật)
- Xuất: 340 record · 27 pattern "Use For" khác nhau · top: "Q.Hải, HERASIGHT" (107), "C.Nguyên, Gimbal V4.2" (56), "Duy Quang, DUALSIGHT" (30)

**Serial (SERIAL_MASTER):** 280 active · 273 TỒN / 7 ĐÃ XUẤT · 237 NHẬP / 43 GIA CÔNG · 10 product có serial
- Top: Drone Tag (55), Backup Power Adapter (30), Hera core (29), Hera PD (28), Hera IO1 (26)

**Serial generator (SERIAL_GEN):** 52 product templates · prefix 3–5 ký tự + version + counter
- Ví dụ: `IO1-V15-081025-041` = IO1 (prefix) + V15 (version) + 08/10/25 (date) + 041 (counter)

---

## 2. Suy luận luồng vận hành

Từ cấu trúc sheet + formula chain, có thể khôi phục 9 workflow thực tế:

```
┌── Google Form ─────────────┐
│  Nhập/Xuất từ điện thoại   │
└──────┬─────────────────────┘
       ▼
   NHAP_KHO ──┐
              │
   XUAT_KHO ──┼──► TON_KHO (ARRAYFORMULA) ──► LOW_STOCK ──► MUA_HANG
              │        (Nhập − Xuất)       (<min stock)    (suggest supplier)
              │
   DANH_MUC ──┘── (min_stock, supplier)
        │
        └──► DASHBOARD (search box) ──► explode DU_AN/BOM_CHUAN
                                         │
                         (LINH KIỆN DỰ ÁN: need vs stock → THIẾU)

   SERIAL_GEN ──► SERIAL_MASTER (TỒN/ĐÃ XUẤT) ──► XUAT_LOG
   (counter)       (per product)
```

**9 luồng công việc chính:**

1. **Tra cứu linh kiện** — DASHBOARD search box → ra Part Number, Part Name, Nhập, Xuất, tồn
2. **Explode BOM dự án** — chọn project + nhập "số lượng theo bộ" → liệt kê linh kiện cần + stock + status THIẾU/ĐỦ
3. **Nhập kho** — công nhân điền Google Form → append NHAP_KHO → TON_KHO tự tăng
4. **Xuất kho** — công nhân điền form với "Use For" (tên người + dự án) → append XUAT_KHO → TON_KHO tự giảm
5. **Cảnh báo tồn thấp** — LOW_STOCK auto-filter khi Tồn < Min
6. **Gợi ý đơn mua** — MUA_HANG auto-tạo từ LOW_STOCK × supplier
7. **Sinh serial** — SERIAL_GEN counter per product → công thức `PREFIX-VER-DDMMYY-NNN`
8. **Theo dõi serial** — SERIAL_MASTER với status (TỒN/ĐÃ XUẤT), nguồn (NHẬP/GIA CÔNG)
9. **Xuất serial** — XUAT_LOG ghi lại serial nào đi đâu (batch)

**2 luồng thiết kế nhưng CHƯA DÙNG:**

- **SERIAL_LINK** (parent-child) — genealogy: EBOX_IO1 serial ↔ Hera IO1 serial ↔ các linh kiện con. 0 record.
- **LAP_RAP_LOG** (grid partnumber × product) — assembly log. 0 record.

---

## 3. Ánh xạ vào RTR-MRP

Tôi so chiếu từng sheet với Prisma schema của RTR-MRP (179 model, 6,781 dòng):

| Workflow hiện tại (Google Sheets) | Data thực | RTR-MRP equivalent | Độ phủ |
|---|---|---|---|
| 1. Catalog linh kiện (DANH_MUC) | 1,049 parts, 138 category | `Part` + `PartCategory` + `PartAlternate` + `PartCertification` | **✓ Đầy đủ hơn** |
| 2. Project BOM (DU_AN) | 72 project × 1,853 line | `BomHeader` + `BomLine` + explode API | **✓ OK** |
| 3. Final product BOM (BOM_CHUAN) | 30 line, 3 EBOX | `BomHeader` multi-level | **✓ OK** |
| 4. Nhập kho (NHAP_KHO + form) | 1,125 record | `GoodsReceiptNote` + `InventoryTransaction` | **~ Có nhưng phức tạp hơn** (đòi PO link) |
| 5. Xuất kho (XUAT_KHO + form) | 340 record | `InventoryTransaction` type=ISSUE + `Shipment` | **~ Có nhưng phức tạp hơn** |
| 6. Tồn kho realtime (TON_KHO) | 1,022 SKU | `Inventory` + `StockOnHand` view | **✓ OK** |
| 7. Low stock alert (LOW_STOCK) | 79 item | `reorderPoint` field + alerts | **✓ OK** |
| 8. Purchase suggestion (MUA_HANG) | 405 line | `MrpRun` → `PurchaseRequest` (9-state) | **✓ Mạnh hơn** |
| 9. Serial generator (SERIAL_GEN) | 52 template | — | **✗ THIẾU** |
| 10. Serial master (SERIAL_MASTER) | 280 serial | `NCR.serialNumbers Json?` only | **✗ YẾU** |
| 11. Serial out log (XUAT_LOG) | 8 record | `Shipment.lotNumber` text | **✗ YẾU** |
| 12. Parent-child genealogy (SERIAL_LINK) | 0 record | — | **✗ THIẾU** |
| 13. Assembly log (LAP_RAP_LOG) | 0 record | `WorkOrder` + `Operation` | **✓ OK** |
| 14. Google Form mobile input | 7 response | `/api/v2/mobile/scan` + Excel import | **~ Có nhưng UX khác** |

**Điểm số bao phủ:**
- **Đầy đủ:** 8/14 workflow (57%)
- **Có nhưng yếu hoặc UX khác:** 3/14 (21%)
- **Thiếu hoàn toàn:** 3/14 (22%)

**→ Độ bao phủ functional: 78% · Độ bao phủ UX-tương đương: 57%**

---

## 4. RTR-MRP thiếu gì (so với thực tế đang dùng)

Bốn khoảng trống lớn nhất, xếp theo mức ảnh hưởng migration:

### Khoảng trống 1 — Serial Number là first-class entity

**Hiện trạng RTR-MRP:** `NCR.serialNumbers Json?` — chỉ là JSON blob trong model NCR.
**Thực tế cần:** 280 serial active × 52 product template, với đủ trường:
- `serial` (unique, format `PREFIX-VER-DDMMYY-NNN`)
- `product` (FK Part)
- `status` (TỒN / ĐÃ XUẤT / LỖI / BẢO HÀNH)
- `source` (NHẬP / GIA CÔNG / BẢO HÀNH / TÁI CHẾ)
- `user`, `createdAt`
- `parentSerial` (genealogy) — bắt buộc cho electronic traceability

**Ảnh hưởng:** không migrate được 280 serial hiện có; không dùng được `/api/quality/traceability/[lotNumber]` vì không có lot thật.

### Khoảng trống 2 — Serial Generator với counter

**Hiện trạng RTR-MRP:** không có model/endpoint sinh serial theo template.
**Thực tế cần:** 52 product template có `prefix + version + counter` per product. Mỗi lần gia công 1 sản phẩm mới, counter++.

**Ảnh hưởng:** nếu công nhân đang quen `IO1-V15-081025-041` thì hệ thống mới phải sinh đúng format; nếu không, họ sẽ viết tay → dữ liệu không đồng bộ.

### Khoảng trống 3 — Parent-child serial linking

**Hiện trạng:** 0 trong cả hai.
**Thực tế:** SERIAL_LINK đã được thiết kế trong Google Sheets nhưng chưa dùng. Đây là lỗ hổng của *cả* hệ thực tế lẫn RTR-MRP. Khi electronic traceability thành yêu cầu (giao hàng cho khách Enterprise), đây là must-have.

### Khoảng trống 4 — Google Form UX

**Hiện trạng RTR-MRP:** có `/mobile/scan` + form web đầy đủ field (20+).
**Thực tế công nhân dùng:** Google Form 5 field (Date / Type / Part / Qty / Note) — submit trong 15 giây trên điện thoại.

**Ảnh hưởng:** nếu RTR-MRP yêu cầu 20 field thì công nhân sẽ quay lại Google Sheets. Cần 1 form siêu rút gọn cho use case "nhập/xuất nhanh".

---

## 5. Phần RTR-MRP có mà R&D không có — dành cho Sản xuất

File DASHBOARD.xlsx phản ánh nhu cầu của **phòng R&D**: lấy linh kiện → lắp prototype → sinh serial mẫu → test. Không có sales, không có khách hàng thật, không có kiểm định lô lớn, không có nhiều nhà máy, không có dây chuyền đo OEE. Đó là lý do những sheet đó rỗng — không phải RTR-MRP thừa, mà vì file này không phải nơi nghiệp vụ đó xảy ra.

Đối chiếu 179 model Prisma với 17 sheet R&D — các module sau **không có trong R&D nhưng cần cho Sản xuất**:

| Module RTR-MRP | Model | R&D có dùng? | Sản xuất cần? |
|---|---|---|---|
| Sales full stack | `Quotation`, `SalesOrder`, `SalesInvoice`, `Shipment` | Không | **Cần** — giao hàng cho khách |
| Customer master | `Customer` | "Use For" text | **Cần** — khách hàng thật có hợp đồng, điều khoản, tier |
| 3-Way Match | `PurchaseOrder` + `GoodsReceiptNote` + `Invoice` matching | Không (chỉ suggest) | **Cần** — đơn mua lớn, cần khớp invoice trước thanh toán |
| Quality NCR 9-state | `NCR` + `CAPA` + `CAPAAction` | Không | **Cần** — lô hàng lỗi, khiếu nại khách, CAPA theo ISO |
| Inspection | `InspectionPlan` + `Inspection` + `InspectionResult` | Không | **Cần** — IQC/IPQC/OQC cho lô sản xuất |
| MRP Run + Forecast | `MrpRun`, `DemandForecast`, AI | LOW_STOCK đủ (vol thấp) | **Cần** — lập kế hoạch theo SO + forecast |
| Multi-site + DRP | `Warehouse` hierarchy, `TransferOrder` | K1/K2/K3 cùng chỗ | **Cần** — kho R&D, kho SX, kho thành phẩm, chuyển liên kho |
| OEE / WorkCenter | `WorkCenter` + `OEE` | Không có dây chuyền | **Cần** — đo hiệu suất máy, xuất báo cáo sản lượng |
| Scrap/Rework | Model đầy đủ | Không | **Cần** — quản lý phế liệu, rework lô |
| Supplier scoring + portal | `SupplierScore`, `/supplier/orders` | 3 supplier, không score | **Cần** — đánh giá NCC theo OTIF, defect rate |
| Traceability lot text-search | `LotTransaction` | Dùng serial, không dùng lot | **Cần** — truy vết lô linh kiện thô vào thành phẩm |
| Analytics Dashboard phức tạp | `AnalyticsDashboard` + widget | DASHBOARD đơn giản | **Cần** — KPI sản xuất realtime cho quản lý |

**Kết luận:** 12 module này **không thừa**. Chúng nằm ngoài scope file DASHBOARD.xlsx vì file này là của R&D. Đánh giá đúng của các module đó phải đối chiếu với **bộ data sản xuất thật** — hiện tôi chưa có trong tay.

**Cái cần bổ sung thêm vào báo cáo maturity:** phòng sản xuất có file/hệ nào khác đang dùng không? Nếu có thì phân tích tiếp lớp đó để thấy RTR-MRP phủ Sản xuất tới đâu.

---

## 6. Volume migration

Nếu migrate từ Google Sheets → RTR-MRP, khối lượng nhẹ:

| Target Prisma model | Rows cần import | Độ khó |
|---|---|---|
| `Part` | 1,049 | Dễ — đã có Excel import |
| `PartCategory` | 138 | Dễ |
| `Supplier` | 3 | Trivial |
| `Warehouse` + `Location` | 1 + 3 | Trivial |
| `BomHeader` + `BomLine` | 72 + 1,853 | Trung bình — cần map project name → FG Part |
| `GoodsReceiptNote` | 1,125 | Trung bình — RTR-MRP đòi PO link, hiện tại không có |
| `InventoryTransaction` (issue) | 340 | Trung bình — cần map "Use For" → user/project |
| `WorkOrder` + Operation | 0 | — |
| `Serial` (**model mới cần thiết kế**) | 280 | **Cần thiết kế model trước** |
| `SerialGenTemplate` (**model mới**) | 52 | **Cần thiết kế model trước** |

**Tổng:** ~4,400 record có thể migrate ngay (80%) + 332 record (serial + template) cần model mới trước.

---

## 7. Đề xuất chiến lược — migrate theo lớp

File DASHBOARD.xlsx cho thấy **lớp R&D** của vận hành. RTR-MRP được thiết kế để phủ nhiều lớp hơn (Sản xuất, Bán hàng, Chất lượng, Mua hàng). Hai lớp đó chưa có data đối chiếu trong phạm vi tôi đang thấy, nhưng điều đó không đồng nghĩa RTR-MRP thừa — chỉ là scope của file này không bao trùm.

Đề xuất vì vậy đi theo **thứ tự migrate theo lớp**, không phải "cắt bớt module":

### Bước 1 — Lớp R&D (scope của file này)

Migrate trước vì có data đủ và người dùng đang hoạt động:

1. **Xây `Serial` + `SerialGenTemplate` + `SerialLink`** — blocker, phải làm trước, bất kể lớp nào đi sau.
2. Import 1,049 part, 138 category, 3 supplier, 72 project BOM, 1,853 BOM line vào Prisma.
3. Migrate 1,125 receipt + 340 issue + 280 serial.
4. **Thêm form siêu rút gọn** (5 field, mobile) thay thế Google Form cho công nhân R&D.
5. Deprecate Google Sheets cho lớp R&D.

Thời lượng ước: 2–3 sprint. Kết quả: R&D chạy 100% trên RTR-MRP, giữ UX nhanh, không mất serial history.

### Bước 2 — Audit lớp Sản xuất / Bán hàng / Chất lượng

Trước khi kết luận module nào nên bật/tắt, cần data thực của lớp đó:

- **Phòng sản xuất đang quản lý work order, OEE, scrap bằng gì?** Excel khác? Hệ thống riêng? Giấy?
- **Đang có khách hàng thật chưa?** Quotation/Sales Order/Invoice hiện chạy bằng gì?
- **NCR/CAPA đang ghi ở đâu?** ISO audit dùng tài liệu gì?
- **Kho nhiều site thật sự tồn tại không?** Nếu chỉ 1 kho R&D thì Multi-site đúng là chưa cần.

Chỉ khi có câu trả lời thì mới quyết định được module nào là moat, module nào có thể ẩn.

### Bước 3 — Quyết định định vị sản phẩm

Sau 2 bước trên mới chọn:

- **RTR-MRP là tool nội bộ** — giữ đúng scope thực tế RTR đang vận hành (cả R&D lẫn Sản xuất), ẩn phần nào không có nghiệp vụ tương ứng.
- **RTR-MRP là SaaS** — giữ toàn bộ module, tiếp tục lộ trình Sprint 26–31, sản phẩm hóa theo vertical điện tử.

Quyết định này **không nên dựa vào mỗi file R&D**. Nó là quyết định chiến lược cần input từ BOD.

**Điểm chung cho cả hai nhánh:** Serial management là blocker. Nên khởi động ngay trong Sprint 27 (đang định là "lấp schema chết"), **không phải** Sprint 29–31.

---

## 8. Tóm tắt số liệu

Phạm vi đối chiếu: chỉ **lớp R&D** (file DASHBOARD.xlsx). Các lớp khác (Sản xuất, Bán hàng, Chất lượng, Mua hàng) chưa có data trong phạm vi này.

| Chỉ số | Giá trị |
|---|---|
| Workflow R&D có data thực | 9 |
| Workflow R&D thiết kế nhưng chưa dùng | 2 (SERIAL_LINK, LAP_RAP_LOG) |
| RTR-MRP phủ đầy đủ lớp R&D | 8/14 (57%) |
| RTR-MRP có nhưng yếu/UX khác | 3/14 (21%) |
| RTR-MRP thiếu (chặn migration R&D) | 3/14 (22%) |
| Data rows active trong Google Sheets | ~6,500 |
| Part migration | 1,049 parts, 138 categories, 3 suppliers |
| BOM migration | 72 projects, 1,853 lines + 30 FG lines |
| Transaction history | 1,465 record (1 tháng) |
| Serial cần migrate | 280 active + 52 template |
| Module RTR-MRP ngoài scope R&D (phục vụ Sản xuất) | 12 module — **cần data lớp đó để đánh giá**, không phải "thừa" |
| Độ khó migration R&D | 80% dễ, 20% cần model mới trước |

**Kết luận một dòng:**
Ở lớp R&D, RTR-MRP phủ **78% chức năng thực tế** nhưng **thiếu Serial management** — chính là khoảng trống chặn migration. Các module khác (Sales, NCR, OEE, Multi-site…) phục vụ lớp Sản xuất, cần data sản xuất thật để đánh giá — chưa có trong file này, nên chưa kết luận được.
