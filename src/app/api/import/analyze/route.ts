import { NextRequest, NextResponse } from "next/server";
import { withAuth } from '@/lib/api/with-auth';
import { analyzeFile } from "@/lib/import/ai-analyzer";

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const formData = await request.formData();
    const file = formData.get("file") as File;
    const selectedSheet = formData.get("sheet") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const validTypes = [".xlsx", ".xls", ".csv"];
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
    if (!validTypes.includes(ext)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported: xlsx, xls, csv" },
        { status: 400 }
      );
    }

    // Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Max 50MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await analyzeFile(
      buffer,
      file.name,
      session.user.id,
      selectedSheet || undefined
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to analyze file",
      },
      { status: 500 }
    );
  }
});
