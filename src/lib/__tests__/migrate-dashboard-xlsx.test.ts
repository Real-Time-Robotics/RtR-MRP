/**
 * Sprint 27 TIP-S27-04 — Dashboard Migration Tests
 */

import { describe, it, expect } from 'vitest';
import { mapSerialStatus, mapSerialSource, mapBomSourceType, generateCategoryMapping } from '../../../scripts/migrate-dashboard-xlsx';

describe('Dashboard Migration Helpers', () => {
  describe('mapSerialStatus', () => {
    it('should map TỒN to IN_STOCK', () => {
      expect(mapSerialStatus('TỒN')).toBe('IN_STOCK');
    });

    it('should map ĐÃ XUẤT to SHIPPED', () => {
      expect(mapSerialStatus('ĐÃ XUẤT')).toBe('SHIPPED');
    });

    it('should map LỖI to SCRAPPED', () => {
      expect(mapSerialStatus('LỖI')).toBe('SCRAPPED');
    });

    it('should default unknown to IN_STOCK', () => {
      expect(mapSerialStatus('something')).toBe('IN_STOCK');
    });
  });

  describe('mapSerialSource', () => {
    it('should map GIA CÔNG to MANUFACTURED', () => {
      expect(mapSerialSource('GIA CÔNG')).toBe('MANUFACTURED');
    });

    it('should map NHẬP to RECEIVED', () => {
      expect(mapSerialSource('NHẬP')).toBe('RECEIVED');
    });

    it('should default unknown to IMPORTED', () => {
      expect(mapSerialSource('other')).toBe('IMPORTED');
    });
  });

  describe('mapBomSourceType', () => {
    it('should map INTERNAL to INTERNAL', () => {
      expect(mapBomSourceType('INTERNAL')).toBe('INTERNAL');
    });

    it('should map EXTERNAL to EXTERNAL', () => {
      expect(mapBomSourceType('EXTERNAL')).toBe('EXTERNAL');
    });

    it('should map MUA to EXTERNAL', () => {
      expect(mapBomSourceType('MUA')).toBe('EXTERNAL');
    });
  });

  describe('generateCategoryMapping', () => {
    it('should cluster resistor categories correctly', () => {
      const mapping = generateCategoryMapping(['Resistor', 'RES', 'Trimmer Potentiometers ( RES )']);
      expect(mapping.mapping['Resistor']).toBe('RESISTOR');
      expect(mapping.mapping['RES']).toBe('RESISTOR');
      expect(mapping.mapping['Trimmer Potentiometers ( RES )']).toBe('RESISTOR');
    });

    it('should cluster connector categories', () => {
      const mapping = generateCategoryMapping(['CONN FPC', 'CONN USB2.0', 'Connectors Female']);
      expect(mapping.mapping['CONN FPC']).toBe('CONNECTOR');
      expect(mapping.mapping['CONN USB2.0']).toBe('CONNECTOR');
      expect(mapping.mapping['Connectors Female']).toBe('CONNECTOR');
    });

    it('should have no unresolved entries', () => {
      const cats = ['CAP', 'RES', 'LED', 'IC MCU', 'MOSFET', 'Unknown Category'];
      const mapping = generateCategoryMapping(cats);
      expect(mapping.unresolved).toHaveLength(0);
    });

    it('should create parent-child cluster hierarchy', () => {
      const mapping = generateCategoryMapping(['CAP', 'RES']);
      expect(mapping.clusters.some(c => c.parent === 'PASSIVE')).toBe(true);
    });
  });
});
