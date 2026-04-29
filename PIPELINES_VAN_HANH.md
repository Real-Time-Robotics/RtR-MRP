# Pipeline vận hành RTR-MRP

Tài liệu này mô tả các chuỗi thao tác thực tế đã được thiết kế trong hệ thống. Mỗi pipeline có trạng thái cụ thể, người thực hiện, điều kiện chuyển bước. Các trạng thái viết trong ngoặc là giá trị thật trong database — người vận hành sẽ thấy đúng từ đó trên giao diện.

---

## Pipeline 1. Báo giá → Đơn bán

Ai dùng: sales.

Điều kiện mở: khách hỏi giá.

1. Tạo Quotation (status = draft). Chọn khách, thêm dòng sản phẩm, đặt hạn hiệu lực (validUntil).
2. Gửi khách (status → sent). Ghi nhận ngày gửi (sentAt).
3. Khách trả lời:
   - Đồng ý → status → accepted, ghi acceptedAt.
   - Từ chối → status → rejected. Pipeline kết thúc, lưu lý do.
   - Hết hạn không trả lời → status → expired.
4. Bấm Convert (chỉ khi accepted). Hệ thống sinh SalesOrder mới, gán salesOrderId vào Quotation, status Quotation → converted.

Đầu ra: một Sales Order ở trạng thái draft. Đi tiếp Pipeline 2.

---

## Pipeline 2. Đơn bán → Kiểm tồn → Giao hàng → Hóa đơn

Ai dùng: sales, kho, kế toán.

1. Sales Order (status = draft). Kiểm tra lại thông tin, bấm Confirm (status → confirmed).
2. Hệ thống kiểm tồn thành phẩm:
   - Đủ → sẵn sàng Shipment.
   - Thiếu → cần sản xuất (đi Pipeline 6) hoặc mua (đi Pipeline 3 → 4).
3. Khi đủ hàng ở kho FINISHED_GOODS: tạo Shipment, chọn dòng SO, số lượng, phương tiện. Xuất hàng → tồn kho tự trừ, SO status → shipped (hoặc partially_shipped nếu chỉ đi một phần).
4. Kế toán tạo Sales Invoice từ Shipment. Khách thanh toán → ghi Sales Payment. Khi đủ số tiền → SO status → closed.

Lưu ý: nếu backorder (giao thiếu), phần còn lại giữ ở trạng thái open cho đến khi có hàng bù.

---

## Pipeline 3. MRP → Gợi ý → Yêu cầu mua

Ai dùng: planner.

Điều kiện mở: chạy định kỳ (hàng ngày hoặc khi có SO lớn).

1. Vào /mrp, bấm Run. Hệ thống đọc SO chưa giao, BOM, tồn kho, lead time.
2. Output: danh sách MrpSuggestion (status = pending). Mỗi dòng nói rõ: mua part nào, bao nhiêu, trước ngày nào, supplier gợi ý, giá ước tính.
3. Planner rà từng gợi ý:
   - Đồng ý → bấm Approve trên suggestion (status → approved).
   - Không đồng ý → Reject + ghi lý do.
   - Gộp nhiều gợi ý cùng supplier thành một Purchase Request (xem Pipeline 4 bước 1).
4. Khi Approve: hệ thống có thể tự tạo PlannedOrder (orderType = PURCHASE). PlannedOrder là kế hoạch mềm — cần bấm Firm mới thành cam kết (isFirm = true, lưu firmedBy, firmedAt).

Đầu ra: các PlannedOrder đã firm sẵn sàng chuyển thành PR.

---

## Pipeline 4. Yêu cầu mua (PR) — từ nháp đến đơn mua

Ai dùng: planner hoặc mua hàng tạo; cấp trưởng duyệt.

Trạng thái PR (đọc từ enum PRStatus): DRAFT, PENDING, APPROVED, REJECTED, REVISED, CANCELLED, PO_CREATED, PARTIALLY_ORDERED, COMPLETED.

