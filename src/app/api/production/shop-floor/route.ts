import { NextRequest } from 'next/server';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getWorkCenterUtilization } from "@/lib/production/capacity-engine";

import { checkReadEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const workCenters = await prisma.workCenter.findMany({
      where: { status: "active" },
      include: {
        scheduledOps: {
          where: {
            status: { in: ["scheduled", "in_progress"] },
            scheduledStart: { lte: new Date() },
            scheduledEnd: { gte: new Date() },
          },
          include: {
            workOrderOperation: {
              include: { workOrder: true },
            },
          },
          take: 1,
        },
        downtimeRecords: {
          where: { endTime: null },
          take: 1,
        },
      },
    });

    const now = new Date();
    const wcStatus = await Promise.all(
      workCenters.map(async (wc) => {
        const utilization = await getWorkCenterUtilization(wc.id, now);
        const currentOp = wc.scheduledOps[0];
        const activeDowntime = wc.downtimeRecords[0];

        let status = "idle";
        let currentJob = null;

        if (activeDowntime) {
          status = "down";
        } else if (currentOp) {
          status = "running";
          currentJob = {
            woNumber: currentOp.workOrderOperation.workOrder.woNumber,
            operationName: currentOp.workOrderOperation.name,
            scheduledStart: currentOp.scheduledStart,
            scheduledEnd: currentOp.scheduledEnd,
            progress: Math.round(
              ((now.getTime() - currentOp.scheduledStart.getTime()) /
                (currentOp.scheduledEnd.getTime() -
                  currentOp.scheduledStart.getTime())) *
                100
            ),
          };
        }

        return {
          id: wc.id,
          code: wc.code,
          name: wc.name,
          type: wc.type,
          status,
          currentJob,
          downtime: activeDowntime
            ? {
                reason: activeDowntime.reason,
                type: activeDowntime.type,
                startTime: activeDowntime.startTime,
              }
            : null,
          utilization: utilization.utilization,
          queueCount: utilization.jobs.length,
        };
      })
    );

    // Get today's metrics
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const completedOps = await prisma.workOrderOperation.count({
      where: {
        status: "completed",
        actualEndDate: { gte: startOfDay, lte: endOfDay },
      },
    });

    const inProgressOps = await prisma.workOrderOperation.count({
      where: { status: "in_progress" },
    });

    const pendingOps = await prisma.workOrderOperation.count({
      where: { status: { in: ["pending", "scheduled", "ready"] } },
    });

    const totalUnits = await prisma.workOrderOperation.aggregate({
      where: {
        status: "completed",
        actualEndDate: { gte: startOfDay, lte: endOfDay },
      },
      _sum: { quantityCompleted: true },
    });

    const scrapUnits = await prisma.workOrderOperation.aggregate({
      where: {
        actualEndDate: { gte: startOfDay, lte: endOfDay },
      },
      _sum: { quantityScrapped: true },
    });

    return NextResponse.json({
      workCenters: wcStatus,
      metrics: {
        completedOps,
        inProgressOps,
        pendingOps,
        totalUnits: totalUnits._sum.quantityCompleted || 0,
        scrapUnits: scrapUnits._sum.quantityScrapped || 0,
        scrapRate:
          totalUnits._sum.quantityCompleted && totalUnits._sum.quantityCompleted > 0
            ? ((scrapUnits._sum.quantityScrapped || 0) /
                totalUnits._sum.quantityCompleted) *
              100
            : 0,
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/production/shop-floor' });
    return NextResponse.json(
      { error: "Failed to fetch shop floor data" },
      { status: 500 }
    );
  }
});
