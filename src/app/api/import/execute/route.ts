import { NextRequest, NextResponse } from "next/server";
import { withAuth } from '@/lib/api/with-auth';
import { executeImport } from "@/lib/import/import-executor";
import { ColumnMapping } from "@/lib/import/ai-analyzer";
import * as XLSX from "xlsx";

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const formData = await request.formData();
    const file = formData.get("file") as File;
    const sessionId = formData.get("sessionId") as string;
    const mappingJson = formData.get("mapping") as string;
    const targetType = formData.get("targetType") as string;
    const optionsJson = formData.get("options") as string;

    if (!file || !sessionId || !mappingJson || !targetType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    }) as unknown[][];

    const rows = data.slice(1).filter((row) => row.some((cell) => cell !== ""));
    const columns: ColumnMapping[] = JSON.parse(mappingJson);
    const options = optionsJson ? JSON.parse(optionsJson) : {};

    const result = await executeImport(
      sessionId,
      rows,
      columns,
      targetType,
      session.user.id,
      options
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to execute import",
      },
      { status: 500 }
    );
  }
});
