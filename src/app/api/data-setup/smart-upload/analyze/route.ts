// src/app/api/data-setup/smart-upload/analyze/route.ts
// Upload + analyze composite BOM file → split into Parts, Products, BOM lines

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";
import {
  detectCompositeStructure,
  splitCompositeData,
} from "@/lib/import/composite-bom-parser";

export const POST = withAuth(async (request: NextRequest, _context, session) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Parse Excel
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    }) as unknown[][];

    if (data.length < 2) {
      return NextResponse.json(
        { error: "File phải có ít nhất 2 dòng (header + data)" },
        { status: 400 }
      );
    }

    // Find the real header row — skip leading empty rows
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(data.length, 10); i++) {
      const row = data[i];
      const nonEmpty = row.filter(
        (cell) => cell !== null && cell !== undefined && String(cell).trim() !== ""
      );
      // Header row should have multiple non-empty cells that look like text
      if (nonEmpty.length >= 3) {
        headerRowIdx = i;
        break;
      }
    }

    const headers = data[headerRowIdx].map((h) => String(h || "").trim());
    const rows = data.slice(headerRowIdx + 1).filter((row) =>
      row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "")
    );

    // Detect composite structure
    const detection = detectCompositeStructure(headers, rows.slice(0, 50));

    if (!detection.isComposite) {
      return NextResponse.json({
        isComposite: false,
        confidence: detection.confidence,
        message: "File không phải BOM phức hợp. Hãy dùng Import thông thường.",
      });
    }

    // Split into 3 datasets
    const result = splitCompositeData(headers, rows);

    // Store in ImportSession for later import
    const importSession = await prisma.importSession.create({
      data: {
        fileName: file.name,
        fileSize: buffer.length,
        fileType: file.name.split(".").pop() || "xlsx",
        detectedType: "COMPOSITE_BOM",
        confidence: result.confidence,
        status: "MAPPED",
        totalRows: rows.length,
        columnMapping: JSON.parse(JSON.stringify({
          parts: result.parts,
          products: result.products,
          bomLines: result.bomLines,
        })),
        importedBy: session.user.id,
      },
    });

    return NextResponse.json({
      isComposite: true,
      sessionId: importSession.id,
      confidence: result.confidence,
      stats: result.stats,
      warnings: result.warnings,
      preview: {
        parts: result.parts.slice(0, 5),
        products: result.products.slice(0, 5),
        bomLines: result.bomLines.slice(0, 5),
      },
    });
  } catch (error) {
    console.error("Smart upload analyze error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
});
