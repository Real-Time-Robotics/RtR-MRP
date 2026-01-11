import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { runMrpCalculation } from "@/lib/mrp-engine";

// ============================================================================
// MRP API - FIXED: Now runs synchronously (no Redis/BullMQ queue)
// Previously: Created "queued" record → Poll forever → Loading vô hạn
// Now: Runs calculation immediately → Returns "completed" → Works!
// ============================================================================

// In-memory rate limit (simple, no Redis)
const mrpRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkMrpRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = 3600 * 1000; // 1 hour
  const limit = 5;

  const record = mrpRateLimitMap.get(userId);

  if (!record || now > record.resetAt) {
    mrpRateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count };
}

// GET - List MRP runs
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const runs = await prisma.mrpRun.findMany({
      orderBy: { runDate: "desc" },
      take: 20,
      include: {
        _count: {
          select: { suggestions: true },
        },
      },
    });

    return NextResponse.json(runs);
  } catch (error) {
    console.error("MRP API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch MRP runs" },
      { status: 500 }
    );
  }
}

// POST - Run new MRP calculation (Sync - no Redis queue)
export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // In-memory rate limit (no Redis)
  const rateLimit = checkMrpRateLimit(session.user.id || 'anonymous');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many MRP requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const {
      planningHorizonDays = 90,
      includeConfirmed = true,
      includeDraft = false,
      includeSafetyStock = true,
    } = body;

    // Run MRP calculation SYNCHRONOUSLY (no Redis/BullMQ queue)
    // This replaces the old queued approach that caused infinite loading
    console.log("[MRP API] Starting synchronous MRP calculation...");

    const mrpRun = await runMrpCalculation({
      planningHorizonDays,
      includeConfirmed,
      includeDraft,
      includeSafetyStock,
    });

    console.log("[MRP API] MRP calculation completed:", mrpRun.id);

    // Fetch the full run with suggestions count
    const fullRun = await prisma.mrpRun.findUnique({
      where: { id: mrpRun.id },
      include: {
        _count: {
          select: { suggestions: true },
        },
      },
    });

    return NextResponse.json(fullRun);
  } catch (error) {
    console.error("MRP API error:", error);
    return NextResponse.json(
      { error: "Failed to run MRP calculation" },
      { status: 500 }
    );
  }
}
