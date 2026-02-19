// =============================================================================
// EMAIL PARSER SERVICE
// Parse emails and attachments to extract order data (SO/PO)
// =============================================================================

import { prisma } from '../prisma';
import { logger } from '@/lib/logger';
import { getDocumentOCRService, type OCRResult } from './document-ocr-service';

// =============================================================================
// INTERNAL TYPES
// =============================================================================

/** Sales order draft data */
interface SalesOrderDraftData {
  orderNumber: string;
  customerCode?: string;
  customerName: string;
  customerPO: string;
  orderDate: string;
  requiredDate?: string;
  shippingAddress?: string;
  paymentTerms?: string;
  items: ExtractedLineItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
  currency?: string;
  notes?: string;
}

/** Purchase order draft data */
interface PurchaseOrderDraftData {
  poNumber: string;
  supplierCode?: string;
  supplierName: string;
  quoteReference: string;
  orderDate: string;
  expectedDate?: string;
  leadTimeDays?: number;
  paymentTerms?: string;
  items: ExtractedLineItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
  currency?: string;
  notes?: string;
}

/** Raw OCR extracted item from document */
interface OCRExtractedItem {
  partNumber?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
}

/** Raw AI-parsed order data */
interface ParsedOrderJSON {
  type?: string;
  poNumber?: string;
  customerName?: string;
  contactEmail?: string;
  deliveryDate?: string;
  shippingAddress?: string;
  paymentTerms?: string;
  items?: OCRExtractedItem[];
  totalAmount?: number;
  currency?: string;
  notes?: string;
  quoteNumber?: string;
  supplierName?: string;
  validUntil?: string;
  leadTimeDays?: number;
  moq?: number;
}

// =============================================================================
// TYPES
// =============================================================================

export type EmailType = 'customer_po' | 'supplier_quote' | 'general' | 'unknown';

export interface ParsedEmail {
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  attachments: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  base64Data: string;
}

export interface ExtractedOrderData {
  emailType: EmailType;
  confidence: number;

  // Common fields
  referenceNumber?: string;
  date?: string;

  // Customer PO fields
  customerPO?: {
    poNumber: string;
    customerName: string;
    customerCode?: string;
    contactName?: string;
    contactEmail?: string;
    deliveryDate?: string;
    shippingAddress?: string;
    paymentTerms?: string;
    items: ExtractedLineItem[];
    subtotal?: number;
    tax?: number;
    total?: number;
    currency?: string;
    notes?: string;
  };

  // Supplier Quote fields
  supplierQuote?: {
    quoteNumber: string;
    supplierName: string;
    supplierCode?: string;
    contactName?: string;
    contactEmail?: string;
    validUntil?: string;
    leadTimeDays?: number;
    paymentTerms?: string;
    items: ExtractedLineItem[];
    subtotal?: number;
    tax?: number;
    total?: number;
    currency?: string;
    moq?: number;
    notes?: string;
  };

  // Field confidence scores
  fieldConfidence: Record<string, number>;

  // Warnings/issues
  warnings: string[];
}

export interface ExtractedLineItem {
  lineNumber: number;
  partNumber?: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
  deliveryDate?: string;
  confidence: number;
}

export type DraftOrder = SalesOrderDraft | PurchaseOrderDraft;

interface DraftOrderBase {
  status: 'draft';
  extractedFrom: {
    emailSubject: string;
    emailFrom: string;
    attachmentName?: string;
  };
  confidence: number;
  requiresReview: boolean;
  reviewNotes: string[];
}

export interface SalesOrderDraft extends DraftOrderBase {
  type: 'sales_order';
  data: SalesOrderDraftData;
}

export interface PurchaseOrderDraft extends DraftOrderBase {
  type: 'purchase_order';
  data: PurchaseOrderDraftData;
}

// =============================================================================
// EMAIL PARSER SERVICE
// =============================================================================

class EmailParserService {
  private ocrService = getDocumentOCRService();
  private aiApiKey: string;
  private aiModel: string;

  constructor() {
    this.aiApiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
    this.aiModel = 'gemini-1.5-flash';
  }

  // ===========================================================================
  // PARSE EMAIL
  // ===========================================================================

