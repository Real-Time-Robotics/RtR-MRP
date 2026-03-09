import { describe, it, expect } from 'vitest';
import { CustomerPortalEngine } from '../customer-engine';
import type { SOStatus, SOItem, CustomerDelivery, CustomerInvoice, SupportTicket, Customer } from '../customer-engine';

describe('CustomerPortalEngine', () => {
  // ----- getSOStatusColor -----

  describe('getSOStatusColor', () => {
    const statuses: SOStatus[] = [
      'DRAFT', 'PENDING', 'CONFIRMED', 'IN_PRODUCTION',
      'READY', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED',
    ];

    it.each(statuses)('should return a color string for %s', (status) => {
      const color = CustomerPortalEngine.getSOStatusColor(status);
      expect(color).toBeDefined();
      expect(color).toContain('bg-');
      expect(color).toContain('text-');
    });
  });

  // ----- getSOStatusLabel -----

  describe('getSOStatusLabel', () => {
    it('should return Vietnamese labels for all statuses', () => {
      expect(CustomerPortalEngine.getSOStatusLabel('DRAFT')).toBe('Nháp');
      expect(CustomerPortalEngine.getSOStatusLabel('PENDING')).toBe('Chờ xác nhận');
      expect(CustomerPortalEngine.getSOStatusLabel('CONFIRMED')).toBe('Đã xác nhận');
      expect(CustomerPortalEngine.getSOStatusLabel('IN_PRODUCTION')).toBe('Đang sản xuất');
      expect(CustomerPortalEngine.getSOStatusLabel('READY')).toBe('Sẵn sàng giao');
      expect(CustomerPortalEngine.getSOStatusLabel('SHIPPED')).toBe('Đã gửi');
      expect(CustomerPortalEngine.getSOStatusLabel('DELIVERED')).toBe('Đã giao');
      expect(CustomerPortalEngine.getSOStatusLabel('COMPLETED')).toBe('Hoàn tất');
      expect(CustomerPortalEngine.getSOStatusLabel('CANCELLED')).toBe('Đã hủy');
    });
  });

  // ----- getDeliveryStatusColor -----

  describe('getDeliveryStatusColor', () => {
    const statuses: CustomerDelivery['status'][] = [
      'PREPARING', 'READY', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED',
    ];

    it.each(statuses)('should return a color string for %s', (status) => {
      const color = CustomerPortalEngine.getDeliveryStatusColor(status);
      expect(color).toContain('bg-');
    });
  });

  // ----- getDeliveryStatusLabel -----

  describe('getDeliveryStatusLabel', () => {
    it('should return correct labels', () => {
      expect(CustomerPortalEngine.getDeliveryStatusLabel('PREPARING')).toBe('Đang chuẩn bị');
      expect(CustomerPortalEngine.getDeliveryStatusLabel('READY')).toBe('Sẵn sàng');
      expect(CustomerPortalEngine.getDeliveryStatusLabel('SHIPPED')).toBe('Đã gửi');
      expect(CustomerPortalEngine.getDeliveryStatusLabel('IN_TRANSIT')).toBe('Đang vận chuyển');
      expect(CustomerPortalEngine.getDeliveryStatusLabel('DELIVERED')).toBe('Đã giao');
      expect(CustomerPortalEngine.getDeliveryStatusLabel('RETURNED')).toBe('Trả lại');
    });
  });

  // ----- getInvoiceStatusColor -----

  describe('getInvoiceStatusColor', () => {
    const statuses: CustomerInvoice['status'][] = [
      'DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED',
    ];

    it.each(statuses)('should return a color string for %s', (status) => {
      const color = CustomerPortalEngine.getInvoiceStatusColor(status);
      expect(color).toContain('bg-');
    });
  });

  // ----- getInvoiceStatusLabel -----

  describe('getInvoiceStatusLabel', () => {
    it('should return correct labels', () => {
      expect(CustomerPortalEngine.getInvoiceStatusLabel('DRAFT')).toBe('Nháp');
      expect(CustomerPortalEngine.getInvoiceStatusLabel('SENT')).toBe('Đã gửi');
      expect(CustomerPortalEngine.getInvoiceStatusLabel('VIEWED')).toBe('Đã xem');
      expect(CustomerPortalEngine.getInvoiceStatusLabel('PAID')).toBe('Đã thanh toán');
      expect(CustomerPortalEngine.getInvoiceStatusLabel('OVERDUE')).toBe('Quá hạn');
      expect(CustomerPortalEngine.getInvoiceStatusLabel('CANCELLED')).toBe('Đã hủy');
    });
  });

  // ----- getTicketStatusColor -----

  describe('getTicketStatusColor', () => {
    const statuses: SupportTicket['status'][] = [
      'OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED',
    ];

    it.each(statuses)('should return a color string for %s', (status) => {
      const color = CustomerPortalEngine.getTicketStatusColor(status);
      expect(color).toContain('bg-');
    });
  });

  // ----- getTicketCategoryLabel -----

  describe('getTicketCategoryLabel', () => {
    it('should return correct labels', () => {
      expect(CustomerPortalEngine.getTicketCategoryLabel('ORDER')).toBe('Đơn hàng');
      expect(CustomerPortalEngine.getTicketCategoryLabel('DELIVERY')).toBe('Giao hàng');
      expect(CustomerPortalEngine.getTicketCategoryLabel('QUALITY')).toBe('Chất lượng');
      expect(CustomerPortalEngine.getTicketCategoryLabel('INVOICE')).toBe('Hóa đơn');
      expect(CustomerPortalEngine.getTicketCategoryLabel('GENERAL')).toBe('Khác');
    });
  });

  // ----- getTierColor -----

  describe('getTierColor', () => {
    const tiers: Customer['tier'][] = ['STANDARD', 'SILVER', 'GOLD', 'PLATINUM'];

    it.each(tiers)('should return a color string for %s', (tier) => {
      const color = CustomerPortalEngine.getTierColor(tier);
      expect(color).toContain('bg-');
    });
  });

  // ----- getPriorityColor -----

  describe('getPriorityColor', () => {
    it('should return colors for all priorities', () => {
      expect(CustomerPortalEngine.getPriorityColor('LOW')).toContain('bg-gray');
      expect(CustomerPortalEngine.getPriorityColor('NORMAL')).toContain('bg-blue');
      expect(CustomerPortalEngine.getPriorityColor('MEDIUM')).toContain('bg-yellow');
      expect(CustomerPortalEngine.getPriorityColor('HIGH')).toContain('bg-orange');
      expect(CustomerPortalEngine.getPriorityColor('URGENT')).toContain('bg-red');
    });

    it('should fallback to NORMAL for unknown priority', () => {
      const color = CustomerPortalEngine.getPriorityColor('UNKNOWN' as any);
      expect(color).toContain('bg-blue');
    });
  });

  // ----- formatCurrency -----

  describe('formatCurrency', () => {
    it('should format VND in billions', () => {
      expect(CustomerPortalEngine.formatCurrency(2e9)).toBe('2 tỷ');
      expect(CustomerPortalEngine.formatCurrency(1.5e9)).toBe('1.5 tỷ');
    });

    it('should format VND in millions', () => {
      expect(CustomerPortalEngine.formatCurrency(3e6)).toBe('3 tr');
      expect(CustomerPortalEngine.formatCurrency(2.5e6)).toBe('2.5 tr');
    });

    it('should format VND below millions with locale', () => {
      const result = CustomerPortalEngine.formatCurrency(500000);
      expect(result).toContain('500');
      expect(result).toContain('₫');
    });

    it('should use default VND currency', () => {
      const result = CustomerPortalEngine.formatCurrency(1000);
      expect(result).toContain('₫');
    });

    it('should format USD using Intl', () => {
      const result = CustomerPortalEngine.formatCurrency(1234.56, 'USD');
      expect(result).toContain('$');
      expect(result).toContain('1,234.56');
    });

    it('should format EUR using Intl', () => {
      const result = CustomerPortalEngine.formatCurrency(1000, 'EUR');
      expect(result).toContain('1,000');
    });

    it('should handle exact billion value (integer)', () => {
      expect(CustomerPortalEngine.formatCurrency(1e9)).toBe('1 tỷ');
    });

    it('should handle exact million value (integer)', () => {
      expect(CustomerPortalEngine.formatCurrency(1e6)).toBe('1 tr');
    });
  });

  // ----- getDaysUntilDue -----

  describe('getDaysUntilDue', () => {
    it('should return OVERDUE for past dates', () => {
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const result = CustomerPortalEngine.getDaysUntilDue(pastDate);
      expect(result.status).toBe('OVERDUE');
      expect(result.days).toBeLessThan(0);
    });

    it('should return DUE_SOON for dates within 7 days', () => {
      const soonDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const result = CustomerPortalEngine.getDaysUntilDue(soonDate);
      expect(result.status).toBe('DUE_SOON');
      expect(result.days).toBeGreaterThan(0);
      expect(result.days).toBeLessThanOrEqual(7);
    });

    it('should return OK for dates more than 7 days away', () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const result = CustomerPortalEngine.getDaysUntilDue(futureDate);
      expect(result.status).toBe('OK');
      expect(result.days).toBeGreaterThan(7);
    });

    it('should return DUE_SOON for exactly 7 days', () => {
      const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const result = CustomerPortalEngine.getDaysUntilDue(date);
      expect(result.status).toBe('DUE_SOON');
    });
  });

  // ----- calculateOrderProgress -----

  describe('calculateOrderProgress', () => {
    it('should return 0 when no items', () => {
      expect(CustomerPortalEngine.calculateOrderProgress([])).toBe(0);
    });

    it('should return 0 when total quantity is 0', () => {
      const items: SOItem[] = [
        { id: '1', productCode: 'P1', productName: 'Product', quantity: 0, unit: 'pcs', unitPrice: 10, discount: 0, amount: 0, producedQty: 0, shippedQty: 0, status: 'PENDING' },
      ];
      expect(CustomerPortalEngine.calculateOrderProgress(items)).toBe(0);
    });

    it('should calculate correct progress percentage', () => {
      const items: SOItem[] = [
        { id: '1', productCode: 'P1', productName: 'A', quantity: 100, unit: 'pcs', unitPrice: 10, discount: 0, amount: 1000, producedQty: 50, shippedQty: 0, status: 'IN_PRODUCTION' },
        { id: '2', productCode: 'P2', productName: 'B', quantity: 100, unit: 'pcs', unitPrice: 20, discount: 0, amount: 2000, producedQty: 100, shippedQty: 0, status: 'PRODUCED' },
      ];
      // Total: 200, Produced: 150 => 75%
      expect(CustomerPortalEngine.calculateOrderProgress(items)).toBe(75);
    });

    it('should return 100 when fully produced', () => {
      const items: SOItem[] = [
        { id: '1', productCode: 'P1', productName: 'A', quantity: 50, unit: 'pcs', unitPrice: 10, discount: 0, amount: 500, producedQty: 50, shippedQty: 50, status: 'DELIVERED' },
      ];
      expect(CustomerPortalEngine.calculateOrderProgress(items)).toBe(100);
    });

    it('should round the percentage', () => {
      const items: SOItem[] = [
        { id: '1', productCode: 'P1', productName: 'A', quantity: 3, unit: 'pcs', unitPrice: 10, discount: 0, amount: 30, producedQty: 1, shippedQty: 0, status: 'IN_PRODUCTION' },
      ];
      // 1/3 = 33.33... => 33
      expect(CustomerPortalEngine.calculateOrderProgress(items)).toBe(33);
    });
  });

  // ----- getOrderStep -----

  describe('getOrderStep', () => {
    it('should return correct step numbers', () => {
      expect(CustomerPortalEngine.getOrderStep('DRAFT')).toBe(0);
      expect(CustomerPortalEngine.getOrderStep('PENDING')).toBe(1);
      expect(CustomerPortalEngine.getOrderStep('CONFIRMED')).toBe(2);
      expect(CustomerPortalEngine.getOrderStep('IN_PRODUCTION')).toBe(3);
      expect(CustomerPortalEngine.getOrderStep('READY')).toBe(4);
      expect(CustomerPortalEngine.getOrderStep('SHIPPED')).toBe(5);
      expect(CustomerPortalEngine.getOrderStep('DELIVERED')).toBe(6);
      expect(CustomerPortalEngine.getOrderStep('COMPLETED')).toBe(7);
      expect(CustomerPortalEngine.getOrderStep('CANCELLED')).toBe(-1);
    });
  });
});
