/**
 * Mobile API Routes Tests
 * Tests for POST /api/mobile/scan, POST /api/mobile/receiving, POST /api/mobile/inventory
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

vi.mock('@/lib/mobile', () => ({
  parseScanBarcode: vi.fn((barcode: string) => {
    if (barcode.startsWith('RTR-')) {
      return { type: 'PART', value: barcode, format: 'CODE128', confidence: 0.95 };
    }
    if (barcode.startsWith('WO-')) {
      return { type: 'WORK_ORDER', value: barcode, format: 'CODE128', confidence: 0.9 };
    }
    return { type: 'UNKNOWN', value: barcode, format: 'UNKNOWN', confidence: 0.5 };
  }),
  getAvailableActions: vi.fn(() => ['view', 'adjust', 'transfer']),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkWriteEndpointLimit: vi.fn(() => Promise.resolve(null)),
  checkReadEndpointLimit: vi.fn(() => Promise.resolve(null)),
}));

import { auth } from '@/lib/auth';

// Mock context for withAuth wrapper (Next.js 15 async params)
const mockContext = { params: Promise.resolve({}) };

const mockSession = {
  user: { id: 'user-1', email: 'test@test.com', role: 'admin', name: 'Test User' },
};

function createPostRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// ===========================================================================
// MOBILE SCAN TESTS
// ===========================================================================
describe('Mobile API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockSession);
  });

  describe('POST /api/mobile/scan', () => {
    let POST: Function;

    beforeEach(async () => {
      const module = await import('../mobile/scan/route');
      POST = module.POST;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = createPostRequest('http://localhost:3000/api/mobile/scan', {
        barcode: 'RTR-MOTOR-001',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return part info for valid barcode', async () => {
      const request = createPostRequest('http://localhost:3000/api/mobile/scan', {
        barcode: 'RTR-MOTOR-001',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.scan).toBeDefined();
      expect(data.scan.type).toBe('PART');
      expect(data.scan.value).toBe('RTR-MOTOR-001');
      expect(data.resolved).toBe(true);
      expect(data.entity).toBeDefined();
      expect(data.actions).toBeDefined();
    });

    it('should return 400 for invalid body (missing barcode)', async () => {
      const request = createPostRequest('http://localhost:3000/api/mobile/scan', {});
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle unresolved barcode gracefully', async () => {
      const request = createPostRequest('http://localhost:3000/api/mobile/scan', {
        barcode: 'UNKNOWN-CODE-999',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.resolved).toBe(false);
    });

    it('should accept optional context field', async () => {
      const request = createPostRequest('http://localhost:3000/api/mobile/scan', {
        barcode: 'RTR-MOTOR-001',
        context: 'receiving',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  // ===========================================================================
  // MOBILE RECEIVING TESTS
  // ===========================================================================
  describe('POST /api/mobile/receiving', () => {
    let POST: Function;

    beforeEach(async () => {
      const module = await import('../mobile/receiving/route');
      POST = module.POST;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = createPostRequest('http://localhost:3000/api/mobile/receiving', {
        poId: 'po1',
        lineId: 'pol1',
        qtyReceived: 10,
        locationId: 'loc1',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should process valid receiving and return receipt', async () => {
      const request = createPostRequest('http://localhost:3000/api/mobile/receiving', {
        poId: 'po1',
        lineId: 'pol1',
        qtyReceived: 10,
        locationId: 'loc1',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.receiptId).toBeDefined();
      expect(data.data.qtyReceived).toBe(10);
      expect(data.data.partNumber).toBe('RTR-MOTOR-001');
    });

    it('should return 400 for invalid body (missing required fields)', async () => {
      const request = createPostRequest('http://localhost:3000/api/mobile/receiving', {
        poId: 'po1',
        // missing lineId, qtyReceived, locationId
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 404 when PO not found', async () => {
      const request = createPostRequest('http://localhost:3000/api/mobile/receiving', {
        poId: 'nonexistent',
        lineId: 'pol1',
        qtyReceived: 10,
        locationId: 'loc1',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should return 400 when qty exceeds remaining', async () => {
      const request = createPostRequest('http://localhost:3000/api/mobile/receiving', {
        poId: 'po1',
        lineId: 'pol1',
        qtyReceived: 999, // exceeds remaining of 50
        locationId: 'loc1',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('exceeds');
    });

    it('should accept optional lotNumber and notes', async () => {
      const request = createPostRequest('http://localhost:3000/api/mobile/receiving', {
        poId: 'po1',
        lineId: 'pol1',
        qtyReceived: 5,
        locationId: 'loc1',
        lotNumber: 'LOT-2024-001',
        notes: 'Inspection passed',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.lotNumber).toBe('LOT-2024-001');
    });
  });

  // ===========================================================================
  // MOBILE INVENTORY TESTS
  // ===========================================================================
  describe('POST /api/mobile/inventory', () => {
    let POST: Function;

    beforeEach(async () => {
      const module = await import('../mobile/inventory/route');
      POST = module.POST;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = createPostRequest('http://localhost:3000/api/mobile/inventory', {
        action: 'adjust',
        partId: '1',
        locationId: 'loc1',
        adjustmentType: 'add',
        quantity: 10,
        reason: 'Stock correction',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle adjust action successfully', async () => {
      const request = createPostRequest('http://localhost:3000/api/mobile/inventory', {
        action: 'adjust',
        partId: '1',
        partNumber: 'RTR-MOTOR-001',
        locationId: 'loc1',
        adjustmentType: 'add',
        quantity: 10,
        reason: 'Stock correction',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.transactionId).toBeDefined();
      expect(data.message).toContain('increased');
    });

    it('should handle transfer action successfully', async () => {
      const request = createPostRequest('http://localhost:3000/api/mobile/inventory', {
        action: 'transfer',
        partId: '1',
        partNumber: 'RTR-MOTOR-001',
        fromLocationId: 'loc1',
        toLocationId: 'loc2',
        quantity: 5,
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.transferId).toBeDefined();
    });

    it('should return 400 for invalid action', async () => {
      const request = createPostRequest('http://localhost:3000/api/mobile/inventory', {
        action: 'invalid_action',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid action');
    });

    it('should handle cycle count action', async () => {
      const request = createPostRequest('http://localhost:3000/api/mobile/inventory', {
        action: 'count',
        items: [
          {
            partId: '1',
            partNumber: 'RTR-MOTOR-001',
            locationId: 'loc1',
            systemQty: 100,
            countedQty: 98,
          },
        ],
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.countSessionId).toBeDefined();
      expect(data.summary.totalItems).toBe(1);
      expect(data.summary.itemsWithVariance).toBe(1);
    });

    it('should return 400 for adjust with missing required fields', async () => {
      const request = createPostRequest('http://localhost:3000/api/mobile/inventory', {
        action: 'adjust',
        // missing partId, locationId, quantity, reason
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for transfer with same source and destination', async () => {
      const request = createPostRequest('http://localhost:3000/api/mobile/inventory', {
        action: 'transfer',
        partId: '1',
        fromLocationId: 'loc1',
        toLocationId: 'loc1',
        quantity: 5,
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('different');
    });
  });
});
