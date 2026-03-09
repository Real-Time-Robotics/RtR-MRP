import { describe, it, expect } from 'vitest';
import {
  dataService,
  mockSuppliers,
  mockCustomers,
  mockParts,
  mockBOMItems,
  mockInventory,
  mockSalesOrders,
  mockWorkOrders,
  mockQualityRecords,
  mockActivityLog,
} from '../data-service';
import type {
  Supplier,
  Customer,
  Part,
  BOMItem,
  Inventory,
  SalesOrder,
  WorkOrder,
  QualityRecord,
  ActivityLog,
  DashboardStats,
} from '../data-service';

// =============================================================================
// Mock Data Exports
// =============================================================================

describe('Mock data exports', () => {
  describe('mockSuppliers', () => {
    it('should export an array of suppliers', () => {
      expect(Array.isArray(mockSuppliers)).toBe(true);
      expect(mockSuppliers.length).toBe(5);
    });

    it('should have unique IDs', () => {
      const ids = mockSuppliers.map(s => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have unique codes', () => {
      const codes = mockSuppliers.map(s => s.code);
      expect(new Set(codes).size).toBe(codes.length);
    });

    it('should have all required fields', () => {
      for (const s of mockSuppliers) {
        expect(s.id).toBeDefined();
        expect(s.code).toBeDefined();
        expect(s.name).toBeDefined();
        expect(s.country).toBe('Vietnam');
        expect(typeof s.leadTime).toBe('number');
        expect(typeof s.rating).toBe('number');
        expect(s.isActive).toBe(true);
        expect(s.createdAt).toBeInstanceOf(Date);
        expect(s.updatedAt).toBeInstanceOf(Date);
      }
    });
  });

  describe('mockCustomers', () => {
    it('should export an array of customers', () => {
      expect(Array.isArray(mockCustomers)).toBe(true);
      expect(mockCustomers.length).toBe(5);
    });

    it('should have unique IDs and codes', () => {
      const ids = mockCustomers.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
      const codes = mockCustomers.map(c => c.code);
      expect(new Set(codes).size).toBe(codes.length);
    });

    it('should all be active and in Vietnam', () => {
      for (const c of mockCustomers) {
        expect(c.isActive).toBe(true);
        expect(c.country).toBe('Vietnam');
      }
    });
  });

  describe('mockParts', () => {
    it('should export an array of parts', () => {
      expect(Array.isArray(mockParts)).toBe(true);
      expect(mockParts.length).toBe(12);
    });

    it('should have 3 finished goods', () => {
      const fg = mockParts.filter(p => p.category === 'FINISHED_GOOD');
      expect(fg.length).toBe(3);
    });

    it('should have 6 components', () => {
      const comp = mockParts.filter(p => p.category === 'COMPONENT');
      expect(comp.length).toBe(6);
    });

    it('should have 3 raw materials', () => {
      const rm = mockParts.filter(p => p.category === 'RAW_MATERIAL');
      expect(rm.length).toBe(3);
    });

    it('should have unique part numbers', () => {
      const numbers = mockParts.map(p => p.partNumber);
      expect(new Set(numbers).size).toBe(numbers.length);
    });
  });

  describe('mockBOMItems', () => {
    it('should export BOM items', () => {
      expect(Array.isArray(mockBOMItems)).toBe(true);
      expect(mockBOMItems.length).toBe(16);
    });

    it('should have BOM items for fg1, fg2, fg3', () => {
      const fg1Bom = mockBOMItems.filter(b => b.parentPartId === 'fg1');
      const fg2Bom = mockBOMItems.filter(b => b.parentPartId === 'fg2');
      const fg3Bom = mockBOMItems.filter(b => b.parentPartId === 'fg3');
      expect(fg1Bom.length).toBe(6);
      expect(fg2Bom.length).toBe(6);
      expect(fg3Bom.length).toBe(4);
    });
  });

  describe('mockInventory', () => {
    it('should export 12 inventory records', () => {
      expect(mockInventory.length).toBe(12);
    });

    it('should have each record linked to a valid part', () => {
      const partIds = new Set(mockParts.map(p => p.id));
      for (const inv of mockInventory) {
        expect(partIds.has(inv.partId)).toBe(true);
      }
    });
  });

  describe('mockSalesOrders', () => {
    it('should export 5 sales orders', () => {
      expect(mockSalesOrders.length).toBe(5);
    });

    it('should have items on each order', () => {
      for (const so of mockSalesOrders) {
        expect(so.items).toBeDefined();
        expect(so.items!.length).toBeGreaterThan(0);
      }
    });
  });

  describe('mockWorkOrders', () => {
    it('should export 4 work orders', () => {
      expect(mockWorkOrders.length).toBe(4);
    });

    it('should have various statuses', () => {
      const statuses = new Set(mockWorkOrders.map(wo => wo.status));
      expect(statuses.has('RELEASED')).toBe(true);
      expect(statuses.has('IN_PROGRESS')).toBe(true);
      expect(statuses.has('COMPLETED')).toBe(true);
      expect(statuses.has('PLANNED')).toBe(true);
    });
  });

  describe('mockQualityRecords', () => {
    it('should export 3 quality records', () => {
      expect(mockQualityRecords.length).toBe(3);
    });

    it('should all be NCR type', () => {
      for (const r of mockQualityRecords) {
        expect(r.type).toBe('NCR');
      }
    });
  });

  describe('mockActivityLog', () => {
    it('should export 5 activity entries', () => {
      expect(mockActivityLog.length).toBe(5);
    });
  });
});

// =============================================================================
// DataService - Suppliers
// =============================================================================

describe('dataService.getSuppliers', () => {
  it('should return all suppliers', async () => {
    const suppliers = await dataService.getSuppliers();
    expect(suppliers).toEqual(mockSuppliers);
    expect(suppliers.length).toBe(5);
  });
});

describe('dataService.getSupplierById', () => {
  it('should return a supplier by ID', async () => {
    const supplier = await dataService.getSupplierById('s1');
    expect(supplier).not.toBeNull();
    expect(supplier!.code).toBe('SKF-VN');
    expect(supplier!.name).toBe('SKF Vietnam');
  });

  it('should return null for non-existent ID', async () => {
    const supplier = await dataService.getSupplierById('nonexistent');
    expect(supplier).toBeNull();
  });

  it('should find each supplier by its id', async () => {
    for (const s of mockSuppliers) {
      const found = await dataService.getSupplierById(s.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(s.id);
    }
  });
});

// =============================================================================
// DataService - Customers
// =============================================================================

describe('dataService.getCustomers', () => {
  it('should return all customers', async () => {
    const customers = await dataService.getCustomers();
    expect(customers).toEqual(mockCustomers);
    expect(customers.length).toBe(5);
  });
});

describe('dataService.getCustomerById', () => {
  it('should return a customer by ID', async () => {
    const customer = await dataService.getCustomerById('c1');
    expect(customer).not.toBeNull();
    expect(customer!.code).toBe('ABC-MFG');
  });

  it('should return null for non-existent ID', async () => {
    const customer = await dataService.getCustomerById('nonexistent');
    expect(customer).toBeNull();
  });
});

// =============================================================================
// DataService - Parts
// =============================================================================

describe('dataService.getParts', () => {
  it('should return all parts when no category specified', async () => {
    const parts = await dataService.getParts();
    expect(parts.length).toBe(12);
  });

  it('should filter by FINISHED_GOOD category', async () => {
    const parts = await dataService.getParts('FINISHED_GOOD');
    expect(parts.length).toBe(3);
    for (const p of parts) {
      expect(p.category).toBe('FINISHED_GOOD');
    }
  });

  it('should filter by COMPONENT category', async () => {
    const parts = await dataService.getParts('COMPONENT');
    expect(parts.length).toBe(6);
    for (const p of parts) {
      expect(p.category).toBe('COMPONENT');
    }
  });

  it('should filter by RAW_MATERIAL category', async () => {
    const parts = await dataService.getParts('RAW_MATERIAL');
    expect(parts.length).toBe(3);
  });

  it('should return empty array for category with no parts', async () => {
    const parts = await dataService.getParts('CONSUMABLE');
    expect(parts).toEqual([]);
  });
});

describe('dataService.getPartById', () => {
  it('should return a part by ID', async () => {
    const part = await dataService.getPartById('fg1');
    expect(part).not.toBeNull();
    expect(part!.partNumber).toBe('FG-PRD-A1');
  });

  it('should return null for non-existent ID', async () => {
    const part = await dataService.getPartById('nonexistent');
    expect(part).toBeNull();
  });
});

describe('dataService.getPartByNumber', () => {
  it('should return a part by partNumber', async () => {
    const part = await dataService.getPartByNumber('CMP-BRG-002');
    expect(part).not.toBeNull();
    expect(part!.id).toBe('p1');
    expect(part!.partName).toBe('Bạc đạn bi 6201-2RS');
  });

  it('should return null for non-existent partNumber', async () => {
    const part = await dataService.getPartByNumber('NONEXISTENT');
    expect(part).toBeNull();
  });
});

// =============================================================================
// DataService - BOM
// =============================================================================

describe('dataService.getBOMForPart', () => {
  it('should return BOM items for fg1 with child parts populated', async () => {
    const bom = await dataService.getBOMForPart('fg1');
    expect(bom.length).toBe(6);
    // Each BOM item should have childPart populated
    for (const item of bom) {
      expect(item.parentPartId).toBe('fg1');
      expect(item.childPart).toBeDefined();
    }
  });

  it('should return BOM items for fg2', async () => {
    const bom = await dataService.getBOMForPart('fg2');
    expect(bom.length).toBe(6);
  });

  it('should return BOM items for fg3', async () => {
    const bom = await dataService.getBOMForPart('fg3');
    expect(bom.length).toBe(4);
  });

  it('should return empty array for part with no BOM', async () => {
    const bom = await dataService.getBOMForPart('p1');
    expect(bom).toEqual([]);
  });

  it('should return empty array for non-existent part', async () => {
    const bom = await dataService.getBOMForPart('nonexistent');
    expect(bom).toEqual([]);
  });
});

// =============================================================================
// DataService - Inventory
// =============================================================================

describe('dataService.getInventory', () => {
  it('should return all inventory items with parts populated', async () => {
    const inventory = await dataService.getInventory();
    expect(inventory.length).toBe(12);
    for (const inv of inventory) {
      expect(inv.part).toBeDefined();
    }
  });

  it('should have correct part linked to each inventory item', async () => {
    const inventory = await dataService.getInventory();
    const inv1 = inventory.find(i => i.id === 'inv1');
    expect(inv1).toBeDefined();
    expect(inv1!.part!.id).toBe('p1');
  });
});

describe('dataService.getInventoryByPartId', () => {
  it('should return inventory for a valid partId', async () => {
    const inv = await dataService.getInventoryByPartId('p1');
    expect(inv).not.toBeNull();
    expect(inv!.partId).toBe('p1');
    expect(inv!.part).toBeDefined();
    expect(inv!.part!.id).toBe('p1');
  });

  it('should return null for non-existent partId', async () => {
    const inv = await dataService.getInventoryByPartId('nonexistent');
    expect(inv).toBeNull();
  });

  it('should return inventory for finished goods', async () => {
    const inv = await dataService.getInventoryByPartId('fg1');
    expect(inv).not.toBeNull();
    expect(inv!.onHand).toBe(5);
  });
});

describe('dataService.getLowStockItems', () => {
  it('should return items where available <= reorderPoint', async () => {
    const lowStock = await dataService.getLowStockItems();
    expect(lowStock.length).toBeGreaterThan(0);
    for (const inv of lowStock) {
      expect(inv.available).toBeLessThanOrEqual(inv.reorderPoint);
      expect(inv.part).toBeDefined();
    }
  });
});

describe('dataService.getCriticalStockItems', () => {
  it('should return items where available <= safetyStock', async () => {
    const critical = await dataService.getCriticalStockItems();
    expect(critical.length).toBeGreaterThan(0);
    for (const inv of critical) {
      expect(inv.available).toBeLessThanOrEqual(inv.safetyStock);
      expect(inv.part).toBeDefined();
    }
  });
});

// =============================================================================
// DataService - Sales Orders
// =============================================================================

describe('dataService.getSalesOrders', () => {
  it('should return all sales orders with customer populated', async () => {
    const orders = await dataService.getSalesOrders();
    expect(orders.length).toBe(5);
    for (const o of orders) {
      expect(o.customer).toBeDefined();
    }
  });

  it('should filter by CONFIRMED status', async () => {
    const orders = await dataService.getSalesOrders('CONFIRMED');
    expect(orders.length).toBe(2); // so1, so3
    for (const o of orders) {
      expect(o.status).toBe('CONFIRMED');
    }
  });

  it('should filter by PENDING status', async () => {
    const orders = await dataService.getSalesOrders('PENDING');
    expect(orders.length).toBe(1);
    expect(orders[0].orderNumber).toBe('SO-2025-002');
  });

  it('should filter by SHIPPED status', async () => {
    const orders = await dataService.getSalesOrders('SHIPPED');
    expect(orders.length).toBe(1);
  });

  it('should filter by IN_PRODUCTION status', async () => {
    const orders = await dataService.getSalesOrders('IN_PRODUCTION');
    expect(orders.length).toBe(1);
  });

  it('should return empty for CANCELLED status', async () => {
    const orders = await dataService.getSalesOrders('CANCELLED');
    expect(orders.length).toBe(0);
  });
});

describe('dataService.getSalesOrderById', () => {
  it('should return a sales order by ID with customer and item parts', async () => {
    const order = await dataService.getSalesOrderById('so1');
    expect(order).not.toBeNull();
    expect(order!.orderNumber).toBe('SO-2025-001');
    expect(order!.customer).toBeDefined();
    expect(order!.customer!.id).toBe('c1');
    expect(order!.items).toBeDefined();
    expect(order!.items!.length).toBeGreaterThan(0);
    expect(order!.items![0].part).toBeDefined();
  });

  it('should return null for non-existent ID', async () => {
    const order = await dataService.getSalesOrderById('nonexistent');
    expect(order).toBeNull();
  });
});

// =============================================================================
// DataService - Work Orders
// =============================================================================

describe('dataService.getWorkOrders', () => {
  it('should return all work orders when no status given', async () => {
    const orders = await dataService.getWorkOrders();
    expect(orders.length).toBe(4);
  });

  it('should filter by IN_PROGRESS status', async () => {
    const orders = await dataService.getWorkOrders('IN_PROGRESS');
    expect(orders.length).toBe(1);
    expect(orders[0].status).toBe('IN_PROGRESS');
  });

  it('should filter by COMPLETED status', async () => {
    const orders = await dataService.getWorkOrders('COMPLETED');
    expect(orders.length).toBe(1);
    expect(orders[0].orderNumber).toBe('WO-2024-048');
  });

  it('should filter by PLANNED status', async () => {
    const orders = await dataService.getWorkOrders('PLANNED');
    expect(orders.length).toBe(1);
  });

  it('should filter by RELEASED status', async () => {
    const orders = await dataService.getWorkOrders('RELEASED');
    expect(orders.length).toBe(1);
  });

  it('should return empty for ON_HOLD status', async () => {
    const orders = await dataService.getWorkOrders('ON_HOLD');
    expect(orders.length).toBe(0);
  });
});

// =============================================================================
// DataService - Quality Records
// =============================================================================

describe('dataService.getQualityRecords', () => {
  it('should return all quality records when no status given', async () => {
    const records = await dataService.getQualityRecords();
    expect(records.length).toBe(3);
  });

  it('should filter by OPEN status', async () => {
    const records = await dataService.getQualityRecords('OPEN');
    expect(records.length).toBe(1);
    expect(records[0].recordNumber).toBe('NCR-2025-001');
  });

  it('should filter by CLOSED status', async () => {
    const records = await dataService.getQualityRecords('CLOSED');
    expect(records.length).toBe(1);
    expect(records[0].recordNumber).toBe('NCR-2024-042');
  });

  it('should filter by IN_PROGRESS status', async () => {
    const records = await dataService.getQualityRecords('IN_PROGRESS');
    expect(records.length).toBe(1);
  });

  it('should return empty for PENDING_APPROVAL status', async () => {
    const records = await dataService.getQualityRecords('PENDING_APPROVAL');
    expect(records.length).toBe(0);
  });
});

describe('dataService.getOpenNCRs', () => {
  it('should return NCRs that are not CLOSED or CANCELLED', async () => {
    const openNCRs = await dataService.getOpenNCRs();
    expect(openNCRs.length).toBe(2);
    for (const ncr of openNCRs) {
      expect(ncr.type).toBe('NCR');
      expect(ncr.status).not.toBe('CLOSED');
      expect(ncr.status).not.toBe('CANCELLED');
    }
  });
});

// =============================================================================
// DataService - Activity
// =============================================================================

describe('dataService.getRecentActivity', () => {
  it('should return all activities when limit is large', async () => {
    const activities = await dataService.getRecentActivity(100);
    expect(activities.length).toBe(5);
  });

  it('should default to 10 limit', async () => {
    const activities = await dataService.getRecentActivity();
    expect(activities.length).toBe(5); // only 5 exist, less than default 10
  });

  it('should respect limit parameter', async () => {
    const activities = await dataService.getRecentActivity(2);
    expect(activities.length).toBe(2);
    expect(activities[0].id).toBe('act1');
    expect(activities[1].id).toBe('act2');
  });

  it('should return empty array when limit is 0', async () => {
    const activities = await dataService.getRecentActivity(0);
    expect(activities.length).toBe(0);
  });
});

// =============================================================================
// DataService - Dashboard Stats
// =============================================================================

describe('dataService.getDashboardStats', () => {
  let stats: DashboardStats;

  it('should return dashboard stats object', async () => {
    stats = await dataService.getDashboardStats();
    expect(stats).toBeDefined();
    expect(stats.revenue).toBeDefined();
    expect(stats.orders).toBeDefined();
    expect(stats.inventory).toBeDefined();
    expect(stats.production).toBeDefined();
    expect(stats.quality).toBeDefined();
    expect(stats.purchasing).toBeDefined();
  });

  it('should have revenue stats with correct currency', async () => {
    stats = await dataService.getDashboardStats();
    expect(stats.revenue.currency).toBe('VND');
    expect(typeof stats.revenue.current).toBe('number');
    expect(typeof stats.revenue.previous).toBe('number');
    expect(typeof stats.revenue.growth).toBe('number');
  });

  it('should have order stats that add up correctly', async () => {
    stats = await dataService.getDashboardStats();
    expect(stats.orders.total).toBe(5);
    // pending + processing + completed + cancelled should be <= total
    const sum = stats.orders.pending + stats.orders.processing + stats.orders.completed + stats.orders.cancelled;
    expect(sum).toBeLessThanOrEqual(stats.orders.total);
  });

  it('should have correct order status counts', async () => {
    stats = await dataService.getDashboardStats();
    expect(stats.orders.pending).toBe(1); // so2
    expect(stats.orders.processing).toBe(3); // so1(CONFIRMED), so3(CONFIRMED), so4(IN_PRODUCTION)
    expect(stats.orders.completed).toBe(1); // so5(SHIPPED)
    expect(stats.orders.cancelled).toBe(0);
  });

  it('should have inventory stats', async () => {
    stats = await dataService.getDashboardStats();
    expect(stats.inventory.totalItems).toBe(12);
    expect(stats.inventory.totalValue).toBeGreaterThan(0);
    expect(typeof stats.inventory.lowStock).toBe('number');
    expect(typeof stats.inventory.outOfStock).toBe('number');
    expect(stats.inventory.healthy).toBe(
      stats.inventory.totalItems - stats.inventory.lowStock - stats.inventory.outOfStock
    );
  });

  it('should have production stats', async () => {
    stats = await dataService.getDashboardStats();
    expect(stats.production.running).toBe(1); // wo2
    expect(stats.production.waiting).toBe(2); // wo1(RELEASED), wo4(PLANNED)
    expect(stats.production.completed).toBe(1); // wo3
    expect(stats.production.onHold).toBe(0);
    expect(typeof stats.production.efficiency).toBe('number');
  });

  it('should have quality stats', async () => {
    stats = await dataService.getDashboardStats();
    expect(stats.quality.passRate).toBe(98.2);
    expect(stats.quality.openNCRs).toBe(2); // ncr1(OPEN), ncr3(IN_PROGRESS)
    expect(stats.quality.criticalNCRs).toBe(0); // none are CRITICAL
    expect(stats.quality.inspectionsToday).toBe(24);
  });

  it('should have purchasing stats', async () => {
    stats = await dataService.getDashboardStats();
    expect(stats.purchasing.pendingPOs).toBe(3);
    expect(stats.purchasing.pendingValue).toBe(45000000);
    expect(stats.purchasing.overdueDeliveries).toBe(1);
  });
});
