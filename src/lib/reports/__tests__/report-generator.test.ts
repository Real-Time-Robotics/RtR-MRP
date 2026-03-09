import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    part: {
      findMany: vi.fn(),
    },
    purchaseOrder: {
      findMany: vi.fn(),
    },
    workOrder: {
      findMany: vi.fn(),
    },
    supplier: {
      findMany: vi.fn(),
    },
    nCR: {
      count: vi.fn(),
    },
    inspection: {
      findMany: vi.fn(),
    },
  },
}));

// Mock report-templates
vi.mock('../report-templates', () => ({
  getReportTemplate: vi.fn((id: string) => {
    const templates: Record<string, any> = {
      'inventory-summary': {
        id: 'inventory-summary',
        name: 'Inventory Summary',
        nameVi: 'Báo cáo Tồn kho',
        category: 'inventory',
        columns: [{ key: 'partNumber', label: 'Part Number', labelVi: 'Mã SP', type: 'string' }],
        query: 'inventory-summary',
      },
      'low-stock-alert': {
        id: 'low-stock-alert',
        name: 'Low Stock Alert',
        nameVi: 'Cảnh báo Hết hàng',
        category: 'inventory',
        columns: [],
        query: 'low-stock-alert',
      },
      'po-summary': {
        id: 'po-summary',
        name: 'PO Summary',
        nameVi: 'PO',
        category: 'purchasing',
        columns: [],
        query: 'po-summary',
      },
      'production-status': {
        id: 'production-status',
        name: 'Production',
        nameVi: 'SX',
        category: 'production',
        columns: [],
        query: 'production-status',
      },
      'supplier-performance': {
        id: 'supplier-performance',
        name: 'Supplier',
        nameVi: 'NCC',
        category: 'supplier',
        columns: [],
        query: 'supplier-performance',
      },
      'quality-report': {
        id: 'quality-report',
        name: 'Quality',
        nameVi: 'CL',
        category: 'quality',
        columns: [],
        query: 'quality-report',
      },
    };
    return templates[id];
  }),
}));

import { generateReportData } from '../report-generator';
import prisma from '@/lib/prisma';

describe('report-generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateReportData', () => {
    it('should throw for unknown template', async () => {
      await expect(generateReportData('unknown-template')).rejects.toThrow('Template not found');
    });

    it('should throw for template without generator', async () => {
      const { getReportTemplate } = await import('../report-templates');
      (getReportTemplate as any).mockReturnValueOnce({
        id: 'custom-no-gen',
        name: 'Custom',
        nameVi: 'Custom',
        category: 'other',
        columns: [],
        query: 'custom-no-gen',
      });

      await expect(generateReportData('custom-no-gen')).rejects.toThrow('No generator for template');
    });

    it('should generate inventory-summary report', async () => {
      (prisma.part.findMany as any).mockResolvedValue([
        {
          partNumber: 'P001',
          name: 'Part A',
          category: 'RAW',
          unit: 'PCS',
          unitCost: 100,
          reorderPoint: 50,
          inventory: [{ quantity: 60, warehouse: { code: 'WH1', name: 'Main' } }],
        },
        {
          partNumber: 'P002',
          name: 'Part B',
          category: 'FG',
          unit: 'EA',
          unitCost: 200,
          reorderPoint: 100,
          inventory: [{ quantity: 30, warehouse: { code: 'WH1', name: 'Main' } }],
        },
      ]);

      const result = await generateReportData('inventory-summary');

      expect(result.template.id).toBe('inventory-summary');
      expect(result.rows.length).toBe(2);
      expect(result.summary.totalRows).toBe(2);
      expect(result.summary.highlights.length).toBeGreaterThan(0);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should detect low stock in inventory-summary', async () => {
      (prisma.part.findMany as any).mockResolvedValue([
        {
          partNumber: 'P001',
          name: 'Low Stock Part',
          category: null,
          unit: null,
          unitCost: null,
          reorderPoint: 100,
          inventory: [{ quantity: 10 }],
        },
      ]);

      const result = await generateReportData('inventory-summary');
      expect(result.rows[0].status).toBe('Sap het');
    });

    it('should generate low-stock-alert report', async () => {
      (prisma.part.findMany as any).mockResolvedValue([
        {
          partNumber: 'P001',
          name: 'Low Part',
          reorderPoint: 100,
          inventory: [{ quantity: 20 }],
          partSuppliers: [{ supplier: { name: 'Supplier A' } }],
        },
        {
          partNumber: 'P002',
          name: 'OK Part',
          reorderPoint: 50,
          inventory: [{ quantity: 200 }],
          partSuppliers: [],
        },
      ]);

      const result = await generateReportData('low-stock-alert');
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].partNumber).toBe('P001');
      expect(result.rows[0].shortage).toBe(80);
    });

    it('should generate po-summary report', async () => {
      (prisma.purchaseOrder.findMany as any).mockResolvedValue([
        {
          poNumber: 'PO-001',
          supplier: { name: 'Supplier A' },
          orderDate: new Date(),
          totalAmount: 5000,
          status: 'draft',
          expectedDate: new Date(),
          lines: [{ quantity: 10, unitPrice: 500, receivedQty: 5 }],
        },
      ]);

      const result = await generateReportData('po-summary');
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].poNumber).toBe('PO-001');
    });

    it('should generate production-status report', async () => {
      (prisma.workOrder.findMany as any).mockResolvedValue([
        {
          woNumber: 'WO-001',
          product: { name: 'Product X' },
          quantity: 100,
          completedQty: 50,
          status: 'in_progress',
          createdAt: new Date(),
        },
      ]);

      const result = await generateReportData('production-status');
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].progress).toBe(50);
    });

    it('should generate supplier-performance report', async () => {
      (prisma.supplier.findMany as any).mockResolvedValue([
        {
          name: 'Supplier A',
          purchaseOrders: [
            { totalAmount: 1000, status: 'completed', lines: [{ quantity: 10, unitPrice: 100 }] },
          ],
        },
        {
          name: 'No Orders Supplier',
          purchaseOrders: [],
        },
      ]);

      const result = await generateReportData('supplier-performance');
      expect(result.rows.length).toBe(1); // supplier with no POs excluded
      expect(result.rows[0].supplierName).toBe('Supplier A');
    });

    it('should generate quality-report', async () => {
      (prisma.nCR.count as any)
        .mockResolvedValueOnce(10) // totalNCRs
        .mockResolvedValueOnce(3)  // openNCRs
        .mockResolvedValueOnce(2); // recentNCRs

      (prisma.inspection.findMany as any).mockResolvedValue([
        { result: 'pass', createdAt: new Date() },
        { result: 'PASS', createdAt: new Date() },
        { result: 'fail', createdAt: new Date() },
      ]);

      const result = await generateReportData('quality-report');
      expect(result.rows.length).toBe(1);
      expect(result.summary.highlights.length).toBeGreaterThanOrEqual(4);
    });

    it('should pass filters through to result', async () => {
      (prisma.part.findMany as any).mockResolvedValue([]);

      const filters = { category: 'RAW' };
      const result = await generateReportData('inventory-summary', filters);
      expect(result.filters).toEqual(filters);
    });
  });
});
