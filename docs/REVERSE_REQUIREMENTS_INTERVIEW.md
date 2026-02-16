# REVERSE REQUIREMENTS INTERVIEW PROTOCOL
## Thu tuc dat van de nguoc - Kham pha nhu cau san xuat thuc te

> **Muc dich:** Thay vi cho user neu van de, Claude dong 3 vai de hoi nguoc lai,
> kham pha cac gap giua implementation hien tai va nhu cau san xuat thuc te.
>
> **Phuong phap:** Moi module se duoc "phong van" tu 3 goc nhin:
> - **KHACH HANG (KH)** — Nguoi dung cuoi: "Toi can gi? Toi gap kho khan gi?"
> - **AC (Acceptance Criteria)** — "The nao la DONE? Dieu kien chap nhan?"
> - **QC (Quality Control)** — "Edge case nao? Fail case nao? Validate sao?"
>
> **Last Updated:** 2026-02-16

---

## QUY TRINH INTERVIEW

### Buoc 1: Chon Module
Chon 1 trong cac module duoi day de bat dau interview.

### Buoc 2: Hoi cau hoi tu 3 vai
Moi module co 10-15 cau hoi tu 3 goc nhin KH/AC/QC.

### Buoc 3: Ghi nhan cau tra loi
Moi cau tra loi se duoc ghi lai voi:
- **Requirement ID** (VD: INV-001)
- **Priority:** P0 (Must have) / P1 (Should have) / P2 (Nice to have)
- **Implementation note:** Ghi chu ky thuat

### Buoc 4: Tao Implementation Plan
Tu cac cau tra loi, tao plan cu the cho tung pipeline.

---

## MODULE 1: INVENTORY — Quan ly ton kho

### KH (Khach hang)

| ID | Cau hoi | Muc dich |
|----|---------|----------|
| INV-KH-001 | Khi nhan hang ve kho, anh can biet nhung thong tin gi tren moi lo? (VD: ngay san xuat, han su dung, so lot, nguon goc?) | Xac dinh fields can thiet tren Inventory/Lot |
| INV-KH-002 | Nguyen lieu cua anh co han su dung khong? Neu co, anh xuat kho theo nguyen tac nao? (FIFO? FEFO? Theo lot cu nhat?) | Xac dinh picking strategy |
| INV-KH-003 | Anh co can phan loai hang ton kho theo ABC (A=gia tri cao, C=gia tri thap) khong? Hien tai anh quan ly cai nao chat hon? | ABC classification |
| INV-KH-004 | Khi ton kho xuong duoi muc an toan, anh muon he thong lam gi? Chi canh bao? Tu tao PO? Hay gui email cho bo phan mua hang? | Reorder automation |
| INV-KH-005 | Anh co kiem ke dinh ky khong? Bao lau 1 lan? Kiem ke toan bo hay cuon chieu (cycle counting)? | Cycle counting |
| INV-KH-006 | Co truong hop nao hang cua nha cung cap gui den nhung van la hang cua ho (consignment) cho den khi anh su dung? | Consignment stock |
| INV-KH-007 | Khi chuyen kho (transfer), anh can phe duyet khong? Ai duyet? | Transfer approval |
| INV-KH-008 | Anh co nhieu don vi tinh cho cung 1 nguyen lieu khong? VD: mua theo kg nhung xuat theo pcs? | Unit conversion |
| INV-KH-009 | Khi nhan hang ve, anh co can can/do/dem lai so luong thuc te va so sanh voi PO khong? Chenh lech bao nhieu thi chap nhan? | Receiving tolerance |
| INV-KH-010 | Anh co quan ly vi tri kho cu the khong? (VD: Ke A - Tang 2 - O 5) Hay chi quan ly theo kho lon? | Bin/Location management |

### AC (Acceptance Criteria)

| ID | Tieu chi chap nhan |
|----|---------------------|
| INV-AC-001 | He thong phai tu dong canh bao khi lot sap het han (N ngay truoc) |
| INV-AC-002 | Khi xuat kho, he thong phai tu dong goi y lot theo FIFO/FEFO |
| INV-AC-003 | Cycle counting phai cho phep kiem ke 1 phan kho ma khong khoa toan bo kho |
| INV-AC-004 | Chenh lech kiem ke phai duoc ghi nhan va tao phieu dieu chinh tu dong |
| INV-AC-005 | Chuyen kho phai co 2 buoc: Yeu cau → Phe duyet → Thuc hien |

