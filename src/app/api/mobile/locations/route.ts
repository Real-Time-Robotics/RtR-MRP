// Mobile API - Locations (Warehouses)
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
    const code = searchParams.get("code");
    const id = searchParams.get("id");
    const limit = parseInt(searchParams.get("limit") || "100");

    // Get single warehouse by ID or code
    if (id || code) {
      const warehouse = await prisma.warehouse.findFirst({
        where: id ? { id } : { code: code! },
        include: {
          inventory: {
            include: {
              part: true,
            },
          },
        },
      });

      if (!warehouse) {
        return NextResponse.json({ error: "Location not found" }, { status: 404 });
      }

      return NextResponse.json({
        location: {
          id: warehouse.id,
          code: warehouse.code,
          name: warehouse.name,
          type: warehouse.type,
          status: warehouse.status,
          address: warehouse.location,
          items: warehouse.inventory.map((item) => ({
            partId: item.partId,
            partSku: item.part.partNumber,
            partName: item.part.name,
            quantity: item.quantity,
            reserved: item.reservedQty,
            available: item.quantity - item.reservedQty,
            uom: item.part.unit,
            lotNumber: item.lotNumber,
          })),
        },
      });
    }

    // Search/list warehouses
    const where: Record<string, unknown> = { status: "active" };

    if (query) {
      where.OR = [
        { code: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
      ];
    }

    const warehouses = await prisma.warehouse.findMany({
      where,
      take: limit,
      orderBy: { code: "asc" },
    });

    return NextResponse.json({
      locations: warehouses.map((wh) => ({
        id: wh.id,
        code: wh.code,
        name: wh.name,
        type: wh.type,
        status: wh.status,
        address: wh.location,
      })),
    });
  } catch (error) {
    console.error("Mobile locations API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}
