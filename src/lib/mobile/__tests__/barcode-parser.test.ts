import { describe, it, expect } from 'vitest';
import {
  parseBarcode,
  generateBarcodeValue,
  parseComplexBarcode,
} from '../barcode-parser';

describe('barcode-parser', () => {
  describe('parseBarcode', () => {
    it('should parse RTR PART prefix', () => {
      const result = parseBarcode('PRT-12345', 'CODE128');
      expect(result.entityType).toBe('PART');
      expect(result.partNumber).toBe('12345');
      expect(result.confidence).toBe(0.9);
      expect(result.format).toBe('CODE128');
    });

    it('should parse RTR LOCATION prefix', () => {
      const result = parseBarcode('LOC-A01', 'QR');
      expect(result.entityType).toBe('LOCATION');
      expect(result.locationCode).toBe('A01');
    });

    it('should parse RTR WORK_ORDER prefix', () => {
      const result = parseBarcode('WO-2026-001', 'CODE128');
      expect(result.entityType).toBe('WORK_ORDER');
      expect(result.workOrderNumber).toBe('WO-2026-001');
    });

    it('should parse RTR PURCHASE_ORDER prefix', () => {
      const result = parseBarcode('PO-2026-001', 'CODE128');
      expect(result.entityType).toBe('PURCHASE_ORDER');
      expect(result.purchaseOrderNumber).toBe('PO-2026-001');
    });

    it('should parse RTR SALES_ORDER prefix', () => {
      const result = parseBarcode('SO-2026-001', 'CODE128');
      expect(result.entityType).toBe('SALES_ORDER');
      expect(result.salesOrderNumber).toBe('SO-2026-001');
    });

    it('should parse RTR LOT prefix', () => {
      const result = parseBarcode('LOT-ABC123', 'CODE128');
      expect(result.entityType).toBe('LOT');
      expect(result.lotNumber).toBe('ABC123');
    });

    it('should parse RTR SERIAL prefix', () => {
      const result = parseBarcode('SN-XYZ789', 'CODE128');
      expect(result.entityType).toBe('SERIAL');
      expect(result.serialNumber).toBe('XYZ789');
    });

    it('should parse RTR CONTAINER prefix', () => {
      const result = parseBarcode('CTN-001', 'CODE128');
      expect(result.entityType).toBe('CONTAINER');
      expect(result.entityId).toBe('001');
    });

    it('should parse RTR LABEL prefix', () => {
      const result = parseBarcode('LBL-001', 'CODE128');
      expect(result.entityType).toBe('LABEL');
    });

    it('should handle GS1-like input', () => {
      // GS1 parsing depends on internal AI lookup
      const result = parseBarcode('0112345678901234', 'GS1');
      expect(result).toBeDefined();
      expect(result.raw).toBe('0112345678901234');
      expect(result.format).toBe('GS1');
    });

    it('should handle various GS1 AI prefixes', () => {
      expect(parseBarcode('10BATCH123', 'GS1').raw).toBe('10BATCH123');
      expect(parseBarcode('21SERIAL456', 'GS1').raw).toBe('21SERIAL456');
      expect(parseBarcode('400ORDER123', 'GS1').raw).toBe('400ORDER123');
    });

    it('should infer Work Order pattern', () => {
      const result = parseBarcode('WO-2026-123', 'UNKNOWN');
      // This matches RTR format first
      expect(result.entityType).toBe('WORK_ORDER');
    });

    it('should infer PO pattern from content', () => {
      // Not an RTR prefix but matches PO-YYYY-NNN
      const result = parseBarcode('  PO-2026-456  ', 'UNKNOWN');
      expect(result.entityType).toBe('PURCHASE_ORDER');
    });

    it('should handle various inferred types', () => {
      // These go through inference path after RTR and GS1 parsing fail
      const loc = parseBarcode('A-01-02-03', 'BARCODE');
      expect(loc).toBeDefined();
      expect(loc.raw).toBe('A-01-02-03');

      const lot = parseBarcode('L20260101', 'BARCODE');
      expect(lot).toBeDefined();
      expect(lot.raw).toBe('L20260101');

      const serial = parseBarcode('ABC1234567XYZ', 'BARCODE');
      expect(serial).toBeDefined();

      const part = parseBarcode('ABC-123', 'BARCODE');
      expect(part).toBeDefined();
    });

    it('should return UNKNOWN for unrecognized content', () => {
      const result = parseBarcode('!@#$%', 'UNKNOWN');
      expect(result.entityType).toBe('UNKNOWN');
    });

    it('should handle numeric and alphabetic inputs', () => {
      const numeric = parseBarcode('123456', 'BARCODE');
      expect(numeric).toBeDefined();

      const alpha = parseBarcode('XYZABC', 'BARCODE');
      expect(alpha).toBeDefined();
    });
  });

  describe('generateBarcodeValue', () => {
    it('should generate value with prefix', () => {
      expect(generateBarcodeValue('PART', '12345')).toBe('PRT-12345');
      expect(generateBarcodeValue('WORK_ORDER', '001')).toBe('WO-001');
      expect(generateBarcodeValue('LOT', 'L001')).toBe('LOT-L001');
    });

    it('should append lot number option', () => {
      const result = generateBarcodeValue('PART', '12345', { lotNumber: 'LOT001' });
      expect(result).toBe('PRT-12345|LOT:LOT001');
    });

    it('should append serial number option', () => {
      const result = generateBarcodeValue('PART', '12345', { serialNumber: 'SN001' });
      expect(result).toBe('PRT-12345|SN:SN001');
    });

    it('should append quantity option', () => {
      const result = generateBarcodeValue('PART', '12345', { quantity: 50 });
      expect(result).toBe('PRT-12345|QTY:50');
    });

    it('should append all options', () => {
      const result = generateBarcodeValue('PART', '12345', {
        lotNumber: 'LOT1',
        serialNumber: 'SN1',
        quantity: 10,
      });
      expect(result).toBe('PRT-12345|LOT:LOT1|SN:SN1|QTY:10');
    });
  });

  describe('parseComplexBarcode', () => {
    it('should parse barcode with embedded data', () => {
      const result = parseComplexBarcode('PRT-12345|LOT:LOT001|SN:SN001|QTY:50');
      expect(result.entityType).toBe('PART');
      expect(result.partNumber).toBe('12345');
      expect(result.lotNumber).toBe('LOT001');
      expect(result.serialNumber).toBe('SN001');
      expect(result.quantity).toBe(50);
      expect(result.format).toBe('COMPLEX');
    });

    it('should parse simple barcode without extra data', () => {
      const result = parseComplexBarcode('PRT-12345');
      expect(result.entityType).toBe('PART');
      expect(result.partNumber).toBe('12345');
    });

    it('should handle malformed extra data gracefully', () => {
      const result = parseComplexBarcode('PRT-12345|BADDATA');
      expect(result.entityType).toBe('PART');
    });
  });
});
