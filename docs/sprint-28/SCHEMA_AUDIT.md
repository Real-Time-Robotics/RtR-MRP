# Sprint 28 · Schema Audit Production

> Đối chiếu 22 entity production hiện có với 14 REQ từ RRI Auto. Decision matrix.

## Decision Matrix

| Entity | Status | Decision | Lý do |
|---|---|---|---|
| WorkOrder | có | **KEEP** | Sprint 27 wired. Trung tâm. |
| WorkOrderOperation | có | **HIDE** | Routing đa bước — phòng SME thường không dùng. Schema giữ, UI ẩn Sprint 28. |
| WorkCenter | 32 field | **SIMPLIFY** | Form chỉ 5 field core (code, name, type, location, status). 27 field optional. |
| Routing + RoutingOperation | có | **HIDE** | Concept enterprise. Không UI. Sprint 30 mở nếu cần. |
| ScheduledOperation | có | **HIDE** | Auto-schedule complex. Phòng làm tay. |
| LaborEntry | có | **EXTEND + REBRAND** | Dùng làm "ShiftLog operator" — đơn giản hoá field. Core Sprint 28. |
| DowntimeRecord | có | **KEEP** | Operator báo sự cố → entry. Field giữ. |
| Shift | có | **KEEP simplify** | 3 ca cố định. Drop overtime rate, efficiency factor khỏi UI. |
| ShiftAssignment | có | **KEEP simplify** | Clock in/out gắn ca. Drop leave management. |
| WorkCenterCapacity | có | **HIDE** | Capacity calc auto — Sprint 30. |
| CapacityRecord | có | **HIDE** | Same. |
| Equipment | có | **KEEP** | Bảo trì cần. List + status. |
| Employee | có | **MERGE → User** | RTR scale nhỏ — User đủ. Ẩn Employee. |
| EmployeeSkill | có | **HIDE** | Sprint 30. |
| ProductionReceipt | có | **KEEP** | Sprint 27 wired. |
| MaterialAllocation | có | **KEEP** | Sprint 27 wired. |
| MrpRun | có | **KEEP** | Đã có. |
| MrpSuggestion | có | **KEEP** | Đã có. |
| WorkOrderCost | có | **HIDE** | Cost calc — Sprint 30+. |
| ScrapDisposal | có | **KEEP** | Operator báo scrap. |
| AssemblyOrder | Sprint 27 | **KEEP** | Đã có. |
| ElectronicSignature | có | **HIDE** | 21 CFR — RTR không pharma. |

## NEW entity Sprint 28

| Entity | Mục đích | Source REQ |
|---|---|---|
| **DailyProductionPlan** | "Kế hoạch tuần" Excel của quản đốc → app | REQ-28-QD-1, QD-2, QD-3 |
| **ShiftReport** | Auto-aggregate output 1 ca từ LaborEntry + DowntimeRecord + ProductionReceipt | REQ-28-SV-2, TP-1 |
| **DataSource** | Bridge layer minimal — Excel upload registry | Carry-over Sprint 28 plan v1 |
| **MappingRule** | Mapping cột Excel → canonical field, versioned | Carry-over |

## Schema impact summary

```
KEEP unchanged:    13 entity (Sprint 27 + đơn giản)
SIMPLIFY (UI):      4 entity (WorkCenter, LaborEntry, Shift, ShiftAssignment)
HIDE (UI only):     8 entity (Routing, OEE, Cost, Compliance, Skill, Capacity)
NEW:                4 entity (DailyProductionPlan, ShiftReport, DataSource, MappingRule)

Schema migration:
  - 4 model mới
  - 0 model drop (giữ schema cho rollback path)
  - Field optional trên model SIMPLIFY (không required)
```

## Rủi ro cần Lâm aware

1. **HIDE không phải DROP.** Schema giữ, code service giữ. UI tạm ẩn. Nếu Sprint 30 phòng cần routing/cost → mở lại không phải migration mới.

2. **LaborEntry rebrand "ShiftLog".** UI label tiếng Việt "Báo cáo ca", schema field giữ nguyên. Operator không thấy thuật ngữ "Labor".

3. **Employee → User merge.** Ai đã code service dùng `Employee` table cần check. Nếu có data Employee thật → migration sang User. Sprint 28 Wave 1 sẽ verify.

4. **WorkCenterCapacity HIDE** = OEE dashboard không có data → 0/null. UI page `/dashboard/production/oee` để nguyên (legacy access), nhưng KHÔNG link từ sidebar v2.
