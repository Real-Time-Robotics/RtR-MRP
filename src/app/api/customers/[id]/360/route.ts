// =============================================================================
// CUSTOMER 360 VIEW API
// GET /api/customers/[id]/360 — Full customer dashboard data
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  withPermission,
  successResponse,
  errorResponse,
  notFoundResponse,
  AuthUser,
} from '@/lib/api/with-permission';
import { calculateCreditUsed } from '@/lib/customers/credit-engine';
import { checkReadEndpointLimit } from '@/lib/rate-limit';

async function getHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      contacts: {
        orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
      },
      _count: {
        select: {
          salesOrders: true,
          quotations: true,
          salesInvoices: true,
        },
      },
    },
  });

  if (!customer) return notFoundResponse('Khách hàng');

  // Credit status
  const freshCreditUsed = await calculateCreditUsed(id);
  if (freshCreditUsed !== customer.creditUsed) {
    await prisma.customer.update({
      where: { id },
      data: { creditUsed: freshCreditUsed },
    });
  }
  const creditLimit = customer.creditLimit;
  const creditRemaining = creditLimit === 0 ? null : Math.round((creditLimit - freshCreditUsed) * 100) / 100;
  const utilizationPercent = creditLimit > 0
    ? Math.round((freshCreditUsed / creditLimit) * 10000) / 100
    : 0;

  // Stats: orders
  const orderStats = await prisma.salesOrder.aggregate({
    where: { customerId: id },
    _sum: { totalAmount: true },
    _avg: { totalAmount: true },
    _count: true,
  });

  // Quotation stats for conversion rate
  const totalQuotations = customer._count.quotations;
  const convertedQuotations = await prisma.quotation.count({
    where: { customerId: id, status: 'converted' },
  });
  const conversionRate = totalQuotations > 0
    ? Math.round((convertedQuotations / totalQuotations) * 10000) / 100
    : 0;

  // Recent orders (last 10)
  const recentOrders = await prisma.salesOrder.findMany({
    where: { customerId: id },
    take: 10,
    orderBy: { orderDate: 'desc' },
    select: {
      id: true,
      orderNumber: true,
      orderDate: true,
      status: true,
      totalAmount: true,
      sourceType: true,
    },
  });

  // Recent quotations (last 10)
  const recentQuotations = await prisma.quotation.findMany({
    where: { customerId: id },
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      quoteNumber: true,
      status: true,
      totalAmount: true,
      validUntil: true,
      createdAt: true,
    },
  });

  // Recent invoices (last 10)
  const recentInvoices = await prisma.salesInvoice.findMany({
    where: { customerId: id },
    take: 10,
    orderBy: { invoiceDate: 'desc' },
    select: {
      id: true,
      invoiceNumber: true,
      invoiceDate: true,
      dueDate: true,
      status: true,
      totalAmount: true,
      receivedAmount: true,
      balanceDue: true,
    },
  });

  // Invoice stats
  const invoiceStats = await prisma.salesInvoice.aggregate({
    where: { customerId: id },
    _sum: { totalAmount: true, receivedAmount: true, balanceDue: true },
  });

  // Timeline: combine recent activities
  const timeline: Array<{
    type: string;
    date: string;
    title: string;
    description: string;
    status?: string;
  }> = [];

  recentOrders.forEach((o) => {
    timeline.push({
      type: 'order',
      date: o.orderDate.toISOString(),
      title: `Đơn hàng ${o.orderNumber}`,
      description: `$${(o.totalAmount || 0).toLocaleString()} — ${o.status}`,
      status: o.status,
    });
  });

  recentQuotations.forEach((q) => {
    timeline.push({
      type: 'quotation',
      date: q.createdAt.toISOString(),
      title: `Báo giá ${q.quoteNumber}`,
      description: `$${q.totalAmount.toLocaleString()} — ${q.status}`,
      status: q.status,
    });
  });

  recentInvoices.forEach((inv) => {
    timeline.push({
      type: 'invoice',
      date: inv.invoiceDate.toISOString(),
      title: `Hóa đơn ${inv.invoiceNumber}`,
      description: `$${inv.totalAmount.toLocaleString()} — ${inv.status}`,
      status: inv.status,
    });
  });

  // Sort timeline by date descending
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return successResponse({
    customer: {
      id: customer.id,
      code: customer.code,
      name: customer.name,
      type: customer.type,
      country: customer.country,
      status: customer.status,
      contactName: customer.contactName,
      contactEmail: customer.contactEmail,
      contactPhone: customer.contactPhone,
      billingAddress: customer.billingAddress,
      paymentTerms: customer.paymentTerms,
      tier: customer.tier,
      createdAt: customer.createdAt,
    },
    credit: {
      creditLimit,
      creditUsed: freshCreditUsed,
      creditRemaining,
      utilizationPercent,
      isUnlimited: creditLimit === 0,
    },
    contacts: customer.contacts,
    stats: {
      totalOrders: orderStats._count,
      totalRevenue: orderStats._sum.totalAmount || 0,
      avgOrderValue: Math.round((orderStats._avg.totalAmount || 0) * 100) / 100,
      totalQuotations,
      convertedQuotations,
      conversionRate,
      totalInvoices: customer._count.salesInvoices,
      totalInvoiced: invoiceStats._sum.totalAmount || 0,
      totalReceived: invoiceStats._sum.receivedAmount || 0,
      totalOutstanding: invoiceStats._sum.balanceDue || 0,
    },
    recentOrders,
    recentQuotations,
    recentInvoices,
    timeline: timeline.slice(0, 20),
  });
}

export const GET = withPermission(getHandler, { read: 'orders:view' });
