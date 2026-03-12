/**
 * Mobile Extended API Routes Tests
 * Tests for mobile/equipment, mobile/parts, mobile/locations, mobile/quality,
 * mobile/picking, mobile/tasks, mobile/work-orders, mobile/sync
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
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

vi.mock('@/lib/rate-limit', () => ({
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
  checkHeavyEndpointLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    equipment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    maintenanceOrder: {
      create: vi.fn(),
    },
    part: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    warehouse: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    inspection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    inspectionResult: {
      upsert: vi.fn(),
    },
    pickList: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    pickListLine: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    purchaseOrder: {
      findMany: vi.fn(),
    },
    workOrder: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    inventory: {
      upsert: vi.fn().mockResolvedValue({ id: 'inv-1', quantity: 10 }),
      findUnique: vi.fn(),
      findFirst: vi.fn().mockResolvedValue({ id: 'inv-1', quantity: 50 }),
      update: vi.fn().mockResolvedValue({ id: 'inv-1' }),
      create: vi.fn().mockResolvedValue({ id: 'inv-1' }),
    },
    lotTransaction: {
      create: vi.fn().mockResolvedValue({ id: 'tx-1', createdAt: new Date() }),
    },
    $transaction: vi.fn(),
  };
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockContext = { params: Promise.resolve({}) };

const mockSession = {
  user: { id: 'user-1', email: 'test@test.com', role: 'ADMIN', name: 'Test User' },
};

function createGetRequest(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' });
}

function createPostRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// =============================================================================
// MOBILE EQUIPMENT TESTS
// =============================================================================
describe('Mobile Extended API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockSession);
  });

  describe('GET /api/mobile/equipment', () => {
    let GET: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../mobile/equipment/route');
      GET = module.GET;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);
      const request = createGetRequest('http://localhost:3000/api/mobile/equipment');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return equipment list with summary', async () => {
      (prisma.equipment.findMany as Mock).mockResolvedValue([
        {
          id: 'eq1',
          code: 'EQ-001',
          name: 'CNC Machine 1',
          type: 'CNC',
          status: 'operational',
          location: 'Shop Floor A',
          currentOee: 85,
          totalDowntimeHours: 12.5,
          criticality: 'high',
          nextMaintenanceDate: new Date('2026-03-15'),
          workCenter: { id: 'wc1', code: 'WC-01', name: 'Machining', location: 'Building A' },
          maintenanceSchedules: [],
          maintenanceOrders: [],
        },
        {
          id: 'eq2',
          code: 'EQ-002',
          name: 'Lathe Machine',
          type: 'Lathe',
          status: 'down',
          location: null,
          currentOee: 0,
          totalDowntimeHours: 48,
          criticality: 'medium',
          nextMaintenanceDate: null,
          workCenter: { id: 'wc1', code: 'WC-01', name: 'Machining', location: 'Building A' },
          maintenanceSchedules: [],
          maintenanceOrders: [{ type: 'CM', description: 'Spindle broken' }],
        },
      ]);

      const request = createGetRequest('http://localhost:3000/api/mobile/equipment');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].code).toBe('EQ-001');
      expect(data.data[0].status).toBe('RUNNING');
      expect(data.data[1].status).toBe('DOWN');
      expect(data.summary.total).toBe(2);
      expect(data.summary.running).toBe(1);
      expect(data.summary.down).toBe(1);
    });

    it('should return 500 on database error', async () => {
      (prisma.equipment.findMany as Mock).mockRejectedValue(new Error('DB error'));

      const request = createGetRequest('http://localhost:3000/api/mobile/equipment');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch equipment');
    });
  });

  describe('POST /api/mobile/equipment', () => {
    let POST: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../mobile/equipment/route');
      POST = module.POST;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);
      const request = createPostRequest('http://localhost:3000/api/mobile/equipment', {
        action: 'update_status',
        equipmentId: 'eq1',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid input (missing required fields)', async () => {
      const request = createPostRequest('http://localhost:3000/api/mobile/equipment', {
        action: 'update_status',
        // missing equipmentId
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 404 when equipment not found', async () => {
      (prisma.equipment.findUnique as Mock).mockResolvedValue(null);

      const request = createPostRequest('http://localhost:3000/api/mobile/equipment', {
        action: 'update_status',
        equipmentId: 'nonexistent',
        data: { newStatus: 'RUNNING' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Equipment not found');
    });

    it('should update equipment status successfully', async () => {
      (prisma.equipment.findUnique as Mock).mockResolvedValue({
        id: 'eq1',
        code: 'EQ-001',
        name: 'CNC Machine 1',
      });
      (prisma.equipment.update as Mock).mockResolvedValue({});

      const request = createPostRequest('http://localhost:3000/api/mobile/equipment', {
        action: 'update_status',
        equipmentId: 'eq1',
        data: { newStatus: 'RUNNING' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('EQ-001');
      expect(data.data.newStatus).toBe('RUNNING');
    });

    it('should return 400 for invalid action', async () => {
      (prisma.equipment.findUnique as Mock).mockResolvedValue({
        id: 'eq1',
        code: 'EQ-001',
        name: 'CNC Machine 1',
      });

      const request = createPostRequest('http://localhost:3000/api/mobile/equipment', {
        action: 'invalid_action',
        equipmentId: 'eq1',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid action');
    });
  });

  // =============================================================================
  // MOBILE PARTS TESTS
  // =============================================================================
  describe('GET /api/mobile/parts', () => {
    let GET: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../mobile/parts/route');
      GET = module.GET;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);
      const request = createGetRequest('http://localhost:3000/api/mobile/parts');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return parts list', async () => {
      (prisma.part.findMany as Mock).mockResolvedValue([
        {
          id: 'p1',
          partNumber: 'RTR-MOTOR-001',
          name: 'Brushless DC Motor',
          description: 'High-performance motor',
          category: 'Motors',
          unit: 'EA',
          planning: { safetyStock: 50, reorderPoint: 30 },
        },
      ]);

      const request = createGetRequest('http://localhost:3000/api/mobile/parts');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.parts).toHaveLength(1);
      expect(data.parts[0].sku).toBe('RTR-MOTOR-001');
      expect(data.parts[0].name).toBe('Brushless DC Motor');
    });

    it('should return single part by id with inventory details', async () => {
      (prisma.part.findFirst as Mock).mockResolvedValue({
        id: 'p1',
        partNumber: 'RTR-MOTOR-001',
        name: 'Brushless DC Motor',
        description: 'High-performance motor',
        category: 'Motors',
        unit: 'EA',
        planning: { safetyStock: 50, reorderPoint: 30 },
        inventory: [
          {
            quantity: 100,
            reservedQty: 20,
            warehouseId: 'wh1',
            warehouse: { code: 'WH-01', name: 'Main Warehouse' },
            lotNumber: 'LOT-001',
          },
        ],
      });

      const request = createGetRequest('http://localhost:3000/api/mobile/parts?id=p1');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.part).toBeDefined();
      expect(data.part.onHand).toBe(100);
      expect(data.part.allocated).toBe(20);
      expect(data.part.available).toBe(80);
      expect(data.part.locations).toHaveLength(1);
    });

    it('should return 404 when part not found', async () => {
      (prisma.part.findFirst as Mock).mockResolvedValue(null);

      const request = createGetRequest('http://localhost:3000/api/mobile/parts?id=nonexistent');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Part not found');
    });
  });

  // =============================================================================
  // MOBILE LOCATIONS TESTS
  // =============================================================================
  describe('GET /api/mobile/locations', () => {
    let GET: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../mobile/locations/route');
      GET = module.GET;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);
      const request = createGetRequest('http://localhost:3000/api/mobile/locations');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return locations list', async () => {
      (prisma.warehouse.findMany as Mock).mockResolvedValue([
        {
          id: 'wh1',
          code: 'WH-01',
          name: 'Main Warehouse',
          type: 'warehouse',
          status: 'active',
          location: '123 Main St',
        },
      ]);

      const request = createGetRequest('http://localhost:3000/api/mobile/locations');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locations).toHaveLength(1);
      expect(data.locations[0].code).toBe('WH-01');
    });

    it('should return 404 when location not found by id', async () => {
      (prisma.warehouse.findFirst as Mock).mockResolvedValue(null);

      const request = createGetRequest('http://localhost:3000/api/mobile/locations?id=nonexistent');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Location not found');
    });
  });

  // =============================================================================
  // MOBILE QUALITY TESTS
  // =============================================================================
  describe('GET /api/mobile/quality', () => {
    let GET: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../mobile/quality/route');
      GET = module.GET;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);
      const request = createGetRequest('http://localhost:3000/api/mobile/quality');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return inspections list with summary', async () => {
      (prisma.inspection.findMany as Mock).mockResolvedValue([
        {
          id: 'insp1',
          inspectionNumber: 'INS-001',
          type: 'receiving',
          status: 'pending',
          lotNumber: 'LOT-001',
          quantityReceived: 100,
          quantityInspected: 0,
          result: null,
          notes: null,
          createdAt: new Date('2026-01-15'),
          part: { partNumber: 'RTR-MOTOR-001', name: 'Motor' },
          product: null,
          workOrder: null,
          plan: { characteristics: [] },
          results: [],
        },
      ]);

      const request = createGetRequest('http://localhost:3000/api/mobile/quality');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.summary.total).toBe(1);
      expect(data.summary.pending).toBe(1);
    });
  });

  describe('POST /api/mobile/quality', () => {
    let POST: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../mobile/quality/route');
      POST = module.POST;
    });

    it('should return 400 for invalid input', async () => {
      const request = createPostRequest('http://localhost:3000/api/mobile/quality', {
        // missing inspectionId
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 404 when inspection not found', async () => {
      (prisma.inspection.findUnique as Mock).mockResolvedValue(null);

      const request = createPostRequest('http://localhost:3000/api/mobile/quality', {
        inspectionId: 'nonexistent',
        checkpointId: 'char1',
        result: 'PASS',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Inspection not found');
    });

    it('should record characteristic result successfully', async () => {
      (prisma.inspection.findUnique as Mock).mockResolvedValue({
        id: 'insp1',
        status: 'pending',
        quantityReceived: 100,
        quantityInspected: 0,
        quantityAccepted: 0,
        quantityRejected: 0,
        notes: null,
        part: { partNumber: 'RTR-MOTOR-001', name: 'Motor' },
        product: null,
        plan: { characteristics: [{ id: 'char1', name: 'Dimension A' }] },
        results: [],
      });
      (prisma.inspectionResult.upsert as Mock).mockResolvedValue({});
      (prisma.inspection.update as Mock).mockResolvedValue({});

      const request = createPostRequest('http://localhost:3000/api/mobile/quality', {
        inspectionId: 'insp1',
        checkpointId: 'char1',
        result: 'PASS',
        value: '10.5',
        notes: 'Within spec',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('PASS');
    });
  });

  // =============================================================================
  // MOBILE PICKING TESTS
  // =============================================================================
  describe('GET /api/mobile/picking', () => {
    let GET: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../mobile/picking/route');
      GET = module.GET;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);
      const request = createGetRequest('http://localhost:3000/api/mobile/picking');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return pick lists with summary', async () => {
      (prisma.pickList.findMany as Mock).mockResolvedValue([
        {
          id: 'pl1',
          pickListNumber: 'PL-001',
          sourceType: 'SALES_ORDER',
          sourceId: 'SO-001',
          status: 'PENDING',
          priority: 3,
          dueDate: new Date('2026-03-01'),
          lines: [
            {
              id: 'pll1',
              requestedQty: 10,
              pickedQty: 0,
              locationCode: 'WH-01-A1',
              part: { partNumber: 'RTR-MOTOR-001', name: 'Motor' },
              warehouse: { code: 'WH-01', name: 'Main' },
            },
          ],
        },
      ]);

      const request = createGetRequest('http://localhost:3000/api/mobile/picking');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].pickNumber).toBe('PL-001');
      expect(data.summary.totalPicks).toBe(1);
    });
  });

  describe('POST /api/mobile/picking', () => {
    let POST: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../mobile/picking/route');
      POST = module.POST;
    });

    it('should return 400 for invalid input', async () => {
      const request = createPostRequest('http://localhost:3000/api/mobile/picking', {
        // missing required fields
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 404 when pick item not found', async () => {
      (prisma.pickListLine.findUnique as Mock).mockResolvedValue(null);

      const request = createPostRequest('http://localhost:3000/api/mobile/picking', {
        pickId: 'pl1',
        itemId: 'nonexistent',
        qtyPicked: 5,
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Pick item not found');
    });

    it('should process pick confirmation successfully', async () => {
      (prisma.pickListLine.findUnique as Mock).mockResolvedValue({
        id: 'pll1',
        pickListId: 'pl1',
        requestedQty: 10,
        pickedQty: 0,
        locationCode: 'WH-01-A1',
        lotNumber: null,
        part: { partNumber: 'RTR-MOTOR-001', name: 'Motor' },
        warehouse: { code: 'WH-01' },
        pickList: { pickListNumber: 'PL-001', status: 'PENDING' },
      });
      (prisma.pickListLine.update as Mock).mockResolvedValue({});
      (prisma.pickListLine.findMany as Mock).mockResolvedValue([
        { id: 'pll1', pickedQty: 5, requestedQty: 10 },
      ]);
      (prisma.pickList.update as Mock).mockResolvedValue({});

      const request = createPostRequest('http://localhost:3000/api/mobile/picking', {
        pickId: 'pl1',
        itemId: 'pll1',
        qtyPicked: 5,
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.transactionId).toBeDefined();
      expect(data.data.qtyPicked).toBe(5);
      expect(data.data.remainingToPick).toBe(5);
    });
  });

  // =============================================================================
  // MOBILE TASKS TESTS
  // =============================================================================
  describe('GET /api/mobile/tasks', () => {
    let GET: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../mobile/tasks/route');
      GET = module.GET;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);
      const request = createGetRequest('http://localhost:3000/api/mobile/tasks');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return aggregated tasks from all sources', async () => {
      (prisma.pickList.findMany as Mock).mockResolvedValue([
        {
          id: 'pl1',
          pickListNumber: 'PL-001',
          sourceType: 'SALES_ORDER',
          status: 'PENDING',
          priority: 2,
          dueDate: new Date('2026-03-01'),
          assignedTo: null,
          createdAt: new Date(),
          lines: [
            { pickedQty: 0, requestedQty: 10 },
            { pickedQty: 5, requestedQty: 5 },
          ],
        },
      ]);
      (prisma.purchaseOrder.findMany as Mock).mockResolvedValue([
        {
          id: 'po1',
          poNumber: 'PO-001',
          status: 'APPROVED',
          expectedDate: new Date('2026-03-05'),
          supplier: { name: 'Supplier A' },
          lines: [
            { receivedQty: 0, quantity: 20 },
          ],
        },
      ]);
      (prisma.workOrder.findMany as Mock).mockResolvedValue([
        {
          id: 'wo1',
          woNumber: 'WO-001',
          status: 'in_progress',
          priority: 'high',
          quantity: 50,
          completedQty: 25,
          plannedEnd: new Date('2026-03-10'),
          product: { name: 'Drone Assembly' },
        },
      ]);

      const request = createGetRequest('http://localhost:3000/api/mobile/tasks');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tasks).toBeDefined();
      expect(data.tasks.length).toBe(3);
      // Tasks should be sorted by status and priority
      const types = data.tasks.map((t: { type: string }) => t.type);
      expect(types).toContain('picking');
      expect(types).toContain('receiving');
      expect(types).toContain('work_order');
    });

    it('should return 500 on database error', async () => {
      (prisma.pickList.findMany as Mock).mockRejectedValue(new Error('DB error'));

      const request = createGetRequest('http://localhost:3000/api/mobile/tasks');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch tasks');
    });
  });

  // =============================================================================
  // MOBILE WORK ORDERS TESTS
  // =============================================================================
  describe('GET /api/mobile/work-orders', () => {
    let GET: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../mobile/work-orders/route');
      GET = module.GET;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);
      const request = createGetRequest('http://localhost:3000/api/mobile/work-orders');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return work orders list', async () => {
      (prisma.workOrder.findMany as Mock).mockResolvedValue([
        {
          id: 'wo1',
          woNumber: 'WO-001',
          productId: 'prod1',
          quantity: 50,
          completedQty: 25,
          scrapQty: 2,
          status: 'in_progress',
          priority: 'high',
          plannedStart: new Date('2026-02-01'),
          plannedEnd: new Date('2026-03-01'),
          actualStart: new Date('2026-02-05'),
          actualEnd: null,
          assignedTo: 'user-1',
          workCenter: 'WC-01',
          notes: null,
          product: { name: 'Drone Model X', sku: 'DRN-X-001' },
        },
      ]);

      const request = createGetRequest('http://localhost:3000/api/mobile/work-orders');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.workOrders).toHaveLength(1);
      expect(data.workOrders[0].number).toBe('WO-001');
      expect(data.workOrders[0].productName).toBe('Drone Model X');
    });

    it('should return single work order by id', async () => {
      (prisma.workOrder.findFirst as Mock).mockResolvedValue({
        id: 'wo1',
        woNumber: 'WO-001',
        productId: 'prod1',
        quantity: 50,
        completedQty: 25,
        scrapQty: 2,
        status: 'in_progress',
        priority: 'high',
        plannedStart: new Date('2026-02-01'),
        plannedEnd: new Date('2026-03-01'),
        actualStart: new Date('2026-02-05'),
        actualEnd: null,
        assignedTo: 'user-1',
        workCenter: 'WC-01',
        notes: 'Test note',
        product: { name: 'Drone Model X', sku: 'DRN-X-001' },
      });

      const request = createGetRequest('http://localhost:3000/api/mobile/work-orders?id=wo1');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.workOrder).toBeDefined();
      expect(data.workOrder.id).toBe('wo1');
      expect(data.workOrder.number).toBe('WO-001');
    });

    it('should return 404 when work order not found', async () => {
      (prisma.workOrder.findFirst as Mock).mockResolvedValue(null);

      const request = createGetRequest('http://localhost:3000/api/mobile/work-orders?id=nonexistent');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Work order not found');
    });
  });

  // =============================================================================
  // MOBILE SYNC TESTS
  // =============================================================================
  describe('POST /api/mobile/sync', () => {
    let POST: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../mobile/sync/route');
      POST = module.POST;
      // Mock $transaction to pass through the callback with prisma as tx
      (prisma.$transaction as Mock).mockImplementation(async (fn: (...args: unknown[]) => Promise<Response>) => {
        const tx = {
          inventory: {
            findFirst: vi.fn().mockResolvedValue({ id: 'inv-1', quantity: 50 }),
            upsert: vi.fn().mockResolvedValue({ id: 'inv-1', quantity: 60 }),
          },
          lotTransaction: {
            create: vi.fn().mockResolvedValue({ id: 'tx-1', createdAt: new Date() }),
          },
        };
        return fn(tx);
      });
      // Mock workOrder for wo_start operation
      (prisma.workOrder.findUnique as Mock).mockResolvedValue({
        id: 'wo-1',
        woNumber: 'WO-001',
        status: 'draft',
        actualStart: null,
      });
      (prisma.workOrder.update as Mock).mockResolvedValue({
        id: 'wo-1',
        woNumber: 'WO-001',
        status: 'in_progress',
        actualStart: new Date(),
      });
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);
      const request = createPostRequest('http://localhost:3000/api/mobile/sync', {
        type: 'inventory_adjust',
        data: { partId: '1', quantity: 10 },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should process inventory_adjust operation successfully', async () => {
      const request = createPostRequest('http://localhost:3000/api/mobile/sync', {
        id: 'op-1',
        type: 'inventory_adjust',
        data: { partId: '1', warehouseId: 'wh-1', quantity: 10, reason: 'Stock correction' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.operationId).toBe('op-1');
      expect(data.serverTransactionId).toBeDefined();
      expect(data.result.status).toBe('completed');
    });

    it('should return 400 for invalid operation type', async () => {
      const request = createPostRequest('http://localhost:3000/api/mobile/sync', {
        type: 'invalid_type',
        data: {},
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should process wo_start operation successfully', async () => {
      const request = createPostRequest('http://localhost:3000/api/mobile/sync', {
        type: 'wo_start',
        data: { woId: 'wo-1' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.woId).toBe('wo-1');
      expect(data.result.status).toBe('in_progress');
    });
  });
});
