// =============================================================================
// CUSTOMER PORTAL ENGINE
// Phase 9: Customer Portal
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

export interface Customer {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  creditLimit: number;
  currentCredit: number;
  paymentTerms: string;
  tier: 'STANDARD' | 'SILVER' | 'GOLD' | 'PLATINUM';
  status: 'ACTIVE' | 'INACTIVE' | 'ON_HOLD';
  createdAt: string;
}

export type SOStatus = 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'IN_PRODUCTION' | 'READY' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';

export interface SalesOrder {
  id: string;
  soNumber: string;
  customerId: string;
  customerName: string;
  status: SOStatus;
  orderDate: string;
  requestedDate: string;
  promisedDate?: string;
  actualDeliveryDate?: string;
  items: SOItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  shippingAddress: string;
  notes?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  productionProgress?: number;
  createdBy: string;
}

export interface SOItem {
  id: string;
  productCode: string;
  productName: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  amount: number;
  producedQty: number;
  shippedQty: number;
  status: 'PENDING' | 'IN_PRODUCTION' | 'PRODUCED' | 'SHIPPED' | 'DELIVERED';
}

export interface CustomerDelivery {
  id: string;
  deliveryNumber: string;
  soId: string;
  soNumber: string;
  customerId: string;
  status: 'PREPARING' | 'READY' | 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED';
  shipDate?: string;
  expectedArrival?: string;
  actualArrival?: string;
  trackingNumber?: string;
  carrier?: string;
  items: CustomerDeliveryItem[];
  shippingAddress: string;
  notes?: string;
  proofOfDelivery?: string;
  createdAt: string;
}

export interface CustomerDeliveryItem {
  id: string;
  soItemId: string;
  productCode: string;
  productName: string;
  orderedQty: number;
  shippedQty: number;
  status: 'PENDING' | 'SHIPPED' | 'DELIVERED';
}

export interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  soId: string;
  soNumber: string;
  customerId: string;
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  invoiceDate: string;
  dueDate: string;
  paidDate?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  balance: number;
  currency: string;
  items: CustomerInvoiceItem[];
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
}

export interface CustomerInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  amount: number;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerId: string;
  soId?: string;
  soNumber?: string;
  category: 'ORDER' | 'DELIVERY' | 'QUALITY' | 'INVOICE' | 'GENERAL';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';
  subject: string;
  description: string;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface TicketMessage {
  id: string;
  sender: 'CUSTOMER' | 'SUPPORT';
  senderName: string;
  message: string;
  attachments?: { name: string; url: string }[];
  createdAt: string;
}

export interface CustomerDashboard {
  customer: Customer;
  summary: {
    activeOrders: number;
    pendingDeliveries: number;
    unpaidInvoices: number;
    openTickets: number;
    totalSpent: number;
  };
  recentOrders: SalesOrder[];
  upcomingDeliveries: CustomerDelivery[];
  pendingInvoices: CustomerInvoice[];
  notifications: CustomerNotification[];
}

export interface CustomerNotification {
  id: string;
  type: 'ORDER_STATUS' | 'DELIVERY_UPDATE' | 'INVOICE_DUE' | 'TICKET_REPLY' | 'PROMOTION' | 'SYSTEM';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

// =============================================================================
// CUSTOMER PORTAL ENGINE CLASS
// =============================================================================

export class CustomerPortalEngine {
  
  /**
   * Get SO status color
   */
  static getSOStatusColor(status: SOStatus): string {
    const colors: Record<SOStatus, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      CONFIRMED: 'bg-blue-100 text-blue-700',
      IN_PRODUCTION: 'bg-purple-100 text-purple-700',
      READY: 'bg-cyan-100 text-cyan-700',
      SHIPPED: 'bg-indigo-100 text-indigo-700',
      DELIVERED: 'bg-green-100 text-green-700',
      COMPLETED: 'bg-emerald-100 text-emerald-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return colors[status];
  }

  /**
   * Get SO status label
   */
  static getSOStatusLabel(status: SOStatus): string {
    const labels: Record<SOStatus, string> = {
      DRAFT: 'Nháp',
      PENDING: 'Chờ xác nhận',
      CONFIRMED: 'Đã xác nhận',
      IN_PRODUCTION: 'Đang sản xuất',
      READY: 'Sẵn sàng giao',
      SHIPPED: 'Đã gửi',
      DELIVERED: 'Đã giao',
      COMPLETED: 'Hoàn tất',
      CANCELLED: 'Đã hủy',
    };
    return labels[status];
  }

  /**
   * Get delivery status color
   */
  static getDeliveryStatusColor(status: CustomerDelivery['status']): string {
    const colors: Record<CustomerDelivery['status'], string> = {
      PREPARING: 'bg-yellow-100 text-yellow-700',
      READY: 'bg-cyan-100 text-cyan-700',
      SHIPPED: 'bg-blue-100 text-blue-700',
      IN_TRANSIT: 'bg-purple-100 text-purple-700',
      DELIVERED: 'bg-green-100 text-green-700',
      RETURNED: 'bg-red-100 text-red-700',
    };
    return colors[status];
  }

