import { NextRequest, NextResponse } from "next/server";
import { z } from 'zod';
import { withAuth } from "@/lib/api/with-auth";
import { generateInventoryValuationReport, generateProductionReport, generateSalesReport, generateInventoryTurnoverReport } from "@/lib/reports/enhanced-reports-service";

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const bodySchema = z.object({
      reportType: z.string(),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
      warehouseId: z.string().optional(),
    });

    const rawBody = await request.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parseResult.data;
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
});
