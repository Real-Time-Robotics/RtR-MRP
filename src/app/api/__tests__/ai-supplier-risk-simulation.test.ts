/**
 * AI Supplier Risk & Simulation API Route Tests
 * Tests for:
 *   - GET/POST /api/ai/supplier-risk
 *   - GET/POST /api/ai/supplier-risk/alerts
 *   - GET/POST /api/ai/supplier-risk/scorecard
 *   - GET/POST /api/ai/simulation
 *   - GET/POST /api/ai/simulation/scenarios
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Mock: Supplier Risk Engine
// ---------------------------------------------------------------------------

const mockCalculateSupplyChainRisk = vi.fn();
const mockBatchAssessRisk = vi.fn();
const mockAnalyzeRiskScenarios = vi.fn();
const mockGetAlertSummary = vi.fn();
const mockGetWatchlist = vi.fn();
const mockMonitorSupplier = vi.fn();
const mockGetEarlyWarningSignals = vi.fn();
const mockAcknowledgeAlert = vi.fn();
const mockResolveAlert = vi.fn();
const mockRunMonitoringScan = vi.fn();
const mockAnalyzeDependencies = vi.fn();
const mockGetSupplierRankings = vi.fn();
const mockGetCategoryBenchmarks = vi.fn();
const mockGenerateScorecard = vi.fn();
const mockSaveScorecard = vi.fn();
const mockCompareSuppliers = vi.fn();

vi.mock('@/lib/ai/supplier-risk', () => ({
  getRiskCalculator: () => ({
    calculateSupplyChainRisk: (...args: unknown[]) => mockCalculateSupplyChainRisk(...args),
    batchAssessRisk: (...args: unknown[]) => mockBatchAssessRisk(...args),
    analyzeRiskScenarios: (...args: unknown[]) => mockAnalyzeRiskScenarios(...args),
  }),
  getEarlyWarningSystem: () => ({
    getAlertSummary: (...args: unknown[]) => mockGetAlertSummary(...args),
    getWatchlist: (...args: unknown[]) => mockGetWatchlist(...args),
    monitorSupplier: (...args: unknown[]) => mockMonitorSupplier(...args),
    getEarlyWarningSignals: (...args: unknown[]) => mockGetEarlyWarningSignals(...args),
    acknowledgeAlert: (...args: unknown[]) => mockAcknowledgeAlert(...args),
    resolveAlert: (...args: unknown[]) => mockResolveAlert(...args),
    runMonitoringScan: (...args: unknown[]) => mockRunMonitoringScan(...args),
  }),
  getDependencyAnalyzer: () => ({
    analyzeDependencies: (...args: unknown[]) => mockAnalyzeDependencies(...args),
  }),
  getSupplierPerformanceScorer: () => ({
    getSupplierRankings: (...args: unknown[]) => mockGetSupplierRankings(...args),
    getCategoryBenchmarks: (...args: unknown[]) => mockGetCategoryBenchmarks(...args),
    generateScorecard: (...args: unknown[]) => mockGenerateScorecard(...args),
    saveScorecard: (...args: unknown[]) => mockSaveScorecard(...args),
  }),
  getAISupplierAnalyzer: () => ({
    compareSuppliers: (...args: unknown[]) => mockCompareSuppliers(...args),
  }),
}));

// ---------------------------------------------------------------------------
// Mock: Simulation Engine
// ---------------------------------------------------------------------------

const mockCreateScenario = vi.fn();
const mockGetScenario = vi.fn();
const mockGetAllScenarios = vi.fn();
const mockGetTemplates = vi.fn();
const mockGetTemplateCategories = vi.fn();
const mockValidateScenario = vi.fn();
const mockRunSimulation = vi.fn();
const mockRunMonteCarloSimulation = vi.fn();
const mockAnalyzeSimulationImpact = vi.fn();
const mockGenerateScenarioInsight = vi.fn();
const mockBuildDemandScenario = vi.fn();
const mockCreateFromTemplate = vi.fn();
const mockCloneScenario = vi.fn();
const mockUpdateScenario = vi.fn();
const mockDeleteScenario = vi.fn();

vi.mock('@/lib/ai/simulation', () => ({
  getScenarioBuilder: () => ({
    createScenario: (...args: unknown[]) => mockCreateScenario(...args),
    getScenario: (...args: unknown[]) => mockGetScenario(...args),
    getAllScenarios: (...args: unknown[]) => mockGetAllScenarios(...args),
    getTemplates: (...args: unknown[]) => mockGetTemplates(...args),
    getTemplateCategories: (...args: unknown[]) => mockGetTemplateCategories(...args),
    validateScenario: (...args: unknown[]) => mockValidateScenario(...args),
    buildDemandScenario: (...args: unknown[]) => mockBuildDemandScenario(...args),
    buildSupplyScenario: vi.fn(),
    buildCapacityScenario: vi.fn(),
    buildCustomScenario: vi.fn(),
    createFromTemplate: (...args: unknown[]) => mockCreateFromTemplate(...args),
    cloneScenario: (...args: unknown[]) => mockCloneScenario(...args),
    updateScenario: (...args: unknown[]) => mockUpdateScenario(...args),
    deleteScenario: (...args: unknown[]) => mockDeleteScenario(...args),
  }),
  getSimulationEngine: () => ({
    runSimulation: (...args: unknown[]) => mockRunSimulation(...args),
  }),
  getMonteCarloEngine: () => ({
    runMonteCarloSimulation: (...args: unknown[]) => mockRunMonteCarloSimulation(...args),
  }),
  getImpactAnalyzer: () => ({
    analyzeSimulationImpact: (...args: unknown[]) => mockAnalyzeSimulationImpact(...args),
  }),
  getAIScenarioAnalyzer: () => ({
    generateScenarioInsight: (...args: unknown[]) => mockGenerateScenarioInsight(...args),
  }),
  DEFAULT_MONTE_CARLO_CONFIG: { iterations: 1000 },
  ScenarioType: {},
  SCENARIO_TEMPLATES: [],
}));

// ---------------------------------------------------------------------------
// Mock: Prisma
// ---------------------------------------------------------------------------

vi.mock('@/lib/prisma', () => {
  const prismaMock = {
    part: { findMany: vi.fn() },
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

import { GET as RISK_GET, POST as RISK_POST } from '../ai/supplier-risk/route';
import { GET as RISK_ALERTS_GET, POST as RISK_ALERTS_POST } from '../ai/supplier-risk/alerts/route';
import { GET as SCORECARD_GET, POST as SCORECARD_POST } from '../ai/supplier-risk/scorecard/route';
import { GET as SIM_GET, POST as SIM_POST } from '../ai/simulation/route';
import { GET as SCENARIOS_GET, POST as SCENARIOS_POST } from '../ai/simulation/scenarios/route';

// Mock context for withAuth wrapper (Next.js 15 async params)
const mockContext = { params: Promise.resolve({}) };

// Authenticated session
const mockSession = {
  user: { id: 'user-1', email: 'test@test.com', role: 'ADMIN', name: 'Test User' },
};

// =============================================================================
// SUPPLIER RISK TESTS
// =============================================================================

describe('AI Supplier Risk API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET /api/ai/supplier-risk
  // =========================================================================
  describe('GET /api/ai/supplier-risk', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/supplier-risk');
      const response = await RISK_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return risk dashboard successfully', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockCalculateSupplyChainRisk.mockResolvedValue({
        overallRiskScore: 35,
        overallRiskLevel: 'MEDIUM',
        riskBreakdown: {},
        metrics: {},
        riskTrend: 'stable',
        criticalSuppliers: [],
        topRisks: [],
      });
      mockGetSupplierRankings.mockResolvedValue([
        {
          supplierId: 'sup-1',
          supplierName: 'Supplier A',
          overallScore: 85,
          overallGrade: 'A',
          rank: 1,
          trend: 'improving',
        },
      ]);
      mockGetAlertSummary.mockResolvedValue({
        totalActiveAlerts: 3,
        alertsBySeverity: { critical: 1, high: 1, medium: 1 },
        criticalSuppliers: [],
      });
      mockAnalyzeDependencies.mockResolvedValue({
        summary: {
          singleSourcePartCount: 5,
          singleSourcePercent: 10,
          criticalPartsAtRisk: 2,
          overallDependencyScore: 30,
        },
        concentrationRisk: { riskLevel: 'LOW' },
        geographicRisk: { riskLevel: 'MEDIUM' },
      });

      const request = new NextRequest('http://localhost:3000/api/ai/supplier-risk');
      const response = await RISK_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.riskProfile).toBeDefined();
      expect(data.data.riskProfile.overallRiskScore).toBe(35);
      expect(data.data.topSuppliers).toHaveLength(1);
      expect(data.data.alertSummary).toBeDefined();
      expect(data.data.dependencySummary).toBeDefined();
    });

    it('should return 500 when risk calculation fails', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockCalculateSupplyChainRisk.mockRejectedValue(new Error('Risk calculation failed'));

      const request = new NextRequest('http://localhost:3000/api/ai/supplier-risk');
      const response = await RISK_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch supply chain risk data');
    });
  });

  // =========================================================================
  // POST /api/ai/supplier-risk
  // =========================================================================
  describe('POST /api/ai/supplier-risk', () => {
    it('should run batch assessment successfully', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockBatchAssessRisk.mockResolvedValue([
        {
          supplierId: 'sup-1',
          supplierName: 'Supplier A',
          overallRiskScore: 25,
          riskLevel: 'LOW',
          trend: { direction: 'improving' },
          riskFactors: {
            performance: { factors: [{ name: 'delivery', score: 80 }] },
            dependency: { factors: [{ name: 'single_source', score: 60 }] },
          },
        },
      ]);

      const request = new NextRequest('http://localhost:3000/api/ai/supplier-risk', {
        method: 'POST',
        body: JSON.stringify({ action: 'batch_assess', supplierIds: ['sup-1'] }),
      });
      const response = await RISK_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.assessments).toHaveLength(1);
      expect(data.data.count).toBe(1);
    });

    it('should return 400 for invalid input', async () => {
      (auth as Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/ai/supplier-risk', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalid_action' }),
      });
      const response = await RISK_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should return 500 when analysis fails', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockBatchAssessRisk.mockRejectedValue(new Error('Assessment failed'));

      const request = new NextRequest('http://localhost:3000/api/ai/supplier-risk', {
        method: 'POST',
        body: JSON.stringify({ action: 'batch_assess', supplierIds: ['sup-1'] }),
      });
      const response = await RISK_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to run risk analysis');
    });
  });

  // =========================================================================
  // GET /api/ai/supplier-risk/alerts
  // =========================================================================
  describe('GET /api/ai/supplier-risk/alerts', () => {
    it('should return alert summary successfully', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetAlertSummary.mockResolvedValue({
        totalActiveAlerts: 5,
        alertsBySeverity: { critical: 2, high: 2, medium: 1 },
        alertsByCategory: { delivery: 3, quality: 2 },
        criticalSuppliers: ['sup-1'],
        trendAnalysis: 'increasing',
        recentAlerts: [
          {
            id: 'alert-1',
            supplierId: 'sup-1',
            supplierName: 'Supplier A',
            category: 'delivery',
            severity: 'critical',
            status: 'active',
            title: 'Late deliveries detected',
            description: 'Multiple late deliveries',
            detectedAt: new Date(),
            affectedParts: ['part-1'],
          },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/ai/supplier-risk/alerts');
      const response = await RISK_ALERTS_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalActiveAlerts).toBe(5);
      expect(data.data.recentAlerts).toHaveLength(1);
    });

    it('should return watchlist view', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetWatchlist.mockResolvedValue([
        {
          supplierId: 'sup-1',
          supplierName: 'Watched Supplier',
          supplierCode: 'WS-001',
          country: 'VN',
          watchReason: 'Performance decline',
          addedAt: new Date(),
          riskScore: 65,
          activeAlerts: 2,
          monitoringLevel: 'enhanced',
          reviewDate: new Date(),
          latestAlert: { title: 'Quality issues', severity: 'high' },
        },
      ]);

      const request = new NextRequest('http://localhost:3000/api/ai/supplier-risk/alerts?view=watchlist');
      const response = await RISK_ALERTS_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.watchlist).toHaveLength(1);
      expect(data.data.count).toBe(1);
      expect(data.data.byCriticalLevel).toBeDefined();
    });

    it('should return 400 when supplierId missing for supplier view', async () => {
      (auth as Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/ai/supplier-risk/alerts?view=supplier');
      const response = await RISK_ALERTS_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('supplierId is required');
    });
  });

  // =========================================================================
  // POST /api/ai/supplier-risk/alerts
  // =========================================================================
  describe('POST /api/ai/supplier-risk/alerts', () => {
    it('should acknowledge an alert successfully', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockAcknowledgeAlert.mockResolvedValue({
        id: 'alert-1',
        status: 'acknowledged',
      });

      const request = new NextRequest('http://localhost:3000/api/ai/supplier-risk/alerts', {
        method: 'POST',
        body: JSON.stringify({ action: 'acknowledge', alertId: 'alert-1', userId: 'user-1' }),
      });
      const response = await RISK_ALERTS_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Alert acknowledged');
    });

    it('should return 400 when alertId is missing for acknowledge', async () => {
      (auth as Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/ai/supplier-risk/alerts', {
        method: 'POST',
        body: JSON.stringify({ action: 'acknowledge', userId: 'user-1' }),
      });
      const response = await RISK_ALERTS_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('alertId and userId are required');
    });

    it('should return 500 when alert action fails', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockAcknowledgeAlert.mockRejectedValue(new Error('Service error'));

      const request = new NextRequest('http://localhost:3000/api/ai/supplier-risk/alerts', {
        method: 'POST',
        body: JSON.stringify({ action: 'acknowledge', alertId: 'alert-1', userId: 'user-1' }),
      });
      const response = await RISK_ALERTS_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process alert action');
    });
  });

  // =========================================================================
  // GET /api/ai/supplier-risk/scorecard
  // =========================================================================
  describe('GET /api/ai/supplier-risk/scorecard', () => {
    it('should return supplier rankings successfully', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetSupplierRankings.mockResolvedValue([
        {
          supplierId: 'sup-1',
          supplierName: 'Supplier A',
          rank: 1,
          overallScore: 92,
          overallGrade: 'A',
          deliveryScore: 95,
          qualityScore: 90,
          costScore: 88,
          responsivenessScore: 93,
          trend: 'improving',
        },
      ]);
      mockGetCategoryBenchmarks.mockResolvedValue([
        {
          category: 'electronics',
          avgOverallScore: 78,
          avgDeliveryScore: 80,
          avgQualityScore: 75,
          avgCostScore: 76,
          avgResponsivenessScore: 82,
          supplierCount: 15,
          topPerformer: 'Supplier A',
        },
      ]);

      const request = new NextRequest('http://localhost:3000/api/ai/supplier-risk/scorecard');
      const response = await SCORECARD_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.rankings).toHaveLength(1);
      expect(data.data.rankings[0].rank).toBe(1);
      expect(data.data.benchmarks).toBeDefined();
    });

    it('should return 500 when scorecard service fails', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetSupplierRankings.mockRejectedValue(new Error('Rankings failed'));

      const request = new NextRequest('http://localhost:3000/api/ai/supplier-risk/scorecard');
      const response = await SCORECARD_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch supplier rankings');
    });
  });

  // =========================================================================
  // POST /api/ai/supplier-risk/scorecard
  // =========================================================================
  describe('POST /api/ai/supplier-risk/scorecard', () => {
    it('should generate a scorecard successfully', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGenerateScorecard.mockResolvedValue({
        supplierId: 'sup-1',
        supplierCode: 'SA-001',
        supplierName: 'Supplier A',
        country: 'VN',
        category: 'electronics',
        periodMonths: 12,
        overallScore: 88,
        overallGrade: 'A',
        dimensions: {},
        trend: 'improving',
        benchmarkComparison: {},
        strengths: ['Fast delivery'],
        weaknesses: ['High cost'],
        recommendations: ['Negotiate better pricing'],
      });

      const request = new NextRequest('http://localhost:3000/api/ai/supplier-risk/scorecard', {
        method: 'POST',
        body: JSON.stringify({ action: 'generate', supplierId: 'sup-1' }),
      });
      const response = await SCORECARD_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.supplierName).toBe('Supplier A');
      expect(data.data.overallScore).toBe(88);
    });

    it('should return 400 when supplierId is missing for generate', async () => {
      (auth as Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/ai/supplier-risk/scorecard', {
        method: 'POST',
        body: JSON.stringify({ action: 'generate' }),
      });
      const response = await SCORECARD_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('supplierId is required');
    });

    it('should return 400 when fewer than 2 suppliers for compare', async () => {
      (auth as Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/ai/supplier-risk/scorecard', {
        method: 'POST',
        body: JSON.stringify({ action: 'compare', supplierIds: ['sup-1'] }),
      });
      const response = await SCORECARD_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('At least 2 supplierIds');
    });

    it('should return 404 when supplier not found for generate', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGenerateScorecard.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/supplier-risk/scorecard', {
        method: 'POST',
        body: JSON.stringify({ action: 'generate', supplierId: 'nonexistent' }),
      });
      const response = await SCORECARD_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Supplier not found');
    });
  });
});

// =============================================================================
// SIMULATION TESTS
// =============================================================================

describe('AI Simulation API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // POST /api/ai/simulation
  // =========================================================================
  describe('POST /api/ai/simulation', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/simulation', {
        method: 'POST',
        body: JSON.stringify({ scenarioId: 'sc-1' }),
      });
      const response = await SIM_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should run simulation with existing scenario successfully', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      const mockScenario = { id: 'sc-1', name: 'Test Scenario', type: 'demand' };
      mockGetScenario.mockReturnValue(mockScenario);
      mockValidateScenario.mockReturnValue({ isValid: true, warnings: [] });
      mockRunSimulation.mockResolvedValue({ status: 'completed', results: {} });
      mockAnalyzeSimulationImpact.mockReturnValue({ summary: 'No major impact' });
      mockGenerateScenarioInsight.mockResolvedValue({ insight: 'Looks good' });

      const request = new NextRequest('http://localhost:3000/api/ai/simulation', {
        method: 'POST',
        body: JSON.stringify({ scenarioId: 'sc-1' }),
      });
      const response = await SIM_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.resultId).toBeDefined();
      expect(data.simulationResult).toBeDefined();
      expect(data.aiInsight).toBeDefined();
    });

    it('should return 404 when scenario not found', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetScenario.mockReturnValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/simulation', {
        method: 'POST',
        body: JSON.stringify({ scenarioId: 'nonexistent' }),
      });
      const response = await SIM_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Scenario not found');
    });

    it('should return 400 when scenario validation fails', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      const mockScenario = { id: 'sc-1', name: 'Bad Scenario', type: 'demand' };
      mockGetScenario.mockReturnValue(mockScenario);
      mockValidateScenario.mockReturnValue({ isValid: false, errors: ['Invalid config'] });

      const request = new NextRequest('http://localhost:3000/api/ai/simulation', {
        method: 'POST',
        body: JSON.stringify({ scenarioId: 'sc-1' }),
      });
      const response = await SIM_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid scenario');
      expect(data.errors).toContain('Invalid config');
    });

    it('should return 500 when simulation engine fails', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetScenario.mockReturnValue({ id: 'sc-1', name: 'Test', type: 'demand' });
      mockValidateScenario.mockReturnValue({ isValid: true, warnings: [] });
      mockRunSimulation.mockRejectedValue(new Error('Simulation engine crash'));

      const request = new NextRequest('http://localhost:3000/api/ai/simulation', {
        method: 'POST',
        body: JSON.stringify({ scenarioId: 'sc-1' }),
      });
      const response = await SIM_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to run simulation');
    });
  });

  // =========================================================================
  // GET /api/ai/simulation
  // =========================================================================
  describe('GET /api/ai/simulation', () => {
    it('should return scenarios list successfully', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetAllScenarios.mockReturnValue([
        { id: 'sc-1', name: 'Demand Surge', type: 'demand' },
        { id: 'sc-2', name: 'Supply Disruption', type: 'supply' },
      ]);
      mockGetTemplateCategories.mockReturnValue(['demand', 'supply', 'capacity']);

      const request = new NextRequest('http://localhost:3000/api/ai/simulation');
      const response = await SIM_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.scenarios).toHaveLength(2);
      expect(data.templateCategories).toContain('demand');
    });

    it('should filter scenarios by type', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetAllScenarios.mockReturnValue([
        { id: 'sc-1', name: 'Demand Surge', type: 'demand' },
        { id: 'sc-2', name: 'Supply Cut', type: 'supply' },
      ]);
      mockGetTemplateCategories.mockReturnValue([]);

      const request = new NextRequest('http://localhost:3000/api/ai/simulation?type=demand');
      const response = await SIM_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Only demand scenarios
      expect(data.scenarios).toHaveLength(1);
      expect(data.scenarios[0].type).toBe('demand');
    });

    it('should return 500 when listing fails', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetAllScenarios.mockImplementation(() => { throw new Error('List failed'); });

      const request = new NextRequest('http://localhost:3000/api/ai/simulation');
      const response = await SIM_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch simulations');
    });
  });

  // =========================================================================
  // POST /api/ai/simulation/scenarios
  // =========================================================================
  describe('POST /api/ai/simulation/scenarios', () => {
    it('should create a demand scenario successfully', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      const mockScenario = { id: 'sc-new', name: 'Seasonal Spike', type: 'demand' };
      mockBuildDemandScenario.mockReturnValue(mockScenario);
      mockValidateScenario.mockReturnValue({ isValid: true, warnings: [] });
      mockUpdateScenario.mockReturnValue(mockScenario);

      const request = new NextRequest('http://localhost:3000/api/ai/simulation/scenarios', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          name: 'Seasonal Spike',
          type: 'demand',
          config: { demandMultiplier: 1.5 },
        }),
      });
      const response = await SCENARIOS_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.scenario.name).toBe('Seasonal Spike');
    });

    it('should return 400 when name is missing for create', async () => {
      (auth as Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/ai/simulation/scenarios', {
        method: 'POST',
        body: JSON.stringify({ action: 'create', type: 'demand' }),
      });
      const response = await SCENARIOS_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Name and type are required');
    });

    it('should return 404 when cloning nonexistent scenario', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockCloneScenario.mockReturnValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/simulation/scenarios', {
        method: 'POST',
        body: JSON.stringify({ action: 'clone', scenarioId: 'nonexistent' }),
      });
      const response = await SCENARIOS_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Scenario not found');
    });

    it('should return 500 when scenario creation fails', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockBuildDemandScenario.mockImplementation(() => { throw new Error('Build error'); });

      const request = new NextRequest('http://localhost:3000/api/ai/simulation/scenarios', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          name: 'Fail Scenario',
          type: 'demand',
          config: {},
        }),
      });
      const response = await SCENARIOS_POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process request');
    });
  });

  // =========================================================================
  // GET /api/ai/simulation/scenarios
  // =========================================================================
  describe('GET /api/ai/simulation/scenarios', () => {
    it('should return all scenarios with stats', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetAllScenarios.mockReturnValue([
        { id: 'sc-1', name: 'Demand Surge', type: 'demand' },
        { id: 'sc-2', name: 'Supply Cut', type: 'supply' },
      ]);
      mockGetTemplates.mockReturnValue([
        { id: 'tpl-1', name: 'Demand Spike Template', category: 'demand' },
      ]);
      mockGetTemplateCategories.mockReturnValue(['demand', 'supply', 'capacity']);

      const request = new NextRequest('http://localhost:3000/api/ai/simulation/scenarios');
      const response = await SCENARIOS_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.scenarios).toHaveLength(2);
      expect(data.templates).toBeDefined();
      expect(data.categories).toContain('demand');
      expect(data.stats.totalScenarios).toBe(2);
      expect(data.stats.byType.demand).toBe(1);
      expect(data.stats.byType.supply).toBe(1);
    });

    it('should return single scenario by id', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      const mockScenario = { id: 'sc-1', name: 'Test Scenario', type: 'demand' };
      mockGetScenario.mockReturnValue(mockScenario);
      mockValidateScenario.mockReturnValue({ isValid: true, warnings: [] });

      const request = new NextRequest('http://localhost:3000/api/ai/simulation/scenarios?id=sc-1');
      const response = await SCENARIOS_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.scenario.id).toBe('sc-1');
      expect(data.validation).toBeDefined();
    });

    it('should return 404 when scenario not found by id', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetScenario.mockReturnValue(null);

      const request = new NextRequest('http://localhost:3000/api/ai/simulation/scenarios?id=nonexistent');
      const response = await SCENARIOS_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Scenario not found');
    });

    it('should return 500 when listing scenarios fails', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      mockGetAllScenarios.mockImplementation(() => { throw new Error('List error'); });

      const request = new NextRequest('http://localhost:3000/api/ai/simulation/scenarios');
      const response = await SCENARIOS_GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch scenarios');
    });
  });
});
