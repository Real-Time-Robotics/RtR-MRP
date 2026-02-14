import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";

const ProductUpdateSchema = z.object({
  sku: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  basePrice: z.number().min(0).optional().nullable(),
  assemblyHours: z.number().min(0).optional().nullable(),
  testingHours: z.number().min(0).optional().nullable(),
  status: z.enum(["active", "inactive", "discontinued"]).optional(),
  defaultWorkCenterId: z.string().optional().nullable(),
});

// GET - Get single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        defaultWorkCenter: { select: { id: true, name: true } },
        _count: { select: { bomHeaders: true } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/products/[id]' });
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

// PUT - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const validationResult = ProductUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check product exists
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check SKU uniqueness if changing
    if (data.sku && data.sku !== existing.sku) {
      const skuConflict = await prisma.product.findUnique({ where: { sku: data.sku } });
      if (skuConflict) {
        return NextResponse.json({ error: `SKU ${data.sku} đã tồn tại` }, { status: 400 });
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.assemblyHours !== undefined && { assemblyHours: data.assemblyHours }),
        ...(data.testingHours !== undefined && { testingHours: data.testingHours }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.defaultWorkCenterId !== undefined && { defaultWorkCenterId: data.defaultWorkCenterId }),
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/products/[id]' });
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}
