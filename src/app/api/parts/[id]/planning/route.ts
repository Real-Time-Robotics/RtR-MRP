import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";

const planningSchema = z.object({
    safetyStock: z.number().optional(),
    minStockLevel: z.number().optional(),
    reorderPoint: z.number().optional(),
    leadTimeDays: z.number().optional(),
    makeOrBuy: z.enum(["MAKE", "BUY"]).optional(),
});

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: partId } = params;
        const body = await request.json();
        const validatedData = planningSchema.parse(body);

        // Upsert because planning record might not exist for legacy parts
        const planning = await prisma.partPlanning.upsert({
            where: { partId },
            create: {
                partId,
                ...validatedData as any, // Cast to any to avoid strict type checks for required fields on create if not provided (default handled by DB usually, but Prisma strictness might complain. For Partial updates, strictly safer to use update if exists, but Upsert is better for robustness).
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
}
