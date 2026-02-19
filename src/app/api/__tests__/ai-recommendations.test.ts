/**
 * AI Recommendations API Route Tests
 * Tests for GET /api/ai/recommendations
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { checkHeavyEndpointLimit } from '@/lib/rate-limit';

// Mock dependencies before importing route
vi.mock('@/lib/prisma', () => ({
  default: {
    part: {
      findMany: vi.fn(),
    },
    supplier: {
      findMany: vi.fn(),
    },
    purchaseOrder: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
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

import { GET } from '../ai/recommendations/route';
import prisma from '@/lib/prisma';

// Mock context for withAuth wrapper (Next.js 15 async params)
const mockContext = { params: Promise.resolve({}) };

describe('AI Recommendations API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (checkHeavyEndpointLimit as Mock).mockResolvedValue({ success: true, limit: 100, remaining: 99, retryAfter: 0 });
  });

  // ===========================================================================
  // Authentication
  // ===========================================================================

  it('should return 401 when not authenticated', async () => {
    (auth as Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/ai/recommendations');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  // ===========================================================================
  // Successful responses
  // ===========================================================================

  it('should return empty recommendations when no data triggers rules', async () => {
    (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

    // Parts with plenty of stock (no reorder needed)
    (prisma.part.findMany as Mock)
      .mockResolvedValueOnce([
        {
          id: 'part-1',
          partNumber: 'PN-001',
          name: 'Widget',
          reorderPoint: 10,
          safetyStock: 5,
          unitCost: 1.5,
          leadTimeDays: 7,
          inventory: [{ quantity: 100, reservedQty: 0 }],
        },
      ])
      // Safety stock check - parts with enough stock
      .mockResolvedValueOnce([]);

    // No risky suppliers
    (prisma.supplier.findMany as Mock).mockResolvedValue([]);

    // No pending POs
    (prisma.purchaseOrder.findMany as Mock)
      .mockResolvedValueOnce([])  // pending POs (consolidate)
      .mockResolvedValueOnce([]); // late POs (expedite)

    const request = new NextRequest('http://localhost:3000/api/ai/recommendations');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.recommendations).toBeDefined();
    expect(Array.isArray(data.recommendations)).toBe(true);
    expect(data.summary).toBeDefined();
    expect(data.summary.total).toBe(data.recommendations.length);
  });

  it('should generate REORDER recommendations for parts below reorder point', async () => {
    (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

    // Part with low stock (below reorder point)
    (prisma.part.findMany as Mock)
      .mockResolvedValueOnce([
        {
          id: 'part-low',
          partNumber: 'PN-LOW',
          name: 'Low Stock Part',
          reorderPoint: 50,
          safetyStock: 10,
          unitCost: 5.0,
          leadTimeDays: 14,
          inventory: [{ quantity: 20, reservedQty: 5 }],
          // available = 20 - 5 = 15, which is <= reorderPoint of 50
        },
      ])
      // Safety stock query
      .mockResolvedValueOnce([]);

    (prisma.supplier.findMany as Mock).mockResolvedValue([]);
    (prisma.purchaseOrder.findMany as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost:3000/api/ai/recommendations');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    const reorderRecs = data.recommendations.filter(
      (r: { type: string }) => r.type === 'REORDER'
    );
    expect(reorderRecs.length).toBeGreaterThanOrEqual(1);
    expect(reorderRecs[0].category).toBe('inventory');
    expect(reorderRecs[0].priority).toBeDefined();
    expect(reorderRecs[0].confidence).toBe(0.94);
    expect(reorderRecs[0].partId).toBe('part-low');
  });

  it('should set HIGH priority when available stock is at or below safety stock', async () => {
    (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

    // Part with critically low stock (at safety stock level)
    (prisma.part.findMany as Mock)
      .mockResolvedValueOnce([
        {
          id: 'part-critical',
          partNumber: 'PN-CRIT',
          name: 'Critical Part',
          reorderPoint: 50,
          safetyStock: 10,
          unitCost: 10.0,
          leadTimeDays: 7,
          inventory: [{ quantity: 10, reservedQty: 2 }],
          // available = 10 - 2 = 8, which is <= safetyStock of 10
        },
      ])
      .mockResolvedValueOnce([]);

    (prisma.supplier.findMany as Mock).mockResolvedValue([]);
    (prisma.purchaseOrder.findMany as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost:3000/api/ai/recommendations');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    const reorderRecs = data.recommendations.filter(
      (r: { type: string }) => r.type === 'REORDER'
    );
    expect(reorderRecs.length).toBeGreaterThanOrEqual(1);
    expect(reorderRecs[0].priority).toBe('HIGH');
  });

  it('should generate SUPPLIER_CHANGE recommendations for risky suppliers', async () => {
    (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

    // No reorder parts
    (prisma.part.findMany as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    // Risky supplier
    (prisma.supplier.findMany as Mock).mockResolvedValue([
      {
        id: 'sup-risky',
        code: 'SUP-001',
        name: 'Risky Supplier Inc',
        rating: 'C',
        riskScore: {
          overallScore: 35,
          riskLevel: 'HIGH',
          deliveryScore: 40,
          trend: 'WORSENING',
        },
      },
    ]);

    (prisma.purchaseOrder.findMany as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost:3000/api/ai/recommendations');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    const supplierRecs = data.recommendations.filter(
      (r: { type: string }) => r.type === 'SUPPLIER_CHANGE'
    );
    expect(supplierRecs.length).toBe(1);
    expect(supplierRecs[0].category).toBe('supplier');
    expect(supplierRecs[0].supplierId).toBe('sup-risky');
    expect(supplierRecs[0].confidence).toBe(0.87);
  });

  it('should generate CONSOLIDATE recommendations for multiple POs to same supplier', async () => {
    (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

    (prisma.part.findMany as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.supplier.findMany as Mock).mockResolvedValue([]);

    // Multiple pending POs to same supplier
    (prisma.purchaseOrder.findMany as Mock)
      .mockResolvedValueOnce([
        {
          id: 'po-1',
          poNumber: 'PO-001',
          supplierId: 'sup-1',
          totalAmount: 5000,
          supplier: { id: 'sup-1', name: 'Supplier A', code: 'SA' },
        },
        {
          id: 'po-2',
          poNumber: 'PO-002',
          supplierId: 'sup-1',
          totalAmount: 3000,
          supplier: { id: 'sup-1', name: 'Supplier A', code: 'SA' },
        },
      ])
      .mockResolvedValueOnce([]); // no late POs

    const request = new NextRequest('http://localhost:3000/api/ai/recommendations');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    const consolidateRecs = data.recommendations.filter(
      (r: { type: string }) => r.type === 'CONSOLIDATE'
    );
    expect(consolidateRecs.length).toBe(1);
    expect(consolidateRecs[0].category).toBe('purchasing');
    expect(consolidateRecs[0].title).toContain('Consolidate');
    expect(consolidateRecs[0].title).toContain('Supplier A');
  });

  it('should generate EXPEDITE recommendations for late POs', async () => {
    (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

    (prisma.part.findMany as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.supplier.findMany as Mock).mockResolvedValue([]);

    // No consolidation POs, but has late PO
    (prisma.purchaseOrder.findMany as Mock)
      .mockResolvedValueOnce([]) // pending POs
      .mockResolvedValueOnce([
        {
          id: 'po-late',
          poNumber: 'PO-LATE-001',
          expectedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          supplier: { name: 'Late Supplier' },
        },
      ]);

    const request = new NextRequest('http://localhost:3000/api/ai/recommendations');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    const expediteRecs = data.recommendations.filter(
      (r: { type: string }) => r.type === 'EXPEDITE'
    );
    expect(expediteRecs.length).toBe(1);
    expect(expediteRecs[0].priority).toBe('HIGH');
    expect(expediteRecs[0].title).toContain('Expedite');
    expect(expediteRecs[0].title).toContain('PO-LATE-001');
  });

  it('should generate SAFETY_STOCK recommendations for parts with low available vs safety stock', async () => {
    (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

    // No reorder parts in first query
    (prisma.part.findMany as Mock)
      .mockResolvedValueOnce([])
      // Safety stock query - part with available < 80% of safety stock
      .mockResolvedValueOnce([
        {
          id: 'part-safety',
          partNumber: 'PN-SAFETY',
          name: 'Safety Part',
          safetyStock: 100,
          reorderPoint: 200,
          inventory: [{ quantity: 60, reservedQty: 0 }],
          // available = 60, safetyStock * 0.8 = 80, so 60 < 80 triggers recommendation
        },
      ]);

    (prisma.supplier.findMany as Mock).mockResolvedValue([]);
    (prisma.purchaseOrder.findMany as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost:3000/api/ai/recommendations');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    const safetyRecs = data.recommendations.filter(
      (r: { type: string }) => r.type === 'SAFETY_STOCK'
    );
    expect(safetyRecs.length).toBe(1);
    expect(safetyRecs[0].priority).toBe('MEDIUM');
    expect(safetyRecs[0].confidence).toBe(0.78);
    expect(safetyRecs[0].partId).toBe('part-safety');
  });

  // ===========================================================================
  // Summary validation
  // ===========================================================================

  it('should return correct summary with byPriority and byCategory breakdowns', async () => {
    (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

    // Create a scenario with mixed recommendations
    (prisma.part.findMany as Mock)
      .mockResolvedValueOnce([
        {
          id: 'part-1',
          partNumber: 'PN-1',
          name: 'Part One',
          reorderPoint: 50,
          safetyStock: 5,
          unitCost: 2.0,
          leadTimeDays: 7,
          inventory: [{ quantity: 3, reservedQty: 0 }], // available 3 <= safetyStock 5 -> HIGH
        },
      ])
      .mockResolvedValueOnce([]);

    (prisma.supplier.findMany as Mock).mockResolvedValue([
      {
        id: 'sup-1',
        code: 'SUP-X',
        name: 'Supplier X',
        rating: 'D',
        riskScore: {
          overallScore: 20,
          riskLevel: 'CRITICAL',
          deliveryScore: 30,
          trend: 'WORSENING',
        },
      },
    ]);

    (prisma.purchaseOrder.findMany as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost:3000/api/ai/recommendations');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary).toBeDefined();
    expect(data.summary.total).toBe(data.recommendations.length);
    expect(data.summary.byPriority).toBeDefined();
    expect(data.summary.byPriority).toHaveProperty('HIGH');
    expect(data.summary.byPriority).toHaveProperty('MEDIUM');
    expect(data.summary.byPriority).toHaveProperty('LOW');
    expect(data.summary.byCategory).toBeDefined();
    expect(data.summary.byCategory).toHaveProperty('inventory');
    expect(data.summary.byCategory).toHaveProperty('purchasing');
    expect(data.summary.byCategory).toHaveProperty('supplier');
    expect(data.summary.byCategory).toHaveProperty('production');
    expect(typeof data.summary.totalSavings).toBe('number');
  });

  // ===========================================================================
  // Error handling
  // ===========================================================================

  it('should return 500 when database query fails', async () => {
    (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

    (prisma.part.findMany as Mock).mockRejectedValue(
      new Error('Database connection failed')
    );

    const request = new NextRequest('http://localhost:3000/api/ai/recommendations');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to generate recommendations');
    expect(data.details).toBeDefined();
  });

  it('should return 500 when supplier query fails mid-execution', async () => {
    (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

    // Parts succeed
    (prisma.part.findMany as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    // Supplier fails
    (prisma.supplier.findMany as Mock).mockRejectedValue(
      new Error('Supplier query timeout')
    );

    const request = new NextRequest('http://localhost:3000/api/ai/recommendations');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to generate recommendations');
  });

  // ===========================================================================
  // Edge cases
  // ===========================================================================

  it('should handle parts with zero inventory records gracefully', async () => {
    (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

    (prisma.part.findMany as Mock)
      // First call: reorder check
      .mockResolvedValueOnce([
        {
          id: 'part-empty',
          partNumber: 'PN-EMPTY',
          name: 'Empty Part',
          reorderPoint: 10,
          safetyStock: 5,
          unitCost: 1.0,
          leadTimeDays: 3,
          inventory: [], // No inventory records
          // available = 0, reservedQty = 0, 0 <= reorderPoint of 10
        },
      ])
      // Second call: safety stock check
      .mockResolvedValueOnce([]);

    (prisma.supplier.findMany as Mock).mockResolvedValue([]);
    (prisma.purchaseOrder.findMany as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost:3000/api/ai/recommendations');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // A part with 0 available and reorderPoint 10 should generate reorder rec
    const reorderRecs = data.recommendations.filter(
      (r: { type: string }) => r.type === 'REORDER'
    );
    expect(reorderRecs.length).toBe(1);
    expect(reorderRecs[0].priority).toBe('HIGH'); // 0 <= safetyStock of 5
  });

  it('should handle multiple inventory records per part by summing quantities', async () => {
    (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

    (prisma.part.findMany as Mock)
      .mockResolvedValueOnce([
        {
          id: 'part-multi',
          partNumber: 'PN-MULTI',
          name: 'Multi Warehouse Part',
          reorderPoint: 100,
          safetyStock: 20,
          unitCost: 3.0,
          leadTimeDays: 5,
          inventory: [
            { quantity: 30, reservedQty: 5 },
            { quantity: 40, reservedQty: 10 },
            { quantity: 20, reservedQty: 0 },
          ],
          // totalQty = 90, reservedQty = 15, available = 75
          // 75 <= reorderPoint 100 -> REORDER
          // 75 > safetyStock 20 -> MEDIUM priority
        },
      ])
      .mockResolvedValueOnce([]);

    (prisma.supplier.findMany as Mock).mockResolvedValue([]);
    (prisma.purchaseOrder.findMany as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost:3000/api/ai/recommendations');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    const reorderRecs = data.recommendations.filter(
      (r: { type: string }) => r.type === 'REORDER'
    );
    expect(reorderRecs.length).toBe(1);
    expect(reorderRecs[0].priority).toBe('MEDIUM');
  });
});
