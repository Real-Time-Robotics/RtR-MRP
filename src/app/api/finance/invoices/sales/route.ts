// src/app/api/finance/invoices/sales/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createSalesInvoice,
  recordSalesPayment,
  getARAging,
} from "@/lib/finance";

// GET - Get sales invoices
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
    const customerId = searchParams.get("customerId");

    // Get AR aging
    if (action === "aging") {
      const aging = await getARAging();
      // Transform to expected format
      return NextResponse.json({
        summary: {
          current: aging.current,
          days30: aging.overdue30,
          days60: aging.overdue60,
          days90Plus: aging.overdue90,
          total: aging.total,
        },
        details: [], // TODO: Add customer-level breakdown
      });
    }

    // Get single invoice
    if (invoiceId) {
      const invoice = await prisma.salesInvoice.findUnique({
        where: { id: invoiceId },
        include: {
          customer: true,
          salesOrder: true,
          lines: {
            include: { part: true, product: true },
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
    if (customerId) where.customerId = customerId;

    // Get list of invoices
    const invoices = await prisma.salesInvoice.findMany({
      where,
      include: {
        customer: {
          select: { code: true, name: true },
        },
      },
      orderBy: { invoiceDate: "desc" },
      take: 100,
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("Sales invoices GET error:", error);
    return NextResponse.json(
      { error: "Failed to get invoices" },
      { status: 500 }
    );
  }
}

// POST - Create sales invoice or record payment
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

      const result = await recordSalesPayment(
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
      customerId,
      salesOrderId,
      invoiceDate,
      dueDate,
      lines,
      notes,
      shippingAmount,
      paymentTerms,
    } = body;

    if (!customerId || !invoiceDate || !dueDate || !lines?.length) {
      return NextResponse.json(
        { error: "Missing required invoice fields" },
        { status: 400 }
      );
    }

    const result = await createSalesInvoice(
      {
        customerId,
        salesOrderId,
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
    console.error("Sales invoices POST error:", error);
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
    const { invoiceId, status } = body;

    if (!invoiceId || !status) {
      return NextResponse.json(
        { error: "invoiceId and status are required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { status };
    if (status === "SENT") {
      updateData.sentAt = new Date();
    }

    await prisma.salesInvoice.update({
      where: { id: invoiceId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sales invoices PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}
