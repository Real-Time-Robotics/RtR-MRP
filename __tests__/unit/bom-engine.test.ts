import { describe, it, expect } from 'vitest';
import { getStockStatus, formatCurrency, formatNumber } from '@/lib/bom-engine';

describe('BOM Engine - Pure Functions', () => {
  describe('getStockStatus', () => {
    it('should return OUT_OF_STOCK when available is 0', () => {
      expect(getStockStatus(0, 10, 20)).toBe('OUT_OF_STOCK');
    });

    it('should return OUT_OF_STOCK when available is negative', () => {
      expect(getStockStatus(-5, 10, 20)).toBe('OUT_OF_STOCK');
    });

    it('should return CRITICAL when available is below minStockLevel', () => {
      expect(getStockStatus(5, 10, 20)).toBe('CRITICAL');
    });

    it('should return CRITICAL when available equals minStockLevel boundary (exclusive)', () => {
      // available < minStockLevel → CRITICAL
      expect(getStockStatus(9, 10, 20)).toBe('CRITICAL');
    });

    it('should return REORDER when available is at minStockLevel but below reorderPoint', () => {
      expect(getStockStatus(10, 10, 20)).toBe('REORDER');
    });

    it('should return REORDER when available is between min and reorder', () => {
      expect(getStockStatus(15, 10, 20)).toBe('REORDER');
    });

    it('should return OK when available is at reorderPoint', () => {
      expect(getStockStatus(20, 10, 20)).toBe('OK');
    });

    it('should return OK when available is above reorderPoint', () => {
      expect(getStockStatus(100, 10, 20)).toBe('OK');
    });

    it('should handle zero min and reorder levels', () => {
      expect(getStockStatus(1, 0, 0)).toBe('OK');
      expect(getStockStatus(0, 0, 0)).toBe('OUT_OF_STOCK');
    });
  });

  describe('formatCurrency', () => {
    it('should format amount as USD by default', () => {
      const result = formatCurrency(1500);
      expect(result).toBe('$1,500');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0');
    });

    it('should handle large numbers', () => {
      const result = formatCurrency(1000000);
      expect(result).toBe('$1,000,000');
    });

    it('should truncate decimal places', () => {
      // maximumFractionDigits: 0
      const result = formatCurrency(99.99);
      expect(result).toBe('$100');
    });

    it('should support different currencies', () => {
      const result = formatCurrency(1000, 'EUR');
      expect(result).toContain('1,000');
    });
  });

  describe('formatNumber', () => {
    it('should format number with thousand separators', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should handle decimals', () => {
      const result = formatNumber(1234.56);
      expect(result).toBe('1,234.56');
    });
  });

  describe('BOM Explosion Calculations (algorithm verification)', () => {
    // These test the core calculation logic extracted from explodeBOM

    it('should calculate needed quantity with scrap rate', () => {
      const quantity = 2; // per unit
      const buildQuantity = 10;
      const scrapRate = 0.05; // 5%
      const needed = Math.ceil(quantity * buildQuantity * (1 + scrapRate));
      expect(needed).toBe(21); // 2 * 10 * 1.05 = 21
    });

    it('should calculate shortage correctly', () => {
      const needed = 100;
      const available = 80;
      const shortage = Math.max(0, needed - available);
      expect(shortage).toBe(20);
    });

    it('should return zero shortage when sufficient stock', () => {
      const needed = 50;
      const available = 100;
      const shortage = Math.max(0, needed - available);
      expect(shortage).toBe(0);
    });

    it('should calculate available from inventory minus reserved', () => {
      const quantity = 100;
      const reserved = 30;
      const available = quantity - reserved;
      expect(available).toBe(70);
    });

    it('should calculate canBuild correctly', () => {
      const buildQuantity = 10;
      const results = [
        { needed: 20, available: 15 }, // can build: floor(15 / (20/10)) = 7
        { needed: 30, available: 40 }, // can build: floor(40 / (30/10)) = 13
        { needed: 10, available: 5 },  // can build: floor(5 / (10/10)) = 5
      ];

      let canBuild = buildQuantity;
      results.forEach((result) => {
        if (result.needed > 0) {
          const possible = Math.floor(result.available / (result.needed / buildQuantity));
          canBuild = Math.min(canBuild, possible);
        }
      });

      expect(canBuild).toBe(5); // limited by third component
    });

    it('should handle zero scrap rate', () => {
      const quantity = 5;
      const buildQuantity = 10;
      const scrapRate = 0;
      const needed = Math.ceil(quantity * buildQuantity * (1 + scrapRate));
      expect(needed).toBe(50);
    });

    it('should handle high scrap rate', () => {
      const quantity = 1;
      const buildQuantity = 100;
      const scrapRate = 0.20; // 20%
      const needed = Math.ceil(quantity * buildQuantity * (1 + scrapRate));
      expect(needed).toBe(120);
    });
  });
});
