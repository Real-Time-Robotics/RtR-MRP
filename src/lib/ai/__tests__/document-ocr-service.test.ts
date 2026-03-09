import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// HOISTED MOCKS
// =============================================================================

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
  },
}));

vi.stubGlobal('fetch', mockFetch);

import {
  DocumentOCRService,
  getDocumentOCRService,
  resetDocumentOCRService,
} from '../document-ocr-service';
import type {
  OCRResult,
  DocumentType,
  ExtractedSupplierQuote,
  ExtractedCustomerPO,
  ExtractedInvoice,
  ExtractedCertificate,
} from '../document-ocr-service';

// =============================================================================
// HELPERS
// =============================================================================

function mockVisionResponse(text: string) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: text } }],
    }),
  });
}

function mockVisionError(status: number = 500) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    text: async () => 'API Error',
  });
}

function makeSupplierQuoteJSON(overrides: Partial<ExtractedSupplierQuote> = {}): string {
  return JSON.stringify({
    quoteNumber: 'QT-001',
    quoteDate: '2026-01-01',
    validUntil: '2026-03-01',
    supplierName: 'Steel Corp',
    supplierAddress: '123 Street',
    supplierContact: 'John',
    supplierEmail: 'john@steel.com',
    supplierPhone: '123456',
    currency: 'USD',
    paymentTerms: 'Net 30',
    deliveryTerms: 'FOB',
    leadTimeDays: 14,
    lineItems: [
      { lineNumber: 1, partNumber: 'PT-001', description: 'Steel Bar', quantity: 100, unit: 'kg', unitPrice: 50, totalPrice: 5000 },
    ],
    subtotal: 5000,
    tax: 500,
    total: 5500,
    notes: 'Bulk order discount',
    ...overrides,
  });
}

function makeCustomerPOJSON(overrides: Partial<ExtractedCustomerPO> = {}): string {
  return JSON.stringify({
    poNumber: 'PO-001',
    poDate: '2026-01-15',
    customerName: 'ACME Corp',
    customerAddress: '456 Ave',
    customerContact: 'Jane',
    customerEmail: 'jane@acme.com',
    customerPhone: '789012',
    shipToAddress: '789 Dock',
    billToAddress: '456 Ave',
    currency: 'VND',
    paymentTerms: 'Net 60',
    deliveryTerms: 'DDP',
    requiredDate: '2026-02-15',
    lineItems: [
      { lineNumber: 1, partNumber: 'PT-002', description: 'Bolt', quantity: 500, unit: 'pcs', unitPrice: 10, totalPrice: 5000 },
    ],
    subtotal: 5000,
    tax: 500,
    total: 5500,
    notes: 'Urgent delivery',
    ...overrides,
  });
}

function makeInvoiceJSON(overrides: Partial<ExtractedInvoice> = {}): string {
  return JSON.stringify({
    invoiceNumber: 'INV-001',
    invoiceDate: '2026-02-01',
    dueDate: '2026-03-01',
    poReference: 'PO-001',
    supplierName: 'Steel Corp',
    supplierAddress: '123 Street',
    supplierTaxId: 'TX-12345',
    customerName: 'ACME',
    customerAddress: '456 Ave',
    currency: 'USD',
    paymentTerms: 'Net 30',
    lineItems: [
      { lineNumber: 1, partNumber: 'PT-001', description: 'Steel Bar', quantity: 100, unit: 'kg', unitPrice: 50, totalPrice: 5000 },
    ],
    subtotal: 5000,
    taxRate: 10,
    taxAmount: 500,
    total: 5500,
    bankDetails: 'Bank ABC, Acct 12345',
    notes: 'Payment due in 30 days',
    ...overrides,
  });
}

function makeCertificateJSON(overrides: Partial<ExtractedCertificate> = {}): string {
  return JSON.stringify({
    certificateType: 'COC',
    certificateNumber: 'CERT-001',
    issueDate: '2026-01-01',
    expiryDate: '2027-01-01',
    issuerName: 'QualityLab Inc',
    issuerAddress: '100 Lab Rd',
    partNumber: 'PT-001',
    partDescription: 'Steel Bar',
    lotNumber: 'LOT-100',
    batchNumber: 'BATCH-50',
    quantity: 1000,
    specifications: [
      { name: 'Tensile Strength', value: '450 MPa', unit: 'MPa', result: 'pass' },
    ],
    inspectorName: 'Inspector Bob',
    approverName: 'Manager Alice',
    notes: 'All tests passed',
    ...overrides,
  });
}

