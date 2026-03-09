import { describe, it, expect, vi } from 'vitest';

const { mockDoc, MockJsPDF } = vi.hoisted(() => {
  const doc = {
    internal: {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
    },
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setTextColor: vi.fn(),
    setDrawColor: vi.fn(),
    setFillColor: vi.fn(),
    setLineWidth: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    rect: vi.fn(),
    roundedRect: vi.fn(),
    addPage: vi.fn(),
    setPage: vi.fn(),
    getNumberOfPages: vi.fn().mockReturnValue(2),
    splitTextToSize: vi.fn((text: string) => [text]),
    save: vi.fn(),
    output: vi.fn().mockReturnValue(new Blob()),
  };
  class JsPDF {
    internal = doc.internal;
    setFontSize = doc.setFontSize;
    setFont = doc.setFont;
    setTextColor = doc.setTextColor;
    setDrawColor = doc.setDrawColor;
    setFillColor = doc.setFillColor;
    setLineWidth = doc.setLineWidth;
    text = doc.text;
    line = doc.line;
    rect = doc.rect;
    roundedRect = doc.roundedRect;
    addPage = doc.addPage;
    setPage = doc.setPage;
    getNumberOfPages = doc.getNumberOfPages;
    splitTextToSize = doc.splitTextToSize;
    save = doc.save;
    output = doc.output;
  }
  return { mockDoc: doc, MockJsPDF: JsPDF };
});

vi.mock('jspdf', () => ({
  jsPDF: MockJsPDF,
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

import {
  createDocument,
  drawCompanyHeader,
  drawInfoSection,
  drawTotals,
  drawNotes,
  drawTerms,
  addPageFooters,
  fmtCurrency,
  fmtDate,
  saveDocument,
  documentToBlob,
  COLORS,
} from '../pdf-base';

describe('fmtCurrency', () => {
  it('should format USD amounts', () => {
    expect(fmtCurrency(100)).toBe('$100.00');
    expect(fmtCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });

  it('should format VND amounts', () => {
    const result = fmtCurrency(100000, 'VND');
    expect(result).toContain('100');
  });

  it('should return $0.00 for null or undefined', () => {
    expect(fmtCurrency(null)).toBe('$0.00');
    expect(fmtCurrency(undefined)).toBe('$0.00');
  });

  it('should handle zero', () => {
    expect(fmtCurrency(0)).toBe('$0.00');
  });
});

describe('fmtDate', () => {
  it('should format a date string', () => {
    const result = fmtDate('2024-06-15');
    expect(result).not.toBe('-');
  });

  it('should format a Date object', () => {
    const result = fmtDate(new Date('2024-01-01'));
    expect(result).not.toBe('-');
  });

  it('should return "-" for null', () => {
    expect(fmtDate(null)).toBe('-');
  });

  it('should return "-" for undefined', () => {
    expect(fmtDate(undefined)).toBe('-');
  });

  it('should return "-" for invalid date string', () => {
    expect(fmtDate('not-a-date')).toBe('-');
  });
});

describe('createDocument', () => {
  it('should create a document instance', () => {
    const doc = createDocument('portrait');
    expect(doc).toBeDefined();
  });

  it('should default to portrait', () => {
    const doc = createDocument();
    expect(doc).toBeDefined();
  });
});

describe('drawCompanyHeader', () => {
  it('should draw header and return Y position', () => {
    const doc = createDocument();
    const y = drawCompanyHeader(doc, {
      documentNumber: 'PO-001',
      documentDate: '01/01/2024',
      title: 'PURCHASE ORDER',
      status: 'APPROVED',
    });

    expect(y).toBeGreaterThan(0);
    expect(mockDoc.text).toHaveBeenCalled();
  });

  it('should work without status', () => {
    vi.clearAllMocks();
    const doc = createDocument();
    const y = drawCompanyHeader(doc, {
      documentNumber: 'WO-001',
      documentDate: '01/01/2024',
      title: 'WORK ORDER',
    });

    expect(y).toBeGreaterThan(0);
  });
});

describe('drawInfoSection', () => {
  it('should draw two-column info section', () => {
    const doc = createDocument();
    const y = drawInfoSection(
      doc,
      50,
      'Supplier',
      [['Name', 'Test Corp'], ['Code', 'TC-001']],
      'Details',
      [['PO', 'PO-001'], ['Date', '01/01/2024']]
    );

    expect(y).toBeGreaterThan(50);
  });
});

describe('drawTotals', () => {
  it('should draw totals with highlight on last item', () => {
    const doc = createDocument();
    const y = drawTotals(doc, 200, [
      ['Subtotal:', '$1,000.00'],
      ['Tax:', '$100.00'],
      ['TOTAL:', '$1,100.00'],
    ]);

    expect(y).toBeGreaterThan(200);
  });

  it('should work without highlighting last item', () => {
    const doc = createDocument();
    const y = drawTotals(doc, 200, [['Total:', '$500.00']], false);

    expect(y).toBeGreaterThan(200);
  });
});

describe('drawNotes', () => {
  it('should draw notes section', () => {
    const doc = createDocument();
    const y = drawNotes(doc, 220, 'Some important notes');

    expect(y).toBeGreaterThan(220);
  });

  it('should return y unchanged for empty notes', () => {
    const doc = createDocument();
    const y = drawNotes(doc, 220, '');

    expect(y).toBe(220);
  });
});

describe('drawTerms', () => {
  it('should draw terms section', () => {
    const doc = createDocument();
    const y = drawTerms(doc, 240, 'Net 30 payment terms');

    expect(y).toBeGreaterThan(240);
  });

  it('should return y unchanged for empty terms', () => {
    const doc = createDocument();
    const y = drawTerms(doc, 240, '');

    expect(y).toBe(240);
  });
});

describe('addPageFooters', () => {
  it('should add footers to all pages', () => {
    const doc = createDocument();
    addPageFooters(doc, 'DOC-001');

    expect(mockDoc.setPage).toHaveBeenCalledWith(1);
    expect(mockDoc.setPage).toHaveBeenCalledWith(2);
  });
});

describe('saveDocument', () => {
  it('should call doc.save', () => {
    const doc = createDocument();
    saveDocument(doc, 'test.pdf');

    expect(mockDoc.save).toHaveBeenCalledWith('test.pdf');
  });
});

describe('documentToBlob', () => {
  it('should call doc.output with blob', () => {
    const doc = createDocument();
    const blob = documentToBlob(doc);

    expect(mockDoc.output).toHaveBeenCalledWith('blob');
    expect(blob).toBeDefined();
  });
});

describe('COLORS', () => {
  it('should export color constants as RGB tuples', () => {
    expect(COLORS.primary).toEqual([30, 64, 175]);
    expect(COLORS.dark).toHaveLength(3);
    expect(COLORS.white).toEqual([255, 255, 255]);
  });
});
