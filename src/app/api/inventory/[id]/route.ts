import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
    quantity: z.number().optional(),
    reservedQty: z.number().optional(),
    locationCode: z.string().optional(),
    lotNumber: z.string().optional(),
});

// GET - Fetch single inventory record with details
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;

        const inventory = await prisma.inventory.findUnique({
            where: { id },
            include: {
                part: {
                    include: {
                        // Include useful part details context
                        partSuppliers: { include: { supplier: true } }
                    }
                },
                warehouse: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        location: true,
                        type: true,
                    }
                },
            },
        });

        if (!inventory) {
            return NextResponse.json({ error: "Inventory record not found" }, { status: 404 });
        }

        // Fetch related receiving inspections for this part
        const receivingInspections = await prisma.inspection.findMany({
            where: {
                partId: inventory.partId,
                type: 'RECEIVING',
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                inspectionNumber: true,
                status: true,
                result: true,
                lotNumber: true,
                quantityReceived: true,
                quantityAccepted: true,
                quantityRejected: true,
                inspectedAt: true,
                createdAt: true,
            },
        });

        // Fetch other inventory locations for the same part (different warehouses/lots)
        const otherLocations = await prisma.inventory.findMany({
            where: {
                partId: inventory.partId,
                id: { not: inventory.id }, // Exclude current record
            },
            include: {
                warehouse: true,
            },
            orderBy: { warehouse: { name: 'asc' } },
        });

        return NextResponse.json({
            ...inventory,
            receivingInspections,
            otherLocations,
        });
    } catch (error) {
        console.error("Failed to fetch inventory details:", error);
        return NextResponse.json(
            { error: "Failed to fetch inventory details" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;
        const body = await request.json();
        const validatedData = updateSchema.parse(body);

        const inventory = await prisma.inventory.update({
            where: { id },
            data: validatedData,
            include: {
                part: true,
                warehouse: true,
            },
        });

        return NextResponse.json(inventory);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        console.error("Failed to update inventory:", error);
        return NextResponse.json(
            { error: "Failed to update inventory" },
            { status: 500 }
        );
    }
}
