import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// HOISTED MOCKS
// =============================================================================

const { mockPrisma, mockOcrService, mockFetch } = vi.hoisted(() => ({
  mockPrisma: {
    customer: { findFirst: vi.fn() },
    supplier: { findFirst: vi.fn() },
    part: { findFirst: vi.fn() },
  },
  mockOcrService: {
    processDocument: vi.fn(),
  },
  mockFetch: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
  },
}));
vi.mock('../document-ocr-service', () => ({
  getDocumentOCRService: () => mockOcrService,
}));

// Mock global fetch
vi.stubGlobal('fetch', mockFetch);

import EmailParserService, { getEmailParserService } from '../email-parser-service';
import type {
  EmailAttachment,
  ExtractedOrderData,
  ExtractedLineItem,
  EmailType,
} from '../email-parser-service';

// =============================================================================
// HELPERS
// =============================================================================

function buildRawEmail(opts: {
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  body?: string;
} = {}): string {
  return [
    `Subject: ${opts.subject || 'Test Email'}`,
    `From: ${opts.from || 'test@example.com'}`,
    `To: ${opts.to || 'us@company.com'}`,
    `Date: ${opts.date || '2026-01-01'}`,
    '',
    opts.body || 'Hello world',
  ].join('\n');
}

function makeAttachment(overrides: Partial<EmailAttachment> = {}): EmailAttachment {
  return {
    filename: 'document.pdf',
    contentType: 'application/pdf',
    base64Data: 'base64data',
    ...overrides,
  };
}

