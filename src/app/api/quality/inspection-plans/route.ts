import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateInspectionPlanNumber } from "@/lib/quality/inspection-engine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    const plans = await prisma.inspectionPlan.findMany({
      where: {
        ...(type && { type }),
        ...(status && { status }),
      },
      include: {
        part: { select: { partNumber: true, name: true } },
        product: { select: { sku: true, name: true } },
        supplier: { select: { code: true, name: true } },
        _count: { select: { characteristics: true, inspections: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error("Failed to fetch inspection plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch inspection plans" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const planNumber = await generateInspectionPlanNumber();

    const plan = await prisma.inspectionPlan.create({
      data: {
        planNumber,
        name: body.name,
        description: body.description,
        type: body.type,
        partId: body.partId,
        productId: body.productId,
        supplierId: body.supplierId,
        sampleSize: body.sampleSize,
        sampleMethod: body.sampleMethod,
        createdBy: session.user.id,
        status: "draft",
      },
    });

    // Create characteristics if provided
    if (body.characteristics && body.characteristics.length > 0) {
      await prisma.inspectionCharacteristic.createMany({
        data: body.characteristics.map(
          (char: Record<string, unknown>, index: number) => ({
            planId: plan.id,
            sequence: index + 1,
            name: char.name,
            description: char.description,
            type: char.type,
            specification: char.specification,
            nominalValue: char.nominalValue,
            upperLimit: char.upperLimit,
            lowerLimit: char.lowerLimit,
            unitOfMeasure: char.unitOfMeasure,
            acceptanceCriteria: char.acceptanceCriteria,
            isCritical: char.isCritical || false,
            isMajor: char.isMajor || false,
            gageRequired: char.gageRequired,
          })
        ),
      });
    }

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("Failed to create inspection plan:", error);
    return NextResponse.json(
      { error: "Failed to create inspection plan" },
      { status: 500 }
    );
  }
}
