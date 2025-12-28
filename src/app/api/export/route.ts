import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exportPartsToExcel,
  exportSuppliersToExcel,
  exportOrdersToExcel,
} from "@/lib/excel-handler";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "parts";
    // Note: format parameter (xlsx/csv/pdf) can be added in future

    let blob: Blob;
    let filename: string;

    switch (type) {
      case "parts": {
        const parts = await prisma.part.findMany({
          include: {
            inventory: {
              select: { quantity: true },
            },
          },
          orderBy: { partNumber: "asc" },
        });

        const data = parts.map((part) => ({
          partNumber: part.partNumber,
          name: part.name,
          category: part.category,
          unitCost: part.unitCost,
          quantity: part.inventory.reduce((sum, inv) => sum + inv.quantity, 0),
          status: part.status,
        }));

        blob = exportPartsToExcel(data);
        filename = `parts_${new Date().toISOString().split("T")[0]}.xlsx`;
        break;
      }

      case "suppliers": {
        const suppliers = await prisma.supplier.findMany({
          orderBy: { name: "asc" },
        });

        const data = suppliers.map((s) => ({
          code: s.code,
          name: s.name,
          country: s.country,
          leadTimeDays: s.leadTimeDays,
          rating: s.rating || 0,
          status: s.status,
        }));

        blob = exportSuppliersToExcel(data);
        filename = `suppliers_${new Date().toISOString().split("T")[0]}.xlsx`;
        break;
      }

      case "orders": {
        const orders = await prisma.salesOrder.findMany({
          include: { customer: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        });

        const data = orders.map((o) => ({
          orderNumber: o.orderNumber,
          customer: o.customer.name,
          orderDate: o.orderDate.toISOString().split("T")[0],
          requiredDate: o.requiredDate.toISOString().split("T")[0],
          status: o.status,
          totalAmount: o.totalAmount || 0,
        }));

        blob = exportOrdersToExcel(data);
        filename = `orders_${new Date().toISOString().split("T")[0]}.xlsx`;
        break;
      }

      default:
        return NextResponse.json(
          { error: "Invalid export type" },
          { status: 400 }
        );
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
