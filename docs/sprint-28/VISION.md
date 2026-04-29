# Sprint 28 · Vision — Phòng Sản xuất + Bridge Layer Foundation

**Approved:** 2026-04-27 by Lâm
**Branch:** `feat/sprint-28-production-shop-floor` (sẽ tạo từ `main` sau khi Sprint 27 merge)
**Duration:** 2 tuần
**Mode:** Build, không Discovery. Self-RRI driven.

---

## Mục tiêu sản phẩm (1 câu)

Phòng Sản xuất RTR có thể **bỏ Excel** sau Sprint 28 — quản đốc lập kế hoạch ngày, supervisor xem dashboard ca, operator clock in/out + nhập qty produced/scrap qua tablet, trưởng phòng xem report tổng.

## Người dùng đích

| Persona | Cụm sidebar | Trang chính |
|---|---|---|
| Operator | Sản xuất | Mobile shift entry |
| Supervisor | Sản xuất + Vận hành | Shift dashboard |
| Quản đốc | Sản xuất + Vận hành | Daily plan |
| Bảo trì | Sản xuất | Equipment + Downtime |
| Trưởng phòng | Sản xuất + Báo cáo | Production report |

## Kiến trúc

```
┌──────────────────────────────────────────────────────────┐
│                   Sidebar v2 (TIP-S27-06)                │
│   + cụm "Sản xuất" 6 sub-menu role-gated production+admin│
└──────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   Daily Plan      Shift Dashboard   Production Report
   (Quản đốc)     (Supervisor)        (Trưởng phòng)
        │                │                │
        └────────┬───────┴──────┬─────────┘
                 ▼              ▼
        ┌────────────────────────────┐
        │    DailyProductionPlan     │
        │    ShiftReport (auto-agg)  │
        │    LaborEntry (rebranded)  │
        │    DowntimeRecord          │
        │    Equipment               │
        └────────────────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │  Bridge Layer MVP          │
        │  DataSource + MappingRule  │
        │  Excel upload UI + parser  │
        │  (Drive API: Sprint 29)    │
        └────────────────────────────┘
```

## Nguyên tắc thiết kế

1. **Mobile-first cho operator.** Shift entry UI phải responsive 375px. Quản đốc/trưởng phòng có thể desktop.
2. **Auto-aggregate, không manual.** ShiftReport tính từ LaborEntry + DowntimeRecord + ProductionReceipt. Người dùng KHÔNG nhập số lại lần 2.
3. **HIDE thay vì DROP.** 8 entity overengineered ẩn khỏi sidebar. Schema giữ, route legacy giữ, có thể mở lại Sprint 30+.
4. **Excel upload trước, Drive API sau.** Bridge layer Sprint 28 chỉ implement upload UI + parser. Khi Workspace ready → Sprint 29 swap UI thành Drive sync.
5. **i18n tiếng Việt** cho mọi label user-facing. Code/log tiếng Anh.
6. **Role-gate production:** sidebar cụm "Sản xuất" chỉ visible cho user có role `production` hoặc `admin`.

## Out-of-scope (Sprint 29-30)

- Routing đa bước (RoutingOperation flow).
- WorkCenterCapacity auto-calc + OEE dashboard.
- Quality flow (Inspection · NCR · CAPA).
- Cost variance tracking.
- Electronic Signature (21 CFR Part 11).
- Drive API real-time sync.
- Calendar/Gmail/AppsScript integration (sau khi Workspace setup).

## Risks + mitigation

| Risk | Khả năng | Impact | Mitigation |
|---|---|---|---|
| Schema simplify break service đang dùng full field | Medium | Medium | Wave 1 chỉ thêm field/entity, không drop. Giữ optional. |
| Employee → User merge break code | High | High | Wave 1 grep `prisma.employee` usage trước khi merge. Nếu có data Employee → migration script. |
| Bridge layer Excel parser fail với file phòng thật | Medium | Medium | Wave 4 demo với 1-2 Sheet phòng cấp + permissive parser (skip row lỗi, log warning). |
| Operator mobile UI không responsive đẹp | Low | Low | Tailwind responsive class + RTL test viewport 375px. |
| Production roles chưa assign cho user thật | High | Medium | Wave 1 seed script: tạo demo user role production cho test. Lâm assign user thật qua admin UI. |

## Deliverables Sprint 28

- 10 commit (1 per TIP) trên `feat/sprint-28-production-shop-floor`.
- Schema: +4 entity (DailyProductionPlan, ShiftReport, DataSource, MappingRule).
- Sidebar v2: +1 cụm "Sản xuất" 6 sub-menu.
- 5 UI page mới + 1 mobile shift entry.
- 1 demo Excel upload hoạt động end-to-end.
- Tests ≥80 (similar density Sprint 27).
- 1 `VERIFY_REPORT.md` + REQ-ID matrix.