1. Tạo PR (status = DRAFT). Thêm các dòng: part, quantity, supplier đề nghị, giá dự kiến, ngày cần. Có thể gom nhiều part từ nhiều MRP Suggestion vào cùng một PR nếu mua cùng supplier.
2. Đính kèm file nếu có (PRAttachment), ghi chú (PRComment).
3. Bấm Submit (status → PENDING). Hệ thống gửi thông báo đến người duyệt theo cấu hình.
4. Người duyệt mở PR, chọn một trong ba:
   - Approve (status → APPROVED): hệ thống ghi approvedBy, approvedAt. Mọi thay đổi ghi vào PRHistory.
   - Reject (status → REJECTED): ghi rejectedBy, rejectionReason. Người tạo nhận thông báo.
   - Yêu cầu sửa: người tạo tạo bản Revise (tăng revisionNumber, parentPRId trỏ về PR cũ, status → REVISED) rồi Submit lại.
5. Khi APPROVED: bấm Convert → hệ thống gom các dòng cùng supplier thành một hoặc nhiều Purchase Order. PR status → PO_CREATED.
6. Nếu chỉ một phần dòng đã được lên PO (do chia supplier khác nhau): status → PARTIALLY_ORDERED.
7. Khi tất cả dòng đã nhận đủ hàng (qua GRN của PO tương ứng): status → COMPLETED.

Track từng dòng riêng qua PRLineStatus: PENDING, APPROVED, REJECTED, ORDERED, PARTIALLY_ORDERED, RECEIVED, CANCELLED.

---

## Pipeline 5. Đơn mua (PO) → Nhận hàng → Đối chiếu → Thanh toán

Ai dùng: mua hàng, kho, QC, kế toán.

1. PO sinh ra từ PR Convert (Pipeline 4 bước 5) hoặc tạo tay trong /purchasing. Status = draft.
2. Mua hàng rà lại điều khoản, bấm Submit → status → submitted.
3. Cấp có thẩm quyền Approve (approvedById, approvedAt được ghi). status → approved.
4. Gửi PO cho supplier (có thể xuất PDF). status → sent.
5. Supplier giao đến: kho mở PO, tạo GoodsReceiptNote (GRN status = draft).
   - Nhập số lượng thực nhận từng dòng (GRNItem).
   - Ghi lô (lotNumber), hạn sử dụng nếu có.
   - Lưu GRN (status → completed). Hệ thống đưa hàng vào kho RECEIVING.
6. Nếu part có inspection plan: tạo Inspection type = RECEIVING tự động (xem Pipeline 9). Trong khi chờ kiểm, hàng nằm ở RECEIVING hoặc QUARANTINE.
7. Kiểm PASS: hàng chuyển sang kho MAIN. Kiểm FAIL: tạo NCR (Pipeline 10), hàng giữ ở HOLD.
8. Supplier gửi invoice. Kế toán nhập PurchaseInvoice. Hệ thống tạo ThreeWayMatch:
   - So sánh số lượng: PO (đã đặt) ↔ GRN (đã nhận) ↔ Invoice (được tính tiền).
   - Khớp trong dung sai → status → matched → approved → chuyển sang thanh toán.
   - Lệch lớn → status → mismatch_pending_review. Kế toán giải trình, sửa hoặc reject invoice.
9. Khi được Approve: ghi PurchasePayment. PO status → closed khi toàn bộ dòng đã nhận và đã trả.

---

## Pipeline 6. Lệnh sản xuất (Work Order)

Ai dùng: planner tạo; tổ trưởng giám sát; công nhân thao tác.

Trạng thái WO (qua trường status chuỗi): draft, released, in_progress, completed, closed, cancelled, on_hold.

1. Tạo WO từ một trong hai nguồn:
   - Từ Sales Order: mở SO, chọn dòng, Create Work Order — hệ thống tự điền productId, quantity, dueDate, salesOrderId, salesOrderLine.
   - Thủ công trong /production.
