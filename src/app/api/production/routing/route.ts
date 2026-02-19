import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  generateRoutingNumber,
  calculateRoutingTotals,
} from "@/lib/production/routing-engine";
import { z } from "zod";
import {
  parsePaginationParams,
  buildOffsetPaginationQuery,
  buildPaginatedResponse,
  paginatedSuccess,
  paginatedError,
} from "@/lib/pagination";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';
const RoutingOperationSchema = z.object({
  operationNumber: z.number().int().min(1),
  name: z.string().min(1, "Operation name is required"),
  description: z.string().optional().nullable(),
  workCenterId: z.string().min(1, "Work center ID is required"),
  setupTime: z.number().min(0).default(0),
  runTimePerUnit: z.number().min(0),
  waitTime: z.number().min(0).default(0),
  moveTime: z.number().min(0).default(0),
  laborTimePerUnit: z.number().min(0).optional(),
  operatorsRequired: z.number().int().min(1).default(1),
  skillRequired: z.string().optional().nullable(),
  overlapPercent: z.number().min(0).max(100).default(0),
  canRunParallel: z.boolean().default(false),
  inspectionRequired: z.boolean().default(false),
  inspectionPlanId: z.string().optional().nullable(),
  workInstructions: z.string().optional().nullable(),
  toolsRequired: z.unknown().optional(),
});

const RoutingCreateSchema = z.object({
  name: z.string().min(1, "Routing name is required"),
  description: z.string().optional().nullable(),
  productId: z.string().min(1, "Product ID is required"),
  version: z.number().int().min(1).default(1),
  createdBy: z.string().optional(),
  operations: z.array(RoutingOperationSchema).optional(),
});

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();

  try {
    const params = parsePaginationParams(request);
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (productId) where.productId = productId;
    if (status) where.status = status;

    const [totalCount, routings] = await Promise.all([
      prisma.routing.count({ where }),
      prisma.routing.findMany({
        where,
        ...buildOffsetPaginationQuery(params),
        include: {
          product: {
            select: { sku: true, name: true },
          },
          _count: { select: { operations: true } },
        },
        orderBy: params.sortBy
          ? { [params.sortBy]: params.sortOrder }
          : { createdAt: "desc" },
      }),
    ]);

    return paginatedSuccess(
      buildPaginatedResponse(routings, totalCount, params, startTime)
    );
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/production/routing' });
    return paginatedError("Failed to fetch routings", 500);
  }
});

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();

    const validation = RoutingCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const routingNumber = await generateRoutingNumber();

    const routing = await prisma.routing.create({
      data: {
        routingNumber,
        name: data.name,
        description: data.description,
        productId: data.productId,
        version: data.version,
        status: "draft",
        createdBy: data.createdBy || "system",
      },
    });

    // Create operations if provided
    if (data.operations && data.operations.length > 0) {
      for (const op of data.operations) {
        await prisma.routingOperation.create({
          data: {
            routingId: routing.id,
            operationNumber: op.operationNumber,
            name: op.name,
            description: op.description,
            workCenterId: op.workCenterId,
            setupTime: op.setupTime,
            runTimePerUnit: op.runTimePerUnit,
            waitTime: op.waitTime,
            moveTime: op.moveTime,
            laborTimePerUnit: op.laborTimePerUnit,
            operatorsRequired: op.operatorsRequired,
            skillRequired: op.skillRequired,
            overlapPercent: op.overlapPercent,
            canRunParallel: op.canRunParallel,
            inspectionRequired: op.inspectionRequired,
            inspectionPlanId: op.inspectionPlanId,
            workInstructions: op.workInstructions,
            toolsRequired: op.toolsRequired as string[] | undefined,
          },
        });
      }

      // Calculate totals
      const totals = await calculateRoutingTotals(routing.id);
      await prisma.routing.update({
        where: { id: routing.id },
        data: totals,
      });
    }

    return NextResponse.json(routing, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/production/routing' });
    return NextResponse.json(
      { error: "Failed to create routing" },
      { status: 500 }
    );
  }
});
