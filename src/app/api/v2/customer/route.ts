// =============================================================================
// CUSTOMER PORTAL API
// Phase 9: Customer Portal
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  CustomerPortalEngine,
  Customer,
  SalesOrder,
  CustomerDelivery,
  CustomerInvoice,
  SupportTicket,
  CustomerDashboard,
  CustomerNotification
} from '@/lib/customer/customer-engine';

export const dynamic = 'force-dynamic';

// =============================================================================
// MOCK DATA
// =============================================================================

const mockCustomer: Customer = {
  id: 'cust-001',
  code: 'CUST-ABC-001',
  name: 'Công ty TNHH ABC Manufacturing',
  contactPerson: 'Trần Văn Minh',
  email: 'minh.tran@abcmfg.vn',
  phone: '0909123456',
  address: '789 Đường Lê Lợi, Quận 1, TP.HCM',
  taxId: '0315678901',
  creditLimit: 500000000,
  currentCredit: 125000000,
  paymentTerms: 'Net 30',
  tier: 'GOLD',
  status: 'ACTIVE',
  createdAt: '2022-06-15T00:00:00Z',
};

const mockSalesOrders: SalesOrder[] = [
  {
    id: 'so-001',
    soNumber: 'SO-2025-0001',
    customerId: 'cust-001',
    customerName: 'Công ty TNHH ABC Manufacturing',
    status: 'IN_PRODUCTION',
    orderDate: '2025-01-02T08:00:00Z',
    requestedDate: '2025-01-15T00:00:00Z',
    promisedDate: '2025-01-14T00:00:00Z',
    items: [
      { id: 'soi-001', productCode: 'PROD-A001', productName: 'Motor Assembly A1', quantity: 100, unit: 'PCS', unitPrice: 1500000, discount: 0, amount: 150000000, producedQty: 65, shippedQty: 0, status: 'IN_PRODUCTION' },
      { id: 'soi-002', productCode: 'PROD-A002', productName: 'Control Unit B2', quantity: 50, unit: 'PCS', unitPrice: 2500000, discount: 5, amount: 118750000, producedQty: 50, shippedQty: 0, status: 'PRODUCED' },
    ],
    subtotal: 268750000,
    discount: 13437500,
    tax: 25531250,
    total: 280843750,
    currency: 'VND',
    shippingAddress: '789 Đường Lê Lợi, Quận 1, TP.HCM',
    priority: 'HIGH',
    productionProgress: 76,
    createdBy: 'Sales Team',
    notes: 'Khách hàng VIP - ưu tiên giao hàng',
  },
  {
    id: 'so-002',
    soNumber: 'SO-2025-0002',
    customerId: 'cust-001',
    customerName: 'Công ty TNHH ABC Manufacturing',
    status: 'CONFIRMED',
    orderDate: '2025-01-03T10:00:00Z',
    requestedDate: '2025-01-20T00:00:00Z',
    promisedDate: '2025-01-18T00:00:00Z',
    items: [
      { id: 'soi-003', productCode: 'PROD-C003', productName: 'Sensor Module C3', quantity: 200, unit: 'PCS', unitPrice: 450000, discount: 0, amount: 90000000, producedQty: 0, shippedQty: 0, status: 'PENDING' },
    ],
    subtotal: 90000000,
    discount: 0,
    tax: 9000000,
    total: 99000000,
    currency: 'VND',
    shippingAddress: '789 Đường Lê Lợi, Quận 1, TP.HCM',
    priority: 'NORMAL',
    productionProgress: 0,
    createdBy: 'Sales Team',
  },
  {
    id: 'so-003',
    soNumber: 'SO-2024-0095',
    customerId: 'cust-001',
    customerName: 'Công ty TNHH ABC Manufacturing',
    status: 'SHIPPED',
    orderDate: '2024-12-20T09:00:00Z',
    requestedDate: '2024-12-30T00:00:00Z',
    promisedDate: '2024-12-28T00:00:00Z',
    items: [
      { id: 'soi-004', productCode: 'PROD-D004', productName: 'Power Supply Unit', quantity: 30, unit: 'PCS', unitPrice: 3200000, discount: 0, amount: 96000000, producedQty: 30, shippedQty: 30, status: 'SHIPPED' },
    ],
    subtotal: 96000000,
    discount: 0,
    tax: 9600000,
    total: 105600000,
    currency: 'VND',
    shippingAddress: '789 Đường Lê Lợi, Quận 1, TP.HCM',
    priority: 'NORMAL',
    productionProgress: 100,
    createdBy: 'Sales Team',
  },
  {
    id: 'so-004',
    soNumber: 'SO-2024-0088',
    customerId: 'cust-001',
    customerName: 'Công ty TNHH ABC Manufacturing',
    status: 'COMPLETED',
    orderDate: '2024-12-10T08:00:00Z',
    requestedDate: '2024-12-20T00:00:00Z',
    actualDeliveryDate: '2024-12-19T10:00:00Z',
    items: [
      { id: 'soi-005', productCode: 'PROD-A001', productName: 'Motor Assembly A1', quantity: 50, unit: 'PCS', unitPrice: 1500000, discount: 0, amount: 75000000, producedQty: 50, shippedQty: 50, status: 'DELIVERED' },
    ],
    subtotal: 75000000,
    discount: 0,
    tax: 7500000,
    total: 82500000,
    currency: 'VND',
    shippingAddress: '789 Đường Lê Lợi, Quận 1, TP.HCM',
    priority: 'NORMAL',
    productionProgress: 100,
    createdBy: 'Sales Team',
  },
];

