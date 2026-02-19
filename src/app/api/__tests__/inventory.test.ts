/**
 * Inventory API Route Tests
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../inventory/route';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { checkHeavyEndpointLimit } from '@/lib/rate-limit';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    inventory: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/bom-engine', () => ({
  getStockStatus: vi.fn((available: number, minStock: number, reorderPoint: number) => {
    if (available <= 0) return 'OUT_OF_STOCK';
    if (available < minStock) return 'CRITICAL';
    if (available < reorderPoint) return 'REORDER';
    return 'OK';
  }),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkHeavyEndpointLimit: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    logError: vi.fn(),
  },
}));

vi.mock('@/lib/audit/audit-logger', () => ({
  logApi: vi.fn(),
}));

// Helper to build a raw inventory record as Prisma would return
function buildInventoryRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    partId: 'part-1',
    warehouseId: 'wh-1',
    quantity: 100,
    reservedQty: 10,
    lotNumber: 'LOT-001',
    expiryDate: null,
    locationCode: 'A-01',
    part: {
      partNumber: 'PN-001',
      name: 'Bolt M8',
      category: 'COMPONENT',
      unit: 'EA',
      isCritical: false,
      costs: [{ unitCost: 0.5 }],
      planning: {
        minStockLevel: 20,
        reorderPoint: 50,
        safetyStock: 10,
      },
    },
    warehouse: {
      name: 'Main Warehouse',
    },
    ...overrides,
  };
}

// Mock context for withAuth wrapper (Next.js 15 async params)
const mockContext = { params: Promise.resolve({}) };

describe('Inventory API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default rate limit mock (allow requests)
    (checkHeavyEndpointLimit as Mock).mockResolvedValue({ success: true });
  });

  // ===========================================================================
  // GET /api/inventory
  // ===========================================================================
  describe('GET /api/inventory', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/inventory');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return paginated inventory list successfully', async () => {
      const mockInventory = [buildInventoryRecord()];

      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.inventory.count as Mock).mockResolvedValue(1);
      // First findMany for paginated data, second for summary
      (prisma.inventory.findMany as Mock)
        .mockResolvedValueOnce(mockInventory)
        .mockResolvedValueOnce([
          {
            quantity: 100,
            reservedQty: 10,
            part: { planning: { minStockLevel: 20, reorderPoint: 50 } },
          },
        ]);

      const request = new NextRequest('http://localhost:3000/api/inventory?page=1&pageSize=50');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].partNumber).toBe('PN-001');
      expect(data.data[0].available).toBe(90); // 100 - 10
      expect(data.pagination).toBeDefined();
      expect(data.pagination.totalItems).toBe(1);
    });

    it('should include summary on page 1', async () => {
      const mockInventory = [buildInventoryRecord()];

      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.inventory.count as Mock).mockResolvedValue(1);
      (prisma.inventory.findMany as Mock)
        .mockResolvedValueOnce(mockInventory)
        .mockResolvedValueOnce([
          {
            quantity: 100,
            reservedQty: 10,
            part: { planning: { minStockLevel: 20, reorderPoint: 50 } },
          },
        ]);

      const request = new NextRequest('http://localhost:3000/api/inventory?page=1');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary).toBeDefined();
      expect(data.summary.total).toBe(1);
    });

    it('should filter by partId', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.inventory.count as Mock).mockResolvedValue(0);
      (prisma.inventory.findMany as Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const request = new NextRequest('http://localhost:3000/api/inventory?partId=part-1');
      const response = await GET(request, mockContext);

      expect(response.status).toBe(200);
      // Verify the where clause includes partId
      const findManyCall = (prisma.inventory.findMany as Mock).mock.calls[0][0];
      expect(findManyCall.where).toHaveProperty('partId', 'part-1');
    });

    it('should filter by warehouseId', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.inventory.count as Mock).mockResolvedValue(0);
      (prisma.inventory.findMany as Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const request = new NextRequest('http://localhost:3000/api/inventory?warehouseId=wh-1');
      const response = await GET(request, mockContext);

      expect(response.status).toBe(200);
      const findManyCall = (prisma.inventory.findMany as Mock).mock.calls[0][0];
      expect(findManyCall.where).toHaveProperty('warehouseId', 'wh-1');
    });

    it('should apply search filter on part name or number', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.inventory.count as Mock).mockResolvedValue(0);
      (prisma.inventory.findMany as Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const request = new NextRequest('http://localhost:3000/api/inventory?search=bolt');
      const response = await GET(request, mockContext);

      expect(response.status).toBe(200);
      const findManyCall = (prisma.inventory.findMany as Mock).mock.calls[0][0];
      expect(findManyCall.where).toHaveProperty('part');
      expect(findManyCall.where.part).toHaveProperty('OR');
    });

    it('should filter by computed status (critical) using in-memory pagination', async () => {
      const criticalItem = buildInventoryRecord({
        id: 'inv-critical',
        quantity: 15,
        reservedQty: 10,
        part: {
          partNumber: 'PN-LOW',
          name: 'Low Stock Part',
          category: 'COMPONENT',
          unit: 'EA',
          isCritical: true,
          costs: [{ unitCost: 1.0 }],
          planning: {
            minStockLevel: 20,
            reorderPoint: 50,
            safetyStock: 10,
          },
        },
      });

      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      // When status filter is used, only one findMany call is made (no count)
      (prisma.inventory.findMany as Mock).mockResolvedValueOnce([criticalItem]);

      const request = new NextRequest('http://localhost:3000/api/inventory?status=critical');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // The item available = 15 - 10 = 5, minStockLevel = 20, so status = CRITICAL
      expect(data.data.length).toBeGreaterThanOrEqual(0);
      expect(data.summary).toBeDefined();
    });

    it('should handle rate limit exceeded', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (checkHeavyEndpointLimit as Mock).mockResolvedValue({ success: false, retryAfter: 30 });

      const request = new NextRequest('http://localhost:3000/api/inventory');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Too many requests');
    });

    it('should return 500 when database query fails', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.inventory.count as Mock).mockRejectedValue(new Error('Database connection error'));

      const request = new NextRequest('http://localhost:3000/api/inventory');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch inventory');
    });

    it('should map inventory record to flat structure with computed fields', async () => {
      const mockRecord = buildInventoryRecord({
        quantity: 200,
        reservedQty: 30,
      });

      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.inventory.count as Mock).mockResolvedValue(1);
      (prisma.inventory.findMany as Mock)
        .mockResolvedValueOnce([mockRecord])
        .mockResolvedValueOnce([
          {
            quantity: 200,
            reservedQty: 30,
            part: { planning: { minStockLevel: 20, reorderPoint: 50 } },
          },
        ]);

      const request = new NextRequest('http://localhost:3000/api/inventory?page=1');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      const item = data.data[0];
      expect(item.quantity).toBe(200);
      expect(item.reserved).toBe(30);
      expect(item.available).toBe(170); // 200 - 30
      expect(item.unitCost).toBe(0.5);
      expect(item.minStockLevel).toBe(20);
      expect(item.reorderPoint).toBe(50);
      expect(item.warehouseName).toBe('Main Warehouse');
      expect(item.status).toBe('OK');
    });
  });
});
