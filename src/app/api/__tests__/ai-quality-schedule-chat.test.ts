/**
 * AI Quality, Schedule, Chat, Email-Parser, and Knowledge API Route Tests
 * Tests for:
 *   - POST /api/ai/chat (already covered in ai-chat-query, but email-parser is new)
 *   - POST /api/ai/email-parser
 *   - GET/POST /api/ai/knowledge
 *   - GET/POST /api/ai/quality
 *   - POST /api/ai/quality/predict
 *   - GET/POST /api/ai/quality/spc
 *   - GET/POST /api/ai/auto-schedule
 *   - POST /api/ai/auto-schedule/optimize
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

// =============================================================================
// MOCKS
// =============================================================================

// --- Prisma ---
vi.mock('@/lib/prisma', () => {
  const prismaObj = {
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    customer: { findFirst: vi.fn() },
    product: { findFirst: vi.fn() },
    supplier: { findFirst: vi.fn() },
    part: { findFirst: vi.fn() },
    salesOrder: { create: vi.fn() },
    purchaseOrder: { create: vi.fn() },
    workOrder: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'wo-1',
          woNumber: 'WO-001',
          quantity: 10,
          priority: 'high',
          status: 'pending',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          plannedStart: null,
          plannedEnd: null,
          workCenterId: null,
          product: { id: 'prod-1', sku: 'SKU-001', name: 'Product A', assemblyHours: 4, testingHours: 1, defaultWorkCenterId: 'wc-1' },
          workCenterRef: { id: 'wc-1', code: 'WC-001', name: 'Work Center 1' },
          salesOrder: { id: 'so-1', orderNumber: 'SO-001', requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), priority: 'high' },
        },
      ]),
    },
    capacityRecord: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    scheduledOperation: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
  return { prisma: prismaObj, default: prismaObj };
});

// --- Auth ---
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// --- Rate limit ---
vi.mock('@/lib/rate-limit', () => ({
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
  checkHeavyEndpointLimit: vi.fn().mockResolvedValue({ success: true, limit: 100, remaining: 99, retryAfter: 0 }),
}));

// --- Logger ---
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    logError: vi.fn(),
  },
}));

// --- Email parser service ---
const mockParseEmail = vi.fn();
const mockCreateDraftOrder = vi.fn();

vi.mock('@/lib/ai/email-parser-service', () => ({
  getEmailParserService: () => ({
    parseEmail: mockParseEmail,
    createDraftOrder: mockCreateDraftOrder,
  }),
  EmailAttachment: {},
  ExtractedOrderData: {},
  DraftOrder: {},
}));

// --- RAG knowledge service ---
const mockGetStats = vi.fn();
const mockSearchKnowledge = vi.fn();
const mockRetrieveContext = vi.fn();
const mockBuildContextPrompt = vi.fn();
const mockIndexAll = vi.fn();
const mockIndexParts = vi.fn();
const mockIndexSuppliers = vi.fn();
const mockIndexCustomers = vi.fn();
const mockIndexBOMs = vi.fn();
const mockIndexOrders = vi.fn();
const mockIndexComplianceKnowledge = vi.fn();

vi.mock('@/lib/ai/rag-knowledge-service', () => ({
  getRAGKnowledgeService: () => ({
    getStats: mockGetStats,
    searchKnowledge: mockSearchKnowledge,
    retrieveContext: mockRetrieveContext,
    buildContextPrompt: mockBuildContextPrompt,
    indexAll: mockIndexAll,
    indexParts: mockIndexParts,
    indexSuppliers: mockIndexSuppliers,
    indexCustomers: mockIndexCustomers,
    indexBOMs: mockIndexBOMs,
    indexOrders: mockIndexOrders,
    indexComplianceKnowledge: mockIndexComplianceKnowledge,
  }),
  KnowledgeType: {},
}));

// --- Quality metrics calculator ---
const mockGetQualityMetricsSummary = vi.fn();
const mockCalculateCpk = vi.fn();

vi.mock('@/lib/ai/quality/quality-metrics-calculator', () => ({
  getQualityMetricsCalculator: () => ({
    getQualityMetricsSummary: mockGetQualityMetricsSummary,
    calculateCpk: mockCalculateCpk,
  }),
}));

// --- Quality prediction engine ---
const mockPerformBatchRiskAssessment = vi.fn();
const mockPredictNCR = vi.fn();
const mockGenerateForecast = vi.fn();

vi.mock('@/lib/ai/quality/quality-prediction-engine', () => ({
  getQualityPredictionEngine: () => ({
    performBatchRiskAssessment: mockPerformBatchRiskAssessment,
    predictNCR: mockPredictNCR,
    generateForecast: mockGenerateForecast,
  }),
}));

// --- AI quality analyzer ---
const mockPredictDefects = vi.fn();

vi.mock('@/lib/ai/quality/ai-quality-analyzer', () => ({
  getAIQualityAnalyzer: () => ({
    predictDefects: mockPredictDefects,
  }),
}));

// --- Anomaly detector ---
const mockPerformSPCAnalysis = vi.fn();

vi.mock('@/lib/ai/quality/anomaly-detector', () => ({
  getQualityAnomalyDetector: () => ({
    performSPCAnalysis: mockPerformSPCAnalysis,
  }),
}));

// =============================================================================
// ROUTE IMPORTS (after mocks)
// =============================================================================

import { POST as EMAIL_PARSER_POST } from '../ai/email-parser/route';
import { GET as KNOWLEDGE_GET, POST as KNOWLEDGE_POST } from '../ai/knowledge/route';
import { GET as QUALITY_GET, POST as QUALITY_POST } from '../ai/quality/route';
import { POST as QUALITY_PREDICT_POST } from '../ai/quality/predict/route';
import { GET as SPC_GET, POST as SPC_POST } from '../ai/quality/spc/route';
import { GET as SCHEDULE_GET, POST as SCHEDULE_POST } from '../ai/auto-schedule/route';
import { GET as OPTIMIZE_GET, POST as OPTIMIZE_POST } from '../ai/auto-schedule/optimize/route';

// =============================================================================
// HELPERS
// =============================================================================

const mockContext = { params: Promise.resolve({}) };

const mockSession = {
  user: { id: 'user1', email: 'test@test.com', role: 'ADMIN', name: 'Test User' },
};

// =============================================================================
// TESTS
// =============================================================================

describe('AI Email Parser API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockSession);
  });

  it('should return 401 when not authenticated', async () => {
    (auth as Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/ai/email-parser', {
      method: 'POST',
      body: JSON.stringify({ action: 'parse', emailContent: 'test' }),
    });
    const response = await EMAIL_PARSER_POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 for invalid input (missing action)', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/email-parser', {
      method: 'POST',
      body: JSON.stringify({ emailContent: 'test' }),
    });
    const response = await EMAIL_PARSER_POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid input');
  });

  it('should parse email successfully', async () => {
    mockParseEmail.mockResolvedValue({
      emailType: 'customer_po',
      confidence: 0.92,
      warnings: [],
    });
    mockCreateDraftOrder.mockResolvedValue({
      type: 'sales_order',
      confidence: 0.92,
      data: {},
    });

    const request = new NextRequest('http://localhost:3000/api/ai/email-parser', {
      method: 'POST',
      body: JSON.stringify({ action: 'parse', emailContent: 'PO #12345 for 100 units of Widget A' }),
    });
    const response = await EMAIL_PARSER_POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.extractedData).toBeDefined();
    expect(data.processingTime).toBeDefined();
    expect(mockParseEmail).toHaveBeenCalled();
  });

  it('should return 400 when parse action has no emailContent', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/email-parser', {
      method: 'POST',
      body: JSON.stringify({ action: 'parse' }),
    });
    const response = await EMAIL_PARSER_POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email content is required');
  });

  it('should return 400 when create_order is not approved', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/email-parser', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create_order',
        draftOrder: { type: 'sales_order', data: {} },
        approved: false,
      }),
    });
    const response = await EMAIL_PARSER_POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Order must be approved before creation');
  });
});

describe('AI Knowledge API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockSession);
  });

  it('GET should return stats by default', async () => {
    mockGetStats.mockReturnValue({ totalChunks: 150, types: ['part', 'supplier'] });

    const request = new NextRequest('http://localhost:3000/api/ai/knowledge');
    const response = await KNOWLEDGE_GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
  });

  it('GET with action=search should require query', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/knowledge?action=search');
    const response = await KNOWLEDGE_GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Query required');
  });

  it('POST with action=index_all should index all knowledge', async () => {
    mockIndexAll.mockResolvedValue({ parts: 50, suppliers: 30 });
    mockGetStats.mockReturnValue({ totalChunks: 80 });

    const request = new NextRequest('http://localhost:3000/api/ai/knowledge', {
      method: 'POST',
      body: JSON.stringify({ action: 'index_all' }),
    });
    const response = await KNOWLEDGE_POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('indexed successfully');
    expect(mockIndexAll).toHaveBeenCalled();
  });

  it('POST with action=query should require query string', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/knowledge', {
      method: 'POST',
      body: JSON.stringify({ action: 'query' }),
    });
    const response = await KNOWLEDGE_POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Query required');
  });
});

describe('AI Quality API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockSession);
  });

  it('GET should return quality dashboard metrics', async () => {
    mockGetQualityMetricsSummary.mockResolvedValue({
      overallFPY: 0.95,
      overallPPM: 500,
      openNCRs: 3,
      openCAPAs: 1,
      avgNCRResolutionDays: 5,
      topDefectCategories: [],
      qualityTrend: [],
    });

    const request = new NextRequest('http://localhost:3000/api/ai/quality?days=30');
    const response = await QUALITY_GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.metrics.overallFPY).toBe(0.95);
    expect(data.data.period.days).toBe(30);
  });

  it('GET should return 500 on error', async () => {
    mockGetQualityMetricsSummary.mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost:3000/api/ai/quality');
    const response = await QUALITY_GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch quality metrics');
  });

  it('POST should perform batch risk assessment', async () => {
    mockPerformBatchRiskAssessment.mockResolvedValue({
      assessmentDate: new Date(),
      partsAssessed: 10,
      riskDistribution: { high: 2, medium: 3, low: 5 },
      systemwideMetrics: {},
      topRiskParts: [],
      recommendations: ['Review supplier X'],
    });

    const request = new NextRequest('http://localhost:3000/api/ai/quality', {
      method: 'POST',
      body: JSON.stringify({ limit: 10 }),
    });
    const response = await QUALITY_POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.partsAssessed).toBe(10);
    expect(data.data.recommendations).toContain('Review supplier X');
  });
});

describe('AI Quality Predict API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockSession);
  });

  it('POST should return quality prediction for a part', async () => {
    mockPredictNCR.mockResolvedValue({
      partSku: 'PN-001',
      probability: 0.35,
      expectedNCRCount: 2,
      confidenceLevel: 'medium',
      riskFactors: ['Supplier variability'],
      mitigatingFactors: ['Good incoming QC'],
      recommendations: ['Increase inspection frequency'],
      predictionPeriod: { start: new Date(), end: new Date() },
      historicalBasis: {
        periodsAnalyzed: 12,
        historicalRate: 0.05,
        recentTrend: 'stable',
      },
    });
    mockGenerateForecast.mockResolvedValue({
      overallTrend: 'stable',
      confidenceLevel: 'medium',
      forecastPeriods: [],
      keyAssumptions: [],
      risks: [],
      opportunities: [],
    });

    const request = new NextRequest('http://localhost:3000/api/ai/quality/predict', {
      method: 'POST',
      body: JSON.stringify({ partId: 'part-1', monthsAhead: 3 }),
    });
    const response = await QUALITY_PREDICT_POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.partId).toBe('part-1');
    expect(data.data.ncrPrediction.probability).toBe(0.35);
    expect(data.data.forecast.overallTrend).toBe('stable');
  });

  it('POST should return 400 when partId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/quality/predict', {
      method: 'POST',
      body: JSON.stringify({ monthsAhead: 3 }),
    });
    const response = await QUALITY_PREDICT_POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid input');
  });
});

describe('AI Quality SPC API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockSession);
  });

  it('POST should perform SPC analysis', async () => {
    mockPerformSPCAnalysis.mockResolvedValue({
      partId: 'part-1',
      partSku: 'PN-001',
      characteristicName: 'Diameter',
      controlLimits: { ucl: 10.5, lcl: 9.5, cl: 10.0 },
      processCapability: { cp: 1.33, cpk: 1.2 },
      isInControl: true,
      measurements: [],
      violations: [],
      recommendations: ['Process is stable'],
    });

    const request = new NextRequest('http://localhost:3000/api/ai/quality/spc', {
      method: 'POST',
      body: JSON.stringify({ partId: 'part-1', characteristicId: 'char-1', months: 6 }),
    });
    const response = await SPC_POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.partSku).toBe('PN-001');
    expect(data.data.isInControl).toBe(true);
  });

  it('POST should return 400 when required fields are missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/quality/spc', {
      method: 'POST',
      body: JSON.stringify({ partId: 'part-1' }), // missing characteristicId
    });
    const response = await SPC_POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid input');
  });

  it('GET should calculate Cpk from measurements', async () => {
    mockCalculateCpk.mockReturnValue({
      characteristicName: 'Length',
      measurements: [10.1, 10.2, 10.0, 9.9, 10.3],
      mean: 10.1,
      stdDev: 0.15,
      usl: 10.5,
      lsl: 9.5,
      cp: 1.11,
      cpk: 1.05,
      cpu: 1.11,
      cpl: 1.05,
      status: 'adequate',
      interpretation: 'Process is adequate but could be improved.',
    });

    const request = new NextRequest(
      'http://localhost:3000/api/ai/quality/spc?measurements=10.1,10.2,10.0,9.9,10.3&usl=10.5&lsl=9.5&name=Length'
    );
    const response = await SPC_GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.capability.cpk).toBe(1.05);
    expect(data.data.characteristicName).toBe('Length');
  });

  it('GET should return 400 when measurements are missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/quality/spc?usl=10.5&lsl=9.5');
    const response = await SPC_GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('measurements parameter is required');
  });
});

describe('AI Auto-Schedule API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockSession);
  });

  it('GET should return schedule status with work orders', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/auto-schedule');
    const response = await SCHEDULE_GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.workOrders).toBeDefined();
    expect(Array.isArray(data.workOrders)).toBe(true);
    expect(data.summary).toBeDefined();
    expect(data.summary.total).toBeGreaterThan(0);
  });

  it('POST should generate schedule with default algorithm', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/auto-schedule', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await SCHEDULE_POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.schedule).toBeDefined();
    expect(data.schedule.algorithm).toBe('balanced_load');
    expect(data.summary).toBeDefined();
    expect(data.summary.utilizationRate).toBeDefined();
  });

  it('POST should include AI analysis when requested', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/auto-schedule', {
      method: 'POST',
      body: JSON.stringify({ includeAIAnalysis: true }),
    });
    const response = await SCHEDULE_POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.analysis).toBeDefined();
    expect(data.analysis.explanation).toBeDefined();
    expect(data.analysis.predictedBottlenecks).toBeDefined();
  });
});

describe('AI Auto-Schedule Optimize API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockSession);
  });

  it('GET should return available algorithms', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/auto-schedule/optimize');
    const response = await OPTIMIZE_GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.algorithms).toBeDefined();
    expect(Array.isArray(data.algorithms)).toBe(true);
    expect(data.algorithms.length).toBe(6);
    expect(data.defaultAlgorithm).toBe('balanced_load');
  });

  it('POST should run optimization with single algorithm', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/auto-schedule/optimize', {
      method: 'POST',
      body: JSON.stringify({ algorithm: 'genetic' }),
    });
    const response = await OPTIMIZE_POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result).toBeDefined();
    expect(data.result.algorithm).toBe('genetic');
    expect(data.result.improvement).toBeDefined();
    expect(data.summary).toBeDefined();
  });

  it('POST should compare all algorithms when compareAlgorithms=true', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/auto-schedule/optimize', {
      method: 'POST',
      body: JSON.stringify({ compareAlgorithms: true }),
    });
    const response = await OPTIMIZE_POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.comparison).toBeDefined();
    expect(Array.isArray(data.comparison)).toBe(true);
    expect(data.comparison.length).toBe(6);
    expect(data.recommended).toBeDefined();
    // Comparison results should be sorted by score descending
    for (let i = 1; i < data.comparison.length; i++) {
      expect(data.comparison[i - 1].score).toBeGreaterThanOrEqual(data.comparison[i].score);
    }
  });
});
