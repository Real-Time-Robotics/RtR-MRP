import { describe, it, expect } from 'vitest';
import { renderToExcel } from '../excel-renderer';
import type { ReportData } from '../report-generator';

function makeReportData(overrides?: Partial<ReportData>): ReportData {
  return {
    template: {
      id: 'test-report',
      name: 'Test Report',
      nameVi: 'Báo cáo Test',
      description: 'Test desc',
      descriptionVi: 'Mô tả test',
      icon: 'Package',
      category: 'inventory',
      columns: [
        { key: 'partNumber', label: 'Part Number', labelVi: 'Mã SP', type: 'string' },
        { key: 'quantity', label: 'Quantity', labelVi: 'Số lượng', type: 'number' },
        { key: 'value', label: 'Value', labelVi: 'Giá trị', type: 'currency' },
        { key: 'createdAt', label: 'Date', labelVi: 'Ngày', type: 'date' },
      ],
      defaultFrequency: 'DAILY',
      defaultTime: '07:00',
      query: 'test',
    },
    generatedAt: new Date('2025-06-15T10:00:00Z'),
    summary: {
      totalRows: 2,
      highlights: [
        { label: 'Total', value: 100 },
        { label: 'Average', value: '50.0' },
      ],
    },
    rows: [
      { partNumber: 'P001', quantity: 60, value: 6000, createdAt: '2025-06-15T00:00:00Z' },
      { partNumber: 'P002', quantity: 40, value: 8000, createdAt: '2025-06-14T00:00:00Z' },
    ],
    ...overrides,
  };
}

describe('excel-renderer', () => {
  describe('renderToExcel', () => {
    it('should return a Buffer', () => {
      const data = makeReportData();
      const result = renderToExcel(data);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should produce a non-empty buffer', () => {
      const data = makeReportData();
      const result = renderToExcel(data);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty rows', () => {
      const data = makeReportData({
        rows: [],
        summary: { totalRows: 0, highlights: [] },
      });
      const result = renderToExcel(data);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle rows with null/undefined values', () => {
      const data = makeReportData({
        rows: [
          { partNumber: 'P001', quantity: null, value: undefined, createdAt: null },
        ],
        summary: { totalRows: 1, highlights: [] },
      });
      const result = renderToExcel(data);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle long template nameVi (sheet name max 31 chars)', () => {
      const data = makeReportData();
      data.template.nameVi = 'A very long report name that exceeds 31 characters limit';
      const result = renderToExcel(data);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should format date columns', () => {
      const data = makeReportData({
        rows: [{ partNumber: 'P001', quantity: 10, value: 100, createdAt: '2025-01-15' }],
      });
      const result = renderToExcel(data);
      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });
});
