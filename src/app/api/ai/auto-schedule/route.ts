// =============================================================================
// AUTO-SCHEDULE API - Main endpoint
// POST: Generate schedule, GET: Get current schedule status
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';

// =============================================================================
// MOCK DATA
// =============================================================================

interface MockWorkOrder {
  id: string;
  workOrderNumber: string;
  productName: string;
  productCode: string;
  quantity: number;
  status: string;
  priority: number;
  workCenterId: string;
  workCenterName: string;
  scheduledStartDate: Date | null;
  scheduledEndDate: Date | null;
  dueDate: Date | null;
  estimatedHours: number;
}

function generateMockWorkOrders(count: number = 20): MockWorkOrder[] {
  const products = [
    { name: 'Bánh quy bơ', code: 'BQB-001' },
    { name: 'Bánh mì sandwich', code: 'BMS-002' },
    { name: 'Bánh ngọt kem', code: 'BNK-003' },
    { name: 'Bánh tráng', code: 'BT-004' },
    { name: 'Bánh bông lan', code: 'BBL-005' },
  ];

  const statuses = ['pending', 'scheduled', 'in_progress', 'completed'];
  const workCenters = [
    { id: 'wc-1', name: 'Dây chuyền 1' },
    { id: 'wc-2', name: 'Dây chuyền 2' },
    { id: 'wc-3', name: 'Dây chuyền 3' },
    { id: 'wc-4', name: 'Dây chuyền 4' },
    { id: 'wc-5', name: 'Dây chuyền 5' },
  ];

  return Array.from({ length: count }, (_, i) => {
    const product = products[Math.floor(Math.random() * products.length)];
    const workCenter = workCenters[Math.floor(Math.random() * workCenters.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const hasSchedule = status !== 'pending';

    const now = new Date();
    const startOffset = Math.floor(Math.random() * 14) - 2;
    const duration = Math.floor(Math.random() * 5) + 1;

    return {
      id: `wo-${i + 1}`,
      workOrderNumber: `WO-2026-${String(i + 1).padStart(4, '0')}`,
      productName: product.name,
      productCode: product.code,
      quantity: Math.floor(Math.random() * 900) + 100,
      status,
      priority: Math.floor(Math.random() * 100),
      workCenterId: workCenter.id,
      workCenterName: workCenter.name,
      scheduledStartDate: hasSchedule
        ? new Date(now.getTime() + startOffset * 24 * 60 * 60 * 1000)
        : null,
      scheduledEndDate: hasSchedule
        ? new Date(now.getTime() + (startOffset + duration) * 24 * 60 * 60 * 1000)
        : null,
      dueDate: new Date(now.getTime() + (startOffset + duration + 3) * 24 * 60 * 60 * 1000),
      estimatedHours: duration * 8,
    };
  });
}

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
    workCenterId: string;
    workCenterName: string;
  }>;
  conflicts: Array<{
    id: string;
    type: string;
    severity: string;
    description: string;
    workOrderIds: string[];
  }>;
}

function generateMockScheduleResult(algorithm: string, workOrderCount: number): ScheduleResult {
  const now = new Date();

  return {
    id: `schedule-${Date.now()}`,
    createdAt: now,
    algorithm,
    workOrdersScheduled: workOrderCount,
    metrics: {
      utilization: 75 + Math.random() * 15,
      onTimeDelivery: 85 + Math.random() * 10,
      conflictCount: Math.floor(Math.random() * 5),
      makespan: 14 + Math.floor(Math.random() * 7),
    },
    suggestions: Array.from({ length: Math.min(workOrderCount, 10) }, (_, i) => ({
      id: `sug-${i + 1}`,
      workOrderId: `wo-${i + 1}`,
      workOrderNumber: `WO-2026-${String(i + 1).padStart(4, '0')}`,
      type: 'reschedule',
      description: `Lên lịch tại ${['Dây chuyền 1', 'Dây chuyền 2', 'Dây chuyền 3'][Math.floor(Math.random() * 3)]}`,
      startDate: new Date(now.getTime() + i * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + (i + 2) * 24 * 60 * 60 * 1000),
      workCenterId: `wc-${(i % 5) + 1}`,
      workCenterName: `Dây chuyền ${(i % 5) + 1}`,
    })),
    conflicts: [
      {
        id: 'conflict-1',
        type: 'overlap',
        severity: 'high',
        description: 'Chồng chéo lịch trình trên Dây chuyền 1',
        workOrderIds: ['wo-1', 'wo-5'],
      },
    ],
  };
}

// =============================================================================
// POST: Generate schedule
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      workOrderIds,
      algorithm = 'balanced_load',
      includeAIAnalysis = true,
    } = body;

    // Generate mock work orders
    const workOrders = generateMockWorkOrders(workOrderIds?.length || 20);

    if (workOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Không tìm thấy lệnh sản xuất cần lên lịch',
        schedule: null,
      });
    }

    // Generate mock schedule result
    const scheduleResult = generateMockScheduleResult(algorithm, workOrders.length);

    // Mock AI analysis
    let aiAnalysis = null;
    if (includeAIAnalysis) {
      aiAnalysis = {
        explanation: `Đã sử dụng thuật toán ${getAlgorithmName(algorithm)} để tối ưu ${workOrders.length} lệnh sản xuất. Kết quả cho thấy hiệu suất sử dụng đạt ${scheduleResult.metrics.utilization.toFixed(1)}% và tỷ lệ giao hàng đúng hẹn dự kiến ${scheduleResult.metrics.onTimeDelivery.toFixed(1)}%.`,
        predictedBottlenecks: [
          {
            workCenterId: 'wc-2',
            workCenterName: 'Dây chuyền 2',
            risk: 'high',
            description: 'Dự kiến quá tải vào tuần 3',
          },
        ],
        suggestedImprovements: [
          {
            id: 'imp-1',
            title: 'Cân bằng tải',
            description: 'Di chuyển một số WO từ Dây chuyền 2 sang Dây chuyền 3',
            impact: 'Giảm 15% tải cho Dây chuyền 2',
          },
        ],
      };
    }

    return NextResponse.json({
      success: true,
      schedule: scheduleResult,
      analysis: aiAnalysis,
      summary: {
        totalWorkOrders: scheduleResult.workOrdersScheduled,
        totalConflicts: scheduleResult.conflicts.length,
        criticalConflicts: 0,
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
}

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

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workOrderId = searchParams.get('workOrderId');

    // Generate mock work orders
    const workOrders = generateMockWorkOrders(20);

    if (workOrderId) {
      // Get specific work order
      const workOrder = workOrders.find((wo) => wo.id === workOrderId);

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
}
