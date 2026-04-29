# Sprint 28 · RRI Auto-Report (Self-RRI mode)

> **Mode:** Chủ thầu đóng vai 5 personas phòng Sản xuất + đối chiếu DASHBOARD context Sprint 27. Best-practice answers, không phỏng vấn user thật.
> **Lâm override:** trả về `REVISE: REQ-XX-YY` bất kỳ lúc nào nếu thấy sai thực tế phòng RTR.

## Context giả định
- RTR scale SME electronics manufacturer (50-200 người).
- Phòng Sản xuất chính: ~15-30 operator, 3-5 work center (SMT line, hand assembly, testing/QC, packing), 2-3 ca ngày.
- Hiện trạng: Excel/Sheet hằng ngày, mỗi vị trí có file riêng, copy-paste giữa các vị trí.

---

## Persona 1 · Operator máy/dây chuyền

| ID | Requirement |
|---|---|
| REQ-28-OP-1 | UI nhập qty produced + qty scrap per WO theo ca, mobile-friendly (tablet/phone shop floor) |
| REQ-28-OP-2 | Realtime BOM của WO — change báo ngay |
| REQ-28-OP-3 | Clock in/out đơn giản (login → bắt đầu ca, logout → kết thúc) |

## Persona 2 · Supervisor ca

| ID | Requirement |
|---|---|
| REQ-28-SV-1 | Dashboard ca hiện tại: WO list + progress bar + operator assigned + scrap rate |
| REQ-28-SV-2 | Auto-aggregate operator log → ca summary → ngày summary, không copy Excel thủ công |
| REQ-28-SV-3 | Báo machine downtime nhanh (1 click + dropdown lý do: thiếu vật tư · máy hỏng · chờ kiểm · changeover) |

## Persona 3 · Quản đốc xưởng

| ID | Requirement |
|---|---|
| REQ-28-QD-1 | Daily Production Plan UI — list WO ngày/tuần, assign work center + operator, drag/drop reorder |
| REQ-28-QD-2 | Auto-detect WO trễ → suggest re-plan (đơn giản: dời ngày kế tiếp + flag) |
| REQ-28-QD-3 | Weekly capacity view — capacity work center vs WO load, đỏ nếu overload |

## Persona 4 · Bảo trì

| ID | Requirement |
|---|---|
| REQ-28-BT-1 | Equipment list + status (running/idle/maintenance/breakdown) |
| REQ-28-BT-2 | Operator nút "Báo sự cố" gắn thẳng vào WO → tạo DowntimeRecord auto |
| REQ-28-BT-3 | Lịch maintenance sắp tới (7 ngày) hiện ở dashboard quản đốc tránh xếp WO trùng |

## Persona 5 · Trưởng phòng Sản xuất

| ID | Requirement |
|---|---|
| REQ-28-TP-1 | Production Report dashboard: tổng output ngày/tuần/tháng, on-time %, scrap %, top 5 trễ, top 5 downtime |
| REQ-28-TP-2 | Export PDF/Excel auto |

---

**Tổng:** 14 REQ · 5 personas · scope MVP Sprint 28 (2 tuần).

**Out-of-scope explicit (Sprint 29+):** routing đa bước · OEE auto · cost variance · electronic signature · NCR/CAPA · Drive real-time sync.
