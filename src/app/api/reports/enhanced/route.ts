import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateInventoryValuationReport, generateProductionReport, generateSalesReport, generateInventoryTurnoverReport } from "@/lib/reports/enhanced-reports-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { reportType, fromDate, toDate, warehouseId } = body;

    const from = fromDate ? new Date(fromDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const to = toDate ? new Date(toDate) : new Date();

    switch (reportType) {
      case "inventory_valuation":
        return NextResponse.json(await generateInventoryValuationReport(warehouseId));
      case "production_performance":
        return NextResponse.json(await generateProductionReport(from, to));
      case "sales_analytics":
        return NextResponse.json(await generateSalesReport(from, to));
      case "inventory_turnover":
        return NextResponse.json(await generateInventoryTurnoverReport(from, to));
      default:
        return NextResponse.json({ error: `Unknown report type: ${reportType}` }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
