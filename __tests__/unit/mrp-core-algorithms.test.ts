import { describe, it, expect } from 'vitest';

/**
 * Tests for MRP core algorithms: LLC calculation, net requirements,
 * capacity feasibility scoring, and ATP grid.
 * These are pure algorithmic tests independent of database.
 */

// Low-Level Code (LLC) calculation algorithm from mrp-core.ts
function calculateLLC(bomGraph: Map<string, Array<{ childId: string }>>): Map<string, number> {
  const levels = new Map<string, number>();

  // Initialize all items at level 0
  for (const [parentId] of bomGraph) {
    levels.set(parentId, 0);
  }

  // Iteratively calculate levels (BFS-like)
  let changed = true;
  let iterations = 0;
  const maxIterations = 100; // Circular reference protection

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (const [parentId, children] of bomGraph) {
      for (const child of children) {
        const parentLevel = levels.get(parentId) || 0;
        const currentChildLevel = levels.get(child.childId) || 0;
        const newLevel = parentLevel + 1;

        if (newLevel > currentChildLevel) {
          levels.set(child.childId, newLevel);
          changed = true;
        }
      }
    }
  }

  return levels;
}

// Net requirements calculation
function calculateNetRequirement(
  grossDemand: number,
  safetyStock: number,
  currentStock: number
): number {
  return Math.max(0, (grossDemand + safetyStock) - currentStock);
}

// Capacity feasibility scoring from capacity-calculator.ts
function calculateFeasibilityScore(
  totalOrders: number,
  delayedOrders: number,
  infeasibleOrders: number,
  criticalBottlenecks: number
): number {
  let score = 100;
  if (totalOrders > 0) {
    score -= (delayedOrders / totalOrders) * 30;
    score -= (infeasibleOrders / totalOrders) * 50;
  }
  score -= criticalBottlenecks * 5;
  return Math.max(0, Math.min(100, score));
}

// ATP cumulative calculation
function calculateATPGrid(
  startingQty: number,
  buckets: Array<{ supply: number; demand: number }>
): Array<{ supply: number; demand: number; cumulativeATP: number }> {
  let cumulative = startingQty;
  return buckets.map(bucket => {
    cumulative = Math.max(0, cumulative + bucket.supply - bucket.demand);
    return { ...bucket, cumulativeATP: cumulative };
  });
}

// Demand explosion to next BOM level
function explodeDemand(
  parentNeed: number,
  bomQty: number,
  scrapRate: number = 0
): number {
  return Math.ceil(parentNeed * bomQty * (1 + scrapRate));
}