2. WO ở status draft. Planner kiểm plannedStart, plannedEnd, workCenter, assignedTo.
3. Bấm Release (status → released): hệ thống auto-allocate vật tư theo BOM — tạo MaterialAllocation cho từng BomLine.
4. Kho in Pick List. Đi lấy linh kiện từ MAIN, chuyển sang WIP (xem Pipeline 8 — xuất cho sản xuất).
5. Công nhân bắt đầu: ghi actualStart, status → in_progress.
6. Thực hiện theo Routing:
   - Mỗi công đoạn có RoutingOperation → WorkOrderOperation.
   - Báo cáo qua /production/shop-floor: thời gian, completedQty, scrapQty, LaborEntry.
   - Downtime (máy hỏng, chờ vật tư) ghi vào DowntimeRecord.
7. Xong cuối cùng: tạo ProductionReceipt — nhập completedQty vào kho FINISHED_GOODS, scrapQty xử lý riêng (xem Pipeline 11). status → completed.
8. Kế toán chốt chi phí thực tế (WorkOrderCost, CostVariance so với chuẩn). status → closed.

Nếu dừng giữa chừng: on_hold kèm lý do. Nếu huỷ: cancelled, vật tư đã cấp phải trả về MAIN qua Adjust.

---

## Pipeline 7. Tạo và quản lý BOM

Ai dùng: kỹ thuật hoặc planner.

1. Vào /bom, New BOM. Chọn sản phẩm (Part có category = FG). Đặt revision = A, ngày hiệu lực (effectivityDate).
2. Thêm từng BomLine: part con, quantity, unit, scrapRate, referenceDesignator (R1, U3 cho điện tử), findNumber, notes. bomType thường là MANUFACTURING.
3. Với cụm con tạo BOM riêng; BomLine trỏ về part của cụm con. Hệ thống tự explode đa cấp khi chạy MRP.
4. Đánh dấu phantom = true cho cụm ảo (không tồn kho, chỉ tồn tại trong cấu trúc) — ví dụ kit tạm.
5. Đánh dấu Alternate: các BomLine cùng alternateGroup, một dòng isPrimary = true, các dòng khác là phương án thay thế.
6. Bấm Activate → BOM chuyển sang trạng thái hoạt động, tham gia các lần MRP tiếp theo.

Sửa BOM đang chạy: KHÔNG sửa trực tiếp. Tạo revision mới (B, C) qua Clone → sửa → đặt effectivityDate tương lai. BOM cũ tự phase-out đúng ngày.

---

## Pipeline 8. Kho — nhập, xuất, chuyển, kiểm kê

Ai dùng: nhân viên kho.

### 8.1 Xuất kho cho sản xuất (Issue)

Trigger: WO đã Release, có Pick List.

1. Kho mở Pick List, đi lấy hàng theo PickListLine (mỗi dòng chỉ rõ part, lô, location, số lượng).
2. Quét barcode từng lô (ScanLog ghi lại).
3. Xác nhận Issue: hệ thống trừ tồn MAIN, cộng tồn WIP.

### 8.2 Chuyển giữa các kho (Transfer Order)

1. Tạo TransferOrder: kho nguồn → kho đích, danh sách part + số lượng.
2. Kho nguồn bấm Ship → trừ tồn nguồn, hàng đang in-transit.
3. Kho đích bấm Receive → cộng tồn đích. Đóng transfer.

### 8.3 Kiểm kê định kỳ (Cycle Count)

1. Vào /inventory/cycle-count, tạo phiên kiểm. Hệ thống gợi ý part cần kiểm (ưu tiên ABC class A).
2. Kho đi đếm, nhập số thực tế.
3. Hệ thống so với tồn sổ sách:
   - Bằng → phiên đóng.
   - Lệch → tự tạo Adjust (điều chỉnh tồn), ghi lý do, cần duyệt nếu giá trị lệch vượt ngưỡng.

### 8.4 Điều chỉnh tồn (Adjust)

Dùng khi phát hiện lệch không qua cycle count (ví dụ tìm thấy hàng sau khi đã ghi mất). Tạo Adjust, ghi rõ lý do, đính kèm chứng từ. Mọi Adjust có duyệt và ghi AuditLog.

### 8.5 Cảnh báo hết hạn

Chạy mỗi sáng. /inventory/expiry-alerts liệt kê lô đã hết hạn và sắp hết hạn (theo ngưỡng mỗi part). Xử lý: ưu tiên dùng trước, hoặc Scrap Disposal.

---

## Pipeline 9. Kiểm tra chất lượng (Inspection)

