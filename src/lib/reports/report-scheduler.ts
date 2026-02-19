// src/lib/reports/report-scheduler.ts
// Report Scheduler Service - Manage scheduled report execution

import prisma from '@/lib/prisma';
import { getReportTemplate, ReportTemplateConfig } from './report-templates';

// Types
export interface CreateScheduleInput {
  name: string;
  templateId: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  dayOfWeek?: number; // 0-6 for weekly (0=Monday)
  dayOfMonth?: number; // 1-31 for monthly
  timeOfDay: string; // "HH:mm" format
  format: 'PDF' | 'EXCEL' | 'BOTH';
  recipients: string[];
  filters?: Record<string, unknown>;
  userId: string;
}

export interface UpdateScheduleInput {
  name?: string;
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  dayOfWeek?: number;
  dayOfMonth?: number;
  timeOfDay?: string;
  format?: string;
  recipients?: string[];
  filters?: Record<string, unknown>;
  enabled?: boolean;
}

/**
 * Create a new report schedule
 */
export async function createReportSchedule(input: CreateScheduleInput) {
  const template = getReportTemplate(input.templateId);
  if (!template) {
    throw new Error(`Template not found: ${input.templateId}`);
  }

  // Calculate next run time
  const nextRunAt = calculateNextRunTime(
    input.frequency,
    input.timeOfDay,
    input.dayOfWeek,
    input.dayOfMonth
  );

  // First check if SavedReport exists with this templateId, or create one
  let savedReport = await prisma.savedReport.findFirst({
    where: {
      name: template.name,
      userId: input.userId,
    },
  });

  if (!savedReport) {
    savedReport = await prisma.savedReport.create({
      data: {
        name: `${template.name} (${template.nameVi})`,
        description: template.description,
        type: template.category.toUpperCase(),
        category: template.category,
        userId: input.userId,
        filters: {
          templateId: input.templateId,
          columns: template.columns,
          query: template.query,
        },
      },
    });
  }

  const schedule = await prisma.reportSchedule.create({
    data: {
      reportId: savedReport.id,
      name: input.name,
      frequency: input.frequency.toLowerCase(),
      dayOfWeek: input.dayOfWeek,
      dayOfMonth: input.dayOfMonth,
      time: input.timeOfDay,
      outputFormat: input.format.toLowerCase(),
      recipients: input.recipients.map((email) => ({
        email,
        type: 'to',
      })) as object[],
      parameters: (input.filters ?? {}) as object,
      isActive: true,
      nextRunAt,
      createdBy: input.userId,
    },
  });

  return schedule;
}

/**
 * Update an existing schedule
 */
export async function updateReportSchedule(
  scheduleId: string,
  input: UpdateScheduleInput,
  userId: string
) {
  const schedule = await prisma.reportSchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule) {
    throw new Error('Schedule not found');
  }

  if (schedule.createdBy !== userId) {
    throw new Error('Permission denied');
  }

  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.frequency !== undefined) updateData.frequency = input.frequency.toLowerCase();
  if (input.dayOfWeek !== undefined) updateData.dayOfWeek = input.dayOfWeek;
  if (input.dayOfMonth !== undefined) updateData.dayOfMonth = input.dayOfMonth;
  if (input.timeOfDay !== undefined) updateData.time = input.timeOfDay;
  if (input.format !== undefined) updateData.outputFormat = input.format.toLowerCase();
  if (input.recipients !== undefined) {
    updateData.recipients = input.recipients.map((email) => ({ email, type: 'to' })) as object[];
  }
  if (input.filters !== undefined) updateData.parameters = input.filters as object;
  if (input.enabled !== undefined) updateData.isActive = input.enabled;

  // Recalculate next run time if schedule changed
  if (input.frequency || input.timeOfDay || input.dayOfWeek || input.dayOfMonth) {
    updateData.nextRunAt = calculateNextRunTime(
      (input.frequency || schedule.frequency).toUpperCase() as 'DAILY' | 'WEEKLY' | 'MONTHLY',
      input.timeOfDay || schedule.time,
      input.dayOfWeek ?? schedule.dayOfWeek ?? undefined,
      input.dayOfMonth ?? schedule.dayOfMonth ?? undefined
    );
  }

  return prisma.reportSchedule.update({
    where: { id: scheduleId },
    data: updateData,
  });
}

/**
 * Delete a schedule
 */
export async function deleteReportSchedule(scheduleId: string, userId: string) {
  const schedule = await prisma.reportSchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule) {
    throw new Error('Schedule not found');
  }

  if (schedule.createdBy !== userId) {
    throw new Error('Permission denied');
  }

  return prisma.reportSchedule.delete({
    where: { id: scheduleId },
  });
}

/**
 * Get all schedules for a user
 */
export async function getUserSchedules(userId: string) {
  return prisma.reportSchedule.findMany({
    where: { createdBy: userId },
    include: {
      report: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get schedules due to run
 */
export async function getDueSchedules() {
  const now = new Date();

  return prisma.reportSchedule.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: now },
    },
    include: {
      report: true,
    },
  });
}

/**
 * Mark schedule as run and calculate next run time
 */
export async function markScheduleAsRun(scheduleId: string, success: boolean, error?: string) {
  const schedule = await prisma.reportSchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule) return null;

  const nextRunAt = calculateNextRunTime(
    schedule.frequency.toUpperCase() as 'DAILY' | 'WEEKLY' | 'MONTHLY',
    schedule.time,
    schedule.dayOfWeek ?? undefined,
    schedule.dayOfMonth ?? undefined
  );

  return prisma.reportSchedule.update({
    where: { id: scheduleId },
    data: {
      lastRunAt: new Date(),
      lastRunStatus: success ? 'success' : 'failed',
      nextRunAt,
      runCount: { increment: 1 },
    },
  });
}

/**
 * Calculate next run time based on schedule configuration
 */
export function calculateNextRunTime(
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  timeOfDay: string,
  dayOfWeek?: number,
  dayOfMonth?: number
): Date {
  const [hours, minutes] = timeOfDay.split(':').map(Number);
  const now = new Date();
  const next = new Date();

  // Set the time
  next.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case 'DAILY':
      // If the time has passed today, schedule for tomorrow
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      break;

    case 'WEEKLY':
      // dayOfWeek: 0=Monday, 1=Tuesday, ..., 6=Sunday
      const targetDay = dayOfWeek ?? 0;
      const currentDay = (next.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
      let daysUntilTarget = targetDay - currentDay;

      if (daysUntilTarget < 0 || (daysUntilTarget === 0 && next <= now)) {
        daysUntilTarget += 7;
      }

      next.setDate(next.getDate() + daysUntilTarget);
      break;

    case 'MONTHLY':
      // dayOfMonth: 1-31
      const targetDate = dayOfMonth ?? 1;
      next.setDate(targetDate);

      // If we've passed this day this month, go to next month
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }

      // Handle months with fewer days (e.g., Feb 30 → Feb 28)
      const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      if (targetDate > lastDayOfMonth) {
        next.setDate(lastDayOfMonth);
      }
      break;
  }

  return next;
}

/**
 * Get schedule run history
 */
export async function getScheduleHistory(scheduleId: string, limit: number = 20) {
  return prisma.reportInstance.findMany({
    where: { scheduleId },
    orderBy: { generatedAt: 'desc' },
    take: limit,
  });
}

export default {
  createReportSchedule,
  updateReportSchedule,
  deleteReportSchedule,
  getUserSchedules,
  getDueSchedules,
  markScheduleAsRun,
  calculateNextRunTime,
  getScheduleHistory,
};
