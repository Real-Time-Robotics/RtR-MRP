// Mobile API - Parts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const partNumber = searchParams.get("sku") || searchParams.get("partNumber");
    const id = searchParams.get("id");
    const limit = parseInt(searchParams.get("limit") || "100");

    // Get single part by ID or part number
    if (id || partNumber) {
      const part = await prisma.part.findFirst({
        where: id ? { id } : { partNumber: partNumber! },
        include: {
          inventory: {
            include: {
              warehouse: true,
            },
          },
        },
      });

      if (!part) {
        return NextResponse.json({ error: "Part not found" }, { status: 404 });
      }

      // Calculate totals
      const onHand = part.inventory.reduce((sum, item) => sum + item.quantity, 0);
      const allocated = part.inventory.reduce((sum, item) => sum + item.reservedQty, 0);

      return NextResponse.json({
        part: {
          id: part.id,
          sku: part.partNumber,
          name: part.name,
          description: part.description,
          category: part.category,
          uom: part.unit,
          safetyStock: part.safetyStock,
          reorderPoint: part.reorderPoint,
          onHand,
          allocated,
          available: onHand - allocated,
          locations: part.inventory.map((item) => ({
            id: item.warehouseId,
            code: item.warehouse.code,
            name: item.warehouse.name,
            quantity: item.quantity,
            reserved: item.reservedQty,
            lotNumber: item.lotNumber,
          })),
        },
      });
    }

    // Search parts
    const where = query
      ? {
          OR: [
            { partNumber: { contains: query, mode: "insensitive" as const } },
            { name: { contains: query, mode: "insensitive" as const } },
            { description: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {};

    const parts = await prisma.part.findMany({
      where,
      take: limit,
      orderBy: { partNumber: "asc" },
    });

    return NextResponse.json({
      parts: parts.map((part) => ({
        id: part.id,
        sku: part.partNumber,
        name: part.name,
        description: part.description,
        category: part.category,
        uom: part.unit,
        safetyStock: part.safetyStock,
        reorderPoint: part.reorderPoint,
      })),
    });
  } catch (error) {
    console.error("Mobile parts API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch parts" },
      { status: 500 }
    );
  }
}
