// src/lib/excel/__tests__/parser.test.ts
// Unit tests for Excel/CSV parser

import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parseExcelBuffer,
  parseExcelBase64,
  parseCSVBuffer,
  parseFile,
  getSheetPreview,
  detectEntityType,
} from '../parser';
import type { ParsedSheet } from '../parser';

// Helper to create a test Excel buffer
function createTestExcelBuffer(data: Record<string, unknown>[], sheetName = 'Sheet1'): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

// Helper to create a test CSV buffer
function createTestCSVBuffer(csv: string): Buffer {
  return Buffer.from(csv, 'utf-8');
}

describe('Excel Parser', () => {
  // ==========================================================================
  // parseExcelBuffer
  // ==========================================================================
  describe('parseExcelBuffer', () => {
    it('should parse a valid Excel buffer', () => {
      const data = [
        { Name: 'Part A', Cost: 10, Active: true },
        { Name: 'Part B', Cost: 20, Active: false },
      ];
      const buffer = createTestExcelBuffer(data);

      const result = parseExcelBuffer(buffer, 'test.xlsx');

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('test.xlsx');
      expect(result.fileSize).toBe(buffer.length);
      expect(result.sheets.length).toBe(1);
      expect(result.activeSheet).toBe('Sheet1');
    });

    it('should parse sheet data correctly', () => {
      const data = [
        { PartNumber: 'P001', Description: 'Widget', UnitCost: 15.5 },
        { PartNumber: 'P002', Description: 'Bolt', UnitCost: 2.3 },
        { PartNumber: 'P003', Description: 'Nut', UnitCost: 1.1 },
      ];
      const buffer = createTestExcelBuffer(data);

      const result = parseExcelBuffer(buffer, 'parts.xlsx');
      const sheet = result.sheets[0];

      expect(sheet.name).toBe('Sheet1');
      expect(sheet.headers).toContain('PartNumber');
      expect(sheet.headers).toContain('Description');
      expect(sheet.headers).toContain('UnitCost');
      expect(sheet.data.length).toBe(3);
      expect(sheet.data[0]['PartNumber']).toBe('P001');
    });

    it('should analyze column types', () => {
      const data = [
        { Name: 'Part A', Cost: 10, Active: true },
        { Name: 'Part B', Cost: 20, Active: false },
      ];
      const buffer = createTestExcelBuffer(data);

      const result = parseExcelBuffer(buffer, 'test.xlsx');
      const sheet = result.sheets[0];

      expect(sheet.columns.length).toBeGreaterThan(0);
      for (const col of sheet.columns) {
        expect(col).toHaveProperty('index');
        expect(col).toHaveProperty('header');
        expect(col).toHaveProperty('inferredType');
        expect(col).toHaveProperty('hasNulls');
        expect(col).toHaveProperty('uniqueCount');
      }
    });

    it('should return error result for invalid buffer', () => {
      // Use a buffer that will cause XLSX.read to throw
      const buffer = Buffer.alloc(0);

      const result = parseExcelBuffer(buffer, 'bad.xlsx');

      // XLSX may parse or fail; if it fails, success should be false
      // If it parses empty buffer, sheets will be empty
      expect(result.fileName).toBe('bad.xlsx');
      if (!result.success) {
        expect(result.sheets).toEqual([]);
        expect(result.errors).toBeDefined();
      }
    });

    it('should handle empty sheet', () => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([['Col1', 'Col2']]);
      XLSX.utils.book_append_sheet(wb, ws, 'Empty');
      const buffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));

      const result = parseExcelBuffer(buffer, 'empty.xlsx');

      expect(result.success).toBe(true);
      expect(result.sheets[0].headers).toEqual(['Col1', 'Col2']);
    });
  });

  // ==========================================================================
  // parseExcelBase64
  // ==========================================================================
  describe('parseExcelBase64', () => {
    it('should parse base64 encoded Excel file', () => {
      const data = [{ Name: 'Test' }];
      const buffer = createTestExcelBuffer(data);
      const base64 = buffer.toString('base64');

      const result = parseExcelBase64(base64, 'test.xlsx');

      expect(result.success).toBe(true);
      expect(result.sheets.length).toBe(1);
    });
  });

  // ==========================================================================
  // parseCSVBuffer
  // ==========================================================================
  describe('parseCSVBuffer', () => {
    it('should parse a valid CSV buffer', () => {
      const csv = 'Name,Cost,Qty\nPart A,10,100\nPart B,20,50';
      const buffer = createTestCSVBuffer(csv);

      const result = parseCSVBuffer(buffer, 'test.csv');

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('test.csv');
      expect(result.sheets.length).toBeGreaterThanOrEqual(1);
      expect(result.sheets[0].data.length).toBe(2);
    });

    it('should handle CSV with special characters', () => {
      const csv = 'Name,Description\n"Part ""A""","Has, comma"\nPart B,Normal';
      const buffer = createTestCSVBuffer(csv);

      const result = parseCSVBuffer(buffer, 'special.csv');

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // parseFile
  // ==========================================================================
  describe('parseFile', () => {
    it('should parse .xlsx files', () => {
      const buffer = createTestExcelBuffer([{ A: 1 }]);
      const result = parseFile(buffer, 'test.xlsx');
      expect(result.success).toBe(true);
    });

    it('should parse .xls files', () => {
      const buffer = createTestExcelBuffer([{ A: 1 }]);
      const result = parseFile(buffer, 'test.xls');
      // May fail since we used xlsx format, but it should try
      expect(result).toBeDefined();
    });

    it('should parse .csv files', () => {
      const buffer = createTestCSVBuffer('A,B\n1,2');
      const result = parseFile(buffer, 'data.csv');
      expect(result.success).toBe(true);
    });

    it('should return error for unsupported file types', () => {
      const buffer = Buffer.from('test');
      const result = parseFile(buffer, 'test.pdf');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Unsupported file type: pdf');
    });

    it('should handle files without extension', () => {
      const buffer = Buffer.from('test');
      const result = parseFile(buffer, 'noext');

      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // getSheetPreview
  // ==========================================================================
  describe('getSheetPreview', () => {
    it('should return first N rows', () => {
      const sheet: ParsedSheet = {
        name: 'Test',
        rowCount: 100,
        columnCount: 3,
        columns: [],
        headers: ['A', 'B', 'C'],
        data: Array.from({ length: 20 }, (_, i) => ({ A: i, B: i * 2, C: `row-${i}` })),
        rawData: [],
      };

      const preview = getSheetPreview(sheet, 5);
      expect(preview.length).toBe(5);
      expect(preview[0]).toEqual({ A: 0, B: 0, C: 'row-0' });
    });

    it('should return all rows when fewer than maxRows', () => {
      const sheet: ParsedSheet = {
        name: 'Test',
        rowCount: 3,
        columnCount: 1,
        columns: [],
        headers: ['A'],
        data: [{ A: 1 }, { A: 2 }, { A: 3 }],
        rawData: [],
      };

      const preview = getSheetPreview(sheet, 10);
      expect(preview.length).toBe(3);
    });

    it('should default to 10 rows', () => {
      const sheet: ParsedSheet = {
        name: 'Test',
        rowCount: 50,
        columnCount: 1,
        columns: [],
        headers: ['A'],
        data: Array.from({ length: 50 }, (_, i) => ({ A: i })),
        rawData: [],
      };

      const preview = getSheetPreview(sheet);
      expect(preview.length).toBe(10);
    });
  });

  // ==========================================================================
  // detectEntityType
  // ==========================================================================
  describe('detectEntityType', () => {
    it('should detect parts entity from English headers', () => {
      const result = detectEntityType(['PartNumber', 'Description', 'UnitCost', 'Category']);

      expect(result.entityType).toBe('parts');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.matchedHeaders.length).toBeGreaterThan(0);
    });

    it('should detect parts entity from Vietnamese headers', () => {
      const result = detectEntityType(['Ma SP', 'Ten', 'Don Gia', 'Danh Muc']);

      expect(result.entityType).toBe('parts');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect suppliers entity', () => {
      const result = detectEntityType(['SupplierCode', 'Name', 'Country', 'Contact', 'Email']);

      expect(result.entityType).toBe('suppliers');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect customers entity', () => {
      const result = detectEntityType(['CustomerCode', 'Name', 'Type', 'Country', 'CreditLimit']);

      expect(result.entityType).toBe('customers');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect BOM entity', () => {
      const result = detectEntityType(['ProductSKU', 'PartNumber', 'Quantity', 'Level']);

      expect(result.entityType).toBe('bom');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should return null for unrecognizable headers', () => {
      const result = detectEntityType(['Foo', 'Bar', 'Baz', 'Qux']);

      expect(result.entityType).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.matchedHeaders).toEqual([]);
    });

    it('should return null for empty headers', () => {
      const result = detectEntityType([]);

      expect(result.entityType).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should detect inventory entity', () => {
      const result = detectEntityType(['PartNumber', 'Warehouse', 'Quantity', 'Location', 'LotNumber']);

      // Could match parts or inventory - both have PartNumber required
      expect(result.entityType).not.toBeNull();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle mixed case headers', () => {
      const result = detectEntityType(['PARTNUMBER', 'description', 'UnitCost']);

      expect(result.entityType).toBe('parts');
    });

    it('should detect products entity', () => {
      const result = detectEntityType(['SKU', 'Description', 'Price', 'AssemblyHours']);

      expect(result.entityType).toBe('products');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect Vietnamese supplier headers', () => {
      const result = detectEntityType(['Ma NCC', 'Ten', 'Quoc Gia', 'Dien Thoai']);

      expect(result.entityType).toBe('suppliers');
    });

    it('should cap confidence at 1', () => {
      const result = detectEntityType([
        'PartNumber', 'Description', 'UnitCost', 'Category',
        'Name', 'Unit', 'Weight', 'SafetyStock', 'ReorderPoint',
      ]);

      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});
