// src/app/api/data-setup/smart-upload/import/route.ts
// 3-phase orchestrated import: Parts → Products → BOM

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";
import type { ParsedPart, ParsedProduct, ParsedBomLine } from "@/lib/import/composite-bom-parser";

interface PhaseResult {
  phase: string;
  total: number;
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    // Retrieve session
    const session = await prisma.importSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.detectedType !== "COMPOSITE_BOM" && session.detectedType !== "ECAD_BOM") {
      return NextResponse.json(
        { error: "Session is not a BOM import" },
        { status: 400 }
      );
    }

    // Update status
    await prisma.importSession.update({
      where: { id: sessionId },
      data: { status: "IMPORTING" },
    });

    const mapping = session.columnMapping as unknown as {
      parts: ParsedPart[];
      products: ParsedProduct[];
      bomLines: ParsedBomLine[];
    };

    const results: PhaseResult[] = [];

    // Phase 1: Parts
    const partsResult = await importParts(mapping.parts);
    results.push(partsResult);

    // Phase 2: Products
    const productsResult = await importProducts(mapping.products);
    results.push(productsResult);

    // Phase 3: BOM
    const bomResult = await importBomLines(mapping.bomLines);
    results.push(bomResult);

    // Update session
    const totalSuccess = results.reduce((s, r) => s + r.success, 0);
    const totalFailed = results.reduce((s, r) => s + r.failed, 0);
    const totalSkipped = results.reduce((s, r) => s + r.skipped, 0);

    await prisma.importSession.update({
      where: { id: sessionId },
      data: {
        status: totalFailed > 0 ? "COMPLETED" : "COMPLETED",
        successRows: totalSuccess,
        failedRows: totalFailed,
        skippedRows: totalSkipped,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: totalFailed === 0,
      results,
      summary: {
        totalSuccess,
        totalFailed,
        totalSkipped,
      },
    });
  } catch (error) {
    console.error("Smart upload import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
});

// ============================================
// PHASE 1: PARTS
// ============================================

async function importParts(parts: ParsedPart[]): Promise<PhaseResult> {
  const result: PhaseResult = {
    phase: "Parts",
    total: parts.length,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  for (const part of parts) {
    try {
      if (!part.partNumber) {
        result.skipped++;
        continue;
      }

      await prisma.part.upsert({
        where: { partNumber: part.partNumber },
        create: {
          partNumber: part.partNumber,
          name: part.name || part.partNumber,
          category: part.category || "Imported",
          unit: part.unit || "pcs",
          unitCost: part.unitCost || 0,
          makeOrBuy: part.method === "MAKE" ? "MAKE" : "BUY",
        },
        update: {
          name: part.name || undefined,
          category: part.category || undefined,
          unit: part.unit || undefined,
          ...(part.unitCost > 0 ? { unitCost: part.unitCost } : {}),
          makeOrBuy: part.method === "MAKE" ? "MAKE" : "BUY",
        },
      });
      result.success++;
    } catch (error) {
      result.failed++;
      result.errors.push(
        `Part ${part.partNumber}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return result;
}

// ============================================
// PHASE 2: PRODUCTS
// ============================================

async function importProducts(products: ParsedProduct[]): Promise<PhaseResult> {
  const result: PhaseResult = {
    phase: "Products",
    total: products.length,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  for (const product of products) {
    try {
      if (!product.sku) {
        result.skipped++;
        continue;
      }

      await prisma.product.upsert({
        where: { sku: product.sku },
        create: {
          sku: product.sku,
          name: product.name || product.sku,
        },
        update: {
          name: product.name || undefined,
        },
      });
      result.success++;
    } catch (error) {
      result.failed++;
      result.errors.push(
        `Product ${product.sku}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return result;
}

// ============================================
// PHASE 3: BOM LINES
// ============================================

async function importBomLines(bomLines: ParsedBomLine[]): Promise<PhaseResult> {
  const result: PhaseResult = {
    phase: "BOM",
    total: bomLines.length,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  // Cache lookups to avoid repeated queries
  const productCache = new Map<string, string>(); // sku → id
  const partCache = new Map<string, string>(); // partNumber → id
  const bomHeaderCache = new Map<string, { id: string; maxLine: number; existingLines: Map<string, string> }>(); // productId → bomHeader + partId→lineId map

  for (const line of bomLines) {
    try {
      if (!line.parentSku || !line.childPartNumber || line.quantity <= 0) {
        result.skipped++;
        continue;
      }

      // Resolve product
      let productId = productCache.get(line.parentSku);
      if (!productId) {
        const product = await prisma.product.findUnique({
          where: { sku: line.parentSku },
        });
        if (!product) {
          result.failed++;
          result.errors.push(`BOM: Không tìm thấy sản phẩm ${line.parentSku}`);
          continue;
        }
        productId = product.id;
        productCache.set(line.parentSku, productId);
      }

      // Resolve part
      let partId = partCache.get(line.childPartNumber);
      if (!partId) {
        const part = await prisma.part.findUnique({
          where: { partNumber: line.childPartNumber },
        });
        if (!part) {
          result.failed++;
          result.errors.push(`BOM: Không tìm thấy linh kiện ${line.childPartNumber}`);
          continue;
        }
        partId = part.id;
        partCache.set(line.childPartNumber, partId);
      }

      // Find or create BomHeader
      let headerInfo = bomHeaderCache.get(productId);
      if (!headerInfo) {
        let bomHeader = await prisma.bomHeader.findFirst({
          where: { productId, status: "active" },
          include: { bomLines: { select: { lineNumber: true, partId: true, id: true } } },
        });

        if (!bomHeader) {
          bomHeader = await prisma.bomHeader.create({
            data: {
              productId,
              version: "1.0",
              effectiveDate: new Date(),
              status: "active",
            },
            include: { bomLines: { select: { lineNumber: true, partId: true, id: true } } },
          });
        }

        const maxLine = bomHeader.bomLines.reduce(
          (max, l) => Math.max(max, l.lineNumber),
          0
        );
        // Cache header with existing line partId→id map for O(1) duplicate check
        const existingLinesMap = new Map(bomHeader.bomLines.map(l => [l.partId, l.id]));
        headerInfo = { id: bomHeader.id, maxLine, existingLines: existingLinesMap };
        bomHeaderCache.set(productId, headerInfo);

        // Check for existing line with same part
        const existingLineId = existingLinesMap.get(partId);
        if (existingLineId) {
          await prisma.bomLine.update({
            where: { id: existingLineId },
            data: {
              quantity: line.quantity,
              scrapRate: line.scrapRate,
            },
          });
          result.success++;
          continue;
        }
      }

      // Check from cached existing lines — no DB query needed
      const existingLineId = headerInfo.existingLines?.get(partId);

      if (existingLineId) {
        await prisma.bomLine.update({
          where: { id: existingLineId },
          data: {
            quantity: line.quantity,
            scrapRate: line.scrapRate,
          },
        });
      } else {
        headerInfo.maxLine++;
        const newLine = await prisma.bomLine.create({
          data: {
            bomId: headerInfo.id,
            lineNumber: headerInfo.maxLine,
            partId,
            quantity: line.quantity,
            scrapRate: line.scrapRate,
          },
        });
        // Track new line in cache to avoid duplicate on subsequent rows
        headerInfo.existingLines?.set(partId, newLine.id);
      }

      result.success++;
    } catch (error) {
      result.failed++;
      result.errors.push(
        `BOM ${line.parentSku}→${line.childPartNumber}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return result;
}