### QC (Quality Control)

| ID | Edge case / Fail case |
|----|----------------------|
| INV-QC-001 | Neu lot da het han nhung van con ton trong kho → He thong xu ly sao? Khoa? Canh bao? Tu chuyen QUARANTINE? |
| INV-QC-002 | Neu xuat kho nhieu hon ton kho thuc te (do chenh lech kiem ke) → He thong chac chan negative stock? |
| INV-QC-003 | Neu cung 1 part co o nhieu kho, nhieu lot → Khi MRP tinh toan, tinh tong hay tinh rieng? |
| INV-QC-004 | Neu dang chuyen kho giua chung thi mat dien/mat mang → Du lieu co nhat quan khong? Transaction safety? |
| INV-QC-005 | Neu nhan hang chenh lech so voi PO (VD: PO 100, nhan 95) → Auto close? Partial receive? Back-order? |

---

## MODULE 2: PRODUCTION — San xuat & Work Order

### KH (Khach hang)

| ID | Cau hoi | Muc dich |
|----|---------|----------|
| PRD-KH-001 | Quy trinh san xuat cua anh la gi? Discrete (tung san pham)? Batch (theo me)? Hay pha tron? | Manufacturing type |
| PRD-KH-002 | Khi 1 Work Order dang chay ma can thay doi so luong (tang/giam), anh xu ly sao? Tach WO? Huy va tao moi? | WO split/merge |
| PRD-KH-003 | Anh co cong doan gia cong ngoai (subcontracting) khong? VD: gui hang di xi ma, son, in... roi nhan ve tiep tuc? | Subcontracting |
| PRD-KH-004 | Khi san pham bi loi giua chung, anh co quy trinh sua chua (rework) khong? Rework co routing rieng khong? | Rework flow |
| PRD-KH-005 | Anh co theo doi thoi gian setup may rieng voi thoi gian chay may khong? | Setup vs Run time |
| PRD-KH-006 | Khi san xuat 1 san pham, co tao ra san pham phu (by-product) hoac dong san pham (co-product) khong? | Co-product/By-product |
| PRD-KH-007 | Anh co cong doan nao co the chay song song (overlap) voi cong doan truoc khong? Hay phai tuan tu 100%? | Overlapping operations |
| PRD-KH-008 | Khi 1 WO hoan thanh, thanh pham nhap kho luc nao? Ngay khi xong? Hay phai cho QC kiem tra truoc? | WO completion flow |
| PRD-KH-009 | Anh co can biet chi phi thuc te cua tung WO khong? (nguyen lieu + nhan cong + overhead) | WO costing |
| PRD-KH-010 | Khi xuat nguyen lieu cho san xuat, anh xuat theo BOM chinh xac hay xuat du hon (buffer)? Chenh lech ghi nhan sao? | Material variance |
| PRD-KH-011 | Anh co nhieu ca san xuat khong? Lam sao de biet ca nao san xuat duoc bao nhieu? | Shift tracking |
| PRD-KH-012 | He thong hien tai co can theo doi trang thai tung may/tram lam viec khong? (Available, Running, Breakdown, Maintenance) | Equipment status |

### AC (Acceptance Criteria)

| ID | Tieu chi chap nhan |
|----|---------------------|
| PRD-AC-001 | WO phai co lifecycle ro rang: Draft → Released → In Progress → Completed/Closed |
| PRD-AC-002 | Khi WO Released, he thong phai tu dong check co du nguyen lieu khong (material availability check) |
| PRD-AC-003 | Subcontracting phai tao Subcon PO tu dong va theo doi hang gui di - nhan ve |
| PRD-AC-004 | Rework WO phai link ve WO goc va NCR goc |
| PRD-AC-005 | Material variance (chenh lech BOM vs thuc te) phai duoc ghi nhan va bao cao |

### QC (Quality Control)

| ID | Edge case / Fail case |
|----|----------------------|
| PRD-QC-001 | Neu WO can 100 pcs nguyen lieu nhung kho chi con 80 → Cho phep san xuat 1 phan? Hay block? |
| PRD-QC-002 | Neu WO dang In Progress ma can huy → Nguyen lieu da xuat tra ve kho sao? |
| PRD-QC-003 | Neu 1 may bi hong giua ca → WO bi anh huong the nao? Co tu dong re-schedule? |
| PRD-QC-004 | Neu san pham san xuat ra bi loi 100% → WO status la gi? Close voi 0 output? |
| PRD-QC-005 | Neu subcontractor giao tre → He thong co canh bao va anh huong den MRP khong? |

