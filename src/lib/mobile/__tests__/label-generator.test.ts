import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted for mock variables referenced in vi.mock factories
const { mockGenerateQRCodeDataURL, mockGenerateBarcodeDataURL, mockClientLogger } = vi.hoisted(() => ({
  mockGenerateQRCodeDataURL: vi.fn().mockResolvedValue('data:image/png;base64,qrcode'),
  mockGenerateBarcodeDataURL: vi.fn().mockReturnValue('data:image/png;base64,barcode'),
  mockClientLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../qr-generator', () => ({
  generateQRCodeDataURL: mockGenerateQRCodeDataURL,
  generateBarcodeDataURL: mockGenerateBarcodeDataURL,
}));

vi.mock('@/lib/client-logger', () => ({
  clientLogger: mockClientLogger,
}));

import {
  LABEL_SIZES,
  PART_LABEL_TEMPLATE,
  LOCATION_LABEL_TEMPLATE,
  WORK_ORDER_LABEL_TEMPLATE,
  generateLabelHTML,
  generateLabelCanvas,
  printLabel,
  generateZPL,
} from '../label-generator';
import type { LabelTemplate, LabelElement, LabelSize } from '../label-generator';

// --- Helpers ---

function makeTemplate(elements: LabelElement[], size?: LabelSize): LabelTemplate {
  return {
    id: 'test-template',
    name: 'Test Template',
    size: size || { width: 50, height: 25, dpi: 203 },
    elements,
  };
}

function textElement(overrides?: Partial<LabelElement>): LabelElement {
  return { type: 'text', x: 2, y: 3, data: '{{name}}', ...overrides };
}

// --- Tests ---

