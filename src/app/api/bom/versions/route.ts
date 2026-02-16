import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { submitBomForApproval, approveBom, rejectBom, createNewBomVersion, getBomVersionHistory } from "@/lib/bom/bom-version-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

    const history = await getBomVersionHistory(productId);
    return NextResponse.json({ data: history });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch BOM versions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const userId = session.user?.id || "system";

    switch (body.action) {
      case "submit":
        return NextResponse.json(await submitBomForApproval(body.bomId, userId, body.notes));
      case "approve":
        return NextResponse.json(await approveBom(body.bomId, userId, body.activateImmediately, body.notes));
      case "reject":
        return NextResponse.json(await rejectBom(body.bomId, userId, body.reason));
      case "new_version":
        return NextResponse.json(await createNewBomVersion(body.productId, userId, body.notes));
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to process BOM version action" }, { status: 500 });
  }
}
