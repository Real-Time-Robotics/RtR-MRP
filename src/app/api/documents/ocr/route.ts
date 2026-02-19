// =============================================================================
// DOCUMENT OCR API
// Process documents using AI Vision and extract structured data
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDocumentOCRService, DocumentType, OCRResult } from '@/lib/ai/document-ocr-service';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';
import { checkHeavyEndpointLimit } from '@/lib/rate-limit';

// =============================================================================
// TYPES
// =============================================================================

interface ProcessDocumentRequest {
  imageBase64: string;
  documentType?: DocumentType;
  fileName?: string;
  autoCreate?: boolean;
}

// =============================================================================
// POST: Process a document
// =============================================================================

export const POST = withAuth(async (request, context, session) => {
  try {
    // Check authentication
// Rate limiting (heavy endpoint)
    const rateLimit = await checkHeavyEndpointLimit(request, session.user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter || 60) } }
      );
    }

    // Parse request
    const contentType = request.headers.get('content-type') || '';
    let imageBase64: string;
    let documentType: DocumentType | undefined;
    let fileName: string | undefined;
    let autoCreate = false;

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      // Convert file to base64
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      imageBase64 = buffer.toString('base64');
      fileName = file.name;

      // Get optional parameters
      const typeParam = formData.get('documentType') as string | null;
      if (typeParam && ['supplier_quote', 'customer_po', 'invoice', 'certificate'].includes(typeParam)) {
        documentType = typeParam as DocumentType;
      }
      autoCreate = formData.get('autoCreate') === 'true';

    } else {
      // Handle JSON request with base64 image
      const jsonBodySchema = z.object({
        imageBase64: z.string(),
        documentType: z.enum(['supplier_quote', 'customer_po', 'invoice', 'certificate']).optional(),
        fileName: z.string().optional(),
        autoCreate: z.boolean().optional(),
      });

      const rawBody = await request.json();
      const parseResult = jsonBodySchema.safeParse(rawBody);
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      const body = parseResult.data;

      imageBase64 = body.imageBase64;
      documentType = body.documentType;
      fileName = body.fileName;
      autoCreate = body.autoCreate || false;
    }

    // Process document
    const ocrService = getDocumentOCRService();
    const result = await ocrService.processDocument(imageBase64, documentType);

    // Log processing
    const userId = session.user.id || 'system';
    await prisma.auditLog.create({
      data: {
        entityType: 'Document',
        entityId: 'ocr-processing',
        action: 'OCR_PROCESS',
        entityName: `Processed: ${fileName || 'unknown'}`,
        userId,
        metadata: {
          fileName,
          documentType: result.documentType,
          confidence: result.confidence,
          success: result.success,
          processingTime: result.processingTime,
        },
      },
    });

    // Auto-create entities if requested and successful
    let createdEntities: Record<string, unknown> | null = null;
    if (autoCreate && result.success && result.extractedData) {
      createdEntities = await createEntitiesFromDocument(result, userId);
    }

    return NextResponse.json({
      success: result.success,
      documentType: result.documentType,
      confidence: result.confidence,
      extractedData: result.extractedData,
      processingTime: result.processingTime,
      warnings: result.warnings,
      error: result.error,
      createdEntities,
    });

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/documents/ocr' });
    return NextResponse.json(
      {
        error: 'Failed to process document',
      },
      { status: 500 }
    );
  }
});

