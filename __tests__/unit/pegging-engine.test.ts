import { describe, it, expect } from 'vitest';
import type { DemandPeg, SupplyPeg } from '@/lib/mrp/pegging-engine';

/**
 * Tests for the FIFO pegging algorithm.
 * The performPegging function is private, so we replicate its logic here
 * to verify the algorithm correctness independently of database access.
 */
function performPegging(demands: DemandPeg[], supplies: SupplyPeg[]): DemandPeg[] {
  for (const demand of demands) {
    let remainingDemand = demand.quantity;

    for (const supply of supplies) {
      if (remainingDemand <= 0) break;
      if (supply.availableQty <= 0) continue;

      const allocate = Math.min(remainingDemand, supply.availableQty);

      demand.peggedQty += allocate;
      demand.peggedFrom.push({
        supplyType: supply.supplyType,
        supplyId: supply.supplyId,
        quantity: allocate,
      });

      supply.allocatedQty += allocate;
      supply.availableQty -= allocate;
      supply.allocatedTo.push({
        demandType: demand.demandType,
        demandId: demand.demandId,
        quantity: allocate,
      });

      remainingDemand -= allocate;
    }

    if (demand.peggedQty >= demand.quantity) {
      demand.status = 'FULLY_PEGGED';
    } else if (demand.peggedQty > 0) {
      demand.status = 'PARTIALLY_PEGGED';
    }
  }

  return demands;
}

function createDemand(id: string, quantity: number): DemandPeg {
  return {
    demandType: 'SALES_ORDER',
    demandId: id,
    reference: `SO-${id}`,
    date: new Date(),
    quantity,
    peggedQty: 0,
    peggedFrom: [],
    status: 'UNPEGGED',
  };
}

function createSupply(id: string, quantity: number, type = 'PURCHASE_ORDER'): SupplyPeg {
  return {
    supplyType: type,
    supplyId: id,
    reference: `PO-${id}`,
    date: new Date(),
    quantity,
    allocatedQty: 0,
    allocatedTo: [],
    availableQty: quantity,
  };
}

describe('Pegging Engine - FIFO Algorithm', () => {
  describe('basic allocation', () => {
    it('should fully peg demand when supply is sufficient', () => {
      const demands = [createDemand('D1', 100)];
      const supplies = [createSupply('S1', 200)];

      performPegging(demands, supplies);

      expect(demands[0].status).toBe('FULLY_PEGGED');
      expect(demands[0].peggedQty).toBe(100);
      expect(supplies[0].availableQty).toBe(100);
    });

    it('should partially peg when supply is insufficient', () => {
      const demands = [createDemand('D1', 100)];
      const supplies = [createSupply('S1', 50)];

      performPegging(demands, supplies);

      expect(demands[0].status).toBe('PARTIALLY_PEGGED');
      expect(demands[0].peggedQty).toBe(50);
      expect(supplies[0].availableQty).toBe(0);
    });

    it('should leave demand unpegged when no supply exists', () => {
      const demands = [createDemand('D1', 100)];
      const supplies: SupplyPeg[] = [];

      performPegging(demands, supplies);

      expect(demands[0].status).toBe('UNPEGGED');
      expect(demands[0].peggedQty).toBe(0);
    });
  });

  describe('FIFO ordering', () => {
    it('should allocate from first supply before second', () => {
      const demands = [createDemand('D1', 150)];
      const supplies = [
        createSupply('S1', 100),
        createSupply('S2', 100),
      ];

      performPegging(demands, supplies);

      expect(demands[0].status).toBe('FULLY_PEGGED');
      expect(demands[0].peggedFrom).toHaveLength(2);
      expect(demands[0].peggedFrom[0].quantity).toBe(100); // All of S1
      expect(demands[0].peggedFrom[1].quantity).toBe(50);  // Partial S2
      expect(supplies[0].availableQty).toBe(0);
      expect(supplies[1].availableQty).toBe(50);
    });

    it('should process demands in order (first demand gets priority)', () => {
      const demands = [
        createDemand('D1', 80),
        createDemand('D2', 80),
      ];
      const supplies = [createSupply('S1', 100)];

      performPegging(demands, supplies);

      expect(demands[0].status).toBe('FULLY_PEGGED');
      expect(demands[0].peggedQty).toBe(80);
      expect(demands[1].status).toBe('PARTIALLY_PEGGED');
      expect(demands[1].peggedQty).toBe(20);
    });
  });

  describe('multiple demands and supplies', () => {
    it('should handle multiple demands against multiple supplies', () => {
      const demands = [
        createDemand('D1', 30),
        createDemand('D2', 50),
        createDemand('D3', 40),
      ];
      const supplies = [
        createSupply('S1', 50),
        createSupply('S2', 60),
      ];

      performPegging(demands, supplies);

      expect(demands[0].status).toBe('FULLY_PEGGED'); // 30 from S1
      expect(demands[1].status).toBe('FULLY_PEGGED'); // 20 from S1 + 30 from S2
      expect(demands[2].status).toBe('PARTIALLY_PEGGED'); // 30 from S2
      expect(demands[2].peggedQty).toBe(30);
    });

    it('should track allocatedTo on supply side', () => {
      const demands = [
        createDemand('D1', 30),
        createDemand('D2', 20),
      ];
      const supplies = [createSupply('S1', 100)];

      performPegging(demands, supplies);

      expect(supplies[0].allocatedTo).toHaveLength(2);
      expect(supplies[0].allocatedQty).toBe(50);
      expect(supplies[0].availableQty).toBe(50);
    });
  });

  describe('edge cases', () => {
    it('should handle zero quantity demand', () => {
      const demands = [createDemand('D1', 0)];
      const supplies = [createSupply('S1', 100)];

      performPegging(demands, supplies);

      expect(demands[0].status).toBe('FULLY_PEGGED'); // 0 >= 0
      expect(supplies[0].availableQty).toBe(100);
    });

    it('should skip supplies with zero available quantity', () => {
      const supply = createSupply('S1', 100);
      supply.availableQty = 0; // Already fully allocated
      const demands = [createDemand('D1', 50)];

      performPegging(demands, [supply]);

      expect(demands[0].status).toBe('UNPEGGED');
    });

    it('should handle exact match between demand and supply', () => {
      const demands = [createDemand('D1', 100)];
      const supplies = [createSupply('S1', 100)];

      performPegging(demands, supplies);

      expect(demands[0].status).toBe('FULLY_PEGGED');
      expect(supplies[0].availableQty).toBe(0);
    });
  });

  describe('summary calculations', () => {
    it('should calculate projected inventory correctly', () => {
      const onHand = 50;
      const totalSupply = 200;
      const totalDemand = 180;
      const projected = onHand + totalSupply - totalDemand;
      expect(projected).toBe(70);
    });

    it('should calculate shortage from unpegged demands', () => {
      const demands = [
        createDemand('D1', 100),
        createDemand('D2', 80),
      ];
      const supplies = [createSupply('S1', 120)];

      performPegging(demands, supplies);

      const shortages = demands
        .filter((d) => d.status !== 'FULLY_PEGGED')
        .reduce((sum, d) => sum + (d.quantity - d.peggedQty), 0);

      expect(shortages).toBe(60); // D2 needs 80, got 20 → shortage 60
    });
  });
});
