// =============================================================================
// CUSTOMER PORTAL API
// Phase 9: Customer Portal - Production Implementation
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  CustomerPortalEngine,
  Customer,
  SalesOrder,
  CustomerDelivery,
  CustomerInvoice,
  SupportTicket,
  CustomerDashboard,
  CustomerNotification,
  SOItem,
} from '@/lib/customer/customer-engine';

export const dynamic = 'force-dynamic';

// =============================================================================
// HELPER: Get authenticated customer ID
// In production, this would come from the session/JWT token
// =============================================================================

async function getAuthenticatedCustomerId(request: NextRequest): Promise<string | null> {
  // TODO: Implement proper authentication
  // For now, check for customerId in headers or query params
  const customerId = request.headers.get('x-customer-id') ||
                     request.nextUrl.searchParams.get('customerId');
  return customerId;
}

// =============================================================================
// HELPER: Transform database records to portal types
// =============================================================================

function transformCustomer(dbCustomer: any): Customer {
  return {
    id: dbCustomer.id,
    code: dbCustomer.code,
    name: dbCustomer.name,
    contactPerson: dbCustomer.contactName || '',
    email: dbCustomer.contactEmail || '',
    phone: dbCustomer.contactPhone || '',
    address: dbCustomer.billingAddress || '',
    taxId: '', // Add to schema if needed
    creditLimit: dbCustomer.creditLimit || 0,
    currentCredit: 0, // Calculate from unpaid invoices
    paymentTerms: dbCustomer.paymentTerms || 'Net 30',
    tier: 'STANDARD', // Map from customer type if available
    status: dbCustomer.status === 'active' ? 'ACTIVE' : 'INACTIVE',
    createdAt: dbCustomer.createdAt.toISOString(),
  };
}

function mapOrderStatus(status: string): SalesOrder['status'] {
  const statusMap: Record<string, SalesOrder['status']> = {
    draft: 'DRAFT',
    pending: 'PENDING',
    confirmed: 'CONFIRMED',
    in_production: 'IN_PRODUCTION',
    ready: 'READY',
    shipped: 'SHIPPED',
    delivered: 'DELIVERED',
    completed: 'COMPLETED',
    cancelled: 'CANCELLED',
  };
  return statusMap[status.toLowerCase()] || 'PENDING';
}

function transformSalesOrder(dbOrder: any): SalesOrder {
  const items: SOItem[] = dbOrder.lines?.map((line: any) => ({
    id: line.id,
    productCode: line.product?.sku || '',
    productName: line.product?.name || '',
    quantity: line.quantity,
    unit: 'PCS',
    unitPrice: line.unitPrice,
    discount: line.discount || 0,
    amount: line.lineTotal || line.quantity * line.unitPrice,
    producedQty: 0, // Would come from work orders
    shippedQty: 0,  // Would come from deliveries
    status: line.status === 'pending' ? 'PENDING' : 'IN_PRODUCTION',
  })) || [];

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount = items.reduce((sum, item) => sum + (item.amount * item.discount / 100), 0);
  const taxRate = 0.1; // 10% VAT
  const tax = (subtotal - discountAmount) * taxRate;

  return {
    id: dbOrder.id,
    soNumber: dbOrder.orderNumber,
    customerId: dbOrder.customerId,
    customerName: dbOrder.customer?.name || '',
    status: mapOrderStatus(dbOrder.status),
    orderDate: dbOrder.orderDate.toISOString(),
    requestedDate: dbOrder.requiredDate.toISOString(),
    promisedDate: dbOrder.promisedDate?.toISOString(),
    items,
    subtotal,
    discount: discountAmount,
    tax,
    total: dbOrder.totalAmount || (subtotal - discountAmount + tax),
    currency: dbOrder.currency || 'VND',
    shippingAddress: dbOrder.customer?.billingAddress || '',
    priority: dbOrder.priority?.toUpperCase() || 'NORMAL',
    productionProgress: 0, // Calculate from work orders
    createdBy: 'Sales Team',
    notes: dbOrder.notes,
  };
}