---

## MODULE 3: PURCHASING — Mua hang

### KH (Khach hang)

| ID | Cau hoi | Muc dich |
|----|---------|----------|
| PUR-KH-001 | Anh co hop dong khung (blanket PO / framework agreement) voi NCC khong? VD: thoa thuan mua 10,000 pcs trong nam, moi lan goi hang theo dot? | Blanket PO |
| PUR-KH-002 | Anh co bang gia theo bac so luong khong? VD: 1-100 pcs = 10k, 101-500 = 9k, 500+ = 8k? | Price breaks |
| PUR-KH-003 | Khi tinh gia nhap kho, anh co tinh them phi van chuyen, thue nhap khau, bao hiem khong? | Landed cost |
| PUR-KH-004 | PO cua anh can bao nhieu cap phe duyet? VD: <10M tu dong, 10-50M Manager, >50M Director? | Approval workflow |
| PUR-KH-005 | Khi NCC giao hang thieu (VD: PO 100, giao 90), anh xu ly sao? Dong PO? De mo cho dot sau? Tao PO moi cho 10 con thieu? | Partial delivery |
| PUR-KH-006 | Anh co danh gia NCC dinh ky khong? Tieu chi nao? (Giao dung han? Chat luong? Gia ca?) | Supplier evaluation |
| PUR-KH-007 | Anh co can so sanh bao gia tu nhieu NCC truoc khi chon khong? (RFQ process) | RFQ/Quotation |
| PUR-KH-008 | Anh mua hang bang nhung dong tien nao? Chi VND? Hay co USD, CNY, EUR? Ty gia cap nhat sao? | Multi-currency |
| PUR-KH-009 | Khi NCC thay doi gia, anh cap nhat sao? Co lich su gia khong? | Price history |
| PUR-KH-010 | Anh co truong hop can mua gap (emergency purchase) khong? Quy trinh co khac binh thuong khong? | Emergency PO |

### AC (Acceptance Criteria)

| ID | Tieu chi chap nhan |
|----|---------------------|
| PUR-AC-001 | Blanket PO phai co tong so luong/gia tri, moi lan release (call-off) tru tu blanket |
| PUR-AC-002 | He thong phai tu dong ap dung price break theo so luong dat |
| PUR-AC-003 | PO approval phai co workflow: Draft → Pending Approval → Approved → Sent to Supplier |
| PUR-AC-004 | Partial delivery phai update PO status va cho phep receive nhieu lan |
| PUR-AC-005 | Landed cost phai phan bo duoc theo trong luong hoac gia tri |

### QC (Quality Control)

| ID | Edge case / Fail case |
|----|----------------------|
| PUR-QC-001 | Neu PO da Approved nhung NCC thay doi gia → Re-approve? Hay tu dong cap nhat? |
| PUR-QC-002 | Neu blanket PO het han ma van con so luong chua release → Canh bao? Tu dong gia han? |
| PUR-QC-003 | Neu 1 part co 3 NCC nhung NCC chinh ngung cung cap → He thong tu dong chuyen sang NCC phu? |
| PUR-QC-004 | Neu ty gia thay doi giua luc tao PO va luc thanh toan → Chenh lech hach toan sao? |
| PUR-QC-005 | Neu NCC giao hang nhieu hon PO (over-delivery) → Chap nhan? Tu choi? Tolerance bao nhieu? |

---

## MODULE 4: QUALITY — Quan ly chat luong

### KH (Khach hang)

