import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50") || 50, 100);
    const type = searchParams.get("type");
    const days = Math.min(parseInt(searchParams.get("days") || "7") || 7, 90);

    const since = new Date();
    since.setDate(since.getDate() - days);

    const activities = await prisma.activityLog.findMany({
      where: {
        userId: session.user.id,
        createdAt: { gte: since },
        ...(type && type !== "all" ? { type } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ activities });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/activity' });
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
