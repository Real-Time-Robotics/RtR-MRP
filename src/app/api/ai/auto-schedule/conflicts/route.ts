// =============================================================================
// AUTO-SCHEDULE CONFLICTS API - Detect and resolve conflicts
// GET: Detect conflicts, POST: Resolve conflicts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { ConflictSeverity, ConflictType } from '@/lib/ai/autonomous/conflict-detector';

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

const resolveConflictsSchema = z.object({
  conflictIds: z.array(z.string()).optional(),
  resolutionIds: z.array(z.string()).optional(),
  autoResolve: z.boolean().optional(),
  applyResolutions: z.boolean().optional(),
});
// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

interface MockConflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  description: string;
  affectedWorkOrders: Array<{
    id: string;
    workOrderNumber: string;
    workCenterId: string;
    workCenterName: string;
  }>;
  suggestedResolutions: Array<{
    id: string;
    description: string;
    impact: string;
    autoResolvable: boolean;
  }>;
  createdAt: Date;
}

function generateMockConflicts(workCenterId?: string | null): MockConflict[] {
  const conflicts: MockConflict[] = [
    {
      id: 'conflict-1',
      type: 'overlap',
      severity: 'critical',
      description: 'WO-2026-0001 và WO-2026-0005 được lên lịch cùng thời điểm trên Dây chuyền 1',
      affectedWorkOrders: [
        { id: 'wo-1', workOrderNumber: 'WO-2026-0001', workCenterId: 'wc-1', workCenterName: 'Dây chuyền 1' },
        { id: 'wo-5', workOrderNumber: 'WO-2026-0005', workCenterId: 'wc-1', workCenterName: 'Dây chuyền 1' },
      ],
      suggestedResolutions: [
        { id: 'res-1', description: 'Di chuyển WO-2026-0005 sang Dây chuyền 2', impact: 'Không ảnh hưởng deadline', autoResolvable: true },
        { id: 'res-2', description: 'Delay WO-2026-0005 thêm 2 ngày', impact: 'Trễ deadline 1 ngày', autoResolvable: true },
      ],
      createdAt: new Date(),
    },
    {
      id: 'conflict-2',
      type: 'overload',
      severity: 'high',
      description: 'Dây chuyền 2 vượt 15% công suất trong tuần 3-4 của tháng 1',
      affectedWorkOrders: [
        { id: 'wo-3', workOrderNumber: 'WO-2026-0003', workCenterId: 'wc-2', workCenterName: 'Dây chuyền 2' },
        { id: 'wo-7', workOrderNumber: 'WO-2026-0007', workCenterId: 'wc-2', workCenterName: 'Dây chuyền 2' },
        { id: 'wo-12', workOrderNumber: 'WO-2026-0012', workCenterId: 'wc-2', workCenterName: 'Dây chuyền 2' },
      ],
      suggestedResolutions: [
        { id: 'res-3', description: 'Phân bổ WO-2026-0012 sang Dây chuyền 3', impact: 'Giảm tải 12%', autoResolvable: true },
        { id: 'res-4', description: 'Thêm ca làm việc ngoài giờ', impact: 'Tăng chi phí 8%', autoResolvable: false },
      ],
      createdAt: new Date(),
    },
    {
      id: 'conflict-3',
      type: 'due_date_risk',
      severity: 'medium',
      description: 'WO-2026-0008 có nguy cơ trễ deadline do phụ thuộc nguyên vật liệu',
      affectedWorkOrders: [
        { id: 'wo-8', workOrderNumber: 'WO-2026-0008', workCenterId: 'wc-3', workCenterName: 'Dây chuyền 3' },
      ],
      suggestedResolutions: [
        { id: 'res-5', description: 'Tăng độ ưu tiên lên khẩn cấp', impact: 'Có thể ảnh hưởng các WO khác', autoResolvable: true },
        { id: 'res-6', description: 'Thương lượng gia hạn với khách hàng', impact: 'Cần phê duyệt', autoResolvable: false },
      ],
      createdAt: new Date(),
    },
    {
      id: 'conflict-4',
      type: 'material_shortage',
      severity: 'low',
      description: 'Nguyên liệu bột mì có thể thiếu hụt nhẹ vào cuối tháng',
      affectedWorkOrders: [
        { id: 'wo-15', workOrderNumber: 'WO-2026-0015', workCenterId: 'wc-1', workCenterName: 'Dây chuyền 1' },
      ],
      suggestedResolutions: [
        { id: 'res-7', description: 'Đặt hàng bổ sung từ nhà cung cấp phụ', impact: 'Tăng chi phí 3%', autoResolvable: false },
      ],
      createdAt: new Date(),
    },
  ];

  // Filter by work center if specified
  if (workCenterId) {
    return conflicts.filter((c) =>
      c.affectedWorkOrders.some((wo) => wo.workCenterId === workCenterId)
    );
  }

  return conflicts;
}