| ID | Cau hoi | Muc dich |
|----|---------|----------|
| QUA-KH-001 | Khi nhan hang tu NCC, anh kiem tra 100% hay lay mau (sampling)? Neu lay mau, theo tieu chuan nao? (AQL?) | Sampling plan |
| QUA-KH-002 | Anh co kiem tra chat luong giua quy trinh san xuat khong? (In-process inspection) O nhung cong doan nao? | In-process QC |
| QUA-KH-003 | Truoc khi giao hang cho khach, anh co kiem tra cuoi (final inspection) khong? Ai ky xac nhan? | Final inspection |
| QUA-KH-004 | Khi phat hien hang loi, quy trinh xu ly la gi? Ai quyet dinh: sua chua / huy / tra NCC / chap nhan ngoai le? | Disposition authority |
| QUA-KH-005 | Anh co can cap Certificate of Conformance (COC) cho khach khong? Noi dung can nhung gi? | COC |
| QUA-KH-006 | Anh co quan ly hieu chuan thiet bi do luong khong? (VD: thuoc cap, can, may do...) Bao lau hieu chuan 1 lan? | Calibration |
| QUA-KH-007 | Khi khach hang khieu nai (complaint), quy trinh xu ly la gi? Co deadline khong? | Customer complaint |
| QUA-KH-008 | Anh co ap dung tieu chuan ISO 9001 hay tieu chuan nao khac khong? | Standards compliance |
| QUA-KH-009 | Khi NCR (Non-Conformance Report) duoc tao, ai phe duyet? Co can CAPA (Corrective Action) cho moi NCR khong? | NCR/CAPA flow |
| QUA-KH-010 | Anh co can traceability nguoc tu thanh pham → nguyen lieu (lot nao, NCC nao, ngay nao) khong? Trong bao lau? | Traceability depth |

### AC (Acceptance Criteria)

| ID | Tieu chi chap nhan |
|----|---------------------|
| QUA-AC-001 | Inspection plan phai dinh nghia duoc: tieu chi kiem tra, muc chap nhan, phuong phap do |
| QUA-AC-002 | NCR phai co workflow: Tao → Dieu tra → Disposition → CAPA → Verify → Close |
| QUA-AC-003 | COC phai tu dong pull data tu inspection results + lot info + part specs |
| QUA-AC-004 | Customer complaint phai link duoc toi NCR, CAPA, va lot/WO lien quan |
| QUA-AC-005 | Traceability phai trace duoc ca 2 chieu: forward (NL → TP) va backward (TP → NL) |

### QC (Quality Control)

| ID | Edge case / Fail case |
|----|----------------------|
| QUA-QC-001 | Neu inspection plan yeu cau 5 tieu chi ma 4 pass, 1 fail → Ket qua tong the la gi? |
| QUA-QC-002 | Neu NCR chua close ma lot da duoc su dung trong san xuat → Canh bao? Block? |
| QUA-QC-003 | Neu thiet bi do luong het han hieu chuan → Ket qua kiem tra co hop le khong? |
| QUA-QC-004 | Neu cung 1 lot bi nhieu NCR → He thong tong hop va escalate sao? |
| QUA-QC-005 | Neu khach yeu cau recall (thu hoi) 1 lot → He thong trace duoc tat ca WO, SO da dung lot do? |

---

## MODULE 5: BOM — Bill of Materials

### KH (Khach hang)

| ID | Cau hoi | Muc dich |
|----|---------|----------|
| BOM-KH-001 | BOM cua anh co bao nhieu cap? (VD: Thanh pham → Sub-assembly → Component → Nguyen lieu) | BOM depth |
| BOM-KH-002 | Anh co dung phantom BOM khong? (Sub-assembly chi ton tai tren giay, khong nhap kho rieng) | Phantom BOM |
| BOM-KH-003 | Moi cong doan co ty le hao hut (scrap %) rieng khong? VD: Cat thep hao 5%, Han hao 2%? | Scrap factor |
| BOM-KH-004 | Anh co thay doi BOM theo thoi gian khong? (VD: Tu 01/03 doi nguyen lieu A sang B) | Effectivity dates |
| BOM-KH-005 | Anh co BOM ky thuat (Engineering) khac voi BOM san xuat (Manufacturing) khong? | EBOM vs MBOM |
| BOM-KH-006 | Khi thay doi BOM (revision), quy trinh phe duyet la gi? Ai duyet? | ECN/ECO process |
| BOM-KH-007 | Anh co can tinh gia thanh san pham tu BOM khong? (Rolled-up cost) | Cost rollup |
| BOM-KH-008 | Cung 1 san pham, anh co nhieu phien ban BOM cho khach hang khac nhau khong? (Variant/Option) | BOM variants |
| BOM-KH-009 | Nguyen lieu thay the (alternate) anh quan ly sao? Co uu tien khong? Can phe duyet khi dung? | Alternate materials |
| BOM-KH-010 | Khi 1 component bi ngung san xuat (obsolete), anh cap nhat BOM sao? | Part obsolescence |