  async parseEmail(
    emailContent: string,
    attachments: EmailAttachment[] = []
  ): Promise<ExtractedOrderData> {
    const startTime = Date.now();

    // Parse email structure
    const parsedEmail = this.parseEmailStructure(emailContent);

    // Detect email type
    const emailType = await this.detectEmailType(parsedEmail.body, parsedEmail.subject);

    // Extract data based on type
    let extractedData: ExtractedOrderData;

    if (attachments.length > 0) {
      // Process attachments first (more reliable)
      extractedData = await this.extractFromAttachments(attachments, emailType);

      // Augment with email body if needed
      const bodyData = await this.extractFromEmailBody(parsedEmail, emailType);
      extractedData = this.mergeExtractionResults(extractedData, bodyData);
    } else {
      // Extract from email body only
      extractedData = await this.extractFromEmailBody(parsedEmail, emailType);
    }

    // Validate and enrich with database lookups
    extractedData = await this.validateAndEnrich(extractedData);

    // Calculate overall confidence
    extractedData.confidence = this.calculateOverallConfidence(extractedData);

    logger.info(`[EmailParser] Processed in ${Date.now() - startTime}ms, type: ${extractedData.emailType}, confidence: ${extractedData.confidence}`);

    return extractedData;
  }

  // ===========================================================================
  // PARSE EMAIL STRUCTURE
  // ===========================================================================

