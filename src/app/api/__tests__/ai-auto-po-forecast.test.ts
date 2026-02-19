/**
 * AI Auto-PO & Forecast API Route Tests
 * Tests for:
 *   - GET/POST /api/ai/auto-po
 *   - POST /api/ai/auto-po/approve
 *   - POST /api/ai/auto-po/execute
 *   - GET /api/ai/auto-po/stats
 *   - GET/POST /api/ai/forecast
 *   - GET /api/ai/forecast/[productId]
 *   - GET/POST /api/ai/forecast/accuracy
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Mock: Auto-PO Engine & Approval Queue
// ---------------------------------------------------------------------------

const mockGeneratePOSuggestion = vi.fn();
const mockBatchGenerateSuggestions = vi.fn();
const mockEnhanceSuggestion = vi.fn();
const mockAddToQueue = vi.fn();
const mockGetQueueItem = vi.fn();
const mockApproveItem = vi.fn();
const mockGetQueueStats = vi.fn();

vi.mock('@/lib/ai/autonomous', () => ({
  getPOSuggestionEngine: () => ({
    generatePOSuggestion: (...args: unknown[]) => mockGeneratePOSuggestion(...args),
    batchGenerateSuggestions: (...args: unknown[]) => mockBatchGenerateSuggestions(...args),
  }),
  getAIPOAnalyzer: () => ({
    enhanceSuggestion: (...args: unknown[]) => mockEnhanceSuggestion(...args),
  }),
  POSuggestion: {},
  EnhancedPOSuggestion: {},
}));

vi.mock('@/lib/ai/autonomous/approval-queue-service', () => ({
  approvalQueueService: {
    addToQueue: (...args: unknown[]) => mockAddToQueue(...args),
    getQueueItem: (...args: unknown[]) => mockGetQueueItem(...args),
    approveItem: (...args: unknown[]) => mockApproveItem(...args),
    getQueueStats: (...args: unknown[]) => mockGetQueueStats(...args),
  },
}));

// ---------------------------------------------------------------------------
// Mock: Forecast Engine
// ---------------------------------------------------------------------------

const mockGenerateForecast = vi.fn();
const mockSaveForecast = vi.fn();
const mockGenerateAllForecasts = vi.fn();
const mockEnhanceForecast = vi.fn();
const mockGetAccuracySummary = vi.fn();
const mockGetModelPerformance = vi.fn();
const mockGetProductAccuracy = vi.fn();
const mockCompareForecastVsActual = vi.fn();
const mockAutoRecordActuals = vi.fn();
const mockExtractProductSalesHistory = vi.fn();

vi.mock('@/lib/ai/forecast', () => ({
  getForecastEngine: () => ({
    generateForecast: (...args: unknown[]) => mockGenerateForecast(...args),
    saveForecast: (...args: unknown[]) => mockSaveForecast(...args),
    generateAllForecasts: (...args: unknown[]) => mockGenerateAllForecasts(...args),
  }),
  getAIEnhancerService: () => ({
    enhanceForecast: (...args: unknown[]) => mockEnhanceForecast(...args),
  }),
  getAccuracyTrackerService: () => ({
    getAccuracySummary: (...args: unknown[]) => mockGetAccuracySummary(...args),
    getModelPerformance: (...args: unknown[]) => mockGetModelPerformance(...args),
    getProductAccuracy: (...args: unknown[]) => mockGetProductAccuracy(...args),
    compareForecastVsActual: (...args: unknown[]) => mockCompareForecastVsActual(...args),
    autoRecordActuals: (...args: unknown[]) => mockAutoRecordActuals(...args),
  }),
  getDataExtractorService: () => ({
    extractProductSalesHistory: (...args: unknown[]) => mockExtractProductSalesHistory(...args),
  }),
  ForecastConfig: {},
  ForecastResult: {},
  EnhancedForecast: {},
  AccuracyMetrics: {},
}));

// ---------------------------------------------------------------------------
// Mock: Prisma
// ---------------------------------------------------------------------------

vi.mock('@/lib/prisma', () => {
  const prismaMock = {
    purchaseOrder: {
      create: vi.fn(),
      update: vi.fn(),
    },
    purchaseOrderLine: {
      create: vi.fn(),
    },
    demandForecast: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    part: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  };
  return { prisma: prismaMock, default: prismaMock };
});

// ---------------------------------------------------------------------------
// Mock: Auth, Rate-limit, Logger
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Import routes AFTER mocks
// ---------------------------------------------------------------------------

import { GET as AUTO_PO_GET, POST as AUTO_PO_POST } from '../ai/auto-po/route';
import { POST as APPROVE_POST } from '../ai/auto-po/approve/route';
import { POST as EXECUTE_POST } from '../ai/auto-po/execute/route';
import { GET as STATS_GET } from '../ai/auto-po/stats/route';
import { GET as FORECAST_GET, POST as FORECAST_POST } from '../ai/forecast/route';
import { GET as PRODUCT_FORECAST_GET } from '../ai/forecast/[productId]/route';
import { GET as ACCURACY_GET, POST as ACCURACY_POST } from '../ai/forecast/accuracy/route';
import { prisma } from '@/lib/prisma';

// Mock context for withAuth wrapper (Next.js 15 async params)
const mockContext = { params: Promise.resolve({}) };
const mockProductContext = { params: Promise.resolve({ productId: 'prod-1' }) };

// Authenticated session
const mockSession = {
  user: { id: 'user-1', email: 'test@test.com', role: 'ADMIN', name: 'Test User' },
};

// =============================================================================
// AUTO-PO TESTS
// =============================================================================

describe('AI Auto-PO API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET /api/ai/auto-po
  // =========================================================================
  describe('GET /api/ai/auto-po', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/auto-po?partId=part-1');
      const response = await AUTO_PO_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when partId is missing', async () => {
      (auth as Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/ai/auto-po');
      const response = await AUTO_PO_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('partId is required');
    });

    it('should return suggestion for a part successfully', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      const mockSuggestion = {
        partId: 'part-1',
        quantity: 100,
        totalAmount: 5000,
        confidenceScore: 0.85,
      };
      mockGeneratePOSuggestion.mockResolvedValue(mockSuggestion);
      mockEnhanceSuggestion.mockResolvedValue({ ...mockSuggestion, aiInsight: 'Recommended' });

      const request = new NextRequest('http://localhost:3000/api/ai/auto-po?partId=part-1');
      const response = await AUTO_PO_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.suggestion).toBeDefined();
      expect(mockGeneratePOSuggestion).toHaveBeenCalledWith('part-1');
      expect(mockEnhanceSuggestion).toHaveBeenCalledWith(mockSuggestion);
    });

    it('should return null suggestion when no reorder needed', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGeneratePOSuggestion.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/auto-po?partId=part-1');
      const response = await AUTO_PO_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.suggestion).toBeNull();
      expect(data.message).toBe('No reorder needed for this part');
    });

    it('should return 500 when engine throws', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGeneratePOSuggestion.mockRejectedValue(new Error('Engine failure'));

      const request = new NextRequest('http://localhost:3000/api/ai/auto-po?partId=part-1');
      const response = await AUTO_PO_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to get PO suggestion');
    });
  });

  // =========================================================================
  // POST /api/ai/auto-po
  // =========================================================================
  describe('POST /api/ai/auto-po', () => {
    it('should generate batch suggestions successfully', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      const mockSuggestions = [
        { partId: 'p1', quantity: 50, totalAmount: 2500, confidenceScore: 0.9 },
        { partId: 'p2', quantity: 30, totalAmount: 1500, confidenceScore: 0.7 },
      ];
      mockBatchGenerateSuggestions.mockResolvedValue(mockSuggestions);
      mockEnhanceSuggestion.mockImplementation((s: unknown) => Promise.resolve(s));
      mockAddToQueue.mockResolvedValue({ id: 'queue-1' });

      const request = new NextRequest('http://localhost:3000/api/ai/auto-po', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await AUTO_PO_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.suggestions).toHaveLength(2);
      expect(data.summary).toBeDefined();
      expect(data.summary.total).toBe(2);
    });

    it('should return 400 for invalid input', async () => {
      (auth as Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/ai/auto-po', {
        method: 'POST',
        body: JSON.stringify({ partIds: 'not-an-array' }),
      });
      const response = await AUTO_PO_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid input');
    });

    it('should return 500 when batch generation fails', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockBatchGenerateSuggestions.mockRejectedValue(new Error('Batch failure'));

      const request = new NextRequest('http://localhost:3000/api/ai/auto-po', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await AUTO_PO_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate PO suggestions');
    });
  });

  // =========================================================================
  // POST /api/ai/auto-po/approve
  // =========================================================================
  describe('POST /api/ai/auto-po/approve', () => {
    it('should approve a queue item successfully', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetQueueItem.mockResolvedValue({
        id: 'queue-1',
        status: 'pending',
        suggestion: { partId: 'p1', quantity: 50 },
      });
      mockApproveItem.mockResolvedValue({
        id: 'queue-1',
        status: 'approved',
      });

      const request = new NextRequest('http://localhost:3000/api/ai/auto-po/approve', {
        method: 'POST',
        body: JSON.stringify({ queueItemId: 'queue-1', notes: 'Looks good' }),
      });
      const response = await APPROVE_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('PO suggestion approved successfully');
      expect(data.approvedBy.userId).toBe('user-1');
    });

    it('should return 400 when queueItemId is missing', async () => {
      (auth as Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/ai/auto-po/approve', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await APPROVE_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should return 404 when queue item not found', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetQueueItem.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/auto-po/approve', {
        method: 'POST',
        body: JSON.stringify({ queueItemId: 'nonexistent' }),
      });
      const response = await APPROVE_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Queue item not found');
    });

    it('should return 400 when item already processed', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetQueueItem.mockResolvedValue({
        id: 'queue-1',
        status: 'approved',
        suggestion: { partId: 'p1' },
      });

      const request = new NextRequest('http://localhost:3000/api/ai/auto-po/approve', {
        method: 'POST',
        body: JSON.stringify({ queueItemId: 'queue-1' }),
      });
      const response = await APPROVE_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already');
    });
  });

  // =========================================================================
  // POST /api/ai/auto-po/execute
  // =========================================================================
  describe('POST /api/ai/auto-po/execute', () => {
    it('should execute an approved PO successfully', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetQueueItem.mockResolvedValue({
        id: 'queue-1',
        status: 'approved',
        suggestion: {
          partId: 'p1',
          supplierId: 'sup-1',
          quantity: 100,
          unitPrice: 50,
          totalAmount: 5000,
          partNumber: 'PN-001',
          reason: 'Low stock',
        },
      });
      (prisma.purchaseOrder.create as Mock).mockResolvedValue({ id: 'po-new' });
      (prisma.purchaseOrderLine.create as Mock).mockResolvedValue({ id: 'pol-1' });
      (prisma.purchaseOrder.update as Mock).mockResolvedValue({ id: 'po-new', status: 'pending' });

      const request = new NextRequest('http://localhost:3000/api/ai/auto-po/execute', {
        method: 'POST',
        body: JSON.stringify({ queueItemId: 'queue-1' }),
      });
      const response = await EXECUTE_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.purchaseOrder.id).toBe('po-new');
      expect(data.purchaseOrder.status).toBe('pending');
    });

    it('should return 400 when item is not approved', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetQueueItem.mockResolvedValue({
        id: 'queue-1',
        status: 'pending',
        suggestion: { partId: 'p1' },
      });

      const request = new NextRequest('http://localhost:3000/api/ai/auto-po/execute', {
        method: 'POST',
        body: JSON.stringify({ queueItemId: 'queue-1' }),
      });
      const response = await EXECUTE_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Cannot execute');
    });

    it('should return 404 when queue item not found', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetQueueItem.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/auto-po/execute', {
        method: 'POST',
        body: JSON.stringify({ queueItemId: 'nonexistent' }),
      });
      const response = await EXECUTE_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Queue item not found');
    });
  });

  // =========================================================================
  // GET /api/ai/auto-po/stats
  // =========================================================================
  describe('GET /api/ai/auto-po/stats', () => {
    it('should return stats successfully', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetQueueStats.mockResolvedValue({
        totalPending: 5,
        byStatus: { pending: 5, approved: 10, rejected: 2, expired: 1 },
        totalValue: 50000,
        avgConfidence: 0.82,
      });

      const request = new NextRequest('http://localhost:3000/api/ai/auto-po/stats');
      const response = await STATS_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
      expect(data.stats.queue.pending).toBe(5);
      expect(data.stats.rates).toBeDefined();
      expect(data.stats.value).toBeDefined();
      expect(data.generatedAt).toBeDefined();
    });

    it('should return detailed stats when detailed=true', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetQueueStats.mockResolvedValue({
        totalPending: 3,
        byStatus: { pending: 3, approved: 8, rejected: 1, expired: 0 },
        totalValue: 30000,
        avgConfidence: 0.78,
      });

      const request = new NextRequest('http://localhost:3000/api/ai/auto-po/stats?detailed=true');
      const response = await STATS_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.byConfidence).toBeDefined();
      expect(data.stats.trends).toBeDefined();
    });

    it('should return 500 when stats service fails', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetQueueStats.mockRejectedValue(new Error('Stats failed'));

      const request = new NextRequest('http://localhost:3000/api/ai/auto-po/stats');
      const response = await STATS_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to get statistics');
    });
  });
});

// =============================================================================
// FORECAST TESTS
// =============================================================================

describe('AI Forecast API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // POST /api/ai/forecast
  // =========================================================================
  describe('POST /api/ai/forecast', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/forecast', {
        method: 'POST',
        body: JSON.stringify({ productId: 'prod-1', action: 'generate' }),
      });
      const response = await FORECAST_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should generate forecast for a product successfully', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      const mockForecast = {
        productId: 'prod-1',
        productName: 'Widget A',
        periods: [{ period: '2026-03', quantity: 150 }],
      };
      mockGenerateForecast.mockResolvedValue(mockForecast);
      mockSaveForecast.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/ai/forecast', {
        method: 'POST',
        body: JSON.stringify({ productId: 'prod-1', action: 'generate' }),
      });
      const response = await FORECAST_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.forecast).toBeDefined();
      expect(data.latency).toBeDefined();
    });

    it('should return 400 when productId is missing for generate', async () => {
      (auth as Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/ai/forecast', {
        method: 'POST',
        body: JSON.stringify({ action: 'generate' }),
      });
      const response = await FORECAST_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('productId is required');
    });

    it('should return 400 when insufficient data for forecasting', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGenerateForecast.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/forecast', {
        method: 'POST',
        body: JSON.stringify({ productId: 'prod-1', action: 'generate' }),
      });
      const response = await FORECAST_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Insufficient data');
    });

    it('should generate bulk forecasts successfully', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGenerateAllForecasts.mockResolvedValue({ success: 10, failed: 1 });

      const request = new NextRequest('http://localhost:3000/api/ai/forecast', {
        method: 'POST',
        body: JSON.stringify({ action: 'bulk' }),
      });
      const response = await FORECAST_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.success).toBe(10);
      expect(data.data.failed).toBe(1);
    });

    it('should return 500 when forecast engine throws', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGenerateForecast.mockRejectedValue(new Error('Engine crash'));

      const request = new NextRequest('http://localhost:3000/api/ai/forecast', {
        method: 'POST',
        body: JSON.stringify({ productId: 'prod-1', action: 'generate' }),
      });
      const response = await FORECAST_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate forecast');
    });
  });

  // =========================================================================
  // GET /api/ai/forecast
  // =========================================================================
  describe('GET /api/ai/forecast', () => {
    it('should return accuracy summary successfully', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetAccuracySummary.mockResolvedValue({
        overallMAPE: 12.5,
        overallAccuracy: 87.5,
        totalProducts: 20,
      });

      const request = new NextRequest('http://localhost:3000/api/ai/forecast?action=summary');
      const response = await FORECAST_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.latency).toBeDefined();
    });

    it('should return 400 when productId is missing for compare action', async () => {
      (auth as Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/ai/forecast?action=compare');
      const response = await FORECAST_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('productId is required');
    });

    it('should return 500 when accuracy service fails', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetAccuracySummary.mockRejectedValue(new Error('Service down'));

      const request = new NextRequest('http://localhost:3000/api/ai/forecast?action=summary');
      const response = await FORECAST_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch forecast data');
    });
  });

  // =========================================================================
  // GET /api/ai/forecast/[productId]
  // =========================================================================
  describe('GET /api/ai/forecast/[productId]', () => {
    it('should return 404 when product not found', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.part.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/forecast/prod-1');
      const response = await PRODUCT_FORECAST_GET(request, mockProductContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Product not found');
    });

    it('should return latest forecast for a product', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      const mockProduct = { id: 'prod-1', partNumber: 'PN-001', name: 'Widget A', unitCost: 10, safetyStock: 20, reorderPoint: 50 };
      (prisma.part.findUnique as Mock).mockResolvedValue(mockProduct);
      (prisma.demandForecast.findFirst as Mock).mockResolvedValue({
        id: 'fc-1',
        productId: 'prod-1',
        forecastQty: 150,
        period: '2026-03',
      });

      const request = new NextRequest('http://localhost:3000/api/ai/forecast/prod-1');
      const response = await PRODUCT_FORECAST_GET(request, mockProductContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.product).toEqual(mockProduct);
      expect(data.data.forecast).toBeDefined();
      expect(data.data.isNew).toBe(false);
    });

    it('should generate new forecast when none exists', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      const mockProduct = { id: 'prod-1', partNumber: 'PN-001', name: 'Widget A', unitCost: 10, safetyStock: 20, reorderPoint: 50 };
      (prisma.part.findUnique as Mock).mockResolvedValue(mockProduct);
      (prisma.demandForecast.findFirst as Mock).mockResolvedValue(null);
      mockGenerateForecast.mockResolvedValue({ productId: 'prod-1', productName: 'Widget A' });
      mockSaveForecast.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/ai/forecast/prod-1');
      const response = await PRODUCT_FORECAST_GET(request, mockProductContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.isNew).toBe(true);
    });

    it('should return 500 when service throws', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.part.findUnique as Mock).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/ai/forecast/prod-1');
      const response = await PRODUCT_FORECAST_GET(request, mockProductContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch product forecast');
    });
  });

  // =========================================================================
  // GET /api/ai/forecast/accuracy
  // =========================================================================
  describe('GET /api/ai/forecast/accuracy', () => {
    it('should return accuracy summary with stats', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetAccuracySummary.mockResolvedValue({
        overallMAPE: 10.5,
        overallAccuracy: 89.5,
      });
      (prisma.demandForecast.count as Mock)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(60);

      const request = new NextRequest('http://localhost:3000/api/ai/forecast/accuracy');
      const response = await ACCURACY_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.stats).toBeDefined();
      expect(data.data.stats.totalForecasts).toBe(100);
      expect(data.data.stats.forecastsWithActuals).toBe(60);
    });

    it('should return 400 when productId missing for product action', async () => {
      (auth as Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/ai/forecast/accuracy?action=product');
      const response = await ACCURACY_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('productId is required');
    });

    it('should return 500 when accuracy service fails', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetAccuracySummary.mockRejectedValue(new Error('Service failed'));

      const request = new NextRequest('http://localhost:3000/api/ai/forecast/accuracy');
      const response = await ACCURACY_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch accuracy data');
    });
  });

  // =========================================================================
  // POST /api/ai/forecast/accuracy
  // =========================================================================
  describe('POST /api/ai/forecast/accuracy', () => {
    it('should record actual value successfully', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.demandForecast.findFirst as Mock).mockResolvedValue({
        id: 'fc-1',
        forecastQty: 100,
      });
      (prisma.demandForecast.update as Mock).mockResolvedValue({ id: 'fc-1' });

      const request = new NextRequest('http://localhost:3000/api/ai/forecast/accuracy', {
        method: 'POST',
        body: JSON.stringify({
          action: 'record',
          productId: 'prod-1',
          period: '2026-01',
          actualQuantity: 95,
        }),
      });
      const response = await ACCURACY_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.forecasted).toBe(100);
      expect(data.data.actual).toBe(95);
    });

    it('should return 400 when required fields are missing for record action', async () => {
      (auth as Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/ai/forecast/accuracy', {
        method: 'POST',
        body: JSON.stringify({ action: 'record', productId: 'prod-1' }),
      });
      const response = await ACCURACY_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should return 404 when forecast not found for period', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.demandForecast.findFirst as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/forecast/accuracy', {
        method: 'POST',
        body: JSON.stringify({
          action: 'record',
          productId: 'prod-1',
          period: '2020-01',
          actualQuantity: 50,
        }),
      });
      const response = await ACCURACY_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Forecast not found for this period');
    });

    it('should return 500 when recording fails', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.demandForecast.findFirst as Mock).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/ai/forecast/accuracy', {
        method: 'POST',
        body: JSON.stringify({
          action: 'record',
          productId: 'prod-1',
          period: '2026-01',
          actualQuantity: 50,
        }),
      });
      const response = await ACCURACY_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process accuracy data');
    });
  });
});