describe('label-generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================================
  // Constants / templates
  // =====================================================================

  describe('LABEL_SIZES', () => {
    it('should export predefined label sizes', () => {
      expect(LABEL_SIZES.SMALL).toEqual({ width: 25, height: 15, dpi: 203 });
      expect(LABEL_SIZES.MEDIUM).toEqual({ width: 50, height: 25, dpi: 203 });
      expect(LABEL_SIZES.LARGE).toEqual({ width: 100, height: 50, dpi: 203 });
      expect(LABEL_SIZES.ZEBRA_2x1).toEqual({ width: 50.8, height: 25.4, dpi: 203 });
      expect(LABEL_SIZES.ZEBRA_4x2).toEqual({ width: 101.6, height: 50.8, dpi: 203 });
      expect(LABEL_SIZES.DYMO_SMALL).toEqual({ width: 25.4, height: 12.7, dpi: 300 });
      expect(LABEL_SIZES.DYMO_STANDARD).toEqual({ width: 89, height: 28, dpi: 300 });
    });
  });

  describe('PART_LABEL_TEMPLATE', () => {
    it('should have correct structure', () => {
      expect(PART_LABEL_TEMPLATE.id).toBe('part-standard');
      expect(PART_LABEL_TEMPLATE.size).toBe(LABEL_SIZES.MEDIUM);
      expect(PART_LABEL_TEMPLATE.elements).toHaveLength(4);
      expect(PART_LABEL_TEMPLATE.elements.map(e => e.type)).toEqual([
        'text', 'text', 'barcode', 'qrcode',
      ]);
    });
  });

  describe('LOCATION_LABEL_TEMPLATE', () => {
    it('should have correct structure', () => {
      expect(LOCATION_LABEL_TEMPLATE.id).toBe('location-standard');
      expect(LOCATION_LABEL_TEMPLATE.size).toBe(LABEL_SIZES.LARGE);
      expect(LOCATION_LABEL_TEMPLATE.elements).toHaveLength(4);
    });
  });

  describe('WORK_ORDER_LABEL_TEMPLATE', () => {
    it('should have correct structure', () => {
      expect(WORK_ORDER_LABEL_TEMPLATE.id).toBe('work-order-standard');
      expect(WORK_ORDER_LABEL_TEMPLATE.size).toBe(LABEL_SIZES.LARGE);
      expect(WORK_ORDER_LABEL_TEMPLATE.elements).toHaveLength(5);
    });
  });

  // =====================================================================
  // generateLabelHTML
  // =====================================================================

  describe('generateLabelHTML', () => {
    it('should generate HTML wrapper with correct size', () => {
      const template = makeTemplate([]);
      const html = generateLabelHTML(template, {});
      expect(html).toContain('width: 50mm');
      expect(html).toContain('height: 25mm');
    });

    it('should replace template variables in text elements', () => {
      const template = makeTemplate([
        textElement({ data: '{{partNumber}} - {{partName}}' }),
      ]);
      const html = generateLabelHTML(template, {
        partNumber: 'P-001',
        partName: 'Widget',
      });
      expect(html).toContain('P-001 - Widget');
      expect(html).not.toContain('{{partNumber}}');
      expect(html).not.toContain('{{partName}}');
    });

    it('should handle text element with default options', () => {
      const template = makeTemplate([
        { type: 'text', x: 5, y: 10, data: 'Hello' },
      ]);
      const html = generateLabelHTML(template, {});
      expect(html).toContain('left: 5mm');
      expect(html).toContain('top: 10mm');
      expect(html).toContain('font-size: 10pt');
      expect(html).toContain('font-weight: normal');
      expect(html).toContain('color: #000000');
      expect(html).toContain('Hello');
    });

    it('should handle text element with bold and custom color', () => {
      const template = makeTemplate([
        { type: 'text', x: 0, y: 0, data: 'Bold', options: { bold: true, color: '#ff0000', fontSize: 14 } },
      ]);
      const html = generateLabelHTML(template, {});
      expect(html).toContain('font-weight: bold');
      expect(html).toContain('color: #ff0000');
      expect(html).toContain('font-size: 14pt');
    });

    it('should handle text element with maxWidth', () => {
      const template = makeTemplate([
        { type: 'text', x: 0, y: 0, data: 'Long text', options: { maxWidth: 30 } },
      ]);
      const html = generateLabelHTML(template, {});
      expect(html).toContain('max-width: 30mm');
      expect(html).toContain('overflow: hidden');
      expect(html).toContain('text-overflow: ellipsis');
    });

    it('should handle barcode element', () => {
      const template = makeTemplate([
        { type: 'barcode', x: 2, y: 15, data: '{{barcode}}', options: { height: 8, displayValue: false } },
      ]);
      const html = generateLabelHTML(template, { barcode: '123456' });
      expect(html).toContain('data-barcode="123456"');
      expect(html).toContain('id="barcode-2-15"');
      expect(html).toContain('height: 8mm');
    });

    it('should handle barcode element with default options', () => {
      const template = makeTemplate([
        { type: 'barcode', x: 0, y: 0, data: 'BC' },
      ]);
      const html = generateLabelHTML(template, {});
      expect(html).toContain('height: 10mm');
    });

    it('should handle qrcode element', () => {
      const template = makeTemplate([
        { type: 'qrcode', x: 38, y: 3, data: '{{qrData}}', options: { size: 15 } },
      ]);
      const html = generateLabelHTML(template, { qrData: 'https://example.com' });
      expect(html).toContain('data-qrcode="https://example.com"');
      expect(html).toContain('id="qrcode-38-3"');
      expect(html).toContain('width: 15mm');
      expect(html).toContain('height: 15mm');
    });

    it('should handle qrcode element with default size', () => {
      const template = makeTemplate([
        { type: 'qrcode', x: 0, y: 0, data: 'QR' },
      ]);
      const html = generateLabelHTML(template, {});
      expect(html).toContain('width: 10mm');
    });

    it('should handle line element', () => {
      const template = makeTemplate([
        { type: 'line', x: 5, y: 10, data: '', options: { width: 20, thickness: 2, color: '#333' } },
      ]);
      const html = generateLabelHTML(template, {});
      expect(html).toContain('left: 5mm');
      expect(html).toContain('top: 10mm');
      expect(html).toContain('width: 20mm');
      expect(html).toContain('border-top: 2px solid #333');
    });

    it('should handle line element with default options', () => {
      const template = makeTemplate([
        { type: 'line', x: 0, y: 0, data: '' },
      ]);
      const html = generateLabelHTML(template, {});
      expect(html).toContain('width: 10mm');
      expect(html).toContain('border-top: 1px solid #000000');
    });

    it('should handle rect element', () => {
      const template = makeTemplate([
        {
          type: 'rect', x: 1, y: 2, data: '',
          options: { width: 30, height: 20, borderWidth: 2, borderColor: '#ff0000', fill: '#eeeeee' },
        },
      ]);
      const html = generateLabelHTML(template, {});
      expect(html).toContain('width: 30mm');
      expect(html).toContain('height: 20mm');
      expect(html).toContain('border: 2px solid #ff0000');
      expect(html).toContain('background: #eeeeee');
    });

    it('should handle rect element with default options', () => {
      const template = makeTemplate([
        { type: 'rect', x: 0, y: 0, data: '' },
      ]);
      const html = generateLabelHTML(template, {});
      expect(html).toContain('width: 10mm');
      expect(html).toContain('height: 10mm');
      expect(html).toContain('border: 1px solid #000000');
      expect(html).toContain('background: transparent');
    });

    it('should handle image element type (no output for unhandled type)', () => {
      const template = makeTemplate([
        { type: 'image', x: 0, y: 0, data: 'img.png' },
      ]);
      const html = generateLabelHTML(template, {});
      // image type is not handled in switch — should just have wrapper div
      expect(html).toContain('</div>');
      expect(html).not.toContain('img.png');
    });

    it('should handle multiple elements', () => {
      const template = makeTemplate([
        { type: 'text', x: 0, y: 0, data: 'Title', options: { bold: true } },
        { type: 'barcode', x: 0, y: 10, data: 'BC123' },
        { type: 'line', x: 0, y: 20, data: '' },
      ]);
      const html = generateLabelHTML(template, {});
      expect(html).toContain('Title');
      expect(html).toContain('data-barcode="BC123"');
      expect(html).toContain('border-top:');
    });

    it('should replace multiple occurrences of same variable', () => {
      const template = makeTemplate([
        textElement({ data: '{{x}} and {{x}}' }),
      ]);
      const html = generateLabelHTML(template, { x: 'val' });
      expect(html).toContain('val and val');
    });

    it('should work with PART_LABEL_TEMPLATE', () => {
      const html = generateLabelHTML(PART_LABEL_TEMPLATE, {
        partNumber: 'RTR-001',
        partName: 'Motor Assembly',
        barcode: '1234567890',
        qrData: 'https://rtr.com/parts/RTR-001',
      });
      expect(html).toContain('RTR-001');
      expect(html).toContain('Motor Assembly');
      expect(html).toContain('data-barcode="1234567890"');
      expect(html).toContain('data-qrcode="https://rtr.com/parts/RTR-001"');
    });
  });

  // =====================================================================
  // generateLabelCanvas
  // =====================================================================

  describe('generateLabelCanvas', () => {
    let mockCtx: Record<string, unknown>;
    let mockCanvas: Record<string, unknown>;

    beforeEach(() => {
      mockCtx = {
        fillStyle: '',
        fillRect: vi.fn(),
        fillText: vi.fn(),
        font: '',
        strokeStyle: '',
        lineWidth: 0,
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        strokeRect: vi.fn(),
        drawImage: vi.fn(),
      };

      mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(mockCtx),
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,canvas'),
      };

      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement);
    });

    it('should create canvas with correct dimensions', async () => {
      const template = makeTemplate([], { width: 50, height: 25, dpi: 203 });
      const canvas = await generateLabelCanvas(template, {});
      // 50mm / 25.4 * 203 = ~400
      expect(canvas.width).toBe(Math.round((50 / 25.4) * 203));
      expect(canvas.height).toBe(Math.round((25 / 25.4) * 203));
    });

    it('should use default dpi of 203 when not specified', async () => {
      const template = makeTemplate([], { width: 25.4, height: 25.4 });
      const canvas = await generateLabelCanvas(template, {});
      expect(canvas.width).toBe(203); // 25.4mm / 25.4 * 203 = 203
      expect(canvas.height).toBe(203);
    });

    it('should fill canvas background white', async () => {
      const template = makeTemplate([]);
      await generateLabelCanvas(template, {});
      expect(mockCtx.fillStyle).toBe('white');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, expect.any(Number), expect.any(Number));
    });

    it('should render text element', async () => {
      const template = makeTemplate([
        { type: 'text', x: 2, y: 3, data: '{{label}}', options: { fontSize: 12, bold: true, color: '#ff0000' } },
      ]);
      await generateLabelCanvas(template, { label: 'Hello' });
      expect(mockCtx.font).toContain('bold');
      expect(mockCtx.font).toContain('Arial');
      expect(mockCtx.fillText).toHaveBeenCalledWith('Hello', expect.any(Number), expect.any(Number));
    });

    it('should render text element with defaults', async () => {
      const template = makeTemplate([
        { type: 'text', x: 0, y: 0, data: 'Default' },
      ]);
      await generateLabelCanvas(template, {});
      expect(mockCtx.fillText).toHaveBeenCalledWith('Default', expect.any(Number), expect.any(Number));
    });

    it('should render text element non-bold', async () => {
      const template = makeTemplate([
        { type: 'text', x: 0, y: 0, data: 'Normal', options: { bold: false } },
      ]);
      await generateLabelCanvas(template, {});
      expect((mockCtx.font as string)).not.toContain('bold');
    });

    it('should render barcode element', async () => {
      const template = makeTemplate([
        { type: 'barcode', x: 2, y: 15, data: '{{barcode}}', options: { height: 8, displayValue: true } },
      ]);

      // Mock Image so onload fires synchronously when src is set
      const OrigImage = globalThis.Image;
      globalThis.Image = class extends OrigImage {
        constructor() {
          super();
          Object.defineProperty(this, 'src', {
            set(_val: string) {
              // Trigger onload synchronously
              // @ts-expect-error test override
              if (this.onload) (this.onload as () => void).call(this, new Event('load'));
            },
          });
        }
      } as unknown as typeof Image;

      await generateLabelCanvas(template, { barcode: '123456' });
      globalThis.Image = OrigImage;

      expect(mockGenerateBarcodeDataURL).toHaveBeenCalledWith('123456', {
        height: expect.any(Number),
        displayValue: true,
      });
      expect(mockCtx.drawImage).toHaveBeenCalled();
    });

    it('should handle barcode error gracefully', async () => {
      mockGenerateBarcodeDataURL.mockImplementationOnce(() => { throw new Error('Barcode fail'); });
      const template = makeTemplate([
        { type: 'barcode', x: 0, y: 0, data: 'INVALID' },
      ]);
      await generateLabelCanvas(template, {});
      expect(mockClientLogger.error).toHaveBeenCalledWith('Failed to generate barcode', expect.any(Error));
    });

    it('should render qrcode element', async () => {
      const template = makeTemplate([
        { type: 'qrcode', x: 38, y: 3, data: '{{qr}}', options: { size: 10 } },
      ]);

      const OrigImage = globalThis.Image;
      globalThis.Image = class extends OrigImage {
        constructor() {
          super();
          Object.defineProperty(this, 'src', {
            set(_val: string) {
              // @ts-expect-error test override
              if (this.onload) (this.onload as () => void).call(this, new Event('load'));
            },
          });
        }
      } as unknown as typeof Image;

      await generateLabelCanvas(template, { qr: 'https://example.com' });
      globalThis.Image = OrigImage;

      expect(mockGenerateQRCodeDataURL).toHaveBeenCalledWith('https://example.com', {
        width: expect.any(Number),
        margin: 0,
      });
      expect(mockCtx.drawImage).toHaveBeenCalled();
    });

    it('should handle qrcode error gracefully', async () => {
      mockGenerateQRCodeDataURL.mockRejectedValueOnce(new Error('QR fail'));
      const template = makeTemplate([
        { type: 'qrcode', x: 0, y: 0, data: 'bad' },
      ]);
      await generateLabelCanvas(template, {});
      expect(mockClientLogger.error).toHaveBeenCalledWith('Failed to generate QR code', expect.any(Error));
    });

    it('should render qrcode element with default size', async () => {
      const template = makeTemplate([
        { type: 'qrcode', x: 0, y: 0, data: 'qr' },
      ]);

      const OrigImage = globalThis.Image;
      globalThis.Image = class extends OrigImage {
        constructor() {
          super();
          Object.defineProperty(this, 'src', {
            set(_val: string) {
              // @ts-expect-error test override
              if (this.onload) (this.onload as () => void).call(this, new Event('load'));
            },
          });
        }
      } as unknown as typeof Image;

      await generateLabelCanvas(template, {});
      globalThis.Image = OrigImage;

      const expectedSize = Math.round((10 / 25.4) * 203);
      expect(mockGenerateQRCodeDataURL).toHaveBeenCalledWith('qr', {
        width: expectedSize,
        margin: 0,
      });
    });

    it('should render line element', async () => {
      const template = makeTemplate([
        { type: 'line', x: 5, y: 10, data: '', options: { width: 20, thickness: 2, color: '#333' } },
      ]);
      await generateLabelCanvas(template, {});
      expect(mockCtx.strokeStyle).toBe('#333');
      expect(mockCtx.lineWidth).toBe(2);
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.lineTo).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it('should render line element with defaults', async () => {
      const template = makeTemplate([
        { type: 'line', x: 0, y: 0, data: '' },
      ]);
      await generateLabelCanvas(template, {});
      expect(mockCtx.strokeStyle).toBe('#000000');
      expect(mockCtx.lineWidth).toBe(1);
    });

    it('should render rect element with fill', async () => {
      const template = makeTemplate([
        {
          type: 'rect', x: 1, y: 2, data: '',
          options: { width: 30, height: 20, borderWidth: 2, borderColor: '#ff0000', fill: '#eeeeee' },
        },
      ]);
      await generateLabelCanvas(template, {});
      // Fill should be called (fillRect called for background + rect fill)
      expect(mockCtx.fillRect).toHaveBeenCalledTimes(2); // background + rect fill
      expect(mockCtx.strokeRect).toHaveBeenCalled();
    });

    it('should render rect element without fill', async () => {
      const template = makeTemplate([
        { type: 'rect', x: 0, y: 0, data: '', options: { width: 10, height: 10 } },
      ]);
      await generateLabelCanvas(template, {});
      // fillRect called once for background only (no fill option)
      expect(mockCtx.fillRect).toHaveBeenCalledTimes(1);
      expect(mockCtx.strokeRect).toHaveBeenCalled();
    });

    it('should render rect element with default options', async () => {
      const template = makeTemplate([
        { type: 'rect', x: 0, y: 0, data: '' },
      ]);
      await generateLabelCanvas(template, {});
      expect(mockCtx.strokeStyle).toBe('#000000');
      expect(mockCtx.lineWidth).toBe(1);
      expect(mockCtx.strokeRect).toHaveBeenCalled();
    });

    it('should handle barcode with default displayValue (false via ??)', async () => {
      const template = makeTemplate([
        { type: 'barcode', x: 0, y: 0, data: 'BC', options: { height: 5 } },
      ]);

      const OrigImage = globalThis.Image;
      globalThis.Image = class extends OrigImage {
        constructor() {
          super();
          Object.defineProperty(this, 'src', {
            set(_val: string) {
              // @ts-expect-error test override
              if (this.onload) (this.onload as () => void).call(this, new Event('load'));
            },
          });
        }
      } as unknown as typeof Image;

      await generateLabelCanvas(template, {});
      globalThis.Image = OrigImage;

      expect(mockGenerateBarcodeDataURL).toHaveBeenCalledWith('BC', {
        height: expect.any(Number),
        displayValue: false,
      });
    });

    it('should handle barcode with no options at all', async () => {
      const template = makeTemplate([
        { type: 'barcode', x: 0, y: 0, data: 'BC' },
      ]);

      const OrigImage = globalThis.Image;
      globalThis.Image = class extends OrigImage {
        constructor() {
          super();
          Object.defineProperty(this, 'src', {
            set(_val: string) {
              // @ts-expect-error test override
              if (this.onload) (this.onload as () => void).call(this, new Event('load'));
            },
          });
        }
      } as unknown as typeof Image;

      await generateLabelCanvas(template, {});
      globalThis.Image = OrigImage;

      expect(mockGenerateBarcodeDataURL).toHaveBeenCalledWith('BC', {
        height: expect.any(Number),
        displayValue: false,
      });
    });
  });

  // =====================================================================
  // printLabel
  // =====================================================================

  describe('printLabel', () => {
    let mockPrintWindow: Record<string, unknown>;
    let mockDoc: Record<string, unknown>;
    let mockCtx: Record<string, unknown>;
    let mockCanvas: Record<string, unknown>;

    beforeEach(() => {
      mockCtx = {
        fillStyle: '',
        fillRect: vi.fn(),
        fillText: vi.fn(),
        font: '',
        strokeStyle: '',
        lineWidth: 0,
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        strokeRect: vi.fn(),
        drawImage: vi.fn(),
      };

      mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(mockCtx),
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,test'),
      };

      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement);

      mockDoc = {
        open: vi.fn(),
        write: vi.fn(),
        close: vi.fn(),
      };

      mockPrintWindow = {
        document: mockDoc,
      };
    });

    it('should open print window and write HTML', async () => {
      vi.spyOn(window, 'open').mockReturnValue(mockPrintWindow as unknown as Window);
      const template = makeTemplate([]);
      await printLabel(template, {});

      expect(window.open).toHaveBeenCalledWith('', '_blank');
      expect(mockDoc.open).toHaveBeenCalled();
      expect(mockDoc.write).toHaveBeenCalled();
      expect(mockDoc.close).toHaveBeenCalled();
    });

    it('should throw if print window cannot be opened', async () => {
      vi.spyOn(window, 'open').mockReturnValue(null);
      const template = makeTemplate([]);
      await expect(printLabel(template, {})).rejects.toThrow('Failed to open print window');
    });

    it('should generate multiple copies', async () => {
      vi.spyOn(window, 'open').mockReturnValue(mockPrintWindow as unknown as Window);
      const template = makeTemplate([]);
      await printLabel(template, {}, 3);

      // Check that write was called with content containing multiple img tags
      const writeCalls = (mockDoc.write as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]).join('');
      const imgCount = (writeCalls.match(/data:image\/png;base64,test/g) || []).length;
      expect(imgCount).toBe(3);
    });

    it('should default to 1 copy', async () => {
      vi.spyOn(window, 'open').mockReturnValue(mockPrintWindow as unknown as Window);
      const template = makeTemplate([]);
      await printLabel(template, {});

      const writeCalls = (mockDoc.write as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]).join('');
      const imgCount = (writeCalls.match(/data:image\/png;base64,test/g) || []).length;
      expect(imgCount).toBe(1);
    });

    it('should sanitize template dimensions', async () => {
      vi.spyOn(window, 'open').mockReturnValue(mockPrintWindow as unknown as Window);
      const template = makeTemplate([], { width: 999, height: -10, dpi: 203 });
      await printLabel(template, {});

      const writeCalls = (mockDoc.write as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]).join('');
      // width clamped to 500, height clamped to 0
      expect(writeCalls).toContain('500mm');
      expect(writeCalls).toContain('0mm');
    });

    it('should include print and close script', async () => {
      vi.spyOn(window, 'open').mockReturnValue(mockPrintWindow as unknown as Window);
      const template = makeTemplate([]);
      await printLabel(template, {});

      const writeCalls = (mockDoc.write as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]).join('');
      expect(writeCalls).toContain('window.print()');
      expect(writeCalls).toContain('window.close()');
    });
  });

  // =====================================================================
  // generateZPL
  // =====================================================================

  describe('generateZPL', () => {
    it('should start with ^XA and end with ^XZ', () => {
      const template = makeTemplate([]);
      const zpl = generateZPL(template, {});
      expect(zpl).toMatch(/^\^XA\n/);
      expect(zpl).toMatch(/\^XZ$/);
    });

    it('should include label dimensions', () => {
      const template = makeTemplate([], { width: 50, height: 25, dpi: 203 });
      const zpl = generateZPL(template, {});
      const widthDots = Math.round((50 / 25.4) * 203);
      const heightDots = Math.round((25 / 25.4) * 203);
      expect(zpl).toContain(`^PW${widthDots}`);
      expect(zpl).toContain(`^LL${heightDots}`);
    });

    it('should use default dpi of 203', () => {
      const template = makeTemplate([], { width: 25.4, height: 25.4 });
      const zpl = generateZPL(template, {});
      expect(zpl).toContain('^PW203');
      expect(zpl).toContain('^LL203');
    });

    it('should generate text ZPL commands', () => {
      const template = makeTemplate([
        { type: 'text', x: 5, y: 10, data: '{{label}}', options: { fontSize: 12 } },
      ]);
      const zpl = generateZPL(template, { label: 'Hello' });
      const x = Math.round((5 / 25.4) * 203);
      const y = Math.round((10 / 25.4) * 203);
      expect(zpl).toContain(`^FO${x},${y}`);
      expect(zpl).toContain('^A0N,24,24'); // fontSize 12 * 2 = 24
      expect(zpl).toContain('^FDHello^FS');
    });

    it('should generate text with default fontSize', () => {
      const template = makeTemplate([
        { type: 'text', x: 0, y: 0, data: 'Default' },
      ]);
      const zpl = generateZPL(template, {});
      expect(zpl).toContain('^A0N,20,20'); // default 10 * 2 = 20
    });

    it('should generate barcode ZPL commands', () => {
      const template = makeTemplate([
        { type: 'barcode', x: 2, y: 15, data: '{{bc}}', options: { height: 8, displayValue: true } },
      ]);
      const zpl = generateZPL(template, { bc: '123456' });
      expect(zpl).toContain('^BY2');
      expect(zpl).toContain(',Y,N,N'); // displayValue: true → Y
      expect(zpl).toContain('^FD123456^FS');
    });

    it('should generate barcode with displayValue false', () => {
      const template = makeTemplate([
        { type: 'barcode', x: 0, y: 0, data: 'BC', options: { displayValue: false } },
      ]);
      const zpl = generateZPL(template, {});
      expect(zpl).toContain(',N,N,N');
    });

    it('should generate barcode with default height', () => {
      const template = makeTemplate([
        { type: 'barcode', x: 0, y: 0, data: 'BC' },
      ]);
      const zpl = generateZPL(template, {});
      const defaultHeight = Math.round((10 / 25.4) * 203);
      expect(zpl).toContain(`^BCN,${defaultHeight}`);
    });

    it('should generate qrcode ZPL commands', () => {
      const template = makeTemplate([
        { type: 'qrcode', x: 38, y: 3, data: '{{qr}}', options: { size: 10 } },
      ]);
      const zpl = generateZPL(template, { qr: 'https://example.com' });
      expect(zpl).toContain('^BQN,2,4'); // Math.round(10 / 2.5) = 4
      expect(zpl).toContain('^FDMM,Ahttps://example.com^FS');
    });

    it('should generate qrcode with default size', () => {
      const template = makeTemplate([
        { type: 'qrcode', x: 0, y: 0, data: 'QR' },
      ]);
      const zpl = generateZPL(template, {});
      expect(zpl).toContain('^BQN,2,4'); // default size 10 / 2.5 = 4
    });

    it('should generate line ZPL commands', () => {
      const template = makeTemplate([
        { type: 'line', x: 5, y: 10, data: '', options: { width: 20, thickness: 3 } },
      ]);
      const zpl = generateZPL(template, {});
      const lineWidth = Math.round((20 / 25.4) * 203);
      expect(zpl).toContain(`^GB${lineWidth},3,3^FS`);
    });

    it('should generate line with default options', () => {
      const template = makeTemplate([
        { type: 'line', x: 0, y: 0, data: '' },
      ]);
      const zpl = generateZPL(template, {});
      const defaultWidth = Math.round((10 / 25.4) * 203);
      expect(zpl).toContain(`^GB${defaultWidth},1,1^FS`);
    });

    it('should generate rect ZPL commands', () => {
      const template = makeTemplate([
        { type: 'rect', x: 1, y: 2, data: '', options: { width: 30, height: 20, borderWidth: 2 } },
      ]);
      const zpl = generateZPL(template, {});
      const rw = Math.round((30 / 25.4) * 203);
      const rh = Math.round((20 / 25.4) * 203);
      expect(zpl).toContain(`^GB${rw},${rh},2^FS`);
    });

    it('should generate rect with default options', () => {
      const template = makeTemplate([
        { type: 'rect', x: 0, y: 0, data: '' },
      ]);
      const zpl = generateZPL(template, {});
      const defaultDim = Math.round((10 / 25.4) * 203);
      expect(zpl).toContain(`^GB${defaultDim},${defaultDim},1^FS`);
    });

    it('should replace template variables in all element types', () => {
      const template = makeTemplate([
        { type: 'text', x: 0, y: 0, data: '{{a}}' },
        { type: 'barcode', x: 0, y: 10, data: '{{b}}' },
        { type: 'qrcode', x: 0, y: 20, data: '{{c}}' },
      ]);
      const zpl = generateZPL(template, { a: 'AAA', b: 'BBB', c: 'CCC' });
      expect(zpl).toContain('^FDAAA^FS');
      expect(zpl).toContain('^FDBBB^FS');
      expect(zpl).toContain('^FDMM,ACCC^FS');
    });

    it('should work with WORK_ORDER_LABEL_TEMPLATE', () => {
      const zpl = generateZPL(WORK_ORDER_LABEL_TEMPLATE, {
        workOrderNumber: 'WO-001',
        productName: 'Assembly X',
        quantity: '100',
        barcode: '9876543210',
      });
      expect(zpl).toContain('^XA');
      expect(zpl).toContain('WORK ORDER');
      expect(zpl).toContain('WO-001');
      expect(zpl).toContain('Assembly X');
      expect(zpl).toContain('Qty: 100');
      expect(zpl).toContain('9876543210');
      expect(zpl).toContain('^XZ');
    });

    it('should handle image element type (no ZPL output for unhandled type)', () => {
      const template = makeTemplate([
        { type: 'image', x: 0, y: 0, data: 'img.png' },
      ]);
      const zpl = generateZPL(template, {});
      // Should just have header and footer, no element commands
      expect(zpl).toMatch(/^\^XA\n\^PW\d+\n\^LL\d+\n\^XZ$/);
    });
  });
});
