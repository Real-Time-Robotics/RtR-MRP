import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { BomType } from "@prisma/client";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get all lines for a BOM
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const lines = await prisma.bomLine.findMany({
      where: { bomId: id },
      include: {
        part: true,
      },
      orderBy: [
        { moduleCode: "asc" },
        { sequence: "asc" },
        { lineNumber: "asc" },
      ],
    });

    return NextResponse.json(lines);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/bom/[id]/lines' });
    return NextResponse.json(
      { error: "Failed to fetch BOM lines" },
      { status: 500 }
    );
  }
}

// POST - Add new line to BOM
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    // Verify BOM header exists
    const bomHeader = await prisma.bomHeader.findUnique({
      where: { id },
    });

    if (!bomHeader) {
      return NextResponse.json(
        { error: "BOM header not found" },
        { status: 404 }
      );
    }

    // Get next line number
    const lastLine = await prisma.bomLine.findFirst({
      where: { bomId: id },
      orderBy: { lineNumber: "desc" },
    });
    const nextLineNumber = (lastLine?.lineNumber || 0) + 10;

    const line = await prisma.bomLine.create({
      data: {
        id: data.id || `LINE-${Date.now()}`,
        bomId: id,
        partId: data.partId,
        quantity: data.quantity,
        unit: data.unit || "EA",
        lineNumber: data.lineNumber || nextLineNumber,
        moduleCode: data.moduleCode,
        moduleName: data.moduleName,
        isCritical: data.isCritical ?? false,
        notes: data.notes,

        // New fields from Parts Enhancement v2.0
        findNumber: data.findNumber,
        referenceDesignator: data.referenceDesignator,

        // Position
        positionX: data.positionX,
        positionY: data.positionY,
        positionZ: data.positionZ,

        // Manufacturing - scrapRate is decimal (0.02 = 2%), scrapPercent is percentage (2 = 2%)
        scrapRate: data.scrapPercent ? data.scrapPercent / 100 : (data.scrapRate ?? 0),
        scrapPercent: data.scrapPercent ?? (data.scrapRate ? data.scrapRate * 100 : 0),
        operationSeq: data.operationSeq,

        // Effectivity & Revision
        revision: data.revision || "A",
        effectivityDate: data.effectivityDate
          ? new Date(data.effectivityDate)
          : null,
        obsoleteDate: data.obsoleteDate ? new Date(data.obsoleteDate) : null,

        // Alternates
        alternateGroup: data.alternateGroup,
        isPrimary: data.isPrimary ?? true,

        // BOM Type & Structure
        bomType: data.bomType || "MANUFACTURING",
        subAssembly: data.subAssembly ?? false,
        phantom: data.phantom ?? false,

        // Costing
        extendedCost: data.extendedCost,

        // Sequence
        sequence: data.sequence ?? 0,
      },
      include: {
        part: true,
      },
    });

    return NextResponse.json(line, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/bom/[id]/lines' });
    return NextResponse.json(
      { error: "Failed to create BOM line" },
      { status: 500 }
    );
  }
}

// PUT - Update multiple lines (batch update)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    if (!Array.isArray(data.lines)) {
      return NextResponse.json(
        { error: "lines array is required" },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      data.lines.map(async (lineData: any) => {
        return prisma.bomLine.update({
          where: { id: lineData.id as string },
          data: {
            quantity: lineData.quantity as number,
            unit: lineData.unit as string,
            lineNumber: lineData.lineNumber as number,
            moduleCode: lineData.moduleCode as string,
            moduleName: lineData.moduleName as string,
            isCritical: lineData.isCritical as boolean,
            notes: lineData.notes as string,
            findNumber: lineData.findNumber as number,
            referenceDesignator: lineData.referenceDesignator as string,
            positionX: lineData.positionX as number,
            positionY: lineData.positionY as number,
            positionZ: lineData.positionZ as number,
            // Sync both scrap fields - scrapRate is decimal, scrapPercent is percentage
            scrapRate: lineData.scrapPercent ? (lineData.scrapPercent as number) / 100 : (lineData.scrapRate as number ?? 0),
            scrapPercent: lineData.scrapPercent as number ?? ((lineData.scrapRate as number ?? 0) * 100),
            operationSeq: lineData.operationSeq as number,
            revision: lineData.revision as string,
            alternateGroup: lineData.alternateGroup as string,
            isPrimary: lineData.isPrimary as boolean,
            bomType: lineData.bomType as BomType,
            subAssembly: lineData.subAssembly as boolean,
            phantom: lineData.phantom as boolean,
            extendedCost: lineData.extendedCost as number,
            sequence: lineData.sequence as number,
          },
        });
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/bom/[id]/lines' });
    return NextResponse.json(
      { error: "Failed to update BOM lines" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a line from BOM (by line ID in body)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    if (!data.lineId) {
      return NextResponse.json(
        { error: "lineId is required" },
        { status: 400 }
      );
    }

    await prisma.bomLine.delete({
      where: { id: data.lineId },
    });

    return NextResponse.json({ message: "Line deleted successfully" });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/bom/[id]/lines' });
    return NextResponse.json(
      { error: "Failed to delete BOM line" },
      { status: 500 }
    );
  }
}
