import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const plan = await prisma.inspectionPlan.findUnique({
      where: { id },
      include: {
        part: { select: { partNumber: true, name: true } },
        product: { select: { sku: true, name: true } },
        supplier: { select: { code: true, name: true } },
        characteristics: {
          orderBy: { sequence: "asc" },
        },
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Inspection plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Failed to fetch inspection plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch inspection plan" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const plan = await prisma.inspectionPlan.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        status: body.status,
        sampleSize: body.sampleSize,
        sampleMethod: body.sampleMethod,
        effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Failed to update inspection plan:", error);
    return NextResponse.json(
      { error: "Failed to update inspection plan" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.inspectionPlan.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete inspection plan:", error);
    return NextResponse.json(
      { error: "Failed to delete inspection plan" },
      { status: 500 }
    );
  }
}