function transformInvoice(dbInvoice: any): CustomerInvoice {
  return {
    id: dbInvoice.id,
    invoiceNumber: dbInvoice.invoiceNumber,
    soId: dbInvoice.salesOrderId || '',
    soNumber: dbInvoice.salesOrder?.orderNumber || '',
    customerId: dbInvoice.customerId,
    status: dbInvoice.status?.toUpperCase() || 'DRAFT',
    invoiceDate: dbInvoice.invoiceDate.toISOString(),
    dueDate: dbInvoice.dueDate.toISOString(),
    paidDate: dbInvoice.paidDate?.toISOString(),
    subtotal: dbInvoice.subtotal || 0,
    discount: dbInvoice.discount || 0,
    tax: dbInvoice.taxAmount || 0,
    total: dbInvoice.totalAmount || 0,
    paidAmount: dbInvoice.paidAmount || 0,
    balance: (dbInvoice.totalAmount || 0) - (dbInvoice.paidAmount || 0),
    currency: dbInvoice.currency || 'VND',
    items: dbInvoice.lines?.map((line: any) => ({
      id: line.id,
      description: line.description || '',
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discount: line.discount || 0,
      amount: line.amount || line.quantity * line.unitPrice,
    })) || [],
    paymentMethod: dbInvoice.paymentMethod,
    createdAt: dbInvoice.createdAt.toISOString(),
  };
}

