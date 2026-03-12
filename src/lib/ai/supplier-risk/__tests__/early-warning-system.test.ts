import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EarlyWarningSystem,
  getEarlyWarningSystem,
} from '../early-warning-system';

// ============================================================================
// MOCKS
// ============================================================================

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    supplier: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

const { mockDataExtractor } = vi.hoisted(() => ({
  mockDataExtractor: {
    extractDeliveryPerformance: vi.fn(),
    extractQualityHistory: vi.fn(),
    extractPricingTrends: vi.fn(),
    extractLeadTimeHistory: vi.fn(),
  },
}));

vi.mock('../supplier-data-extractor', () => ({
  SupplierDataExtractor: vi.fn(),
  getSupplierDataExtractor: vi.fn(() => mockDataExtractor),
}));

vi.mock('../risk-calculator', () => ({
  RiskCalculator: vi.fn(),
  getRiskCalculator: vi.fn(() => ({})),
}));

// ============================================================================
// HELPERS
// ============================================================================

function createMockSupplier(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sup-1',
    name: 'Test Supplier',
    code: 'SUP-001',
    country: 'Vietnam',
    status: 'active',
    riskScore: null,
    partSuppliers: [],
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('EarlyWarningSystem', () => {
  let system: EarlyWarningSystem;

  beforeEach(() => {
    vi.clearAllMocks();
    system = new EarlyWarningSystem();
    // Reset data extractor mocks to return null by default
    mockDataExtractor.extractDeliveryPerformance.mockResolvedValue(null);
    mockDataExtractor.extractQualityHistory.mockResolvedValue(null);
    mockDataExtractor.extractPricingTrends.mockResolvedValue(null);
    mockDataExtractor.extractLeadTimeHistory.mockResolvedValue(null);
  });

  describe('getEarlyWarningSystem', () => {
    it('should return an EarlyWarningSystem instance', () => {
      const inst = getEarlyWarningSystem();
      expect(inst).toBeInstanceOf(EarlyWarningSystem);
    });
  });

  describe('constructor', () => {
    it('should apply custom config', () => {
      const custom = new EarlyWarningSystem({
        deliveryThresholds: { lateDeliveryPercent: 20, onTimeRateDecline: 15, consecutiveLateOrders: 5 },
      });
      expect(custom).toBeInstanceOf(EarlyWarningSystem);
    });
  });

  describe('monitorSupplier', () => {
    it('should return empty array when supplier not found', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(null);
      const result = await system.monitorSupplier('non-existent');
      expect(result).toEqual([]);
    });

    it('should return alerts for high late delivery rate', async () => {
      const supplier = createMockSupplier();
      mockPrisma.supplier.findUnique.mockResolvedValue(supplier);

      mockDataExtractor.extractDeliveryPerformance.mockResolvedValue({
        summary: { totalOrders: 10, lateOrders: 3, onTimeRate: 70 },
        trend: [],
      });
      mockDataExtractor.extractQualityHistory.mockResolvedValue(null);
      mockDataExtractor.extractPricingTrends.mockResolvedValue(null);
      mockDataExtractor.extractLeadTimeHistory.mockResolvedValue(null);

      const alerts = await system.monitorSupplier('sup-1');

      const deliveryAlerts = alerts.filter(a => a.category === 'delivery');
      expect(deliveryAlerts.length).toBeGreaterThanOrEqual(1);
      expect(deliveryAlerts[0].title).toContain('Late Delivery');
    });

    it('should detect on-time rate decline', async () => {
      const supplier = createMockSupplier();
      mockPrisma.supplier.findUnique.mockResolvedValue(supplier);

      mockDataExtractor.extractDeliveryPerformance.mockResolvedValue({
        summary: { totalOrders: 10, lateOrders: 0 },
        trend: [
          { onTimeRate: 90 },
          { onTimeRate: 80 },
          { onTimeRate: 70 },
        ],
      });

      const alerts = await system.monitorSupplier('sup-1');
      const declineAlerts = alerts.filter(a => a.title?.includes('Declining'));
      expect(declineAlerts.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect high NCR rate', async () => {
      const supplier = createMockSupplier();
      mockPrisma.supplier.findUnique.mockResolvedValue(supplier);

      mockDataExtractor.extractDeliveryPerformance.mockResolvedValue(null);
      mockDataExtractor.extractQualityHistory.mockResolvedValue({
        summary: { totalNCRs: 12, openNCRs: 3, ppm: 1000 },
        qualityTrend: [],
      });

      const alerts = await system.monitorSupplier('sup-1');
      const qualityAlerts = alerts.filter(a => a.category === 'quality');
      expect(qualityAlerts.some(a => a.title === 'High NCR Rate')).toBe(true);
    });

    it('should detect open NCR backlog', async () => {
      const supplier = createMockSupplier();
      mockPrisma.supplier.findUnique.mockResolvedValue(supplier);

      mockDataExtractor.extractQualityHistory.mockResolvedValue({
        summary: { totalNCRs: 8, openNCRs: 7, ppm: 500 },
        qualityTrend: [],
      });

      const alerts = await system.monitorSupplier('sup-1');
      const backlogAlerts = alerts.filter(a => a.title === 'Open NCR Backlog');
      expect(backlogAlerts.length).toBe(1);
    });

    it('should detect high PPM', async () => {
      const supplier = createMockSupplier();
      mockPrisma.supplier.findUnique.mockResolvedValue(supplier);

      mockDataExtractor.extractQualityHistory.mockResolvedValue({
        summary: { totalNCRs: 2, openNCRs: 0, ppm: 3000 },
        qualityTrend: [],
      });

      const alerts = await system.monitorSupplier('sup-1');
      expect(alerts.some(a => a.title === 'High Defect PPM')).toBe(true);
    });

    it('should detect price increases', async () => {
      const supplier = createMockSupplier();
      mockPrisma.supplier.findUnique.mockResolvedValue(supplier);

      mockDataExtractor.extractPricingTrends.mockResolvedValue({
        summary: { priceChangePercent: 15 },
        recentChanges: [],
      });

      const alerts = await system.monitorSupplier('sup-1');
      const financialAlerts = alerts.filter(a => a.category === 'financial');
      expect(financialAlerts.some(a => a.title === 'Significant Price Increase')).toBe(true);
    });

    it('should detect lead time variance', async () => {
      const supplier = createMockSupplier();
      mockPrisma.supplier.findUnique.mockResolvedValue(supplier);

      mockDataExtractor.extractLeadTimeHistory.mockResolvedValue({
        summary: { leadTimeVariancePercent: 30 },
      });

      const alerts = await system.monitorSupplier('sup-1');
      expect(alerts.some(a => a.title === 'Lead Time Increase')).toBe(true);
    });

    it('should detect single source critical parts', async () => {
      const supplier = createMockSupplier({
        partSuppliers: [
          { partId: 'p1', part: { partNumber: 'SKU1', name: 'Part 1', isCritical: true } },
          { partId: 'p2', part: { partNumber: 'SKU2', name: 'Part 2', isCritical: true } },
        ],
      });
      mockPrisma.supplier.findUnique.mockResolvedValue(supplier);

      const alerts = await system.monitorSupplier('sup-1');
      const depAlerts = alerts.filter(a => a.category === 'dependency');
      expect(depAlerts.some(a => a.title === 'Single Source Critical Parts')).toBe(true);
    });

    it('should detect high part concentration', async () => {
      const parts = Array.from({ length: 20 }, (_, i) => ({
        partId: `p${i}`,
        part: { partNumber: `SKU${i}`, name: `Part ${i}`, isCritical: false },
      }));
      const supplier = createMockSupplier({ partSuppliers: parts });
      mockPrisma.supplier.findUnique.mockResolvedValue(supplier);

      const alerts = await system.monitorSupplier('sup-1');
      expect(alerts.some(a => a.title === 'High Part Concentration')).toBe(true);
    });

    it('should detect performance score decline', async () => {
      const supplier = createMockSupplier({
        riskScore: { overallScore: 60, previousScore: 80 },
      });
      mockPrisma.supplier.findUnique.mockResolvedValue(supplier);

      const alerts = await system.monitorSupplier('sup-1');
      expect(alerts.some(a => a.title === 'Performance Score Decline')).toBe(true);
    });

    it('should detect low performance score', async () => {
      const supplier = createMockSupplier({
        riskScore: { overallScore: 45, previousScore: null },
      });
      mockPrisma.supplier.findUnique.mockResolvedValue(supplier);

      const alerts = await system.monitorSupplier('sup-1');
      expect(alerts.some(a => a.title === 'Low Performance Score')).toBe(true);
    });
  });

  describe('getEarlyWarningSignals', () => {
    it('should return empty array when no data available', async () => {
      const signals = await system.getEarlyWarningSignals('sup-1');
      expect(signals).toEqual([]);
    });

    it('should detect delivery decline signal', async () => {
      mockDataExtractor.extractDeliveryPerformance.mockResolvedValue({
        trend: [
          { onTimeRate: 80 },
          { onTimeRate: 75 },
          { onTimeRate: 70 },
        ],
      });

      const signals = await system.getEarlyWarningSignals('sup-1');
      expect(signals.some(s => s.type === 'delivery_decline')).toBe(true);
    });

    it('should detect quality backlog signal', async () => {
      mockDataExtractor.extractQualityHistory.mockResolvedValue({
        summary: { openNCRs: 6, avgDaysToResolveNCR: 20, ppm: 500 },
        qualityTrend: [{ acceptanceRate: 98 }],
      });

      const signals = await system.getEarlyWarningSignals('sup-1');
      expect(signals.some(s => s.type === 'quality_backlog')).toBe(true);
    });

    it('should detect quality deterioration signal', async () => {
      mockDataExtractor.extractQualityHistory.mockResolvedValue({
        summary: { openNCRs: 0, avgDaysToResolveNCR: 5, ppm: 3500 },
        qualityTrend: [
          { acceptanceRate: 90 },
          { acceptanceRate: 92 },
          { acceptanceRate: 91 },
        ],
      });

      const signals = await system.getEarlyWarningSignals('sup-1');
      expect(signals.some(s => s.type === 'quality_deterioration')).toBe(true);
    });

    it('should detect price pressure signal', async () => {
      mockDataExtractor.extractPricingTrends.mockResolvedValue({
        summary: { priceChangePercent: 8 },
        recentChanges: [{ type: 'increase' }, { type: 'increase' }],
      });

      const signals = await system.getEarlyWarningSignals('sup-1');
      expect(signals.some(s => s.type === 'price_pressure')).toBe(true);
    });

    it('should detect lead time volatility signal', async () => {
      mockDataExtractor.extractLeadTimeHistory.mockResolvedValue({
        summary: {
          leadTimeVariancePercent: 25,
          quotedLeadTimeDays: 14,
          avgActualLeadTime: 17.5,
        },
      });

      const signals = await system.getEarlyWarningSignals('sup-1');
      expect(signals.some(s => s.type === 'lead_time_volatility')).toBe(true);
    });

    it('should sort signals by severity', async () => {
      mockDataExtractor.extractQualityHistory.mockResolvedValue({
        summary: { openNCRs: 6, avgDaysToResolveNCR: 20, ppm: 4000 },
        qualityTrend: [{ acceptanceRate: 90 }, { acceptanceRate: 89 }, { acceptanceRate: 88 }],
      });
      mockDataExtractor.extractPricingTrends.mockResolvedValue({
        summary: { priceChangePercent: 6 },
        recentChanges: [],
      });

      const signals = await system.getEarlyWarningSignals('sup-1');

      if (signals.length >= 2) {
        const severityOrder = { emergency: 0, critical: 1, warning: 2, info: 3 } as const;
        for (let i = 1; i < signals.length; i++) {
          expect(severityOrder[signals[i].severity]).toBeGreaterThanOrEqual(
            severityOrder[signals[i - 1].severity]
          );
        }
      }
    });
  });

  describe('acknowledgeAlert', () => {
    it('should return null (not implemented)', async () => {
      const result = await system.acknowledgeAlert('alert-1', 'user-1');
      expect(result).toBeNull();
    });
  });

  describe('resolveAlert', () => {
    it('should return null (not implemented)', async () => {
      const result = await system.resolveAlert('alert-1', 'user-1', 'Fixed');
      expect(result).toBeNull();
    });
  });

  describe('getEscalationPath (via alert creation)', () => {
    it('should include higher management for critical severity', async () => {
      const supplier = createMockSupplier({
        riskScore: { overallScore: 40, previousScore: null },
      });
      mockPrisma.supplier.findUnique.mockResolvedValue(supplier);

      const alerts = await system.monitorSupplier('sup-1');
      const criticalAlert = alerts.find(a => a.severity === 'critical');
      if (criticalAlert) {
        expect(criticalAlert.escalationPath).toContain('VP Operations');
      }
    });
  });

  describe('generateAlertSummary', () => {
    it('should generate summary from alerts via runMonitoringScan', async () => {
      mockPrisma.supplier.findMany.mockResolvedValue([
        createMockSupplier({
          riskScore: { overallScore: 40, previousScore: null },
        }),
      ]);
      mockPrisma.supplier.findUnique.mockResolvedValue(
        createMockSupplier({
          riskScore: { overallScore: 40, previousScore: null },
        })
      );

      const summary = await system.runMonitoringScan();

      expect(summary).toHaveProperty('totalActiveAlerts');
      expect(summary).toHaveProperty('alertsBySeverity');
      expect(summary).toHaveProperty('alertsByCategory');
      expect(summary).toHaveProperty('criticalSuppliers');
      expect(summary).toHaveProperty('trendAnalysis');
    });
  });

  describe('determineWatchReason', () => {
    it('should return critical alerts reason', () => {
      const alerts = [{ severity: 'critical' as const, category: 'quality' as const }] as any[];
      const result = (system as any).determineWatchReason(alerts, 70);
      expect(result).toBe('Critical alerts active');
    });

    it('should return low score reason', () => {
      const result = (system as any).determineWatchReason([], 45);
      expect(result).toBe('Very low performance score');
    });

    it('should return dependency reason', () => {
      const alerts = [{ severity: 'warning' as const, category: 'dependency' as const }] as any[];
      const result = (system as any).determineWatchReason(alerts, 70);
      expect(result).toBe('Single source dependency');
    });

    it('should return quality reason', () => {
      const alerts = [{ severity: 'warning' as const, category: 'quality' as const }] as any[];
      const result = (system as any).determineWatchReason(alerts, 70);
      expect(result).toBe('Quality concerns');
    });

    it('should return below average for moderate score', () => {
      const alerts = [{ severity: 'info' as const, category: 'performance' as const }] as any[];
      const result = (system as any).determineWatchReason(alerts, 65);
      expect(result).toBe('Below average performance');
    });

    it('should return default active warnings', () => {
      const alerts = [{ severity: 'info' as const, category: 'performance' as const }] as any[];
      const result = (system as any).determineWatchReason(alerts, 75);
      expect(result).toBe('Active warnings');
    });
  });
});
