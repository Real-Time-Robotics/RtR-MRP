# Sổ tay vận hành RTR-MRP

Dành cho người mới chưa dùng MRP bao giờ. Đọc hết mất 20 phút. Làm theo thứ tự các mục bên dưới là vận hành được một chu trình đầy đủ.

---

## 1. Hiểu hệ thống trong 1 phút

RTR-MRP là phần mềm lập kế hoạch sản xuất. Nó trả lời bốn câu hỏi mỗi ngày: khách đang đặt gì, mình có đủ hàng không, nếu thiếu thì mua gì, khi nào làm xong.

Dữ liệu chảy theo chuỗi: khách hàng đặt hàng → hệ thống tính xem thiếu vật tư gì → đề xuất mua → mua về nhập kho → đưa vào sản xuất → xuất hàng giao khách. Mọi module trong menu đều phục vụ một trong các bước này.

Có khoảng sáu vai trò sử dụng:

- Nhân viên kinh doanh: tạo báo giá, đơn bán, theo dõi giao hàng.
- Hoạch định (planner): chạy MRP, xem đề xuất mua, duyệt yêu cầu mua.
- Mua hàng: biến yêu cầu mua thành đơn mua, theo dõi đến khi nhận hàng.
- Kho: nhập hàng, xuất hàng, kiểm kê.
- Sản xuất: nhận lệnh sản xuất, cấp phát vật tư, báo hoàn thành.
- Chất lượng: kiểm hàng nhập, kiểm hàng sản xuất, xử lý lỗi.

Cấp quản lý duyệt các bước cần duyệt (yêu cầu mua trên hạn mức, NCR, v.v.). Kế toán làm hóa đơn và thanh toán ở module Finance.

---

## 2. Chuẩn bị dữ liệu gốc (làm trước một lần)

Hệ thống cần biết các "nhân vật" trước khi chạy được chu trình. Làm theo thứ tự này, từ trên xuống, không bỏ bước nào.

### 2.1 Kho hàng (/warehouses)

Tạo tối thiểu các kho: Nhận hàng (RECEIVING), Kiểm tra (QUARANTINE), Kho chính (MAIN), Sản xuất dở dang (WIP), Thành phẩm (FINISHED_GOODS), Xuất hàng (SHIPPING). Mỗi kho gán một mã ngắn, ví dụ WH-MAIN. Đây là cấu trúc chuẩn — không cần đặt lại tên kiểu "Kho anh Tâm".

### 2.2 Khách hàng (/customers)

Mỗi khách: mã, tên, mã số thuế, địa chỉ, người liên hệ, điều khoản thanh toán, tier (Platinum/Gold/Silver/Bronze — ảnh hưởng tới giá và ưu tiên). Nếu chưa rõ tier để Bronze.

### 2.3 Nhà cung cấp (/suppliers)

Mỗi supplier: mã, tên, nước xuất xứ, lead time mặc định (ngày), rating A/B/C/D (để B nếu chưa đánh giá). Với hàng xuất khẩu quân sự cần đánh dấu NDAA compliant.

### 2.4 Vật tư và linh kiện (/parts)

Đây là danh mục quan trọng nhất. Mỗi part có ba loại thông tin:

Cơ bản: mã part, tên, loại (FG/Component/Raw/Packaging), đơn vị tính, manufacturer + manufacturer PN (với linh kiện điện tử), datasheet URL.

Tồn kho: min stock, reorder point (khi xuống ngưỡng này hệ thống đề nghị mua), safety stock, MOQ, lead time.

Tuân thủ: RoHS, REACH, country of origin, HS code, ECCN nếu xuất khẩu.

Cách tạo nhanh: nếu có file Excel sẵn, dùng /import hoặc /data-setup để nạp hàng loạt. Không gõ tay từng part.

### 2.5 Định mức vật tư — BOM (/bom)

BOM trả lời câu hỏi: làm ra 1 thành phẩm cần những linh kiện gì, bao nhiêu mỗi loại. Tạo một BOM cho mỗi sản phẩm:

1. Chọn sản phẩm (Finished Good) đã có trong /parts.
2. Thêm từng dòng: linh kiện con, số lượng cần, tỷ lệ hao hụt (nếu có), reference designator (R1, U3 với mạch điện tử), ghi chú.
3. Đánh dấu revision (A, B...) và ngày hiệu lực.