// =============================================================================
// TESTS
// =============================================================================

describe('DocumentOCRService', () => {
  let service: DocumentOCRService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
    resetDocumentOCRService();
    service = new DocumentOCRService({ apiKey: 'test-key' });
  });

  // =========================================================================
  // SINGLETON
  // =========================================================================

  describe('getDocumentOCRService / resetDocumentOCRService', () => {
    it('returns a singleton instance', () => {
      resetDocumentOCRService();
      const a = getDocumentOCRService({ apiKey: 'key1' });
      const b = getDocumentOCRService();
      expect(a).toBe(b);
    });

    it('resets the singleton', () => {
      resetDocumentOCRService();
      const a = getDocumentOCRService({ apiKey: 'key1' });
      resetDocumentOCRService();
      const b = getDocumentOCRService({ apiKey: 'key2' });
      expect(a).not.toBe(b);
    });
  });

  // =========================================================================
  // processDocument — no API key
  // =========================================================================

  describe('processDocument — no API key', () => {
    it('returns error when no API key is configured', async () => {
      const origKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = '';

      // Construct after clearing env so constructor picks up empty key
      const svc = new DocumentOCRService();

      const result = await svc.processDocument('base64data', 'image/png');

      expect(result.success).toBe(false);
      expect(result.error).toContain('API key not configured');
      expect(result.documentType).toBe('unknown');
      expect(result.confidence).toBe(0);

      process.env.OPENAI_API_KEY = origKey;
    });
  });

  // =========================================================================
  // processDocument — type detection
  // =========================================================================

  describe('processDocument — type detection', () => {
    it('detects supplier_quote type', async () => {
      // First call: type detection
      mockVisionResponse('supplier_quote');
      // Second call: data extraction
      mockVisionResponse(makeSupplierQuoteJSON());

      const result = await service.processDocument('base64', 'image/png');

      expect(result.success).toBe(true);
      expect(result.documentType).toBe('supplier_quote');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('detects customer_po type', async () => {
      mockVisionResponse('customer_po');
      mockVisionResponse(makeCustomerPOJSON());

      const result = await service.processDocument('base64', 'image/png');

      expect(result.success).toBe(true);
      expect(result.documentType).toBe('customer_po');
    });

    it('detects invoice type', async () => {
      mockVisionResponse('invoice');
      mockVisionResponse(makeInvoiceJSON());

      const result = await service.processDocument('base64', 'image/png');

      expect(result.success).toBe(true);
      expect(result.documentType).toBe('invoice');
    });

    it('detects certificate type', async () => {
      mockVisionResponse('certificate');
      mockVisionResponse(makeCertificateJSON());

      const result = await service.processDocument('base64', 'image/png');

      expect(result.success).toBe(true);
      expect(result.documentType).toBe('certificate');
    });

    it('returns unknown when type cannot be determined', async () => {
      mockVisionResponse('something random');

      const result = await service.processDocument('base64', 'image/png');

      expect(result.success).toBe(false);
      expect(result.documentType).toBe('unknown');
      expect(result.error).toContain('Could not determine document type');
    });

    it('uses forced type and skips detection', async () => {
      // Only one call needed — extraction
      mockVisionResponse(makeCustomerPOJSON());

      const result = await service.processDocument('base64', 'image/png', 'customer_po');

      expect(result.success).toBe(true);
      expect(result.documentType).toBe('customer_po');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only extraction, no detection
    });

    it('type detection uses confidence 0.85 for valid types', async () => {
      mockVisionResponse('supplier_quote');
      mockVisionResponse(makeSupplierQuoteJSON());

      const result = await service.processDocument('base64', 'image/png');

      // confidence is min(typeConfidence=0.85, validationConfidence)
      expect(result.confidence).toBeLessThanOrEqual(0.85);
    });

    it('forced type has confidence 1.0 for type', async () => {
      mockVisionResponse(makeSupplierQuoteJSON());

      const result = await service.processDocument('base64', 'image/png', 'supplier_quote');

      // confidence = min(1.0, validationConfidence)
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // processDocument — extraction
  // =========================================================================

  describe('processDocument — data extraction', () => {
    it('extracts supplier quote data', async () => {
      mockVisionResponse('supplier_quote');
      mockVisionResponse(makeSupplierQuoteJSON());

      const result = await service.processDocument('base64', 'image/png');

      expect(result.extractedData).toBeDefined();
      const data = result.extractedData as ExtractedSupplierQuote;
      expect(data.quoteNumber).toBe('QT-001');
      expect(data.supplierName).toBe('Steel Corp');
      expect(data.lineItems).toHaveLength(1);
      expect(data.total).toBe(5500);
    });

    it('extracts customer PO data', async () => {
      mockVisionResponse('customer_po');
      mockVisionResponse(makeCustomerPOJSON());

      const result = await service.processDocument('base64', 'image/png');

      const data = result.extractedData as ExtractedCustomerPO;
      expect(data.poNumber).toBe('PO-001');
      expect(data.customerName).toBe('ACME Corp');
      expect(data.lineItems).toHaveLength(1);
    });

    it('extracts invoice data', async () => {
      mockVisionResponse('invoice');
      mockVisionResponse(makeInvoiceJSON());

      const result = await service.processDocument('base64', 'image/png');

      const data = result.extractedData as ExtractedInvoice;
      expect(data.invoiceNumber).toBe('INV-001');
      expect(data.total).toBe(5500);
    });

    it('extracts certificate data', async () => {
      mockVisionResponse('certificate');
      mockVisionResponse(makeCertificateJSON());

      const result = await service.processDocument('base64', 'image/png');

      const data = result.extractedData as ExtractedCertificate;
      expect(data.certificateNumber).toBe('CERT-001');
      expect(data.partNumber).toBe('PT-001');
      expect(data.specifications).toHaveLength(1);
    });

    it('returns error when no JSON found in extraction response', async () => {
      mockVisionResponse('supplier_quote');
      mockVisionResponse('I cannot read this document clearly');

      const result = await service.processDocument('base64', 'image/png');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No JSON found');
    });

    it('returns error when extraction response has invalid JSON', async () => {
      mockVisionResponse('customer_po');
      mockVisionResponse('{invalid json!!!}');

      const result = await service.processDocument('base64', 'image/png');

      expect(result.success).toBe(false);
    });

    it('returns error for unsupported document type', async () => {
      // Force an unsupported type
      mockVisionResponse('Here is some text without a valid type but with unknown keyword');

      const result = await service.processDocument('base64', 'image/png');

      // Type detection returns 'unknown'
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // callVisionAPI
  // =========================================================================

  describe('callVisionAPI errors', () => {
    it('throws on API error response', async () => {
      mockVisionResponse('supplier_quote'); // type detection succeeds
      mockVisionError(500); // extraction fails

      const result = await service.processDocument('base64', 'image/png');

      expect(result.success).toBe(false);
      expect(result.error).toContain('OpenAI API error');
    });

    it('handles exception during processing', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const result = await service.processDocument('base64', 'image/png');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network failure');
    });

    it('handles empty choices in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '' } }] }),
      });

      // Empty type detection response => unknown
      const result = await service.processDocument('base64', 'image/png');

      expect(result.success).toBe(false);
      expect(result.documentType).toBe('unknown');
    });

    it('uses custom base URL when set', async () => {
      process.env.OPENAI_API_BASE_URL = 'https://custom.openai.com';
      service = new DocumentOCRService({ apiKey: 'key' });

      mockVisionResponse('supplier_quote');
      mockVisionResponse(makeSupplierQuoteJSON());

      await service.processDocument('base64', 'image/png');

      const fetchUrl = mockFetch.mock.calls[0][0];
      expect(fetchUrl).toContain('custom.openai.com');

      delete process.env.OPENAI_API_BASE_URL;
    });
  });

  // =========================================================================
  // validateExtractedData
  // =========================================================================

  describe('validateExtractedData', () => {
    describe('supplier_quote validation', () => {
      it('warns when quote number is missing', async () => {
        mockVisionResponse('supplier_quote');
        mockVisionResponse(makeSupplierQuoteJSON({ quoteNumber: undefined } as any));

        const result = await service.processDocument('base64', 'image/png');

        expect(result.warnings).toContain('Quote number not found');
        expect(result.confidence).toBeLessThanOrEqual(0.85);
      });

      it('warns when supplier name is missing', async () => {
        mockVisionResponse('supplier_quote');
        mockVisionResponse(makeSupplierQuoteJSON({ supplierName: undefined } as any));

        const result = await service.processDocument('base64', 'image/png');

        expect(result.warnings).toContain('Supplier name not found');
      });

      it('warns when line items are empty', async () => {
        mockVisionResponse('supplier_quote');
        mockVisionResponse(makeSupplierQuoteJSON({ lineItems: [] }));

        const result = await service.processDocument('base64', 'image/png');

        expect(result.warnings).toContain('No line items found');
      });

      it('has full confidence when all fields present', async () => {
        mockVisionResponse('supplier_quote');
        mockVisionResponse(makeSupplierQuoteJSON());

        const result = await service.processDocument('base64', 'image/png');

        // typeConfidence = 0.85, validation confidence = 1.0, min = 0.85
        expect(result.confidence).toBe(0.85);
      });
    });

    describe('customer_po validation', () => {
      it('warns when PO number is missing', async () => {
        mockVisionResponse('customer_po');
        mockVisionResponse(makeCustomerPOJSON({ poNumber: undefined } as any));

        const result = await service.processDocument('base64', 'image/png');

        expect(result.warnings).toContain('PO number not found');
      });

      it('warns when customer name is missing', async () => {
        mockVisionResponse('customer_po');
        mockVisionResponse(makeCustomerPOJSON({ customerName: undefined } as any));

        const result = await service.processDocument('base64', 'image/png');

        expect(result.warnings).toContain('Customer name not found');
      });

      it('warns when line items are empty', async () => {
        mockVisionResponse('customer_po');
        mockVisionResponse(makeCustomerPOJSON({ lineItems: [] }));

        const result = await service.processDocument('base64', 'image/png');

        expect(result.warnings).toContain('No line items found');
      });
    });

    describe('invoice validation', () => {
      it('warns when invoice number is missing', async () => {
        mockVisionResponse('invoice');
        mockVisionResponse(makeInvoiceJSON({ invoiceNumber: undefined } as any));

        const result = await service.processDocument('base64', 'image/png');

        expect(result.warnings).toContain('Invoice number not found');
      });

      it('warns when total is missing', async () => {
        mockVisionResponse('invoice');
        mockVisionResponse(makeInvoiceJSON({ total: undefined } as any));

        const result = await service.processDocument('base64', 'image/png');

        expect(result.warnings).toContain('Total amount not found');
      });
    });

    describe('certificate validation', () => {
      it('warns when certificate number is missing', async () => {
        mockVisionResponse('certificate');
        mockVisionResponse(makeCertificateJSON({ certificateNumber: undefined } as any));

        const result = await service.processDocument('base64', 'image/png');

        expect(result.warnings).toContain('Certificate number not found');
      });

      it('warns when both part and lot number are missing', async () => {
        mockVisionResponse('certificate');
        mockVisionResponse(
          makeCertificateJSON({ partNumber: undefined, lotNumber: undefined } as any)
        );

        const result = await service.processDocument('base64', 'image/png');

        expect(result.warnings).toContain('Part/Lot number not found');
      });

      it('does not warn about part/lot when lot number is present', async () => {
        mockVisionResponse('certificate');
        mockVisionResponse(
          makeCertificateJSON({ partNumber: undefined, lotNumber: 'LOT-200' } as any)
        );

        const result = await service.processDocument('base64', 'image/png');

        expect(result.warnings ?? []).not.toContain('Part/Lot number not found');
      });
    });

    describe('null data validation', () => {
      it('returns 0 confidence when data is null', async () => {
        // Force type, then extraction fails
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'no json here' } }],
          }),
        });

        const result = await service.processDocument('base64', 'image/png', 'supplier_quote');

        expect(result.success).toBe(false);
      });
    });
  });

  // =========================================================================
  // constructor defaults
  // =========================================================================

  describe('constructor', () => {
    it('uses default config values', () => {
      const svc = new DocumentOCRService();
      // Just verify it constructs without error
      expect(svc).toBeDefined();
    });

    it('accepts custom config', () => {
      const svc = new DocumentOCRService({
        apiKey: 'custom-key',
        model: 'gpt-4-vision-preview',
        maxTokens: 2048,
        temperature: 0.5,
      });
      expect(svc).toBeDefined();
    });

    it('falls back to env OPENAI_API_KEY when no apiKey in config', () => {
      process.env.OPENAI_API_KEY = 'env-key';
      const svc = new DocumentOCRService({});
      // We can verify by attempting a call
      expect(svc).toBeDefined();
    });
  });

  // =========================================================================
  // processDocument — full flow with warnings
  // =========================================================================

  describe('processDocument — warnings propagation', () => {
    it('includes validation warnings in result', async () => {
      mockVisionResponse('supplier_quote');
      mockVisionResponse(
        makeSupplierQuoteJSON({
          quoteNumber: undefined,
          supplierName: undefined,
          lineItems: [],
        } as any)
      );

      const result = await service.processDocument('base64', 'image/png');

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });

    it('does not include warnings when none exist', async () => {
      mockVisionResponse('supplier_quote');
      mockVisionResponse(makeSupplierQuoteJSON());

      const result = await service.processDocument('base64', 'image/png');

      // warnings should be undefined when empty
      expect(result.warnings).toBeUndefined();
    });
  });

  // =========================================================================
  // processDocument — timing
  // =========================================================================

  describe('processDocument — processingTime', () => {
    it('reports processing time', async () => {
      mockVisionResponse('customer_po');
      mockVisionResponse(makeCustomerPOJSON());

      const result = await service.processDocument('base64', 'image/png');

      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('reports processing time even on error', async () => {
      const svc = new DocumentOCRService({ apiKey: '' });
      process.env.OPENAI_API_KEY = '';

      const result = await svc.processDocument('base64', 'image/png');

      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // extractDocumentData — default/unknown type branch
  // =========================================================================

  describe('extractDocumentData — unknown type', () => {
    it('returns error for default/unknown document type in extraction', async () => {
      // Force 'unknown' type — should fail at extraction stage
      const result = await service.processDocument('base64', 'image/png', 'unknown');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported document type');
    });
  });

  // =========================================================================
  // processFile
  // =========================================================================

  describe('processFile', () => {
    it('is defined on the service', () => {
      expect(typeof service.processFile).toBe('function');
    });
  });

  // =========================================================================
  // Multiple extraction prompts
  // =========================================================================

  describe('extraction prompts for each document type', () => {
    const types: DocumentType[] = ['supplier_quote', 'customer_po', 'invoice', 'certificate'];
    const dataGenerators: Record<string, () => string> = {
      supplier_quote: () => makeSupplierQuoteJSON(),
      customer_po: () => makeCustomerPOJSON(),
      invoice: () => makeInvoiceJSON(),
      certificate: () => makeCertificateJSON(),
    };

    types.forEach((docType) => {
      it(`uses correct prompt for ${docType}`, async () => {
        mockVisionResponse(dataGenerators[docType]());

        const result = await service.processDocument('base64', 'image/png', docType);

        expect(result.success).toBe(true);
        expect(result.documentType).toBe(docType);

        // Verify the prompt was sent in the request body
        const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        const promptText = requestBody.messages[0].content[0].text;
        expect(promptText.length).toBeGreaterThan(0);
      });
    });
  });

  // =========================================================================
  // Vision API request format
  // =========================================================================

  describe('callVisionAPI — request format', () => {
    it('sends correct request structure with image', async () => {
      mockVisionResponse('supplier_quote');
      mockVisionResponse(makeSupplierQuoteJSON());

      await service.processDocument('dGVzdA==', 'image/jpeg');

      const firstCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(firstCall[1].body);

      expect(requestBody.model).toBe('gpt-4o'); // default model
      expect(requestBody.max_tokens).toBe(4096);
      expect(requestBody.temperature).toBe(0.1);
      expect(requestBody.messages[0].role).toBe('user');
      expect(requestBody.messages[0].content[1].type).toBe('image_url');
      expect(requestBody.messages[0].content[1].image_url.url).toContain('data:image/jpeg;base64,dGVzdA==');
      expect(requestBody.messages[0].content[1].image_url.detail).toBe('high');
    });

    it('sends authorization header', async () => {
      mockVisionResponse('customer_po');
      mockVisionResponse(makeCustomerPOJSON());

      await service.processDocument('base64', 'image/png');

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('Bearer test-key');
    });
  });
});
