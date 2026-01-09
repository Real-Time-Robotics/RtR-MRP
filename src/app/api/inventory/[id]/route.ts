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
                warehouse: true,
            },
        });

        if (!inventory) {
            return NextResponse.json({ error: "Inventory record not found" }, { status: 404 });
        }

        return NextResponse.json(inventory);
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
