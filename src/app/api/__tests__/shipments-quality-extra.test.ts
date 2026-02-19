/**
 * Shipment Routes & Additional Quality Routes - Unit Tests
 *
 * Covers:
 *   1. GET/PATCH /api/shipments/[id]
 *   2. POST /api/shipments/[id]/pick
 *   3. GET/POST /api/shipping/backorders
 *   4. GET /api/quality/hold
 *   5. GET /api/quality/scrap
 *   6. GET /api/quality/traceability/[lotNumber]
 *   7. GET/POST /api/quality/certificates
 *   8. GET/POST /api/quality/rework
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks (must be declared before imports that reference them)
// ---------------------------------------------------------------------------

vi.mock('@/lib/prisma', () => ({
  prisma: {
    shipment: {
      findUnique: vi.fn(),
    },
    certificateOfConformance: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    salesOrder: {
      findUnique: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
    inspection: {
      findUnique: vi.fn(),
    },
  },
}));

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

vi.mock('@/lib/mrp-engine', () => ({
  confirmDelivery: vi.fn(),
  pickForShipment: vi.fn(),
}));

vi.mock('@/lib/shipping/backorder-service', () => ({
  detectBackorders: vi.fn(),
  processBackorders: vi.fn(),
  getBackorderSummary: vi.fn(),
}));

vi.mock('@/lib/quality/hold-service', () => ({
  getHoldInventory: vi.fn(),
}));

vi.mock('@/lib/quality/scrap-service', () => ({
  getScrapInventory: vi.fn(),
}));

vi.mock('@/lib/quality/traceability-engine', () => ({
  getForwardTraceability: vi.fn(),
  getBackwardTraceability: vi.fn(),
  getLotSummary: vi.fn(),
}));

vi.mock('@/lib/quality/coc-generator', () => ({
  generateCertificateNumber: vi.fn(),
}));

vi.mock('@/lib/quality/rework-wo-service', () => ({
  createReworkWorkOrder: vi.fn(),
  completeReworkWO: vi.fn(),
  getPendingReworkNCRs: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { confirmDelivery, pickForShipment } from '@/lib/mrp-engine';
import {
  detectBackorders,
  processBackorders,
  getBackorderSummary,
} from '@/lib/shipping/backorder-service';
import { getHoldInventory } from '@/lib/quality/hold-service';
import { getScrapInventory } from '@/lib/quality/scrap-service';
import {
  getForwardTraceability,
  getBackwardTraceability,
  getLotSummary,
} from '@/lib/quality/traceability-engine';
import { generateCertificateNumber } from '@/lib/quality/coc-generator';
import {
  createReworkWorkOrder,
  completeReworkWO,
  getPendingReworkNCRs,
} from '@/lib/quality/rework-wo-service';

// Route handlers
import {
  GET as getShipmentById,
  PATCH as patchShipment,
} from '../shipments/[id]/route';
import { POST as pickShipment } from '../shipments/[id]/pick/route';
import {
  GET as getBackorders,
  POST as postBackorders,
} from '../shipping/backorders/route';
import { GET as getHold } from '../quality/hold/route';
import { GET as getScrap } from '../quality/scrap/route';
import { GET as getTraceability } from '../quality/traceability/[lotNumber]/route';
import {
  GET as getCertificates,
  POST as postCertificate,
} from '../quality/certificates/route';
import {
  GET as getRework,
  POST as postRework,
} from '../quality/rework/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockSession = { user: { id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'admin' } };
const mockContext = { params: Promise.resolve({}) };
const mockContextWithId = (id: string) => ({ params: Promise.resolve({ id }) });
const mockContextWithLot = (lotNumber: string) => ({ params: Promise.resolve({ lotNumber }) });

type NextRequestInit = ConstructorParameters<typeof NextRequest>[1];

function jsonRequest(url: string, method = 'GET', body?: unknown): NextRequest {
  const init: NextRequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new NextRequest(url, init);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Shipment & Extra Quality Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated
    (auth as Mock).mockResolvedValue(mockSession);
  });

  // =========================================================================
  // 1. GET /api/shipments/[id]
  // =========================================================================
  describe('GET /api/shipments/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/shipments/ship-1');
      const res = await getShipmentById(req, mockContextWithId('ship-1'));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when shipment not found', async () => {
      (prisma.shipment.findUnique as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/shipments/nonexistent');
      const res = await getShipmentById(req, mockContextWithId('nonexistent'));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain('không tồn tại');
    });

    it('should return shipment detail on success', async () => {
      const mockShipment = {
        id: 'ship-1',
        status: 'pending',
        salesOrder: { id: 'so-1', orderNumber: 'SO-001' },
        customer: { id: 'cust-1', name: 'Customer A' },
        lines: [{ lineNumber: 1, product: { sku: 'P-001' } }],
      };
      (prisma.shipment.findUnique as Mock).mockResolvedValue(mockShipment);

      const req = new NextRequest('http://localhost:3000/api/shipments/ship-1');
      const res = await getShipmentById(req, mockContextWithId('ship-1'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.id).toBe('ship-1');
      expect(data.salesOrder.orderNumber).toBe('SO-001');
      expect(prisma.shipment.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ship-1' } }),
      );
    });

    it('should return 500 when prisma throws', async () => {
      (prisma.shipment.findUnique as Mock).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost:3000/api/shipments/ship-1');
      const res = await getShipmentById(req, mockContextWithId('ship-1'));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  // =========================================================================
  // 2. PATCH /api/shipments/[id]
  // =========================================================================
  describe('PATCH /api/shipments/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/shipments/ship-1', 'PATCH', { action: 'deliver' });
      const res = await patchShipment(req, mockContextWithId('ship-1'));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid action', async () => {
      const req = jsonRequest('http://localhost:3000/api/shipments/ship-1', 'PATCH', { action: 'invalid' });
      const res = await patchShipment(req, mockContextWithId('ship-1'));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should confirm delivery successfully', async () => {
      const mockResult = { shipment: { id: 'ship-1', status: 'delivered' }, message: 'Delivered' };
      (confirmDelivery as Mock).mockResolvedValue(mockResult);

      const req = jsonRequest('http://localhost:3000/api/shipments/ship-1', 'PATCH', { action: 'deliver' });
      const res = await patchShipment(req, mockContextWithId('ship-1'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.shipment.status).toBe('delivered');
      expect(confirmDelivery).toHaveBeenCalledWith('ship-1', 'user-1');
    });

    it('should return 400 when confirmDelivery throws', async () => {
      (confirmDelivery as Mock).mockRejectedValue(new Error('Shipment already delivered'));

      const req = jsonRequest('http://localhost:3000/api/shipments/ship-1', 'PATCH', { action: 'deliver' });
      const res = await patchShipment(req, mockContextWithId('ship-1'));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Failed to update shipment');
    });
  });

  // =========================================================================
  // 3. POST /api/shipments/[id]/pick
  // =========================================================================
  describe('POST /api/shipments/[id]/pick', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/shipments/ship-1/pick', 'POST');
      const res = await pickShipment(req, mockContextWithId('ship-1'));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should pick items successfully', async () => {
      const mockResult = {
        success: true,
        pickedItems: [{ sku: 'P-001', qty: 5 }],
        message: 'Picked OK',
      };
      (pickForShipment as Mock).mockResolvedValue(mockResult);

      const req = jsonRequest('http://localhost:3000/api/shipments/ship-1/pick', 'POST');
      const res = await pickShipment(req, mockContextWithId('ship-1'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.pickedItems).toHaveLength(1);
      expect(pickForShipment).toHaveBeenCalledWith('ship-1', 'user-1');
    });

    it('should return 400 when pickForShipment throws', async () => {
      (pickForShipment as Mock).mockRejectedValue(new Error('Insufficient stock'));

      const req = jsonRequest('http://localhost:3000/api/shipments/ship-1/pick', 'POST');
      const res = await pickShipment(req, mockContextWithId('ship-1'));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Failed to pick shipment items');
    });
  });

  // =========================================================================
  // 4. GET /api/shipping/backorders
  // =========================================================================
  describe('GET /api/shipping/backorders', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/shipping/backorders');
      const res = await getBackorders(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return backorders and summary', async () => {
      const mockBackorders = [{ id: 'bo-1', orderNumber: 'SO-001' }];
      const mockSummary = { totalBackorders: 1, totalValue: 5000 };
      (detectBackorders as Mock).mockResolvedValue(mockBackorders);
      (getBackorderSummary as Mock).mockResolvedValue(mockSummary);

      const req = new NextRequest('http://localhost:3000/api/shipping/backorders');
      const res = await getBackorders(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.summary.totalBackorders).toBe(1);
    });

    it('should return 500 when service throws', async () => {
      (detectBackorders as Mock).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost:3000/api/shipping/backorders');
      const res = await getBackorders(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to fetch backorders');
    });
  });

  // =========================================================================
  // 5. POST /api/shipping/backorders
  // =========================================================================
  describe('POST /api/shipping/backorders', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/shipping/backorders', 'POST');
      const res = await postBackorders(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should process backorders successfully', async () => {
      const mockResult = { processed: 3, created: 2 };
      (processBackorders as Mock).mockResolvedValue(mockResult);

      const req = jsonRequest('http://localhost:3000/api/shipping/backorders', 'POST');
      const res = await postBackorders(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.processed).toBe(3);
      expect(processBackorders).toHaveBeenCalledWith('user-1');
    });

    it('should return 500 when processBackorders throws', async () => {
      (processBackorders as Mock).mockRejectedValue(new Error('Processing error'));

      const req = jsonRequest('http://localhost:3000/api/shipping/backorders', 'POST');
      const res = await postBackorders(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to process backorders');
    });
  });

  // =========================================================================
  // 6. GET /api/quality/hold
  // =========================================================================
  describe('GET /api/quality/hold', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/quality/hold');
      const res = await getHold(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return hold inventory', async () => {
      const mockInventory = [{ id: 'inv-1', lotNumber: 'LOT-001', status: 'HOLD' }];
      (getHoldInventory as Mock).mockResolvedValue(mockInventory);

      const req = new NextRequest('http://localhost:3000/api/quality/hold');
      const res = await getHold(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.inventory).toHaveLength(1);
      expect(data.inventory[0].status).toBe('HOLD');
    });

    it('should return 500 when service throws', async () => {
      (getHoldInventory as Mock).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost:3000/api/quality/hold');
      const res = await getHold(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to fetch HOLD inventory');
    });
  });

  // =========================================================================
  // 7. GET /api/quality/scrap
  // =========================================================================
  describe('GET /api/quality/scrap', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/quality/scrap');
      const res = await getScrap(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return scrap inventory', async () => {
      const mockInventory = [{ id: 'inv-2', lotNumber: 'LOT-002', status: 'SCRAP' }];
      (getScrapInventory as Mock).mockResolvedValue(mockInventory);

      const req = new NextRequest('http://localhost:3000/api/quality/scrap');
      const res = await getScrap(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.inventory).toHaveLength(1);
      expect(data.inventory[0].status).toBe('SCRAP');
    });

    it('should return 500 when service throws', async () => {
      (getScrapInventory as Mock).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost:3000/api/quality/scrap');
      const res = await getScrap(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to fetch SCRAP inventory');
    });
  });

  // =========================================================================
  // 8. GET /api/quality/traceability/[lotNumber]
  // =========================================================================
  describe('GET /api/quality/traceability/[lotNumber]', () => {
    it('should return 404 when lot not found', async () => {
      (getLotSummary as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/quality/traceability/LOT-NONE');
      const res = await getTraceability(req, mockContextWithLot('LOT-NONE'));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Lot not found');
    });

    it('should return forward traceability by default', async () => {
      const mockSummary = { lotNumber: 'LOT-001', product: 'Widget A' };
      const mockForward = { nodes: [{ id: 'n1' }] };
      (getLotSummary as Mock).mockResolvedValue(mockSummary);
      (getForwardTraceability as Mock).mockResolvedValue(mockForward);

      const req = new NextRequest('http://localhost:3000/api/quality/traceability/LOT-001');
      const res = await getTraceability(req, mockContextWithLot('LOT-001'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.summary.lotNumber).toBe('LOT-001');
      expect(data.traceability.nodes).toHaveLength(1);
      expect(getForwardTraceability).toHaveBeenCalledWith('LOT-001');
      expect(getBackwardTraceability).not.toHaveBeenCalled();
    });

    it('should return backward traceability when direction=backward', async () => {
      const mockSummary = { lotNumber: 'LOT-001', product: 'Widget A' };
      const mockBackward = { sources: [{ id: 's1' }] };
      (getLotSummary as Mock).mockResolvedValue(mockSummary);
      (getBackwardTraceability as Mock).mockResolvedValue(mockBackward);

      const req = new NextRequest(
        'http://localhost:3000/api/quality/traceability/LOT-001?direction=backward',
      );
      const res = await getTraceability(req, mockContextWithLot('LOT-001'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.traceability.sources).toHaveLength(1);
      expect(getBackwardTraceability).toHaveBeenCalledWith('LOT-001');
      expect(getForwardTraceability).not.toHaveBeenCalled();
    });

    it('should return 500 when service throws', async () => {
      (getLotSummary as Mock).mockRejectedValue(new Error('Trace failed'));

      const req = new NextRequest('http://localhost:3000/api/quality/traceability/LOT-001');
      const res = await getTraceability(req, mockContextWithLot('LOT-001'));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to fetch traceability');
    });
  });

  // =========================================================================
  // 9. GET /api/quality/certificates
  // =========================================================================
  describe('GET /api/quality/certificates', () => {
    it('should return paginated certificates', async () => {
      const mockCerts = [
        {
          id: 'cert-1',
          certificateNumber: 'COC-001',
          status: 'draft',
          salesOrder: { orderNumber: 'SO-001', customer: { name: 'Cust A' } },
          product: { sku: 'P-001', name: 'Widget' },
        },
      ];
      (prisma.certificateOfConformance.findMany as Mock).mockResolvedValue(mockCerts);
      (prisma.certificateOfConformance.count as Mock).mockResolvedValue(1);

      const req = new NextRequest('http://localhost:3000/api/quality/certificates?page=1&pageSize=50');
      const res = await getCertificates(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.pagination.total).toBe(1);
      expect(data.pagination.page).toBe(1);
    });

    it('should filter by status', async () => {
      (prisma.certificateOfConformance.findMany as Mock).mockResolvedValue([]);
      (prisma.certificateOfConformance.count as Mock).mockResolvedValue(0);

      const req = new NextRequest('http://localhost:3000/api/quality/certificates?status=approved');
      const res = await getCertificates(req);

      expect(res.status).toBe(200);
      expect(prisma.certificateOfConformance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'approved' },
        }),
      );
    });

    it('should return 500 when prisma throws', async () => {
      (prisma.certificateOfConformance.findMany as Mock).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost:3000/api/quality/certificates');
      const res = await getCertificates(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  // =========================================================================
  // 10. POST /api/quality/certificates
  // =========================================================================
  describe('POST /api/quality/certificates', () => {
    const validBody = {
      salesOrderId: 'so-1',
      productId: 'prod-1',
      quantity: 10,
    };

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/quality/certificates', 'POST', validBody);
      const res = await postCertificate(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid body (missing required fields)', async () => {
      const req = jsonRequest('http://localhost:3000/api/quality/certificates', 'POST', { quantity: 0 });
      const res = await postCertificate(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return 400 when sales order does not exist', async () => {
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/quality/certificates', 'POST', validBody);
      const res = await postCertificate(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Đơn hàng không tồn tại');
    });

    it('should return 400 when product does not exist', async () => {
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue({ id: 'so-1' });
      (prisma.product.findUnique as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/quality/certificates', 'POST', validBody);
      const res = await postCertificate(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Sản phẩm không tồn tại');
    });

    it('should create certificate successfully', async () => {
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue({ id: 'so-1' });
      (prisma.product.findUnique as Mock).mockResolvedValue({ id: 'prod-1' });
      (generateCertificateNumber as Mock).mockResolvedValue('COC-2026-0001');
      const mockCert = { id: 'cert-1', certificateNumber: 'COC-2026-0001', status: 'draft' };
      (prisma.certificateOfConformance.create as Mock).mockResolvedValue(mockCert);

      const req = jsonRequest('http://localhost:3000/api/quality/certificates', 'POST', validBody);
      const res = await postCertificate(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.certificateNumber).toBe('COC-2026-0001');
      expect(prisma.certificateOfConformance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            certificateNumber: 'COC-2026-0001',
            salesOrderId: 'so-1',
            productId: 'prod-1',
            quantity: 10,
            status: 'draft',
          }),
        }),
      );
    });

    it('should return 400 when inspection does not exist', async () => {
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue({ id: 'so-1' });
      (prisma.product.findUnique as Mock).mockResolvedValue({ id: 'prod-1' });
      (prisma.inspection.findUnique as Mock).mockResolvedValue(null);

      const bodyWithInspection = { ...validBody, inspectionId: 'insp-missing' };
      const req = jsonRequest('http://localhost:3000/api/quality/certificates', 'POST', bodyWithInspection);
      const res = await postCertificate(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Kiểm tra không tồn tại');
    });
  });

  // =========================================================================
  // 11. GET /api/quality/rework
  // =========================================================================
  describe('GET /api/quality/rework', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/quality/rework');
      const res = await getRework(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return pending rework NCRs', async () => {
      const mockPending = [{ id: 'ncr-1', status: 'rework_pending' }];
      (getPendingReworkNCRs as Mock).mockResolvedValue(mockPending);

      const req = new NextRequest('http://localhost:3000/api/quality/rework');
      const res = await getRework(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
    });

    it('should return 500 when service throws', async () => {
      (getPendingReworkNCRs as Mock).mockRejectedValue(new Error('Service error'));

      const req = new NextRequest('http://localhost:3000/api/quality/rework');
      const res = await getRework(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to fetch pending rework NCRs');
    });
  });

  // =========================================================================
  // 12. POST /api/quality/rework (create)
  // =========================================================================
  describe('POST /api/quality/rework — create rework WO', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/quality/rework', 'POST', {
        ncrId: 'ncr-1',
        reworkInstructions: 'Fix it',
        quantity: 5,
      });
      const res = await postRework(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid body', async () => {
      const req = jsonRequest('http://localhost:3000/api/quality/rework', 'POST', {
        ncrId: '',
        reworkInstructions: '',
        quantity: 0,
      });
      const res = await postRework(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should create rework work order successfully', async () => {
      const mockResult = { id: 'rwo-1', status: 'open' };
      (createReworkWorkOrder as Mock).mockResolvedValue(mockResult);

      const req = jsonRequest('http://localhost:3000/api/quality/rework', 'POST', {
        ncrId: 'ncr-1',
        reworkInstructions: 'Re-machine part to spec',
        quantity: 5,
      });
      const res = await postRework(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.id).toBe('rwo-1');
      expect(createReworkWorkOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          ncrId: 'ncr-1',
          reworkInstructions: 'Re-machine part to spec',
          quantity: 5,
          userId: 'user-1',
        }),
      );
    });
  });

  // =========================================================================
  // 13. POST /api/quality/rework (complete)
  // =========================================================================
  describe('POST /api/quality/rework — complete rework WO', () => {
    it('should complete rework work order successfully', async () => {
      const mockResult = { id: 'rwo-1', status: 'completed' };
      (completeReworkWO as Mock).mockResolvedValue(mockResult);

      const req = jsonRequest('http://localhost:3000/api/quality/rework', 'POST', {
        action: 'complete',
        workOrderId: 'rwo-1',
        completedQty: 5,
        notes: 'All good',
      });
      const res = await postRework(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('completed');
      expect(completeReworkWO).toHaveBeenCalledWith('rwo-1', 5, 'user-1', 'All good');
    });

    it('should return 500 when rework service throws', async () => {
      (createReworkWorkOrder as Mock).mockRejectedValue(new Error('Service error'));

      const req = jsonRequest('http://localhost:3000/api/quality/rework', 'POST', {
        ncrId: 'ncr-1',
        reworkInstructions: 'Fix it',
        quantity: 3,
      });
      const res = await postRework(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to process rework request');
    });
  });
});