const mockDeliveries: CustomerDelivery[] = [
  {
    id: 'del-c001',
    deliveryNumber: 'DEL-C-2025-0001',
    soId: 'so-003',
    soNumber: 'SO-2024-0095',
    customerId: 'cust-001',
    status: 'IN_TRANSIT',
    shipDate: '2025-01-03T08:00:00Z',
    expectedArrival: '2025-01-05T00:00:00Z',
    trackingNumber: 'VN987654321',
    carrier: 'Giao Hàng Nhanh',
    items: [
      { id: 'di-c001', soItemId: 'soi-004', productCode: 'PROD-D004', productName: 'Power Supply Unit', orderedQty: 30, shippedQty: 30, status: 'SHIPPED' },
    ],
    shippingAddress: '789 Đường Lê Lợi, Quận 1, TP.HCM',
    createdAt: '2025-01-03T08:00:00Z',
  },
  {
    id: 'del-c002',
    deliveryNumber: 'DEL-C-2024-0045',
    soId: 'so-004',
    soNumber: 'SO-2024-0088',
    customerId: 'cust-001',
    status: 'DELIVERED',
    shipDate: '2024-12-17T09:00:00Z',
    expectedArrival: '2024-12-19T00:00:00Z',
    actualArrival: '2024-12-19T10:00:00Z',
    trackingNumber: 'VN123456789',
    carrier: 'Viettel Post',
    items: [
      { id: 'di-c002', soItemId: 'soi-005', productCode: 'PROD-A001', productName: 'Motor Assembly A1', orderedQty: 50, shippedQty: 50, status: 'DELIVERED' },
    ],
    shippingAddress: '789 Đường Lê Lợi, Quận 1, TP.HCM',
    proofOfDelivery: '/docs/pod-del-c002.pdf',
    createdAt: '2024-12-17T09:00:00Z',
  },
];

const mockInvoices: CustomerInvoice[] = [
  {
    id: 'inv-c001',
    invoiceNumber: 'INV-C-2025-0001',
    soId: 'so-003',
    soNumber: 'SO-2024-0095',
    customerId: 'cust-001',
    status: 'SENT',
    invoiceDate: '2025-01-03T00:00:00Z',
    dueDate: '2025-02-02T00:00:00Z',
    subtotal: 96000000,
    discount: 0,
    tax: 9600000,
    total: 105600000,
    paidAmount: 0,
    balance: 105600000,
    currency: 'VND',
    items: [
      { id: 'ii-c001', description: 'Power Supply Unit x 30 PCS', quantity: 30, unitPrice: 3200000, discount: 0, amount: 96000000 },
    ],
    createdAt: '2025-01-03T10:00:00Z',
  },
  {
    id: 'inv-c002',
    invoiceNumber: 'INV-C-2024-0098',
    soId: 'so-004',
    soNumber: 'SO-2024-0088',
    customerId: 'cust-001',
    status: 'PAID',
    invoiceDate: '2024-12-20T00:00:00Z',
    dueDate: '2025-01-20T00:00:00Z',
    paidDate: '2024-12-28T00:00:00Z',
    subtotal: 75000000,
    discount: 0,
    tax: 7500000,
    total: 82500000,
    paidAmount: 82500000,
    balance: 0,
    currency: 'VND',
    items: [
      { id: 'ii-c002', description: 'Motor Assembly A1 x 50 PCS', quantity: 50, unitPrice: 1500000, discount: 0, amount: 75000000 },
    ],
    paymentMethod: 'Bank Transfer',
    createdAt: '2024-12-20T09:00:00Z',
  },
];

const mockTickets: SupportTicket[] = [
  {
    id: 'ticket-001',
    ticketNumber: 'TKT-2025-0001',
    customerId: 'cust-001',
    soId: 'so-001',
    soNumber: 'SO-2025-0001',
    category: 'ORDER',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    subject: 'Hỏi về tiến độ sản xuất',
    description: 'Xin cho biết tiến độ sản xuất đơn hàng SO-2025-0001, dự kiến khi nào hoàn thành?',
    messages: [
      {
        id: 'msg-001',
        sender: 'CUSTOMER',
        senderName: 'Trần Văn Minh',
        message: 'Xin cho biết tiến độ sản xuất đơn hàng SO-2025-0001, dự kiến khi nào hoàn thành?',
        createdAt: '2025-01-03T14:00:00Z',
      },
      {
        id: 'msg-002',
        sender: 'SUPPORT',
        senderName: 'Nguyễn Thị Hương',
        message: 'Chào anh Minh, hiện tại đơn hàng đã hoàn thành 76%. Dự kiến sẽ hoàn thành sản xuất vào ngày 10/01 và giao hàng đúng hẹn ngày 14/01.',
        createdAt: '2025-01-03T15:30:00Z',
      },
    ],
    createdAt: '2025-01-03T14:00:00Z',
    updatedAt: '2025-01-03T15:30:00Z',
  },
];

