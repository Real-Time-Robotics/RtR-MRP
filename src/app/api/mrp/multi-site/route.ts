import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// GET /api/mrp/multi-site - Get sites and inventory by site
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action") || "sites";
    const siteId = searchParams.get("siteId") || undefined;
    const partId = searchParams.get("partId") || undefined;

    if (action === "sites") {
      const sites = await prisma.site.findMany({
        include: {
          warehouses: true,
          inventorySites: {
            take: 5,
          },
        },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(sites);
    }

    if (action === "inventory") {
      const where: Record<string, unknown> = {};
      if (siteId) where.siteId = siteId;
      if (partId) where.partId = partId;

      const inventory = await prisma.inventorySite.findMany({
        where,
        include: {
          part: true,
          site: true,
        },
        orderBy: [{ siteId: "asc" }, { partId: "asc" }],
        take: 500,
      });
      return NextResponse.json(inventory);
    }

    if (action === "settings") {
      const where: Record<string, unknown> = {};
      if (siteId) where.siteId = siteId;

      const settings = await prisma.planningSettings.findMany({
        where,
      });
      return NextResponse.json(settings);
    }

    return NextResponse.json(
      { error: "Invalid action. Use: sites, inventory, or settings" },
      { status: 400 }
    );
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/mrp/multi-site' });
    return NextResponse.json(
      { error: "Failed to get multi-site data" },
      { status: 500 }
    );
  }
}

// POST /api/mrp/multi-site - Create site or update settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "createSite") {
      const { code, name, address, siteType, isActive } = body;

      if (!code || !name) {
        return NextResponse.json(
          { error: "code and name are required" },
          { status: 400 }
        );
      }

      const site = await prisma.site.create({
        data: {
          code,
          name,
          address,
          siteType: siteType || "WAREHOUSE",
          isActive: isActive ?? true,
        },
      });

      return NextResponse.json({ success: true, site });
    }

    if (action === "updateSettings") {
      const {
        siteId,
        demandTimeFence,
        planningTimeFence,
        frozenZone,
        bucketType,
        rescheduleInDays,
        rescheduleOutDays,
        safetyStockMethod,
        safetyStockDays,
      } = body;

      // Use siteId as unique identifier for settings
      const settings = await prisma.planningSettings.upsert({
        where: {
          siteId: siteId || "global",
        },
        create: {
          siteId: siteId || null,
          demandTimeFence: demandTimeFence || 7,
          planningTimeFence: planningTimeFence || 30,
          frozenZone: frozenZone || 3,
          bucketType: bucketType || "WEEKLY",
          rescheduleInDays: rescheduleInDays || 3,
          rescheduleOutDays: rescheduleOutDays || 5,
          safetyStockMethod: safetyStockMethod || "FIXED",
          safetyStockDays: safetyStockDays || 7,
        },
        update: {
          demandTimeFence,
          planningTimeFence,
          frozenZone,
          bucketType,
          rescheduleInDays,
          rescheduleOutDays,
          safetyStockMethod,
          safetyStockDays,
        },
      });

      return NextResponse.json({ success: true, settings });
    }

    return NextResponse.json(
      { error: "Invalid action. Use: createSite or updateSettings" },
      { status: 400 }
    );
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/mrp/multi-site' });
    return NextResponse.json(
      { error: "Failed to process multi-site action" },
      { status: 500 }
    );
  }
}
