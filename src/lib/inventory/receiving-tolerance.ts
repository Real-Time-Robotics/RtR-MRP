// src/lib/inventory/receiving-tolerance.ts
// R03+R13: Validate received quantity against PO tolerance

import { prisma } from "@/lib/prisma";

interface ToleranceCheckResult {
  withinTolerance: boolean;
  expectedQty: number;
  receivedQty: number;
  tolerance: number | null;
  variancePercent: number;
  message: string;
}

/**
 * Check if received quantity is within the allowed tolerance for a PO line.
 * Tolerance is defined per Part-Supplier relationship.
 */
export async function checkReceivingTolerance(
  poId: string,
  lineNumber: number,
  receivedQty: number
): Promise<ToleranceCheckResult> {
  const poLine = await prisma.purchaseOrderLine.findFirst({
    where: { poId, lineNumber },
    include: {
      po: { select: { supplierId: true } },
    },
  });

  if (!poLine) {
    return {
      withinTolerance: false,
      expectedQty: 0,
      receivedQty,
      tolerance: null,
      variancePercent: 0,
      message: "PO line not found",
    };
  }

  // Look up tolerance from PartSupplier
  const partSupplier = await prisma.partSupplier.findUnique({
    where: {
      partId_supplierId: {
        partId: poLine.partId,
        supplierId: poLine.po.supplierId,
      },
    },
    select: { receivingTolerance: true },
  });

  const tolerance = partSupplier?.receivingTolerance ?? null;
  const expectedQty = poLine.quantity - (poLine.receivedQty || 0);
  const variance = receivedQty - expectedQty;
  const variancePercent = expectedQty > 0 ? (variance / expectedQty) * 100 : 0;

  // If no tolerance set, any quantity is accepted
  if (tolerance === null) {
    return {
      withinTolerance: true,
      expectedQty,
      receivedQty,
      tolerance: null,
      variancePercent,
      message: "No tolerance defined — accepted",
    };
  }

  const withinTolerance = Math.abs(variancePercent) <= tolerance;

  return {
    withinTolerance,
    expectedQty,
    receivedQty,
    tolerance,
    variancePercent,
    message: withinTolerance
      ? `Within tolerance (${variancePercent.toFixed(1)}% vs ±${tolerance}%)`
      : `OUTSIDE tolerance: ${variancePercent.toFixed(1)}% exceeds ±${tolerance}%`,
  };
}

/**
 * Batch check tolerance for all lines in a PO receive.
 */
export async function checkAllLinesTolerances(
  poId: string,
  receivedLines: Array<{ lineNumber: number; quantity: number }>
) {
  const results = await Promise.all(
    receivedLines.map((line) =>
      checkReceivingTolerance(poId, line.lineNumber, line.quantity)
    )
  );

  const allWithin = results.every((r) => r.withinTolerance);
  const violations = results.filter((r) => !r.withinTolerance);

  return {
    allWithinTolerance: allWithin,
    results,
    violations,
  };
}
