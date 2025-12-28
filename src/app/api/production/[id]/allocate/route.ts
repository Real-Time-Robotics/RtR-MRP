import { NextResponse } from "next/server";
import { allocateMaterials } from "@/lib/mrp-engine";

// POST - Allocate materials to work order
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await allocateMaterials(id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Allocate materials error:", error);
    return NextResponse.json(
      { error: "Failed to allocate materials" },
      { status: 500 }
    );
  }
}
