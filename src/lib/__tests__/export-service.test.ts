/**
 * Export Service Unit Tests
 * Tests for exportData() with xlsx, csv, pdf formats
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

// Mock the data service before importing
vi.mock('@/lib/data/data-service', () => ({
  dataService: {
    getSalesOrders: vi.fn(),
    getParts: vi.fn(),
    getInventory: vi.fn(),
    getSuppliers: vi.fn(),
    getCustomers: vi.fn(),
    getWorkOrders: vi.fn(),
    getQualityRecords: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    logError: vi.fn(),
  },
}));

import { exportData, type ExportOptions } from '../export/export-service';
import { dataService } from '@/lib/data/data-service';

// Sample mock data
const mockParts = [
  {
    id: 'p1',
    partNumber: 'PN-001',
    partName: 'Bolt M8',
    category: 'COMPONENT',
    unit: 'EA',
    unitCost: 2.5,
    leadTime: 7,
    supplierId: 's1',
    isActive: true,
  },
  {
    id: 'p2',
    partNumber: 'PN-002',
    partName: 'Nut M8',
    category: 'COMPONENT',
    unit: 'EA',
    unitCost: 0.5,
    leadTime: 5,
    supplierId: 's1',
    isActive: false,
  },
];

const mockSuppliers = [
  {
    id: 's1',
    code: 'SUP-001',
    name: 'FastBolt Co.',
    contactPerson: 'John',
    phone: '123-456',
    email: 'john@fastbolt.com',
    city: 'HCMC',
    leadTime: 7,
    rating: 4.5,
    paymentTerms: 'Net 30',
  },
];

const mockSalesOrders = [
  {
    orderNumber: 'SO-001',
    customer: { name: 'Acme Corp' },
    orderDate: '2024-01-15',
    requiredDate: '2024-02-15',
    status: 'CONFIRMED',
    priority: 'NORMAL',
    totalAmount: 15000,
    notes: 'Rush order',
  },
];

describe('Export Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default mocks
    (dataService.getParts as Mock).mockResolvedValue(mockParts);
    (dataService.getSuppliers as Mock).mockResolvedValue(mockSuppliers);
    (dataService.getSalesOrders as Mock).mockResolvedValue(mockSalesOrders);
    (dataService.getInventory as Mock).mockResolvedValue([]);
    (dataService.getCustomers as Mock).mockResolvedValue([]);
    (dataService.getWorkOrders as Mock).mockResolvedValue([]);
    (dataService.getQualityRecords as Mock).mockResolvedValue([]);
  });

  // ===========================================================================
  // CSV Format
  // ===========================================================================
  describe('exportData() with csv format', () => {
    it('should export parts as CSV with correct structure', async () => {
      const options: ExportOptions = { format: 'csv', entity: 'parts' };
      const result = await exportData(options);

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('text/csv;charset=utf-8');
      expect(result.filename).toContain('parts_');
      expect(result.filename).toMatch(/\.csv$/);
      expect(result.data).toBeDefined(); // base64 encoded
      expect(result.size).toBeGreaterThan(0);

      // Decode base64 and check CSV content
      const csvContent = Buffer.from(result.data, 'base64').toString('utf-8');
      // Should contain BOM for Excel UTF-8 support
      expect(csvContent.charAt(0)).toBe('\ufeff');
      // Should contain header row with Vietnamese labels
      expect(csvContent).toContain('Mã vật tư');
      expect(csvContent).toContain('Tên vật tư');
      // Should contain data rows
      expect(csvContent).toContain('PN-001');
      expect(csvContent).toContain('Bolt M8');
    });

    it('should export sales orders as CSV', async () => {
      const options: ExportOptions = { format: 'csv', entity: 'sales-orders' };
      const result = await exportData(options);

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('text/csv;charset=utf-8');

      const csvContent = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(csvContent).toContain('SO-001');
      expect(csvContent).toContain('Acme Corp');
    });
  });

  // ===========================================================================
  // XLSX Format
  // ===========================================================================
  describe('exportData() with xlsx format', () => {
    it('should export parts as XLSX (SpreadsheetML XML)', async () => {
      const options: ExportOptions = { format: 'xlsx', entity: 'parts' };
      const result = await exportData(options);

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('application/vnd.ms-excel');
      expect(result.filename).toContain('parts_');
      expect(result.filename).toMatch(/\.xls$/);
      expect(result.size).toBeGreaterThan(0);

      // Decode and check XML content
      const xmlContent = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(xmlContent).toContain('<?xml version="1.0"');
      expect(xmlContent).toContain('Workbook');
      expect(xmlContent).toContain('Worksheet');
      // Should contain data
      expect(xmlContent).toContain('PN-001');
      expect(xmlContent).toContain('Bolt M8');
    });

    it('should use custom title when provided', async () => {
      const options: ExportOptions = {
        format: 'xlsx',
        entity: 'suppliers',
        title: 'Supplier Report Q1',
      };
      const result = await exportData(options);

      const xmlContent = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(xmlContent).toContain('Supplier Report Q1');
    });
  });

  // ===========================================================================
  // PDF Format (HTML output)
  // ===========================================================================
  describe('exportData() with pdf format', () => {
    it('should export parts as HTML (for PDF rendering)', async () => {
      const options: ExportOptions = { format: 'pdf', entity: 'parts' };
      const result = await exportData(options);

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('text/html;charset=utf-8');
      expect(result.filename).toMatch(/\.html$/);

      const htmlContent = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<table');
      expect(htmlContent).toContain('PN-001');
    });
  });

  // ===========================================================================
  // Invalid entity
  // ===========================================================================
  describe('exportData() with invalid entity', () => {
    it('should throw error for unknown entity', async () => {
      const options = { format: 'csv', entity: 'nonexistent' } as unknown as ExportOptions;

      await expect(exportData(options)).rejects.toThrow('Unknown entity');
    });

    it('should throw error for unknown format', async () => {
      const options = { format: 'unknown', entity: 'parts' } as unknown as ExportOptions;

      await expect(exportData(options)).rejects.toThrow('Unknown format');
    });
  });

  // ===========================================================================
  // Empty data
  // ===========================================================================
  describe('empty data handling', () => {
    it('should handle empty parts list gracefully', async () => {
      (dataService.getParts as Mock).mockResolvedValue([]);

      const options: ExportOptions = { format: 'csv', entity: 'parts' };
      const result = await exportData(options);

      expect(result.success).toBe(true);
      // Should still have headers
      const csvContent = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(csvContent).toContain('Mã vật tư');
      // But minimal data rows
    });

    it('should handle empty inventory gracefully', async () => {
      (dataService.getInventory as Mock).mockResolvedValue([]);

      const options: ExportOptions = { format: 'xlsx', entity: 'inventory' };
      const result = await exportData(options);

      expect(result.success).toBe(true);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should handle empty suppliers gracefully in csv', async () => {
      (dataService.getSuppliers as Mock).mockResolvedValue([]);

      const options: ExportOptions = { format: 'csv', entity: 'suppliers' };
      const result = await exportData(options);

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // Filename generation
  // ===========================================================================
  describe('filename generation', () => {
    it('should include entity name and date in filename', async () => {
      const options: ExportOptions = { format: 'csv', entity: 'parts' };
      const result = await exportData(options);

      expect(result.filename).toMatch(/^parts_\d{8}\.csv$/);
    });

    it('should use correct extension per format', async () => {
      const csvResult = await exportData({ format: 'csv', entity: 'parts' });
      expect(csvResult.filename).toMatch(/\.csv$/);

      const xlsxResult = await exportData({ format: 'xlsx', entity: 'parts' });
      expect(xlsxResult.filename).toMatch(/\.xls$/);

      const pdfResult = await exportData({ format: 'pdf', entity: 'parts' });
      expect(pdfResult.filename).toMatch(/\.html$/);
    });
  });

  // ===========================================================================
  // All entity types
  // ===========================================================================
  describe('all entity types', () => {
    it('should export work-orders entity', async () => {
      (dataService.getWorkOrders as Mock).mockResolvedValue([
        {
          id: 'wo1',
          orderNumber: 'WO-001',
          productPartId: 'p1',
          quantity: 100,
          completedQty: 50,
          progress: 50,
          plannedStart: '2024-01-01',
          plannedEnd: '2024-01-15',
          status: 'IN_PROGRESS',
          workstation: 'WS-01',
        },
      ]);

      const options: ExportOptions = { format: 'csv', entity: 'work-orders' };
      const result = await exportData(options);

      expect(result.success).toBe(true);
      const csvContent = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(csvContent).toContain('WO-001');
    });

    it('should export customers entity', async () => {
      (dataService.getCustomers as Mock).mockResolvedValue([
        {
          id: 'c1',
          code: 'CUS-001',
          name: 'Big Corp',
          contactPerson: 'Jane',
          phone: '555-1234',
          email: 'jane@bigcorp.com',
          city: 'Hanoi',
          taxCode: 'TX123',
          creditLimit: 100000,
          paymentTerms: 'Net 45',
        },
      ]);

      const options: ExportOptions = { format: 'csv', entity: 'customers' };
      const result = await exportData(options);

      expect(result.success).toBe(true);
    });

    it('should export quality-records entity', async () => {
      (dataService.getQualityRecords as Mock).mockResolvedValue([
        {
          recordNumber: 'NCR-001',
          type: 'NCR',
          status: 'OPEN',
          severity: 'MAJOR',
          description: 'Defective batch',
          rootCause: 'Material issue',
          correctiveAction: 'Replace supplier',
          reportedDate: '2024-01-10',
          reportedBy: 'Inspector A',
        },
      ]);

      const options: ExportOptions = { format: 'csv', entity: 'quality-records' };
      const result = await exportData(options);

      expect(result.success).toBe(true);
      const csvContent = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(csvContent).toContain('NCR-001');
    });
  });
});
