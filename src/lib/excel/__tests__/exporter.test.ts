import { describe, it, expect, vi } from 'vitest';
import {
  createExcelWorkbook,
  exportToExcelBuffer,
  exportToCSVBuffer,
  exportToBase64,
  generateImportTemplate,
  createMultiSheetWorkbook,
  defaultColumnDefinitions,
  type ExportColumn,
} from '../exporter';

describe('Excel Exporter', () => {
  const testColumns: ExportColumn[] = [
    { key: 'name', header: 'Name', width: 20 },
    { key: 'value', header: 'Value', width: 15, format: 'number' },
    { key: 'active', header: 'Active', width: 10, format: 'boolean' },
    { key: 'price', header: 'Price', width: 12, format: 'currency' },
    { key: 'date', header: 'Date', width: 12, format: 'date' },
  ];

  const testData = [
    { name: 'Item 1', value: 100, active: true, price: 9.99, date: '2024-01-15' },
    { name: 'Item 2', value: 200, active: false, price: 19.99, date: '2024-02-20' },
    { name: 'Item 3', value: null, active: null, price: null, date: null },
  ];

  describe('defaultColumnDefinitions', () => {
    it('should define columns for parts', () => {
      expect(defaultColumnDefinitions.parts).toBeDefined();
      expect(defaultColumnDefinitions.parts.length).toBeGreaterThan(0);
      expect(defaultColumnDefinitions.parts[0].key).toBe('partNumber');
    });

    it('should define columns for suppliers', () => {
      expect(defaultColumnDefinitions.suppliers).toBeDefined();
      expect(defaultColumnDefinitions.suppliers[0].key).toBe('code');
    });

    it('should define columns for inventory', () => {
      expect(defaultColumnDefinitions.inventory).toBeDefined();
    });

    it('should define columns for products', () => {
      expect(defaultColumnDefinitions.products).toBeDefined();
    });

    it('should define columns for customers', () => {
      expect(defaultColumnDefinitions.customers).toBeDefined();
    });

    it('should define columns for salesOrders', () => {
      expect(defaultColumnDefinitions.salesOrders).toBeDefined();
    });

    it('should define columns for purchaseOrders', () => {
      expect(defaultColumnDefinitions.purchaseOrders).toBeDefined();
    });

    it('should define columns for workOrders', () => {
      expect(defaultColumnDefinitions.workOrders).toBeDefined();
    });
  });

  describe('createExcelWorkbook', () => {
    it('should create a workbook with data', () => {
      const wb = createExcelWorkbook(testData, testColumns);
      expect(wb).toBeDefined();
      expect(wb.SheetNames).toContain('Data');
    });

    it('should use custom sheet name', () => {
      const wb = createExcelWorkbook(testData, testColumns, { sheetName: 'Custom' });
      expect(wb.SheetNames).toContain('Custom');
    });

    it('should handle empty data', () => {
      const wb = createExcelWorkbook([], testColumns);
      expect(wb).toBeDefined();
    });

    it('should handle nested keys', () => {
      const columns: ExportColumn[] = [
        { key: 'part.name', header: 'Part Name' },
      ];
      const data = [{ part: { name: 'Widget' } }];
      const wb = createExcelWorkbook(data as any, columns);
      expect(wb).toBeDefined();
    });

    it('should apply column transform', () => {
      const columns: ExportColumn[] = [
        { key: 'name', header: 'Name', transform: (v) => String(v).toUpperCase() },
      ];
      const wb = createExcelWorkbook([{ name: 'test' }], columns);
      expect(wb).toBeDefined();
    });

    it('should handle fixed column widths', () => {
      const wb = createExcelWorkbook(testData, testColumns, { columnWidths: 'fixed' });
      expect(wb).toBeDefined();
    });

    it('should handle array column widths', () => {
      const wb = createExcelWorkbook(testData, testColumns, { columnWidths: [10, 15, 8, 12, 12] });
      expect(wb).toBeDefined();
    });

    it('should handle no headers option', () => {
      const wb = createExcelWorkbook(testData, testColumns, { includeHeaders: false });
      expect(wb).toBeDefined();
    });
  });

  describe('exportToExcelBuffer', () => {
    it('should return success with buffer', () => {
      const result = exportToExcelBuffer(testData, testColumns);
      expect(result.success).toBe(true);
      expect(result.buffer).toBeDefined();
      expect(result.rowCount).toBe(3);
    });

    it('should handle empty data', () => {
      const result = exportToExcelBuffer([], testColumns);
      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(0);
    });
  });

  describe('exportToCSVBuffer', () => {
    it('should return success with buffer', () => {
      const result = exportToCSVBuffer(testData, testColumns);
      expect(result.success).toBe(true);
      expect(result.buffer).toBeDefined();
    });
  });

  describe('exportToBase64', () => {
    it('should export xlsx format', () => {
      const result = exportToBase64(testData, testColumns, 'xlsx');
      expect(result.success).toBe(true);
    });

    it('should export csv format', () => {
      const result = exportToBase64(testData, testColumns, 'csv');
      expect(result.success).toBe(true);
    });
  });

  describe('generateImportTemplate', () => {
    it('should generate template for parts', () => {
      const result = generateImportTemplate('parts');
      expect(result.success).toBe(true);
    });

    it('should generate template for suppliers', () => {
      const result = generateImportTemplate('suppliers');
      expect(result.success).toBe(true);
    });

    it('should generate template for products', () => {
      const result = generateImportTemplate('products');
      expect(result.success).toBe(true);
    });

    it('should generate template for customers', () => {
      const result = generateImportTemplate('customers');
      expect(result.success).toBe(true);
    });

    it('should return error for unknown entity type', () => {
      const result = generateImportTemplate('unknown');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown entity type');
    });

    it('should handle no sample data option', () => {
      const result = generateImportTemplate('parts', false);
      expect(result.success).toBe(true);
    });
  });

  describe('createMultiSheetWorkbook', () => {
    it('should create workbook with multiple sheets', () => {
      const result = createMultiSheetWorkbook([
        { name: 'Sheet1', data: [{ name: 'A' }], columns: [{ key: 'name', header: 'Name' }] },
        { name: 'Sheet2', data: [{ val: 1 }], columns: [{ key: 'val', header: 'Value' }] },
      ]);
      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(2);
    });

    it('should handle empty sheets', () => {
      const result = createMultiSheetWorkbook([
        { name: 'Empty', data: [], columns: [{ key: 'id', header: 'ID' }] },
      ]);
      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(0);
    });
  });
});