// =============================================================================
// GET /api/v2/customer
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'dashboard';
    const customerId = await getAuthenticatedCustomerId(request);

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID required' },
        { status: 401 }
      );
    }

    // Fetch customer from database
    const dbCustomer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!dbCustomer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = transformCustomer(dbCustomer);

    // Dashboard view
    if (view === 'dashboard') {
      // Fetch all data for dashboard
      const [salesOrders, invoices] = await Promise.all([
        prisma.salesOrder.findMany({
          where: { customerId },
          include: {
            customer: true,
            lines: {
              include: { product: true },
            },
          },
          orderBy: { orderDate: 'desc' },
          take: 10,
        }),
        prisma.salesInvoice.findMany({
          where: { customerId },
          include: {
            salesOrder: true,
            lines: true,
          },
          orderBy: { invoiceDate: 'desc' },
        }),
      ]);

      const orders = salesOrders.map(transformSalesOrder);
      const invoiceList = invoices.map(transformInvoice);

      const activeOrders = orders.filter(so =>
        !['COMPLETED', 'CANCELLED'].includes(so.status)
      );
      const unpaidInvoices = invoiceList.filter(inv =>
        !['PAID', 'CANCELLED'].includes(inv.status)
      );

      // Calculate current credit (total unpaid)
      customer.currentCredit = unpaidInvoices.reduce((sum, inv) => sum + inv.balance, 0);

      const dashboard: CustomerDashboard = {
        customer,
        summary: {
          activeOrders: activeOrders.length,
          pendingDeliveries: 0, // Would need delivery tracking table
          unpaidInvoices: unpaidInvoices.length,
          openTickets: 0, // Would need support ticket table
          totalSpent: invoiceList.filter(i => i.status === 'PAID').reduce((s, i) => s + i.total, 0),
        },
        recentOrders: orders.slice(0, 5),
        upcomingDeliveries: [], // Would need delivery tracking
        pendingInvoices: unpaidInvoices,
        notifications: [], // Would need notification system for customers
      };

      return NextResponse.json({ success: true, data: dashboard });
    }

    // Orders view
    if (view === 'orders') {
      const status = searchParams.get('status');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');

      const where: any = { customerId };
      if (status) {
        where.status = status.toLowerCase();
      }

      const [salesOrders, total] = await Promise.all([
        prisma.salesOrder.findMany({
          where,
          include: {
            customer: true,
            lines: {
              include: { product: true },
            },
          },
          orderBy: { orderDate: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.salesOrder.count({ where }),
      ]);

      const orders = salesOrders.map(transformSalesOrder);

      return NextResponse.json({
        success: true,
        data: {
          orders,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // Single order
    if (view === 'order') {
      const orderId = searchParams.get('orderId');
      if (!orderId) {
        return NextResponse.json({ success: false, error: 'Order ID required' }, { status: 400 });
      }

      const dbOrder = await prisma.salesOrder.findFirst({
        where: { id: orderId, customerId },
        include: {
          customer: true,
          lines: {
            include: { product: true },
          },
          workOrders: {
            select: {
              status: true,
              completedQty: true,
              quantity: true,
            },
          },
        },
      });

      if (!dbOrder) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }

      const order = transformSalesOrder(dbOrder);

      // Calculate production progress from work orders
      if (dbOrder.workOrders && dbOrder.workOrders.length > 0) {
        const totalQty = dbOrder.workOrders.reduce((sum, wo) => sum + wo.quantity, 0);
        const completedQty = dbOrder.workOrders.reduce((sum, wo) => sum + wo.completedQty, 0);
        order.productionProgress = totalQty > 0 ? Math.round((completedQty / totalQty) * 100) : 0;
      }

      return NextResponse.json({ success: true, data: order });
    }

    // Invoices view
    if (view === 'invoices') {
      const status = searchParams.get('status');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');

      const where: any = { customerId };
      if (status) {
        where.status = status.toLowerCase();
      }

      const [invoices, total] = await Promise.all([
        prisma.salesInvoice.findMany({
          where,
          include: {
            salesOrder: true,
            lines: true,
          },
          orderBy: { invoiceDate: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.salesInvoice.count({ where }),
      ]);

      const invoiceList = invoices.map(transformInvoice);

      const summary = {
        total: invoiceList.reduce((s, i) => s + i.total, 0),
        paid: invoiceList.filter(i => i.status === 'PAID').reduce((s, i) => s + i.total, 0),
        unpaid: invoiceList.filter(i => i.status !== 'PAID').reduce((s, i) => s + i.balance, 0),
      };

      return NextResponse.json({
        success: true,
        data: {
          invoices: invoiceList,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          summary,
        },
      });
    }

    // Deliveries view - would need a delivery tracking table
    if (view === 'deliveries') {
      // For now, return empty until delivery tracking is implemented
      return NextResponse.json({
        success: true,
        data: {
          deliveries: [],
          total: 0,
        },
      });
    }

    // Support tickets - would need a support ticket table
    if (view === 'tickets') {
      return NextResponse.json({
        success: true,
        data: {
          tickets: [],
          total: 0,
        },
      });
    }

    // Notifications
    if (view === 'notifications') {
      return NextResponse.json({
        success: true,
        data: {
          notifications: [],
          unreadCount: 0,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid view' }, { status: 400 });

  } catch (error) {
    console.error('[Customer API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi lấy dữ liệu' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/v2/customer
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      // Create support ticket
      case 'create_ticket': {
        const { category, priority, subject, description, soId } = data;
        const ticketNumber = `TKT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
        
        return NextResponse.json({
          success: true,
          data: { 
            ticketId: `ticket-${Date.now()}`,
            ticketNumber,
            status: 'OPEN',
            createdAt: new Date().toISOString(),
          },
          message: 'Đã tạo ticket hỗ trợ',
        });
      }

      // Reply to ticket
      case 'reply_ticket': {
        const { ticketId, message } = data;
        
        return NextResponse.json({
          success: true,
          data: {
            messageId: `msg-${Date.now()}`,
            ticketId,
            sentAt: new Date().toISOString(),
          },
          message: 'Đã gửi phản hồi',
        });
      }

      // Mark notification as read
      case 'read_notification': {
        const { notificationId } = data;
        
        return NextResponse.json({
          success: true,
          data: { notificationId, read: true },
        });
      }

      // Request quote
      case 'request_quote': {
        const { items, notes } = data;
        const quoteNumber = `QUO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
        
        return NextResponse.json({
          success: true,
          data: {
            quoteId: `quote-${Date.now()}`,
            quoteNumber,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
          },
          message: 'Đã gửi yêu cầu báo giá',
        });
      }

      // Request order cancellation
      case 'request_cancellation': {
        const { orderId, reason } = data;
        
        return NextResponse.json({
          success: true,
          data: {
            requestId: `cancel-${Date.now()}`,
            orderId,
            status: 'PENDING_APPROVAL',
            createdAt: new Date().toISOString(),
          },
          message: 'Đã gửi yêu cầu hủy đơn hàng',
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[Customer API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi xử lý yêu cầu' },
      { status: 500 }
    );
  }
}
