import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { parsePaginationParams } from "@/lib/pagination";
import { z } from "zod";

// Validation schema for creating a product
const ProductCreateSchema = z.object({
  sku: z.string().min(1, "SKU là bắt buộc").max(50),
  name: z.string().min(1, "Tên sản phẩm là bắt buộc").max(200),
  description: z.string().max(1000).optional().nullable(),
  basePrice: z.number().min(0).optional().nullable(),
  assemblyHours: z.number().min(0).optional().nullable(),
  testingHours: z.number().min(0).optional().nullable(),
  status: z.enum(["active", "inactive", "discontinued"]).default("active"),
  defaultWorkCenterId: z.string().optional().nullable(),
});

// GET - List all products
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { page, pageSize } = parsePaginationParams(request);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");

    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { sku: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          sku: true,
          name: true,
          description: true,
          basePrice: true,
          assemblyHours: true,
          testingHours: true,
          status: true,
          createdAt: true,
          defaultWorkCenter: {
            select: { id: true, name: true },
          },
          _count: {
            select: { bomHeaders: true },
          },
        },
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      data: products,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/products' });
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST - Create new product
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validationResult = ProductCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if SKU already exists
    const existingProduct = await prisma.product.findUnique({
      where: { sku: data.sku },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: `SKU ${data.sku} đã tồn tại` },
        { status: 400 }
      );
    }

    // Validate work center if provided
    if (data.defaultWorkCenterId) {
      const workCenter = await prisma.workCenter.findUnique({
        where: { id: data.defaultWorkCenterId },
      });
      if (!workCenter) {
        return NextResponse.json(
          { error: "Work center không tồn tại" },
          { status: 400 }
        );
      }
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        description: data.description || null,
        basePrice: data.basePrice || null,
        assemblyHours: data.assemblyHours || null,
        testingHours: data.testingHours || null,
        status: data.status,
        defaultWorkCenterId: data.defaultWorkCenterId || null,
      },
      include: {
        defaultWorkCenter: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/products' });
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
