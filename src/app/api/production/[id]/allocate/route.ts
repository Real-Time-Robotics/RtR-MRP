import { NextResponse } from "next/server";
import { allocateMaterials, regenerateAllocations } from "@/lib/mrp-engine";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// POST - Allocate materials to work order
// Auto-regenerates allocations from BOM if none exist
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if WO has any allocations; if not, regenerate from BOM first
    const existingCount = await prisma.materialAllocation.count({
      where: { workOrderId: id },
    });

    if (existingCount === 0) {
      const regenResult = await regenerateAllocations(id);
      if (!regenResult.regenerated) {
        return NextResponse.json({
          error: regenResult.reason || "Không thể tạo danh sách vật tư. Kiểm tra BOM đã active chưa.",
          allocations: [],
          fullyAllocated: false,
        }, { status: 400 });
      }
    }

    const result = await allocateMaterials(id);

    return NextResponse.json(result);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/production/[id]/allocate' });
    return NextResponse.json(
      { error: "Failed to allocate materials" },
      { status: 500 }
    );
  }
}
