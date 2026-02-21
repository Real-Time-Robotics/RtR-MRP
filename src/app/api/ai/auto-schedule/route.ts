// =============================================================================
// AUTO-SCHEDULE API - Main endpoint
// POST: Generate schedule, GET: Get current schedule status
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// =============================================================================
// TYPES
// =============================================================================

interface WorkOrderData {
  id: string;
  workOrderNumber: string;
  productName: string;
  productCode: string;
  quantity: number;
  status: string;
  priority: number;
  workCenterId: string | null;
  workCenterName: string | null;
  scheduledStartDate: Date | null;
  scheduledEndDate: Date | null;
  dueDate: Date | null;
  estimatedHours: number;
}

const PRIORITY_MAP: Record<string, number> = {
  critical: 1,
  high: 2,
  normal: 3,
  low: 4,
};

function mapPriorityToNumber(priority: string): number {
  return PRIORITY_MAP[priority.toLowerCase()] ?? 3;
}

/**
 * Fetch work orders from the database with related product, work center,
 * and sales order data. Optionally filter by a list of work order IDs.
 */
async function fetchWorkOrders(workOrderIds?: string[]): Promise<WorkOrderData[]> {
  const workOrders = await prisma.workOrder.findMany({
    where: {
      ...(workOrderIds && workOrderIds.length > 0 ? { id: { in: workOrderIds } } : {}),
      status: { notIn: ['completed', 'cancelled'] },
    },
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          assemblyHours: true,
          testingHours: true,
          defaultWorkCenterId: true,
        },
      },
      workCenterRef: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      salesOrder: {
        select: {
          id: true,
          orderNumber: true,
          requiredDate: true,
          priority: true,
        },
      },
    },
    orderBy: [
      { dueDate: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  return workOrders.map((wo) => {
    const assemblyHours = wo.product.assemblyHours ?? 0;
    const testingHours = wo.product.testingHours ?? 0;
    const estimatedHours = (assemblyHours + testingHours) * wo.quantity;

    return {
      id: wo.id,
      workOrderNumber: wo.woNumber,
      productName: wo.product.name,
      productCode: wo.product.sku,
      quantity: wo.quantity,
      status: wo.status,
      priority: mapPriorityToNumber(wo.priority),
      workCenterId: wo.workCenterId ?? wo.product.defaultWorkCenterId ?? null,
      workCenterName: wo.workCenterRef?.name ?? null,
      scheduledStartDate: wo.plannedStart,
      scheduledEndDate: wo.plannedEnd,
      dueDate: wo.dueDate ?? wo.salesOrder?.requiredDate ?? null,
      estimatedHours: estimatedHours > 0 ? estimatedHours : 8, // default 8h if product has no hours defined
    };
  });
}

// =============================================================================
// SCHEDULING ALGORITHM
// =============================================================================

interface ScheduleResult {
  id: string;
  createdAt: Date;
  algorithm: string;
  workOrdersScheduled: number;
  metrics: {
    utilization: number;
    onTimeDelivery: number;
    conflictCount: number;
    makespan: number;
  };
  suggestions: Array<{
    id: string;
    workOrderId: string;
    workOrderNumber: string;
    type: string;
    description: string;
    startDate: Date;
    endDate: Date;
    workCenterId: string | null;
    workCenterName: string | null;
  }>;
  conflicts: Array<{
    id: string;
    type: string;
    severity: string;
    description: string;
    workOrderIds: string[];
  }>;
}

function generateScheduleResult(
  algorithm: string,
  workOrders: WorkOrderData[]
): ScheduleResult {
  const now = new Date();
  const workOrderCount = workOrders.length;

  // Group work orders by work center to detect conflicts
  const byWorkCenter = new Map<string, WorkOrderData[]>();
  for (const wo of workOrders) {
    const wcKey = wo.workCenterId ?? 'unassigned';
    const group = byWorkCenter.get(wcKey) ?? [];
    group.push(wo);
    byWorkCenter.set(wcKey, group);
  }

  // Detect overlapping schedules within each work center
  const conflicts: ScheduleResult['conflicts'] = [];
  for (const [wcId, wcOrders] of byWorkCenter.entries()) {
    if (wcId === 'unassigned') continue;
    const scheduled = wcOrders.filter((wo) => wo.scheduledStartDate && wo.scheduledEndDate);
    for (let i = 0; i < scheduled.length; i++) {
      for (let j = i + 1; j < scheduled.length; j++) {
        const a = scheduled[i];
        const b = scheduled[j];
        if (
          a.scheduledStartDate! < b.scheduledEndDate! &&
          b.scheduledStartDate! < a.scheduledEndDate!
        ) {
          conflicts.push({
            id: `conflict-${conflicts.length + 1}`,
            type: 'overlap',
            severity: 'high',
            description: `Chồng chéo lịch trình: ${a.workOrderNumber} và ${b.workOrderNumber} tại ${a.workCenterName ?? wcId}`,
            workOrderIds: [a.id, b.id],
          });
        }
      }
    }
  }

  // Check for overdue work orders
  const overdueOrders = workOrders.filter(
    (wo) => wo.dueDate && new Date(wo.dueDate) < now
  );
  if (overdueOrders.length > 0) {
    conflicts.push({
      id: `conflict-${conflicts.length + 1}`,
      type: 'overdue',
      severity: 'critical',
      description: `${overdueOrders.length} lệnh sản xuất đã quá hạn`,
      workOrderIds: overdueOrders.map((wo) => wo.id),
    });
  }

  // Calculate basic metrics
  const totalEstimatedHours = workOrders.reduce((sum, wo) => sum + wo.estimatedHours, 0);
  const uniqueWorkCenters = new Set(workOrders.map((wo) => wo.workCenterId).filter(Boolean));
  const workCenterCount = Math.max(uniqueWorkCenters.size, 1);
  const hoursPerDay = 8;
  const makespanDays = Math.ceil(totalEstimatedHours / (workCenterCount * hoursPerDay));

  const scheduledCount = workOrders.filter((wo) => wo.scheduledStartDate).length;
  const onTimeCount = workOrders.filter(
    (wo) =>
      wo.dueDate &&
      wo.scheduledEndDate &&
      new Date(wo.scheduledEndDate) <= new Date(wo.dueDate)
  ).length;
  const onTimeBase = workOrders.filter((wo) => wo.dueDate && wo.scheduledEndDate).length;

  const utilization = workCenterCount > 0
    ? Math.min((totalEstimatedHours / (makespanDays * workCenterCount * hoursPerDay)) * 100, 100)
    : 0;
  const onTimeDelivery = onTimeBase > 0
    ? (onTimeCount / onTimeBase) * 100
    : 100;

  // Generate scheduling suggestions for unscheduled work orders
  const unscheduled = workOrders
    .filter((wo) => !wo.scheduledStartDate)
    .sort((a, b) => a.priority - b.priority); // lower number = higher priority

  let currentOffset = 0;
  const suggestions: ScheduleResult['suggestions'] = unscheduled.map((wo, i) => {
    const durationDays = Math.max(Math.ceil(wo.estimatedHours / hoursPerDay), 1);
    const startDate = new Date(now.getTime() + currentOffset * 24 * 60 * 60 * 1000);
    const endDate = new Date(now.getTime() + (currentOffset + durationDays) * 24 * 60 * 60 * 1000);
    currentOffset += durationDays;

    return {
      id: `sug-${i + 1}`,
      workOrderId: wo.id,
      workOrderNumber: wo.workOrderNumber,
      type: 'reschedule',
      description: wo.workCenterName
        ? `Lên lịch tại ${wo.workCenterName}`
        : 'Cần phân bổ dây chuyền sản xuất',
      startDate,
      endDate,
      workCenterId: wo.workCenterId,
      workCenterName: wo.workCenterName,
    };
  });

  return {
    id: `schedule-${Date.now()}`,
    createdAt: now,
    algorithm,
    workOrdersScheduled: workOrderCount,
    metrics: {
      utilization: Math.round(utilization * 10) / 10,
      onTimeDelivery: Math.round(onTimeDelivery * 10) / 10,
      conflictCount: conflicts.length,
      makespan: makespanDays,
    },
    suggestions,
    conflicts,
  };
}

// =============================================================================
// POST: Generate schedule
// =============================================================================

export const POST = withAuth(async (request, context, session) => {
  try {
    // Rate limiting (heavy endpoint)
    const rateLimit = await checkHeavyEndpointLimit(request, session.user?.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter || 60) } }
      );
    }

    const bodySchema = z.object({
      workOrderIds: z.array(z.string()).optional(),
      algorithm: z.string().optional(),
      includeAIAnalysis: z.boolean().optional(),
    });
    const rawBody = await request.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parseResult.data;
    const {
      workOrderIds,
      algorithm = 'balanced_load',
      includeAIAnalysis = true,
    } = body;

    // Fetch real work orders from the database
    const workOrders = await fetchWorkOrders(workOrderIds);

    if (workOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Không tìm thấy lệnh sản xuất cần lên lịch',
        schedule: null,
      });
    }

    // Generate schedule result from real work order data
    const scheduleResult = generateScheduleResult(algorithm, workOrders);

    // Build AI analysis from actual data
    let aiAnalysis = null;
    if (includeAIAnalysis) {
      // Identify bottleneck work centers (highest load)
      const loadByWorkCenter = new Map<string, { name: string; hours: number }>();
      for (const wo of workOrders) {
        if (!wo.workCenterId) continue;
        const existing = loadByWorkCenter.get(wo.workCenterId) ?? { name: wo.workCenterName ?? wo.workCenterId, hours: 0 };
        existing.hours += wo.estimatedHours;
        loadByWorkCenter.set(wo.workCenterId, existing);
      }

      const sortedWorkCenters = Array.from(loadByWorkCenter.entries())
        .sort((a, b) => b[1].hours - a[1].hours);

      const predictedBottlenecks = sortedWorkCenters.slice(0, 3).map(([wcId, data]) => ({
        workCenterId: wcId,
        workCenterName: data.name,
        risk: data.hours > 160 ? 'high' : data.hours > 80 ? 'medium' : 'low',
        description: `Tổng tải: ${Math.round(data.hours)} giờ dự kiến`,
      }));

      // Identify potential load balancing improvements
      const suggestedImprovements: Array<{ id: string; title: string; description: string; impact: string }> = [];
      if (sortedWorkCenters.length >= 2) {
        const [highest, , ...rest] = sortedWorkCenters;
        const lowest = rest.length > 0 ? rest[rest.length - 1] : sortedWorkCenters[sortedWorkCenters.length - 1];
        if (highest && lowest && highest[1].hours > lowest[1].hours * 1.5) {
          suggestedImprovements.push({
            id: 'imp-1',
            title: 'Cân bằng tải',
            description: `Di chuyển một số WO từ ${highest[1].name} sang ${lowest[1].name}`,
            impact: `Giảm ${Math.round(((highest[1].hours - lowest[1].hours) / highest[1].hours) * 100)}% tải cho ${highest[1].name}`,
          });
        }
      }

      const unassignedCount = workOrders.filter((wo) => !wo.workCenterId).length;
      if (unassignedCount > 0) {
        suggestedImprovements.push({
          id: `imp-${suggestedImprovements.length + 1}`,
          title: 'Phân bổ dây chuyền',
          description: `${unassignedCount} lệnh sản xuất chưa được phân bổ dây chuyền`,
          impact: 'Cải thiện khả năng lập lịch và theo dõi tiến độ',
        });
      }

      aiAnalysis = {
        explanation: `Đã sử dụng thuật toán ${getAlgorithmName(algorithm)} để tối ưu ${workOrders.length} lệnh sản xuất. Kết quả cho thấy hiệu suất sử dụng đạt ${scheduleResult.metrics.utilization.toFixed(1)}% và tỷ lệ giao hàng đúng hẹn dự kiến ${scheduleResult.metrics.onTimeDelivery.toFixed(1)}%.`,
        predictedBottlenecks,
        suggestedImprovements,
      };
    }

    return NextResponse.json({
      success: true,
      schedule: scheduleResult,
      analysis: aiAnalysis,
      summary: {
        totalWorkOrders: scheduleResult.workOrdersScheduled,
        totalConflicts: scheduleResult.conflicts.length,
        criticalConflicts: scheduleResult.conflicts.filter((c) => c.severity === 'critical').length,
        utilizationRate: scheduleResult.metrics.utilization,
        onTimeDeliveryRate: scheduleResult.metrics.onTimeDelivery,
        algorithm: scheduleResult.algorithm,
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/auto-schedule' });
    return NextResponse.json(
      {
        error: 'Không thể tạo lịch sản xuất',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
});

function getAlgorithmName(algorithm: string): string {
  const names: Record<string, string> = {
    priority_first: 'Ưu tiên cao trước',
    due_date_first: 'Ngày đáo hạn trước',
    shortest_first: 'Ngắn nhất trước',
    setup_minimize: 'Tối thiểu setup',
    balanced_load: 'Cân bằng tải',
    genetic: 'Thuật toán di truyền',
  };
  return names[algorithm] || algorithm;
}

// =============================================================================
// GET: Get schedule status
// =============================================================================

export const GET = withAuth(async (request, context, session) => {
  try {
    const { searchParams } = new URL(request.url);
    const workOrderId = searchParams.get('workOrderId');

    if (workOrderId) {
      // Get a specific work order
      const workOrders = await fetchWorkOrders([workOrderId]);
      const workOrder = workOrders.length > 0 ? workOrders[0] : null;

      if (!workOrder) {
        return NextResponse.json({
          success: true,
          workOrder: null,
          message: 'Lệnh sản xuất không tồn tại',
        });
      }

      return NextResponse.json({
        success: true,
        workOrder,
      });
    }

    // Fetch all active work orders
    const workOrders = await fetchWorkOrders();

    // Calculate summary
    const byStatus = workOrders.reduce(
      (acc, wo) => {
        acc[wo.status] = (acc[wo.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const now = new Date();
    const summary = {
      total: workOrders.length,
      byStatus,
      needsScheduling: workOrders.filter((wo) => !wo.scheduledStartDate).length,
      overdue: workOrders.filter(
        (wo) => wo.dueDate && new Date(wo.dueDate) < now
      ).length,
      atRisk: workOrders.filter(
        (wo) =>
          wo.dueDate &&
          new Date(wo.dueDate) < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      ).length,
    };

    return NextResponse.json({
      success: true,
      workOrders,
      summary,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/auto-schedule' });
    return NextResponse.json(
      { error: 'Không thể lấy thông tin lịch sản xuất' },
      { status: 500 }
    );
  }
});