function makeExtractedData(overrides: Partial<ExtractedOrderData> = {}): ExtractedOrderData {
  return {
    emailType: 'customer_po',
    confidence: 0.8,
    fieldConfidence: {},
    warnings: [],
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('EmailParserService', () => {
  let service: EmailParserService;

  beforeEach(() => {
    vi.clearAllMocks();
    // No API key by default — forces pattern matching path
    process.env.GOOGLE_AI_API_KEY = '';
    process.env.GEMINI_API_KEY = '';
    service = new EmailParserService();
  });

  // =========================================================================
  // SINGLETON
  // =========================================================================

  describe('getEmailParserService', () => {
    it('returns a singleton instance', () => {
      const a = getEmailParserService();
      const b = getEmailParserService();
      expect(a).toBe(b);
    });
  });

  // =========================================================================
  // parseEmailStructure (tested indirectly via parseEmail)
  // =========================================================================

  describe('parseEmail — email structure parsing', () => {
    it('extracts subject, from, to, date and body from raw email text', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      mockPrisma.supplier.findFirst.mockResolvedValue(null);

      const email = buildRawEmail({
        subject: 'Purchase Order PO-1234',
        from: 'buyer@acme.com',
        to: 'sales@us.com',
        date: '2026-03-01',
        body: 'Please process this purchase order PO-1234.',
      });

      const result = await service.parseEmail(email);
      // Should detect as customer_po because of "purchase order" + "PO-1234"
      expect(result.emailType).toBe('customer_po');
    });

    it('handles email with no body gracefully', async () => {
      const email = 'Subject: Test\nFrom: a@b.com\n\n';
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      const result = await service.parseEmail(email);
      expect(result).toBeDefined();
      expect(result.emailType).toBeDefined();
    });
  });

  // =========================================================================
  // detectEmailType
  // =========================================================================

  describe('detectEmailType (tested via parseEmail)', () => {
    beforeEach(() => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      mockPrisma.supplier.findFirst.mockResolvedValue(null);
    });

    it('detects customer_po type', async () => {
      const email = buildRawEmail({
        subject: 'Purchase Order #12345',
        body: 'Please find our PO attached.',
      });
      const result = await service.parseEmail(email);
      expect(result.emailType).toBe('customer_po');
    });

    it('detects supplier_quote type', async () => {
      const email = buildRawEmail({
        subject: 'Quotation Q-2026-001',
        body: 'Please find our quotation for the requested items.',
      });
      const result = await service.parseEmail(email);
      expect(result.emailType).toBe('supplier_quote');
    });

    it('returns unknown for unrelated emails', async () => {
      const email = buildRawEmail({
        subject: 'Hello there',
        body: 'Just checking in on the weekend plans.',
      });
      const result = await service.parseEmail(email);
      expect(result.emailType).toBe('unknown');
    });

    it('returns customer_po when PO indicators outnumber quote indicators', async () => {
      const email = buildRawEmail({
        subject: 'Order confirmation',
        body: 'Purchase order PO# 999. Please confirm the order #100.',
      });
      const result = await service.parseEmail(email);
      expect(result.emailType).toBe('customer_po');
    });

    it('returns supplier_quote when quote indicators outnumber PO indicators', async () => {
      // "quotation" matches both "quotation" and "quote" indicators => quoteScore=2
      // "p.o." matches 1 PO indicator => poScore=1
      // But extractWithPatterns can override based on regex matches in the text
      const email = buildRawEmail({
        subject: 'offer and pricing details',
        body: 'Here is the pricing information with an offer.',
      });
      const result = await service.parseEmail(email);
      // "offer" and "pricing" both match supplier quote indicators => supplier_quote
      expect(result.emailType).toBe('supplier_quote');
    });

    it('detects Vietnamese PO text', async () => {
      const email = buildRawEmail({
        subject: 'Đơn đặt hàng mới',
        body: 'Gửi đơn hàng mới cho công ty.',
      });
      const result = await service.parseEmail(email);
      expect(result.emailType).toBe('customer_po');
    });

    it('detects Vietnamese quote text', async () => {
      const email = buildRawEmail({
        subject: 'Báo giá vật tư',
        body: 'Xin gửi báo giá theo yêu cầu.',
      });
      const result = await service.parseEmail(email);
      expect(result.emailType).toBe('supplier_quote');
    });
  });

  // =========================================================================
  // extractFromAttachments
  // =========================================================================

  describe('parseEmail — with attachments', () => {
    it('processes OCR-compatible attachments and uses best result', async () => {
      mockOcrService.processDocument.mockResolvedValue({
        success: true,
        documentType: 'customer_po',
        confidence: 0.9,
        extractedData: {
          poNumber: 'PO-100',
          customerName: 'ACME Corp',
          lineItems: [
            { partNumber: 'PT-001', description: 'Widget', quantity: 10, unitPrice: 100 },
          ],
        },
        warnings: [],
      });
      mockPrisma.customer.findFirst.mockResolvedValue({ code: 'ACME', name: 'ACME Corp' });
      mockPrisma.part.findFirst.mockResolvedValue({ partNumber: 'PT-001' });

      const email = buildRawEmail({ subject: 'Purchase Order attached', body: 'PO attached.' });
      const attachments = [makeAttachment({ contentType: 'application/pdf' })];

      const result = await service.parseEmail(email, attachments);
      expect(result.emailType).toBe('customer_po');
      expect(result.customerPO).toBeDefined();
      expect(result.customerPO?.poNumber).toBe('PO-100');
    });

    it('skips non-OCR-compatible attachments', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      const email = buildRawEmail({ subject: 'Purchase order doc', body: 'See attachment.' });
      const attachments = [makeAttachment({ contentType: 'text/plain' })];

      const result = await service.parseEmail(email, attachments);
      // No OCR result, so falls back to pattern matching
      expect(mockOcrService.processDocument).not.toHaveBeenCalled();
    });

    it('handles OCR failure gracefully', async () => {
      mockOcrService.processDocument.mockRejectedValue(new Error('OCR failed'));
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      const email = buildRawEmail({ subject: 'Purchase order doc', body: 'PO# ABC-123' });
      const attachments = [makeAttachment({ contentType: 'image/png' })];

      const result = await service.parseEmail(email, attachments);
      // Should still return a result from pattern matching fallback
      expect(result).toBeDefined();
    });

    it('handles unsuccessful OCR result', async () => {
      mockOcrService.processDocument.mockResolvedValue({
        success: false,
        documentType: 'unknown',
        confidence: 0,
        extractedData: null,
      });
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      const email = buildRawEmail({ subject: 'Purchase order doc', body: 'PO# DEF-456' });
      const attachments = [makeAttachment({ contentType: 'image/jpeg' })];

      const result = await service.parseEmail(email, attachments);
      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // isOCRCompatible
  // =========================================================================

  describe('isOCRCompatible (tested via attachment processing)', () => {
    const ocrTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

    ocrTypes.forEach((ct) => {
      it(`accepts ${ct}`, async () => {
        mockOcrService.processDocument.mockResolvedValue({
          success: false,
          documentType: 'unknown',
          confidence: 0,
          extractedData: null,
        });
        mockPrisma.customer.findFirst.mockResolvedValue(null);

        const email = buildRawEmail({ subject: 'PO attached', body: 'purchase order' });
        await service.parseEmail(email, [makeAttachment({ contentType: ct })]);
        expect(mockOcrService.processDocument).toHaveBeenCalled();
      });
    });
  });

  // =========================================================================
  // convertOCRToExtracted — supplier_quote branch
  // =========================================================================

  describe('convertOCRToExtracted — supplier_quote', () => {
    it('converts OCR result to supplier quote extracted data', async () => {
      mockOcrService.processDocument.mockResolvedValue({
        success: true,
        documentType: 'supplier_quote',
        confidence: 0.85,
        extractedData: {
          quoteNumber: 'QT-500',
          supplierName: 'Steel Co',
          supplierCode: 'SC-01',
          supplierContact: 'John',
          supplierEmail: 'john@steel.com',
          validUntil: '2026-06-01',
          leadTimeDays: 14,
          paymentTerms: 'Net 30',
          lineItems: [
            { partNumber: 'MAT-01', description: 'Steel Bar', quantity: 100, unit: 'kg', unitPrice: 50, totalPrice: 5000 },
          ],
          subtotal: 5000,
          tax: 500,
          total: 5500,
          currency: 'USD',
          notes: 'FOB factory',
        },
        warnings: ['Minor quality'],
      });
      mockPrisma.supplier.findFirst.mockResolvedValue(null);

      const email = buildRawEmail({ subject: 'Quotation', body: 'Quote attached.' });
      const result = await service.parseEmail(email, [makeAttachment({ contentType: 'image/png' })]);

      expect(result.supplierQuote).toBeDefined();
      expect(result.supplierQuote?.quoteNumber).toBe('QT-500');
      expect(result.supplierQuote?.supplierName).toBe('Steel Co');
      expect(result.supplierQuote?.items).toHaveLength(1);
      expect(result.supplierQuote?.items[0].partNumber).toBe('MAT-01');
    });
  });

  // =========================================================================
  // extractFromEmailBody — AI path
  // =========================================================================

  describe('extractFromEmailBody — with AI API key', () => {
    beforeEach(() => {
      process.env.GOOGLE_AI_API_KEY = 'test-api-key';
      service = new EmailParserService();
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      mockPrisma.supplier.findFirst.mockResolvedValue(null);
    });

    it('calls Gemini API and parses customer_po response', async () => {
      const aiResponse = JSON.stringify({
        type: 'customer_po',
        poNumber: 'PO-AI-001',
        customerName: 'AI Customer',
        contactEmail: 'ai@cust.com',
        deliveryDate: '2026-04-01',
        items: [
          { partNumber: 'PT-X', description: 'Gadget', quantity: 5, unitPrice: 200 },
        ],
        totalAmount: 1000,
        currency: 'USD',
        paymentTerms: 'Net 60',
        notes: 'Rush order',
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: aiResponse }] } }],
        }),
      });

      const email = buildRawEmail({ subject: 'Purchase Order PO-AI-001', body: 'PO details inside.' });
      const result = await service.parseEmail(email);

      expect(result.customerPO).toBeDefined();
      expect(result.customerPO?.poNumber).toBe('PO-AI-001');
      expect(result.customerPO?.items).toHaveLength(1);
      expect(result.customerPO?.items[0].quantity).toBe(5);
      expect(result.fieldConfidence['poNumber']).toBe(0.9);
    });

    it('calls Gemini API and parses supplier_quote response', async () => {
      const aiResponse = JSON.stringify({
        type: 'supplier_quote',
        quoteNumber: 'QT-AI-001',
        supplierName: 'AI Supplier',
        contactEmail: 'ai@supp.com',
        validUntil: '2026-06-01',
        leadTimeDays: 7,
        items: [
          { partNumber: 'MAT-Y', description: 'Material Y', quantity: 50, unitPrice: 10, totalPrice: 500 },
        ],
        totalAmount: 500,
        currency: 'VND',
        paymentTerms: 'COD',
        moq: 25,
        notes: 'Minimum order',
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: aiResponse }] } }],
        }),
      });

      const email = buildRawEmail({ subject: 'Quotation QT-AI-001', body: 'Quote details.' });
      const result = await service.parseEmail(email);

      expect(result.supplierQuote).toBeDefined();
      expect(result.supplierQuote?.quoteNumber).toBe('QT-AI-001');
      expect(result.supplierQuote?.moq).toBe(25);
      expect(result.fieldConfidence['quoteNumber']).toBe(0.9);
    });

    it('falls back to pattern matching on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const email = buildRawEmail({ subject: 'Purchase Order PO-FAIL', body: 'PO# PO-FAIL' });
      const result = await service.parseEmail(email);

      expect(result.warnings).toContain('Extracted using pattern matching - may need manual review');
    });

    it('falls back to pattern matching when AI returns non-JSON', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'I cannot parse this document.' }] } }],
        }),
      });

      const email = buildRawEmail({ subject: 'Purchase Order PO-X', body: 'purchase order stuff' });
      const result = await service.parseEmail(email);
      // parseAIResponse returns empty result, then mergeExtractionResults is used
      expect(result).toBeDefined();
    });

    it('handles fetch throwing an error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const email = buildRawEmail({ subject: 'Purchase Order PO-NET', body: 'PO# PO-NET' });
      const result = await service.parseEmail(email);
      expect(result).toBeDefined();
    });
  });

  // =========================================================================
  // extractWithPatterns (pattern matching fallback)
  // =========================================================================

  describe('extractWithPatterns', () => {
    beforeEach(() => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      mockPrisma.supplier.findFirst.mockResolvedValue(null);
    });

    it('extracts PO number from email body', async () => {
      const email = buildRawEmail({
        subject: 'Order',
        body: 'Purchase Order PO-12345\nCustomer: ACME Corp\nTotal: 5,000',
      });
      const result = await service.parseEmail(email);

      expect(result.emailType).toBe('customer_po');
      expect(result.customerPO?.poNumber).toBe('PO-12345');
    });

    it('extracts quote number from email body', async () => {
      const email = buildRawEmail({
        subject: 'New pricing',
        body: 'Quotation# QT-789\nSupplier: Steel Inc\nTotal: 10000',
      });
      const result = await service.parseEmail(email);

      expect(result.emailType).toBe('supplier_quote');
      expect(result.supplierQuote?.quoteNumber).toBe('QT-789');
    });

    it('extracts company name from various patterns', async () => {
      const email = buildRawEmail({
        subject: 'PO',
        body: 'Purchase Order PO-001\nCompany: Big Corp Ltd\nTotal: 1000',
      });
      const result = await service.parseEmail(email);
      expect(result.customerPO?.customerName).toBe('Big Corp Ltd');
    });

    it('extracts line items with part numbers', async () => {
      const email = buildRawEmail({
        subject: 'Purchase Order',
        body: 'PO# PO-999\nPT-001 Widget Assembly 10 x 500\nPT-002 Bolt Set 20 @ 100',
      });
      const result = await service.parseEmail(email);
      expect(result.customerPO?.items.length).toBeGreaterThanOrEqual(1);
    });

    it('extracts total amount', async () => {
      const email = buildRawEmail({
        subject: 'Purchase Order PO-T',
        body: 'Total: 15,000.50',
      });
      const result = await service.parseEmail(email);
      expect(result.customerPO?.total).toBe(15000.5);
    });

    it('extracts currency VND', async () => {
      const email = buildRawEmail({
        subject: 'Purchase Order PO-C',
        body: 'Total: 1000 VND',
      });
      const result = await service.parseEmail(email);
      expect(result.customerPO?.currency).toBe('VND');
    });

    it('extracts currency USD', async () => {
      const email = buildRawEmail({
        subject: 'Purchase Order PO-C2',
        body: 'Total: $1000 USD',
      });
      const result = await service.parseEmail(email);
      expect(result.customerPO?.currency).toBe('USD');
    });

    it('defaults currency to VND', async () => {
      const email = buildRawEmail({
        subject: 'Purchase Order PO-C3',
        body: 'Total: 1000 EUR only',
      });
      const result = await service.parseEmail(email);
      // EUR not detected, defaults to VND
      expect(result.customerPO?.currency).toBe('VND');
    });

    it('extracts company name from email domain when From header has angle brackets', async () => {
      const email = buildRawEmail({
        subject: 'PO',
        from: 'John <john@acme.com>',
        body: 'Purchase order for items.\nPO# PO-DOM',
      });
      const result = await service.parseEmail(email);
      // Should pick up acme.com as fallback company
      expect(result.customerPO?.customerName).toContain('acme.com');
    });

    it('adds pattern matching warning', async () => {
      const email = buildRawEmail({
        subject: 'Purchase Order PO-W',
        body: 'PO stuff',
      });
      const result = await service.parseEmail(email);
      expect(result.warnings).toContain('Extracted using pattern matching - may need manual review');
    });
  });

  // =========================================================================
  // validateAndEnrich
  // =========================================================================

  describe('validateAndEnrich', () => {
    it('enriches customer data when found in database', async () => {
      process.env.GOOGLE_AI_API_KEY = '';
      service = new EmailParserService();

      mockPrisma.customer.findFirst.mockResolvedValue({
        code: 'ACME-01',
        name: 'ACME Corporation',
      });
      mockPrisma.part.findFirst.mockResolvedValue({ partNumber: 'PT-001' });

      const email = buildRawEmail({
        subject: 'Purchase Order',
        body: 'PO# PO-ENR\nCustomer: ACME\nPT-001 Bolt Set 10 x 100',
      });
      const result = await service.parseEmail(email);

      expect(result.customerPO?.customerCode).toBe('ACME-01');
      expect(result.customerPO?.customerName).toBe('ACME Corporation');
      expect(result.fieldConfidence['customerName']).toBe(0.95);
    });

    it('adds warning when customer not found', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      const email = buildRawEmail({
        subject: 'Purchase Order',
        body: 'PO# PO-NF\nCustomer: Unknown Corp',
      });
      const result = await service.parseEmail(email);

      expect(result.warnings.some((w: string) => w.includes('không tìm thấy'))).toBe(true);
    });

    it('adds warning when part not found', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({ code: 'C1', name: 'C1' });
      mockPrisma.part.findFirst.mockResolvedValue(null);

      const email = buildRawEmail({
        subject: 'Purchase Order',
        body: 'PO# PO-PNF\nCustomer: C1\nPT-999 Unknown Part 5 x 50',
      });
      const result = await service.parseEmail(email);

      const partWarning = result.warnings.find((w: string) => w.includes('PT-999'));
      expect(partWarning).toBeDefined();
    });

    it('enriches supplier data when found in database', async () => {
      mockPrisma.supplier.findFirst.mockResolvedValue({
        code: 'SUP-01',
        name: 'Steel Supplier Inc',
      });

      const email = buildRawEmail({
        subject: 'Quotation',
        body: 'Quote# QT-ENR\nSupplier: Steel',
      });
      const result = await service.parseEmail(email);

      expect(result.supplierQuote?.supplierCode).toBe('SUP-01');
      expect(result.supplierQuote?.supplierName).toBe('Steel Supplier Inc');
      expect(result.fieldConfidence['supplierName']).toBe(0.95);
    });

    it('adds warning when supplier not found', async () => {
      mockPrisma.supplier.findFirst.mockResolvedValue(null);

      const email = buildRawEmail({
        subject: 'Quotation',
        body: 'Quote# QT-SNF\nSupplier: Ghost Supplier',
      });
      const result = await service.parseEmail(email);

      expect(result.warnings.some((w: string) => w.includes('Nhà cung cấp'))).toBe(true);
    });
  });

  // =========================================================================
  // calculateOverallConfidence
  // =========================================================================

  describe('confidence calculation', () => {
    it('penalizes confidence for warnings', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      mockPrisma.part.findFirst.mockResolvedValue(null);

      // Two pattern-match warnings + customer not found + part not found
      const email = buildRawEmail({
        subject: 'Purchase Order',
        body: 'PO# PO-CONF\nCustomer: Unknown\nPT-999 Part 5 x 50',
      });
      const result = await service.parseEmail(email);

      // With warnings, confidence should be reduced
      expect(result.confidence).toBeLessThan(1.0);
    });

    it('returns base confidence when no fieldConfidence entries', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      const email = buildRawEmail({
        subject: 'Hello',
        body: 'Nothing relevant here.',
      });
      const result = await service.parseEmail(email);

      expect(result.confidence).toBeDefined();
    });
  });

  // =========================================================================
  // createDraftOrder
  // =========================================================================

  describe('createDraftOrder', () => {
    it('creates a sales_order draft from customer_po data', async () => {
      const extractedData: ExtractedOrderData = {
        emailType: 'customer_po',
        confidence: 0.85,
        fieldConfidence: { poNumber: 0.9 },
        warnings: [],
        customerPO: {
          poNumber: 'PO-DRAFT-1',
          customerName: 'Draft Customer',
          customerCode: 'DC-01',
          deliveryDate: '2026-04-01',
          shippingAddress: '123 Street',
          paymentTerms: 'Net 30',
          items: [
            { lineNumber: 1, description: 'Item 1', quantity: 10, confidence: 0.9 },
          ],
          subtotal: 1000,
          tax: 100,
          total: 1100,
          currency: 'VND',
          notes: 'Test note',
        },
      };

      const draft = await service.createDraftOrder(extractedData);

      expect(draft.type).toBe('sales_order');
      expect(draft.status).toBe('draft');
      expect((draft.data as any).customerName).toBe('Draft Customer');
      expect(draft.confidence).toBe(0.85);
      expect(draft.requiresReview).toBe(true); // confidence < 0.9
    });

    it('creates a purchase_order draft from supplier_quote data', async () => {
      const extractedData: ExtractedOrderData = {
        emailType: 'supplier_quote',
        confidence: 0.92,
        fieldConfidence: { quoteNumber: 0.9 },
        warnings: [],
        supplierQuote: {
          quoteNumber: 'QT-DRAFT-1',
          supplierName: 'Draft Supplier',
          supplierCode: 'DS-01',
          validUntil: '2026-06-01',
          leadTimeDays: 14,
          paymentTerms: 'COD',
          items: [
            { lineNumber: 1, description: 'Material A', quantity: 100, confidence: 0.8 },
          ],
          subtotal: 5000,
          tax: 500,
          total: 5500,
          currency: 'USD',
          notes: 'Urgent',
        },
      };

      const draft = await service.createDraftOrder(extractedData);

      expect(draft.type).toBe('purchase_order');
      expect(draft.status).toBe('draft');
      if (draft.type === 'purchase_order') {
        expect(draft.data.supplierName).toBe('Draft Supplier');
        expect(draft.data.leadTimeDays).toBe(14);
      }
    });

    it('requires review when warnings exist even with high confidence', async () => {
      const extractedData: ExtractedOrderData = {
        emailType: 'customer_po',
        confidence: 0.95,
        fieldConfidence: {},
        warnings: ['Some warning'],
        customerPO: {
          poNumber: 'PO-W',
          customerName: 'Cust',
          items: [],
        },
      };

      const draft = await service.createDraftOrder(extractedData);
      expect(draft.requiresReview).toBe(true);
    });

    it('does not require review when confidence >= 0.9 and no warnings', async () => {
      const extractedData: ExtractedOrderData = {
        emailType: 'customer_po',
        confidence: 0.95,
        fieldConfidence: {},
        warnings: [],
        customerPO: {
          poNumber: 'PO-OK',
          customerName: 'Good Cust',
          items: [],
        },
      };

      const draft = await service.createDraftOrder(extractedData);
      expect(draft.requiresReview).toBe(false);
    });

    it('throws on unknown email type', async () => {
      const extractedData: ExtractedOrderData = {
        emailType: 'unknown',
        confidence: 0,
        fieldConfidence: {},
        warnings: [],
      };

      await expect(service.createDraftOrder(extractedData)).rejects.toThrow(
        'Unable to create draft order'
      );
    });

    it('throws when emailType is customer_po but customerPO is undefined', async () => {
      const extractedData: ExtractedOrderData = {
        emailType: 'customer_po',
        confidence: 0.5,
        fieldConfidence: {},
        warnings: [],
        // no customerPO field
      };

      await expect(service.createDraftOrder(extractedData)).rejects.toThrow(
        'Unable to create draft order'
      );
    });
  });

  // =========================================================================
  // mergeExtractionResults
  // =========================================================================

  describe('mergeExtractionResults (tested via parseEmail with attachments)', () => {
    it('merges attachment and body results, deduplicating warnings', async () => {
      mockOcrService.processDocument.mockResolvedValue({
        success: true,
        documentType: 'unknown',
        confidence: 0.6,
        extractedData: {
          poNumber: 'PO-MERGE',
          customerName: 'Merge Corp',
          lineItems: [],
        },
        warnings: ['OCR warning'],
      });
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      const email = buildRawEmail({
        subject: 'Purchase Order',
        body: 'PO# PO-MERGE\nCustomer: Merge Corp',
      });
      const result = await service.parseEmail(email, [
        makeAttachment({ contentType: 'image/png' }),
      ]);

      // Should have merged warnings without duplicates
      const uniqueWarnings = [...new Set(result.warnings)];
      expect(result.warnings.length).toBe(uniqueWarnings.length);
    });

    it('uses secondary emailType when primary is unknown', async () => {
      // OCR returns unknown type
      mockOcrService.processDocument.mockResolvedValue({
        success: true,
        documentType: 'unknown',
        confidence: 0.3,
        extractedData: null,
        warnings: [],
      });
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      const email = buildRawEmail({
        subject: 'Purchase Order PO-SEC',
        body: 'PO# PO-SEC stuff',
      });
      const result = await service.parseEmail(email, [
        makeAttachment({ contentType: 'image/png' }),
      ]);

      // Body extraction detects customer_po, and since primary was unknown it should adopt it
      expect(result.emailType).toBe('customer_po');
    });
  });

  // =========================================================================
  // buildExtractionPrompt
  // =========================================================================

  describe('buildExtractionPrompt branches (tested via AI path)', () => {
    beforeEach(() => {
      process.env.GOOGLE_AI_API_KEY = 'key';
      service = new EmailParserService();
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      mockPrisma.supplier.findFirst.mockResolvedValue(null);
    });

    it('builds customer_po prompt', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{}' }] } }],
        }),
      });

      const email = buildRawEmail({ subject: 'Purchase Order PO-P', body: 'PO details' });
      await service.parseEmail(email);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const promptText = callBody.contents[0].parts[0].text;
      expect(promptText).toContain('CUSTOMER PURCHASE ORDER');
    });

    it('builds supplier_quote prompt', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{}' }] } }],
        }),
      });

      const email = buildRawEmail({ subject: 'Quotation Q-1', body: 'Quote details' });
      await service.parseEmail(email);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const promptText = callBody.contents[0].parts[0].text;
      expect(promptText).toContain('SUPPLIER QUOTATION');
    });

    it('builds general prompt for unknown type', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{}' }] } }],
        }),
      });

      const email = buildRawEmail({ subject: 'General stuff', body: 'Nothing specific' });
      await service.parseEmail(email);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const promptText = callBody.contents[0].parts[0].text;
      expect(promptText).toContain('order-related information');
    });
  });

  // =========================================================================
  // callGeminiAPI
  // =========================================================================

  describe('callGeminiAPI — empty response', () => {
    it('handles missing candidates in response', async () => {
      process.env.GOOGLE_AI_API_KEY = 'key';
      service = new EmailParserService();
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}), // no candidates
      });

      const email = buildRawEmail({ subject: 'PO Purchase Order', body: 'PO body' });
      const result = await service.parseEmail(email);
      expect(result).toBeDefined();
    });
  });
});