describe('MRP Core Algorithms', () => {
  describe('Low-Level Code (LLC) Calculation', () => {
    it('should assign level 0 to top-level items', () => {
      const graph = new Map<string, Array<{ childId: string }>>([
        ['A', [{ childId: 'B' }]],
      ]);

      const levels = calculateLLC(graph);
      expect(levels.get('A')).toBe(0);
    });

    it('should assign level 1 to direct children', () => {
      const graph = new Map([
        ['A', [{ childId: 'B' }, { childId: 'C' }]],
      ]);

      const levels = calculateLLC(graph);
      expect(levels.get('B')).toBe(1);
      expect(levels.get('C')).toBe(1);
    });

    it('should handle multi-level BOM', () => {
      // A → B → C → D
      const graph = new Map([
        ['A', [{ childId: 'B' }]],
        ['B', [{ childId: 'C' }]],
        ['C', [{ childId: 'D' }]],
      ]);

      const levels = calculateLLC(graph);
      expect(levels.get('A')).toBe(0);
      expect(levels.get('B')).toBe(1);
      expect(levels.get('C')).toBe(2);
      expect(levels.get('D')).toBe(3);
    });

    it('should handle shared components (diamond BOM)', () => {
      // A → B, A → C, B → D, C → D
      // D should be level 2 (max of paths)
      const graph = new Map([
        ['A', [{ childId: 'B' }, { childId: 'C' }]],
        ['B', [{ childId: 'D' }]],
        ['C', [{ childId: 'D' }]],
      ]);

      const levels = calculateLLC(graph);
      expect(levels.get('D')).toBe(2);
    });

    it('should terminate on circular references', () => {
      // A → B → A (circular)
      const graph = new Map([
        ['A', [{ childId: 'B' }]],
        ['B', [{ childId: 'A' }]],
      ]);

      // Should not infinite loop - maxIterations protection
      const levels = calculateLLC(graph);
      expect(levels.size).toBeGreaterThan(0);
    });

    it('should handle empty BOM', () => {
      const graph = new Map<string, Array<{ childId: string }>>();
      const levels = calculateLLC(graph);
      expect(levels.size).toBe(0);
    });
  });

  describe('Net Requirements', () => {
    it('should calculate positive net requirement when stock insufficient', () => {
      expect(calculateNetRequirement(100, 20, 50)).toBe(70); // (100+20)-50
    });

    it('should return zero when stock covers demand plus safety', () => {
      expect(calculateNetRequirement(50, 20, 100)).toBe(0); // (50+20)-100 < 0 → 0
    });

    it('should include safety stock in requirement', () => {
      expect(calculateNetRequirement(80, 50, 100)).toBe(30); // (80+50)-100
    });

    it('should handle zero safety stock', () => {
      expect(calculateNetRequirement(100, 0, 80)).toBe(20);
    });

    it('should handle zero current stock', () => {
      expect(calculateNetRequirement(100, 20, 0)).toBe(120);
    });

    it('should never return negative', () => {
      expect(calculateNetRequirement(10, 5, 1000)).toBe(0);
    });
  });

  describe('Demand Explosion', () => {
    it('should multiply parent need by BOM quantity', () => {
      expect(explodeDemand(10, 3)).toBe(30); // 10 units × 3 per assembly
    });

    it('should apply scrap rate', () => {
      expect(explodeDemand(10, 3, 0.1)).toBe(33); // ceil(10*3*1.1) = 33
    });

    it('should ceil the result', () => {
      expect(explodeDemand(7, 3, 0.05)).toBe(23); // ceil(7*3*1.05) = ceil(22.05) = 23
    });

    it('should handle zero scrap rate', () => {
      expect(explodeDemand(100, 2, 0)).toBe(200);
    });

    it('should handle fractional BOM quantities', () => {
      expect(explodeDemand(10, 0.5)).toBe(5); // 10 * 0.5 = 5
    });
  });

  describe('Capacity Feasibility Scoring', () => {
    it('should return 100 for perfect feasibility', () => {
      expect(calculateFeasibilityScore(10, 0, 0, 0)).toBe(100);
    });

    it('should penalize delayed orders', () => {
      const score = calculateFeasibilityScore(10, 5, 0, 0);
      expect(score).toBe(85); // 100 - (5/10)*30
    });

    it('should penalize infeasible orders more heavily', () => {
      const score = calculateFeasibilityScore(10, 0, 5, 0);
      expect(score).toBe(75); // 100 - (5/10)*50
    });

    it('should penalize critical bottlenecks', () => {
      const score = calculateFeasibilityScore(10, 0, 0, 3);
      expect(score).toBe(85); // 100 - 3*5
    });

    it('should combine all penalties', () => {
      const score = calculateFeasibilityScore(10, 3, 2, 1);
      // 100 - (3/10)*30 - (2/10)*50 - 1*5 = 100 - 9 - 10 - 5 = 76
      expect(score).toBe(76);
    });

    it('should clamp to 0 minimum', () => {
      const score = calculateFeasibilityScore(1, 1, 1, 20);
      expect(score).toBe(0);
    });

    it('should clamp to 100 maximum', () => {
      const score = calculateFeasibilityScore(0, 0, 0, 0);
      expect(score).toBe(100);
    });

    it('should handle zero total orders', () => {
      const score = calculateFeasibilityScore(0, 0, 0, 2);
      expect(score).toBe(90); // 100 - 2*5
    });
  });

  describe('ATP Grid Calculation', () => {
    it('should accumulate supply and demand correctly', () => {
      const grid = calculateATPGrid(100, [
        { supply: 50, demand: 30 },  // 100 + 50 - 30 = 120
        { supply: 0, demand: 80 },   // 120 + 0 - 80 = 40
        { supply: 100, demand: 20 }, // 40 + 100 - 20 = 120
      ]);

      expect(grid[0].cumulativeATP).toBe(120);
      expect(grid[1].cumulativeATP).toBe(40);
      expect(grid[2].cumulativeATP).toBe(120);
    });

    it('should never go below zero', () => {
      const grid = calculateATPGrid(10, [
        { supply: 0, demand: 50 }, // max(0, 10-50) = 0
        { supply: 30, demand: 0 }, // 0 + 30 = 30
      ]);

      expect(grid[0].cumulativeATP).toBe(0);
      expect(grid[1].cumulativeATP).toBe(30);
    });

    it('should handle zero starting quantity', () => {
      const grid = calculateATPGrid(0, [
        { supply: 100, demand: 30 },
      ]);

      expect(grid[0].cumulativeATP).toBe(70);
    });

    it('should handle empty buckets', () => {
      const grid = calculateATPGrid(100, []);
      expect(grid).toHaveLength(0);
    });

    it('should find ATP date (first bucket with sufficient qty)', () => {
      const requestedQty = 50;
      const grid = calculateATPGrid(10, [
        { supply: 0, demand: 5 },    // 5
        { supply: 100, demand: 20 }, // 85
        { supply: 0, demand: 10 },   // 75
      ]);

      const atpBucket = grid.findIndex(b => b.cumulativeATP >= requestedQty);
      expect(atpBucket).toBe(1); // Week 2 (0-indexed)
    });

    it('should return -1 when ATP not achievable', () => {
      const requestedQty = 500;
      const grid = calculateATPGrid(10, [
        { supply: 50, demand: 30 },
        { supply: 50, demand: 30 },
      ]);

      const atpBucket = grid.findIndex(b => b.cumulativeATP >= requestedQty);
      expect(atpBucket).toBe(-1); // Never enough
    });
  });

  describe('CTP Production Days', () => {
    it('should calculate production days from hours', () => {
      const totalHours = 40;
      const hoursPerDay = 8;
      const productionDays = Math.ceil(totalHours / hoursPerDay);
      expect(productionDays).toBe(5);
    });

    it('should ceil partial days', () => {
      const productionDays = Math.ceil(10 / 8);
      expect(productionDays).toBe(2); // 1.25 days → 2
    });

    it('should check capacity feasibility (30 day limit)', () => {
      expect(Math.ceil(200 / 8) <= 30).toBe(true);  // 25 days ≤ 30
      expect(Math.ceil(300 / 8) <= 30).toBe(false); // 38 days > 30
    });
  });
});
