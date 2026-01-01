// src/app/api/cache/stats/route.ts
// Cache statistics and management endpoint

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cache } from "@/lib/cache/redis";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = cache.getStats();

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Cache stats error:", error);
    return NextResponse.json(
      { error: "Failed to get cache stats" },
      { status: 500 }
    );
  }
}

// POST - Clear cache (admin only)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, pattern } = body;

    if (action === "clear") {
      if (pattern) {
        await cache.deletePattern(pattern);
      } else {
        await cache.deletePattern("mrp:*");
      }
      cache.resetStats();
      return NextResponse.json({ success: true, message: "Cache cleared" });
    }

    if (action === "resetStats") {
      cache.resetStats();
      return NextResponse.json({ success: true, message: "Stats reset" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Cache management error:", error);
    return NextResponse.json(
      { error: "Failed to manage cache" },
      { status: 500 }
    );
  }
}