Nếu có BOM nhiều cấp (sản phẩm chứa cụm con), tạo BOM cho từng cấp. Hệ thống tự explode khi chạy MRP.

Sau khi có đủ năm thứ trên, hệ thống sẵn sàng chạy. Không cần setup thêm gì để vận hành cơ bản. Các module nâng cao (Routing, Work Center, Inspection Plan) chỉ cần khi triển khai sâu.

---

## 3. Luồng bán hàng — từ đơn hàng khách đến giao hàng

### 3.1 Báo giá (khi khách hỏi giá)

Vào /sales → Quotations → New. Chọn khách, thêm các dòng sản phẩm + số lượng + giá. Lưu nháp, gửi khách. Trạng thái: draft → sent → accepted/rejected → converted.

Khi khách đồng ý, bấm "Convert to Sales Order" — hệ thống tự tạo đơn bán từ báo giá.

### 3.2 Đơn bán (/sales hoặc /orders)

Nếu khách đặt thẳng không qua báo giá, tạo Sales Order trực tiếp: chọn khách, thêm dòng, ngày giao hàng cam kết, lưu.

Sau khi lưu, có hai tình huống:

- Hàng có sẵn trong kho thành phẩm: chuyển sang bước 3.3 (giao hàng).
- Hàng chưa có: tạo Work Order (xem mục 5) hoặc đợi MRP gợi ý (mục 4).

### 3.3 Giao hàng (/shipments)

Khi đã có hàng: tạo Shipment từ Sales Order. Chọn kho xuất (thường FINISHED_GOODS), số lượng, phương tiện. Xuất xong hệ thống tự trừ tồn kho.

### 3.4 Hóa đơn và thanh toán (/finance)

Từ Shipment tạo Sales Invoice → gửi khách. Khi khách trả tiền, ghi Sales Payment. Số dư công nợ hiện tại xem ở báo cáo AR trong /finance.

---

## 4. Luồng mua hàng — từ thiếu hàng đến nhập kho

### 4.1 Chạy MRP (/mrp)

Vào /mrp → Run. Hệ thống quét:
- Các Sales Order chưa giao.
- BOM của từng sản phẩm.
- Tồn kho hiện tại.
- Lead time của từng vật tư.

Kết quả: danh sách đề xuất (MrpSuggestion) — mua gì, bao nhiêu, trước ngày nào. Chạy MRP mỗi sáng, hoặc khi có đơn bán lớn mới về.

Xem các trường hợp ngoại lệ ở /mrp/exceptions: đơn có rủi ro trễ, vật tư không đủ tồn an toàn, đơn có thể đẩy lên làm sớm.

### 4.2 Yêu cầu mua (Purchase Request — /purchasing)

Planner chuyển đề xuất MRP thành Purchase Request. Mỗi PR gồm nhiều dòng (part, số lượng, nhà cung cấp đề nghị, giá dự kiến). Trạng thái PR:

1. Draft — đang soạn.
2. Submit — gửi duyệt.
3. Approve hoặc Reject — cấp có thẩm quyền xử lý.
4. Nếu bị Reject: tạo Revise, sửa, gửi lại.
5. Khi Approved: bấm Convert → hệ thống tự sinh Purchase Order.

Quy tắc duyệt thường theo giá trị: dưới X triệu tự duyệt, trên X triệu cần trưởng bộ phận. Cấu hình trong /settings.

### 4.3 Đơn mua (Purchase Order — /purchasing)

PO được sinh từ PR hoặc tạo thủ công khi cần. Gửi cho nhà cung cấp. Trạng thái: draft → submitted → approved → sent → receiving → closed.

### 4.4 Nhận hàng (Goods Receipt Note — GRN)

Khi supplier giao đến: kho mở PO tương ứng, tạo GRN, nhập số lượng thực nhận. Hệ thống tự đưa hàng vào kho RECEIVING (chưa vào MAIN).

### 4.5 Kiểm tra (/quality/inspections)

Nếu vật tư có inspection plan: QC kiểm mẫu, nhập kết quả vào Inspection. Pass → hàng chuyển sang MAIN. Fail → tạo NCR, hàng giữ ở QUARANTINE hoặc HOLD.

