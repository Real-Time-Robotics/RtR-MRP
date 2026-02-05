import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * GET /api/suppliers/check-tax-id?taxId=xxx&excludeId=xxx
 * Check if a tax ID already exists (for duplicate warning)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taxId = searchParams.get("taxId");
    const excludeId = searchParams.get("excludeId"); // For edit mode, exclude current supplier

    if (!taxId || taxId.trim() === "") {
      return NextResponse.json({ exists: false, supplier: null });
    }

    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        taxId: taxId.trim(),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
        code: true,
        name: true,
        taxId: true,
      },
    });

    return NextResponse.json({
      exists: !!existingSupplier,
      supplier: existingSupplier,
    });
  } catch (error) {
    console.error("Error checking tax ID:", error);
    return NextResponse.json({ error: "Lỗi kiểm tra mã số thuế" }, { status: 500 });
  }
}
