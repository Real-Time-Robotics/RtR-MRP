/**
 * BOM Explode API Route Tests
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../bom/[id]/explode/route';
import prisma from '@/lib/prisma';
import { explodeBOM } from '@/lib/bom-engine';
import { auth } from '@/lib/auth';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    product: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/bom-engine', () => ({
  explodeBOM: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

describe('BOM Explode API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/bom/[id]/explode', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/bom/prod-1/explode');
      const response = await GET(request, { params: Promise.resolve({ id: 'prod-1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when product not found', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.product.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/bom/prod-1/explode');
      const response = await GET(request, { params: Promise.resolve({ id: 'prod-1' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Product not found');
    });

    it('should return BOM explosion results successfully', async () => {
      const mockProduct = {
        id: 'prod-1',
        sku: 'SKU-001',
        name: 'Test Product',
      };

      const mockBomResults = {
        results: [
          { partId: 'part-1', needed: 10, available: 100, shortage: 0, status: 'OK' },
          { partId: 'part-2', needed: 20, available: 15, shortage: 5, status: 'SHORTAGE' },
        ],
        summary: {
          totalParts: 2,
          shortageCount: 1,
          canBuild: 7,
          totalCost: 500,
        },
      };

      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.product.findUnique as Mock).mockResolvedValue(mockProduct);
      (explodeBOM as Mock).mockResolvedValue(mockBomResults);

      const request = new NextRequest('http://localhost:3000/api/bom/prod-1/explode?quantity=10');
      const response = await GET(request, { params: Promise.resolve({ id: 'prod-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.product).toEqual(mockProduct);
      expect(data.results).toEqual(mockBomResults.results);
      expect(data.summary).toEqual(mockBomResults.summary);
      expect(explodeBOM).toHaveBeenCalledWith('prod-1', 10);
    });

    it('should use default quantity of 1 when not specified', async () => {
      const mockProduct = { id: 'prod-1', sku: 'SKU-001', name: 'Test Product' };
      const mockBomResults = { results: [], summary: {} };

      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.product.findUnique as Mock).mockResolvedValue(mockProduct);
      (explodeBOM as Mock).mockResolvedValue(mockBomResults);

      const request = new NextRequest('http://localhost:3000/api/bom/prod-1/explode');
      const response = await GET(request, { params: Promise.resolve({ id: 'prod-1' }) });

      expect(response.status).toBe(200);
      expect(explodeBOM).toHaveBeenCalledWith('prod-1', 1);
    });

    it('should return 500 when BOM explosion fails', async () => {
      const mockProduct = { id: 'prod-1', sku: 'SKU-001', name: 'Test Product' };

      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.product.findUnique as Mock).mockResolvedValue(mockProduct);
      (explodeBOM as Mock).mockRejectedValue(new Error('No active BOM found for this product'));

      const request = new NextRequest('http://localhost:3000/api/bom/prod-1/explode');
      const response = await GET(request, { params: Promise.resolve({ id: 'prod-1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to explode BOM');
    });
  });
});
