import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runMrpCalculation } from "@/lib/mrp-engine";
import { auth } from "@/lib/auth";
import { RateLimiter } from "@/lib/rate-limit";

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

// POST - Run new MRP calculation (Async)
export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate Limit: 5 requests per hour per user
  const limitResult = await RateLimiter.check({
    uniqueId: `mrp-run:${session.user.id}`,
    limit: 5,
    windowSeconds: 3600,
  });

  if (!limitResult.success) {
    return NextResponse.json(
      { error: "Too many MRP requests. Please try again later." },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limitResult.limit.toString(),
          'X-RateLimit-Remaining': limitResult.remaining.toString(),
          'X-RateLimit-Reset': limitResult.reset.toString()
        }
      }
    );
  }

  try {
    const body = await request.json();
    const {
      planningHorizonDays = 90,
      includeConfirmed = true,
      includeDraft = false, // Changed from true to false as per instruction
      includeSafetyStock = true,
    } = body;

    // 1. Create the Run record immediately with "queued" status
    const runNumber = `MRP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const mrpRun = await prisma.mrpRun.create({
      data: {
        runNumber,
        planningHorizon: planningHorizonDays,
        status: "queued",
        parameters: {
          planningHorizonDays,
          includeConfirmed,
          includeDraft,
          includeSafetyStock,
        },
        createdBy: session.user?.email, // Track who started it
      },
    });

    // 2. Add to Queue
    // We import dynamically to avoid edge runtime issues if configured elsewhere, 
    // although this is a Node.js runtime route.
    const { addMrpJob } = await import("@/lib/queue/mrp.queue");

    await addMrpJob({
      runId: mrpRun.id,
      planningHorizonDays,
      includeConfirmed,
      includeDraft,
      includeSafetyStock,
      userId: session.user?.id,
    });

    return NextResponse.json(mrpRun);
  } catch (error) {
    console.error("MRP queue error:", error);
    return NextResponse.json(
      { error: "Failed to queue MRP calculation" },
      { status: 500 }
    );
  }
}