### 4.6 Đối chiếu ba bên (Three-Way Match)

Hệ thống tự đối chiếu: PO (đã đặt gì) ↔ GRN (đã nhận gì) ↔ Purchase Invoice (supplier xuất hoá đơn gì). Lệch lớn hơn dung sai → cảnh báo, kế toán giải trình trước khi thanh toán.

---

## 5. Luồng sản xuất — từ lệnh đến thành phẩm

### 5.1 Tạo lệnh sản xuất (Work Order — /production)

Hai cách tạo:
- Từ Sales Order: chọn SO → Create Work Order. Hệ thống gợi ý số lượng theo cam kết.
- Thủ công: /production → New Work Order, chọn sản phẩm, số lượng, ngày cần xong.

Khi lưu, hệ thống auto allocate vật tư theo BOM. Xem các allocation ở Material Allocation.

### 5.2 Cấp phát vật tư (Pick List)

Kho in pick list, đi lấy linh kiện theo danh sách, chuyển sang kho WIP. Ghi nhận qua /inventory/issue hoặc quét mã barcode trên mobile (PWA).

### 5.3 Thực hiện sản xuất

Công nhân làm theo routing (các công đoạn). Mỗi công đoạn báo: thời gian bắt đầu, thời gian kết thúc, số lượng tốt, số lượng lỗi. Theo dõi ở /production/shop-floor.

Hệ thống tính OEE (hiệu suất tổng thể) tự động — xem ở /production/oee.

### 5.4 Nhập thành phẩm (Production Receipt)

Làm xong: tạo Production Receipt → kho nhập số lượng tốt vào FINISHED_GOODS, số lượng lỗi xử lý riêng (scrap hoặc rework).

---

## 6. Công việc kho hằng ngày

### 6.1 Nhập kho

Mọi lần nhập đều qua một trong: GRN (từ PO), Production Receipt (từ sản xuất), Transfer Order (từ kho khác), Adjust (điều chỉnh khi kiểm kê).

### 6.2 Xuất kho

Mọi lần xuất đều qua một trong: Pick List (cho sản xuất), Shipment (cho khách), Transfer (chuyển kho), Issue (xuất dùng nội bộ), Scrap Disposal (huỷ).

### 6.3 Kiểm kê (/inventory/cycle-count)

Tạo phiên kiểm kê theo tuần/tháng. Hệ thống gợi ý danh sách part ưu tiên (thường theo ABC classification — nhóm A kiểm nhiều nhất). Nhập số đếm thực tế → hệ thống tự tạo Adjust nếu lệch.

### 6.4 Cảnh báo hết hạn (/inventory/expiry-alerts)

Xem list các lô sắp hết hạn (linh kiện nhạy ẩm, hoá chất, keo). Ưu tiên dùng trước, hoặc đẩy vào scrap.

### 6.5 ABC Classification (/inventory/abc-classification)

Chạy định kỳ (quý). Phân loại part theo giá trị luân chuyển: A (80% giá trị, ~20% số part — kiểm soát chặt), B, C. Dùng để quyết định tần suất kiểm kê và mức tồn an toàn.

---

## 7. Chất lượng

### 7.1 Kế hoạch kiểm (/quality/inspection-plans)

Mỗi part có inspection plan: kiểm mẫu theo AQL nào, đo những đặc tính gì, chấp nhận trong khoảng nào. Setup một lần cho mỗi part, dùng mãi.

### 7.2 Kiểm hàng nhập (/quality/inspections)

Khi có GRN mới, QC mở inspection tương ứng, nhập kết quả đo từng mẫu. Pass → hàng thả vào MAIN. Fail → mục 7.3.

### 7.3 NCR — Phiếu không phù hợp (/quality/ncr)

Khi phát hiện lỗi (tại kiểm nhập, trong sản xuất, hoặc khách hàng khiếu nại): tạo NCR, mô tả lỗi, gắn part và lô ảnh hưởng, đề xuất xử lý (trả lại nhà cung cấp, rework, scrap, nhượng bộ).

### 7.4 CAPA — Hành động khắc phục (/quality/capa)

Nếu lỗi lặp lại hoặc nghiêm trọng: tạo CAPA từ NCR. Phân tích nguyên nhân gốc, lên hành động khắc phục, giao người chịu trách nhiệm, theo dõi đến khi đóng.

