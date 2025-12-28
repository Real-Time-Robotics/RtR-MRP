// src/app/api/finance/invoices/purchase/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createPurchaseInvoice,
  recordPurchasePayment,
  getAPAging,
} from "@/lib/finance";

// GET - Get purchase invoices
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        details: [], // TODO: Add supplier-level breakdown
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
          select: { code: true, name: true },
        },
      },
      orderBy: { invoiceDate: "desc" },
      take: 100,
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("Purchase invoices GET error:", error);
    return NextResponse.json(
      { error: "Failed to get invoices" },
      { status: 500 }
    );
  }
}

// POST - Create purchase invoice or record payment
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Record payment
    if (action === "payment") {
      const { invoiceId, paymentDate, amount, paymentMethod, referenceNumber, notes } = body;

      if (!invoiceId || !paymentDate || !amount || !paymentMethod) {
        return NextResponse.json(
          { error: "Missing required payment fields" },
          { status: 400 }
        );
      }

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
    } = body;

    if (!supplierId || !invoiceDate || !dueDate || !lines?.length) {
      return NextResponse.json(
        { error: "Missing required invoice fields" },
        { status: 400 }
      );
    }

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
    console.error("Purchase invoices POST error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

// PUT - Update invoice status
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    console.error("Purchase invoices PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}
