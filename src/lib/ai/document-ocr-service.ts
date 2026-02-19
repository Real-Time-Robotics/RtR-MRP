// =============================================================================
// DOCUMENT OCR SERVICE
// Extracts structured data from documents using AI Vision
// Supports: Supplier Quotes, Purchase Orders, Invoices, Certificates
// =============================================================================

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export type DocumentType = 'supplier_quote' | 'customer_po' | 'invoice' | 'certificate' | 'unknown';

export interface ExtractedLineItem {
  lineNumber?: number;
  partNumber?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
  deliveryDate?: string;
  notes?: string;
}

export interface ExtractedSupplierQuote {
  documentType: 'supplier_quote';
  quoteNumber?: string;
  quoteDate?: string;
  validUntil?: string;
  supplierName?: string;
  supplierCode?: string;
  supplierAddress?: string;
  supplierContact?: string;
  supplierEmail?: string;
  supplierPhone?: string;
  currency?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  leadTimeDays?: number;
  lineItems: ExtractedLineItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
  notes?: string;
}

export interface ExtractedCustomerPO {
  documentType: 'customer_po';
  poNumber?: string;
  poDate?: string;
  customerName?: string;
  customerCode?: string;
  customerAddress?: string;
  customerContact?: string;
  customerEmail?: string;
  customerPhone?: string;
  shipToAddress?: string;
  billToAddress?: string;
  currency?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  requiredDate?: string;
  lineItems: ExtractedLineItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
  notes?: string;
}

export interface ExtractedInvoice {
  documentType: 'invoice';
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  poReference?: string;
  supplierName?: string;
  supplierCode?: string;
  supplierAddress?: string;
  supplierTaxId?: string;
  customerName?: string;
  customerAddress?: string;
  currency?: string;
  paymentTerms?: string;
  lineItems: ExtractedLineItem[];
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  total?: number;
  bankDetails?: string;
  notes?: string;
}

export interface ExtractedCertificate {
  documentType: 'certificate';
  certificateType?: string; // COC, COA, Test Report, etc.
  certificateNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  issuerName?: string;
  issuerAddress?: string;
  partNumber?: string;
  partDescription?: string;
  lotNumber?: string;
  batchNumber?: string;
  quantity?: number;
  specifications?: { name: string; value: string; unit?: string; result?: 'pass' | 'fail' }[];
  inspectorName?: string;
  approverName?: string;
  notes?: string;
}

export type ExtractedDocument =
  | ExtractedSupplierQuote
  | ExtractedCustomerPO
  | ExtractedInvoice
  | ExtractedCertificate;

export interface OCRResult {
  success: boolean;
  documentType: DocumentType;
  confidence: number;
  extractedData: ExtractedDocument | null;
  rawText?: string;
  processingTime: number;
  error?: string;
  warnings?: string[];
}

export interface OCRConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

// =============================================================================
// EXTRACTION PROMPTS
// =============================================================================

const DOCUMENT_TYPE_DETECTION_PROMPT = `Analyze this document image and determine its type.
Return ONLY one of these values:
- supplier_quote (if it's a quotation/quote from a supplier with prices)
- customer_po (if it's a purchase order from a customer)
- invoice (if it's an invoice/bill for payment)
- certificate (if it's a certificate of conformance, test report, or quality certificate)
- unknown (if cannot determine)

Respond with just the document type, nothing else.`;

const SUPPLIER_QUOTE_PROMPT = `Extract all information from this supplier quotation document.
Return a JSON object with these fields:
{
  "quoteNumber": "quote/reference number",
  "quoteDate": "date in YYYY-MM-DD format",
  "validUntil": "expiry date in YYYY-MM-DD format",
  "supplierName": "company name",
  "supplierAddress": "full address",
  "supplierContact": "contact person name",
  "supplierEmail": "email address",
  "supplierPhone": "phone number",
  "currency": "currency code (USD, VND, EUR, etc.)",
  "paymentTerms": "payment terms",
  "deliveryTerms": "delivery/shipping terms",
  "leadTimeDays": number of days for delivery,
  "lineItems": [
    {
      "lineNumber": line number,
      "partNumber": "part/item number",
      "description": "item description",
      "quantity": quantity as number,
      "unit": "unit of measure",
      "unitPrice": price per unit as number,
      "totalPrice": line total as number,
      "deliveryDate": "delivery date if specified"
    }
  ],
  "subtotal": subtotal amount,
  "tax": tax amount,
  "total": total amount,
  "notes": "any additional notes or terms"
}
Return ONLY valid JSON. Use null for missing values.`;

