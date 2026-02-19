// lib/production/scheduling-engine.ts
import { prisma } from "@/lib/prisma";

interface ScheduleInput {
  workOrderId: string;
  startDate?: Date;
  priority?: number;
}

interface ScheduledOp {
  operationId: string;
  workCenterId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  hasConflict: boolean;
  conflictReason?: string;
}

interface ScheduleResult {
  success: boolean;
  scheduledOperations: ScheduledOp[];
  conflicts: Array<{ operationId: string; reason: string }>;
  completionDate: Date;
}

export async function scheduleWorkOrder(
  input: ScheduleInput
): Promise<ScheduleResult> {
  const { workOrderId, startDate = new Date() } = input;

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      operations: {
        orderBy: { operationNumber: "asc" },
        include: { routingOperation: true },
      },
    },
  });

  if (!workOrder) {
    throw new Error("Work order not found");
  }

  const scheduledOps: ScheduledOp[] = [];
  const conflicts: Array<{ operationId: string; reason: string }> = [];
  let currentTime = new Date(startDate);

  // Pre-fetch all work centers needed to avoid N+1 queries
  const workCenterIds = [...new Set(workOrder.operations.map(op => op.workCenterId))];
  const workCenters = await prisma.workCenter.findMany({
    where: { id: { in: workCenterIds } },
  });
  const workCenterMap = new Map(workCenters.map(wc => [wc.id, wc]));

  for (const op of workOrder.operations) {
    const workCenter = workCenterMap.get(op.workCenterId);

    if (!workCenter || workCenter.status !== "active") {
      conflicts.push({
        operationId: op.id,
        reason: `Work center ${op.workCenterId} not available`,
      });
      continue;
    }

    const slot = await findNextAvailableSlot(
      op.workCenterId,
      currentTime,
      op.plannedSetupTime + op.plannedRunTime
    );

    const conflict = await checkConflicts(
      op.workCenterId,
      slot.start,
      slot.end
    );

    const scheduledOp: ScheduledOp = {
      operationId: op.id,
      workCenterId: op.workCenterId,
      scheduledStart: slot.start,
      scheduledEnd: slot.end,
      hasConflict: conflict !== null,
      conflictReason: conflict?.reason,
    };

    scheduledOps.push(scheduledOp);

    if (conflict) {
      conflicts.push({
        operationId: op.id,
        reason: conflict.reason,
      });
    }

    const overlapPercent = op.routingOperation?.overlapPercent || 0;
    if (overlapPercent > 0) {
      const overlapTime =
        (slot.end.getTime() - slot.start.getTime()) * (1 - overlapPercent / 100);
      currentTime = new Date(slot.start.getTime() + overlapTime);
    } else {
      currentTime = slot.end;
    }
  }

  // Save schedule
  for (const op of scheduledOps) {
    await prisma.scheduledOperation.upsert({
      where: { workOrderOperationId: op.operationId },
      create: {
        workOrderOperationId: op.operationId,
        workCenterId: op.workCenterId,
        scheduledStart: op.scheduledStart,
        scheduledEnd: op.scheduledEnd,
        sequence: 0,
        hasConflict: op.hasConflict,
        conflictReason: op.conflictReason,
      },
      update: {
        scheduledStart: op.scheduledStart,
        scheduledEnd: op.scheduledEnd,
        hasConflict: op.hasConflict,
        conflictReason: op.conflictReason,
      },
    });

    await prisma.workOrderOperation.update({
      where: { id: op.operationId },
      data: {
        scheduledStart: op.scheduledStart,
        scheduledEnd: op.scheduledEnd,
        status: "scheduled",
      },
    });
  }

  const lastOp = scheduledOps[scheduledOps.length - 1];

  return {
    success: conflicts.length === 0,
    scheduledOperations: scheduledOps,
    conflicts,
    completionDate: lastOp?.scheduledEnd || currentTime,
  };
}

async function findNextAvailableSlot(
  workCenterId: string,
  afterDate: Date,
  durationMinutes: number
): Promise<{ start: Date; end: Date }> {
  const workCenter = await prisma.workCenter.findUnique({
    where: { id: workCenterId },
  });

  if (!workCenter) {
    throw new Error("Work center not found");
  }

  const existingOps = await prisma.scheduledOperation.findMany({
    where: {
      workCenterId,
      scheduledEnd: { gte: afterDate },
      status: { not: "completed" },
    },
    orderBy: { scheduledStart: "asc" },
  });

  const [startHour, startMin] = workCenter.workingHoursStart
    .split(":")
    .map(Number);
  const [endHour] = workCenter.workingHoursEnd.split(":").map(Number);
  const workingDays = workCenter.workingDays as number[];

  let candidateStart = new Date(afterDate);

  if (
    candidateStart.getHours() < startHour ||
    (candidateStart.getHours() === startHour &&
      candidateStart.getMinutes() < startMin)
  ) {
    candidateStart.setHours(startHour, startMin, 0, 0);
  }

  while (!workingDays.includes(candidateStart.getDay())) {
    candidateStart.setDate(candidateStart.getDate() + 1);
    candidateStart.setHours(startHour, startMin, 0, 0);
  }

  const candidateEnd = new Date(
    candidateStart.getTime() + durationMinutes * 60000
  );

  for (const existingOp of existingOps) {
    if (candidateEnd <= existingOp.scheduledStart) {
      break;
    }

    if (candidateStart < existingOp.scheduledEnd) {
      candidateStart = new Date(existingOp.scheduledEnd);

      if (candidateStart.getHours() >= endHour) {
        candidateStart.setDate(candidateStart.getDate() + 1);
        candidateStart.setHours(startHour, startMin, 0, 0);

        while (!workingDays.includes(candidateStart.getDay())) {
          candidateStart.setDate(candidateStart.getDate() + 1);
        }
      }
    }
  }

  return {
    start: candidateStart,
    end: new Date(candidateStart.getTime() + durationMinutes * 60000),
  };
}

