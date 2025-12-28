// src/lib/finance/invoicing.ts
// Invoice Management

import { prisma } from "@/lib/prisma";
import type {
  CreatePurchaseInvoiceInput,
  CreateSalesInvoiceInput,
  PaymentInput,
} from "./types";
import { getPartCostRollup } from "./cost-rollup";

/**
 * Generate next purchase invoice number
 */
async function generatePurchaseInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PI-${year}-`;

  const lastInvoice = await prisma.purchaseInvoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
  });

  const lastNumber = lastInvoice
    ? parseInt(lastInvoice.invoiceNumber.replace(prefix, ""))
    : 0;

  return `${prefix}${String(lastNumber + 1).padStart(4, "0")}`;
}

/**
 * Generate next sales invoice number
 */
async function generateSalesInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const lastInvoice = await prisma.salesInvoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
  });

  const lastNumber = lastInvoice
    ? parseInt(lastInvoice.invoiceNumber.replace(prefix, ""))
    : 0;

  return `${prefix}${String(lastNumber + 1).padStart(4, "0")}`;
}

/**
 * Generate next payment number
 */
async function generatePaymentNumber(type: "purchase" | "sales"): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = type === "purchase" ? `PAY-AP-${year}-` : `PAY-AR-${year}-`;

  let lastPaymentNumber: string | null = null;

  if (type === "purchase") {
    const lastPayment = await prisma.purchasePayment.findFirst({
      where: { paymentNumber: { startsWith: prefix } },
      orderBy: { paymentNumber: "desc" },
    });
    lastPaymentNumber = lastPayment?.paymentNumber || null;
  } else {
    const lastPayment = await prisma.salesPayment.findFirst({
      where: { paymentNumber: { startsWith: prefix } },
      orderBy: { paymentNumber: "desc" },
    });
    lastPaymentNumber = lastPayment?.paymentNumber || null;
  }

  const lastNumber = lastPaymentNumber
    ? parseInt(lastPaymentNumber.replace(prefix, ""))
    : 0;

  return `${prefix}${String(lastNumber + 1).padStart(4, "0")}`;
}

/**
 * Create a purchase invoice (Accounts Payable)
 */
export async function createPurchaseInvoice(
  input: CreatePurchaseInvoiceInput,
  userId: string
): Promise<{ invoiceId: string; invoiceNumber: string }> {
  const invoiceNumber = await generatePurchaseInvoiceNumber();

  // Calculate totals
  let subtotal = 0;
  let totalTax = 0;

  const lineData = input.lines.map((line, index) => {
    const lineAmount = line.quantity * line.unitPrice;
    const taxAmount = lineAmount * ((line.taxRate || 0) / 100);
    const totalAmount = lineAmount + taxAmount;

    subtotal += lineAmount;
    totalTax += taxAmount;

    return {
      lineNumber: index + 1,
      partId: line.partId,
      description: line.description,
      quantity: line.quantity,
      uom: "EA",
      unitPrice: line.unitPrice,
      lineAmount,
      taxAmount,
      totalAmount,
    };
  });

  const shippingAmount = input.shippingAmount || 0;
  const totalAmount = subtotal + totalTax + shippingAmount;

  // Create invoice with lines
  const invoice = await prisma.purchaseInvoice.create({
    data: {
      invoiceNumber,
      supplierId: input.supplierId,
      purchaseOrderId: input.purchaseOrderId,
      vendorInvoiceNo: input.vendorInvoiceNo,
      invoiceDate: input.invoiceDate,
      dueDate: input.dueDate,
      subtotal,
      taxAmount: totalTax,
      shippingAmount,
      totalAmount,
      balanceDue: totalAmount,
      paymentTerms: input.paymentTerms,
      notes: input.notes,
      createdBy: userId,
      lines: {
        create: lineData,
      },
    },
  });

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
  };
}

/**
 * Create a sales invoice (Accounts Receivable)
 */
export async function createSalesInvoice(
  input: CreateSalesInvoiceInput,
  userId: string
): Promise<{ invoiceId: string; invoiceNumber: string }> {
  const invoiceNumber = await generateSalesInvoiceNumber();

  // Calculate totals
  let subtotal = 0;
  let totalTax = 0;
  let totalDiscount = 0;
  let totalCost = 0;

  const lineData = await Promise.all(
    input.lines.map(async (line, index) => {
      const lineAmount = line.quantity * line.unitPrice;
      const discountAmount = lineAmount * ((line.discountPercent || 0) / 100);
      const taxableAmount = lineAmount - discountAmount;
      const taxAmount = taxableAmount * ((line.taxRate || 0) / 100);
      const totalAmount = taxableAmount + taxAmount;

      // Get cost for margin calculation
      let unitCost = 0;
      if (line.partId) {
        const partCost = await getPartCostRollup(line.partId);
        unitCost = partCost?.totalCost || 0;
      }
      const lineCost = unitCost * line.quantity;

      subtotal += lineAmount;
      totalDiscount += discountAmount;
      totalTax += taxAmount;
      totalCost += lineCost;

      return {
        lineNumber: index + 1,
        partId: line.partId,
        productId: line.productId,
        description: line.description,
        quantity: line.quantity,
        uom: "EA",
        unitPrice: line.unitPrice,
        lineAmount,
        discountPercent: line.discountPercent || 0,
        discountAmount,
        taxAmount,
        totalAmount,
        unitCost,
        totalCost: lineCost,
      };
    })
  );

  const shippingAmount = input.shippingAmount || 0;
  const totalAmount = subtotal - totalDiscount + totalTax + shippingAmount;
  const grossMargin = subtotal - totalCost;
  const marginPercent = subtotal > 0 ? (grossMargin / subtotal) * 100 : 0;

  // Create invoice with lines
  const invoice = await prisma.salesInvoice.create({
    data: {
      invoiceNumber,
      customerId: input.customerId,
      salesOrderId: input.salesOrderId,
      invoiceDate: input.invoiceDate,
      dueDate: input.dueDate,
      subtotal,
      taxAmount: totalTax,
      shippingAmount,
      discountAmount: totalDiscount,
      totalAmount,
      balanceDue: totalAmount,
      totalCost,
      grossMargin,
      marginPercent,
      paymentTerms: input.paymentTerms,
      notes: input.notes,
      createdBy: userId,
      lines: {
        create: lineData,
      },
    },
  });

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
  };
}

/**
 * Record a payment for a purchase invoice
 */
export async function recordPurchasePayment(
  input: PaymentInput,
  userId: string
): Promise<{ paymentId: string; paymentNumber: string }> {
  const paymentNumber = await generatePaymentNumber("purchase");

  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id: input.invoiceId },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const payment = await prisma.purchasePayment.create({
    data: {
      invoiceId: input.invoiceId,
      paymentNumber,
      paymentDate: input.paymentDate,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      referenceNumber: input.referenceNumber,
      notes: input.notes,
      createdBy: userId,
    },
  });

  // Update invoice
  const newPaidAmount = invoice.paidAmount + input.amount;
  const newBalanceDue = invoice.totalAmount - newPaidAmount;
  const newStatus =
    newBalanceDue <= 0
      ? "PAID"
      : newPaidAmount > 0
      ? "PARTIALLY_PAID"
      : invoice.status;

  await prisma.purchaseInvoice.update({
    where: { id: input.invoiceId },
    data: {
      paidAmount: newPaidAmount,
      balanceDue: newBalanceDue,
      status: newStatus,
    },
  });

  return {
    paymentId: payment.id,
    paymentNumber: payment.paymentNumber,
  };
}

/**
 * Record a payment for a sales invoice
 */
export async function recordSalesPayment(
  input: PaymentInput,
  userId: string
): Promise<{ paymentId: string; paymentNumber: string }> {
  const paymentNumber = await generatePaymentNumber("sales");

  const invoice = await prisma.salesInvoice.findUnique({
    where: { id: input.invoiceId },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const payment = await prisma.salesPayment.create({
    data: {
      invoiceId: input.invoiceId,
      paymentNumber,
      paymentDate: input.paymentDate,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      referenceNumber: input.referenceNumber,
      notes: input.notes,
      createdBy: userId,
    },
  });

  // Update invoice
  const newReceivedAmount = invoice.receivedAmount + input.amount;
  const newBalanceDue = invoice.totalAmount - newReceivedAmount;
  const newStatus =
    newBalanceDue <= 0
      ? "PAID"
      : newReceivedAmount > 0
      ? "PARTIALLY_PAID"
      : invoice.status;

  await prisma.salesInvoice.update({
    where: { id: input.invoiceId },
    data: {
      receivedAmount: newReceivedAmount,
      balanceDue: newBalanceDue,
      status: newStatus,
    },
  });

  return {
    paymentId: payment.id,
    paymentNumber: payment.paymentNumber,
  };
}

/**
 * Get AP aging summary
 */
export async function getAPAging(): Promise<{
  total: number;
  current: number;
  overdue30: number;
  overdue60: number;
  overdue90: number;
}> {
  const today = new Date();
  const days30Ago = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const days60Ago = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
  const days90Ago = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

  const invoices = await prisma.purchaseInvoice.findMany({
    where: {
      status: { notIn: ["PAID", "VOID", "CANCELLED"] },
      balanceDue: { gt: 0 },
    },
  });

  let current = 0;
  let overdue30 = 0;
  let overdue60 = 0;
  let overdue90 = 0;

  for (const inv of invoices) {
    const dueDate = new Date(inv.dueDate);
    if (dueDate >= today) {
      current += inv.balanceDue;
    } else if (dueDate >= days30Ago) {
      overdue30 += inv.balanceDue;
    } else if (dueDate >= days60Ago) {
      overdue60 += inv.balanceDue;
    } else if (dueDate >= days90Ago) {
      overdue90 += inv.balanceDue;
    } else {
      overdue90 += inv.balanceDue; // 90+ days
    }
  }

  return {
    total: current + overdue30 + overdue60 + overdue90,
    current,
    overdue30,
    overdue60,
    overdue90,
  };
}

/**
 * Get AR aging summary
 */
export async function getARAging(): Promise<{
  total: number;
  current: number;
  overdue30: number;
  overdue60: number;
  overdue90: number;
}> {
  const today = new Date();
  const days30Ago = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const days60Ago = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
  const days90Ago = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

  const invoices = await prisma.salesInvoice.findMany({
    where: {
      status: { notIn: ["PAID", "VOID", "CANCELLED"] },
      balanceDue: { gt: 0 },
    },
  });

  let current = 0;
  let overdue30 = 0;
  let overdue60 = 0;
  let overdue90 = 0;

  for (const inv of invoices) {
    const dueDate = new Date(inv.dueDate);
    if (dueDate >= today) {
      current += inv.balanceDue;
    } else if (dueDate >= days30Ago) {
      overdue30 += inv.balanceDue;
    } else if (dueDate >= days60Ago) {
      overdue60 += inv.balanceDue;
    } else if (dueDate >= days90Ago) {
      overdue90 += inv.balanceDue;
    } else {
      overdue90 += inv.balanceDue; // 90+ days
    }
  }

  return {
    total: current + overdue30 + overdue60 + overdue90,
    current,
    overdue30,
    overdue60,
    overdue90,
  };
}