  /**
   * Get delivery status label
   */
  static getDeliveryStatusLabel(status: CustomerDelivery['status']): string {
    const labels: Record<CustomerDelivery['status'], string> = {
      PREPARING: 'Đang chuẩn bị',
      READY: 'Sẵn sàng',
      SHIPPED: 'Đã gửi',
      IN_TRANSIT: 'Đang vận chuyển',
      DELIVERED: 'Đã giao',
      RETURNED: 'Trả lại',
    };
    return labels[status];
  }

  /**
   * Get invoice status color
   */
  static getInvoiceStatusColor(status: CustomerInvoice['status']): string {
    const colors: Record<CustomerInvoice['status'], string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      SENT: 'bg-blue-100 text-blue-700',
      VIEWED: 'bg-purple-100 text-purple-700',
      PAID: 'bg-green-100 text-green-700',
      OVERDUE: 'bg-red-100 text-red-700',
      CANCELLED: 'bg-gray-100 text-gray-700',
    };
    return colors[status];
  }

  /**
   * Get invoice status label
   */
  static getInvoiceStatusLabel(status: CustomerInvoice['status']): string {
    const labels: Record<CustomerInvoice['status'], string> = {
      DRAFT: 'Nháp',
      SENT: 'Đã gửi',
      VIEWED: 'Đã xem',
      PAID: 'Đã thanh toán',
      OVERDUE: 'Quá hạn',
      CANCELLED: 'Đã hủy',
    };
    return labels[status];
  }

  /**
   * Get ticket status color
   */
  static getTicketStatusColor(status: SupportTicket['status']): string {
    const colors: Record<SupportTicket['status'], string> = {
      OPEN: 'bg-blue-100 text-blue-700',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
      WAITING_CUSTOMER: 'bg-purple-100 text-purple-700',
      RESOLVED: 'bg-green-100 text-green-700',
      CLOSED: 'bg-gray-100 text-gray-700',
    };
    return colors[status];
  }

  /**
   * Get ticket category label
   */
  static getTicketCategoryLabel(category: SupportTicket['category']): string {
    const labels: Record<SupportTicket['category'], string> = {
      ORDER: 'Đơn hàng',
      DELIVERY: 'Giao hàng',
      QUALITY: 'Chất lượng',
      INVOICE: 'Hóa đơn',
      GENERAL: 'Khác',
    };
    return labels[category];
  }

  /**
   * Get customer tier color
   */
  static getTierColor(tier: Customer['tier']): string {
    const colors: Record<Customer['tier'], string> = {
      STANDARD: 'bg-gray-100 text-gray-700',
      SILVER: 'bg-slate-100 text-slate-700',
      GOLD: 'bg-yellow-100 text-yellow-700',
      PLATINUM: 'bg-purple-100 text-purple-700',
    };
    return colors[tier];
  }

  /**
   * Get priority color
   */
  static getPriorityColor(priority: 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'URGENT'): string {
    const colors = {
      LOW: 'bg-gray-100 text-gray-700',
      NORMAL: 'bg-blue-100 text-blue-700',
      MEDIUM: 'bg-yellow-100 text-yellow-700',
      HIGH: 'bg-orange-100 text-orange-700',
      URGENT: 'bg-red-100 text-red-700',
    };
    return colors[priority] || colors.NORMAL;
  }

  /**
   * Format currency
   */
  static formatCurrency(amount: number, currency: string = 'VND'): string {
    if (currency === 'VND') {
      if (amount >= 1e9) {
        const value = amount / 1e9;
        return `${Number.isInteger(value) ? value : value.toFixed(1)} tỷ`;
      }
      if (amount >= 1e6) {
        const value = amount / 1e6;
        return `${Number.isInteger(value) ? value : value.toFixed(1)} tr`;
      }
      return amount.toLocaleString('vi-VN') + ' ₫';
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  }

  /**
   * Get days until due
   */
  static getDaysUntilDue(dueDate: string): { days: number; status: 'OVERDUE' | 'DUE_SOON' | 'OK' } {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (days < 0) return { days, status: 'OVERDUE' };
    if (days <= 7) return { days, status: 'DUE_SOON' };
    return { days, status: 'OK' };
  }

  /**
   * Calculate order progress
   */
  static calculateOrderProgress(items: SOItem[]): number {
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const producedQty = items.reduce((s, i) => s + i.producedQty, 0);
    return totalQty > 0 ? Math.round((producedQty / totalQty) * 100) : 0;
  }

  /**
   * Get order step
   */
  static getOrderStep(status: SOStatus): number {
    const steps: Record<SOStatus, number> = {
      DRAFT: 0,
      PENDING: 1,
      CONFIRMED: 2,
      IN_PRODUCTION: 3,
      READY: 4,
      SHIPPED: 5,
      DELIVERED: 6,
      COMPLETED: 7,
      CANCELLED: -1,
    };
    return steps[status];
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default CustomerPortalEngine;