const CUSTOMER_PO_PROMPT = `Extract all information from this customer purchase order document.
Return a JSON object with these fields:
{
  "poNumber": "PO number",
  "poDate": "date in YYYY-MM-DD format",
  "customerName": "customer company name",
  "customerAddress": "customer address",
  "customerContact": "contact person",
  "customerEmail": "email",
  "customerPhone": "phone",
  "shipToAddress": "shipping address",
  "billToAddress": "billing address",
  "currency": "currency code",
  "paymentTerms": "payment terms",
  "deliveryTerms": "delivery terms",
  "requiredDate": "required delivery date in YYYY-MM-DD",
  "lineItems": [
    {
      "lineNumber": line number,
      "partNumber": "part/item number",
      "description": "item description",
      "quantity": quantity as number,
      "unit": "unit of measure",
      "unitPrice": price per unit as number,
      "totalPrice": line total as number
    }
  ],
  "subtotal": subtotal,
  "tax": tax amount,
  "total": total amount,
  "notes": "any special instructions"
}
Return ONLY valid JSON. Use null for missing values.`;

const INVOICE_PROMPT = `Extract all information from this invoice document.
Return a JSON object with these fields:
{
  "invoiceNumber": "invoice number",
  "invoiceDate": "date in YYYY-MM-DD format",
  "dueDate": "payment due date in YYYY-MM-DD",
  "poReference": "related PO number if mentioned",
  "supplierName": "vendor/supplier name",
  "supplierAddress": "supplier address",
  "supplierTaxId": "tax ID/VAT number",
  "customerName": "bill to company name",
  "customerAddress": "bill to address",
  "currency": "currency code",
  "paymentTerms": "payment terms",
  "lineItems": [
    {
      "lineNumber": line number,
      "partNumber": "part/item number",
      "description": "description",
      "quantity": quantity,
      "unit": "unit",
      "unitPrice": unit price,
      "totalPrice": line total
    }
  ],
  "subtotal": subtotal,
  "taxRate": tax rate as percentage,
  "taxAmount": tax amount,
  "total": total amount due,
  "bankDetails": "bank account details for payment",
  "notes": "any notes"
}
Return ONLY valid JSON. Use null for missing values.`;

const CERTIFICATE_PROMPT = `Extract all information from this certificate/test report document.
Return a JSON object with these fields:
{
  "certificateType": "type (COC, COA, Test Report, Material Cert, etc.)",
  "certificateNumber": "certificate/report number",
  "issueDate": "issue date in YYYY-MM-DD",
  "expiryDate": "expiry date if applicable in YYYY-MM-DD",
  "issuerName": "issuing company/lab name",
  "issuerAddress": "issuer address",
  "partNumber": "part number being certified",
  "partDescription": "part description",
  "lotNumber": "lot/batch number",
  "batchNumber": "batch number if different from lot",
  "quantity": quantity covered,
  "specifications": [
    {
      "name": "specification/test name",
      "value": "measured value",
      "unit": "unit of measure",
      "result": "pass or fail"
    }
  ],
  "inspectorName": "inspector/tester name",
  "approverName": "approver/signatory name",
  "notes": "any notes or remarks"
}
Return ONLY valid JSON. Use null for missing values.`;

// =============================================================================
// DOCUMENT OCR SERVICE CLASS
// =============================================================================

export class DocumentOCRService {
  private config: OCRConfig;
  private apiKey: string;

  constructor(config?: OCRConfig) {
    this.config = {
      model: config?.model || 'gpt-4o',
      maxTokens: config?.maxTokens || 4096,
      temperature: config?.temperature || 0.1,
    };
    this.apiKey = config?.apiKey || process.env.OPENAI_API_KEY || '';
  }

  // ===========================================================================
  // MAIN OCR PROCESSING
  // ===========================================================================

  async processDocument(
    imageBase64: string,
    mimeType: string = 'image/png',
    forceType?: DocumentType
  ): Promise<OCRResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    if (!this.apiKey) {
      return {
        success: false,
        documentType: 'unknown',
        confidence: 0,
        extractedData: null,
        processingTime: Date.now() - startTime,
        error: 'OpenAI API key not configured',
      };
    }

