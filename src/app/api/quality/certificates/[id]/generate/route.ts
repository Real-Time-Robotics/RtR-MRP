import { NextRequest, NextResponse } from "next/server";
import { generateCoCPDF } from "@/lib/quality/coc-generator";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const blob = await generateCoCPDF(id);

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Disposition", `attachment; filename="CoC-${id}.pdf"`);

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error("Failed to generate certificate PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate certificate PDF" },
      { status: 500 }
    );
  }
}
