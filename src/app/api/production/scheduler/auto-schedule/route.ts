import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { autoScheduleAll, scheduleWorkOrder } from "@/lib/production/scheduling-engine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.workOrderId) {
      // Schedule single work order
      const result = await scheduleWorkOrder({
        workOrderId: body.workOrderId,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        priority: body.priority,
      });

      return NextResponse.json(result);
    }

    // Auto-schedule all
    const result = await autoScheduleAll({
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      workCenterIds: body.workCenterIds,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/production/scheduler/auto-schedule' });
    return NextResponse.json(
      { error: "Failed to auto-schedule" },
      { status: 500 }
    );
  }
}
