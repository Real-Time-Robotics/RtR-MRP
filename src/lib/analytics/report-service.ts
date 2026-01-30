// =============================================================================
// RTR MRP - REPORT SERVICE
// Service for report generation and management
// =============================================================================

import { prisma } from '@/lib/prisma';
import type {
  ReportSchedule,
  ReportScheduleCreateInput,
  ReportInstance,
  ReportGenerateInput,
  ReportRecipient,
  ReportFormat,
  ScheduleFrequency,
} from './types';

// =============================================================================
// REPORT SERVICE CLASS
// =============================================================================

class ReportService {
  // ---------------------------------------------------------------------------
  // Report Generation
  // ---------------------------------------------------------------------------

  async generateReport(input: ReportGenerateInput): Promise<ReportInstance> {
    const { reportId, format, parameters = {}, recipients, sendEmail = false } = input;

    // Get the saved report
    const report = await prisma.savedReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // Create report instance
    const instance = await prisma.reportInstance.create({
      data: {
        reportId,
        generatedBy: 'system', // TODO: get from session
        parameters: { ...report.filters, ...parameters },
        format,
        status: 'generating',
        recipients: recipients as any,
      },
    });

    try {
      // Generate the report based on format
      const result = await this.executeReportGeneration(report, instance, format);

      // Update instance with file info
      await prisma.reportInstance.update({
        where: { id: instance.id },
        data: {
          status: 'completed',
          fileUrl: result.fileUrl,
          fileName: result.fileName,
          fileSize: result.fileSize,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Send email if requested
      if (sendEmail && recipients && recipients.length > 0) {
        await this.deliverReport(instance.id, recipients);
      }

      return this.getReportInstance(instance.id) as Promise<ReportInstance>;
    } catch (error) {
      // Update instance with error
      await prisma.reportInstance.update({
        where: { id: instance.id },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  private async executeReportGeneration(
    report: any,
    instance: any,
    format: ReportFormat
  ): Promise<{ fileUrl: string; fileName: string; fileSize: number }> {
    // TODO: Implement actual report generation using export-service
    // For now, return placeholder values

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${report.name.replace(/\s+/g, '_')}_${timestamp}.${format}`;

    // In a real implementation, this would:
    // 1. Query data based on report filters
    // 2. Generate PDF/XLSX/CSV using export-service
    // 3. Upload to file storage (S3, etc.)
    // 4. Return the file URL

    return {
      fileUrl: `/api/analytics/reports/instances/${instance.id}/download`,
      fileName,
      fileSize: 0,
    };
  }

  async getReportInstance(id: string): Promise<ReportInstance | null> {
    const instance = await prisma.reportInstance.findUnique({
      where: { id },
    });

    if (!instance) return null;

    return this.toReportInstance(instance);
  }

  async getReportInstances(reportId: string, limit = 10): Promise<ReportInstance[]> {
    const instances = await prisma.reportInstance.findMany({
      where: { reportId },
      orderBy: { generatedAt: 'desc' },
      take: limit,
    });

    return instances.map(i => this.toReportInstance(i));
  }

  async recordDownload(instanceId: string): Promise<void> {
    await prisma.reportInstance.update({
      where: { id: instanceId },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadAt: new Date(),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Report Scheduling
  // ---------------------------------------------------------------------------

  async createSchedule(input: ReportScheduleCreateInput, createdBy: string): Promise<ReportSchedule> {
    const nextRunAt = this.calculateNextRunTime(
      input.frequency,
      input.time,
      input.timezone || 'Asia/Ho_Chi_Minh',
      input.dayOfWeek,
      input.dayOfMonth
    );

    const schedule = await prisma.reportSchedule.create({
      data: {
        reportId: input.reportId,
        name: input.name,
        frequency: input.frequency,
        dayOfWeek: input.dayOfWeek,
        dayOfMonth: input.dayOfMonth,
        time: input.time,
        timezone: input.timezone || 'Asia/Ho_Chi_Minh',
        recipients: input.recipients as any,
        outputFormat: input.outputFormat || 'pdf',
        parameters: input.parameters as any,
        emailSubject: input.emailSubject,
        emailBody: input.emailBody,
        isActive: true,
        nextRunAt,
        createdBy,
      },
    });

    return this.toReportSchedule(schedule);
  }

  async getSchedule(id: string): Promise<ReportSchedule | null> {
    const schedule = await prisma.reportSchedule.findUnique({
      where: { id },
    });

    if (!schedule) return null;

    return this.toReportSchedule(schedule);
  }

  async getSchedulesForReport(reportId: string): Promise<ReportSchedule[]> {
    const schedules = await prisma.reportSchedule.findMany({
      where: { reportId },
      orderBy: { createdAt: 'desc' },
    });

    return schedules.map(s => this.toReportSchedule(s));
  }

  async updateSchedule(id: string, data: Partial<ReportScheduleCreateInput>): Promise<ReportSchedule> {
    const existing = await prisma.reportSchedule.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Schedule not found');
    }

    const frequency = data.frequency || existing.frequency;
    const time = data.time || existing.time;
    const timezone = data.timezone || existing.timezone;
    const dayOfWeek = data.dayOfWeek ?? existing.dayOfWeek;
    const dayOfMonth = data.dayOfMonth ?? existing.dayOfMonth;

    const nextRunAt = this.calculateNextRunTime(
      frequency as ScheduleFrequency,
      time,
      timezone,
      dayOfWeek ?? undefined,
      dayOfMonth ?? undefined
    );

    const updated = await prisma.reportSchedule.update({
      where: { id },
      data: {
        name: data.name,
        frequency: data.frequency,
        dayOfWeek: data.dayOfWeek,
        dayOfMonth: data.dayOfMonth,
        time: data.time,
        timezone: data.timezone,
        recipients: data.recipients as any,
        outputFormat: data.outputFormat,
        parameters: data.parameters as any,
        emailSubject: data.emailSubject,
        emailBody: data.emailBody,
        nextRunAt,
      },
    });

    return this.toReportSchedule(updated);
  }

  async deleteSchedule(id: string): Promise<void> {
    await prisma.reportSchedule.delete({ where: { id } });
  }

  async toggleSchedule(id: string, isActive: boolean): Promise<ReportSchedule> {
    const updated = await prisma.reportSchedule.update({
      where: { id },
      data: { isActive },
    });

    return this.toReportSchedule(updated);
  }

  // ---------------------------------------------------------------------------
  // Scheduled Execution (Cron Handler)
  // ---------------------------------------------------------------------------

  async runScheduledReports(): Promise<{ processed: number; succeeded: number; failed: number }> {
    const now = new Date();

    // Find all due schedules
    const dueSchedules = await prisma.reportSchedule.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
      include: {
        report: true,
      },
    });

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const schedule of dueSchedules) {
      processed++;

      try {
        // Generate the report
        await this.generateReport({
          reportId: schedule.reportId,
          format: schedule.outputFormat as ReportFormat,
          parameters: schedule.parameters as Record<string, any>,
          recipients: schedule.recipients as ReportRecipient[],
          sendEmail: true,
        });

        // Update schedule
        const nextRunAt = this.calculateNextRunTime(
          schedule.frequency as ScheduleFrequency,
          schedule.time,
          schedule.timezone,
          schedule.dayOfWeek ?? undefined,
          schedule.dayOfMonth ?? undefined
        );

        await prisma.reportSchedule.update({
          where: { id: schedule.id },
          data: {
            lastRunAt: now,
            lastRunStatus: 'success',
            nextRunAt,
            runCount: { increment: 1 },
          },
        });

        succeeded++;
      } catch (error) {
        // Update schedule with error
        await prisma.reportSchedule.update({
          where: { id: schedule.id },
          data: {
            lastRunAt: now,
            lastRunStatus: 'failed',
          },
        });

        failed++;
        console.error(`Failed to run scheduled report ${schedule.id}:`, error);
      }
    }

    return { processed, succeeded, failed };
  }

  // ---------------------------------------------------------------------------
  // Email Delivery
  // ---------------------------------------------------------------------------

  async deliverReport(instanceId: string, recipients: ReportRecipient[]): Promise<void> {
    const instance = await prisma.reportInstance.findUnique({
      where: { id: instanceId },
      include: { report: true },
    });

    if (!instance || instance.status !== 'completed') {
      throw new Error('Report instance not ready for delivery');
    }

    // TODO: Implement actual email sending
    // This would use nodemailer or a similar service

    // For now, just update the delivery status
    await prisma.reportInstance.update({
      where: { id: instanceId },
      data: {
        recipients: recipients as any,
        deliveryStatus: 'sent',
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private calculateNextRunTime(
    frequency: ScheduleFrequency,
    time: string,
    timezone: string,
    dayOfWeek?: number,
    dayOfMonth?: number
  ): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const next = new Date(now);

    // Set the time
    next.setHours(hours, minutes, 0, 0);

    // If the time has passed today, start from tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    switch (frequency) {
      case 'daily':
        // Already set
        break;

      case 'weekly':
        if (dayOfWeek !== undefined) {
          const currentDay = next.getDay();
          let daysUntil = dayOfWeek - currentDay;
          if (daysUntil <= 0) daysUntil += 7;
          if (daysUntil === 0 && next <= now) daysUntil = 7;
          next.setDate(next.getDate() + daysUntil);
        }
        break;

      case 'biweekly':
        if (dayOfWeek !== undefined) {
          const currentDay = next.getDay();
          let daysUntil = dayOfWeek - currentDay;
          if (daysUntil <= 0) daysUntil += 14;
          next.setDate(next.getDate() + daysUntil);
        }
        break;

      case 'monthly':
        if (dayOfMonth !== undefined) {
          next.setDate(dayOfMonth);
          if (next <= now) {
            next.setMonth(next.getMonth() + 1);
          }
        }
        break;

      case 'quarterly':
        if (dayOfMonth !== undefined) {
          const currentMonth = next.getMonth();
          const quarterStart = Math.floor(currentMonth / 3) * 3;
          next.setMonth(quarterStart);
          next.setDate(dayOfMonth);
          if (next <= now) {
            next.setMonth(next.getMonth() + 3);
          }
        }
        break;
    }

    return next;
  }

  private toReportSchedule(data: any): ReportSchedule {
    return {
      id: data.id,
      reportId: data.reportId,
      name: data.name,
      frequency: data.frequency as ScheduleFrequency,
      dayOfWeek: data.dayOfWeek,
      dayOfMonth: data.dayOfMonth,
      time: data.time,
      timezone: data.timezone,
      recipients: data.recipients as ReportRecipient[],
      outputFormat: data.outputFormat as ReportFormat,
      parameters: data.parameters as Record<string, any>,
      emailSubject: data.emailSubject,
      emailBody: data.emailBody,
      isActive: data.isActive,
      lastRunAt: data.lastRunAt,
      lastRunStatus: data.lastRunStatus,
      nextRunAt: data.nextRunAt,
      runCount: data.runCount,
    };
  }

  private toReportInstance(data: any): ReportInstance {
    return {
      id: data.id,
      scheduleId: data.scheduleId,
      reportId: data.reportId,
      generatedAt: data.generatedAt,
      generatedBy: data.generatedBy,
      parameters: data.parameters as Record<string, any>,
      format: data.format as ReportFormat,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      status: data.status,
      error: data.error,
      expiresAt: data.expiresAt,
      downloadCount: data.downloadCount,
      recipients: data.recipients as ReportRecipient[],
      deliveryStatus: data.deliveryStatus,
    };
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const reportService = new ReportService();
export default reportService;
