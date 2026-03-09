import { describe, it, expect, vi } from 'vitest';
import { emailTemplates } from '../email-service';

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

describe('Email Service', () => {
  describe('emailTemplates', () => {
    describe('workflowApproval', () => {
      it('should generate approval email', () => {
        const result = emailTemplates.workflowApproval({
          recipientName: 'John',
          workflowName: 'PO Approval',
          instanceId: 'inst-1',
          stepName: 'Manager Review',
          submittedBy: 'Jane',
          actionUrl: 'https://example.com/approve',
        });
        expect(result.subject).toContain('Approval Request');
        expect(result.subject).toContain('PO Approval');
        expect(result.html).toContain('John');
        expect(result.html).toContain('PO Approval');
        expect(result.html).toContain('Manager Review');
        expect(result.html).toContain('Jane');
        expect(result.text).toContain('John');
      });
    });

    describe('overdueReminder', () => {
      it('should generate overdue email', () => {
        const result = emailTemplates.overdueReminder({
          recipientName: 'Alice',
          workflowName: 'ECO Review',
          stepName: 'QA Check',
          dueDate: '2024-01-15',
          actionUrl: 'https://example.com/action',
        });
        expect(result.subject).toContain('Overdue');
        expect(result.subject).toContain('ECO Review');
        expect(result.html).toContain('Alice');
        expect(result.html).toContain('2024-01-15');
        expect(result.text).toContain('OVERDUE');
      });
    });

    describe('alertNotification', () => {
      it('should generate critical alert email', () => {
        const result = emailTemplates.alertNotification({
          recipientName: 'Bob',
          alertType: 'Inventory',
          title: 'Low Stock Alert',
          message: 'Part XYZ is below minimum level',
          severity: 'critical',
        });
        expect(result.subject).toContain('CRITICAL');
        expect(result.subject).toContain('Low Stock Alert');
        expect(result.html).toContain('Bob');
        expect(result.html).toContain('#dc2626');
      });

      it('should generate low severity alert', () => {
        const result = emailTemplates.alertNotification({
          recipientName: 'Bob',
          alertType: 'Info',
          title: 'Status Update',
          message: 'All systems normal',
          severity: 'low',
        });
        expect(result.subject).toContain('LOW');
        expect(result.html).toContain('#30a46c');
      });

      it('should include action URL when provided', () => {
        const result = emailTemplates.alertNotification({
          recipientName: 'Bob',
          alertType: 'Test',
          title: 'Test',
          message: 'Test',
          severity: 'high',
          actionUrl: 'https://example.com/view',
        });
        expect(result.html).toContain('https://example.com/view');
        expect(result.text).toContain('https://example.com/view');
      });

      it('should handle medium severity', () => {
        const result = emailTemplates.alertNotification({
          recipientName: 'Bob',
          alertType: 'Test',
          title: 'Test',
          message: 'Test',
          severity: 'medium',
        });
        expect(result.html).toContain('#f59e0b');
      });
    });

    describe('reportDelivery', () => {
      it('should generate report delivery email', () => {
        const result = emailTemplates.reportDelivery({
          recipientName: 'Carol',
          reportName: 'Monthly Inventory',
          reportType: 'Inventory',
          generatedAt: '2024-01-15 10:00',
          downloadUrl: 'https://example.com/download',
        });
        expect(result.subject).toContain('Report Ready');
        expect(result.subject).toContain('Monthly Inventory');
        expect(result.html).toContain('Carol');
        expect(result.html).toContain('https://example.com/download');
      });
    });
  });
});
