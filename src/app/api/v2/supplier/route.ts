import { NextRequest, NextResponse } from 'next/server';

// =============================================================================
// SUPPLIER PORTAL API
// Provides data for supplier self-service portal
// =============================================================================

// Types
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'IN_PRODUCTION' | 'READY' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type DeliveryStatus = 'SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED' | 'DELAYED' | 'CANCELLED';
export type InvoiceStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REJECTED' | 'OVERDUE';

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

    // Mock supplier ID (in real app, get from auth)
    const supplierId = 'SUP-001';

    switch (view) {
      case 'dashboard': {
        const summary = generateDashboardSummary(supplierId);
        return NextResponse.json({
          success: true,
          data: summary,
        });
      }

      case 'orders': {
        let orders = generateMockOrders(supplierId);

        if (status) {
          orders = orders.filter(o => o.status === status);
        }

        const total = orders.length;
        const start = (page - 1) * limit;
        const paginatedOrders = orders.slice(start, start + limit);

        return NextResponse.json({
          success: true,
          data: {
            orders: paginatedOrders,
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
        let deliveries = generateMockDeliveries(supplierId);

        if (status) {
          deliveries = deliveries.filter(d => d.status === status);
        }

        const total = deliveries.length;
        const start = (page - 1) * limit;
        const paginatedDeliveries = deliveries.slice(start, start + limit);

        return NextResponse.json({
          success: true,
          data: {
            deliveries: paginatedDeliveries,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          },
        });
      }

      case 'invoices': {
        let invoices = generateMockInvoices(supplierId);

        if (status) {
          invoices = invoices.filter(inv => inv.status === status);
        }

        const total = invoices.length;
        const start = (page - 1) * limit;
        const paginatedInvoices = invoices.slice(start, start + limit);

        return NextResponse.json({
          success: true,
          data: {
            invoices: paginatedInvoices,
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
    console.error('Error in supplier API:', error);
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
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'confirm_order': {
        const { orderId } = data;
        // In real app, update database
        return NextResponse.json({
          success: true,
          message: `Đơn hàng ${orderId} đã được xác nhận`,
          data: { orderId, newStatus: 'CONFIRMED' },
        });
      }

      case 'update_delivery': {
        const { deliveryId, trackingNumber, carrier, estimatedDate } = data;
        // In real app, update database
        return NextResponse.json({
          success: true,
          message: `Thông tin giao hàng ${deliveryId} đã được cập nhật`,
          data: { deliveryId, trackingNumber, carrier, estimatedDate },
        });
      }

      case 'submit_invoice': {
        const { invoiceId } = data;
        // In real app, update database
        return NextResponse.json({
          success: true,
          message: `Hóa đơn ${invoiceId} đã được gửi`,
          data: { invoiceId, newStatus: 'SUBMITTED' },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in supplier API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
