import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
  },
}));

// The nodemailer stub is handled by vitest alias in vitest.config.ts

describe('email-sender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear module cache so each test gets fresh module state
    vi.resetModules();
    // Clear SMTP env vars to ensure mock transporter is used
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_SECURE;
    delete process.env.SMTP_FROM;
  });

  describe('sendReportEmail', () => {
    it('should send email successfully with mock transporter', async () => {
      const { sendReportEmail } = await import('../email-sender');

      const result = await sendReportEmail({
        to: ['test@example.com'],
        reportName: 'Inventory Summary',
        reportNameVi: 'Báo cáo Tồn kho',
        summary: 'Test summary',
        attachments: [
          {
            filename: 'report.xlsx',
            content: Buffer.from('test'),
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeTruthy();
    });

    it('should include cc and bcc if provided', async () => {
      const { sendReportEmail } = await import('../email-sender');

      const result = await sendReportEmail({
        to: ['to@example.com'],
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        reportName: 'Test Report',
        reportNameVi: 'Báo cáo Test',
        summary: 'Summary',
        attachments: [],
      });

      expect(result.success).toBe(true);
    });

    it('should use mrpUrl from options', async () => {
      const { sendReportEmail } = await import('../email-sender');

      const result = await sendReportEmail({
        to: ['test@example.com'],
        reportName: 'Test',
        reportNameVi: 'Test',
        summary: 'Sum',
        attachments: [],
        mrpUrl: 'https://my-mrp.com',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('sendTestEmail', () => {
    it('should send test email successfully', async () => {
      const { sendTestEmail } = await import('../email-sender');

      const result = await sendTestEmail('test@example.com');

      expect(result.success).toBe(true);
      expect(result.messageId).toBeTruthy();
    });
  });

  describe('default export', () => {
    it('should export sendReportEmail and sendTestEmail', async () => {
      const mod = await import('../email-sender');
      expect(mod.default.sendReportEmail).toBeDefined();
      expect(mod.default.sendTestEmail).toBeDefined();
    });
  });
});