// =============================================================================
// GET: Get processing status or supported types
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'types') {
      return NextResponse.json({
        supportedTypes: [
          {
            type: 'supplier_quote',
            name: 'Báo giá nhà cung cấp',
            description: 'Báo giá từ nhà cung cấp với thông tin sản phẩm và giá',
            extractedFields: ['quoteNumber', 'supplierName', 'items', 'validUntil', 'terms'],
          },
          {
            type: 'customer_po',
            name: 'Đơn đặt hàng khách hàng',
            description: 'Purchase Order từ khách hàng',
            extractedFields: ['poNumber', 'customerName', 'items', 'deliveryDate', 'shippingAddress'],
          },
          {
            type: 'invoice',
            name: 'Hóa đơn',
            description: 'Hóa đơn mua hàng hoặc bán hàng',
            extractedFields: ['invoiceNumber', 'supplierName', 'items', 'taxAmount', 'totalAmount'],
          },
          {
            type: 'certificate',
            name: 'Chứng chỉ chất lượng',
            description: 'Certificate of Conformance (COC)',
            extractedFields: ['certificateNumber', 'productName', 'testResults', 'certifyingBody'],
          },
        ],
      });
    }

    // Return service status
    return NextResponse.json({
      status: 'ready',
      supportedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      maxFileSize: '20MB',
      features: [
        'Auto document type detection',
        'Multi-language support (Vietnamese, English)',
        'Structured data extraction',
        'Auto entity creation',
        'Validation with confidence scoring',
      ],
    });

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/documents/ocr' });
    return NextResponse.json(
      { error: 'Failed to get OCR status' },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPER: Create entities from extracted document data
// =============================================================================

async function createEntitiesFromDocument(
  result: OCRResult,
  userId: string
): Promise<Record<string, unknown>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const created: Record<string, any> = {};

  try {
    switch (result.documentType) {
      case 'supplier_quote': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = result.extractedData as Record<string, any>;

        // Find or create supplier
        let supplier = await prisma.supplier.findFirst({
          where: {
            OR: [
              { name: { contains: data.supplierName, mode: 'insensitive' } },
              { contactEmail: data.contactEmail },
            ],
          },
        });

        if (!supplier && data.supplierName) {
          supplier = await prisma.supplier.create({
            data: {
              name: data.supplierName,
              code: `SUP-${Date.now().toString(36).toUpperCase()}`,
              country: data.country || 'VN',
              contactEmail: data.contactEmail || null,
              contactPhone: data.contactPhone || null,
              status: 'active',
              rating: 50.0, // Default rating
              leadTimeDays: 14,
              paymentTerms: data.paymentTerms || 'Net 30',
            },
          });
          created.supplier = supplier;
        }

        // Create quote record in audit log
        await prisma.auditLog.create({
          data: {
            entityType: 'SupplierQuote',
            entityId: data.quoteNumber || `QUO-${Date.now()}`,
            action: 'CREATE_FROM_OCR',
            entityName: `Quote ${data.quoteNumber} from ${data.supplierName}`,
            userId,
            metadata: {
              ...data,
              supplierId: supplier?.id,
              itemCount: data.items?.length || 0,
            },
          },
        });

        created.quote = {
          quoteNumber: data.quoteNumber,
          supplier: supplier?.name,
          itemCount: data.items?.length || 0,
          totalAmount: data.totalAmount,
        };
        break;
      }

      case 'customer_po': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = result.extractedData as Record<string, any>;

        // Find or create customer
        let customer = await prisma.customer.findFirst({
          where: {
            OR: [
              { name: { contains: data.customerName, mode: 'insensitive' } },
              { contactEmail: data.contactEmail },
            ],
          },
        });

        if (!customer && data.customerName) {
          customer = await prisma.customer.create({
            data: {
              name: data.customerName,
              code: `CUS-${Date.now().toString(36).toUpperCase()}`,
              contactEmail: data.contactEmail || null,
              contactPhone: data.contactPhone || null,
              status: 'active',
              paymentTerms: data.paymentTerms || 'Net 30',
            },
          });
          created.customer = customer;
        }

        // Create sales order if customer exists
        if (customer && data.items?.length > 0) {
          // Look up products by name/description
          const orderLines = [];
          let lineNumber = 1;

          for (const item of data.items) {
            const product = await prisma.product.findFirst({
              where: {
                OR: [
                  { sku: item.partNumber },
                  { name: { contains: item.description, mode: 'insensitive' } },
                ],
              },
            });

            if (product) {
              const unitPrice = item.unitPrice || product.basePrice;
              const quantity = item.quantity || 1;
              orderLines.push({
                lineNumber: lineNumber++,
                productId: product.id,
                quantity,
                unitPrice,
                lineTotal: quantity * unitPrice,
                status: 'pending',
              });
            }
          }

          if (orderLines.length > 0) {
            const totalAmount = orderLines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
            const deliveryDate = data.deliveryDate ? new Date(data.deliveryDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            const salesOrder = await prisma.salesOrder.create({
              data: {
                orderNumber: data.poNumber || `SO-${Date.now().toString(36).toUpperCase()}`,
                customerId: customer.id,
                status: 'draft',
                orderDate: new Date(),
                requiredDate: deliveryDate,
                totalAmount,
                notes: `Tạo tự động từ PO: ${data.poNumber}`,
                lines: {
                  create: orderLines,
                },
              },
              include: {
                lines: true,
              },
            });
            created.salesOrder = {
              id: salesOrder.id,
              orderNumber: salesOrder.orderNumber,
              lineCount: salesOrder.lines.length,
              totalAmount,
            };
          }
        }

        // Log if no sales order created
        if (!created.salesOrder) {
          await prisma.auditLog.create({
            data: {
              entityType: 'CustomerPO',
              entityId: data.poNumber || `PO-${Date.now()}`,
              action: 'REVIEW_REQUIRED',
              entityName: `PO ${data.poNumber} from ${data.customerName}`,
              userId,
              metadata: {
                ...data,
                customerId: customer?.id,
                reason: 'No matching products found',
              },
            },
          });
          created.pendingReview = {
            poNumber: data.poNumber,
            reason: 'Không tìm thấy sản phẩm phù hợp - cần review thủ công',
          };
        }
        break;
      }

      case 'invoice': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = result.extractedData as Record<string, any>;

        // Log invoice for review
        await prisma.auditLog.create({
          data: {
            entityType: 'Invoice',
            entityId: data.invoiceNumber || `INV-${Date.now()}`,
            action: 'CREATE_FROM_OCR',
            entityName: `Invoice ${data.invoiceNumber} - Total: ${data.totalAmount}`,
            userId,
            metadata: data,
          },
        });

        created.invoice = {
          invoiceNumber: data.invoiceNumber,
          totalAmount: data.totalAmount,
          status: 'pending_review',
        };
        break;
      }

      case 'certificate': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = result.extractedData as Record<string, any>;

        // Find related part
        const part = await prisma.part.findFirst({
          where: {
            OR: [
              { partNumber: data.partNumber },
              { name: { contains: data.productName, mode: 'insensitive' } },
            ],
          },
        });

        // Log certificate
        await prisma.auditLog.create({
          data: {
            entityType: 'Certificate',
            entityId: data.certificateNumber || `CERT-${Date.now()}`,
            action: 'CREATE_FROM_OCR',
            entityName: `COC ${data.certificateNumber} for ${data.productName}`,
            userId,
            metadata: {
              ...data,
              partId: part?.id,
            },
          },
        });

        created.certificate = {
          certificateNumber: data.certificateNumber,
          productName: data.productName,
          part: part ? { id: part.id, partNumber: part.partNumber } : null,
          status: 'recorded',
        };
        break;
      }
    }

    return created;
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/documents/ocr' });
    return {
      error: 'Failed to create some entities',
      partial: created,
    };
  }
}
