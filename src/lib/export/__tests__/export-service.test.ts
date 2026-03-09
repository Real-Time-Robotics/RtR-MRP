/**
 * Export Service Unit Tests
 * Tests for exportData(), generateDashboardPDF(), deliverReportByEmail()
 * and quick-export helpers
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

// Mock dependencies before imports
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

import {
  exportData,
  exportSalesOrders,
  exportParts,
  exportInventory,
  exportSuppliers,
  exportCustomers,
  exportWorkOrders,
  exportQualityRecords,
  generateDashboardPDF,
  deliverReportByEmail,
  type ExportOptions,
  type DashboardExportOptions,
} from '../export-service';
import { dataService } from '@/lib/data/data-service';

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

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

const mockInventory = [
  {
    part: { partNumber: 'PN-001', partName: 'Bolt M8' },
    onHand: 100,
    onOrder: 50,
    allocated: 20,
    available: 80,
    safetyStock: 10,
    reorderPoint: 30,
    warehouseLocation: 'WH-A-01',
  },
];

const mockCustomers = [
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
];

const mockWorkOrders = [
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
];

const mockQualityRecords = [
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
];

describe('Export Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (dataService.getParts as Mock).mockResolvedValue(mockParts);
    (dataService.getSuppliers as Mock).mockResolvedValue(mockSuppliers);
    (dataService.getSalesOrders as Mock).mockResolvedValue(mockSalesOrders);
    (dataService.getInventory as Mock).mockResolvedValue(mockInventory);
    (dataService.getCustomers as Mock).mockResolvedValue(mockCustomers);
    (dataService.getWorkOrders as Mock).mockResolvedValue(mockWorkOrders);
    (dataService.getQualityRecords as Mock).mockResolvedValue(mockQualityRecords);
  });

  // =========================================================================
  // CSV Format
  // =========================================================================
  describe('exportData() - CSV format', () => {
    it('should export parts as CSV with BOM and headers', async () => {
      const result = await exportData({ format: 'csv', entity: 'parts' });

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('text/csv;charset=utf-8');
      expect(result.filename).toMatch(/^parts_\d{8}\.csv$/);

      const csv = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(csv.charAt(0)).toBe('\ufeff'); // BOM
      expect(csv).toContain('Mã vật tư');
      expect(csv).toContain('PN-001');
      expect(csv).toContain('Bolt M8');
    });

    it('should export sales-orders as CSV', async () => {
      const result = await exportData({ format: 'csv', entity: 'sales-orders' });
      expect(result.success).toBe(true);

      const csv = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(csv).toContain('SO-001');
      expect(csv).toContain('Acme Corp');
    });

    it('should export inventory as CSV with status computation', async () => {
      const result = await exportData({ format: 'csv', entity: 'inventory' });
      expect(result.success).toBe(true);

      const csv = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(csv).toContain('PN-001');
      expect(csv).toContain('WH-A-01');
    });

    it('should export suppliers as CSV', async () => {
      const result = await exportData({ format: 'csv', entity: 'suppliers' });
      expect(result.success).toBe(true);

      const csv = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(csv).toContain('SUP-001');
      expect(csv).toContain('FastBolt Co.');
    });

    it('should export customers as CSV', async () => {
      const result = await exportData({ format: 'csv', entity: 'customers' });
      expect(result.success).toBe(true);

      const csv = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(csv).toContain('CUS-001');
    });

    it('should export work-orders as CSV', async () => {
      const result = await exportData({ format: 'csv', entity: 'work-orders' });
      expect(result.success).toBe(true);

      const csv = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(csv).toContain('WO-001');
    });

    it('should export quality-records as CSV', async () => {
      const result = await exportData({ format: 'csv', entity: 'quality-records' });
      expect(result.success).toBe(true);

      const csv = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(csv).toContain('NCR-001');
    });
  });

  // =========================================================================
  // XLSX Format
  // =========================================================================
  describe('exportData() - XLSX format', () => {
    it('should export as SpreadsheetML XML', async () => {
      const result = await exportData({ format: 'xlsx', entity: 'parts' });

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('application/vnd.ms-excel');
      expect(result.filename).toMatch(/\.xls$/);

      const xml = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('Workbook');
      expect(xml).toContain('PN-001');
    });

    it('should use custom title', async () => {
      const result = await exportData({
        format: 'xlsx',
        entity: 'suppliers',
        title: 'Supplier Report Q1',
      });

      const xml = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(xml).toContain('Supplier Report Q1');
    });

    it('should use default Vietnamese title when no title provided', async () => {
      const result = await exportData({ format: 'xlsx', entity: 'inventory' });

      const xml = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(xml).toContain('Báo cáo tồn kho');
    });
  });

  // =========================================================================
  // PDF Format
  // =========================================================================
  describe('exportData() - PDF format', () => {
    it('should export as HTML for PDF rendering', async () => {
      const result = await exportData({ format: 'pdf', entity: 'parts' });

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('text/html;charset=utf-8');
      expect(result.filename).toMatch(/\.html$/);

      const html = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<table');
      expect(html).toContain('PN-001');
    });
  });

  // =========================================================================
  // Error cases
  // =========================================================================
  describe('error handling', () => {
    it('should throw for unknown entity', async () => {
      const opts = { format: 'csv', entity: 'nonexistent' } as unknown as ExportOptions;
      await expect(exportData(opts)).rejects.toThrow('Unknown entity');
    });

    it('should throw for unknown format', async () => {
      const opts = { format: 'unknown', entity: 'parts' } as unknown as ExportOptions;
      await expect(exportData(opts)).rejects.toThrow('Unknown format');
    });
  });

  // =========================================================================
  // Empty data
  // =========================================================================
  describe('empty data handling', () => {
    it('should handle empty parts list', async () => {
      (dataService.getParts as Mock).mockResolvedValue([]);

      const result = await exportData({ format: 'csv', entity: 'parts' });
      expect(result.success).toBe(true);
      const csv = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(csv).toContain('Mã vật tư');
    });

    it('should handle empty inventory', async () => {
      (dataService.getInventory as Mock).mockResolvedValue([]);

      const result = await exportData({ format: 'xlsx', entity: 'inventory' });
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // Quick export helpers
  // =========================================================================
  describe('quick export helpers', () => {
    it('exportSalesOrders uses sales-orders entity and xlsx default', async () => {
      const result = await exportSalesOrders();
      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('application/vnd.ms-excel');
    });

    it('exportParts uses parts entity', async () => {
      const result = await exportParts('csv');
      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('text/csv;charset=utf-8');
    });

    it('exportInventory uses inventory entity', async () => {
      const result = await exportInventory();
      expect(result.success).toBe(true);
    });

    it('exportSuppliers uses suppliers entity', async () => {
      const result = await exportSuppliers();
      expect(result.success).toBe(true);
    });

    it('exportCustomers uses customers entity', async () => {
      const result = await exportCustomers();
      expect(result.success).toBe(true);
    });

    it('exportWorkOrders uses work-orders entity', async () => {
      const result = await exportWorkOrders();
      expect(result.success).toBe(true);
    });

    it('exportQualityRecords uses quality-records entity', async () => {
      const result = await exportQualityRecords();
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // generateDashboardPDF
  // =========================================================================
  describe('generateDashboardPDF', () => {
    it('should generate HTML with title and widgets', () => {
      const options: DashboardExportOptions = {
        dashboardId: 'dash-1',
        title: 'Monthly Report',
        description: 'Summary of operations',
        widgets: [],
      };

      const html = generateDashboardPDF(options);

      expect(html).toContain('Monthly Report');
      expect(html).toContain('Summary of operations');
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('should render KPI widgets', () => {
      const options: DashboardExportOptions = {
        dashboardId: 'dash-1',
        title: 'KPI Dashboard',
        widgets: [
          {
            id: 'w1',
            title: 'Total Revenue',
            type: 'kpi',
            kpiData: { value: '$1,000,000', trend: '+15%', status: 'ok' },
          },
        ],
      };

      const html = generateDashboardPDF(options);

      expect(html).toContain('Total Revenue');
      expect(html).toContain('$1,000,000');
      expect(html).toContain('+15%');
    });

    it('should render critical KPI with red color', () => {
      const options: DashboardExportOptions = {
        dashboardId: 'dash-1',
        title: 'Alerts',
        widgets: [
          {
            id: 'w1',
            title: 'Defects',
            type: 'kpi',
            kpiData: { value: '25', status: 'critical' },
          },
        ],
      };

      const html = generateDashboardPDF(options);
      expect(html).toContain('#EF4444'); // red color for critical
    });

    it('should render warning KPI with amber color', () => {
      const options: DashboardExportOptions = {
        dashboardId: 'dash-1',
        title: 'Alerts',
        widgets: [
          {
            id: 'w1',
            title: 'Low Stock',
            type: 'kpi',
            kpiData: { value: '12', status: 'warning' },
          },
        ],
      };

      const html = generateDashboardPDF(options);
      expect(html).toContain('#F59E0B'); // amber for warning
    });

    it('should render chart image widgets', () => {
      const options: DashboardExportOptions = {
        dashboardId: 'dash-1',
        title: 'Charts',
        widgets: [
          {
            id: 'w1',
            title: 'Sales Chart',
            type: 'chart',
            imageData: 'data:image/png;base64,abc123',
          },
        ],
      };

      const html = generateDashboardPDF(options);
      expect(html).toContain('Sales Chart');
      expect(html).toContain('data:image/png;base64,abc123');
    });

    it('should render table widgets with row limit', () => {
      const rows = Array.from({ length: 15 }, (_, i) => ({
        id: `r${i}`,
        name: `Item ${i}`,
      }));
      const options: DashboardExportOptions = {
        dashboardId: 'dash-1',
        title: 'Table View',
        widgets: [
          {
            id: 'w1',
            title: 'Inventory Table',
            type: 'table',
            tableData: {
              columns: [
                { key: 'id', label: 'ID' },
                { key: 'name', label: 'Name' },
              ],
              rows,
            },
          },
        ],
      };

      const html = generateDashboardPDF(options);
      expect(html).toContain('Inventory Table');
      expect(html).toContain('Item 0');
      expect(html).toContain('Item 9');
      // Should show "more rows" indicator
      expect(html).toContain('5 dòng khác');
    });

    it('should include date range and generated by', () => {
      const options: DashboardExportOptions = {
        dashboardId: 'dash-1',
        title: 'Report',
        widgets: [],
        dateRange: { from: '2024-01-01', to: '2024-03-31' },
        generatedBy: 'Admin',
      };

      const html = generateDashboardPDF(options);
      expect(html).toContain('2024-01-01');
      expect(html).toContain('2024-03-31');
      expect(html).toContain('Admin');
    });
  });

  // =========================================================================
  // deliverReportByEmail
  // =========================================================================
  describe('deliverReportByEmail', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return error when SMTP env vars are missing', async () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      const result = await deliverReportByEmail({
        to: ['test@example.com'],
        subject: 'Report',
        body: '<p>Hello</p>',
        attachments: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP not configured');
    });

    it('should return error when nodemailer is not installed', async () => {
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'user';
      process.env.SMTP_PASS = 'pass';

      const result = await deliverReportByEmail({
        to: ['test@example.com'],
        subject: 'Report',
        body: '<p>Hello</p>',
        attachments: [],
      });

      // Will fail because nodemailer is not installed in test env
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // =========================================================================
  // Inventory status computation
  // =========================================================================
  describe('inventory status logic', () => {
    it('should show critical status when available <= safetyStock', async () => {
      (dataService.getInventory as Mock).mockResolvedValue([
        {
          part: { partNumber: 'P1', partName: 'Low item' },
          onHand: 5,
          onOrder: 0,
          allocated: 0,
          available: 5,
          safetyStock: 10,
          reorderPoint: 20,
          warehouseLocation: 'WH-1',
        },
      ]);

      const result = await exportData({ format: 'csv', entity: 'inventory' });
      const csv = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(csv).toContain('Thiếu nghiêm trọng');
    });

    it('should show reorder status when available <= reorderPoint', async () => {
      (dataService.getInventory as Mock).mockResolvedValue([
        {
          part: { partNumber: 'P1', partName: 'Medium item' },
          onHand: 25,
          onOrder: 0,
          allocated: 0,
          available: 25,
          safetyStock: 10,
          reorderPoint: 30,
          warehouseLocation: 'WH-1',
        },
      ]);

      const result = await exportData({ format: 'csv', entity: 'inventory' });
      const csv = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(csv).toContain('Sắp hết');
    });

    it('should show OK status when available > reorderPoint', async () => {
      (dataService.getInventory as Mock).mockResolvedValue([
        {
          part: { partNumber: 'P1', partName: 'Good item' },
          onHand: 100,
          onOrder: 0,
          allocated: 0,
          available: 100,
          safetyStock: 10,
          reorderPoint: 30,
          warehouseLocation: 'WH-1',
        },
      ]);

      const result = await exportData({ format: 'csv', entity: 'inventory' });
      const csv = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(csv).toContain('Đủ hàng');
    });
  });

  // =========================================================================
  // Data transformation specifics
  // =========================================================================
  describe('data transformation', () => {
    it('should translate status values to Vietnamese', async () => {
      const result = await exportData({ format: 'csv', entity: 'sales-orders' });
      const csv = Buffer.from(result.data, 'base64').toString('utf-8');
      // CONFIRMED => Đã xác nhận, NORMAL => Bình thường
      expect(csv).toContain('Đã xác nhận');
      expect(csv).toContain('Bình thường');
    });

    it('should show active/inactive status for parts', async () => {
      const result = await exportData({ format: 'csv', entity: 'parts' });
      const csv = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(csv).toContain('Đang dùng');
      expect(csv).toContain('Ngừng');
    });

    it('should escape XML special characters in XLSX', async () => {
      (dataService.getParts as Mock).mockResolvedValue([
        {
          ...mockParts[0],
          partName: 'Bolt <M8> & "special"',
        },
      ]);

      const result = await exportData({ format: 'xlsx', entity: 'parts' });
      const xml = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(xml).toContain('&lt;M8&gt;');
      expect(xml).toContain('&amp;');
    });

    it('should escape double quotes in CSV', async () => {
      (dataService.getSalesOrders as Mock).mockResolvedValue([
        { ...mockSalesOrders[0], notes: 'He said "hello"' },
      ]);

      const result = await exportData({ format: 'csv', entity: 'sales-orders' });
      const csv = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(csv).toContain('""hello""');
    });
  });
});
