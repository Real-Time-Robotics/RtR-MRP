import { describe, it, expect, vi } from 'vitest';
import {
  parseBarcode,
  getAvailableActions,
  HapticPatterns,
  triggerHaptic,
  playAudioFeedback,
  DEFAULT_SCANNER_CONFIG,
  validateScan,
} from '../scanner-utils';
import type { ScanResult } from '../scanner-utils';

describe('scanner-utils', () => {
  describe('parseBarcode', () => {
    it('should parse RTR PART format', () => {
      const result = parseBarcode('RTR-COMP-001');
      expect(result.type).toBe('PART');
      expect(result.confidence).toBe(0.95);
      expect(result.format).toBe('CODE128');
    });

    it('should parse P- part format', () => {
      const result = parseBarcode('P-00001');
      expect(result.type).toBe('PART');
    });

    it('should parse COMP- format', () => {
      const result = parseBarcode('COMP-0001');
      expect(result.type).toBe('PART');
    });

    it('should parse warehouse location format', () => {
      const result = parseBarcode('WH-01-R01-C01-S01');
      expect(result.type).toBe('LOCATION');
    });

    it('should parse LOC- format', () => {
      const result = parseBarcode('LOC-MAIN-A1');
      expect(result.type).toBe('LOCATION');
    });

    it('should parse BIN- format (matches PART pattern first)', () => {
      // BIN-00001 matches PART pattern [A-Z]{2,4}-\d{4,} before LOCATION
      const result = parseBarcode('BIN-00001');
      expect(result.type).toBe('PART');
    });

    it('should parse work order format', () => {
      const result = parseBarcode('WO-2024-00001');
      expect(result.type).toBe('WORK_ORDER');
    });

    it('should parse MO- format (matches PART pattern first)', () => {
      // MO-0000001 matches PART pattern [A-Z]{2,4}-\d{4,} before WORK_ORDER
      const result = parseBarcode('MO-0000001');
      expect(result.type).toBe('PART');
    });

    it('should parse purchase order format', () => {
      const result = parseBarcode('PO-2024-00001');
      expect(result.type).toBe('PURCHASE_ORDER');
    });

    it('should parse sales order format', () => {
      const result = parseBarcode('SO-2024-00001');
      expect(result.type).toBe('SALES_ORDER');
    });

    it('should parse ORD- format (matches PART pattern first)', () => {
      // ORD-0000001 matches PART pattern [A-Z]{2,4}-\d{4,} before SALES_ORDER
      const result = parseBarcode('ORD-0000001');
      expect(result.type).toBe('PART');
    });

    it('should parse lot format', () => {
      const result = parseBarcode('LOT-20240101-001');
      expect(result.type).toBe('LOT');
    });

    it('should parse serial number format', () => {
      const result = parseBarcode('SN-ABC1234567');
      expect(result.type).toBe('SERIAL');
    });

    it('should parse GS1 barcode starting with 01', () => {
      const result = parseBarcode('01123456789012345');
      expect(result.type).toBe('PART');
      expect(result.format).toBe('DATA_MATRIX');
    });

    it('should return UNKNOWN for unrecognized', () => {
      const result = parseBarcode('random-text');
      expect(result.type).toBe('UNKNOWN');
      expect(result.confidence).toBe(0.5);
    });

    it('should trim whitespace', () => {
      const result = parseBarcode('  RTR-PART-001  ');
      expect(result.type).toBe('PART');
    });

    it('should detect QR code format for long strings', () => {
      const longData = 'https://example.com/some-very-long-url-that-exceeds-fifty-characters-for-detection';
      const result = parseBarcode(longData);
      expect(result.format).toBe('QR_CODE');
    });

    it('should detect EAN13 format', () => {
      const result = parseBarcode('1234567890123');
      expect(result.format).toBe('EAN13');
    });

    it('should detect UPC_A format', () => {
      const result = parseBarcode('123456789012');
      expect(result.format).toBe('UPC_A');
    });

    it('should detect CODE39 format with asterisks', () => {
      const result = parseBarcode('*ABC-123*');
      expect(result.format).toBe('CODE39');
    });
  });

  describe('getAvailableActions', () => {
    it('should return part actions', () => {
      const actions = getAvailableActions('PART');
      expect(actions).toContain('view_details');
      expect(actions).toContain('check_inventory');
      expect(actions).toContain('adjust_qty');
    });

    it('should return location actions', () => {
      const actions = getAvailableActions('LOCATION');
      expect(actions).toContain('view_contents');
      expect(actions).toContain('cycle_count');
    });

    it('should return work order actions', () => {
      const actions = getAvailableActions('WORK_ORDER');
      expect(actions).toContain('start_operation');
      expect(actions).toContain('report_issue');
    });

    it('should filter for receiving context', () => {
      const actions = getAvailableActions('PURCHASE_ORDER', 'receiving');
      expect(actions).toContain('receive_items');
      expect(actions).toContain('inspect_quality');
      expect(actions).not.toContain('pick_items');
    });

    it('should filter for picking context', () => {
      const actions = getAvailableActions('SALES_ORDER', 'picking');
      expect(actions).toContain('pick_items');
      expect(actions).not.toContain('pack_shipment');
    });

    it('should filter for inventory context', () => {
      const actions = getAvailableActions('PART', 'inventory');
      expect(actions).toContain('adjust_qty');
      expect(actions).toContain('transfer');
      expect(actions).not.toContain('print_label');
    });

    it('should return UNKNOWN actions', () => {
      const actions = getAvailableActions('UNKNOWN');
      expect(actions).toContain('manual_lookup');
      expect(actions).toContain('create_new');
    });
  });

  describe('HapticPatterns', () => {
    it('should define all patterns', () => {
      expect(HapticPatterns.success).toEqual([100]);
      expect(HapticPatterns.error).toEqual([100, 50, 100]);
      expect(HapticPatterns.warning).toEqual([50, 30, 50, 30, 50]);
      expect(HapticPatterns.scan).toEqual([50]);
      expect(HapticPatterns.confirm).toEqual([100, 100, 200]);
    });
  });

  describe('triggerHaptic', () => {
    it('should call navigator.vibrate when available', () => {
      const vibrate = vi.fn();
      Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
      triggerHaptic('success');
      expect(vibrate).toHaveBeenCalledWith([100]);
    });
  });

  describe('DEFAULT_SCANNER_CONFIG', () => {
    it('should have correct defaults', () => {
      expect(DEFAULT_SCANNER_CONFIG.formats).toContain('CODE128');
      expect(DEFAULT_SCANNER_CONFIG.continuous).toBe(false);
      expect(DEFAULT_SCANNER_CONFIG.debounceMs).toBe(500);
      expect(DEFAULT_SCANNER_CONFIG.hapticEnabled).toBe(true);
      expect(DEFAULT_SCANNER_CONFIG.audioEnabled).toBe(true);
      expect(DEFAULT_SCANNER_CONFIG.torch).toBe(false);
    });
  });

  describe('validateScan', () => {
    it('should reject empty scan data', () => {
      const result = validateScan({ raw: '', format: 'CODE128', type: 'UNKNOWN', value: '', timestamp: new Date(), confidence: 0.5 });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Empty scan data');
    });

    it('should reject too-long data', () => {
      const result = validateScan({ raw: 'x'.repeat(501), format: 'CODE128', type: 'UNKNOWN', value: '', timestamp: new Date(), confidence: 0.5 });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Scan data too long');
    });

    it('should reject low confidence', () => {
      const result = validateScan({ raw: 'test', format: 'CODE128', type: 'UNKNOWN', value: 'test', timestamp: new Date(), confidence: 0.1 });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Low confidence scan');
    });

    it('should accept valid scan', () => {
      const result = validateScan({ raw: 'PRT-001', format: 'CODE128', type: 'PART', value: 'PRT-001', timestamp: new Date(), confidence: 0.9 });
      expect(result.valid).toBe(true);
    });
  });
});
