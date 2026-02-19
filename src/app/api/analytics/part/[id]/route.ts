
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from '@/lib/api/with-auth';
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit } from '@/lib/rate-limit';
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const { id } = await context.params;

    if (!id) {
        return NextResponse.json({ error: "Part ID required" }, { status: 400 });
    }

    try {
// 1. Fetch Part & Related Data
        // We fetch Part + Inventory + Planning in one go
        // We fetch PO Lines separately to ensure clean types and filtering
        const [part, poLines] = await Promise.all([
            prisma.part.findUnique({
                where: { id },
                include: {
                    inventory: true,
                    planning: true,
                    costs: true,
                }
            }),
            prisma.purchaseOrderLine.findMany({
                where: { partId: id },
                include: {
                    po: { // Relation name is 'po' per schema
                        select: { status: true, expectedDate: true }
                    }
                }
            })
        ]);

        if (!part) {
            return NextResponse.json({ error: "Part not found" }, { status: 404 });
        }

        // --- 2. Calculate Stock Metrics ---
        // Access inventory from part relation
        const inventory = part.inventory || [];
        const planning = part.planning;

        const totalStock = inventory.reduce((acc, item) => acc + item.quantity, 0);
        const totalReserved = inventory.reduce((acc, item) => acc + item.reservedQty, 0);
        const available = totalStock - totalReserved;

        // Planning data (defaults)
        const reorderPoint = planning?.reorderPoint || 0;
        const safetyStock = planning?.safetyStock || 0;

        // --- 3. Calculate Inbound (PO) ---
        // Filter lines where PO is not draft/cancelled/completed
        const activePoLines = poLines.filter(line =>
            line.po &&
            line.po.status !== 'draft' &&
            line.po.status !== 'cancelled' &&
            line.po.status !== 'completed'
        );

        const totalIncoming = activePoLines.reduce((acc, line) =>
            acc + (line.quantity - line.receivedQty), 0
        );

        // Find next PO date
        const sortedPos = [...activePoLines].sort((a, b) =>
            new Date(a.po.expectedDate).getTime() - new Date(b.po.expectedDate).getTime()
        );
        const nextPoDate = sortedPos.length > 0 ? sortedPos[0].po.expectedDate : null;

        // --- 4. Usage & Coverage ---
        const monthlyUsage = 100; // Placeholder
        const dailyUsage = monthlyUsage / 30;
        const coverageDays = dailyUsage > 0 ? Math.floor(available / dailyUsage) : 999;

        const data = {
            stock: {
                total: totalStock,
                reserved: totalReserved,
                available: available,
                reorderPoint: reorderPoint,
                safetyStock: safetyStock,
            },
            inbound: {
                totalIncoming,
                nextPoDate,
                pendingPos: activePoLines.length,
            },
            usage: {
                monthlyAverage: monthlyUsage,
                coverageDays,
            },
            price: {
                current: part.costs?.[0]?.unitCost || 0,
                lastPay: part.costs?.[0]?.unitCost || 0, // Placeholder
                trend: 'stable',
            }
        };

        return NextResponse.json({ data });

    } catch (error) {
        logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/analytics/part/[id]' });
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
});
