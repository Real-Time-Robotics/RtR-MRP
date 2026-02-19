// =============================================================================
// EMAIL PARSER API
// Parse emails to extract order data and create draft orders
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { prisma } from '@/lib/prisma';
import {
  getEmailParserService,
  EmailAttachment,
  ExtractedOrderData,
  DraftOrder,
} from '@/lib/ai/email-parser-service';
import { checkHeavyEndpointLimit } from '@/lib/rate-limit';

const emailParserBodySchema = z.object({
  action: z.enum(['parse', 'create_order']),
  emailContent: z.string().optional(),
  attachments: z.array(z.any()).optional(),
  draftOrder: z.any().optional(),
  approved: z.boolean().optional(),
});

// =============================================================================
// TYPES
// =============================================================================

interface ParseEmailRequest {
  emailContent: string;
  attachments?: EmailAttachment[];
}

interface CreateOrderRequest {
  draftOrder: DraftOrder;
  approved: boolean;
}

// =============================================================================
// POST: Parse email or create order
// =============================================================================

export const POST = withAuth(async (request, context, session) => {
  try {
// Rate limiting (heavy endpoint)
    const rateLimit = await checkHeavyEndpointLimit(request, session.user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter || 60) } }
      );
    }

    const rawBody = await request.json();
    const parseResult = emailParserBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parseResult.data;
    const { action } = body;
    const emailParser = getEmailParserService();
    const userId = session.user.id || 'system';

    // ===========================================================================
    // ACTION: Parse email
    // ===========================================================================
    if (action === 'parse') {
      const { emailContent, attachments } = body as ParseEmailRequest;

      if (!emailContent) {
        return NextResponse.json(
          { error: 'Email content is required' },
          { status: 400 }
        );
      }

      const startTime = Date.now();
      const extractedData = await emailParser.parseEmail(emailContent, attachments || []);
      const processingTime = Date.now() - startTime;

      // Create draft order
      let draftOrder: DraftOrder | null = null;
      if (extractedData.emailType !== 'unknown' && extractedData.confidence > 0.3) {
        try {
          draftOrder = await emailParser.createDraftOrder(extractedData);
        } catch (err) {
          logger.warn('Could not create draft', { context: 'POST /api/ai/email-parser', error: String(err) });
        }
      }

      // Log processing
      await prisma.auditLog.create({
        data: {
          entityType: 'EmailParsing',
          entityId: `email-${Date.now()}`,
          action: 'PARSE',
          entityName: `Email parsed: ${extractedData.emailType}`,
          userId,
          metadata: {
            emailType: extractedData.emailType,
            confidence: extractedData.confidence,
            processingTime,
            hasAttachments: (attachments?.length || 0) > 0,
            warningsCount: extractedData.warnings.length,
          },
        },
      });

      return NextResponse.json({
        success: true,
        extractedData,
        draftOrder,
        processingTime,
      });
    }

    // ===========================================================================
    // ACTION: Create order from draft
    // ===========================================================================
    if (action === 'create_order') {
      const { draftOrder, approved } = body as CreateOrderRequest;

      if (!approved) {
        return NextResponse.json(
          { error: 'Order must be approved before creation' },
          { status: 400 }
        );
      }

      if (!draftOrder) {
        return NextResponse.json(
          { error: 'Draft order data is required' },
          { status: 400 }
        );
      }

      let createdOrder: Record<string, unknown> | null = null;

      if (draftOrder.type === 'sales_order') {
        // Find or validate customer
        let customer = await prisma.customer.findFirst({
          where: {
            OR: [
              { code: draftOrder.data.customerCode },
              { name: { contains: draftOrder.data.customerName, mode: 'insensitive' } },
            ],
          },
        });

        if (!customer) {
          return NextResponse.json({
            success: false,
            error: 'Customer not found. Please create customer first.',
            customerName: draftOrder.data.customerName,
          }, { status: 400 });
        }

        // Validate products
        const productIds: Map<string, string> = new Map();
        for (const item of draftOrder.data.items) {
          if (item.partNumber) {
            const product = await prisma.product.findFirst({
              where: {
                OR: [
                  { sku: item.partNumber },
                  { name: { contains: item.description, mode: 'insensitive' } },
                ],
              },
            });
            if (product) {
              productIds.set(item.partNumber, product.id);
            }
          }
        }

        // Create sales order
        const orderNumber = `SO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

        const salesOrder = await prisma.salesOrder.create({
          data: {
            orderNumber,
            customerId: customer.id,
            orderDate: new Date(),
            requiredDate: draftOrder.data.requiredDate
              ? new Date(draftOrder.data.requiredDate)
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'draft',
            priority: 'normal',
            totalAmount: draftOrder.data.total || 0,
            notes: `Tạo từ email. PO khách hàng: ${draftOrder.data.customerPO || 'N/A'}. ${draftOrder.data.notes || ''}`,
            lines: {
              create: draftOrder.data.items
                .filter((item) => item.partNumber && productIds.has(item.partNumber))
                .map((item, idx) => ({
                  lineNumber: idx + 1,
                  productId: productIds.get(item.partNumber!)!,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice || 0,
                  lineTotal: item.totalPrice || (item.quantity * (item.unitPrice || 0)),
                  status: 'pending',
                })),
            },
          },
          include: {
            customer: true,
            lines: { include: { product: true } },
          },
        });

        createdOrder = {
          type: 'sales_order',
          id: salesOrder.id,
          orderNumber: salesOrder.orderNumber,
          customer: salesOrder.customer.name,
          itemCount: salesOrder.lines.length,
          totalAmount: salesOrder.totalAmount,
        };

        // Log creation
        await prisma.auditLog.create({
          data: {
            entityType: 'SalesOrder',
            entityId: salesOrder.id,
            action: 'CREATE_FROM_EMAIL',
            entityName: `Created ${orderNumber} from email`,
            userId,
            metadata: {
              customerPO: draftOrder.data.customerPO,
              confidence: draftOrder.confidence,
            },
          },
        });

      } else if (draftOrder.type === 'purchase_order') {
        // Find or validate supplier
        let supplier = await prisma.supplier.findFirst({
          where: {
            OR: [
              { code: draftOrder.data.supplierCode },
              { name: { contains: draftOrder.data.supplierName, mode: 'insensitive' } },
            ],
          },
        });

        if (!supplier) {
          return NextResponse.json({
            success: false,
            error: 'Supplier not found. Please create supplier first.',
            supplierName: draftOrder.data.supplierName,
          }, { status: 400 });
        }

        // Validate parts
        const partIds: Map<string, string> = new Map();
        for (const item of draftOrder.data.items) {
          if (item.partNumber) {
            const part = await prisma.part.findFirst({
              where: { partNumber: item.partNumber },
            });
            if (part) {
              partIds.set(item.partNumber, part.id);
            }
          }
        }

        // Create purchase order
        const poNumber = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

        const purchaseOrder = await prisma.purchaseOrder.create({
          data: {
            poNumber,
            supplierId: supplier.id,
            orderDate: new Date(),
            expectedDate: draftOrder.data.expectedDate
              ? new Date(draftOrder.data.expectedDate)
              : new Date(Date.now() + (draftOrder.data.leadTimeDays || 14) * 24 * 60 * 60 * 1000),
            status: 'draft',
            totalAmount: draftOrder.data.total || 0,
            notes: `Tạo từ báo giá. Ref: ${draftOrder.data.quoteReference || 'N/A'}. ${draftOrder.data.notes || ''}`,
            lines: {
              create: draftOrder.data.items
                .filter((item) => item.partNumber && partIds.has(item.partNumber))
                .map((item, idx) => ({
                  lineNumber: idx + 1,
                  partId: partIds.get(item.partNumber!)!,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice || 0,
                  lineTotal: item.totalPrice || (item.quantity * (item.unitPrice || 0)),
                  status: 'pending',
                })),
            },
          },
          include: {
            supplier: true,
            lines: { include: { part: true } },
          },
        });

        createdOrder = {
          type: 'purchase_order',
          id: purchaseOrder.id,
          poNumber: purchaseOrder.poNumber,
          supplier: purchaseOrder.supplier.name,
          itemCount: purchaseOrder.lines.length,
          totalAmount: purchaseOrder.totalAmount,
        };

        // Log creation
        await prisma.auditLog.create({
          data: {
            entityType: 'PurchaseOrder',
            entityId: purchaseOrder.id,
            action: 'CREATE_FROM_EMAIL',
            entityName: `Created ${poNumber} from email`,
            userId,
            metadata: {
              quoteReference: draftOrder.data.quoteReference,
              confidence: draftOrder.confidence,
            },
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Order created successfully',
        order: createdOrder,
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/email-parser' });
    return NextResponse.json(
      {
        error: 'Failed to process request',
      },
      { status: 500 }
    );
  }
});

// =============================================================================
// GET: Get parsing status/info
// =============================================================================

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    supportedEmailTypes: ['customer_po', 'supplier_quote'],
    features: [
      'Parse email body',
      'Process PDF/image attachments',
      'AI-powered extraction with Gemini',
      'Database validation',
      'Draft order creation',
      'Human approval workflow',
    ],
    confidence: {
      high: '> 90% - Auto-fill, minimal review',
      medium: '70-90% - Review recommended',
      low: '< 70% - Manual verification required',
    },
  });
}