    try {
      // Step 1: Detect document type (if not forced)
      let documentType: DocumentType = forceType || 'unknown';
      let typeConfidence = forceType ? 1.0 : 0;

      if (!forceType) {
        const typeResult = await this.detectDocumentType(imageBase64, mimeType);
        documentType = typeResult.type;
        typeConfidence = typeResult.confidence;

        if (documentType === 'unknown') {
          return {
            success: false,
            documentType: 'unknown',
            confidence: typeConfidence,
            extractedData: null,
            processingTime: Date.now() - startTime,
            error: 'Could not determine document type',
            warnings,
          };
        }
      }

      // Step 2: Extract data based on document type
      const extractionResult = await this.extractDocumentData(
        imageBase64,
        mimeType,
        documentType
      );

      if (!extractionResult.success) {
        return {
          success: false,
          documentType,
          confidence: typeConfidence,
          extractedData: null,
          processingTime: Date.now() - startTime,
          error: extractionResult.error,
          warnings,
        };
      }

      // Step 3: Validate extracted data
      const validation = this.validateExtractedData(documentType, extractionResult.data);
      if (validation.warnings.length > 0) {
        warnings.push(...validation.warnings);
      }

      return {
        success: true,
        documentType,
        confidence: Math.min(typeConfidence, validation.confidence),
        extractedData: extractionResult.data,
        processingTime: Date.now() - startTime,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        success: false,
        documentType: 'unknown',
        confidence: 0,
        extractedData: null,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // ===========================================================================
  // DOCUMENT TYPE DETECTION
  // ===========================================================================

  private async detectDocumentType(
    imageBase64: string,
    mimeType: string
  ): Promise<{ type: DocumentType; confidence: number }> {
    const response = await this.callVisionAPI(
      imageBase64,
      mimeType,
      DOCUMENT_TYPE_DETECTION_PROMPT
    );

    const typeStr = response.trim().toLowerCase();

    const validTypes: DocumentType[] = ['supplier_quote', 'customer_po', 'invoice', 'certificate'];
    const matchedType = validTypes.find((t) => typeStr.includes(t));

    return {
      type: matchedType || 'unknown',
      confidence: matchedType ? 0.85 : 0.3,
    };
  }

  // ===========================================================================
  // DATA EXTRACTION
  // ===========================================================================

  private async extractDocumentData(
    imageBase64: string,
    mimeType: string,
    documentType: DocumentType
  ): Promise<{ success: boolean; data: ExtractedDocument | null; error?: string }> {
    let prompt: string;

    switch (documentType) {
      case 'supplier_quote':
        prompt = SUPPLIER_QUOTE_PROMPT;
        break;
      case 'customer_po':
        prompt = CUSTOMER_PO_PROMPT;
        break;
      case 'invoice':
        prompt = INVOICE_PROMPT;
        break;
      case 'certificate':
        prompt = CERTIFICATE_PROMPT;
        break;
      default:
        return { success: false, data: null, error: 'Unsupported document type' };
    }

    try {
      const response = await this.callVisionAPI(imageBase64, mimeType, prompt);

      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { success: false, data: null, error: 'No JSON found in response' };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      parsed.documentType = documentType;

      return { success: true, data: parsed as ExtractedDocument };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to parse extraction result',
      };
    }
  }

  // ===========================================================================
  // VISION API CALL
  // ===========================================================================

  private async callVisionAPI(
    imageBase64: string,
    mimeType: string,
    prompt: string
  ): Promise<string> {
    const response = await fetch(`${process.env.OPENAI_API_BASE_URL || 'https://api.openai.com'}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  // ===========================================================================
  // VALIDATION
  // ===========================================================================

  private validateExtractedData(
    documentType: DocumentType,
    data: ExtractedDocument | null
  ): { confidence: number; warnings: string[] } {
    const warnings: string[] = [];
    let confidence = 1.0;

    if (!data) {
      return { confidence: 0, warnings: ['No data extracted'] };
    }

    switch (documentType) {
      case 'supplier_quote': {
        const quote = data as ExtractedSupplierQuote;
        if (!quote.quoteNumber) {
          warnings.push('Quote number not found');
          confidence -= 0.1;
        }
        if (!quote.supplierName) {
          warnings.push('Supplier name not found');
          confidence -= 0.1;
        }
        if (!quote.lineItems || quote.lineItems.length === 0) {
          warnings.push('No line items found');
          confidence -= 0.2;
        }
        break;
      }

      case 'customer_po': {
        const po = data as ExtractedCustomerPO;
        if (!po.poNumber) {
          warnings.push('PO number not found');
          confidence -= 0.1;
        }
        if (!po.customerName) {
          warnings.push('Customer name not found');
          confidence -= 0.1;
        }
        if (!po.lineItems || po.lineItems.length === 0) {
          warnings.push('No line items found');
          confidence -= 0.2;
        }
        break;
      }

      case 'invoice': {
        const invoice = data as ExtractedInvoice;
        if (!invoice.invoiceNumber) {
          warnings.push('Invoice number not found');
          confidence -= 0.1;
        }
        if (!invoice.total) {
          warnings.push('Total amount not found');
          confidence -= 0.15;
        }
        break;
      }

      case 'certificate': {
        const cert = data as ExtractedCertificate;
        if (!cert.certificateNumber) {
          warnings.push('Certificate number not found');
          confidence -= 0.1;
        }
        if (!cert.partNumber && !cert.lotNumber) {
          warnings.push('Part/Lot number not found');
          confidence -= 0.15;
        }
        break;
      }
    }

    return { confidence: Math.max(0, confidence), warnings };
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  async processFile(file: File): Promise<OCRResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const result = await this.processDocument(base64, file.type);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let documentOCRServiceInstance: DocumentOCRService | null = null;

export function getDocumentOCRService(config?: OCRConfig): DocumentOCRService {
  if (!documentOCRServiceInstance) {
    documentOCRServiceInstance = new DocumentOCRService(config);
  }
  return documentOCRServiceInstance;
}

export function resetDocumentOCRService(): void {
  documentOCRServiceInstance = null;
}

export default DocumentOCRService;
