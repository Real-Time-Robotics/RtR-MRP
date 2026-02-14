import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// =============================================================================
// SUPPLIER PORTAL API
// Provides data for supplier self-service portal - Production Implementation
// =============================================================================

// Types
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'IN_PRODUCTION' | 'READY' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type DeliveryStatus = 'SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED' | 'DELAYED' | 'CANCELLED';
export type InvoiceStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REJECTED' | 'OVERDUE';

// Helper: Get authenticated supplier ID
async function getAuthenticatedSupplierId(request: NextRequest): Promise<string | null> {
  const supplierId = request.headers.get('x-supplier-id') ||
                     request.nextUrl.searchParams.get('supplierId');
  return supplierId || null;
}

// Helper: Map PO status to display status
function mapPOStatus(status: string): OrderStatus {
  const statusMap: Record<string, OrderStatus> = {
    draft: 'PENDING',
    pending: 'PENDING',
    ordered: 'CONFIRMED',
    partial: 'IN_PRODUCTION',
    received: 'DELIVERED',
    cancelled: 'CANCELLED',
  };
  return statusMap[status.toLowerCase()] || 'PENDING';
}

// Helper: Map invoice status from Prisma enum to display status
function mapInvoiceStatus(status: string): InvoiceStatus {
  const statusMap: Record<string, InvoiceStatus> = {
    DRAFT: 'DRAFT',
    PENDING_APPROVAL: 'SUBMITTED',
    APPROVED: 'APPROVED',
    SENT: 'SUBMITTED',
    PARTIALLY_PAID: 'APPROVED',
    PAID: 'PAID',
    OVERDUE: 'OVERDUE',
    CANCELLED: 'REJECTED',
    VOID: 'REJECTED',
    // Also handle lowercase for backwards compatibility
    draft: 'DRAFT',
    pending: 'SUBMITTED',
    approved: 'APPROVED',
    paid: 'PAID',
    rejected: 'REJECTED',
    overdue: 'OVERDUE',
  };
  return statusMap[status] || 'DRAFT';
}

export interface SupplierOrder {
  id: string;
  poNumber: string;
  orderDate: string;
  requiredDate: string;
  status: OrderStatus;
  items: {
    partCode: string;
    partName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }[];
  totalAmount: number;
  currency: string;
  notes?: string;
}

export interface SupplierDelivery {
  id: string;
  deliveryNumber: string;
  orderId: string;
  poNumber: string;
  scheduledDate: string;
  actualDate?: string;
  status: DeliveryStatus;
  items: {
    partCode: string;
    partName: string;
    orderedQty: number;
    deliveredQty: number;
    unit: string;
  }[];
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
}

export interface SupplierInvoice {
  id: string;
  invoiceNumber: string;
  deliveryId: string;
  poNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  paymentTerms: string;
  paidDate?: string;
}

export interface SupplierPerformance {
  period: string;
  metrics: {
    onTimeDelivery: number;
    qualityRate: number;
    responseTime: number; // hours
    orderFulfillment: number;
    defectRate: number;
  };
  trend: {
    onTimeDelivery: 'up' | 'down' | 'stable';
    qualityRate: 'up' | 'down' | 'stable';
    responseTime: 'up' | 'down' | 'stable';
    orderFulfillment: 'up' | 'down' | 'stable';
    defectRate: 'up' | 'down' | 'stable';
  };
  ranking: {
    overall: string;
    category: number;
    total: number;
  };
}