  private parseEmailStructure(emailContent: string): ParsedEmail {
    // Simple email parsing - handles common formats
    const lines = emailContent.split('\n');
    let subject = '';
    let from = '';
    let to = '';
    let date = '';
    let bodyStart = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.toLowerCase().startsWith('subject:')) {
        subject = line.substring(8).trim();
      } else if (line.toLowerCase().startsWith('from:')) {
        from = line.substring(5).trim();
      } else if (line.toLowerCase().startsWith('to:')) {
        to = line.substring(3).trim();
      } else if (line.toLowerCase().startsWith('date:')) {
        date = line.substring(5).trim();
      } else if (line === '' && i > 0) {
        // Empty line marks end of headers
        bodyStart = i + 1;
        break;
      }
    }

    const body = lines.slice(bodyStart).join('\n').trim();

    return { subject, from, to, date, body, attachments: [] };
  }

  // ===========================================================================
  // DETECT EMAIL TYPE
  // ===========================================================================

  private async detectEmailType(body: string, subject: string): Promise<EmailType> {
    const combinedText = `${subject}\n${body}`.toLowerCase();

    // Customer PO indicators
    const customerPOIndicators = [
      'purchase order',
      'po number',
      'po#',
      'p.o.',
      'order confirmation',
      'đơn đặt hàng',
      'đơn hàng',
      'order #',
    ];

    // Supplier Quote indicators
    const supplierQuoteIndicators = [
      'quotation',
      'quote',
      'báo giá',
      'price quote',
      'rfq response',
      'proposal',
      'offer',
      'pricing',
    ];

    let poScore = 0;
    let quoteScore = 0;

    customerPOIndicators.forEach(indicator => {
      if (combinedText.includes(indicator)) poScore++;
    });

    supplierQuoteIndicators.forEach(indicator => {
      if (combinedText.includes(indicator)) quoteScore++;
    });

    if (poScore > quoteScore && poScore > 0) {
      return 'customer_po';
    } else if (quoteScore > poScore && quoteScore > 0) {
      return 'supplier_quote';
    } else if (poScore > 0 || quoteScore > 0) {
      return 'general';
    }

    return 'unknown';
  }

  // ===========================================================================
  // EXTRACT FROM ATTACHMENTS
  // ===========================================================================

  private async extractFromAttachments(
    attachments: EmailAttachment[],
    expectedType: EmailType
  ): Promise<ExtractedOrderData> {
    const results: ExtractedOrderData[] = [];

    for (const attachment of attachments) {
      // Check if it's an image/PDF we can OCR
      if (this.isOCRCompatible(attachment.contentType)) {
        try {
          const ocrResult = await this.ocrService.processDocument(
            attachment.base64Data,
            expectedType === 'customer_po' ? 'customer_po' :
            expectedType === 'supplier_quote' ? 'supplier_quote' : undefined
          );

          if (ocrResult.success && ocrResult.extractedData) {
            results.push(this.convertOCRToExtracted(ocrResult, attachment.filename));
          }
        } catch (error) {
          logger.warn(`[EmailParser] OCR failed for ${attachment.filename}`, { context: 'email-parser-service', error: String(error) });
        }
      }
    }

    // Merge results from multiple attachments
    if (results.length > 0) {
      return results.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      );
    }

    // Return empty result
    return this.createEmptyResult('unknown');
  }

  private isOCRCompatible(contentType: string): boolean {
    const compatible = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ];
    return compatible.some(type => contentType.toLowerCase().includes(type));
  }

  private convertOCRToExtracted(ocrResult: OCRResult, filename: string): ExtractedOrderData {
    const data = ocrResult.extractedData;
    const type = ocrResult.documentType as EmailType;

    const result: ExtractedOrderData = {
      emailType: type,
      confidence: ocrResult.confidence,
      fieldConfidence: {},
      warnings: ocrResult.warnings || [],
    };

    if (type === 'customer_po' && data && 'poNumber' in data) {
      const lineItems = 'lineItems' in data ? data.lineItems : [];
      result.customerPO = {
        poNumber: data.poNumber || '',
        customerName: data.customerName || '',
        customerCode: data.customerCode,
        contactName: data.customerContact,
        contactEmail: data.customerEmail,
        deliveryDate: data.requiredDate,
        shippingAddress: data.shipToAddress,
        paymentTerms: data.paymentTerms,
        items: (lineItems || []).map((item, idx: number) => ({
          lineNumber: idx + 1,
          partNumber: item.partNumber,
          description: item.description || '',
          quantity: item.quantity || 0,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          confidence: 0.8,
        })),
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        currency: data.currency || 'VND',
        notes: data.notes,
      };
    } else if (type === 'supplier_quote' && data && 'quoteNumber' in data) {
      const lineItems = 'lineItems' in data ? data.lineItems : [];
      result.supplierQuote = {
        quoteNumber: data.quoteNumber || '',
        supplierName: data.supplierName || '',
        supplierCode: data.supplierCode,
        contactName: data.supplierContact,
        contactEmail: data.supplierEmail,
        validUntil: data.validUntil,
        leadTimeDays: data.leadTimeDays,
        paymentTerms: data.paymentTerms,
        items: (lineItems || []).map((item, idx: number) => ({
          lineNumber: idx + 1,
          partNumber: item.partNumber,
          description: item.description || '',
          quantity: item.quantity || 0,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          confidence: 0.8,
        })),
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        currency: data.currency || 'VND',
        notes: data.notes,
      };
    }

    return result;
  }

  // ===========================================================================
  // EXTRACT FROM EMAIL BODY
  // ===========================================================================

  private async extractFromEmailBody(
    email: ParsedEmail,
    emailType: EmailType
  ): Promise<ExtractedOrderData> {
    if (!this.aiApiKey) {
      logger.warn('[EmailParser] No AI API key, using pattern matching only', { context: 'email-parser-service' });
      return this.extractWithPatterns(email, emailType);
    }

    try {
      const prompt = this.buildExtractionPrompt(email, emailType);
      const response = await this.callGeminiAPI(prompt);
      return this.parseAIResponse(response, emailType);
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'email-parser-service', operation: 'aiExtraction' });
      return this.extractWithPatterns(email, emailType);
    }
  }

  private buildExtractionPrompt(email: ParsedEmail, emailType: EmailType): string {
    const typeSpecific = emailType === 'customer_po'
      ? `Extract CUSTOMER PURCHASE ORDER details:
- PO Number
- Customer Name
- Contact info
- Delivery date
- Line items (part number, description, quantity, unit price)
- Total amount
- Payment terms
- Shipping address`
      : emailType === 'supplier_quote'
      ? `Extract SUPPLIER QUOTATION details:
- Quote Number
- Supplier Name
- Contact info
- Valid until date
- Lead time
- Line items (part number, description, quantity, unit price, MOQ)
- Total amount
- Payment terms`
      : `Extract any order-related information`;

    return `You are an expert at extracting structured order data from business emails.

${typeSpecific}

EMAIL:
Subject: ${email.subject}
From: ${email.from}
Date: ${email.date}

Body:
${email.body}

IMPORTANT:
- Extract all line items with their details
- Use null for missing fields, don't make up data
- For Vietnamese text, keep original Vietnamese names
- For prices, extract numeric values only
- Return JSON format

Return a JSON object with the extracted data. For Customer PO:
{
  "type": "customer_po",
  "poNumber": "...",
  "customerName": "...",
  "contactEmail": "...",
  "deliveryDate": "YYYY-MM-DD",
  "items": [
    {"partNumber": "...", "description": "...", "quantity": 0, "unitPrice": 0}
  ],
  "totalAmount": 0,
  "currency": "VND",
  "paymentTerms": "...",
  "notes": "..."
}

For Supplier Quote:
{
  "type": "supplier_quote",
  "quoteNumber": "...",
  "supplierName": "...",
  "contactEmail": "...",
  "validUntil": "YYYY-MM-DD",
  "leadTimeDays": 0,
  "items": [
    {"partNumber": "...", "description": "...", "quantity": 0, "unitPrice": 0, "moq": 0}
  ],
  "totalAmount": 0,
  "currency": "VND",
  "paymentTerms": "...",
  "notes": "..."
}`;
  }

  private async callGeminiAPI(prompt: string): Promise<string> {
    const response = await fetch(
      `${process.env.GOOGLE_AI_API_BASE_URL || 'https://generativelanguage.googleapis.com'}/v1beta/models/${this.aiModel}:generateContent?key=${this.aiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private parseAIResponse(response: string, expectedType: EmailType): ExtractedOrderData {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return this.createEmptyResult(expectedType);
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as ParsedOrderJSON;
      return this.convertParsedToExtracted(parsed, expectedType);
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'email-parser-service', operation: 'parseAIResponse' });
      return this.createEmptyResult(expectedType);
    }
  }

  private convertParsedToExtracted(parsed: ParsedOrderJSON, expectedType: EmailType): ExtractedOrderData {
    const type = parsed.type || expectedType;
    const result: ExtractedOrderData = {
      emailType: type as EmailType,
      confidence: 0.7, // Base confidence for AI extraction
      fieldConfidence: {},
      warnings: [],
    };

    if (type === 'customer_po') {
      result.customerPO = {
        poNumber: parsed.poNumber || '',
        customerName: parsed.customerName || '',
        contactEmail: parsed.contactEmail,
        deliveryDate: parsed.deliveryDate,
        shippingAddress: parsed.shippingAddress,
        paymentTerms: parsed.paymentTerms,
        items: (parsed.items || []).map((item: OCRExtractedItem, idx: number) => ({
          lineNumber: idx + 1,
          partNumber: item.partNumber,
          description: item.description || '',
          quantity: Number(item.quantity) || 0,
          unit: item.unit,
          unitPrice: Number(item.unitPrice) || 0,
          totalPrice: Number(item.totalPrice) || (Number(item.quantity) * Number(item.unitPrice)),
          confidence: 0.7,
        })),
        total: Number(parsed.totalAmount) || 0,
        currency: parsed.currency || 'VND',
        notes: parsed.notes,
      };

      // Set field confidence
      if (parsed.poNumber) result.fieldConfidence['poNumber'] = 0.9;
      if (parsed.customerName) result.fieldConfidence['customerName'] = 0.8;
      if (parsed.items && parsed.items.length > 0) result.fieldConfidence['items'] = 0.7;
    } else if (type === 'supplier_quote') {
      result.supplierQuote = {
        quoteNumber: parsed.quoteNumber || '',
        supplierName: parsed.supplierName || '',
        contactEmail: parsed.contactEmail,
        validUntil: parsed.validUntil,
        leadTimeDays: Number(parsed.leadTimeDays) || 0,
        paymentTerms: parsed.paymentTerms,
        items: (parsed.items || []).map((item: OCRExtractedItem, idx: number) => ({
          lineNumber: idx + 1,
          partNumber: item.partNumber,
          description: item.description || '',
          quantity: Number(item.quantity) || 0,
          unit: item.unit,
          unitPrice: Number(item.unitPrice) || 0,
          totalPrice: Number(item.totalPrice) || (Number(item.quantity) * Number(item.unitPrice)),
          confidence: 0.7,
        })),
        total: Number(parsed.totalAmount) || 0,
        currency: parsed.currency || 'VND',
        moq: Number(parsed.moq) || 0,
        notes: parsed.notes,
      };

      if (parsed.quoteNumber) result.fieldConfidence['quoteNumber'] = 0.9;
      if (parsed.supplierName) result.fieldConfidence['supplierName'] = 0.8;
    }

    return result;
  }

  // ===========================================================================
  // PATTERN MATCHING FALLBACK
  // ===========================================================================

  private extractWithPatterns(email: ParsedEmail, emailType: EmailType): ExtractedOrderData {
    const text = `${email.subject}\n${email.body}`;
    const result = this.createEmptyResult(emailType);

    // Extract PO/Quote number
    const poMatch = text.match(/(?:PO|P\.O\.|Purchase Order|Đơn hàng)[#:\s]*([A-Z0-9-]+)/i);
    const quoteMatch = text.match(/(?:Quote|Quotation|Báo giá)[#:\s]*([A-Z0-9-]+)/i);

    // Extract company name from email
    const fromMatch = email.from.match(/<([^>]+)>/);
    const emailDomain = fromMatch ? fromMatch[1].split('@')[1] : '';

    if (emailType === 'customer_po' || poMatch) {
      result.emailType = 'customer_po';
      result.customerPO = {
        poNumber: poMatch?.[1] || '',
        customerName: this.extractCompanyName(text) || emailDomain || '',
        items: this.extractLineItems(text),
        total: this.extractTotal(text),
        currency: this.extractCurrency(text),
      };
      result.confidence = 0.5;
    } else if (emailType === 'supplier_quote' || quoteMatch) {
      result.emailType = 'supplier_quote';
      result.supplierQuote = {
        quoteNumber: quoteMatch?.[1] || '',
        supplierName: this.extractCompanyName(text) || emailDomain || '',
        items: this.extractLineItems(text),
        total: this.extractTotal(text),
        currency: this.extractCurrency(text),
      };
      result.confidence = 0.5;
    }

    result.warnings.push('Extracted using pattern matching - may need manual review');
    return result;
  }

  private extractCompanyName(text: string): string {
    // Try to find company name patterns
    const patterns = [
      /(?:Company|Công ty|From):\s*([^\n,]+)/i,
      /(?:Customer|Khách hàng):\s*([^\n,]+)/i,
      /(?:Supplier|Nhà cung cấp):\s*([^\n,]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  private extractLineItems(text: string): ExtractedLineItem[] {
    const items: ExtractedLineItem[] = [];

    // Simple pattern for line items
    const lines = text.split('\n');
    let lineNumber = 1;

    for (const line of lines) {
      // Look for patterns like: "PartNumber - Description - Qty - Price"
      const match = line.match(/([A-Z]{2,4}-[A-Z0-9-]+)\s+(.+?)\s+(\d+)\s*(?:x|@|×)?\s*([0-9,]+)/i);
      if (match) {
        items.push({
          lineNumber: lineNumber++,
          partNumber: match[1],
          description: match[2].trim(),
          quantity: parseInt(match[3]),
          unitPrice: parseFloat(match[4].replace(/,/g, '')),
          confidence: 0.5,
        });
      }
    }

    return items;
  }

  private extractTotal(text: string): number {
    const match = text.match(/(?:Total|Tổng|Amount)[:\s]*([0-9,.]+)/i);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
    return 0;
  }

  private extractCurrency(text: string): string {
    if (text.includes('VND') || text.includes('đ')) return 'VND';
    if (text.includes('USD') || text.includes('$')) return 'USD';
    return 'VND'; // Default
  }

  // ===========================================================================
  // VALIDATE AND ENRICH
  // ===========================================================================

  private async validateAndEnrich(data: ExtractedOrderData): Promise<ExtractedOrderData> {
    // Validate customer if PO
    if (data.customerPO?.customerName) {
      const customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { name: { contains: data.customerPO.customerName, mode: 'insensitive' } },
            { code: { contains: data.customerPO.customerName, mode: 'insensitive' } },
          ],
        },
      });

      if (customer) {
        data.customerPO.customerCode = customer.code;
        data.customerPO.customerName = customer.name;
        data.fieldConfidence['customerName'] = 0.95;
      } else {
        data.warnings.push(`Khách hàng "${data.customerPO.customerName}" không tìm thấy trong hệ thống`);
      }

      // Validate line items
      for (const item of data.customerPO.items) {
        if (item.partNumber) {
          const part = await prisma.part.findFirst({
            where: { partNumber: item.partNumber },
          });

          if (part) {
            item.confidence = 0.95;
          } else {
            item.confidence = Math.min(item.confidence, 0.5);
            data.warnings.push(`Part "${item.partNumber}" không tìm thấy trong hệ thống`);
          }
        }
      }
    }

    // Validate supplier if Quote
    if (data.supplierQuote?.supplierName) {
      const supplier = await prisma.supplier.findFirst({
        where: {
          OR: [
            { name: { contains: data.supplierQuote.supplierName, mode: 'insensitive' } },
            { code: { contains: data.supplierQuote.supplierName, mode: 'insensitive' } },
          ],
        },
      });

      if (supplier) {
        data.supplierQuote.supplierCode = supplier.code;
        data.supplierQuote.supplierName = supplier.name;
        data.fieldConfidence['supplierName'] = 0.95;
      } else {
        data.warnings.push(`Nhà cung cấp "${data.supplierQuote.supplierName}" không tìm thấy trong hệ thống`);
      }
    }

    return data;
  }

  // ===========================================================================
  // CREATE DRAFT ORDER
  // ===========================================================================

  async createDraftOrder(extractedData: ExtractedOrderData): Promise<DraftOrder> {
    if (extractedData.emailType === 'customer_po' && extractedData.customerPO) {
      return {
        type: 'sales_order',
        status: 'draft',
        data: {
          orderNumber: `SO-DRAFT-${Date.now()}`,
          customerCode: extractedData.customerPO.customerCode,
          customerName: extractedData.customerPO.customerName,
          customerPO: extractedData.customerPO.poNumber,
          orderDate: new Date().toISOString(),
          requiredDate: extractedData.customerPO.deliveryDate,
          shippingAddress: extractedData.customerPO.shippingAddress,
          paymentTerms: extractedData.customerPO.paymentTerms,
          items: extractedData.customerPO.items,
          subtotal: extractedData.customerPO.subtotal,
          tax: extractedData.customerPO.tax,
          total: extractedData.customerPO.total,
          currency: extractedData.customerPO.currency,
          notes: extractedData.customerPO.notes,
        },
        extractedFrom: {
          emailSubject: '',
          emailFrom: '',
        },
        confidence: extractedData.confidence,
        requiresReview: extractedData.confidence < 0.9 || extractedData.warnings.length > 0,
        reviewNotes: extractedData.warnings,
      };
    } else if (extractedData.emailType === 'supplier_quote' && extractedData.supplierQuote) {
      return {
        type: 'purchase_order',
        status: 'draft',
        data: {
          poNumber: `PO-DRAFT-${Date.now()}`,
          supplierCode: extractedData.supplierQuote.supplierCode,
          supplierName: extractedData.supplierQuote.supplierName,
          quoteReference: extractedData.supplierQuote.quoteNumber,
          orderDate: new Date().toISOString(),
          expectedDate: extractedData.supplierQuote.validUntil,
          leadTimeDays: extractedData.supplierQuote.leadTimeDays,
          paymentTerms: extractedData.supplierQuote.paymentTerms,
          items: extractedData.supplierQuote.items,
          subtotal: extractedData.supplierQuote.subtotal,
          tax: extractedData.supplierQuote.tax,
          total: extractedData.supplierQuote.total,
          currency: extractedData.supplierQuote.currency,
          notes: extractedData.supplierQuote.notes,
        },
        extractedFrom: {
          emailSubject: '',
          emailFrom: '',
        },
        confidence: extractedData.confidence,
        requiresReview: extractedData.confidence < 0.9 || extractedData.warnings.length > 0,
        reviewNotes: extractedData.warnings,
      };
    }

    throw new Error('Unable to create draft order - unknown email type');
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private mergeExtractionResults(primary: ExtractedOrderData, secondary: ExtractedOrderData): ExtractedOrderData {
    // Use primary as base, fill in missing fields from secondary
    const result = { ...primary };

    if (secondary.emailType !== 'unknown' && primary.emailType === 'unknown') {
      result.emailType = secondary.emailType;
    }

    // Merge warnings
    result.warnings = [...new Set([...primary.warnings, ...secondary.warnings])];

    // Merge field confidence
    result.fieldConfidence = { ...secondary.fieldConfidence, ...primary.fieldConfidence };

    return result;
  }

  private createEmptyResult(emailType: EmailType): ExtractedOrderData {
    return {
      emailType,
      confidence: 0,
      fieldConfidence: {},
      warnings: [],
    };
  }

  private calculateOverallConfidence(data: ExtractedOrderData): number {
    const confidences = Object.values(data.fieldConfidence);
    if (confidences.length === 0) return data.confidence;

    const avg = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;

    // Penalize for warnings
    const warningPenalty = Math.min(data.warnings.length * 0.05, 0.2);

    return Math.max(0, avg - warningPenalty);
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let emailParserInstance: EmailParserService | null = null;

export function getEmailParserService(): EmailParserService {
  if (!emailParserInstance) {
    emailParserInstance = new EmailParserService();
  }
  return emailParserInstance;
}

export default EmailParserService;
