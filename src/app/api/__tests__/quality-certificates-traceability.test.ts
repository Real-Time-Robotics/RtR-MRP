/**
 * Quality Certificates & Traceability API Route Tests
 *
 * Covers routes NOT already tested in shipments-quality-extra.test.ts:
 *   1. GET /api/quality/certificates          - Additional edge cases
 *   2. POST /api/quality/certificates         - Additional validation scenarios
 *   3. POST /api/quality/certificates/[id]/generate - Generate CoC PDF
 *   4. GET /api/quality/traceability/[lotNumber]     - Additional edge cases
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks (must be declared before imports that reference them)
// ---------------------------------------------------------------------------

vi.mock('@/lib/prisma', () => ({
  prisma: {
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

vi.mock('@/lib/rate-limit', () => ({
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
  checkHeavyEndpointLimit: vi.fn().mockResolvedValue(null),
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

vi.mock('@/lib/quality/coc-generator', () => ({
  generateCertificateNumber: vi.fn(),
  generateCoCPDF: vi.fn(),
}));

vi.mock('@/lib/quality/traceability-engine', () => ({
  getForwardTraceability: vi.fn(),
  getBackwardTraceability: vi.fn(),
  getLotSummary: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { generateCertificateNumber, generateCoCPDF } from '@/lib/quality/coc-generator';
import {
  getForwardTraceability,
  getBackwardTraceability,
  getLotSummary,
} from '@/lib/quality/traceability-engine';

import {
  GET as getCertificates,
  POST as postCertificate,
} from '../quality/certificates/route';
import { GET as generateCertificate } from '../quality/certificates/[id]/generate/route';
import { GET as getTraceability } from '../quality/traceability/[lotNumber]/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockSession = {
  user: { id: 'user-1', name: 'Test User', email: 'test@test.com', role: 'ADMIN' },
};
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

describe('Quality Certificates & Traceability Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockSession);
  });

  // =========================================================================
  // 1. GET /api/quality/certificates — Additional edge cases
  // =========================================================================
  describe('GET /api/quality/certificates', () => {
    it('should return empty list when no certificates exist', async () => {
      (prisma.certificateOfConformance.findMany as Mock).mockResolvedValue([]);
      (prisma.certificateOfConformance.count as Mock).mockResolvedValue(0);

      const req = new NextRequest('http://localhost:3000/api/quality/certificates');
      const res = await getCertificates(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.pagination.total).toBe(0);
      expect(data.pagination.totalPages).toBe(0);
    });

    it('should not filter when status is "all"', async () => {
      (prisma.certificateOfConformance.findMany as Mock).mockResolvedValue([]);
      (prisma.certificateOfConformance.count as Mock).mockResolvedValue(0);

      const req = new NextRequest('http://localhost:3000/api/quality/certificates?status=all');
      const res = await getCertificates(req);

      expect(res.status).toBe(200);
      const findManyCall = (prisma.certificateOfConformance.findMany as Mock).mock.calls[0][0];
      expect(findManyCall.where).toEqual({});
    });

    it('should filter by specific status', async () => {
      (prisma.certificateOfConformance.findMany as Mock).mockResolvedValue([]);
      (prisma.certificateOfConformance.count as Mock).mockResolvedValue(0);

      const req = new NextRequest('http://localhost:3000/api/quality/certificates?status=approved');
      const res = await getCertificates(req);

      expect(res.status).toBe(200);
      const findManyCall = (prisma.certificateOfConformance.findMany as Mock).mock.calls[0][0];
      expect(findManyCall.where.status).toBe('approved');
    });

    it('should include salesOrder and product in response', async () => {
      const mockCerts = [
        {
          id: 'cert-1',
          certificateNumber: 'COC-2026-0001',
          status: 'draft',
          salesOrder: { orderNumber: 'SO-001', customer: { name: 'Acme Corp' } },
          product: { sku: 'P-001', name: 'Widget A' },
        },
      ];
      (prisma.certificateOfConformance.findMany as Mock).mockResolvedValue(mockCerts);
      (prisma.certificateOfConformance.count as Mock).mockResolvedValue(1);

      const req = new NextRequest('http://localhost:3000/api/quality/certificates');
      const res = await getCertificates(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data[0].salesOrder.customer.name).toBe('Acme Corp');
      expect(data.data[0].product.sku).toBe('P-001');
    });

    it('should return 500 when database query fails', async () => {
      (prisma.certificateOfConformance.findMany as Mock).mockRejectedValue(new Error('Connection lost'));
      (prisma.certificateOfConformance.count as Mock).mockRejectedValue(new Error('Connection lost'));

      const req = new NextRequest('http://localhost:3000/api/quality/certificates');
      const res = await getCertificates(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  // =========================================================================
  // 2. POST /api/quality/certificates — Additional validation
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

    it('should return 400 when required fields are missing', async () => {
      const req = jsonRequest('http://localhost:3000/api/quality/certificates', 'POST', {
        quantity: 5,
      });
      const res = await postCertificate(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.details).toBeDefined();
    });

    it('should return 400 when quantity is less than 1', async () => {
      const req = jsonRequest('http://localhost:3000/api/quality/certificates', 'POST', {
        salesOrderId: 'so-1',
        productId: 'prod-1',
        quantity: 0,
      });
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

    it('should return 400 when referenced inspection does not exist', async () => {
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

    it('should create certificate successfully with lot and serial numbers', async () => {
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue({ id: 'so-1' });
      (prisma.product.findUnique as Mock).mockResolvedValue({ id: 'prod-1' });
      (generateCertificateNumber as Mock).mockResolvedValue('COC-2026-0002');

      const mockCert = {
        id: 'cert-2',
        certificateNumber: 'COC-2026-0002',
        status: 'draft',
        lotNumbers: ['LOT-001', 'LOT-002'],
        serialNumbers: ['SN-001'],
        quantity: 10,
      };
      (prisma.certificateOfConformance.create as Mock).mockResolvedValue(mockCert);

      const bodyWithExtras = {
        ...validBody,
        lotNumbers: ['LOT-001', 'LOT-002'],
        serialNumbers: ['SN-001'],
      };
      const req = jsonRequest('http://localhost:3000/api/quality/certificates', 'POST', bodyWithExtras);
      const res = await postCertificate(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.certificateNumber).toBe('COC-2026-0002');
      expect(data.lotNumbers).toEqual(['LOT-001', 'LOT-002']);
      expect(data.serialNumbers).toEqual(['SN-001']);
    });

    it('should return 500 when database create fails', async () => {
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue({ id: 'so-1' });
      (prisma.product.findUnique as Mock).mockResolvedValue({ id: 'prod-1' });
      (generateCertificateNumber as Mock).mockResolvedValue('COC-2026-0003');
      (prisma.certificateOfConformance.create as Mock).mockRejectedValue(new Error('DB create failed'));

      const req = jsonRequest('http://localhost:3000/api/quality/certificates', 'POST', validBody);
      const res = await postCertificate(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  // =========================================================================
  // 3. GET /api/quality/certificates/[id]/generate — Generate CoC PDF
  // =========================================================================
  describe('GET /api/quality/certificates/[id]/generate', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/quality/certificates/cert-1/generate');
      const res = await generateCertificate(req, mockContextWithId('cert-1'));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should generate PDF successfully and return correct headers', async () => {
      const mockPdfBlob = new Blob(['%PDF-mock-content'], { type: 'application/pdf' });
      (generateCoCPDF as Mock).mockResolvedValue(mockPdfBlob);

      const req = new NextRequest('http://localhost:3000/api/quality/certificates/cert-1/generate');
      const res = await generateCertificate(req, mockContextWithId('cert-1'));

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
      expect(res.headers.get('Content-Disposition')).toContain('CoC-cert-1.pdf');
    });

    it('should call generateCoCPDF with the correct certificate ID', async () => {
      const mockPdfBlob = new Blob(['%PDF-data'], { type: 'application/pdf' });
      (generateCoCPDF as Mock).mockResolvedValue(mockPdfBlob);

      const req = new NextRequest('http://localhost:3000/api/quality/certificates/cert-42/generate');
      await generateCertificate(req, mockContextWithId('cert-42'));

      expect(generateCoCPDF).toHaveBeenCalledWith('cert-42');
    });

    it('should return 500 when PDF generation fails', async () => {
      (generateCoCPDF as Mock).mockRejectedValue(new Error('PDF generation failed'));

      const req = new NextRequest('http://localhost:3000/api/quality/certificates/cert-1/generate');
      const res = await generateCertificate(req, mockContextWithId('cert-1'));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to generate certificate PDF');
    });
  });

  // =========================================================================
  // 4. GET /api/quality/traceability/[lotNumber] — Additional edge cases
  // =========================================================================
  describe('GET /api/quality/traceability/[lotNumber]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/quality/traceability/LOT-001');
      const res = await getTraceability(req, mockContextWithLot('LOT-001'));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when lot is not found', async () => {
      (getLotSummary as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/quality/traceability/LOT-NONEXISTENT');
      const res = await getTraceability(req, mockContextWithLot('LOT-NONEXISTENT'));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Lot not found');
    });

    it('should return forward traceability by default', async () => {
      const mockSummary = { lotNumber: 'LOT-001', product: 'Widget A', quantity: 100 };
      const mockForward = { nodes: [{ id: 'n1', type: 'production' }], edges: [] };
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
      const mockSummary = { lotNumber: 'LOT-001', product: 'Widget A', quantity: 100 };
      const mockBackward = { sources: [{ id: 's1', supplier: 'Steel Corp' }] };
      (getLotSummary as Mock).mockResolvedValue(mockSummary);
      (getBackwardTraceability as Mock).mockResolvedValue(mockBackward);

      const req = new NextRequest('http://localhost:3000/api/quality/traceability/LOT-001?direction=backward');
      const res = await getTraceability(req, mockContextWithLot('LOT-001'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.summary).toBeDefined();
      expect(data.traceability.sources).toHaveLength(1);
      expect(getBackwardTraceability).toHaveBeenCalledWith('LOT-001');
      expect(getForwardTraceability).not.toHaveBeenCalled();
    });

    it('should return null traceability for unrecognized direction', async () => {
      const mockSummary = { lotNumber: 'LOT-001', product: 'Widget A' };
      (getLotSummary as Mock).mockResolvedValue(mockSummary);

      const req = new NextRequest('http://localhost:3000/api/quality/traceability/LOT-001?direction=sideways');
      const res = await getTraceability(req, mockContextWithLot('LOT-001'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.summary).toBeDefined();
      expect(data.traceability).toBeNull();
      expect(getForwardTraceability).not.toHaveBeenCalled();
      expect(getBackwardTraceability).not.toHaveBeenCalled();
    });

    it('should return 500 when traceability service throws', async () => {
      (getLotSummary as Mock).mockRejectedValue(new Error('Traceability engine error'));

      const req = new NextRequest('http://localhost:3000/api/quality/traceability/LOT-001');
      const res = await getTraceability(req, mockContextWithLot('LOT-001'));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to fetch traceability');
    });
  });
});
