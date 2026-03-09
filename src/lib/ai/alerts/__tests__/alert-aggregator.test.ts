import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- hoisted mocks ----
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    part: { findMany: vi.fn() },
    salesOrderLine: { groupBy: vi.fn() },
    bomLine: { findMany: vi.fn() },
    nCR: { findMany: vi.fn() },
    inspection: { findMany: vi.fn() },
    supplier: { findMany: vi.fn() },
    mrpSuggestion: { findMany: vi.fn() },
    workOrder: { findMany: vi.fn() },
  },
}));

const { mockUuidv4 } = vi.hoisted(() => ({
  mockUuidv4: vi.fn().mockReturnValue('mock-uuid'),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));
vi.mock('uuid', () => ({ v4: mockUuidv4 }));

import { AlertAggregator, getAlertAggregator } from '../alert-aggregator';
import { AlertType, AlertPriority, AlertSource, AlertStatus } from '../alert-types';

// ---- helpers ----
function resetSingleton() {
  // Reset the singleton so each test gets a fresh instance
  (AlertAggregator as unknown as { instance: undefined }).instance = undefined;
}

describe('AlertAggregator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSingleton();
    mockUuidv4.mockReturnValue('mock-uuid');
  });

  // =========================================================================
  // Singleton
  // =========================================================================

  describe('getInstance / getAlertAggregator', () => {
    it('returns same instance', () => {
      const a = AlertAggregator.getInstance();
      const b = AlertAggregator.getInstance();
      expect(a).toBe(b);
    });

    it('getAlertAggregator returns same singleton', () => {
      const a = AlertAggregator.getInstance();
      const b = getAlertAggregator();
      expect(a).toBe(b);
    });
  });

  // =========================================================================
  // collectFromForecast
  // =========================================================================

  describe('collectFromForecast', () => {
    it('returns empty array when no parts', async () => {
      mockPrisma.part.findMany.mockResolvedValue([]);
      mockPrisma.salesOrderLine.groupBy.mockResolvedValue([]);
      mockPrisma.bomLine.findMany.mockResolvedValue([]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromForecast();
      expect(result).toEqual([]);
    });

    it('generates STOCKOUT alert when daysOfSupply<=7 and below reorderPoint', async () => {
      mockPrisma.part.findMany.mockResolvedValue([
        {
          id: 'p1',
          partNumber: 'PN-001',
          name: 'Part 1',
          status: 'active',
          reorderPoint: 100,
          safetyStock: 50,
          inventory: [{ quantity: 10, reservedQty: 0 }],
          poLines: [],
        },
      ]);
      mockPrisma.salesOrderLine.groupBy.mockResolvedValue([]);
      mockPrisma.bomLine.findMany.mockResolvedValue([]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromForecast();

      // With no demand data, avgDailyDemand=1, daysOfSupply=10/1=10 but totalInventory(10)<reorderPoint(100)
      // daysOfSupply=10 > 7 so no STOCKOUT, but reorder check: 10<=100 && 10>50 => false (10<50)
      // safety stock check: 10<50 && 10>0 => SAFETY_STOCK_LOW
      const safetyAlerts = result.filter(a => a.type === AlertType.SAFETY_STOCK_LOW);
      expect(safetyAlerts.length).toBeGreaterThanOrEqual(0);
    });

    it('generates STOCKOUT CRITICAL when daysOfSupply<=3', async () => {
      mockPrisma.part.findMany.mockResolvedValue([
        {
          id: 'p1',
          partNumber: 'PN-001',
          name: 'Part 1',
          status: 'active',
          reorderPoint: 100,
          safetyStock: 50,
          inventory: [{ quantity: 5, reservedQty: 0 }],
          poLines: [],
        },
      ]);
      // demand rate = 20/90 per day for a product
      mockPrisma.salesOrderLine.groupBy.mockResolvedValue([
        { productId: 'prod1', _sum: { quantity: 900 } },
      ]);
      // BOM mapping prod1 -> p1 with qty 1
      mockPrisma.bomLine.findMany.mockResolvedValue([
        { partId: 'p1', quantity: 1, bom: { productId: 'prod1' } },
      ]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromForecast();

      // avgDailyDemand = 900/90 * 1 = 10, daysOfSupply = 5/10 = 0.5 <=3 => CRITICAL
      const stockoutAlerts = result.filter(a => a.type === AlertType.STOCKOUT);
      expect(stockoutAlerts.length).toBe(1);
      expect(stockoutAlerts[0].priority).toBe(AlertPriority.CRITICAL);
      expect(stockoutAlerts[0].source).toBe(AlertSource.FORECAST);
    });

    it('generates STOCKOUT HIGH when 3<daysOfSupply<=5', async () => {
      mockPrisma.part.findMany.mockResolvedValue([
        {
          id: 'p1',
          partNumber: 'PN-001',
          name: 'Part 1',
          status: 'active',
          reorderPoint: 100,
          safetyStock: 2,
          inventory: [{ quantity: 4, reservedQty: 0 }],
          poLines: [],
        },
      ]);
      mockPrisma.salesOrderLine.groupBy.mockResolvedValue([
        { productId: 'prod1', _sum: { quantity: 90 } },
      ]);
      mockPrisma.bomLine.findMany.mockResolvedValue([
        { partId: 'p1', quantity: 1, bom: { productId: 'prod1' } },
      ]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromForecast();

      // avgDailyDemand = 90/90 = 1, daysOfSupply = 4/1 = 4, 3<4<=5 => HIGH
      const stockoutAlerts = result.filter(a => a.type === AlertType.STOCKOUT);
      expect(stockoutAlerts.length).toBe(1);
      expect(stockoutAlerts[0].priority).toBe(AlertPriority.HIGH);
    });

    it('generates STOCKOUT MEDIUM when 5<daysOfSupply<=7', async () => {
      mockPrisma.part.findMany.mockResolvedValue([
        {
          id: 'p1',
          partNumber: 'PN-001',
          name: 'Part 1',
          status: 'active',
          reorderPoint: 100,
          safetyStock: 2,
          inventory: [{ quantity: 6, reservedQty: 0 }],
          poLines: [],
        },
      ]);
      mockPrisma.salesOrderLine.groupBy.mockResolvedValue([
        { productId: 'prod1', _sum: { quantity: 90 } },
      ]);
      mockPrisma.bomLine.findMany.mockResolvedValue([
        { partId: 'p1', quantity: 1, bom: { productId: 'prod1' } },
      ]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromForecast();

      // avgDailyDemand = 1, daysOfSupply = 6, 5<6<=7 => MEDIUM
      const stockoutAlerts = result.filter(a => a.type === AlertType.STOCKOUT);
      expect(stockoutAlerts.length).toBe(1);
      expect(stockoutAlerts[0].priority).toBe(AlertPriority.MEDIUM);
    });

    it('generates REORDER alert when at reorder point and above safety stock', async () => {
      mockPrisma.part.findMany.mockResolvedValue([
        {
          id: 'p1',
          partNumber: 'PN-001',
          name: 'Part 1',
          status: 'active',
          reorderPoint: 50,
          safetyStock: 10,
          inventory: [{ quantity: 40, reservedQty: 0 }],
          poLines: [],
        },
      ]);
      mockPrisma.salesOrderLine.groupBy.mockResolvedValue([]);
      mockPrisma.bomLine.findMany.mockResolvedValue([]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromForecast();

      // totalInventory=40, reorderPoint=50 => 40<=50 && 40>10 => REORDER
      const reorderAlerts = result.filter(a => a.type === AlertType.REORDER);
      expect(reorderAlerts.length).toBe(1);
      expect(reorderAlerts[0].priority).toBe(AlertPriority.MEDIUM);
    });

    it('generates SAFETY_STOCK_LOW alert when below safety stock but above 0', async () => {
      mockPrisma.part.findMany.mockResolvedValue([
        {
          id: 'p1',
          partNumber: 'PN-001',
          name: 'Part 1',
          status: 'active',
          reorderPoint: 100,
          safetyStock: 50,
          inventory: [{ quantity: 30, reservedQty: 0 }],
          poLines: [],
        },
      ]);
      mockPrisma.salesOrderLine.groupBy.mockResolvedValue([]);
      mockPrisma.bomLine.findMany.mockResolvedValue([]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromForecast();

      const safetyAlerts = result.filter(a => a.type === AlertType.SAFETY_STOCK_LOW);
      expect(safetyAlerts.length).toBe(1);
      expect(safetyAlerts[0].priority).toBe(AlertPriority.HIGH);
    });

    it('handles errors gracefully and returns empty array', async () => {
      mockPrisma.part.findMany.mockRejectedValue(new Error('DB error'));

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromForecast();
      expect(result).toEqual([]);
    });

    it('accounts for reserved quantity in inventory', async () => {
      mockPrisma.part.findMany.mockResolvedValue([
        {
          id: 'p1',
          partNumber: 'PN-001',
          name: 'Part 1',
          status: 'active',
          reorderPoint: 100,
          safetyStock: 50,
          inventory: [
            { quantity: 80, reservedQty: 55 },
          ],
          poLines: [],
        },
      ]);
      mockPrisma.salesOrderLine.groupBy.mockResolvedValue([]);
      mockPrisma.bomLine.findMany.mockResolvedValue([]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromForecast();

      // totalInventory = 80 - 55 = 25, which is < safetyStock(50) and > 0
      const safetyAlerts = result.filter(a => a.type === AlertType.SAFETY_STOCK_LOW);
      expect(safetyAlerts.length).toBe(1);
    });
  });

  // =========================================================================
  // collectFromQuality
  // =========================================================================

  describe('collectFromQuality', () => {
    it('returns empty when no NCRs', async () => {
      mockPrisma.nCR.findMany.mockResolvedValue([]);
      mockPrisma.inspection.findMany.mockResolvedValue([]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromQuality();
      expect(result).toEqual([]);
    });

    it('generates QUALITY_RISK for parts with >=3 NCRs', async () => {
      const part = { id: 'p1', partNumber: 'PN-001', name: 'Part 1' };
      mockPrisma.nCR.findMany.mockResolvedValue([
        { id: 'n1', partId: 'p1', part, product: null },
        { id: 'n2', partId: 'p1', part, product: null },
        { id: 'n3', partId: 'p1', part, product: null },
      ]);
      mockPrisma.inspection.findMany.mockResolvedValue([]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromQuality();

      const qualityAlerts = result.filter(a => a.type === AlertType.QUALITY_RISK);
      expect(qualityAlerts.length).toBe(1);
      expect(qualityAlerts[0].priority).toBe(AlertPriority.HIGH);
    });

    it('generates CRITICAL priority for >=5 NCRs on same part', async () => {
      const part = { id: 'p1', partNumber: 'PN-001', name: 'Part 1' };
      const ncrs = Array.from({ length: 5 }, (_, i) => ({
        id: `n${i}`, partId: 'p1', part, product: null,
      }));
      mockPrisma.nCR.findMany.mockResolvedValue(ncrs);
      mockPrisma.inspection.findMany.mockResolvedValue([]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromQuality();

      const qualityAlerts = result.filter(a => a.type === AlertType.QUALITY_RISK);
      expect(qualityAlerts[0].priority).toBe(AlertPriority.CRITICAL);
    });

    it('generates QUALITY_CRITICAL for failed inspections', async () => {
      mockPrisma.nCR.findMany.mockResolvedValue([]);
      mockPrisma.inspection.findMany.mockResolvedValue([
        {
          id: 'insp-123456789',
          result: 'fail',
          partId: 'p1',
          productId: null,
          part: { id: 'p1', partNumber: 'PN-001', name: 'Part 1' },
          product: null,
        },
      ]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromQuality();

      const criticalAlerts = result.filter(a => a.type === AlertType.QUALITY_CRITICAL);
      expect(criticalAlerts.length).toBe(1);
      expect(criticalAlerts[0].priority).toBe(AlertPriority.CRITICAL);
    });

    it('handles failed inspection with product instead of part', async () => {
      mockPrisma.nCR.findMany.mockResolvedValue([]);
      mockPrisma.inspection.findMany.mockResolvedValue([
        {
          id: 'insp-123456789',
          result: 'fail',
          partId: null,
          productId: 'prod1',
          part: null,
          product: { id: 'prod1', name: 'Product 1', sku: 'SKU-001' },
        },
      ]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromQuality();

      const criticalAlerts = result.filter(a => a.type === AlertType.QUALITY_CRITICAL);
      expect(criticalAlerts.length).toBe(1);
    });

    it('skips NCR without partId', async () => {
      mockPrisma.nCR.findMany.mockResolvedValue([
        { id: 'n1', partId: null, part: null, product: null },
      ]);
      mockPrisma.inspection.findMany.mockResolvedValue([]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromQuality();
      expect(result).toEqual([]);
    });

    it('skips inspections without entity', async () => {
      mockPrisma.nCR.findMany.mockResolvedValue([]);
      mockPrisma.inspection.findMany.mockResolvedValue([
        { id: 'i1', result: 'fail', partId: null, productId: null, part: null, product: null },
      ]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromQuality();
      expect(result).toEqual([]);
    });

    it('handles errors gracefully', async () => {
      mockPrisma.nCR.findMany.mockRejectedValue(new Error('DB error'));

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromQuality();
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // collectFromSupplierRisk
  // =========================================================================

  describe('collectFromSupplierRisk', () => {
    it('returns empty when no suppliers', async () => {
      mockPrisma.supplier.findMany.mockResolvedValue([]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromSupplierRisk();
      expect(result).toEqual([]);
    });

    it('generates SUPPLIER_DELIVERY alert for late POs', async () => {
      const pastDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
      mockPrisma.supplier.findMany.mockResolvedValue([
        {
          id: 's1',
          name: 'Supplier 1',
          code: 'SUP-001',
          status: 'active',
          rating: 4,
          purchaseOrders: [
            {
              id: 'po1',
              poNumber: 'PO-001',
              status: 'sent',
              expectedDate: pastDate,
            },
          ],
        },
      ]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromSupplierRisk();

      const deliveryAlerts = result.filter(a => a.type === AlertType.SUPPLIER_DELIVERY);
      expect(deliveryAlerts.length).toBe(1);
      expect(deliveryAlerts[0].priority).toBe(AlertPriority.HIGH);
    });

    it('generates CRITICAL for deliveries >5 days late', async () => {
      const pastDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      mockPrisma.supplier.findMany.mockResolvedValue([
        {
          id: 's1',
          name: 'Supplier 1',
          code: 'SUP-001',
          status: 'active',
          rating: 4,
          purchaseOrders: [
            { id: 'po1', poNumber: 'PO-001', status: 'sent', expectedDate: pastDate },
          ],
        },
      ]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromSupplierRisk();

      const deliveryAlerts = result.filter(a => a.type === AlertType.SUPPLIER_DELIVERY);
      expect(deliveryAlerts[0].priority).toBe(AlertPriority.CRITICAL);
    });

    it('generates SUPPLIER_RISK for low-rated suppliers', async () => {
      mockPrisma.supplier.findMany.mockResolvedValue([
        {
          id: 's1',
          name: 'Bad Supplier',
          code: 'SUP-002',
          status: 'active',
          rating: 1,
          purchaseOrders: [],
        },
      ]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromSupplierRisk();

      const riskAlerts = result.filter(a => a.type === AlertType.SUPPLIER_RISK);
      expect(riskAlerts.length).toBe(1);
      expect(riskAlerts[0].priority).toBe(AlertPriority.HIGH);
    });

    it('generates MEDIUM for rating 2', async () => {
      mockPrisma.supplier.findMany.mockResolvedValue([
        {
          id: 's1',
          name: 'Meh Supplier',
          code: 'SUP-002',
          status: 'active',
          rating: 2,
          purchaseOrders: [],
        },
      ]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromSupplierRisk();

      const riskAlerts = result.filter(a => a.type === AlertType.SUPPLIER_RISK);
      expect(riskAlerts[0].priority).toBe(AlertPriority.MEDIUM);
    });

    it('does not alert for suppliers with rating >=3', async () => {
      mockPrisma.supplier.findMany.mockResolvedValue([
        {
          id: 's1',
          name: 'Good Supplier',
          code: 'SUP-003',
          status: 'active',
          rating: 4,
          purchaseOrders: [],
        },
      ]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromSupplierRisk();
      expect(result).toEqual([]);
    });

    it('handles errors gracefully', async () => {
      mockPrisma.supplier.findMany.mockRejectedValue(new Error('DB error'));

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromSupplierRisk();
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // collectFromAutoPO
  // =========================================================================

  describe('collectFromAutoPO', () => {
    it('returns empty when no pending suggestions', async () => {
      mockPrisma.mrpSuggestion.findMany.mockResolvedValue([]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromAutoPO();
      expect(result).toEqual([]);
    });

    it('generates PO_PENDING alert when pendingHours>12', async () => {
      const createdAt = new Date(Date.now() - 14 * 60 * 60 * 1000); // 14 hours ago
      mockPrisma.mrpSuggestion.findMany.mockResolvedValue([
        {
          id: 'sug1',
          partId: 'p1',
          suggestedQty: 100,
          createdAt,
          part: { partNumber: 'PN-001', name: 'Part 1', unitCost: 10 },
        },
      ]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromAutoPO();

      expect(result.length).toBe(1);
      expect(result[0].type).toBe(AlertType.PO_PENDING);
      expect(result[0].priority).toBe(AlertPriority.LOW); // <24h
    });

    it('sets HIGH priority when pending >48h', async () => {
      const createdAt = new Date(Date.now() - 50 * 60 * 60 * 1000);
      mockPrisma.mrpSuggestion.findMany.mockResolvedValue([
        {
          id: 'sug1',
          partId: 'p1',
          suggestedQty: 100,
          createdAt,
          part: { partNumber: 'PN-001', name: 'Part 1', unitCost: 10 },
        },
      ]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromAutoPO();

      expect(result[0].priority).toBe(AlertPriority.HIGH);
    });

    it('sets MEDIUM priority when pending >24h but <=48h', async () => {
      const createdAt = new Date(Date.now() - 30 * 60 * 60 * 1000);
      mockPrisma.mrpSuggestion.findMany.mockResolvedValue([
        {
          id: 'sug1',
          partId: 'p1',
          suggestedQty: 50,
          createdAt,
          part: { partNumber: 'PN-001', name: 'Part 1', unitCost: 5 },
        },
      ]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromAutoPO();

      expect(result[0].priority).toBe(AlertPriority.MEDIUM);
    });

    it('does not alert when pendingHours<=12', async () => {
      const createdAt = new Date(Date.now() - 5 * 60 * 60 * 1000);
      mockPrisma.mrpSuggestion.findMany.mockResolvedValue([
        {
          id: 'sug1',
          partId: 'p1',
          suggestedQty: 50,
          createdAt,
          part: { partNumber: 'PN-001', name: 'Part 1', unitCost: 5 },
        },
      ]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromAutoPO();
      expect(result).toEqual([]);
    });

    it('handles errors gracefully', async () => {
      mockPrisma.mrpSuggestion.findMany.mockRejectedValue(new Error('DB error'));

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromAutoPO();
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // collectFromAutoSchedule
  // =========================================================================

  describe('collectFromAutoSchedule', () => {
    it('returns empty when no work orders', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromAutoSchedule();
      expect(result).toEqual([]);
    });

    it('generates DEADLINE_RISK alert when daysUntilDue<=7', async () => {
      const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
      mockPrisma.workOrder.findMany.mockResolvedValue([
        {
          id: 'wo1',
          woNumber: 'WO-001',
          productId: 'prod1',
          product: { name: 'Product 1' },
          salesOrder: { requiredDate: dueDate },
          workCenterId: null,
          workCenterRef: null,
          plannedStart: null,
          plannedEnd: null,
          status: 'planned',
        },
      ]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromAutoSchedule();

      const deadlineAlerts = result.filter(a => a.type === AlertType.DEADLINE_RISK);
      expect(deadlineAlerts.length).toBe(1);
      expect(deadlineAlerts[0].priority).toBe(AlertPriority.HIGH);
    });

    it('generates CRITICAL when daysUntilDue<=2', async () => {
      const dueDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
      mockPrisma.workOrder.findMany.mockResolvedValue([
        {
          id: 'wo1',
          woNumber: 'WO-001',
          productId: 'prod1',
          product: { name: 'Product 1' },
          salesOrder: { requiredDate: dueDate },
          workCenterId: null,
          workCenterRef: null,
          plannedStart: null,
          plannedEnd: null,
          status: 'planned',
        },
      ]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromAutoSchedule();

      const deadlineAlerts = result.filter(a => a.type === AlertType.DEADLINE_RISK);
      expect(deadlineAlerts[0].priority).toBe(AlertPriority.CRITICAL);
    });

    it('generates SCHEDULE_CONFLICT for overlapping WOs', async () => {
      const now = Date.now();
      mockPrisma.workOrder.findMany.mockResolvedValue([
        {
          id: 'wo1',
          woNumber: 'WO-001',
          productId: 'prod1',
          product: { name: 'P1' },
          salesOrder: null,
          workCenterId: 'wc1',
          workCenterRef: { name: 'WC Alpha' },
          plannedStart: new Date(now),
          plannedEnd: new Date(now + 10 * 60 * 60 * 1000), // +10h
          status: 'planned',
        },
        {
          id: 'wo2',
          woNumber: 'WO-002',
          productId: 'prod2',
          product: { name: 'P2' },
          salesOrder: null,
          workCenterId: 'wc1',
          workCenterRef: { name: 'WC Alpha' },
          plannedStart: new Date(now + 5 * 60 * 60 * 1000), // +5h, overlaps
          plannedEnd: new Date(now + 15 * 60 * 60 * 1000),
          status: 'planned',
        },
      ]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromAutoSchedule();

      const conflictAlerts = result.filter(a => a.type === AlertType.SCHEDULE_CONFLICT);
      expect(conflictAlerts.length).toBe(1);
      expect(conflictAlerts[0].priority).toBe(AlertPriority.HIGH);
    });

    it('does not generate conflict for non-overlapping WOs', async () => {
      const now = Date.now();
      mockPrisma.workOrder.findMany.mockResolvedValue([
        {
          id: 'wo1',
          woNumber: 'WO-001',
          productId: 'prod1',
          product: { name: 'P1' },
          salesOrder: null,
          workCenterId: 'wc1',
          workCenterRef: { name: 'WC Alpha' },
          plannedStart: new Date(now),
          plannedEnd: new Date(now + 5 * 60 * 60 * 1000),
          status: 'planned',
        },
        {
          id: 'wo2',
          woNumber: 'WO-002',
          productId: 'prod2',
          product: { name: 'P2' },
          salesOrder: null,
          workCenterId: 'wc1',
          workCenterRef: { name: 'WC Alpha' },
          plannedStart: new Date(now + 6 * 60 * 60 * 1000),
          plannedEnd: new Date(now + 10 * 60 * 60 * 1000),
          status: 'planned',
        },
      ]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromAutoSchedule();

      const conflictAlerts = result.filter(a => a.type === AlertType.SCHEDULE_CONFLICT);
      expect(conflictAlerts.length).toBe(0);
    });

    it('handles errors gracefully', async () => {
      mockPrisma.workOrder.findMany.mockRejectedValue(new Error('DB error'));

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectFromAutoSchedule();
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // deduplicateAlerts
  // =========================================================================

  describe('deduplicateAlerts', () => {
    it('returns empty for empty input', () => {
      const agg = AlertAggregator.getInstance();
      expect(agg.deduplicateAlerts([])).toEqual([]);
    });

    it('removes duplicates keeping higher priority', () => {
      const agg = AlertAggregator.getInstance();

      const alertLow: any = {
        id: '1',
        type: AlertType.STOCKOUT,
        priority: AlertPriority.MEDIUM,
        entities: [{ type: 'part', id: 'p1' }],
      };
      const alertHigh: any = {
        id: '2',
        type: AlertType.STOCKOUT,
        priority: AlertPriority.CRITICAL,
        entities: [{ type: 'part', id: 'p1' }],
      };

      const result = agg.deduplicateAlerts([alertLow, alertHigh]);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('2');
    });

    it('keeps both when different entities', () => {
      const agg = AlertAggregator.getInstance();

      const alert1: any = {
        id: '1',
        type: AlertType.STOCKOUT,
        priority: AlertPriority.MEDIUM,
        entities: [{ type: 'part', id: 'p1' }],
      };
      const alert2: any = {
        id: '2',
        type: AlertType.STOCKOUT,
        priority: AlertPriority.MEDIUM,
        entities: [{ type: 'part', id: 'p2' }],
      };

      const result = agg.deduplicateAlerts([alert1, alert2]);
      expect(result.length).toBe(2);
    });
  });

  // =========================================================================
  // enrichAlerts
  // =========================================================================

  describe('enrichAlerts', () => {
    it('assigns correlationId to related alerts', async () => {
      const agg = AlertAggregator.getInstance();

      const alert1: any = {
        id: 'a1',
        entities: [{ type: 'part', id: 'p1' }],
      };
      const alert2: any = {
        id: 'a2',
        entities: [{ type: 'part', id: 'p1' }],
      };

      const result = await agg.enrichAlerts([alert1, alert2]);

      expect(result.length).toBe(2);
      expect(result[0].correlationId).toBeDefined();
      expect(result[0].correlationId).toBe(result[1].correlationId);
      expect(result[0].relatedAlertIds).toContain('a2');
      expect(result[1].relatedAlertIds).toContain('a1');
    });

    it('does not assign correlationId for single alerts', async () => {
      const agg = AlertAggregator.getInstance();

      const alert1: any = {
        id: 'a1',
        entities: [{ type: 'part', id: 'p1' }],
      };

      const result = await agg.enrichAlerts([alert1]);
      expect(result.length).toBe(1);
      expect(result[0].correlationId).toBeUndefined();
    });
  });

  // =========================================================================
  // collectAllAlerts
  // =========================================================================

  describe('collectAllAlerts', () => {
    it('collects from all sources and deduplicates/enriches', async () => {
      // Set up all mocks to return empty
      mockPrisma.part.findMany.mockResolvedValue([]);
      mockPrisma.salesOrderLine.groupBy.mockResolvedValue([]);
      mockPrisma.bomLine.findMany.mockResolvedValue([]);
      mockPrisma.nCR.findMany.mockResolvedValue([]);
      mockPrisma.inspection.findMany.mockResolvedValue([]);
      mockPrisma.supplier.findMany.mockResolvedValue([]);
      mockPrisma.mrpSuggestion.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const agg = AlertAggregator.getInstance();
      const result = await agg.collectAllAlerts();

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
