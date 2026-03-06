/**
 * MRP API Route Tests
 * Tests for /api/mrp (GET, POST), /api/mrp/run (GET, POST),
 * /api/mrp/sales-orders (GET), /api/mrp/exceptions (GET, POST),
 * /api/mrp/shortages (GET), /api/mrp/[runId] (GET)
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before imports
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    mrpRun: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    salesOrder: {
      findMany: vi.fn(),
    },
    part: {
      findMany: vi.fn(),
    },
    purchaseOrderLine: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    product: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/mrp-engine', () => ({
  runMrpCalculation: vi.fn(),
}));

vi.mock('@/lib/jobs/job-queue', () => ({
  jobQueue: {
    add: vi.fn().mockReturnValue({ id: 'job-123' }),
  },
  JOB_NAMES: {
    MRP_CALCULATION: 'mrp-calculation',
  },
}));

vi.mock('@/lib/jobs/handlers', () => ({}));

vi.mock('@/lib/mrp', () => ({
  detectExceptions: vi.fn(),
  getExceptionSummary: vi.fn(),
  getExceptions: vi.fn(),
  resolveException: vi.fn(),
  acknowledgeException: vi.fn(),
  ignoreException: vi.fn(),
  clearOldExceptions: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
  checkHeavyEndpointLimit: vi.fn().mockResolvedValue({ success: true, limit: 100, remaining: 99, retryAfter: 0 }),
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

import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { runMrpCalculation } from '@/lib/mrp-engine';
import { jobQueue } from '@/lib/jobs/job-queue';
import {
  getExceptions,
  getExceptionSummary,
  detectExceptions,
  resolveException,
  acknowledgeException,
  ignoreException,
  clearOldExceptions,
} from '@/lib/mrp';
import { GET as getMRPList, POST as createMRPRun } from '../mrp/route';
import { GET as getMRPRunHistory, POST as submitMRPRun } from '../mrp/run/route';
import { GET as getSalesOrders } from '../mrp/sales-orders/route';
import { GET as getExceptionsRoute, POST as postExceptionsRoute } from '../mrp/exceptions/route';
import { GET as getShortages } from '../mrp/shortages/route';
import { GET as getMRPRunById } from '../mrp/[runId]/route';

// Mock context for withAuth wrapper (Next.js 15 async params)
const mockContext = { params: Promise.resolve({}) };

describe('MRP Main API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // GET /api/mrp - List MRP Runs
  // ===========================================================================
  describe('GET /api/mrp', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/mrp');
      const response = await getMRPList(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return MRP run list successfully', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.mrpRun.updateMany as Mock).mockResolvedValue({ count: 0 }); // cleanup

      const mockRuns = [
        {
          id: 'run-1',
          runNumber: 'MRP-2026-0001',
          status: 'completed',
          runDate: new Date('2026-01-15'),
          _count: { suggestions: 5 },
        },
      ];

      (prisma.mrpRun.findMany as Mock).mockResolvedValue(mockRuns);

      const request = new NextRequest('http://localhost:3000/api/mrp');
      const response = await getMRPList(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].runNumber).toBe('MRP-2026-0001');
    });

    it('should return 500 when database query fails', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.mrpRun.updateMany as Mock).mockResolvedValue({ count: 0 });
      (prisma.mrpRun.findMany as Mock).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/mrp');
      const response = await getMRPList(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch MRP runs');
    });
  });

  // ===========================================================================
  // POST /api/mrp - Run MRP Calculation (Sync)
  // ===========================================================================
  describe('POST /api/mrp', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/mrp', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await createMRPRun(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should run MRP calculation and return result', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

      const mockMRPRun = { id: 'run-1', status: 'completed' };
      const mockFullRun = { id: 'run-1', status: 'completed', _count: { suggestions: 10 } };

      (runMrpCalculation as Mock).mockResolvedValue(mockMRPRun);
      (prisma.mrpRun.findUnique as Mock).mockResolvedValue(mockFullRun);

      const request = new NextRequest('http://localhost:3000/api/mrp', {
        method: 'POST',
        body: JSON.stringify({
          planningHorizonDays: 90,
          includeConfirmed: true,
        }),
      });
      const response = await createMRPRun(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('completed');
      expect(data._count.suggestions).toBe(10);
      expect(runMrpCalculation).toHaveBeenCalledWith({
        planningHorizonDays: 90,
        includeConfirmed: true,
        includeDraft: false,
        includeSafetyStock: true,
      });
    });

    it('should return 500 when MRP calculation fails', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (runMrpCalculation as Mock).mockRejectedValue(new Error('Calculation failed'));

      const request = new NextRequest('http://localhost:3000/api/mrp', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await createMRPRun(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to run MRP calculation');
    });
  });
});

describe('MRP Run API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // GET /api/mrp/run - MRP Run History
  // ===========================================================================
  describe('GET /api/mrp/run', () => {
    it('should return MRP run history', async () => {
      const mockRuns = [
        {
          id: 'run-1',
          runNumber: 'MRP-2026-0001',
          runDate: new Date('2026-01-15'),
          status: 'completed',
          parameters: { orderIds: ['order-1'] },
          totalParts: 5,
          expediteAlerts: 1,
          shortageWarnings: 2,
          purchaseSuggestions: 3,
          createdBy: 'admin',
          completedAt: new Date('2026-01-15T01:00:00Z'),
          suggestions: [
            { estimatedCost: 500 },
            { estimatedCost: 300 },
          ],
        },
      ];

      (prisma.mrpRun.findMany as Mock).mockResolvedValue(mockRuns);

      const request = new NextRequest('http://localhost:3000/api/mrp/run?limit=5');
      const response = await getMRPRunHistory(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].runNumber).toBe('MRP-2026-0001');
      expect(data.data[0].totalPurchaseValue).toBe(800);
    });

    it('should return 500 when database query fails', async () => {
      (prisma.mrpRun.findMany as Mock).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/mrp/run');
      const response = await getMRPRunHistory(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch MRP history');
    });
  });

  // ===========================================================================
  // POST /api/mrp/run - Submit MRP to Job Queue
  // ===========================================================================
  describe('POST /api/mrp/run', () => {
    it('should return 400 when no orderIds provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/mrp/run', {
        method: 'POST',
        body: JSON.stringify({ orderIds: [] }),
      });
      const response = await submitMRPRun(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/No orders selected|Invalid input/);
    });

    it('should submit MRP calculation to job queue successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/mrp/run', {
        method: 'POST',
        body: JSON.stringify({
          orderIds: ['order-1', 'order-2'],
          options: { includeSafetyStock: true },
        }),
      });
      const response = await submitMRPRun(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.backgroundJobId).toBe('job-123');
      expect(jobQueue.add).toHaveBeenCalledWith(
        'mrp-calculation',
        { orderIds: ['order-1', 'order-2'], options: { includeSafetyStock: true } },
        2
      );
    });

    it('should return 500 when job queue submission fails', async () => {
      (jobQueue.add as Mock).mockImplementation(() => {
        throw new Error('Queue error');
      });

      const request = new NextRequest('http://localhost:3000/api/mrp/run', {
        method: 'POST',
        body: JSON.stringify({ orderIds: ['order-1'] }),
      });
      const response = await submitMRPRun(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});

describe('MRP Sales Orders API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // GET /api/mrp/sales-orders
  // ===========================================================================
  describe('GET /api/mrp/sales-orders', () => {
    it('should return sales orders for MRP planning', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          orderNumber: 'SO-2026-0001',
          orderDate: new Date('2026-01-10'),
          requiredDate: new Date('2026-02-15'),
          promisedDate: null,
          status: 'confirmed',
          priority: 'high',
          totalAmount: 50000,
          currency: 'VND',
          customer: { id: 'cust-1', name: 'ABC Corp', code: 'ABC' },
          lines: [
            {
              id: 'line-1',
              productId: 'prod-1',
              product: { id: 'prod-1', sku: 'SKU-001', name: 'Widget A' },
              quantity: 100,
              unitPrice: 500,
              lineTotal: 50000,
              status: 'pending',
            },
          ],
        },
      ];

      (prisma.salesOrder.findMany as Mock).mockResolvedValue(mockOrders);

      const request = new NextRequest('http://localhost:3000/api/mrp/sales-orders');
      const response = await getSalesOrders(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].orderNumber).toBe('SO-2026-0001');
      expect(data.data[0].customer.name).toBe('ABC Corp');
      expect(data.data[0].items).toHaveLength(1);
    });

    it('should filter by status parameter', async () => {
      (prisma.salesOrder.findMany as Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/mrp/sales-orders?status=confirmed,pending');
      const response = await getSalesOrders(request, mockContext);

      expect(response.status).toBe(200);
      const findManyCall = (prisma.salesOrder.findMany as Mock).mock.calls[0][0];
      expect(findManyCall.where.status.in).toEqual(['confirmed', 'pending']);
    });

    it('should return 500 when database query fails', async () => {
      (prisma.salesOrder.findMany as Mock).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/mrp/sales-orders');
      const response = await getSalesOrders(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch sales orders');
    });
  });
});

describe('MRP Exceptions API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // GET /api/mrp/exceptions
  // ===========================================================================
  describe('GET /api/mrp/exceptions', () => {
    it('should return exceptions list', async () => {
      const mockExceptions = [
        { id: 'exc-1', type: 'shortage', severity: 'critical', status: 'open' },
      ];
      (getExceptions as Mock).mockResolvedValue(mockExceptions);

      const request = new NextRequest('http://localhost:3000/api/mrp/exceptions');
      const response = await getExceptionsRoute(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].type).toBe('shortage');
    });

    it('should return summary when summary=true', async () => {
      const mockSummary = { total: 10, critical: 3, high: 4, medium: 2, low: 1 };
      (getExceptionSummary as Mock).mockResolvedValue(mockSummary);

      const request = new NextRequest('http://localhost:3000/api/mrp/exceptions?summary=true');
      const response = await getExceptionsRoute(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.total).toBe(10);
      expect(getExceptionSummary).toHaveBeenCalled();
    });

    it('should return 500 when fetching exceptions fails', async () => {
      (getExceptions as Mock).mockRejectedValue(new Error('Failed'));

      const request = new NextRequest('http://localhost:3000/api/mrp/exceptions');
      const response = await getExceptionsRoute(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to get exceptions');
    });
  });

  // ===========================================================================
  // POST /api/mrp/exceptions
  // ===========================================================================
  describe('POST /api/mrp/exceptions', () => {
    it('should detect exceptions successfully', async () => {
      const mockExceptions = [
        { id: 'exc-1', type: 'shortage' },
        { id: 'exc-2', type: 'late_supply' },
      ];
      (detectExceptions as Mock).mockResolvedValue(mockExceptions);

      const request = new NextRequest('http://localhost:3000/api/mrp/exceptions', {
        method: 'POST',
        body: JSON.stringify({ action: 'detect', mrpRunId: 'run-1' }),
      });
      const response = await postExceptionsRoute(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.count).toBe(2);
    });

    it('should return 400 for resolve action without required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/mrp/exceptions', {
        method: 'POST',
        body: JSON.stringify({ action: 'resolve' }), // missing exceptionId, resolution, userId
      });
      const response = await postExceptionsRoute(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should resolve exception successfully', async () => {
      (resolveException as Mock).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/mrp/exceptions', {
        method: 'POST',
        body: JSON.stringify({
          action: 'resolve',
          exceptionId: 'exc-1',
          resolution: 'Ordered additional stock',
          userId: 'user-1',
        }),
      });
      const response = await postExceptionsRoute(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(resolveException).toHaveBeenCalledWith('exc-1', 'Ordered additional stock', 'user-1');
    });

    it('should return 400 for invalid action', async () => {
      const request = new NextRequest('http://localhost:3000/api/mrp/exceptions', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalid_action' }),
      });
      const response = await postExceptionsRoute(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toMatch(/Invalid action|Invalid input/);
    });

    it('should clear old exceptions', async () => {
      (clearOldExceptions as Mock).mockResolvedValue(5);

      const request = new NextRequest('http://localhost:3000/api/mrp/exceptions', {
        method: 'POST',
        body: JSON.stringify({ action: 'clear', daysOld: 60 }),
      });
      const response = await postExceptionsRoute(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.cleared).toBe(5);
    });
  });
});

describe('MRP Shortages API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // GET /api/mrp/shortages
  // ===========================================================================
  describe('GET /api/mrp/shortages', () => {
    it('should return empty array when no shortages exist', async () => {
      (prisma.part.findMany as Mock).mockResolvedValue([
        {
          id: 'part-1',
          partNumber: 'PN-001',
          name: 'Bolt M8',
          inventory: [{ quantity: 1000, reservedQty: 0 }],
          planning: { safetyStock: 10 },
          partSuppliers: [],
          bomLines: [],
        },
      ]);

      const request = new NextRequest('http://localhost:3000/api/mrp/shortages');
      const response = await getShortages(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should return 500 when database query fails', async () => {
      (prisma.part.findMany as Mock).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/mrp/shortages');
      const response = await getShortages(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch shortages');
    });
  });
});

describe('MRP Run Detail API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // GET /api/mrp/[runId] - Get MRP Run by ID
  // ===========================================================================
  describe('GET /api/mrp/[runId]', () => {
    it('should return MRP run detail successfully', async () => {
      const mockRun = {
        id: 'run-1',
        runNumber: 'MRP-2026-0001',
        status: 'completed',
        suggestions: [
          { id: 'sug-1', part: { partNumber: 'PN-001' }, supplier: null },
        ],
      };

      (prisma.mrpRun.findUnique as Mock).mockResolvedValue(mockRun);

      const request = new NextRequest('http://localhost:3000/api/mrp/run-1');
      const response = await getMRPRunById(request, { params: Promise.resolve({ runId: 'run-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.runNumber).toBe('MRP-2026-0001');
      expect(data.suggestions).toHaveLength(1);
    });

    it('should return 404 when MRP run is not found', async () => {
      (prisma.mrpRun.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/mrp/nonexistent');
      const response = await getMRPRunById(request, { params: Promise.resolve({ runId: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('MRP run not found');
    });

    it('should return 500 when database query fails', async () => {
      (prisma.mrpRun.findUnique as Mock).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/mrp/run-1');
      const response = await getMRPRunById(request, { params: Promise.resolve({ runId: 'run-1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch MRP run');
    });
  });
});
