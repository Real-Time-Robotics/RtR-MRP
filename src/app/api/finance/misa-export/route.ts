import { NextRequest, NextResponse } from "next/server";
import { withRoleAuth } from '@/lib/api/with-auth';
import { exportToMISA, exportPurchaseInvoicesToMISA, exportSalesInvoicesToMISA, generateMISACSV } from "@/lib/finance/misa-export-service";
import { z } from "zod";

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
const MISAExportSchema = z.object({
  fromDate: z.string().min(1, "From date is required"),
  toDate: z.string().min(1, "To date is required"),
  type: z.enum(["journal", "purchase", "sales", "all"]).default("journal"),
  format: z.enum(["json", "csv"]).default("json"),
});

export const POST = withRoleAuth(['admin', 'manager'], async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    // Role-based access control: Finance routes require ADMIN or MANAGER

    const body = await request.json();

    const validation = MISAExportSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const fromDate = new Date(data.fromDate);
    const toDate = new Date(data.toDate);
    const type = data.type;

    let entries: Array<{ ngayHachToan: string; ngayChungTu: string; soChungTu: string; dienGiai: string; tkNo: string; tkCo: string; soTien: number; doiTuong: string; maHang: string; dvt: string; soLuong: number; donGia: number }> = [];

    if (type === "journal" || type === "all") {
      const result = await exportToMISA(fromDate, toDate);
      entries = [...entries, ...result.entries];
    }
    if (type === "purchase" || type === "all") {
      const piEntries = await exportPurchaseInvoicesToMISA(fromDate, toDate);
      entries = [...entries, ...piEntries];
    }
    if (type === "sales" || type === "all") {
      const siEntries = await exportSalesInvoicesToMISA(fromDate, toDate);
      entries = [...entries, ...siEntries];
    }

    if (data.format === "csv") {
      const csv = generateMISACSV(entries);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="MISA_Export_${fromDate.toISOString().split("T")[0]}_${toDate.toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ entries, total: entries.length });
  } catch (error) {
    return NextResponse.json({ error: "Failed to export MISA data" }, { status: 500 });
  }
});
