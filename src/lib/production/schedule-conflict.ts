// src/lib/production/schedule-conflict.ts
// Conflict detection and reschedule logic for production Gantt chart

import prisma from '@/lib/prisma';

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflicts: {
    type: 'CAPACITY' | 'MATERIAL' | 'DEPENDENCY';
    messageVi: string;
    severity: 'WARNING' | 'ERROR';
  }[];
  canProceed: boolean;
}

export async function checkRescheduleConflicts(
  workOrderId: string,
  newStartDate: Date,
  newEndDate: Date
): Promise<ConflictCheckResult> {
  const conflicts: ConflictCheckResult['conflicts'] = [];

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      product: {
        include: {
          bomHeaders: {
            where: { status: 'active' },
            take: 1,
            include: {
              bomLines: {
                include: { part: true },
              },
            },
          },
        },
      },
    },
  });

  if (!workOrder) {
    return {
      hasConflict: true,
      conflicts: [
        {
          type: 'DEPENDENCY',
          messageVi: 'Không tìm thấy lệnh sản xuất',
          severity: 'ERROR',
        },
      ],
      canProceed: false,
    };
  }

  // Check 1: Past date warning
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (newStartDate < today) {
    conflicts.push({
      type: 'DEPENDENCY',
      messageVi: 'Ngày bắt đầu đã qua',
      severity: 'WARNING',
    });
  }

  // Check 2: Material availability
  const activeBom = workOrder.product?.bomHeaders?.[0];
  if (activeBom?.bomLines) {
    for (const bomLine of activeBom.bomLines) {
      const requiredQty = bomLine.quantity * workOrder.quantity;

      const inventory = await prisma.inventory.aggregate({
        where: { partId: bomLine.partId },
        _sum: { quantity: true },
      });

      const available = inventory._sum.quantity || 0;

      if (available < requiredQty) {
        const leadTime = bomLine.part.leadTimeDays || 14;
        const availableDate = new Date();
        availableDate.setDate(availableDate.getDate() + leadTime);

        if (newStartDate < availableDate) {
          conflicts.push({
            type: 'MATERIAL',
            messageVi: `Thiếu ${bomLine.part.partNumber} (cần ${requiredQty}, có ${available})`,
            severity: 'WARNING',
          });
        }
      }
    }
  }

  // Check 3: Overlapping work orders (capacity)
  const overlapping = await prisma.workOrder.count({
    where: {
      id: { not: workOrderId },
      status: { in: ['planned', 'released', 'in_progress'] },
      OR: [
        {
          plannedStart: { lte: newEndDate },
          plannedEnd: { gte: newStartDate },
        },
      ],
    },
  });

  if (overlapping > 5) {
    conflicts.push({
      type: 'CAPACITY',
      messageVi: `${overlapping} lệnh SX khác trong cùng thời gian`,
      severity: 'WARNING',
    });
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
    canProceed: !conflicts.some((c) => c.severity === 'ERROR'),
  };
}

export async function rescheduleWorkOrder(
  workOrderId: string,
  newStartDate: Date,
  newEndDate: Date,
  force: boolean = false
): Promise<{ success: boolean; error?: string }> {
  if (!force) {
    const conflictCheck = await checkRescheduleConflicts(
      workOrderId,
      newStartDate,
      newEndDate
    );
    if (!conflictCheck.canProceed) {
      return {
        success: false,
        error: conflictCheck.conflicts.map((c) => c.messageVi).join(', '),
      };
    }
  }

  try {
    await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        plannedStart: newStartDate,
        plannedEnd: newEndDate,
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Update failed',
    };
  }
}
