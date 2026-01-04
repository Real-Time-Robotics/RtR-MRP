// =============================================================================
// CUSTOMER PORTAL ENGINE UNIT TESTS
// Testing customer portal utilities
// =============================================================================

import { CustomerPortalEngine, SOStatus, CustomerDelivery, CustomerInvoice, SupportTicket, Customer, SOItem } from '@/lib/customer/customer-engine';

describe('CustomerPortalEngine', () => {
  
  // ===========================================================================
  // STATUS COLORS & LABELS
  // ===========================================================================

  describe('getSOStatusColor', () => {
    const statuses: SOStatus[] = ['DRAFT', 'PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
    
    it('should return a color class for each status', () => {
      statuses.forEach(status => {
        const result = CustomerPortalEngine.getSOStatusColor(status);
        expect(result).toBeTruthy();
        expect(result).toContain('bg-');
        expect(result).toContain('text-');
      });
    });

    it('should return distinct colors for different states', () => {
      const pending = CustomerPortalEngine.getSOStatusColor('PENDING');
      const completed = CustomerPortalEngine.getSOStatusColor('COMPLETED');
      const cancelled = CustomerPortalEngine.getSOStatusColor('CANCELLED');
      
      expect(pending).not.toBe(completed);
      expect(pending).not.toBe(cancelled);
      expect(completed).not.toBe(cancelled);
    });

    it('should return green for positive statuses', () => {
      expect(CustomerPortalEngine.getSOStatusColor('DELIVERED')).toContain('green');
      expect(CustomerPortalEngine.getSOStatusColor('COMPLETED')).toContain('emerald');
    });

    it('should return red for cancelled status', () => {
      expect(CustomerPortalEngine.getSOStatusColor('CANCELLED')).toContain('red');
    });
  });

  describe('getSOStatusLabel', () => {
    it('should return Vietnamese labels', () => {
      expect(CustomerPortalEngine.getSOStatusLabel('DRAFT')).toBe('Nháp');
      expect(CustomerPortalEngine.getSOStatusLabel('PENDING')).toBe('Chờ xác nhận');
      expect(CustomerPortalEngine.getSOStatusLabel('IN_PRODUCTION')).toBe('Đang sản xuất');
      expect(CustomerPortalEngine.getSOStatusLabel('COMPLETED')).toBe('Hoàn tất');
    });

    it('should return a label for each status', () => {
      const statuses: SOStatus[] = ['DRAFT', 'PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
      statuses.forEach(status => {
        const label = CustomerPortalEngine.getSOStatusLabel(status);
        expect(label).toBeTruthy();
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getDeliveryStatusColor', () => {
    const statuses: CustomerDelivery['status'][] = ['PREPARING', 'READY', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED'];
    
    it('should return a color for each delivery status', () => {
      statuses.forEach(status => {
        const result = CustomerPortalEngine.getDeliveryStatusColor(status);
        expect(result).toBeTruthy();
        expect(result).toContain('bg-');
      });
    });

    it('should return green for delivered', () => {
      expect(CustomerPortalEngine.getDeliveryStatusColor('DELIVERED')).toContain('green');
    });

    it('should return red for returned', () => {
      expect(CustomerPortalEngine.getDeliveryStatusColor('RETURNED')).toContain('red');
    });
  });

  describe('getDeliveryStatusLabel', () => {
    it('should return Vietnamese labels for delivery status', () => {
      expect(CustomerPortalEngine.getDeliveryStatusLabel('PREPARING')).toBe('Đang chuẩn bị');
      expect(CustomerPortalEngine.getDeliveryStatusLabel('IN_TRANSIT')).toBe('Đang vận chuyển');
      expect(CustomerPortalEngine.getDeliveryStatusLabel('DELIVERED')).toBe('Đã giao');
    });
  });

  describe('getInvoiceStatusColor', () => {
    const statuses: CustomerInvoice['status'][] = ['DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED'];
    
    it('should return a color for each invoice status', () => {
      statuses.forEach(status => {
        const result = CustomerPortalEngine.getInvoiceStatusColor(status);
        expect(result).toBeTruthy();
        expect(result).toContain('bg-');
      });
    });

    it('should return green for paid', () => {
      expect(CustomerPortalEngine.getInvoiceStatusColor('PAID')).toContain('green');
    });

    it('should return red for overdue', () => {
      expect(CustomerPortalEngine.getInvoiceStatusColor('OVERDUE')).toContain('red');
    });
  });

  describe('getInvoiceStatusLabel', () => {
    it('should return Vietnamese labels for invoice status', () => {
      expect(CustomerPortalEngine.getInvoiceStatusLabel('DRAFT')).toBe('Nháp');
      expect(CustomerPortalEngine.getInvoiceStatusLabel('SENT')).toBe('Đã gửi');
      expect(CustomerPortalEngine.getInvoiceStatusLabel('PAID')).toBe('Đã thanh toán');
      expect(CustomerPortalEngine.getInvoiceStatusLabel('OVERDUE')).toBe('Quá hạn');
    });
  });

  describe('getTicketStatusColor', () => {
    const statuses: SupportTicket['status'][] = ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'];
    
    it('should return a color for each ticket status', () => {
      statuses.forEach(status => {
        const result = CustomerPortalEngine.getTicketStatusColor(status);
        expect(result).toBeTruthy();
        expect(result).toContain('bg-');
      });
    });
  });

  describe('getTicketCategoryLabel', () => {
    it('should return Vietnamese labels for categories', () => {
      expect(CustomerPortalEngine.getTicketCategoryLabel('ORDER')).toBe('Đơn hàng');
      expect(CustomerPortalEngine.getTicketCategoryLabel('DELIVERY')).toBe('Giao hàng');
      expect(CustomerPortalEngine.getTicketCategoryLabel('QUALITY')).toBe('Chất lượng');
      expect(CustomerPortalEngine.getTicketCategoryLabel('INVOICE')).toBe('Hóa đơn');
      expect(CustomerPortalEngine.getTicketCategoryLabel('GENERAL')).toBe('Khác');
    });
  });

  describe('getTierColor', () => {
    const tiers: Customer['tier'][] = ['STANDARD', 'SILVER', 'GOLD', 'PLATINUM'];
    
    it('should return a color for each tier', () => {
      tiers.forEach(tier => {
        const result = CustomerPortalEngine.getTierColor(tier);
        expect(result).toBeTruthy();
        expect(result).toContain('bg-');
      });
    });

    it('should return appropriate colors for premium tiers', () => {
      expect(CustomerPortalEngine.getTierColor('GOLD')).toContain('yellow');
      expect(CustomerPortalEngine.getTierColor('PLATINUM')).toContain('purple');
    });
  });

  describe('getPriorityColor', () => {
    it('should return colors for all priorities', () => {
      expect(CustomerPortalEngine.getPriorityColor('LOW')).toContain('gray');
      expect(CustomerPortalEngine.getPriorityColor('NORMAL')).toContain('blue');
      expect(CustomerPortalEngine.getPriorityColor('MEDIUM')).toContain('yellow');
      expect(CustomerPortalEngine.getPriorityColor('HIGH')).toContain('orange');
      expect(CustomerPortalEngine.getPriorityColor('URGENT')).toContain('red');
    });
  });

  // ===========================================================================
  // CURRENCY FORMATTING
  // ===========================================================================

  describe('formatCurrency', () => {
    it('should format VND correctly', () => {
      expect(CustomerPortalEngine.formatCurrency(1000000, 'VND')).toContain('tr');
      expect(CustomerPortalEngine.formatCurrency(1500000000, 'VND')).toContain('tỷ');
    });

    it('should format small amounts with locale string', () => {
      const result = CustomerPortalEngine.formatCurrency(50000, 'VND');
      expect(result).toContain('50');
      expect(result).toContain('₫');
    });

    it('should handle billion format', () => {
      const result = CustomerPortalEngine.formatCurrency(2500000000, 'VND');
      expect(result).toBe('2.5 tỷ');
    });

    it('should handle million format', () => {
      const result = CustomerPortalEngine.formatCurrency(5500000, 'VND');
      expect(result).toBe('5.5 tr');
    });

    it('should format other currencies', () => {
      const result = CustomerPortalEngine.formatCurrency(1000, 'USD');
      expect(result).toContain('$');
      expect(result).toContain('1,000');
    });
  });

  // ===========================================================================
  // DATE UTILITIES
  // ===========================================================================

  describe('getDaysUntilDue', () => {
    it('should return OVERDUE for past dates', () => {
      const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const result = CustomerPortalEngine.getDaysUntilDue(pastDate);
      
      expect(result.status).toBe('OVERDUE');
      expect(result.days).toBeLessThan(0);
    });

    it('should return DUE_SOON for dates within 7 days', () => {
      const soonDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const result = CustomerPortalEngine.getDaysUntilDue(soonDate);
      
      expect(result.status).toBe('DUE_SOON');
      expect(result.days).toBeGreaterThanOrEqual(0);
      expect(result.days).toBeLessThanOrEqual(7);
    });

    it('should return OK for dates more than 7 days away', () => {
      const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const result = CustomerPortalEngine.getDaysUntilDue(futureDate);
      
      expect(result.status).toBe('OK');
      expect(result.days).toBeGreaterThan(7);
    });

    it('should calculate days correctly', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);
      
      const result = CustomerPortalEngine.getDaysUntilDue(tomorrow.toISOString());
      expect(result.days).toBeGreaterThanOrEqual(0);
      expect(result.days).toBeLessThanOrEqual(2);
    });
  });

  // ===========================================================================
  // ORDER CALCULATIONS
  // ===========================================================================

  describe('calculateOrderProgress', () => {
    it('should calculate progress correctly', () => {
      const items: SOItem[] = [
        { id: '1', productCode: 'A', productName: 'A', quantity: 100, unit: 'PCS', unitPrice: 100, discount: 0, amount: 10000, producedQty: 50, shippedQty: 0, status: 'IN_PRODUCTION' },
        { id: '2', productCode: 'B', productName: 'B', quantity: 100, unit: 'PCS', unitPrice: 100, discount: 0, amount: 10000, producedQty: 100, shippedQty: 0, status: 'PRODUCED' },
      ];
      
      const result = CustomerPortalEngine.calculateOrderProgress(items);
      expect(result).toBe(75); // (50+100) / (100+100) * 100 = 75%
    });

    it('should return 0 for no production', () => {
      const items: SOItem[] = [
        { id: '1', productCode: 'A', productName: 'A', quantity: 100, unit: 'PCS', unitPrice: 100, discount: 0, amount: 10000, producedQty: 0, shippedQty: 0, status: 'PENDING' },
      ];
      
      const result = CustomerPortalEngine.calculateOrderProgress(items);
      expect(result).toBe(0);
    });

    it('should return 100 for fully produced', () => {
      const items: SOItem[] = [
        { id: '1', productCode: 'A', productName: 'A', quantity: 100, unit: 'PCS', unitPrice: 100, discount: 0, amount: 10000, producedQty: 100, shippedQty: 100, status: 'DELIVERED' },
      ];
      
      const result = CustomerPortalEngine.calculateOrderProgress(items);
      expect(result).toBe(100);
    });

    it('should handle empty items', () => {
      const result = CustomerPortalEngine.calculateOrderProgress([]);
      expect(result).toBe(0);
    });
  });

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
    });

    it('should return -1 for cancelled', () => {
      expect(CustomerPortalEngine.getOrderStep('CANCELLED')).toBe(-1);
    });

    it('should have increasing step numbers for workflow', () => {
      const workflow: SOStatus[] = ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'SHIPPED', 'DELIVERED', 'COMPLETED'];
      
      for (let i = 1; i < workflow.length; i++) {
        const prevStep = CustomerPortalEngine.getOrderStep(workflow[i - 1]);
        const currentStep = CustomerPortalEngine.getOrderStep(workflow[i]);
        expect(currentStep).toBeGreaterThan(prevStep);
      }
    });
  });
});