### AC (Acceptance Criteria)

| ID | Tieu chi chap nhan |
|----|---------------------|
| BOM-AC-001 | BOM phai cho phep N cap (multi-level) va explode duoc toan bo cay |
| BOM-AC-002 | Phantom BOM phai tu dong "xuyen qua" khi MRP explode — khong tao WO cho phantom |
| BOM-AC-003 | Scrap factor phai tinh nguoc: can 100 pcs, hao 5% → phai plan 105.26 pcs |
| BOM-AC-004 | ECN phai co workflow: Request → Review → Approve → Implement → Verify |
| BOM-AC-005 | Cost rollup phai tinh: material cost + labor + overhead cho moi cap BOM |

### QC (Quality Control)

| ID | Edge case / Fail case |
|----|----------------------|
| BOM-QC-001 | Neu BOM co circular reference (A → B → C → A) → He thong detect va block? |
| BOM-QC-002 | Neu effectivity date chuyen sang nhung NL moi chua co ton → Canh bao truoc bao lau? |
| BOM-QC-003 | Neu 2 phien ban BOM dang active cung luc → He thong chon phien ban nao? |
| BOM-QC-004 | Neu xoa 1 component khoi BOM nhung dang co WO su dung → Block hay cho phep? |
| BOM-QC-005 | Neu cost rollup gap NL chua co gia → Bao loi hay tinh = 0? |

---

## MODULE 6: MRP — Hoach dinh nguyen lieu

### KH (Khach hang)

| ID | Cau hoi | Muc dich |
|----|---------|----------|
| MRP-KH-001 | Anh chay MRP bao lau 1 lan? Hang ngay? Hang tuan? Khi co don hang moi? | MRP frequency |
| MRP-KH-002 | Khi MRP goi y tao PO/WO, anh muon tu dong tao hay chi goi y de anh duyet? | Auto vs manual |
| MRP-KH-003 | Anh co dung safety stock khong? Tinh sao? Co dinh hay % cua demand? | Safety stock |
| MRP-KH-004 | Lead time cua NCC co on dinh khong? Hay thay doi theo mua/so luong? | Lead time variability |
| MRP-KH-005 | Anh co muon MRP xem xet cong suat (capacity) khi len ke hoach khong? Hay chi xem NL? | Capacity planning |
| MRP-KH-006 | Khi demand thay doi (don hang tang/giam), anh muon he thong phan ung sao? | Exception messages |
| MRP-KH-007 | Anh co firm planned orders khong? (Lenh da xac nhan, MRP khong duoc thay doi) | Firm orders |
| MRP-KH-008 | Anh co san xuat tren nhieu nha may khong? NL co chuyen giua cac nha may? | Multi-site planning |

### AC (Acceptance Criteria)

| ID | Tieu chi chap nhan |
|----|---------------------|
| MRP-AC-001 | MRP phai explode multi-level BOM va tinh net requirement cho tung cap |
| MRP-AC-002 | MRP phai tao exception messages: Expedite, Defer, Cancel, Increase, Decrease |
| MRP-AC-003 | MRP phai ton trong firm orders — khong tu dong thay doi |
| MRP-AC-004 | MRP phai tinh lot sizing: Fixed, LFL, EOQ, Period of Supply |
| MRP-AC-005 | MRP output phai cho phep convert truc tiep thanh PO hoac WO |

### QC (Quality Control)

| ID | Edge case / Fail case |
|----|----------------------|
| MRP-QC-001 | Neu BOM co loi (circular, missing component) → MRP xu ly sao? |
| MRP-QC-002 | Neu lead time = 0 → MRP co tao planned order voi ngay bat dau = ngay can? |
| MRP-QC-003 | Neu cung 1 NL dung cho 10 WO cung luc → MRP phan bo (allocate) sao? |
| MRP-QC-004 | Neu safety stock > reorder point → Logic co dung khong? |
| MRP-QC-005 | Neu demand dot ngot tang gap 10 → MRP co canh bao "abnormal demand"? |

---

## MODULE 7: SALES & SHIPPING — Ban hang & Giao hang

### KH (Khach hang)

