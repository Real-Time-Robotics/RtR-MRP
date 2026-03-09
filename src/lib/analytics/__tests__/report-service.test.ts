import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockSavedReport,
  mockReportInstance,
  mockReportSchedule,
  mockUser,
  mockEmailService,
} = vi.hoisted(() => ({
  mockSavedReport: {
    findUnique: vi.fn(),
  },
  mockReportInstance: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  mockReportSchedule: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  mockUser: {
    findUnique: vi.fn(),
  },
  mockEmailService: {
    sendReportDelivery: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    savedReport: mockSavedReport,
    reportInstance: mockReportInstance,
    reportSchedule: mockReportSchedule,
    user: mockUser,
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
  },
}));

vi.mock('@/lib/email/email-service', () => ({
  emailService: mockEmailService,
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { reportService } from '../report-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSavedReport(overrides: Record<string, unknown> = {}) {
  return {
    id: 'report-1',
    name: 'Test Report',
    filters: { status: 'active' },
    ...overrides,
  };
}

function makeInstanceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inst-1',
    scheduleId: null,
    reportId: 'report-1',
    generatedAt: new Date('2026-01-01'),
    generatedBy: 'user-1',
    parameters: {},
    format: 'pdf',
    fileUrl: '/api/analytics/reports/instances/inst-1/download',
    fileName: 'Test_Report.pdf',
    fileSize: 1024,
    status: 'completed',
    error: null,
    expiresAt: null,
    downloadCount: 0,
    recipients: null,
    deliveryStatus: null,
    ...overrides,
  };
}

function makeScheduleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sched-1',
    reportId: 'report-1',
    name: 'Daily PDF',
    frequency: 'daily',
    dayOfWeek: null,
    dayOfMonth: null,
    time: '08:00',
    timezone: 'Asia/Ho_Chi_Minh',
    recipients: [{ email: 'a@b.com', type: 'to' }],
    outputFormat: 'pdf',
    parameters: null,
    emailSubject: null,
    emailBody: null,
    isActive: true,
    lastRunAt: null,
    lastRunStatus: null,
    nextRunAt: new Date('2026-01-02T08:00:00'),
    runCount: 0,
    createdAt: new Date('2026-01-01'),
    createdBy: 'user-1',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ReportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // generateReport
  // =========================================================================

  describe('generateReport', () => {
    it('throws when report not found', async () => {
      mockSavedReport.findUnique.mockResolvedValue(null);

      await expect(
        reportService.generateReport({ reportId: 'no-exist', format: 'pdf' })
      ).rejects.toThrow('Report not found');
    });

    it('creates instance, generates, updates to completed', async () => {
      const report = makeSavedReport();
      mockSavedReport.findUnique.mockResolvedValue(report);

      const createdInstance = makeInstanceRow({ status: 'generating' });
      mockReportInstance.create.mockResolvedValue(createdInstance);

      // update call for completed status
      mockReportInstance.update.mockResolvedValue({
        ...createdInstance,
        status: 'completed',
      });

      // getReportInstance called at the end
      const completedInstance = makeInstanceRow({ status: 'completed' });
      mockReportInstance.findUnique.mockResolvedValue(completedInstance);

      const result = await reportService.generateReport({
        reportId: 'report-1',
        format: 'pdf',
        parameters: { extra: true },
        generatedBy: 'user-1',
      });

      expect(mockReportInstance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reportId: 'report-1',
          generatedBy: 'user-1',
          format: 'pdf',
          status: 'generating',
        }),
      });

      expect(mockReportInstance.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: expect.objectContaining({
          status: 'completed',
          fileUrl: expect.stringContaining('/api/analytics/reports/instances/'),
          fileName: expect.stringContaining('Test_Report'),
          expiresAt: expect.any(Date),
        }),
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
    });

    it('merges report.filters with input parameters', async () => {
      const report = makeSavedReport({ filters: { category: 'A' } });
      mockSavedReport.findUnique.mockResolvedValue(report);
      const inst = makeInstanceRow({ status: 'generating' });
      mockReportInstance.create.mockResolvedValue(inst);
      mockReportInstance.update.mockResolvedValue({ ...inst, status: 'completed' });
      mockReportInstance.findUnique.mockResolvedValue(makeInstanceRow());

      await reportService.generateReport({
        reportId: 'report-1',
        format: 'csv',
        parameters: { dateFrom: '2026-01-01' },
      });

      const createCall = mockReportInstance.create.mock.calls[0][0];
      const params = createCall.data.parameters;
      expect(params).toEqual(expect.objectContaining({ category: 'A', dateFrom: '2026-01-01' }));
    });

    it('handles null report.filters gracefully', async () => {
      const report = makeSavedReport({ filters: null });
      mockSavedReport.findUnique.mockResolvedValue(report);
      const inst = makeInstanceRow({ status: 'generating' });
      mockReportInstance.create.mockResolvedValue(inst);
      mockReportInstance.update.mockResolvedValue({ ...inst, status: 'completed' });
      mockReportInstance.findUnique.mockResolvedValue(makeInstanceRow());

      await reportService.generateReport({
        reportId: 'report-1',
        format: 'pdf',
      });

      expect(mockReportInstance.create).toHaveBeenCalled();
    });

    it('sends email when sendEmail=true and recipients present', async () => {
      const report = makeSavedReport();
      mockSavedReport.findUnique.mockResolvedValue(report);
      const inst = makeInstanceRow({ status: 'generating' });
      mockReportInstance.create.mockResolvedValue(inst);
      mockReportInstance.update.mockResolvedValue({ ...inst, status: 'completed' });

      // deliverReport will call findUnique with include
      const completedInst = makeInstanceRow({
        status: 'completed',
        report: report,
        fileUrl: '/download',
      });
      // First findUnique call is from deliverReport, second from getReportInstance
      mockReportInstance.findUnique
        .mockResolvedValueOnce(completedInst) // deliverReport
        .mockResolvedValueOnce(makeInstanceRow()); // getReportInstance

      mockEmailService.sendReportDelivery.mockResolvedValue({ success: true });

      const recipients = [{ email: 'test@example.com', type: 'to' as const }];
      await reportService.generateReport({
        reportId: 'report-1',
        format: 'pdf',
        recipients,
        sendEmail: true,
      });

      expect(mockEmailService.sendReportDelivery).toHaveBeenCalled();
    });

    it('does not send email when sendEmail=false', async () => {
      const report = makeSavedReport();
      mockSavedReport.findUnique.mockResolvedValue(report);
      const inst = makeInstanceRow({ status: 'generating' });
      mockReportInstance.create.mockResolvedValue(inst);
      mockReportInstance.update.mockResolvedValue({ ...inst, status: 'completed' });
      mockReportInstance.findUnique.mockResolvedValue(makeInstanceRow());

      await reportService.generateReport({
        reportId: 'report-1',
        format: 'pdf',
        recipients: [{ email: 'a@b.com', type: 'to' }],
        sendEmail: false,
      });

      expect(mockEmailService.sendReportDelivery).not.toHaveBeenCalled();
    });

    it('updates instance to failed on generation error and rethrows', async () => {
      const report = makeSavedReport();
      mockSavedReport.findUnique.mockResolvedValue(report);
      const inst = makeInstanceRow({ id: 'inst-fail', status: 'generating' });
      mockReportInstance.create.mockResolvedValue(inst);

      // Make the update for completed status throw (simulating executeReportGeneration failing)
      // Actually executeReportGeneration is private and won't fail easily, but the
      // update itself could fail. Let's make the first update (completed) throw.
      mockReportInstance.update.mockRejectedValueOnce(new Error('DB error'));

      await expect(
        reportService.generateReport({ reportId: 'report-1', format: 'pdf' })
      ).rejects.toThrow('DB error');

      // Second call to update should mark as failed
      expect(mockReportInstance.update).toHaveBeenCalledTimes(2);
      expect(mockReportInstance.update).toHaveBeenLastCalledWith({
        where: { id: 'inst-fail' },
        data: {
          status: 'failed',
          error: 'DB error',
        },
      });
    });

    it('handles non-Error thrown in catch branch', async () => {
      const report = makeSavedReport();
      mockSavedReport.findUnique.mockResolvedValue(report);
      const inst = makeInstanceRow({ id: 'inst-fail2', status: 'generating' });
      mockReportInstance.create.mockResolvedValue(inst);
      mockReportInstance.update
        .mockRejectedValueOnce('string error') // first update throws non-Error
        .mockResolvedValueOnce({}); // second update (failed status) succeeds

      await expect(
        reportService.generateReport({ reportId: 'report-1', format: 'pdf' })
      ).rejects.toBe('string error');

      expect(mockReportInstance.update).toHaveBeenLastCalledWith({
        where: { id: 'inst-fail2' },
        data: {
          status: 'failed',
          error: 'Unknown error',
        },
      });
    });

    it('defaults generatedBy to "system"', async () => {
      const report = makeSavedReport();
      mockSavedReport.findUnique.mockResolvedValue(report);
      const inst = makeInstanceRow({ status: 'generating' });
      mockReportInstance.create.mockResolvedValue(inst);
      mockReportInstance.update.mockResolvedValue({ ...inst, status: 'completed' });
      mockReportInstance.findUnique.mockResolvedValue(makeInstanceRow());

      await reportService.generateReport({
        reportId: 'report-1',
        format: 'pdf',
      });

      expect(mockReportInstance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ generatedBy: 'system' }),
      });
    });
  });

  // =========================================================================
  // getReportInstance
  // =========================================================================

  describe('getReportInstance', () => {
    it('returns null when not found', async () => {
      mockReportInstance.findUnique.mockResolvedValue(null);
      const result = await reportService.getReportInstance('no-exist');
      expect(result).toBeNull();
    });

    it('returns mapped ReportInstance', async () => {
      mockReportInstance.findUnique.mockResolvedValue(makeInstanceRow());
      const result = await reportService.getReportInstance('inst-1');
      expect(result).toBeDefined();
      expect(result!.id).toBe('inst-1');
      expect(result!.format).toBe('pdf');
      expect(result!.status).toBe('completed');
    });

    it('maps null fields to undefined', async () => {
      const row = makeInstanceRow({
        scheduleId: null,
        fileUrl: null,
        fileName: null,
        fileSize: null,
        error: null,
        expiresAt: null,
        recipients: null,
        deliveryStatus: null,
      });
      mockReportInstance.findUnique.mockResolvedValue(row);
      const result = await reportService.getReportInstance('inst-1');
      expect(result!.scheduleId).toBeUndefined();
      expect(result!.fileUrl).toBeUndefined();
      expect(result!.fileName).toBeUndefined();
      expect(result!.fileSize).toBeUndefined();
      expect(result!.error).toBeUndefined();
      expect(result!.expiresAt).toBeUndefined();
    });
  });

  // =========================================================================
  // getReportInstances
  // =========================================================================

  describe('getReportInstances', () => {
    it('returns mapped instances with default limit', async () => {
      mockReportInstance.findMany.mockResolvedValue([
        makeInstanceRow({ id: 'i1' }),
        makeInstanceRow({ id: 'i2' }),
      ]);

      const result = await reportService.getReportInstances('report-1');
      expect(result).toHaveLength(2);
      expect(mockReportInstance.findMany).toHaveBeenCalledWith({
        where: { reportId: 'report-1' },
        orderBy: { generatedAt: 'desc' },
        take: 10,
      });
    });

    it('respects custom limit', async () => {
      mockReportInstance.findMany.mockResolvedValue([]);
      await reportService.getReportInstances('report-1', 5);
      expect(mockReportInstance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });
  });

  // =========================================================================
  // recordDownload
  // =========================================================================

  describe('recordDownload', () => {
    it('increments downloadCount and sets lastDownloadAt', async () => {
      mockReportInstance.update.mockResolvedValue({});
      await reportService.recordDownload('inst-1');
      expect(mockReportInstance.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: {
          downloadCount: { increment: 1 },
          lastDownloadAt: expect.any(Date),
        },
      });
    });
  });

  // =========================================================================
  // createSchedule
  // =========================================================================

  describe('createSchedule', () => {
    it('creates schedule with default timezone and outputFormat', async () => {
      mockReportSchedule.create.mockResolvedValue(makeScheduleRow());

      const result = await reportService.createSchedule(
        {
          reportId: 'report-1',
          name: 'Daily PDF',
          frequency: 'daily',
          time: '08:00',
          recipients: [{ email: 'a@b.com', type: 'to' }],
        },
        'user-1'
      );

      expect(mockReportSchedule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reportId: 'report-1',
          timezone: 'Asia/Ho_Chi_Minh',
          outputFormat: 'pdf',
          isActive: true,
          createdBy: 'user-1',
          nextRunAt: expect.any(Date),
        }),
      });
      expect(result.id).toBe('sched-1');
    });

    it('uses provided timezone and outputFormat', async () => {
      mockReportSchedule.create.mockResolvedValue(makeScheduleRow({ timezone: 'UTC', outputFormat: 'xlsx' }));

      await reportService.createSchedule(
        {
          reportId: 'report-1',
          frequency: 'weekly',
          time: '09:00',
          timezone: 'UTC',
          outputFormat: 'xlsx',
          recipients: [],
          dayOfWeek: 1,
        },
        'user-1'
      );

      expect(mockReportSchedule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          timezone: 'UTC',
          outputFormat: 'xlsx',
          dayOfWeek: 1,
        }),
      });
    });
  });

  // =========================================================================
  // getSchedule
  // =========================================================================

  describe('getSchedule', () => {
    it('returns null when not found', async () => {
      mockReportSchedule.findUnique.mockResolvedValue(null);
      const result = await reportService.getSchedule('no-exist');
      expect(result).toBeNull();
    });

    it('returns mapped schedule', async () => {
      mockReportSchedule.findUnique.mockResolvedValue(makeScheduleRow());
      const result = await reportService.getSchedule('sched-1');
      expect(result).toBeDefined();
      expect(result!.frequency).toBe('daily');
      expect(result!.timezone).toBe('Asia/Ho_Chi_Minh');
    });
  });

  // =========================================================================
  // getSchedulesForReport
  // =========================================================================

  describe('getSchedulesForReport', () => {
    it('returns mapped schedules', async () => {
      mockReportSchedule.findMany.mockResolvedValue([
        makeScheduleRow({ id: 's1' }),
        makeScheduleRow({ id: 's2' }),
      ]);

      const result = await reportService.getSchedulesForReport('report-1');
      expect(result).toHaveLength(2);
      expect(mockReportSchedule.findMany).toHaveBeenCalledWith({
        where: { reportId: 'report-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // =========================================================================
  // updateSchedule
  // =========================================================================

  describe('updateSchedule', () => {
    it('throws when schedule not found', async () => {
      mockReportSchedule.findUnique.mockResolvedValue(null);
      await expect(
        reportService.updateSchedule('no-exist', { name: 'Updated' })
      ).rejects.toThrow('Schedule not found');
    });

    it('updates schedule and recalculates nextRunAt', async () => {
      const existing = makeScheduleRow();
      mockReportSchedule.findUnique.mockResolvedValue(existing);
      mockReportSchedule.update.mockResolvedValue({
        ...existing,
        name: 'Updated',
      });

      const result = await reportService.updateSchedule('sched-1', {
        name: 'Updated',
      });

      expect(mockReportSchedule.update).toHaveBeenCalledWith({
        where: { id: 'sched-1' },
        data: expect.objectContaining({
          name: 'Updated',
          nextRunAt: expect.any(Date),
        }),
      });
      expect(result.name).toBe('Updated');
    });

    it('uses existing values for unspecified fields', async () => {
      const existing = makeScheduleRow({
        frequency: 'weekly',
        time: '10:00',
        timezone: 'UTC',
        dayOfWeek: 3,
        dayOfMonth: null,
      });
      mockReportSchedule.findUnique.mockResolvedValue(existing);
      mockReportSchedule.update.mockResolvedValue(existing);

      await reportService.updateSchedule('sched-1', { name: 'New Name' });

      // Should use existing frequency/time/timezone for nextRunAt calculation
      expect(mockReportSchedule.update).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // deleteSchedule
  // =========================================================================

  describe('deleteSchedule', () => {
    it('deletes the schedule', async () => {
      mockReportSchedule.delete.mockResolvedValue({});
      await reportService.deleteSchedule('sched-1');
      expect(mockReportSchedule.delete).toHaveBeenCalledWith({
        where: { id: 'sched-1' },
      });
    });
  });

  // =========================================================================
  // toggleSchedule
  // =========================================================================

  describe('toggleSchedule', () => {
    it('toggles isActive to true', async () => {
      mockReportSchedule.update.mockResolvedValue(makeScheduleRow({ isActive: true }));
      const result = await reportService.toggleSchedule('sched-1', true);
      expect(mockReportSchedule.update).toHaveBeenCalledWith({
        where: { id: 'sched-1' },
        data: { isActive: true },
      });
      expect(result.isActive).toBe(true);
    });

    it('toggles isActive to false', async () => {
      mockReportSchedule.update.mockResolvedValue(makeScheduleRow({ isActive: false }));
      const result = await reportService.toggleSchedule('sched-1', false);
      expect(result.isActive).toBe(false);
    });
  });

  // =========================================================================
  // runScheduledReports
  // =========================================================================

  describe('runScheduledReports', () => {
    it('returns zeros when no schedules are due', async () => {
      mockReportSchedule.findMany.mockResolvedValue([]);
      const result = await reportService.runScheduledReports();
      expect(result).toEqual({ processed: 0, succeeded: 0, failed: 0 });
    });

    it('processes due schedules successfully', async () => {
      const report = makeSavedReport();
      const schedule = {
        ...makeScheduleRow(),
        report,
        recipients: [{ email: 'a@b.com', type: 'to' }],
        parameters: { key: 'value' },
      };
      mockReportSchedule.findMany.mockResolvedValue([schedule]);

      // generateReport internals
      mockSavedReport.findUnique.mockResolvedValue(report);
      const inst = makeInstanceRow({ status: 'generating' });
      mockReportInstance.create.mockResolvedValue(inst);
      mockReportInstance.update.mockResolvedValue({ ...inst, status: 'completed' });

      // deliverReport internals (sendEmail=true)
      const completedInst = makeInstanceRow({
        status: 'completed',
        report,
        fileUrl: '/download',
      });
      mockReportInstance.findUnique
        .mockResolvedValueOnce(completedInst) // deliverReport
        .mockResolvedValueOnce(makeInstanceRow()); // getReportInstance

      mockEmailService.sendReportDelivery.mockResolvedValue({ success: true });

      // Schedule update after success
      mockReportSchedule.update.mockResolvedValue({});

      const result = await reportService.runScheduledReports();
      expect(result).toEqual({ processed: 1, succeeded: 1, failed: 0 });

      // Verify schedule was updated with success status
      expect(mockReportSchedule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sched-1' },
          data: expect.objectContaining({
            lastRunStatus: 'success',
            runCount: { increment: 1 },
          }),
        })
      );
    });

    it('handles failed report generation', async () => {
      const report = makeSavedReport();
      const schedule = {
        ...makeScheduleRow(),
        report,
        recipients: [],
        parameters: null,
      };
      mockReportSchedule.findMany.mockResolvedValue([schedule]);

      // generateReport will fail because report not found
      mockSavedReport.findUnique.mockResolvedValue(null);
      mockReportSchedule.update.mockResolvedValue({});

      const result = await reportService.runScheduledReports();
      expect(result).toEqual({ processed: 1, succeeded: 0, failed: 1 });

      expect(mockReportSchedule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lastRunStatus: 'failed',
          }),
        })
      );
    });

    it('handles non-Error thrown in schedule processing', async () => {
      const report = makeSavedReport();
      const schedule = {
        ...makeScheduleRow(),
        report,
        recipients: [],
        parameters: null,
      };
      mockReportSchedule.findMany.mockResolvedValue([schedule]);

      // Make generateReport throw a non-Error
      mockSavedReport.findUnique.mockRejectedValue('string failure');
      mockReportSchedule.update.mockResolvedValue({});

      const result = await reportService.runScheduledReports();
      expect(result).toEqual({ processed: 1, succeeded: 0, failed: 1 });
    });
  });

  // =========================================================================
  // deliverReport
  // =========================================================================

  describe('deliverReport', () => {
    it('throws when instance not found', async () => {
      mockReportInstance.findUnique.mockResolvedValue(null);
      await expect(
        reportService.deliverReport('no-exist', [])
      ).rejects.toThrow('Report instance not ready for delivery');
    });

    it('throws when instance status is not completed', async () => {
      mockReportInstance.findUnique.mockResolvedValue(
        makeInstanceRow({ status: 'generating', report: makeSavedReport() })
      );
      await expect(
        reportService.deliverReport('inst-1', [])
      ).rejects.toThrow('Report instance not ready for delivery');
    });

    it('sends email to external recipients', async () => {
      const instance = makeInstanceRow({
        status: 'completed',
        report: makeSavedReport(),
        fileUrl: '/api/download',
      });
      mockReportInstance.findUnique.mockResolvedValue(instance);
      mockEmailService.sendReportDelivery.mockResolvedValue({ success: true });
      mockReportInstance.update.mockResolvedValue({});

      const recipients = [
        { email: 'user@test.com', name: 'Test User', type: 'to' as const },
      ];

      await reportService.deliverReport('inst-1', recipients);

      expect(mockEmailService.sendReportDelivery).toHaveBeenCalledWith(
        'user@test.com',
        'Test User',
        expect.objectContaining({
          reportName: 'Test Report',
          downloadUrl: expect.stringContaining('/api/download'),
        })
      );

      expect(mockReportInstance.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: expect.objectContaining({
          deliveryStatus: 'sent',
        }),
      });
    });

    it('looks up user email for userId recipients', async () => {
      const instance = makeInstanceRow({
        status: 'completed',
        report: makeSavedReport(),
        fileUrl: '/api/download',
      });
      mockReportInstance.findUnique.mockResolvedValue(instance);
      mockUser.findUnique.mockResolvedValue({
        email: 'found@test.com',
        name: 'Found User',
      });
      mockEmailService.sendReportDelivery.mockResolvedValue({ success: true });
      mockReportInstance.update.mockResolvedValue({});

      const recipients = [
        { email: 'original@test.com', type: 'to' as const, userId: 'user-123' },
      ];

      await reportService.deliverReport('inst-1', recipients);

      expect(mockUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { email: true, name: true },
      });
      expect(mockEmailService.sendReportDelivery).toHaveBeenCalledWith(
        'found@test.com',
        'Found User',
        expect.anything()
      );
    });

    it('uses default name "User" when recipient has no name', async () => {
      const instance = makeInstanceRow({
        status: 'completed',
        report: makeSavedReport(),
        fileUrl: '/download',
      });
      mockReportInstance.findUnique.mockResolvedValue(instance);
      mockEmailService.sendReportDelivery.mockResolvedValue({ success: true });
      mockReportInstance.update.mockResolvedValue({});

      const recipients = [{ email: 'user@test.com', type: 'to' as const }];

      await reportService.deliverReport('inst-1', recipients);

      expect(mockEmailService.sendReportDelivery).toHaveBeenCalledWith(
        'user@test.com',
        'User',
        expect.anything()
      );
    });

    it('uses default name when userId user has no name', async () => {
      const instance = makeInstanceRow({
        status: 'completed',
        report: makeSavedReport(),
        fileUrl: '/download',
      });
      mockReportInstance.findUnique.mockResolvedValue(instance);
      mockUser.findUnique.mockResolvedValue({ email: 'u@t.com', name: null });
      mockEmailService.sendReportDelivery.mockResolvedValue({ success: true });
      mockReportInstance.update.mockResolvedValue({});

      const recipients = [
        { email: 'x@t.com', type: 'to' as const, userId: 'u1' },
      ];
      await reportService.deliverReport('inst-1', recipients);

      expect(mockEmailService.sendReportDelivery).toHaveBeenCalledWith(
        'u@t.com',
        'User',
        expect.anything()
      );
    });

    it('handles recipient with no email address', async () => {
      const instance = makeInstanceRow({
        status: 'completed',
        report: makeSavedReport(),
        fileUrl: '/download',
      });
      mockReportInstance.findUnique.mockResolvedValue(instance);
      mockReportInstance.update.mockResolvedValue({});

      // Recipient with no email and userId lookup returns null
      const recipients = [
        { email: '', type: 'to' as const, userId: 'u1' } as any,
      ];
      mockUser.findUnique.mockResolvedValue(null);

      await reportService.deliverReport('inst-1', recipients);

      expect(mockEmailService.sendReportDelivery).not.toHaveBeenCalled();
      // deliveryStatus should be 'failed' since no email succeeded
      expect(mockReportInstance.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: expect.objectContaining({
          deliveryStatus: 'failed',
        }),
      });
    });

    it('sets deliveryStatus to partial when some succeed and some fail', async () => {
      const instance = makeInstanceRow({
        status: 'completed',
        report: makeSavedReport(),
        fileUrl: '/download',
      });
      mockReportInstance.findUnique.mockResolvedValue(instance);
      mockEmailService.sendReportDelivery
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'Bounce' });
      mockReportInstance.update.mockResolvedValue({});

      const recipients = [
        { email: 'good@test.com', type: 'to' as const },
        { email: 'bad@test.com', type: 'to' as const },
      ];

      await reportService.deliverReport('inst-1', recipients);

      expect(mockReportInstance.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: expect.objectContaining({
          deliveryStatus: 'partial',
        }),
      });
    });

    it('catches individual email send errors', async () => {
      const instance = makeInstanceRow({
        status: 'completed',
        report: makeSavedReport(),
        fileUrl: '/download',
      });
      mockReportInstance.findUnique.mockResolvedValue(instance);
      mockEmailService.sendReportDelivery.mockRejectedValue(new Error('SMTP error'));
      mockReportInstance.update.mockResolvedValue({});

      const recipients = [{ email: 'err@test.com', type: 'to' as const }];

      // Should not throw
      await reportService.deliverReport('inst-1', recipients);

      expect(mockReportInstance.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: expect.objectContaining({
          deliveryStatus: 'failed',
        }),
      });
    });

    it('catches non-Error thrown during email send', async () => {
      const instance = makeInstanceRow({
        status: 'completed',
        report: makeSavedReport(),
        fileUrl: '/download',
      });
      mockReportInstance.findUnique.mockResolvedValue(instance);
      mockEmailService.sendReportDelivery.mockRejectedValue('string error');
      mockReportInstance.update.mockResolvedValue({});

      const recipients = [{ email: 'err@test.com', type: 'to' as const }];
      await reportService.deliverReport('inst-1', recipients);

      expect(mockReportInstance.update).toHaveBeenCalledWith({
        where: { id: 'inst-1' },
        data: expect.objectContaining({
          deliveryStatus: 'failed',
        }),
      });
    });

    it('uses NEXT_PUBLIC_APP_URL env var for download URL', async () => {
      const origUrl = process.env.NEXT_PUBLIC_APP_URL;
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';

      const instance = makeInstanceRow({
        status: 'completed',
        report: makeSavedReport(),
        fileUrl: '/api/download/test',
      });
      mockReportInstance.findUnique.mockResolvedValue(instance);
      mockEmailService.sendReportDelivery.mockResolvedValue({ success: true });
      mockReportInstance.update.mockResolvedValue({});

      const recipients = [{ email: 'u@t.com', type: 'to' as const }];
      await reportService.deliverReport('inst-1', recipients);

      expect(mockEmailService.sendReportDelivery).toHaveBeenCalledWith(
        'u@t.com',
        'User',
        expect.objectContaining({
          downloadUrl: 'https://app.example.com/api/download/test',
        })
      );

      process.env.NEXT_PUBLIC_APP_URL = origUrl;
    });

    it('passes attachReport flag from recipient', async () => {
      const instance = makeInstanceRow({
        status: 'completed',
        report: makeSavedReport(),
        fileUrl: '/download',
      });
      mockReportInstance.findUnique.mockResolvedValue(instance);
      mockEmailService.sendReportDelivery.mockResolvedValue({ success: true });
      mockReportInstance.update.mockResolvedValue({});

      const recipients = [
        { email: 'u@t.com', type: 'to' as const, attachReport: true },
      ];
      await reportService.deliverReport('inst-1', recipients);

      expect(mockEmailService.sendReportDelivery).toHaveBeenCalledWith(
        'u@t.com',
        'User',
        expect.objectContaining({ attachReport: true })
      );
    });

    it('uses instance.format or defaults to PDF for reportType', async () => {
      const instance = makeInstanceRow({
        status: 'completed',
        report: makeSavedReport(),
        fileUrl: '/download',
        format: 'xlsx',
      });
      mockReportInstance.findUnique.mockResolvedValue(instance);
      mockEmailService.sendReportDelivery.mockResolvedValue({ success: true });
      mockReportInstance.update.mockResolvedValue({});

      await reportService.deliverReport('inst-1', [
        { email: 'u@t.com', type: 'to' },
      ]);

      expect(mockEmailService.sendReportDelivery).toHaveBeenCalledWith(
        'u@t.com',
        'User',
        expect.objectContaining({ reportType: 'xlsx' })
      );
    });

    it('falls back to PDF when format is null', async () => {
      const instance = makeInstanceRow({
        status: 'completed',
        report: makeSavedReport(),
        fileUrl: '/download',
        format: null,
      });
      mockReportInstance.findUnique.mockResolvedValue(instance);
      mockEmailService.sendReportDelivery.mockResolvedValue({ success: true });
      mockReportInstance.update.mockResolvedValue({});

      await reportService.deliverReport('inst-1', [
        { email: 'u@t.com', type: 'to' },
      ]);

      expect(mockEmailService.sendReportDelivery).toHaveBeenCalledWith(
        'u@t.com',
        'User',
        expect.objectContaining({ reportType: 'PDF' })
      );
    });
  });

  // =========================================================================
  // toReportSchedule (tested indirectly)
  // =========================================================================

  describe('toReportSchedule mapping', () => {
    it('maps null optional fields to undefined', async () => {
      const row = makeScheduleRow({
        name: null,
        dayOfWeek: null,
        dayOfMonth: null,
        emailSubject: null,
        emailBody: null,
        lastRunAt: null,
        lastRunStatus: null,
        nextRunAt: null,
      });
      mockReportSchedule.findUnique.mockResolvedValue(row);

      const result = await reportService.getSchedule('sched-1');
      expect(result!.name).toBeUndefined();
      expect(result!.dayOfWeek).toBeUndefined();
      expect(result!.dayOfMonth).toBeUndefined();
      expect(result!.emailSubject).toBeUndefined();
      expect(result!.emailBody).toBeUndefined();
      expect(result!.lastRunAt).toBeUndefined();
      // lastRunStatus uses `as` cast (not `??`), so null stays as null
      expect(result!.lastRunStatus).toBeNull();
      expect(result!.nextRunAt).toBeUndefined();
    });
  });

  // =========================================================================
  // calculateNextRunTime (tested indirectly via createSchedule)
  // =========================================================================

  describe('calculateNextRunTime (via createSchedule)', () => {
    it('calculates next run for daily frequency', async () => {
      mockReportSchedule.create.mockImplementation(async (args: any) => ({
        ...makeScheduleRow(),
        ...args.data,
      }));

      const result = await reportService.createSchedule(
        {
          reportId: 'r1',
          frequency: 'daily',
          time: '23:59',
          recipients: [],
        },
        'u1'
      );

      expect(result.id).toBeDefined();
    });

    it('calculates next run for weekly frequency with dayOfWeek', async () => {
      mockReportSchedule.create.mockImplementation(async (args: any) => ({
        ...makeScheduleRow(),
        ...args.data,
      }));

      await reportService.createSchedule(
        {
          reportId: 'r1',
          frequency: 'weekly',
          time: '08:00',
          dayOfWeek: 1, // Monday
          recipients: [],
        },
        'u1'
      );

      const createArgs = mockReportSchedule.create.mock.calls[0][0];
      expect(createArgs.data.nextRunAt).toBeInstanceOf(Date);
    });

    it('calculates next run for biweekly frequency with dayOfWeek', async () => {
      mockReportSchedule.create.mockImplementation(async (args: any) => ({
        ...makeScheduleRow(),
        ...args.data,
      }));

      await reportService.createSchedule(
        {
          reportId: 'r1',
          frequency: 'biweekly',
          time: '08:00',
          dayOfWeek: 5,
          recipients: [],
        },
        'u1'
      );

      const createArgs = mockReportSchedule.create.mock.calls[0][0];
      expect(createArgs.data.nextRunAt).toBeInstanceOf(Date);
    });

    it('calculates next run for monthly frequency with dayOfMonth', async () => {
      mockReportSchedule.create.mockImplementation(async (args: any) => ({
        ...makeScheduleRow(),
        ...args.data,
      }));

      await reportService.createSchedule(
        {
          reportId: 'r1',
          frequency: 'monthly',
          time: '08:00',
          dayOfMonth: 15,
          recipients: [],
        },
        'u1'
      );

      const createArgs = mockReportSchedule.create.mock.calls[0][0];
      expect(createArgs.data.nextRunAt).toBeInstanceOf(Date);
    });

    it('calculates next run for quarterly frequency with dayOfMonth', async () => {
      mockReportSchedule.create.mockImplementation(async (args: any) => ({
        ...makeScheduleRow(),
        ...args.data,
      }));

      await reportService.createSchedule(
        {
          reportId: 'r1',
          frequency: 'quarterly',
          time: '08:00',
          dayOfMonth: 1,
          recipients: [],
        },
        'u1'
      );

      const createArgs = mockReportSchedule.create.mock.calls[0][0];
      expect(createArgs.data.nextRunAt).toBeInstanceOf(Date);
    });

    it('handles weekly without dayOfWeek', async () => {
      mockReportSchedule.create.mockImplementation(async (args: any) => ({
        ...makeScheduleRow(),
        ...args.data,
      }));

      await reportService.createSchedule(
        {
          reportId: 'r1',
          frequency: 'weekly',
          time: '08:00',
          recipients: [],
        },
        'u1'
      );

      // Should still succeed, just won't adjust for day of week
      expect(mockReportSchedule.create).toHaveBeenCalled();
    });

    it('handles monthly without dayOfMonth', async () => {
      mockReportSchedule.create.mockImplementation(async (args: any) => ({
        ...makeScheduleRow(),
        ...args.data,
      }));

      await reportService.createSchedule(
        {
          reportId: 'r1',
          frequency: 'monthly',
          time: '08:00',
          recipients: [],
        },
        'u1'
      );

      expect(mockReportSchedule.create).toHaveBeenCalled();
    });

    it('handles quarterly without dayOfMonth', async () => {
      mockReportSchedule.create.mockImplementation(async (args: any) => ({
        ...makeScheduleRow(),
        ...args.data,
      }));

      await reportService.createSchedule(
        {
          reportId: 'r1',
          frequency: 'quarterly',
          time: '08:00',
          recipients: [],
        },
        'u1'
      );

      expect(mockReportSchedule.create).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Singleton export
  // =========================================================================

  describe('exports', () => {
    it('exports reportService as singleton', async () => {
      const mod = await import('../report-service');
      expect(mod.reportService).toBe(mod.default);
    });
  });
});
