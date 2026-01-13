import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  parsePaginationParams,
  buildOffsetPaginationQuery,
  buildPaginatedResponse,
  paginatedSuccess,
  paginatedError,
} from "@/lib/pagination";
import { validateQuery, validateBody } from "@/lib/api/validation";
import { PartQuerySchema, PartCreateSchema } from "@/lib/validations";
import { logApi } from "@/lib/audit/audit-logger";

// Allowed filters for parts
const ALLOWED_FILTERS = ["category", "lifecycleStatus", "makeOrBuy"];
const SEARCH_FIELDS = ["partNumber", "name", "description", "manufacturerPn", "manufacturer"];

// GET - List all parts with pagination
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate query params
    const queryResult = validateQuery(PartQuerySchema, request.nextUrl.searchParams);
    if (!queryResult.success) {
      // Log validation error for Gate 5.3 evidence
      logApi(request, 400, session.user?.id, 'Validation error');
      return queryResult.response;
    }
    const { category, lifecycleStatus, makeOrBuy, ndaaCompliant, includeRelations, search } = queryResult.data;

    // Parse pagination params
    const params = parsePaginationParams(request);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (category) where.category = category;
    if (lifecycleStatus) where.lifecycleStatus = lifecycleStatus;
    if (makeOrBuy) where.makeOrBuy = makeOrBuy;
    if (ndaaCompliant) {
      where.ndaaCompliant = ndaaCompliant === "true";
    }
    if (search) {
      where.OR = SEARCH_FIELDS.map(field => ({
        [field]: { contains: search, mode: "insensitive" as const },
      }));
    }

    const shouldIncludeRelations = includeRelations === "true";

    // Get total count and paginated data in parallel
    const [totalCount, parts] = await Promise.all([
      prisma.part.count({ where }),
      prisma.part.findMany({
        where,
        ...buildOffsetPaginationQuery(params),
        orderBy: params.sortBy
          ? { [params.sortBy]: params.sortOrder }
          : { partNumber: "asc" },
        include: shouldIncludeRelations
          ? {
            partSuppliers: {
              include: { supplier: true },
              orderBy: { isPreferred: "desc" },
              take: 3, // Limit suppliers
            },
            partAlternates: {
              include: { alternatePart: true },
              where: { approved: true },
              take: 3, // Limit alternates
            },
            partDocuments: {
              take: 5, // Limit documents
            },
            partCertifications: {
              where: {
                OR: [
                  { expiryDate: null },
                  { expiryDate: { gte: new Date() } },
                ],
              },
              take: 3, // Limit certifications
            },
          }
          : {
            partSuppliers: {
              include: { supplier: true },
              orderBy: { isPreferred: "desc" },
              take: 1,
            },
          },
      }),
    ]);

    return paginatedSuccess(
      buildPaginatedResponse(parts, totalCount, params, startTime)
    );
  } catch (error) {
    console.error("Failed to fetch parts:", error);
    return paginatedError("Failed to fetch parts", 500);
  }
}

// POST - Create a new part
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate request body
    const bodyResult = await validateBody(PartCreateSchema, request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    const data = bodyResult.data;

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
        // unitCost moved to PartCost

        // Move to PartSpecs
        // weightKg, lengthMm, etc.

        // Move to PartPlanning -> separate object/relation
        // makeOrBuy, procurementType, etc.

        // Move to PartCompliance -> separate object/relation
        // hsCode, etc.

        status: "active", // Explicitly set status to avoid legacy issues
        lifecycleStatus: data.lifecycleStatus || "ACTIVE",

        // Revision tracking
        // revision: data.revision || "A", // Likely moved to PartRevision or kept on Part? Schema says kept on Part? Wait, checking schema...
        // Revision tracking
        revision: data.revision || "A",

        tags: data.tags || [],
        createdBy: session.user?.email || "system",

        // Nested Writes
        costs: {
          create: {
            unitCost: data.unitCost || 0,
            standardCost: data.standardCost,
            averageCost: data.averageCost,
            landedCost: data.landedCost,
            freightPercent: data.freightPercent,
            dutyPercent: data.dutyPercent,
            overheadPercent: data.overheadPercent,

            priceBreakQty1: data.priceBreakQty1,
            priceBreakCost1: data.priceBreakCost1,
            priceBreakQty2: data.priceBreakQty2,
            priceBreakCost2: data.priceBreakCost2,
            priceBreakQty3: data.priceBreakQty3,
            priceBreakCost3: data.priceBreakCost3,
          }
        },

        planning: {
          create: {
            minStockLevel: data.minStockLevel || 0,
            reorderPoint: data.reorderPoint || 0,
            maxStock: data.maxStock,
            safetyStock: data.safetyStock || 0,
            leadTimeDays: data.leadTimeDays || 0,
            makeOrBuy: data.makeOrBuy || "BUY",
            procurementType: data.procurementType || "STOCK",
            buyerCode: data.buyerCode,
            moq: data.moq || 1,
            orderMultiple: data.orderMultiple || 1,
            standardPack: data.standardPack || 1,
          }
        },

        specs: {
          create: {
            weightKg: data.weightKg,
            lengthMm: data.lengthMm,
            widthMm: data.widthMm,
            heightMm: data.heightMm,
            volumeCm3: data.volumeCm3,
            color: data.color,
            material: data.material,
            drawingNumber: data.drawingNumber,
            drawingUrl: data.drawingUrl,
            datasheetUrl: data.datasheetUrl,
            specDocument: data.specDocument,
            manufacturerPn: data.manufacturerPn,
            manufacturer: data.manufacturer,
            subCategory: data.subCategory,
            partType: data.partType,
          }
        },

        compliance: {
          create: {
            countryOfOrigin: data.countryOfOrigin,
            hsCode: data.hsCode,
            eccn: data.eccn,
            ndaaCompliant: data.ndaaCompliant ?? true,
            itarControlled: data.itarControlled ?? false,
            lotControl: data.lotControl ?? false,
            serialControl: data.serialControl ?? false,
            shelfLifeDays: data.shelfLifeDays,
            inspectionRequired: data.inspectionRequired ?? true,
            // inspectionPlan: data.inspectionPlan, // Schema doesn't have this on PartCompliance?? Checking...
            // Checking Schema again: PartCompliance lines 283+
            // inspectionRequired Boolean
            // certificateRequired Boolean
            // Schema has 'inspectionPlans InspectionPlan[]' on Part (line 146).

            aqlLevel: data.aqlLevel,
            certificateRequired: data.certificateRequired ?? false,
            rohsCompliant: data.rohsCompliant ?? true,
            reachCompliant: data.reachCompliant ?? true,
          }
        },
      },
      include: {
        costs: true,
        planning: true,
        specs: true,
        compliance: true,
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