Ai dùng: QC.

Loại kiểm: RECEIVING (kiểm hàng nhập), IN_PROCESS (kiểm trong sản xuất), FINAL (kiểm thành phẩm trước giao).

1. Inspection sinh ra từ trigger:
   - Tạo GRN → tự sinh Inspection type = RECEIVING (nếu part có inspection plan).
   - Work Order hoàn thành công đoạn kiểm → Inspection type = IN_PROCESS.
   - Trước khi ship → Inspection type = FINAL.
2. status = pending ban đầu.
3. QC vào /quality/inspections, bấm Start → status → in_progress. Hệ thống hiện InspectionCharacteristic cần đo.
4. Nhập kết quả từng đặc tính (InspectionResult): giá trị đo, pass/fail, ghi chú, ảnh.
5. Hoàn tất: status → completed. Trường result tự tính:
   - PASS: toàn bộ đặc tính trong dung sai → hàng sang MAIN hoặc FINISHED_GOODS.
   - FAIL: có đặc tính ngoài dung sai → sinh NCR tự động (Pipeline 10), hàng chuyển HOLD.
   - CONDITIONAL: qua với concession → cần phê duyệt riêng.
6. Sinh Certificate of Conformance nếu yêu cầu (COC).

On hold: khi dừng để chờ thêm mẫu, chờ xác nhận → status → on_hold.

---

## Pipeline 10. NCR → CAPA

Ai dùng: QC, trưởng chất lượng, phòng ban liên quan.

Trạng thái NCR: open, under_review, pending_disposition, disposition_approved, in_rework, pending_verification, completed, closed, voided.

1. NCR sinh ra khi:
   - Inspection FAIL → tự tạo NCR, source = RECEIVING/IN_PROCESS/FINAL.
   - Khách hàng khiếu nại → QC tạo NCR, source = CUSTOMER.
   - Audit nội bộ phát hiện → source = AUDIT.
   - status ban đầu = open, quantityAffected, defectCode, lot/serial được điền.
2. Trưởng QC review (status → under_review). Gán responsible owner.
3. Đề xuất disposition (status → pending_disposition): trả lại supplier (return), làm lại (rework), loại bỏ (scrap), dùng với nhượng bộ (use-as-is với concession).
4. Cấp duyệt disposition (status → disposition_approved).
5. Thực thi disposition:
   - Rework → status → in_rework → khi xong chuyển pending_verification.
   - Return/Scrap → xử lý hàng rồi sang pending_verification.
6. Verification (status → completed): QC xác nhận đã xử lý đúng, lô đã được cập nhật.
7. Đóng NCR (status → closed): ghi hồ sơ cuối cùng.
8. Nếu NCR bị tạo nhầm hoặc trùng → voided.

Khi NCR nghiêm trọng hoặc lặp lại: tạo CAPA từ NCR. CAPA có các action (CAPAAction) giao cho từng người, deadline, verification. Đóng CAPA chỉ khi nguyên nhân gốc đã được khắc phục và chứng minh bằng dữ liệu.

---

## Pipeline 11. Scrap — huỷ hàng lỗi

Ai dùng: kho, kế toán.

1. Khi có hàng cần huỷ (từ NCR, từ scrapQty của WO, hàng hết hạn): tạo ScrapDisposal. Ghi part, lô, số lượng, lý do, giá trị.
2. Cấp có thẩm quyền duyệt (giá trị lớn cần cấp cao hơn).
3. Duyệt xong: trừ tồn, ghi chi phí vào sổ (JournalEntry). Lưu ảnh hoặc biên bản huỷ.

---

## Pipeline 12. Gom đơn mua (Consolidation)

Thực tế ít khi có chỉ một PR → một PO. Thường gom.

Hai cách gom:

1. Gom theo supplier trong một đợt: khi Convert nhiều PR đã Approve của cùng supplier, chọn "Consolidate" — hệ thống tạo một PO chung, các PR cùng trỏ về PO đó với status → PARTIALLY_ORDERED hoặc PO_CREATED.
2. Gom theo chu kỳ (weekly batch): planner cuối tuần mở toàn bộ PR APPROVED chưa Convert, group theo supplier, chạy Convert hàng loạt. Mỗi supplier một PO.