| ID | Cau hoi | Muc dich |
|----|---------|----------|
| SAL-KH-001 | Anh ban hang theo Make-to-Order (MTO) hay Make-to-Stock (MTS)? Hay pha tron? | Manufacturing strategy |
| SAL-KH-002 | Khi khach dat hang, anh hua ngay giao sao? Dua tren ton kho? Hay dua tren ke hoach san xuat? | Promise date (ATP/CTP) |
| SAL-KH-003 | Anh co cho phep giao hang nhieu dot (partial delivery) khong? Khach co bi tinh phi giao hang moi dot? | Partial delivery |
| SAL-KH-004 | Khi khach huy don (cancellation), quy trinh xu ly la gi? NL da mua thi sao? WO da bat dau thi sao? | Cancellation impact |
| SAL-KH-005 | Anh co bang gia rieng cho tung khach hang khong? Chiet khau theo so luong? Theo gia tri don hang? | Pricing tiers |
| SAL-KH-006 | Khi dong goi, co quy tac gi? (VD: max 25kg/thung, khong tron 2 lot, giay lot chong soc...) | Packing rules |
| SAL-KH-007 | Anh co xuat khau khong? Can nhung chung tu gi? (Invoice, Packing List, COO, Phyto cert...) | Export docs |
| SAL-KH-008 | Anh theo doi van chuyen bang cach nao? Co tich hop voi hang van chuyen (DHL, Viettel Post...)? | Carrier integration |
| SAL-KH-009 | Khi hang bi tra ve (return), quy trinh xu ly la gi? Tra lai kho? Kiem tra lai? Hoan tien? | Return management |
| SAL-KH-010 | Anh co can quan ly bao hanh (warranty) khong? Theo san pham? Theo lot? Thoi gian bao lau? | Warranty tracking |

### AC (Acceptance Criteria)

| ID | Tieu chi chap nhan |
|----|---------------------|
| SAL-AC-001 | ATP phai tinh: Ton kho - Da cam ket + Dang san xuat + Dang mua |
| SAL-AC-002 | CTP phai tinh: Neu khong du ton → Khi nao co the san xuat xong? |
| SAL-AC-003 | Partial delivery phai track tung dot giao va remaining balance |
| SAL-AC-004 | Return phai tao RMA (Return Material Authorization) va link voi SO goc |
| SAL-AC-005 | Packing list phai tu dong tinh so thung/pallet dua tren packing rules |

### QC (Quality Control)

| ID | Edge case / Fail case |
|----|----------------------|
| SAL-QC-001 | Neu khach dat 1000 pcs nhung kho chi con 800 → Giao 800? Cho du? Chia 2 dot? |
| SAL-QC-002 | Neu giao hang roi khach phat hien loi → Truy vet lot nao, WO nao, NCC nao? |
| SAL-QC-003 | Neu 2 don hang cung can 1 lot hang → Ai duoc uu tien? Theo ngay dat? Theo khach VIP? |
| SAL-QC-004 | Neu hang da giao nhung invoice chua xuat → He thong co canh bao? |
| SAL-QC-005 | Neu khach yeu cau thay doi ngay giao khi hang da dang san xuat → Impact analysis? |

---

## MODULE 8: FINANCE & COSTING — Tai chinh & Gia thanh

### KH (Khach hang)

| ID | Cau hoi | Muc dich |
|----|---------|----------|
| FIN-KH-001 | Anh tinh gia thanh san pham theo phuong phap nao? Standard cost? Actual cost? Weighted average? | Costing method |
| FIN-KH-002 | Anh co theo doi chi phi san dang (WIP - Work in Progress) khong? | WIP valuation |
| FIN-KH-003 | Khi gia nguyen lieu thay doi, anh cap nhat gia thanh san pham sao? Tu dong? Thu cong? | Cost update |
| FIN-KH-004 | Anh co can bao cao chenh lech gia (variance report) khong? Standard vs Actual? | Variance analysis |
| FIN-KH-005 | Anh dinh gia ton kho theo phuong phap nao? FIFO? Weighted Average? Standard? | Inventory valuation |
| FIN-KH-006 | Anh co phan bo chi phi san xuat chung (overhead) vao gia thanh khong? Theo tieu chi nao? | Overhead allocation |
| FIN-KH-007 | Anh co can bao cao lai gop theo san pham khong? | Margin by product |
| FIN-KH-008 | Cong no NCC (AP) va cong no khach hang (AR) anh quan ly o dau? Trong he thong nay hay phan mem ke toan rieng? | AP/AR integration |

### AC (Acceptance Criteria)

