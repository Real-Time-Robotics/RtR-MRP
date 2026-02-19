import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { logger } from "@/lib/logger";
import { z } from "zod";

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
const planningSchema = z.object({
    safetyStock: z.number().optional(),
    minStockLevel: z.number().optional(),
    reorderPoint: z.number().optional(),
    leadTimeDays: z.number().optional(),
    makeOrBuy: z.enum(["MAKE", "BUY"]).optional(),
});

export const PATCH = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

    try {
        const { id: partId } = await context.params;
        const body = await request.json();
        const validatedData = planningSchema.parse(body);

        // Upsert because planning record might not exist for legacy parts
        const planning = await prisma.partPlanning.upsert({
            where: { partId },
            create: {
                partId,
                ...validatedData as Partial<typeof validatedData>, // Spread validated partial data for create
                // Actually for Create, we should provide defaults if they are missing in body.
                // ValidatedData is partial.
                minStockLevel: validatedData.minStockLevel || 0,
                reorderPoint: validatedData.reorderPoint || 0,
                safetyStock: validatedData.safetyStock || 0,
                leadTimeDays: validatedData.leadTimeDays || 14,
            },
            update: validatedData,
        });

        return NextResponse.json(planning);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PATCH /api/parts/[id]/planning' });
        return NextResponse.json(
            { error: "Failed to update planning" },
            { status: 500 }
        );
    }
});