Lợi ích: tăng số lượng mỗi PO → chạm price break cao hơn → giảm giá. Hệ thống tự gợi ý bậc giá tối ưu theo priceBreakQty của part.

Ràng buộc: chỉ gom được các PR có cùng đồng tiền, cùng điều kiện giao hàng. PR khác điều khoản phải tách PO.

---

## Pipeline 13. Truy xuất (Traceability)

Ai dùng: QC, kho, sales khi khách khiếu nại.

Đầu vào: một lô nghi ngờ (lotNumber) hoặc một serial.

1. Vào /quality/traceability, tra mã lô.
2. Hệ thống trả về cây quan hệ:
   - Lô đến từ supplier nào (GRN nào, PO nào).
   - Đã được cấp phát cho WO nào.
   - WO đó sinh ra lô thành phẩm nào.
   - Lô thành phẩm đã giao cho Shipment nào → khách nào.
3. Nếu cần recall: export danh sách, gửi thông báo tới khách liên quan, tạo NCR chính thức.

Dữ liệu này có được vì mọi chuyển động tồn đều ghi LotTransaction.

---

## Pipeline 14. Approval — các luồng phê duyệt dùng chung

Hệ thống có một module Workflow chung cho các việc cần duyệt (PR, WO scrap, NCR disposition, Adjust giá trị cao, PO giá trị lớn).

1. Khi tới bước cần duyệt: hệ thống tạo WorkflowInstance dựa trên WorkflowDefinition đã cấu hình (ví dụ "PR trên 50 triệu cần Giám đốc").
2. Gửi notification cho người duyệt.
3. Người duyệt mở /approvals hoặc vào bản ghi gốc, bấm Approve/Reject (tạo WorkflowApproval).
4. Nếu workflow nhiều bước: sang WorkflowStep kế tiếp. Mọi bước ghi WorkflowHistory.
5. Cuối cùng: kết quả duyệt gắn về đối tượng gốc (PR, WO, Adjust…).

Cấu hình workflow trong /settings. Đổi workflow không ảnh hưởng các instance đang chạy.

---

## Pipeline 15. Import dữ liệu hàng loạt

Ai dùng: admin hoặc user có quyền.

1. Vào /import, chọn loại (parts, BOM, inventory, customers, suppliers). Upload CSV/Excel.
2. Analyze: hệ thống đọc header, so với schema. Output:
   - Bảng mapping (cột file ↔ field database).
   - Cảnh báo: dòng thiếu field bắt buộc, dữ liệu sai kiểu, trùng khoá.
3. Chỉnh mapping, lưu thành ImportMapping (dùng lại lần sau).
4. Execute: hệ thống chạy import trong ImportJob (async). Từng dòng lưu trong ImportRow với kết quả success/failed.
5. Xem kết quả trong /import/history. Thất bại: export file error ra, sửa, import lại phần còn lại.
6. Nếu cần gỡ: Rollback toàn bộ batch — hệ thống xoá mọi bản ghi do batch này tạo.

---

## Sơ đồ liên kết các pipeline

Theo trình tự thời gian một đơn hàng điển hình:

P1 (Báo giá) → P2 (Đơn bán, có thể rẽ nhánh) → nếu thiếu hàng: P3 (MRP) → P4 (PR) → P5 (PO → GRN → Inspection) → P9 (kiểm) → nếu FAIL: P10 (NCR) → nếu OK: về lại P2 (đủ hàng, ship).

Nếu thiếu hàng do sản xuất: P2 → P6 (Work Order) → P8 (xuất vật tư) → P9 (kiểm thành phẩm) → P2 (ship).

Pipeline 7 (BOM), 11 (Scrap), 12 (Gom mua), 13 (Truy xuất), 14 (Approval), 15 (Import) chạy song song, được gọi khi cần.

Người vận hành quen với 15 pipeline này là làm chủ hệ thống. Các tính năng còn lại (AI Insights, Analytics, Compliance, Audit) đều là công cụ hỗ trợ quan sát, không phá vỡ các pipeline trên.
