import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - List alternates for a part
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const alternates = await prisma.partAlternate.findMany({
      where: { partId: id },
      include: {
        alternatePart: true,
      },
      orderBy: { priority: "asc" },
    });

    return NextResponse.json(alternates);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/parts/[id]/alternates' });
    return NextResponse.json(
      { error: "Failed to fetch alternates" },
      { status: 500 }
    );
  }
}

// POST - Add alternate part
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    // Validate alternate part exists
    const alternatePart = await prisma.part.findUnique({
      where: { id: data.alternatePartId },
    });

    if (!alternatePart) {
      return NextResponse.json(
        { error: "Alternate part not found" },
        { status: 404 }
      );
    }

    // Check for existing relationship
    const existing = await prisma.partAlternate.findFirst({
      where: {
        partId: id,
        alternatePartId: data.alternatePartId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Alternate relationship already exists" },
        { status: 409 }
      );
    }

    const alternate = await prisma.partAlternate.create({
      data: {
        id: `ALT-${Date.now()}`,
        partId: id,
        alternatePartId: data.alternatePartId,
        alternateType: data.alternateType || "FORM_FIT_FUNCTION",
        priority: data.priority || 1,
        conversionFactor: data.conversionFactor || 1,
        approved: data.approved ?? true,
        approvedBy: data.approved ? session.user?.email : null,
        approvalDate: data.approved ? new Date() : null,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        notes: data.notes,
      },
      include: {
        alternatePart: true,
      },
    });

    return NextResponse.json(alternate, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/parts/[id]/alternates' });
    return NextResponse.json(
      { error: "Failed to create alternate" },
      { status: 500 }
    );
  }
}
