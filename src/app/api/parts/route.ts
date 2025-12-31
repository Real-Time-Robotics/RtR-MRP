import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - List all parts with full details
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const lifecycleStatus = searchParams.get("lifecycleStatus");
    const makeOrBuy = searchParams.get("makeOrBuy");
    const ndaaCompliant = searchParams.get("ndaaCompliant");
    const search = searchParams.get("search");
    const includeRelations = searchParams.get("includeRelations") === "true";

    const where: Record<string, unknown> = {};

    if (category) where.category = category;
    if (lifecycleStatus) where.lifecycleStatus = lifecycleStatus;
    if (makeOrBuy) where.makeOrBuy = makeOrBuy;
    if (ndaaCompliant !== null && ndaaCompliant !== "") {
      where.ndaaCompliant = ndaaCompliant === "true";
    }
    if (search) {
      where.OR = [
        { partNumber: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { manufacturerPn: { contains: search, mode: "insensitive" } },
        { manufacturer: { contains: search, mode: "insensitive" } },
      ];
    }

    const parts = await prisma.part.findMany({
      where,
      include: includeRelations
        ? {
            partSuppliers: {
              include: { supplier: true },
              orderBy: { isPreferred: "desc" },
            },
            partAlternates: {
              include: { alternatePart: true },
              where: { approved: true },
            },
            partDocuments: true,
            partCertifications: {
              where: {
                OR: [
                  { expiryDate: null },
                  { expiryDate: { gte: new Date() } },
                ],
              },
            },
          }
        : {
            partSuppliers: {
              include: { supplier: true },
              orderBy: { isPreferred: "desc" },
              take: 1,
            },
          },
      orderBy: { partNumber: "asc" },
    });

    return NextResponse.json(parts);
  } catch (error) {
    console.error("Failed to fetch parts:", error);
    return NextResponse.json(
      { error: "Failed to fetch parts" },
      { status: 500 }
    );
  }
}

// POST - Create a new part
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    // Generate ID if not provided
    const id = data.id || `PRT-${Date.now()}`;

    const part = await prisma.part.create({
      data: {
        id,
        partNumber: data.partNumber,
        name: data.name,
        description: data.description,
        category: data.category,
        unit: data.unit || "EA",
        unitCost: data.unitCost || 0,

        // Physical Specifications
        weightKg: data.weightKg,
        lengthMm: data.lengthMm,
        widthMm: data.widthMm,
        heightMm: data.heightMm,
        volumeCm3: data.volumeCm3,
        color: data.color,
        material: data.material,

        // Procurement & Sourcing
        makeOrBuy: data.makeOrBuy || "BUY",
        procurementType: data.procurementType || "STOCK",
        buyerCode: data.buyerCode,
        moq: data.moq || 1,
        orderMultiple: data.orderMultiple || 1,
        standardPack: data.standardPack || 1,
        leadTimeDays: data.leadTimeDays || 0,

        // Inventory Planning
        minStockLevel: data.minStockLevel || 0,
        reorderPoint: data.reorderPoint || 0,
        maxStock: data.maxStock,
        safetyStock: data.safetyStock || 0,
        isCritical: data.isCritical || false,

        // Compliance & Origin
        countryOfOrigin: data.countryOfOrigin,
        hsCode: data.hsCode,
        eccn: data.eccn,
        ndaaCompliant: data.ndaaCompliant ?? true,
        itarControlled: data.itarControlled ?? false,

        // Quality & Traceability
        lotControl: data.lotControl ?? false,
        serialControl: data.serialControl ?? false,
        shelfLifeDays: data.shelfLifeDays,
        inspectionRequired: data.inspectionRequired ?? true,
        inspectionPlan: data.inspectionPlan,
        aqlLevel: data.aqlLevel,
        certificateRequired: data.certificateRequired ?? false,
        rohsCompliant: data.rohsCompliant ?? true,
        reachCompliant: data.reachCompliant ?? true,

        // Engineering & Documents
        revision: data.revision || "A",
        revisionDate: data.revisionDate ? new Date(data.revisionDate) : null,
        drawingNumber: data.drawingNumber,
        drawingUrl: data.drawingUrl,
        datasheetUrl: data.datasheetUrl,
        specDocument: data.specDocument,
        manufacturerPn: data.manufacturerPn,
        manufacturer: data.manufacturer,
        lifecycleStatus: data.lifecycleStatus || "ACTIVE",
        effectivityDate: data.effectivityDate
          ? new Date(data.effectivityDate)
          : null,
        obsoleteDate: data.obsoleteDate ? new Date(data.obsoleteDate) : null,

        // Enhanced Costing
        standardCost: data.standardCost,
        averageCost: data.averageCost,
        landedCost: data.landedCost,
        freightPercent: data.freightPercent,
        dutyPercent: data.dutyPercent,
        overheadPercent: data.overheadPercent,

        // Price Breaks
        priceBreakQty1: data.priceBreakQty1,
        priceBreakCost1: data.priceBreakCost1,
        priceBreakQty2: data.priceBreakQty2,
        priceBreakCost2: data.priceBreakCost2,
        priceBreakQty3: data.priceBreakQty3,
        priceBreakCost3: data.priceBreakCost3,

        // Additional
        subCategory: data.subCategory,
        partType: data.partType,
        tags: data.tags || [],
        createdBy: session.user?.email || "system",
      },
      include: {
        partSuppliers: {
          include: { supplier: true },
        },
      },
    });

    return NextResponse.json(part, { status: 201 });
  } catch (error) {
    console.error("Failed to create part:", error);
    return NextResponse.json(
      { error: "Failed to create part" },
      { status: 500 }
    );
  }
}
