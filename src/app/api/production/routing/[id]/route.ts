import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  activateRouting,
  validateRouting,
  copyRouting,
} from "@/lib/production/routing-engine";
import { z } from "zod";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';
const RoutingUpdateSchema = z.object({
  name: z.string().min(1, "Routing name is required").optional(),
  description: z.string().optional().nullable(),
});

const RoutingActionSchema = z.object({
  action: z.enum(["activate", "copy", "validate"]),
});

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

    const routing = await prisma.routing.findUnique({
      where: { id },
      include: {
        product: true,
        operations: {
          orderBy: { operationNumber: "asc" },
          include: { workCenter: true },
        },
      },
    });

    if (!routing) {
      return NextResponse.json({ error: "Routing not found" }, { status: 404 });
    }

    return NextResponse.json(routing);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/production/routing/[id]' });
    return NextResponse.json(
      { error: "Failed to fetch routing" },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;
    const body = await request.json();

    const validation = RoutingUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const routing = await prisma.routing.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
      },
    });

    return NextResponse.json(routing);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/production/routing/[id]' });
    return NextResponse.json(
      { error: "Failed to update routing" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;
    const body = await request.json();

    const actionValidation = RoutingActionSchema.safeParse(body);
    if (!actionValidation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: actionValidation.error.issues },
        { status: 400 }
      );
    }

    const { action } = actionValidation.data;

    switch (action) {
      case "activate": {
        const validation = await validateRouting(id);
        if (!validation.valid) {
          return NextResponse.json(
            { error: "Routing validation failed", errors: validation.errors },
            { status: 400 }
          );
        }
        await activateRouting(id);
        return NextResponse.json({ success: true });
      }

      case "copy": {
        const newId = await copyRouting(id);
        return NextResponse.json({ id: newId });
      }

      case "validate": {
        const result = await validateRouting(id);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/production/routing/[id]' });
    return NextResponse.json(
      { error: "Failed to perform routing action" },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

    await prisma.routing.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/production/routing/[id]' });
    return NextResponse.json(
      { error: "Failed to delete routing" },
      { status: 500 }
    );
  }
});