### 7.5 Truy xuất (/quality/traceability)

Bất kỳ lô nào: tra ngược ra được supplier nào cung cấp, đi vào work order nào, giao cho khách nào. Dùng khi có recall hoặc khiếu nại.

---

## 8. Báo cáo và cảnh báo

### 8.1 Trang chủ (/home)

Mở vào đầu ngày. Hiện sáu khối chính: đơn hàng mới, đơn sắp trễ, vật tư sắp thiếu, PR chờ duyệt, NCR mở, tồn kho cảnh báo. Bấm vào khối nào là đi đến danh sách chi tiết.

### 8.2 Analytics (/analytics)

Biểu đồ theo thời gian: doanh số, sản lượng, lead time, chất lượng. Dùng để họp tuần.

### 8.3 AI Insights (/ai-insights)

Cảnh báo dự đoán: đơn nào rủi ro trễ, supplier nào sắp gặp vấn đề, dự báo nhu cầu tháng sau. Không thay con người, chỉ gợi ý.

### 8.4 Báo cáo (/reports)

Các report cố định: báo cáo kho, báo cáo mua, báo cáo bán, chất lượng, công nợ. Xuất Excel được.

### 8.5 Thông báo (/notifications)

Hệ thống đẩy thông báo khi: PR cần duyệt, NCR mới, đơn sắp trễ, tồn xuống dưới min. Kiểm tra sáng và cuối ngày.

---

## 9. Khi có sự cố

### 9.1 Nhập sai số liệu

Mọi thao tác có audit log. Vào /audit hoặc /activity tìm lại thao tác, đảo ngược bằng Adjust (inventory) hoặc tạo bản ghi sửa (các module khác). Không xoá trực tiếp — tạo reversal record để giữ dấu vết.

### 9.2 Import file lỗi

Vào /import → Import History → chọn batch lỗi → Rollback. Hệ thống gỡ sạch dữ liệu đã nhập từ batch đó.

### 9.3 Quên mật khẩu, khoá tài khoản

/settings → user profile, hoặc báo admin reset. Có MFA thì cần thiết bị hai yếu tố.

### 9.4 Số liệu sai lệch giữa module

Thường do sync chậm. Đợi 1-2 phút rồi refresh. Nếu vẫn lệch, vào /data-setup chạy health check.

### 9.5 Ai làm gì — tra ở đâu

Mọi thay đổi quan trọng ghi trong /audit. Gõ tên user, khoảng thời gian, tên bảng. Xem chi tiết từng thay đổi field nào từ giá trị gì sang giá trị gì.

---

## 10. Thứ tự học trong tuần đầu

Ngày 1: đọc mục 1-2. Làm tay một khách hàng, một supplier, một kho, hai part, một BOM đơn giản.

Ngày 2: mục 3. Tạo báo giá, convert thành đơn bán, đi đến shipment.

Ngày 3: mục 4. Chạy MRP thử, xem đề xuất, tạo PR nháp, duyệt, convert PO, nhận hàng thử qua GRN.

Ngày 4: mục 5. Tạo work order từ đơn bán, cấp vật tư, nhập thành phẩm.

Ngày 5: mục 6-7. Kiểm kê thử, tạo NCR thử.

Sau một tuần đi hết chu trình mẫu sẽ hiểu hệ thống. Từ tuần 2 vận hành dữ liệu thật, gặp tình huống khó thì tra mục 9.

---

## 11. Quy tắc vàng

Một: không bao giờ sửa tồn kho bằng cách gõ thẳng vào database. Luôn đi qua Adjust, Issue, Receipt.

Hai: một sản phẩm phải có một BOM duy nhất đang hoạt động. Cần sửa thì tạo revision mới (B, C...), đừng sửa trực tiếp BOM đang chạy.

Ba: MPN (manufacturer part number) không trùng với part number nội bộ. Part number là mã của mình đặt; MPN là mã của nhà sản xuất. Đừng gộp hai trường vào một.

Bốn: NCR nào mở lâu không đóng, phải eskalate. Chất lượng không thể để treo.

Năm: khi không chắc, đọc lại audit log của bản ghi đó trước khi đoán nguyên nhân.
