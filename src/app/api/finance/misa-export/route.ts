import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exportToMISA, exportPurchaseInvoicesToMISA, exportSalesInvoicesToMISA, generateMISACSV } from "@/lib/finance/misa-export-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const fromDate = new Date(body.fromDate);
    const toDate = new Date(body.toDate);
    const type = body.type || "journal"; // journal | purchase | sales | all

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

    if (body.format === "csv") {
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
}
