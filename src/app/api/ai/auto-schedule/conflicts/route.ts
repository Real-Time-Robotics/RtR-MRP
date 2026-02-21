// =============================================================================
// AUTO-SCHEDULE CONFLICTS API - Detect and resolve conflicts
// GET: Detect conflicts, POST: Resolve conflicts
// =============================================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
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
// CONFLICT TYPES
// =============================================================================

interface DetectedConflict {
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

// =============================================================================
// CONFLICT DETECTION LOGIC
// =============================================================================

/**
 * Detect time-range overlaps among scheduled operations on the same work center.
 * Two operations conflict when: op1.scheduledStart < op2.scheduledEnd AND op2.scheduledStart < op1.scheduledEnd
 */
async function detectOverlapConflicts(workCenterId?: string | null): Promise<DetectedConflict[]> {
  const conflicts: DetectedConflict[] = [];

  const whereClause: Record<string, unknown> = {
    status: { not: 'completed' },
  };
  if (workCenterId) {
    whereClause.workCenterId = workCenterId;
  }

  const operations = await prisma.scheduledOperation.findMany({
    where: whereClause,
    include: {
      workCenter: { select: { id: true, code: true, name: true } },
      workOrderOperation: {
        select: {
          id: true,
          workOrderId: true,
          name: true,
          workOrder: { select: { id: true, woNumber: true } },
        },
      },
    },
    orderBy: [{ workCenterId: 'asc' }, { scheduledStart: 'asc' }],
  });

  // Group operations by work center
  const byWorkCenter = new Map<string, typeof operations>();
  for (const op of operations) {
    const wcId = op.workCenterId;
    if (!byWorkCenter.has(wcId)) {
      byWorkCenter.set(wcId, []);
    }
    byWorkCenter.get(wcId)!.push(op);
  }

  // Compare pairs within each work center for overlaps
  for (const [wcId, wcOps] of byWorkCenter) {
    for (let i = 0; i < wcOps.length; i++) {
      for (let j = i + 1; j < wcOps.length; j++) {
        const opA = wcOps[i];
        const opB = wcOps[j];

        const aStart = opA.scheduledStart.getTime();
        const aEnd = opA.scheduledEnd.getTime();
        const bStart = opB.scheduledStart.getTime();
        const bEnd = opB.scheduledEnd.getTime();

        if (aStart < bEnd && bStart < aEnd) {
          const overlapMs = Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
          const overlapHours = overlapMs / (1000 * 60 * 60);
          const wcName = opA.workCenter.name;

          const woA = opA.workOrderOperation.workOrder;
          const woB = opB.workOrderOperation.workOrder;

          const severity: ConflictSeverity =
            overlapHours > 8 ? 'critical' : overlapHours > 4 ? 'high' : 'medium';

          conflicts.push({
            id: `overlap-${opA.id}-${opB.id}`,
            type: 'overlap',
            severity,
            description: `${woA.woNumber} va ${woB.woNumber} chong cheo ${overlapHours.toFixed(1)} gio tren ${wcName}`,
            affectedWorkOrders: [
              {
                id: woA.id,
                workOrderNumber: woA.woNumber,
                workCenterId: wcId,
                workCenterName: wcName,
              },
              {
                id: woB.id,
                workOrderNumber: woB.woNumber,
                workCenterId: wcId,
                workCenterName: wcName,
              },
            ],
            suggestedResolutions: [
              {
                id: `res-move-${opB.id}`,
                description: `Doi ${woB.woNumber} bat dau sau ${woA.woNumber}`,
                impact: `Tre ${Math.ceil(overlapHours / 8)} ngay`,
                autoResolvable: true,
              },
              {
                id: `res-reassign-${opB.id}`,
                description: `Chuyen ${woB.woNumber} sang may khac`,
                impact: 'Khong anh huong deadline neu may trong',
                autoResolvable: true,
              },
            ],
            createdAt: new Date(),
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Detect capacity overloads by comparing scheduledHours vs availableHours
 * from CapacityRecord entries.
 */
async function detectCapacityOverloads(workCenterId?: string | null): Promise<DetectedConflict[]> {
  const conflicts: DetectedConflict[] = [];

  const whereClause: Record<string, unknown> = {
    scheduledHours: { gt: 0 },
  };
  if (workCenterId) {
    whereClause.workCenterId = workCenterId;
  }

  const overloadedRecords = await prisma.capacityRecord.findMany({
    where: whereClause,
    include: {
      workCenter: { select: { id: true, code: true, name: true } },
    },
    orderBy: [{ workCenterId: 'asc' }, { date: 'asc' }],
  });

  // Filter to records where scheduledHours exceeds availableHours
  const overloads = overloadedRecords.filter(
    (record) => record.scheduledHours > record.availableHours && record.availableHours > 0
  );

  // Group consecutive overload days by work center for consolidated reporting
  const byWorkCenter = new Map<string, typeof overloads>();
  for (const record of overloads) {
    const wcId = record.workCenterId;
    if (!byWorkCenter.has(wcId)) {
      byWorkCenter.set(wcId, []);
    }
    byWorkCenter.get(wcId)!.push(record);
  }

  for (const [wcId, records] of byWorkCenter) {
    const wcName = records[0].workCenter.name;

    // Find the scheduled operations on those overloaded dates to identify affected work orders
    const overloadDates = records.map((r) => r.date);
    const earliestDate = new Date(Math.min(...overloadDates.map((d) => d.getTime())));
    const latestDate = new Date(Math.max(...overloadDates.map((d) => d.getTime())));

    const affectedOps = await prisma.scheduledOperation.findMany({
      where: {
        workCenterId: wcId,
        status: { not: 'completed' },
        scheduledStart: { lte: latestDate },
        scheduledEnd: { gte: earliestDate },
      },
      include: {
        workOrderOperation: {
          select: {
            workOrder: { select: { id: true, woNumber: true } },
          },
        },
      },
    });

    // Deduplicate affected work orders
    const seenWoIds = new Set<string>();
    const affectedWorkOrders: DetectedConflict['affectedWorkOrders'] = [];
    for (const op of affectedOps) {
      const wo = op.workOrderOperation.workOrder;
      if (!seenWoIds.has(wo.id)) {
        seenWoIds.add(wo.id);
        affectedWorkOrders.push({
          id: wo.id,
          workOrderNumber: wo.woNumber,
          workCenterId: wcId,
          workCenterName: wcName,
        });
      }
    }

    // Calculate aggregate overload metrics
    const totalOverloadHours = records.reduce(
      (sum, r) => sum + (r.scheduledHours - r.availableHours),
      0
    );
    const avgOverloadPercent =
      records.reduce(
        (sum, r) => sum + ((r.scheduledHours - r.availableHours) / r.availableHours) * 100,
        0
      ) / records.length;

    const severity: ConflictSeverity =
      avgOverloadPercent > 50 ? 'critical' : avgOverloadPercent > 25 ? 'high' : 'medium';

    const dateRange =
      records.length === 1
        ? records[0].date.toLocaleDateString('vi-VN')
        : `${earliestDate.toLocaleDateString('vi-VN')} - ${latestDate.toLocaleDateString('vi-VN')}`;

    conflicts.push({
      id: `overload-${wcId}-${earliestDate.getTime()}`,
      type: 'overload',
      severity,
      description: `${wcName} vuot ${avgOverloadPercent.toFixed(0)}% cong suat (${totalOverloadHours.toFixed(1)}h) trong ${records.length} ngay (${dateRange})`,
      affectedWorkOrders,
      suggestedResolutions: [
        {
          id: `res-redistribute-${wcId}`,
          description: `Phan bo lai cong viec sang may khac`,
          impact: `Giam tai ${avgOverloadPercent.toFixed(0)}%`,
          autoResolvable: true,
        },
        {
          id: `res-overtime-${wcId}`,
          description: `Them ${totalOverloadHours.toFixed(1)} gio lam them`,
          impact: `Tang chi phi lam them`,
          autoResolvable: false,
        },
      ],
      createdAt: new Date(),
    });
  }

  return conflicts;
}

/**
 * Run all conflict detection queries and return a combined list.
 */
async function detectAllConflicts(workCenterId?: string | null): Promise<DetectedConflict[]> {
  const [overlaps, overloads] = await Promise.all([
    detectOverlapConflicts(workCenterId),
    detectCapacityOverloads(workCenterId),
  ]);

  return [...overlaps, ...overloads];
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

    // Detect real conflicts from the database
    let conflicts = await detectAllConflicts(workCenterId);

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

    // Detect all current conflicts from the database
    const allConflicts = await detectAllConflicts();

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
