import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateCAPANumber } from "@/lib/quality/capa-workflow";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const capas = await prisma.cAPA.findMany({
      where: {
        ...(status && status !== "all" ? { status } : {}),
        ...(type && type !== "all" ? { type } : {}),
      },
      include: {
        ncrs: { select: { ncrNumber: true } },
        _count: { select: { actions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(capas);
  } catch (error) {
    console.error("Failed to fetch CAPAs:", error);
    return NextResponse.json({ error: "Failed to fetch CAPAs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const capaNumber = await generateCAPANumber();

    const capa = await prisma.cAPA.create({
      data: {
        capaNumber,
        type: body.type,
        source: body.source,
        sourceReference: body.sourceReference,
        title: body.title,
        description: body.description,
        priority: body.priority || "medium",
        ownerId: body.ownerId || session.user.id,
        targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
        originalTargetDate: body.targetDate ? new Date(body.targetDate) : undefined,
        createdBy: session.user.id,
        status: "open",
      },
    });

    // Link NCRs if provided
    if (body.ncrIds && body.ncrIds.length > 0) {
      await prisma.nCR.updateMany({
        where: { id: { in: body.ncrIds } },
        data: { capaId: capa.id },
      });
    }

    // Log initial history
    await prisma.cAPAHistory.create({
      data: {
        capaId: capa.id,
        action: "CREATED",
        toStatus: "open",
        userId: session.user.id,
      },
    });

    return NextResponse.json(capa, { status: 201 });
  } catch (error) {
    console.error("Failed to create CAPA:", error);
    return NextResponse.json({ error: "Failed to create CAPA" }, { status: 500 });
  }
}