// Mock data generators
function generateMockOrders(supplierId: string): SupplierOrder[] {
  const statuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'SHIPPED', 'DELIVERED'];

  return Array.from({ length: 12 }, (_, i) => ({
    id: `ORD-${supplierId}-${String(i + 1).padStart(4, '0')}`,
    poNumber: `PO-2026-${String(1000 + i).padStart(5, '0')}`,
    orderDate: new Date(Date.now() - (11 - i) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    requiredDate: new Date(Date.now() - (11 - i) * 7 * 24 * 60 * 60 * 1000 + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: statuses[Math.min(i < 6 ? Math.floor(i / 2) : 5, 5)],
    items: [
      {
        partCode: `COMP-${String(100 + i).padStart(3, '0')}`,
        partName: `Component ${String.fromCharCode(65 + (i % 26))}${i + 1}`,
        quantity: 100 * (i + 1),
        unit: 'pcs',
        unitPrice: 50000 + i * 5000,
      },
      {
        partCode: `COMP-${String(200 + i).padStart(3, '0')}`,
        partName: `Component ${String.fromCharCode(66 + (i % 26))}${i + 1}`,
        quantity: 50 * (i + 1),
        unit: 'pcs',
        unitPrice: 75000 + i * 3000,
      },
    ],
    totalAmount: (100 * (i + 1) * (50000 + i * 5000)) + (50 * (i + 1) * (75000 + i * 3000)),
    currency: 'VND',
    notes: i % 3 === 0 ? 'Urgent order - priority handling required' : undefined,
  }));
}

function generateMockDeliveries(supplierId: string): SupplierDelivery[] {
  const statuses: DeliveryStatus[] = ['SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'DELAYED'];

  return Array.from({ length: 8 }, (_, i) => ({
    id: `DEL-${supplierId}-${String(i + 1).padStart(4, '0')}`,
    deliveryNumber: `DN-2026-${String(2000 + i).padStart(5, '0')}`,
    orderId: `ORD-${supplierId}-${String(i + 1).padStart(4, '0')}`,
    poNumber: `PO-2026-${String(1000 + i).padStart(5, '0')}`,
    scheduledDate: new Date(Date.now() + (i - 4) * 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    actualDate: i >= 4 ? new Date(Date.now() + (i - 4) * 3 * 24 * 60 * 60 * 1000 + (i === 5 ? 2 : 0) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
    status: i < 2 ? 'SCHEDULED' : i < 4 ? 'IN_TRANSIT' : i === 5 ? 'DELAYED' : 'DELIVERED',
    items: [
      {
        partCode: `COMP-${String(100 + i).padStart(3, '0')}`,
        partName: `Component ${String.fromCharCode(65 + (i % 26))}${i + 1}`,
        orderedQty: 100 * (i + 1),
        deliveredQty: i >= 4 ? 100 * (i + 1) - (i === 5 ? 20 : 0) : 0,
        unit: 'pcs',
      },
    ],
    trackingNumber: i >= 2 ? `TRK${String(Date.now()).slice(-8)}${i}` : undefined,
    carrier: i >= 2 ? ['Viettel Post', 'GHTK', 'GHN', 'J&T'][i % 4] : undefined,
    notes: i === 5 ? 'Partial delivery - remaining items delayed' : undefined,
  }));
}

function generateMockInvoices(supplierId: string): SupplierInvoice[] {
  const statuses: InvoiceStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'OVERDUE'];

  return Array.from({ length: 10 }, (_, i) => {
    const subtotal = (100 * (i + 1) * (50000 + i * 5000));
    const tax = subtotal * 0.1;

    return {
      id: `INV-${supplierId}-${String(i + 1).padStart(4, '0')}`,
      invoiceNumber: `INV-2026-${String(3000 + i).padStart(5, '0')}`,
      deliveryId: `DEL-${supplierId}-${String(i + 1).padStart(4, '0')}`,
      poNumber: `PO-2026-${String(1000 + i).padStart(5, '0')}`,
      invoiceDate: new Date(Date.now() - (9 - i) * 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dueDate: new Date(Date.now() - (9 - i) * 5 * 24 * 60 * 60 * 1000 + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: i < 2 ? 'DRAFT' : i < 4 ? 'SUBMITTED' : i < 6 ? 'APPROVED' : i < 9 ? 'PAID' : 'OVERDUE',
      items: [
        {
          description: `Component ${String.fromCharCode(65 + (i % 26))}${i + 1} - Delivery`,
          quantity: 100 * (i + 1),
          unitPrice: 50000 + i * 5000,
          amount: 100 * (i + 1) * (50000 + i * 5000),
        },
      ],
      subtotal,
      tax,
      total: subtotal + tax,
      currency: 'VND',
      paymentTerms: 'Net 30',
      paidDate: i >= 6 && i < 9 ? new Date(Date.now() - (9 - i) * 5 * 24 * 60 * 60 * 1000 + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
    };
  });
}

function generateMockPerformance(supplierId: string): SupplierPerformance {
  return {
    period: 'Q4 2025',
    metrics: {
      onTimeDelivery: 94.5,
      qualityRate: 98.2,
      responseTime: 4.5,
      orderFulfillment: 96.8,
      defectRate: 1.8,
    },
    trend: {
      onTimeDelivery: 'up',
      qualityRate: 'stable',
      responseTime: 'up',
      orderFulfillment: 'up',
      defectRate: 'down',
    },
    ranking: {
      overall: 'A',
      category: 3,
      total: 45,
    },
  };
}

function generateDashboardSummary(supplierId: string) {
  return {
    orders: {
      total: 12,
      pending: 2,
      inProgress: 4,
      completed: 6,
    },
    deliveries: {
      total: 8,
      scheduled: 2,
      inTransit: 2,
      delivered: 4,
    },
    invoices: {
      total: 10,
      pending: 4,
      approved: 2,
      paid: 3,
      overdue: 1,
    },
    revenue: {
      thisMonth: 285000000,
      lastMonth: 245000000,
      thisYear: 2850000000,
      growth: 16.3,
    },
    performance: {
      rating: 'A',
      onTimeDelivery: 94.5,
      qualityRate: 98.2,
    },
    notifications: [
      { id: '1', type: 'order', message: 'Đơn hàng PO-2026-01003 cần xác nhận', time: '2 giờ trước', urgent: true },
      { id: '2', type: 'delivery', message: 'Giao hàng DN-2026-02005 đã trễ hạn', time: '5 giờ trước', urgent: true },
      { id: '3', type: 'invoice', message: 'Hóa đơn INV-2026-03009 quá hạn thanh toán', time: '1 ngày trước', urgent: true },
      { id: '4', type: 'info', message: 'Báo cáo hiệu suất Q4 2025 đã sẵn sàng', time: '2 ngày trước', urgent: false },
    ],
  };
}

// =============================================================================
// GET /api/v2/supplier
// Query params:
//   - view: 'dashboard' | 'orders' | 'deliveries' | 'invoices' | 'performance'
//   - status: filter by status
//   - page: page number
//   - limit: items per page
// =============================================================================
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view') || 'dashboard';
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get authenticated supplier ID
    const supplierId = await getAuthenticatedSupplierId(request);

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: 'Supplier ID required' },
        { status: 401 }
      );
    }

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    switch (view) {
      case 'dashboard': {
        // Fetch real data for dashboard
        const [purchaseOrders, invoices] = await Promise.all([
          prisma.purchaseOrder.findMany({
            where: { supplierId },
            include: {
              lines: {
                include: { part: true },
              },
            },
            orderBy: { orderDate: 'desc' },
          }),
          prisma.purchaseInvoice.findMany({
            where: { supplierId },
            orderBy: { invoiceDate: 'desc' },
          }),
        ]);

        // Calculate summary
        const pendingOrders = purchaseOrders.filter(po => ['draft', 'pending'].includes(po.status));
        const inProgressOrders = purchaseOrders.filter(po => ['ordered', 'partial'].includes(po.status));
        const completedOrders = purchaseOrders.filter(po => po.status === 'received');

        const pendingInvoices = invoices.filter(inv => ['DRAFT', 'PENDING_APPROVAL'].includes(inv.status));
        const approvedInvoices = invoices.filter(inv => inv.status === 'APPROVED');
        const paidInvoices = invoices.filter(inv => inv.status === 'PAID');
        const overdueInvoices = invoices.filter(inv => {
          if (inv.status === 'PAID') return false;
          return inv.dueDate && new Date(inv.dueDate) < new Date();
        });

        // Calculate revenue (based on paid amount, not paidDate since that doesn't exist)
        const thisMonth = new Date();
        thisMonth.setDate(1);
        const lastMonth = new Date(thisMonth);
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        // Use invoiceDate as proxy for payment timing since paidDate doesn't exist
        const thisMonthRevenue = paidInvoices
          .filter(inv => inv.invoiceDate && new Date(inv.invoiceDate) >= thisMonth)
          .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

        const lastMonthRevenue = paidInvoices
          .filter(inv => inv.invoiceDate && new Date(inv.invoiceDate) >= lastMonth && new Date(inv.invoiceDate) < thisMonth)
          .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

        const yearStart = new Date(new Date().getFullYear(), 0, 1);
        const thisYearRevenue = paidInvoices
          .filter(inv => inv.invoiceDate && new Date(inv.invoiceDate) >= yearStart)
          .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

        const growth = lastMonthRevenue > 0
          ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
          : 0;

        const summary = {
          orders: {
            total: purchaseOrders.length,
            pending: pendingOrders.length,
            inProgress: inProgressOrders.length,
            completed: completedOrders.length,
          },
          deliveries: {
            total: 0,
            scheduled: 0,
            inTransit: 0,
            delivered: 0,
          },
          invoices: {
            total: invoices.length,
            pending: pendingInvoices.length,
            approved: approvedInvoices.length,
            paid: paidInvoices.length,
            overdue: overdueInvoices.length,
          },
          revenue: {
            thisMonth: thisMonthRevenue,
            lastMonth: lastMonthRevenue,
            thisYear: thisYearRevenue,
            growth: Math.round(growth * 10) / 10,
          },
          performance: {
            rating: supplier.rating ? (supplier.rating >= 4 ? 'A' : supplier.rating >= 3 ? 'B' : 'C') : 'N/A',
            onTimeDelivery: 95, // Would calculate from delivery data
            qualityRate: 98, // Would calculate from inspection data
          },
          notifications: [],
        };

        return NextResponse.json({
          success: true,
          data: summary,
        });
      }

      case 'orders': {
        const where: any = { supplierId };
        if (status) {
          where.status = status.toLowerCase();
        }

        const [purchaseOrders, total] = await Promise.all([
          prisma.purchaseOrder.findMany({
            where,
            include: {
              lines: {
                include: { part: true },
              },
            },
            orderBy: { orderDate: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.purchaseOrder.count({ where }),
        ]);

        const orders: SupplierOrder[] = purchaseOrders.map(po => ({
          id: po.id,
          poNumber: po.poNumber,
          orderDate: po.orderDate.toISOString().split('T')[0],
          requiredDate: po.expectedDate.toISOString().split('T')[0],
          status: mapPOStatus(po.status),
          items: po.lines.map(line => ({
            partCode: line.part.partNumber,
            partName: line.part.name,
            quantity: line.quantity,
            unit: line.part.unit,
            unitPrice: line.unitPrice,
          })),
          totalAmount: po.totalAmount || po.lines.reduce((sum, l) => sum + (l.lineTotal || 0), 0),
          currency: po.currency,
          notes: po.notes || undefined,
        }));

        return NextResponse.json({
          success: true,
          data: {
            orders,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          },
        });
      }

      case 'deliveries': {
        // Would need delivery tracking table - return empty for now
        return NextResponse.json({
          success: true,
          data: {
            deliveries: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
            },
          },
        });
      }

      case 'invoices': {
        const where: any = { supplierId };
        if (status) {
          where.status = status.toLowerCase();
        }

        const [dbInvoices, total] = await Promise.all([
          prisma.purchaseInvoice.findMany({
            where,
            include: {
              purchaseOrder: true,
              lines: true,
            },
            orderBy: { invoiceDate: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.purchaseInvoice.count({ where }),
        ]);

        const invoices: SupplierInvoice[] = dbInvoices.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          deliveryId: '',
          poNumber: inv.purchaseOrder?.poNumber || '',
          invoiceDate: inv.invoiceDate.toISOString().split('T')[0],
          dueDate: inv.dueDate.toISOString().split('T')[0],
          status: mapInvoiceStatus(inv.status),
          items: inv.lines.map(line => ({
            description: line.description || '',
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            amount: line.lineAmount || line.quantity * line.unitPrice,
          })),
          subtotal: inv.subtotal || 0,
          tax: inv.taxAmount || 0,
          total: inv.totalAmount || 0,
          currency: inv.currencyCode || 'VND',
          paymentTerms: inv.paymentTerms || 'Net 30',
          paidDate: inv.status === 'PAID' ? inv.invoiceDate.toISOString().split('T')[0] : undefined,
        }));

        return NextResponse.json({
          success: true,
          data: {
            invoices,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          },
        });
      }

      case 'performance': {
        // Would calculate from actual data - return placeholder for now
        const performance = generateMockPerformance(supplierId);
        return NextResponse.json({
          success: true,
          data: performance,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown view: ${view}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/v2/supplier' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/v2/supplier
// Body:
//   - action: 'confirm_order' | 'update_delivery' | 'submit_invoice'
//   - data: action-specific payload
// =============================================================================
export async function POST(request: NextRequest) {
  try {
    const supplierId = await getAuthenticatedSupplierId(request);

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: 'Supplier ID required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'confirm_order': {
        const { orderId } = data;

        // Verify the PO belongs to this supplier
        const po = await prisma.purchaseOrder.findFirst({
          where: { id: orderId, supplierId },
        });

        if (!po) {
          return NextResponse.json(
            { success: false, error: 'Order not found' },
            { status: 404 }
          );
        }

        // Update PO status to ordered (confirmed)
        await prisma.purchaseOrder.update({
          where: { id: orderId },
          data: { status: 'ordered' },
        });

        return NextResponse.json({
          success: true,
          message: `Đơn hàng ${po.poNumber} đã được xác nhận`,
          data: { orderId, poNumber: po.poNumber, newStatus: 'CONFIRMED' },
        });
      }

      case 'update_delivery': {
        const { orderId, trackingNumber, carrier, estimatedDate } = data;

        // Verify the PO belongs to this supplier
        const po = await prisma.purchaseOrder.findFirst({
          where: { id: orderId, supplierId },
        });

        if (!po) {
          return NextResponse.json(
            { success: false, error: 'Order not found' },
            { status: 404 }
          );
        }

        // Update expected date if provided
        if (estimatedDate) {
          await prisma.purchaseOrder.update({
            where: { id: orderId },
            data: {
              expectedDate: new Date(estimatedDate),
              notes: po.notes
                ? `${po.notes}\nTracking: ${trackingNumber || ''}, Carrier: ${carrier || ''}`
                : `Tracking: ${trackingNumber || ''}, Carrier: ${carrier || ''}`,
            },
          });
        }

        return NextResponse.json({
          success: true,
          message: `Thông tin giao hàng ${po.poNumber} đã được cập nhật`,
          data: { orderId, poNumber: po.poNumber, trackingNumber, carrier, estimatedDate },
        });
      }

      case 'submit_invoice': {
        const { invoiceId } = data;

        // Verify the invoice belongs to this supplier
        const invoice = await prisma.purchaseInvoice.findFirst({
          where: { id: invoiceId, supplierId },
        });

        if (!invoice) {
          return NextResponse.json(
            { success: false, error: 'Invoice not found' },
            { status: 404 }
          );
        }

        // Update invoice status to PENDING_APPROVAL (submitted)
        await prisma.purchaseInvoice.update({
          where: { id: invoiceId },
          data: { status: 'PENDING_APPROVAL' },
        });

        return NextResponse.json({
          success: true,
          message: `Hóa đơn ${invoice.invoiceNumber} đã được gửi`,
          data: { invoiceId, invoiceNumber: invoice.invoiceNumber, newStatus: 'SUBMITTED' },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/v2/supplier' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
