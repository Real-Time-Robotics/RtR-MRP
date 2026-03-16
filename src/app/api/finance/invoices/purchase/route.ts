// src/app/api/finance/invoices/purchase/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withRoleAuth } from '@/lib/api/with-auth';
import { prisma } from "@/lib/prisma";
import {
  createPurchaseInvoice,
  recordPurchasePayment,
  getAPAging,
} from "@/lib/finance";
import { logger } from "@/lib/logger";

const purchaseInvoiceLineSchema = z.object({
  partId: z.string().optional(),
  description: z.string().optional().default(''),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  taxRate: z.number().optional(),
  discountPercent: z.number().optional(),
  lineTotal: z.number().optional(),
});

const purchaseInvoicePostSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('payment'),
    invoiceId: z.string().min(1, 'invoiceId là bắt buộc'),
    paymentDate: z.string().min(1, 'Ngày thanh toán là bắt buộc'),
    amount: z.number().positive('Số tiền phải lớn hơn 0'),
    paymentMethod: z.string().min(1, 'Phương thức thanh toán là bắt buộc'),
    referenceNumber: z.string().optional(),
    notes: z.string().optional(),
  }),
  z.object({
    action: z.literal(undefined).optional(),
    supplierId: z.string().min(1, 'supplierId là bắt buộc'),
    purchaseOrderId: z.string().optional(),
    vendorInvoiceNo: z.string().optional(),
    invoiceDate: z.string().min(1, 'Ngày hóa đơn là bắt buộc'),
    dueDate: z.string().min(1, 'Ngày đến hạn là bắt buộc'),
    lines: z.array(purchaseInvoiceLineSchema).min(1, 'Cần ít nhất một dòng hóa đơn'),
    notes: z.string().optional(),
    shippingAmount: z.number().min(0).optional(),
    paymentTerms: z.string().optional(),
  }),
]);

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// GET - Get purchase invoices
export const GET = withRoleAuth(['admin', 'manager'], async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
// Role-based access control: Finance routes require ADMIN or MANAGER

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const invoiceId = searchParams.get("id");
    const status = searchParams.get("status");
    const supplierId = searchParams.get("supplierId");

    // Get AP aging
    if (action === "aging") {
      const aging = await getAPAging();
      // Transform to expected format
      return NextResponse.json({
        summary: {
          current: aging.current,
          days30: aging.overdue30,
          days60: aging.overdue60,
          days90Plus: aging.overdue90,
          total: aging.total,
        },
        details: [], // Supplier-level breakdown is available via the invoices list filtered by supplierId
      });
    }

    // Get single invoice
    if (invoiceId) {
      const invoice = await prisma.purchaseInvoice.findUnique({
        where: { id: invoiceId },
        include: {
          supplier: true,
          purchaseOrder: true,
          lines: {
            include: { part: true },
            orderBy: { lineNumber: "asc" },
          },
          payments: {
            orderBy: { paymentDate: "desc" },
          },
        },
      });

      if (!invoice) {
        return NextResponse.json(
          { error: "Invoice not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(invoice);
    }

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    // Get list of invoices
    const invoices = await prisma.purchaseInvoice.findMany({
      where,
      include: {
        supplier: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { invoiceDate: "desc" },
      take: 100,
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/finance/invoices/purchase' });
    return NextResponse.json(
      { error: "Failed to get invoices" },
      { status: 500 }
    );
  }
});

// POST - Create purchase invoice or record payment
export const POST = withRoleAuth(['admin', 'manager'], async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
// Role-based access control: Finance routes require ADMIN or MANAGER

    const body = await request.json();
    const parsed = purchaseInvoicePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', errors: parsed.error.issues },
        { status: 400 }
      );
    }
    const validData = parsed.data;
    const { action } = validData;

    // Record payment
    if (action === "payment") {
      const { invoiceId, paymentDate, amount, paymentMethod, referenceNumber, notes } = validData;

      const result = await recordPurchasePayment(
        {
          invoiceId,
          paymentDate: new Date(paymentDate),
          amount,
          paymentMethod,
          referenceNumber,
          notes,
        },
        session.user.id
      );

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    // Create invoice
    const {
      supplierId,
      purchaseOrderId,
      vendorInvoiceNo,
      invoiceDate,
      dueDate,
      lines,
      notes,
      shippingAmount,
      paymentTerms,
    } = validData as Extract<typeof validData, { supplierId: string }>;

    const result = await createPurchaseInvoice(
      {
        supplierId,
        purchaseOrderId,
        vendorInvoiceNo,
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        lines,
        notes,
        shippingAmount,
        paymentTerms,
      },
      session.user.id
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/finance/invoices/purchase' });
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
});

// PUT - Update invoice status
export const PUT = withRoleAuth(['admin', 'manager'], async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
// Role-based access control: Finance routes require ADMIN or MANAGER

    const body = await request.json();
    const { invoiceId, status, approvedBy } = body;

    if (!invoiceId || !status) {
      return NextResponse.json(
        { error: "invoiceId and status are required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { status };
    if (status === "APPROVED" && approvedBy) {
      updateData.approvedBy = approvedBy;
      updateData.approvedAt = new Date();
    }

    await prisma.purchaseInvoice.update({
      where: { id: invoiceId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/finance/invoices/purchase' });
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
});
