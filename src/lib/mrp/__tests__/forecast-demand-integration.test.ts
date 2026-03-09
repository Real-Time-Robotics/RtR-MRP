import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoisted mocks
const { mockPrisma, mockForecastEngine, mockSafetyStockOptimizer, mockGetHolidayBuffer } = vi.hoisted(() => ({
  mockPrisma: {
    part: { findUnique: vi.fn(), findMany: vi.fn() },
    salesOrderLine: { aggregate: vi.fn() },
    inventory: { aggregate: vi.fn() },
  },
  mockForecastEngine: {
    generateForecast: vi.fn(),
  },
  mockSafetyStockOptimizer: {
    calculateOptimalSafetyStock: vi.fn(),
  },
  mockGetHolidayBuffer: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

vi.mock('@/lib/ai/forecast', () => ({
  getForecastEngine: () => mockForecastEngine,
  getHolidayBuffer: mockGetHolidayBuffer,
  getSafetyStockOptimizer: () => mockSafetyStockOptimizer,
}));

import {
  ForecastDemandIntegration,
  getForecastDemandIntegration,
  getForecastDemandForMRP,
  getBulkForecastDemandForMRP,
} from '../forecast-demand-integration';

describe('forecast-demand-integration', () => {
  let integration: ForecastDemandIntegration;

  beforeEach(() => {
    vi.clearAllMocks();
    integration = new ForecastDemandIntegration();
  });

  // =========================================================================
  // getForecastDemand
  // =========================================================================
  describe('getForecastDemand', () => {
    it('should return empty array when forecast is null', async () => {
      mockForecastEngine.generateForecast.mockResolvedValue(null);

      const result = await integration.getForecastDemand('part-1');
      expect(result).toEqual([]);
    });

    it('should map forecast data correctly', async () => {
      mockForecastEngine.generateForecast.mockResolvedValue({
        forecasts: [
          {
            period: '2026-W10',
            forecast: 100,
            confidence: 0.85,
            factors: { seasonalIndex: 1.2, holidayFactor: 1.1 },
          },
          {
            period: '2026-W11',
            forecast: 80,
            confidence: 0.9,
            factors: { seasonalIndex: 1.0 },
          },
        ],
      });

      const result = await integration.getForecastDemand('part-1', 12, 'weekly');

      expect(result.length).toBe(2);
      expect(result[0].partId).toBe('part-1');
      expect(result[0].period).toBe('2026-W10');
      expect(result[0].forecastQty).toBe(100);
      expect(result[0].confidence).toBe(0.85);
      expect(result[0].seasonalFactor).toBe(1.2);
      expect(result[0].holidayFactor).toBe(1.1);
      expect(result[0].adjustedQty).toBe(Math.ceil(100 * 1.2 * 1.1));

      // Second entry with missing holidayFactor defaults to 1
      expect(result[1].holidayFactor).toBe(1);
      expect(result[1].adjustedQty).toBe(Math.ceil(80 * 1.0 * 1));
    });

    it('should pass correct options to forecast engine', async () => {
      mockForecastEngine.generateForecast.mockResolvedValue(null);

      await integration.getForecastDemand('part-1', 24, 'monthly');

      expect(mockForecastEngine.generateForecast).toHaveBeenCalledWith('part-1', {
        periodType: 'monthly',
        periodsAhead: 24,
      });
    });

    it('should use default horizon and period type', async () => {
      mockForecastEngine.generateForecast.mockResolvedValue(null);

      await integration.getForecastDemand('part-1');

      expect(mockForecastEngine.generateForecast).toHaveBeenCalledWith('part-1', {
        periodType: 'weekly',
        periodsAhead: 12,
      });
    });

    it('should handle missing seasonalIndex with default 1', async () => {
      mockForecastEngine.generateForecast.mockResolvedValue({
        forecasts: [
          {
            period: '2026-W10',
            forecast: 50,
            confidence: 0.7,
            factors: {},
          },
        ],
      });

      const result = await integration.getForecastDemand('part-1');
      expect(result[0].seasonalFactor).toBe(1);
      expect(result[0].holidayFactor).toBe(1);
      expect(result[0].adjustedQty).toBe(50);
    });
  });

  // =========================================================================
  // getMRPDemandInput
  // =========================================================================
  describe('getMRPDemandInput', () => {
    it('should return null when part not found', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);

      const result = await integration.getMRPDemandInput('part-1');
      expect(result).toBeNull();
    });

    it('should return orders-only demand when no forecast', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'SKU001',
        name: 'Part One',
        safetyStock: 10,
      });
      mockPrisma.salesOrderLine.aggregate.mockResolvedValue({
        _sum: { quantity: 200 },
      });
      mockForecastEngine.generateForecast.mockResolvedValue(null);
      mockSafetyStockOptimizer.calculateOptimalSafetyStock.mockResolvedValue(null);

      const result = await integration.getMRPDemandInput('part-1');

      expect(result).not.toBeNull();
      expect(result!.grossDemand).toBe(200);
      expect(result!.forecastDemand).toBe(0);
      expect(result!.combinedDemand).toBe(200);
      expect(result!.demandSource).toBe('orders');
      expect(result!.currentSafetyStock).toBe(10);
      expect(result!.recommendedSafetyStock).toBe(10); // falls back to part.safetyStock
    });

    it('should return forecast-only demand when no orders', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'SKU001',
        name: 'Part One',
        safetyStock: 5,
      });
      mockPrisma.salesOrderLine.aggregate.mockResolvedValue({
        _sum: { quantity: null },
      });
      mockForecastEngine.generateForecast.mockResolvedValue({
        forecasts: [
          { period: 'W1', forecast: 100, confidence: 0.8, factors: {} },
        ],
      });
      mockSafetyStockOptimizer.calculateOptimalSafetyStock.mockResolvedValue({
        recommended: { safetyStock: 15 },
      });

      const result = await integration.getMRPDemandInput('part-1');

      expect(result!.grossDemand).toBe(0);
      expect(result!.forecastDemand).toBe(100);
      expect(result!.combinedDemand).toBe(100);
      expect(result!.demandSource).toBe('forecast');
      expect(result!.recommendedSafetyStock).toBe(15);
    });

    it('should combine orders and forecast with weight', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'SKU001',
        name: 'Part One',
        safetyStock: 0,
      });
      mockPrisma.salesOrderLine.aggregate.mockResolvedValue({
        _sum: { quantity: 100 },
      });
      mockForecastEngine.generateForecast.mockResolvedValue({
        forecasts: [
          { period: 'W1', forecast: 200, confidence: 0.9, factors: {} },
        ],
      });
      mockSafetyStockOptimizer.calculateOptimalSafetyStock.mockResolvedValue(null);

      const result = await integration.getMRPDemandInput('part-1', {
        forecastWeight: 0.6,
      });

      // combined = ceil(100 * 0.4 + 200 * 0.6) = ceil(40 + 120) = 160
      expect(result!.combinedDemand).toBe(160);
      expect(result!.demandSource).toBe('combined');
    });

    it('should not include open orders when disabled', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'SKU001',
        name: 'Part One',
        safetyStock: 0,
      });
      mockForecastEngine.generateForecast.mockResolvedValue(null);
      mockSafetyStockOptimizer.calculateOptimalSafetyStock.mockResolvedValue(null);

      await integration.getMRPDemandInput('part-1', { includeOpenOrders: false });

      expect(mockPrisma.salesOrderLine.aggregate).not.toHaveBeenCalled();
    });

    it('should calculate average confidence correctly', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'SKU001',
        name: 'Part One',
        safetyStock: 0,
      });
      mockPrisma.salesOrderLine.aggregate.mockResolvedValue({
        _sum: { quantity: null },
      });
      mockForecastEngine.generateForecast.mockResolvedValue({
        forecasts: [
          { period: 'W1', forecast: 50, confidence: 0.8, factors: {} },
          { period: 'W2', forecast: 60, confidence: 0.6, factors: {} },
        ],
      });
      mockSafetyStockOptimizer.calculateOptimalSafetyStock.mockResolvedValue(null);

      const result = await integration.getMRPDemandInput('part-1');

      expect(result!.forecastConfidence).toBe(0.7); // (0.8+0.6)/2
    });

    it('should use default options', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'SKU001',
        name: 'Part One',
        safetyStock: null,
      });
      mockPrisma.salesOrderLine.aggregate.mockResolvedValue({
        _sum: { quantity: null },
      });
      mockForecastEngine.generateForecast.mockResolvedValue(null);
      mockSafetyStockOptimizer.calculateOptimalSafetyStock.mockResolvedValue(null);

      const result = await integration.getMRPDemandInput('part-1');

      expect(result!.currentSafetyStock).toBe(0);
      expect(result!.recommendedSafetyStock).toBe(0);
      expect(result!.forecastConfidence).toBe(0);
    });
  });

  // =========================================================================
  // getBulkMRPDemandInputs
  // =========================================================================
  describe('getBulkMRPDemandInputs', () => {
    it('should use provided partIds (sliced to maxParts)', async () => {
      // Return null for each part to keep it simple
      mockPrisma.part.findUnique.mockResolvedValue(null);
      mockGetHolidayBuffer.mockReturnValue(0);

      const result = await integration.getBulkMRPDemandInputs(
        ['p1', 'p2', 'p3'],
        { maxParts: 2 }
      );

      expect(mockPrisma.part.findUnique).toHaveBeenCalledTimes(2);
      expect(result.inputs).toEqual([]);
      expect(result.summary.totalParts).toBe(0);
    });

    it('should fetch parts from DB when no partIds provided', async () => {
      mockPrisma.part.findMany.mockResolvedValue([
        { id: 'p1' },
        { id: 'p2' },
      ]);
      mockPrisma.part.findUnique.mockResolvedValue(null);
      mockGetHolidayBuffer.mockReturnValue(0);

      const result = await integration.getBulkMRPDemandInputs(undefined, {});

      expect(mockPrisma.part.findMany).toHaveBeenCalledWith({
        where: { partType: { in: ['FINISHED_GOOD', 'COMPONENT'] } },
        select: { id: true },
        take: 100,
      });
      expect(result.inputs).toEqual([]);
    });

    it('should aggregate summary correctly', async () => {
      mockPrisma.part.findUnique
        .mockResolvedValueOnce({
          id: 'p1', partNumber: 'S1', name: 'P1', safetyStock: 0,
        })
        .mockResolvedValueOnce({
          id: 'p2', partNumber: 'S2', name: 'P2', safetyStock: 0,
        });
      // First part: orders only
      mockPrisma.salesOrderLine.aggregate
        .mockResolvedValueOnce({ _sum: { quantity: 100 } })
        .mockResolvedValueOnce({ _sum: { quantity: null } });

      mockForecastEngine.generateForecast
        .mockResolvedValueOnce(null) // no forecast for p1
        .mockResolvedValueOnce({     // forecast for p2
          forecasts: [
            { period: 'W1', forecast: 50, confidence: 0.9, factors: {} },
          ],
        });

      mockSafetyStockOptimizer.calculateOptimalSafetyStock.mockResolvedValue(null);
      mockGetHolidayBuffer.mockReturnValue(5);

      const result = await integration.getBulkMRPDemandInputs(['p1', 'p2']);

      expect(result.inputs.length).toBe(2);
      expect(result.summary.totalParts).toBe(2);
      expect(result.summary.partsOrdersOnly).toBe(1);
      expect(result.summary.partsWithForecast).toBe(1);
      expect(result.summary.holidayAdjustmentApplied).toBe(true);
      expect(result.summary.holidayBuffer).toBe(5);
    });

    it('should handle empty partIds array', async () => {
      mockPrisma.part.findMany.mockResolvedValue([]);
      mockGetHolidayBuffer.mockReturnValue(0);

      const result = await integration.getBulkMRPDemandInputs([]);

      expect(mockPrisma.part.findMany).toHaveBeenCalled();
      expect(result.inputs).toEqual([]);
    });

    it('should compute avgForecastConfidence as 0 when no forecast parts', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'p1', partNumber: 'S1', name: 'P1', safetyStock: 0,
      });
      mockPrisma.salesOrderLine.aggregate.mockResolvedValue({
        _sum: { quantity: 50 },
      });
      mockForecastEngine.generateForecast.mockResolvedValue(null);
      mockSafetyStockOptimizer.calculateOptimalSafetyStock.mockResolvedValue(null);
      mockGetHolidayBuffer.mockReturnValue(0);

      const result = await integration.getBulkMRPDemandInputs(['p1']);

      expect(result.summary.avgForecastConfidence).toBe(0);
    });
  });

  // =========================================================================
  // getEnhancedSafetyStocks
  // =========================================================================
  describe('getEnhancedSafetyStocks', () => {
    it('should return map with safety stock data', async () => {
      mockSafetyStockOptimizer.calculateOptimalSafetyStock
        .mockResolvedValueOnce({
          current: { safetyStock: 10 },
          recommended: { safetyStock: 15 },
          delta: { safetyStock: 5 },
        })
        .mockResolvedValueOnce(null);

      const result = await integration.getEnhancedSafetyStocks(['p1', 'p2']);

      expect(result.size).toBe(1);
      expect(result.get('p1')).toEqual({
        current: 10,
        recommended: 15,
        delta: 5,
      });
      expect(result.has('p2')).toBe(false);
    });

    it('should return empty map for empty input', async () => {
      const result = await integration.getEnhancedSafetyStocks([]);
      expect(result.size).toBe(0);
    });
  });

  // =========================================================================
  // generateForecastBasedPlannedOrders
  // =========================================================================
  describe('generateForecastBasedPlannedOrders', () => {
    it('should generate planned orders when net required >= minQuantity', async () => {
      // Setup for getBulkMRPDemandInputs
      mockPrisma.part.findUnique
        .mockResolvedValueOnce({
          id: 'p1', partNumber: 'SKU1', name: 'Part 1', safetyStock: 10,
        })
        // second call for lead time lookup
        .mockResolvedValueOnce({
          leadTimeDays: 7,
          partSuppliers: [{ leadTimeDays: 5 }],
        });
      mockPrisma.salesOrderLine.aggregate.mockResolvedValue({
        _sum: { quantity: 100 },
      });
      mockForecastEngine.generateForecast.mockResolvedValue(null);
      mockSafetyStockOptimizer.calculateOptimalSafetyStock.mockResolvedValue({
        recommended: { safetyStock: 20 },
      });
      mockGetHolidayBuffer.mockReturnValue(0);

      // Inventory for planned order calculation
      mockPrisma.inventory.aggregate.mockResolvedValue({
        _sum: { quantity: 50, reservedQty: 10 },
      });

      const result = await integration.generateForecastBasedPlannedOrders({
        partIds: ['p1'],
      });

      // netRequired = combinedDemand(100) + recommendedSS(20) - available(50-10=40) = 80
      expect(result.plannedOrders.length).toBe(1);
      expect(result.plannedOrders[0].quantity).toBe(80);
      expect(result.plannedOrders[0].partId).toBe('p1');
      expect(result.plannedOrders[0].partSku).toBe('SKU1');
      expect(result.summary.totalOrders).toBe(1);
      expect(result.summary.totalQuantity).toBe(80);
    });

    it('should not generate order when net required < minQuantity', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'p1', partNumber: 'SKU1', name: 'Part 1', safetyStock: 0,
      });
      mockPrisma.salesOrderLine.aggregate.mockResolvedValue({
        _sum: { quantity: 10 },
      });
      mockForecastEngine.generateForecast.mockResolvedValue(null);
      mockSafetyStockOptimizer.calculateOptimalSafetyStock.mockResolvedValue(null);
      mockGetHolidayBuffer.mockReturnValue(0);
      mockPrisma.inventory.aggregate.mockResolvedValue({
        _sum: { quantity: 100, reservedQty: 0 },
      });

      const result = await integration.generateForecastBasedPlannedOrders({
        partIds: ['p1'],
        minQuantity: 1,
      });

      // netRequired = 10 + 0 - 100 = -90 < 1
      expect(result.plannedOrders.length).toBe(0);
    });

    it('should use part leadTimeDays when no supplier lead time', async () => {
      mockPrisma.part.findUnique
        .mockResolvedValueOnce({
          id: 'p1', partNumber: 'SKU1', name: 'Part 1', safetyStock: 0,
        })
        .mockResolvedValueOnce({
          leadTimeDays: 21,
          partSuppliers: [],
        });
      mockPrisma.salesOrderLine.aggregate.mockResolvedValue({
        _sum: { quantity: 50 },
      });
      mockForecastEngine.generateForecast.mockResolvedValue(null);
      mockSafetyStockOptimizer.calculateOptimalSafetyStock.mockResolvedValue(null);
      mockGetHolidayBuffer.mockReturnValue(0);
      mockPrisma.inventory.aggregate.mockResolvedValue({
        _sum: { quantity: 0, reservedQty: 0 },
      });

      const result = await integration.generateForecastBasedPlannedOrders({
        partIds: ['p1'],
      });

      expect(result.plannedOrders.length).toBe(1);
      // suggestedDate should be ~21 days from now
      const expectedMin = new Date();
      expectedMin.setDate(expectedMin.getDate() + 20);
      expect(result.plannedOrders[0].suggestedDate.getTime()).toBeGreaterThan(
        expectedMin.getTime()
      );
    });

    it('should default leadTimeDays to 14 when no part or supplier info', async () => {
      mockPrisma.part.findUnique
        .mockResolvedValueOnce({
          id: 'p1', partNumber: 'SKU1', name: 'Part 1', safetyStock: 0,
        })
        .mockResolvedValueOnce(null); // no part found for lead time
      mockPrisma.salesOrderLine.aggregate.mockResolvedValue({
        _sum: { quantity: 50 },
      });
      mockForecastEngine.generateForecast.mockResolvedValue(null);
      mockSafetyStockOptimizer.calculateOptimalSafetyStock.mockResolvedValue(null);
      mockGetHolidayBuffer.mockReturnValue(0);
      mockPrisma.inventory.aggregate.mockResolvedValue({
        _sum: { quantity: 0, reservedQty: 0 },
      });

      const result = await integration.generateForecastBasedPlannedOrders({
        partIds: ['p1'],
      });

      expect(result.plannedOrders.length).toBe(1);
    });

    it('should handle null inventory sums', async () => {
      mockPrisma.part.findUnique
        .mockResolvedValueOnce({
          id: 'p1', partNumber: 'SKU1', name: 'Part 1', safetyStock: 0,
        })
        .mockResolvedValueOnce({ leadTimeDays: 7, partSuppliers: [] });
      mockPrisma.salesOrderLine.aggregate.mockResolvedValue({
        _sum: { quantity: 30 },
      });
      mockForecastEngine.generateForecast.mockResolvedValue(null);
      mockSafetyStockOptimizer.calculateOptimalSafetyStock.mockResolvedValue(null);
      mockGetHolidayBuffer.mockReturnValue(0);
      mockPrisma.inventory.aggregate.mockResolvedValue({
        _sum: { quantity: null, reservedQty: null },
      });

      const result = await integration.generateForecastBasedPlannedOrders({
        partIds: ['p1'],
      });

      // netRequired = 30 + 0 - 0 = 30
      expect(result.plannedOrders[0].quantity).toBe(30);
    });
  });

  // =========================================================================
  // Singleton & convenience functions
  // =========================================================================
  describe('getForecastDemandIntegration', () => {
    it('should return a ForecastDemandIntegration instance', () => {
      const instance = getForecastDemandIntegration();
      expect(instance).toBeInstanceOf(ForecastDemandIntegration);
    });

    it('should return the same instance on subsequent calls', () => {
      const a = getForecastDemandIntegration();
      const b = getForecastDemandIntegration();
      expect(a).toBe(b);
    });
  });

  describe('getForecastDemandForMRP', () => {
    it('should delegate to getMRPDemandInput', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);

      const result = await getForecastDemandForMRP('part-1', { forecastWeight: 0.3 });
      expect(result).toBeNull();
      expect(mockPrisma.part.findUnique).toHaveBeenCalled();
    });
  });

  describe('getBulkForecastDemandForMRP', () => {
    it('should delegate to getBulkMRPDemandInputs', async () => {
      mockPrisma.part.findMany.mockResolvedValue([]);
      mockGetHolidayBuffer.mockReturnValue(0);

      const result = await getBulkForecastDemandForMRP(undefined, { maxParts: 10 });
      expect(result.inputs).toEqual([]);
      expect(result.summary).toBeDefined();
    });
  });
});
