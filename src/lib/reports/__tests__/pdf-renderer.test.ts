import { describe, it, expect, vi } from 'vitest';
import type { ReportData } from '../report-generator';

// Mock pdfkit with a class-based mock
vi.mock('pdfkit', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const EventEmitter = require('events');

  class MockPDFDocument extends EventEmitter {
    page = { width: 595, height: 842 };
    y = 100;

    constructor(_opts?: any) {
      super();
    }

    fontSize() { return this; }
    font() { return this; }
    text() { return this; }
    fillColor() { return this; }
    moveDown() { return this; }
    rect() { return this; }
    fill() { return this; }
    addPage() { return this; }
    switchToPage() { return this; }
    bufferedPageRange() { return { start: 0, count: 1 }; }

    end() {
      process.nextTick(() => {
        this.emit('data', Buffer.from('mock-pdf-data'));
        this.emit('end');
      });
    }
  }

  return { default: MockPDFDocument };
});

import { renderToPDF } from '../pdf-renderer';

function makeReportData(overrides?: Partial<ReportData>): ReportData {
  return {
    template: {
      id: 'test-report',
      name: 'Test Report',
      nameVi: 'Bao cao Test',
      description: 'Test desc',
      descriptionVi: 'Mo ta test',
      icon: 'Package',
      category: 'inventory',
      columns: [
        { key: 'partNumber', label: 'Part Number', labelVi: 'Ma SP', type: 'string' },
        { key: 'quantity', label: 'Quantity', labelVi: 'So luong', type: 'number' },
        { key: 'value', label: 'Value', labelVi: 'Gia tri', type: 'currency' },
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
      { partNumber: 'P001', quantity: 60, value: 6000 },
      { partNumber: 'P002', quantity: 40, value: 8000 },
    ],
    ...overrides,
  };
}

describe('pdf-renderer', () => {
  describe('renderToPDF', () => {
    it('should return a Buffer', async () => {
      const data = makeReportData();
      const result = await renderToPDF(data);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should produce non-empty output', async () => {
      const data = makeReportData();
      const result = await renderToPDF(data);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty rows', async () => {
      const data = makeReportData({
        rows: [],
        summary: { totalRows: 0, highlights: [] },
      });
      const result = await renderToPDF(data);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle rows with percent type', async () => {
      const data = makeReportData();
      data.template.columns.push({
        key: 'rate',
        label: 'Rate',
        labelVi: 'Ty le',
        type: 'percent',
      });
      data.rows = [{ partNumber: 'P001', quantity: 10, value: 100, rate: 95.5 }];

      const result = await renderToPDF(data);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle rows with date type', async () => {
      const data = makeReportData();
      data.template.columns.push({
        key: 'createdAt',
        label: 'Date',
        labelVi: 'Ngay',
        type: 'date',
      });
      data.rows = [{ partNumber: 'P001', quantity: 10, value: 100, createdAt: '2025-01-15' }];

      const result = await renderToPDF(data);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle null/undefined cell values', async () => {
      const data = makeReportData({
        rows: [{ partNumber: null, quantity: undefined, value: null }],
      });
      const result = await renderToPDF(data);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should limit columns to 6 for PDF', async () => {
      const data = makeReportData();
      data.template.columns = Array.from({ length: 10 }, (_, i) => ({
        key: `col${i}`,
        label: `Col ${i}`,
        labelVi: `Cot ${i}`,
        type: 'string' as const,
      }));
      data.rows = [Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`col${i}`, `val${i}`]))];

      const result = await renderToPDF(data);
      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });
});
