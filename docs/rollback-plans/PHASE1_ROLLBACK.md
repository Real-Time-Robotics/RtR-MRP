# ROLLBACK PLAN - PHASE 1: DATABASE OPTIMIZATION

**Phase:** Phase 1 - Quick Wins (Database)
**Date:** 01/01/2026
**Owner:** Backend Team

---

## 1. THAY ĐỔI TRONG PHASE NÀY

### 1.1 Database Changes - Indexes
| Change | Script | Rollback Script |
|--------|--------|-----------------|
| Index work_orders(status) | `CREATE INDEX idx_work_orders_status` | `DROP INDEX idx_work_orders_status` |
| Index work_orders(product_id) | `CREATE INDEX idx_work_orders_product` | `DROP INDEX idx_work_orders_product` |
| Index sales_orders(customer_id, order_date) | `CREATE INDEX idx_sales_orders_customer_date` | `DROP INDEX idx_sales_orders_customer_date` |
| Index purchase_orders(supplier_id, status) | `CREATE INDEX idx_purchase_orders_supplier_status` | `DROP INDEX idx_purchase_orders_supplier_status` |
| Index parts(category, status) | `CREATE INDEX idx_parts_category_status` | `DROP INDEX idx_parts_category_status` |
| Index inventory(part_id, location_id) | `CREATE INDEX idx_inventory_part_location` | `DROP INDEX idx_inventory_part_location` |
| Partial index work_orders active | `CREATE INDEX idx_work_orders_active` | `DROP INDEX idx_work_orders_active` |
| Partial index sales_orders pending | `CREATE INDEX idx_sales_orders_pending` | `DROP INDEX idx_sales_orders_pending` |

### 1.2 Code Changes
| File/Component | Change Description | Git Commit |
|----------------|-------------------|------------|
| prisma/schema.prisma | Add @@index annotations | TBD |
| src/lib/prisma.ts | Connection pool config | TBD |

---

## 2. ĐIỀU KIỆN ROLLBACK

### Tự động Rollback nếu:
- [x] Query performance degrades > 50%
- [x] Index creation causes lock timeout
- [x] Disk space critical (< 10% free)

### Manual Rollback nếu:
- [x] Stakeholder yêu cầu
- [x] Unexpected query plan changes

---

## 3. QUY TRÌNH ROLLBACK

### 3.1 Drop All New Indexes
```sql
-- Run in order
DROP INDEX IF EXISTS idx_work_orders_status;
DROP INDEX IF EXISTS idx_work_orders_product;
DROP INDEX IF EXISTS idx_sales_orders_customer_date;
DROP INDEX IF EXISTS idx_purchase_orders_supplier_status;
DROP INDEX IF EXISTS idx_parts_category_status;
DROP INDEX IF EXISTS idx_inventory_part_location;
DROP INDEX IF EXISTS idx_work_orders_active;
DROP INDEX IF EXISTS idx_sales_orders_pending;
```

### 3.2 Revert Prisma Schema
```bash
git checkout HEAD~1 -- prisma/schema.prisma
npx prisma generate
```

---

## 4. VERIFICATION CHECKLIST

### Trước khi Deploy:
- [ ] Backup database completed
- [ ] Disk space > 20% free
- [ ] Off-peak hours (if possible)

### Sau khi Deploy:
- [ ] All indexes created successfully
- [ ] Query plans using new indexes (EXPLAIN ANALYZE)
- [ ] Response times improved or stable
- [ ] No lock timeouts

### Sau khi Rollback (if needed):
- [ ] All indexes dropped
- [ ] Application functioning normally
- [ ] Performance back to baseline

---

**Approved by:** _______________
**Date:** _______________