// =============================================================================
// GET: Detect conflicts
// =============================================================================

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { searchParams } = new URL(request.url);
    const workCenterId = searchParams.get('workCenterId');
    const severity = searchParams.get('severity') as ConflictSeverity | null;

    // Get mock conflicts
    let conflicts = generateMockConflicts(workCenterId);

    // Filter by severity if specified
    if (severity) {
      conflicts = conflicts.filter((c) => c.severity === severity);
    }

    // Group by severity
    const bySeverity = conflicts.reduce(
      (acc, c) => {
        acc[c.severity] = (acc[c.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Group by type
    const byType = conflicts.reduce(
      (acc, c) => {
        acc[c.type] = (acc[c.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      success: true,
      conflicts,
      summary: {
        total: conflicts.length,
        bySeverity,
        byType,
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/auto-schedule/conflicts' });
    return NextResponse.json(
      {
        error: 'Không thể phát hiện xung đột',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
});

// =============================================================================
// POST: Resolve conflicts
// =============================================================================

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const rawBody = await request.json();
    const parseResult = resolveConflictsSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const {
      conflictIds,
      resolutionIds,
      autoResolve = false,
      applyResolutions = false,
    } = parseResult.data;

    // Get all conflicts
    const allConflicts = generateMockConflicts();

    // Filter to specified conflicts
    let targetConflicts = allConflicts;
    if (conflictIds && conflictIds.length > 0) {
      targetConflicts = allConflicts.filter((c) => conflictIds.includes(c.id));
    }

    if (targetConflicts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Không tìm thấy xung đột cần giải quyết',
        resolutions: [],
      });
    }

    // Generate resolution results
    const resolutions = targetConflicts.flatMap((conflict) => {
      // Find applicable resolutions
      let applicableResolutions = conflict.suggestedResolutions;

      if (resolutionIds && resolutionIds.length > 0) {
        applicableResolutions = applicableResolutions.filter((r) =>
          resolutionIds.includes(r.id)
        );
      }

      if (autoResolve) {
        // Auto-resolve only picks auto-resolvable options
        applicableResolutions = applicableResolutions.filter((r) => r.autoResolvable);
      }

      return applicableResolutions.slice(0, 1).map((resolution) => ({
        conflictId: conflict.id,
        conflictType: conflict.type,
        resolutionId: resolution.id,
        description: resolution.description,
        impact: resolution.impact,
        applied: applyResolutions,
        appliedAt: applyResolutions ? new Date() : null,
        appliedBy: applyResolutions ? session.user?.name || 'System' : null,
      }));
    });

    return NextResponse.json({
      success: true,
      resolutions,
      applied: applyResolutions,
      summary: {
        conflictsResolved: resolutions.length,
        resolutionsByType: resolutions.reduce(
          (acc, r) => {
            acc[r.conflictType] = (acc[r.conflictType] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/auto-schedule/conflicts' });
    return NextResponse.json(
      {
        error: 'Không thể giải quyết xung đột',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
});