async function checkConflicts(
  workCenterId: string,
  start: Date,
  end: Date
): Promise<{ reason: string } | null> {
  const overlapping = await prisma.scheduledOperation.findFirst({
    where: {
      workCenterId,
      status: { not: "completed" },
      OR: [
        {
          scheduledStart: { lt: end },
          scheduledEnd: { gt: start },
        },
      ],
    },
  });

  if (overlapping) {
    return {
      reason: `Conflicts with operation ${overlapping.workOrderOperationId}`,
    };
  }

  const maintenance = await prisma.downtimeRecord.findFirst({
    where: {
      workCenterId,
      type: "PLANNED",
      startTime: { lt: end },
      OR: [{ endTime: null }, { endTime: { gt: start } }],
    },
  });

  if (maintenance) {
    return { reason: `Work center in maintenance: ${maintenance.reason}` };
  }

  return null;
}

export async function autoScheduleAll(
  options: {
    startDate?: Date;
    workCenterIds?: string[];
  } = {}
): Promise<{ scheduled: number; failed: number; errors: string[] }> {
  const { startDate = new Date(), workCenterIds } = options;

  const workOrders = await prisma.workOrder.findMany({
    where: {
      status: { in: ["draft", "released"] },
      operations: {
        some: {
          status: "pending",
          ...(workCenterIds && { workCenterId: { in: workCenterIds } }),
        },
      },
    },
    orderBy: [{ priority: "desc" }, { plannedEnd: "asc" }],
  });

  let scheduled = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const wo of workOrders) {
    try {
      const result = await scheduleWorkOrder({
        workOrderId: wo.id,
        startDate,
        priority: wo.priority === "high" ? 80 : wo.priority === "urgent" ? 100 : 50,
      });

      if (result.success) {
        scheduled++;
      } else {
        failed++;
        errors.push(
          `${wo.woNumber}: ${result.conflicts.map((c) => c.reason).join(", ")}`
        );
      }
    } catch (error) {
      failed++;
      errors.push(`${wo.woNumber}: ${(error as Error).message}`);
    }
  }

  return { scheduled, failed, errors };
}

export async function rescheduleOperation(
  operationId: string,
  newStart: Date
): Promise<{ success: boolean; error?: string }> {
  const operation = await prisma.workOrderOperation.findUnique({
    where: { id: operationId },
    include: { scheduledOp: true },
  });

  if (!operation) {
    return { success: false, error: "Operation not found" };
  }

  const duration = operation.plannedSetupTime + operation.plannedRunTime;
  const newEnd = new Date(newStart.getTime() + duration * 60000);

  const conflict = await checkConflicts(operation.workCenterId, newStart, newEnd);

  if (conflict) {
    return { success: false, error: conflict.reason };
  }

  await prisma.scheduledOperation.update({
    where: { workOrderOperationId: operationId },
    data: {
      scheduledStart: newStart,
      scheduledEnd: newEnd,
      hasConflict: false,
      conflictReason: null,
    },
  });

  await prisma.workOrderOperation.update({
    where: { id: operationId },
    data: {
      scheduledStart: newStart,
      scheduledEnd: newEnd,
    },
  });

  return { success: true };
}

export async function getSchedule(
  startDate: Date,
  endDate: Date,
  workCenterIds?: string[]
): Promise<
  Array<{
    workCenterId: string;
    workCenterName: string;
    operations: Array<{
      id: string;
      workOrderNumber: string;
      operationName: string;
      scheduledStart: Date;
      scheduledEnd: Date;
      status: string;
      hasConflict: boolean;
    }>;
  }>
> {
  const workCenters = await prisma.workCenter.findMany({
    where: {
      status: "active",
      ...(workCenterIds && { id: { in: workCenterIds } }),
    },
  });

  const result = [];

  for (const wc of workCenters) {
    const scheduledOps = await prisma.scheduledOperation.findMany({
      where: {
        workCenterId: wc.id,
        scheduledStart: { gte: startDate },
        scheduledEnd: { lte: endDate },
      },
      include: {
        workOrderOperation: {
          include: {
            workOrder: true,
          },
        },
      },
      orderBy: { scheduledStart: "asc" },
    });

    result.push({
      workCenterId: wc.id,
      workCenterName: wc.name,
      operations: scheduledOps.map((op) => ({
        id: op.workOrderOperationId,
        workOrderNumber: op.workOrderOperation.workOrder.woNumber,
        operationName: op.workOrderOperation.name,
        scheduledStart: op.scheduledStart,
        scheduledEnd: op.scheduledEnd,
        status: op.status,
        hasConflict: op.hasConflict,
      })),
    });
  }

  return result;
}