| ID | Tieu chi chap nhan |
|----|---------------------|
| FIN-AC-001 | Standard cost phai tu dong rollup tu BOM (material + labor + overhead) |
| FIN-AC-002 | Variance report phai chi ra: Price variance, Usage variance, Volume variance |
| FIN-AC-003 | WIP phai tinh theo: NL da xuat + Nhan cong da bao cao + Overhead da phan bo |
| FIN-AC-004 | Inventory valuation phai tuong thich voi phuong phap ke toan da chon |

### QC (Quality Control)

| ID | Edge case / Fail case |
|----|----------------------|
| FIN-QC-001 | Neu standard cost = 100k nhung actual = 150k (chenh 50%) → Canh bao? Auto-adjust? |
| FIN-QC-002 | Neu WO bi huy giua chung → WIP da tich luy xu ly sao? Write-off? |
| FIN-QC-003 | Neu inventory valuation bi am (do loi data) → He thong detect? |
| FIN-QC-004 | Neu cung 1 part co 2 gia nhap khac nhau trong thang → Weighted avg tinh dung khong? |

---

## MODULE 9: AUDIT & COMPLIANCE

### KH (Khach hang)

| ID | Cau hoi | Muc dich |
|----|---------|----------|
| AUD-KH-001 | Anh co can biet AI THAY DOI GI, KHI NAO, GIA TRI CU/MOI cho tat ca cac thay doi khong? | Change tracking depth |
| AUD-KH-002 | Bao lau anh can luu lich su thay doi? 1 nam? 3 nam? Vinh vien? | Retention period |
| AUD-KH-003 | Co nhung thao tac nao can "4 mat" (dual control)? VD: xoa hang, thay doi gia, phe duyet PO >100M? | Dual control |
| AUD-KH-004 | Anh co can chu ky dien tu (e-signature) cho cac phe duyet khong? Hay chi can ten nguoi duyet? | E-signature |
| AUD-KH-005 | Khi co audit tu ben ngoai (ISO, khach hang), anh can xuat ra bao cao nao? | Audit reports |

---

## MODULE 10: REPORTING & DASHBOARD

### KH (Khach hang)

| ID | Cau hoi | Muc dich |
|----|---------|----------|
| RPT-KH-001 | CEO can bao cao gi moi ngay/tuan/thang? Top 5 bao cao quan trong nhat? | Executive reporting |
| RPT-KH-002 | Truong kho can bao cao gi? Ton kho, hang sap het, hang cham luan chuyen? | Warehouse reporting |
| RPT-KH-003 | Truong san xuat can bao cao gi? OEE, nang suat, ty le loi, backlog? | Production reporting |
| RPT-KH-004 | Bo phan mua hang can bao cao gi? NCC performance, gia ca, lead time? | Purchasing reporting |
| RPT-KH-005 | Anh co can bao cao tu dong gui email dinh ky khong? | Scheduled reports |
| RPT-KH-006 | Anh co can dashboard tuy chinh (moi nguoi 1 giao dien khac) khong? | Role-based dashboard |
| RPT-KH-007 | Anh co can export bao cao ra Excel/PDF de gui cho khach hang hoac cap tren khong? | Export format |

---

## TRACKING TABLE

Dung bang nay de ghi nhan ket qua interview:

| Req ID | Module | Priority | Cau tra loi | Implementation Note | Status |
|--------|--------|----------|-------------|---------------------|--------|
| | | | | | |

---

## HUONG DAN SU DUNG

1. **Bat dau:** Chon 1 module (hoac de Claude chon theo thu tu uu tien)
2. **Tra loi:** Tra loi tung cau hoi — khong can tra loi tat ca, chi nhung cai lien quan
3. **Bo qua:** Neu cau hoi khong ap dung cho anh, noi "Khong ap dung" hoac "Chua can"
4. **Them:** Neu co van de khac khong co trong danh sach, noi them bat ky luc nao
5. **Ket thuc module:** Khi xong 1 module, Claude se tong hop va tao implementation plan

**Cau lenh:**
- "Interview module X" — Bat dau phong van module X
- "Tiep tuc" — Chuyen sang cau tiep theo
- "Tong hop" — Claude tong hop ket qua va tao plan
- "Tat ca" — Chay tat ca module lien tuc

---

*Created: 2026-02-16*
*Protocol designed by: Claude Opus 4.6*
*Purpose: Systematic requirements discovery for manufacturing MRP system*