const mockNotifications: CustomerNotification[] = [
  {
    id: 'notif-c001',
    type: 'ORDER_STATUS',
    title: 'Cập nhật đơn hàng',
    message: 'Đơn hàng SO-2025-0001 đã hoàn thành 76% sản xuất',
    read: false,
    actionUrl: '/customer/orders/so-001',
    createdAt: '2025-01-03T16:00:00Z',
  },
  {
    id: 'notif-c002',
    type: 'DELIVERY_UPDATE',
    title: 'Đang giao hàng',
    message: 'Đơn hàng SO-2024-0095 đang trên đường giao đến bạn',
    read: false,
    actionUrl: '/customer/deliveries',
    createdAt: '2025-01-03T08:30:00Z',
  },
  {
    id: 'notif-c003',
    type: 'INVOICE_DUE',
    title: 'Hóa đơn sắp đến hạn',
    message: 'Hóa đơn INV-C-2025-0001 sẽ đến hạn thanh toán trong 30 ngày',
    read: true,
    actionUrl: '/customer/invoices',
    createdAt: '2025-01-03T10:00:00Z',
  },
  {
    id: 'notif-c004',
    type: 'TICKET_REPLY',
    title: 'Phản hồi hỗ trợ',
    message: 'Bạn có phản hồi mới cho ticket TKT-2025-0001',
    read: false,
    actionUrl: '/customer/support',
    createdAt: '2025-01-03T15:35:00Z',
  },
];

// =============================================================================
// GET /api/v2/customer
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'dashboard';
    const customerId = searchParams.get('customerId') || 'cust-001';

    // Dashboard view
    if (view === 'dashboard') {
      const activeOrders = mockSalesOrders.filter(so => 
        !['COMPLETED', 'CANCELLED'].includes(so.status)
      );
      const unpaidInvoices = mockInvoices.filter(inv => 
        !['PAID', 'CANCELLED'].includes(inv.status)
      );
      
      const dashboard: CustomerDashboard = {
        customer: mockCustomer,
        summary: {
          activeOrders: activeOrders.length,
          pendingDeliveries: mockDeliveries.filter(d => d.status !== 'DELIVERED').length,
          unpaidInvoices: unpaidInvoices.length,
          openTickets: mockTickets.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status)).length,
          totalSpent: mockInvoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.total, 0),
        },
        recentOrders: mockSalesOrders.slice(0, 5),
        upcomingDeliveries: mockDeliveries.filter(d => d.status !== 'DELIVERED').slice(0, 3),
        pendingInvoices: unpaidInvoices,
        notifications: mockNotifications,
      };

      return NextResponse.json({ success: true, data: dashboard });
    }

    // Orders view
    if (view === 'orders') {
      const status = searchParams.get('status');
      let orders = mockSalesOrders;
      if (status) {
        orders = orders.filter(so => so.status === status);
      }
      return NextResponse.json({ 
        success: true, 
        data: { 
          orders,
          total: orders.length,
        } 
      });
    }

    // Single order
    if (view === 'order') {
      const orderId = searchParams.get('orderId');
      const order = mockSalesOrders.find(so => so.id === orderId);
      if (!order) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: order });
    }

    // Deliveries view
    if (view === 'deliveries') {
      return NextResponse.json({ 
        success: true, 
        data: { 
          deliveries: mockDeliveries,
          total: mockDeliveries.length,
        } 
      });
    }

    // Invoices view
    if (view === 'invoices') {
      return NextResponse.json({ 
        success: true, 
        data: { 
          invoices: mockInvoices,
          total: mockInvoices.length,
          summary: {
            total: mockInvoices.reduce((s, i) => s + i.total, 0),
            paid: mockInvoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.total, 0),
            unpaid: mockInvoices.filter(i => i.status !== 'PAID').reduce((s, i) => s + i.balance, 0),
          },
        } 
      });
    }

    // Support tickets
    if (view === 'tickets') {
      return NextResponse.json({ 
        success: true, 
        data: { 
          tickets: mockTickets,
          total: mockTickets.length,
        } 
      });
    }

    // Single ticket
    if (view === 'ticket') {
      const ticketId = searchParams.get('ticketId');
      const ticket = mockTickets.find(t => t.id === ticketId);
      if (!ticket) {
        return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: ticket });
    }

    // Notifications
    if (view === 'notifications') {
      return NextResponse.json({ 
        success: true, 
        data: {
          notifications: mockNotifications,
          unreadCount: mockNotifications.filter(n => !n.read).length,
        }
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

    console.log(`[Customer API] Action: ${action}`, data);

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
