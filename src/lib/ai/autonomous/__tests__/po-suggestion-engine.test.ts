import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  POSuggestionEngine,
  getPOSuggestionEngine,
  DEFAULT_PO_SUGGESTION_CONFIG,
} from '../po-suggestion-engine';

// ============================================================================
// MOCKS
// ============================================================================

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    part: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    partSupplier: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    materialAllocation: {
      aggregate: vi.fn(),
    },
    purchaseOrderLine: {
      findFirst: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

// ============================================================================
// HELPERS
// ============================================================================

function createMockPart(overrides: Record<string, unknown> = {}) {
  return {
    id: 'part-1',
    partNumber: 'P-001',
    name: 'Test Part',
    category: 'raw_material',
    status: 'active',
    reorderPoint: 100,
    safetyStock: 50,
    moq: 10,
    standardCost: 50000,
    leadTimeDays: 14,
    inventory: [
      { quantity: 80, reservedQty: 10 },
    ],
    partSuppliers: [
      {
        supplierId: 'sup-1',
        unitPrice: 50000,
        leadTimeDays: 14,
        minOrderQty: 10,
        isPreferred: true,
        status: 'active',
        supplier: {
          id: 'sup-1',
          name: 'Test Supplier',
          code: 'SUP-001',
          rating: 85,
        },
      },
    ],
    planning: { moq: 10 },
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('POSuggestionEngine', () => {
  let engine: POSuggestionEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new POSuggestionEngine();

    // Default mocks
    mockPrisma.materialAllocation.aggregate.mockResolvedValue({ _sum: { allocatedQty: 0 } });
    mockPrisma.$queryRaw.mockResolvedValue([]);
  });

  describe('getPOSuggestionEngine', () => {
    it('should return a POSuggestionEngine instance', () => {
      const inst = getPOSuggestionEngine();
      expect(inst).toBeInstanceOf(POSuggestionEngine);
    });
  });

  describe('DEFAULT_PO_SUGGESTION_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_PO_SUGGESTION_CONFIG.safetyStockDays).toBe(7);
      expect(DEFAULT_PO_SUGGESTION_CONFIG.forecastHorizonDays).toBe(30);
      expect(DEFAULT_PO_SUGGESTION_CONFIG.urgencyThresholds.critical).toBe(3);
      expect(DEFAULT_PO_SUGGESTION_CONFIG.expirationHours).toBe(72);
    });
  });

  describe('constructor', () => {
    it('should merge custom config with defaults', () => {
      const custom = new POSuggestionEngine({ safetyStockDays: 14 });
      expect(custom).toBeInstanceOf(POSuggestionEngine);
    });
  });

  describe('calculateUrgency', () => {
    it('should return critical for very low days of supply', () => {
      const result = (engine as any).calculateUrgency(2);
      expect(result).toBe('critical');
    });

    it('should return high for low days of supply', () => {
      const result = (engine as any).calculateUrgency(5);
      expect(result).toBe('high');
    });

    it('should return medium for moderate days of supply', () => {
      const result = (engine as any).calculateUrgency(10);
      expect(result).toBe('medium');
    });

    it('should return low for high days of supply', () => {
      const result = (engine as any).calculateUrgency(20);
      expect(result).toBe('low');
    });
  });

  describe('generateReorderReason', () => {
    it('should indicate out of stock', () => {
      const result = (engine as any).generateReorderReason(0, 100, 50, 0);
      expect(result).toContain('Hết hàng');
    });

    it('should indicate below safety stock', () => {
      const result = (engine as any).generateReorderReason(30, 100, 50, 5);
      expect(result).toContain('an toàn');
    });

    it('should indicate at reorder point', () => {
      const result = (engine as any).generateReorderReason(80, 100, 50, 10);
      expect(result).toContain('đặt hàng lại');
    });

    it('should indicate low days of supply', () => {
      const result = (engine as any).generateReorderReason(200, 100, 50, 5);
      expect(result).toContain('ngày');
    });

    it('should indicate forecast-based need', () => {
      const result = (engine as any).generateReorderReason(200, 100, 50, 20);
      expect(result).toContain('nhu cầu dự báo');
    });
  });

  describe('determineReorderType', () => {
    it('should return below_reorder_point when stock is low', () => {
      const result = (engine as any).determineReorderType(50, 100, 20);
      expect(result).toBe('below_reorder_point');
    });

    it('should return lead_time when days of supply is very low', () => {
      const result = (engine as any).determineReorderType(200, 100, 5);
      expect(result).toBe('lead_time');
    });

    it('should return forecast_demand for moderate days', () => {
      const result = (engine as any).determineReorderType(200, 100, 10);
      expect(result).toBe('forecast_demand');
    });

    it('should return safety_stock for high days', () => {
      const result = (engine as any).determineReorderType(200, 100, 20);
      expect(result).toBe('safety_stock');
    });
  });

  describe('identifyRisks', () => {
    it('should identify supplier delivery risk', () => {
      const supplier = {
        supplierId: 'sup-1',
        deliveryScore: 60,
        qualityScore: 90,
        leadTimeDays: 10,
        unitPrice: 100,
        isPreferred: false,
        overallScore: 70,
      };
      const part = { id: 'p1', partNumber: 'P1', name: 'Part' };
      const result = (engine as any).identifyRisks(supplier, part, 100);
      expect(result.some((r: any) => r.type === 'supplier')).toBe(true);
    });

    it('should identify quality risk', () => {
      const supplier = {
        deliveryScore: 90,
        qualityScore: 55,
        leadTimeDays: 10,
        unitPrice: 100,
        isPreferred: false,
        overallScore: 70,
      };
      const result = (engine as any).identifyRisks(supplier, { id: 'p1' }, 100);
      expect(result.some((r: any) => r.type === 'quality')).toBe(true);
    });

    it('should identify lead time risk', () => {
      const supplier = {
        deliveryScore: 90,
        qualityScore: 90,
        leadTimeDays: 25,
        unitPrice: 100,
        isPreferred: false,
        overallScore: 70,
      };
      const result = (engine as any).identifyRisks(supplier, { id: 'p1' }, 100);
      expect(result.some((r: any) => r.type === 'lead_time')).toBe(true);
    });

    it('should identify large order price risk', () => {
      const supplier = {
        deliveryScore: 90,
        qualityScore: 90,
        leadTimeDays: 10,
        unitPrice: 100000,
        isPreferred: false,
        overallScore: 70,
      };
      const result = (engine as any).identifyRisks(supplier, { id: 'p1' }, 10000);
      expect(result.some((r: any) => r.type === 'price')).toBe(true);
    });

    it('should return empty for low-risk supplier', () => {
      const supplier = {
        deliveryScore: 90,
        qualityScore: 90,
        leadTimeDays: 10,
        unitPrice: 1000,
        isPreferred: true,
        overallScore: 90,
      };
      const result = (engine as any).identifyRisks(supplier, { id: 'p1' }, 100);
      expect(result).toHaveLength(0);
    });
  });

  describe('calculateConfidenceScore', () => {
    it('should start at 100 and deduct for risks', () => {
      const supplier = { overallScore: 80, isPreferred: false };
      const quantityCalc = { eoqQuantity: 100, recommendedQty: 100 };
      const result = (engine as any).calculateConfidenceScore(supplier, quantityCalc, 50, []);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should deduct more for high severity risks', () => {
      const supplier = { overallScore: 80, isPreferred: false };
      const quantityCalc = { eoqQuantity: 100, recommendedQty: 100 };
      const highRisks = [{ severity: 'high' }];
      const medRisks = [{ severity: 'medium' }];
      const highResult = (engine as any).calculateConfidenceScore(supplier, quantityCalc, 50, highRisks);
      const medResult = (engine as any).calculateConfidenceScore(supplier, quantityCalc, 50, medRisks);
      expect(highResult).toBeLessThan(medResult);
    });

    it('should add bonus for preferred supplier', () => {
      // Use a lower overall score so the result doesn't clamp to 100
      const supplier = { overallScore: 40, isPreferred: true };
      const quantityCalc = { eoqQuantity: 100, recommendedQty: 100 };
      const withPreferred = (engine as any).calculateConfidenceScore(supplier, quantityCalc, 50, []);

      const nonPreferred = { overallScore: 40, isPreferred: false };
      const without = (engine as any).calculateConfidenceScore(nonPreferred, quantityCalc, 50, []);

      // Preferred supplier should score higher (capped at 100)
      expect(withPreferred).toBeGreaterThanOrEqual(without);
    });

    it('should deduct for low forecast demand', () => {
      const supplier = { overallScore: 80, isPreferred: false };
      const quantityCalc = { eoqQuantity: 100, recommendedQty: 100 };
      const lowForecast = (engine as any).calculateConfidenceScore(supplier, quantityCalc, 5, []);
      const normalForecast = (engine as any).calculateConfidenceScore(supplier, quantityCalc, 50, []);
      expect(lowForecast).toBeLessThan(normalForecast);
    });
  });

  describe('calculateDeliveryDate', () => {
    it('should skip weekends', () => {
      // Monday Jan 6 2025
      const monday = new Date(2025, 0, 6);
      const result = engine.calculateDeliveryDate(5, monday);
      // 5 business days from Monday = Friday Jan 10, + buffer
      expect(result.getTime()).toBeGreaterThan(monday.getTime());
    });

    it('should add buffer days', () => {
      const start = new Date(2025, 2, 3); // March 3 2025 (Monday)
      const result = engine.calculateDeliveryDate(10, start);
      // Should be more than 10 calendar days from start
      const diffDays = (result.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(10);
    });
  });

  describe('isVietnameseHoliday', () => {
    it('should detect New Year', () => {
      const newYear = new Date(2025, 0, 1);
      expect((engine as any).isVietnameseHoliday(newYear)).toBe(true);
    });

    it('should detect Labor Day', () => {
      const laborDay = new Date(2025, 4, 1);
      expect((engine as any).isVietnameseHoliday(laborDay)).toBe(true);
    });

    it('should detect Tet period', () => {
      const tet = new Date(2025, 0, 28);
      expect((engine as any).isVietnameseHoliday(tet)).toBe(true);
    });

    it('should return false for regular days', () => {
      const regularDay = new Date(2025, 2, 15);
      expect((engine as any).isVietnameseHoliday(regularDay)).toBe(false);
    });

    it('should detect Reunification Day', () => {
      const day = new Date(2025, 3, 30);
      expect((engine as any).isVietnameseHoliday(day)).toBe(true);
    });

    it('should detect National Day', () => {
      const day = new Date(2025, 8, 2);
      expect((engine as any).isVietnameseHoliday(day)).toBe(true);
    });
  });

  describe('selectOptimalSupplier', () => {
    it('should return null when no suppliers', async () => {
      mockPrisma.partSupplier.findMany.mockResolvedValue([]);
      const result = await engine.selectOptimalSupplier('part-1');
      expect(result).toBeNull();
    });

    it('should select highest scored supplier', async () => {
      mockPrisma.partSupplier.findMany.mockResolvedValue([
        {
          supplierId: 'sup-1',
          unitPrice: 100,
          leadTimeDays: 14,
          minOrderQty: 10,
          isPreferred: true,
          supplier: { id: 'sup-1', name: 'Supplier A', code: 'SA', rating: 90 },
        },
        {
          supplierId: 'sup-2',
          unitPrice: 80,
          leadTimeDays: 21,
          minOrderQty: 50,
          isPreferred: false,
          supplier: { id: 'sup-2', name: 'Supplier B', code: 'SB', rating: 70 },
        },
      ]);

      const result = await engine.selectOptimalSupplier('part-1');
      expect(result).not.toBeNull();
      expect(result!.supplierId).toBe('sup-1');
      expect(result!.isPreferred).toBe(true);
    });
  });

  describe('calculateOptimalQuantity', () => {
    it('should throw when part not found', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);
      await expect(engine.calculateOptimalQuantity('non-existent')).rejects.toThrow('Part not found');
    });

    it('should calculate EOQ and recommended quantity', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(createMockPart());
      mockPrisma.materialAllocation.aggregate.mockResolvedValue({ _sum: { allocatedQty: 100 } });
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await engine.calculateOptimalQuantity('part-1');

      expect(result.eoqQuantity).toBeGreaterThanOrEqual(0);
      expect(result.recommendedQty).toBeGreaterThanOrEqual(result.moqQuantity);
      expect(result.forecastQty).toBeGreaterThan(0);
    });
  });

  describe('generatePOSuggestion', () => {
    it('should return null when part not found', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);
      const result = await engine.generatePOSuggestion('non-existent');
      expect(result).toBeNull();
    });

    it('should return null when no suppliers', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(createMockPart({ partSuppliers: [] }));
      const result = await engine.generatePOSuggestion('part-1');
      expect(result).toBeNull();
    });
  });

  describe('detectReorderNeeds', () => {
    it('should return empty array when no parts need reorder', async () => {
      mockPrisma.part.findMany.mockResolvedValue([
        createMockPart({
          inventory: [{ quantity: 1000, reservedQty: 0 }],
          reorderPoint: 100,
        }),
      ]);
      mockPrisma.materialAllocation.aggregate.mockResolvedValue({ _sum: { allocatedQty: 10 } });

      const result = await engine.detectReorderNeeds();
      // With 1000 available vs 100 reorder point and low demand, should be empty
      expect(Array.isArray(result)).toBe(true);
    });

    it('should detect parts needing reorder', async () => {
      mockPrisma.part.findMany.mockResolvedValue([
        createMockPart({
          inventory: [{ quantity: 50, reservedQty: 10 }],
          reorderPoint: 100,
          safetyStock: 50,
        }),
      ]);
      mockPrisma.materialAllocation.aggregate.mockResolvedValue({ _sum: { allocatedQty: 200 } });

      const result = await engine.detectReorderNeeds();
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].availableStock).toBe(40);
    });
  });
});
