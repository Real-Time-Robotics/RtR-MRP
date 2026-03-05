/**
 * MRP Suggestion Management
 * Approve, reject, and convert MRP suggestions to purchase orders.
 */

import prisma from "../prisma";

// Approve suggestion and optionally create PO
export async function approveSuggestion(
  suggestionId: string,
  userId: string,
  createPO: boolean = false
) {
  const suggestion = await prisma.mrpSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: "approved",
      approvedBy: userId,
      approvedAt: new Date(),
    },
    include: { part: { include: { costs: true } }, supplier: true },
  });

  // Extract the first cost entry from the included part costs relation
  const partWithCosts = suggestion.part as typeof suggestion.part & { costs: Array<{ unitCost: number }> };
  const firstCostEntry = partWithCosts.costs?.[0];
  const unitCost = firstCostEntry?.unitCost ?? 0;

  if (createPO && suggestion.actionType === "PURCHASE") {
    // Resolve supplier: use suggestion's supplier, or find preferred/first supplier for this part
    let resolvedSupplierId = suggestion.supplierId;
    let resolvedUnitPrice = unitCost;

    if (!resolvedSupplierId) {
      const partSupplier = await prisma.partSupplier.findFirst({
        where: { partId: suggestion.partId },
        orderBy: [{ isPreferred: "desc" }, { createdAt: "asc" }],
        select: { supplierId: true, unitPrice: true },
      });

      if (partSupplier) {
        resolvedSupplierId = partSupplier.supplierId;
        if (partSupplier.unitPrice > 0) {
          resolvedUnitPrice = partSupplier.unitPrice;
        }
      }
    }

    if (!resolvedSupplierId) {
      return {
        suggestion,
        error: "Không tìm thấy nhà cung cấp cho part này. Vui lòng gán NCC trong Part Suppliers trước.",
      };
    }

    const qty = suggestion.suggestedQty || 0;

    // --- Auto-consolidate: check for existing draft PO with same supplier ---
    const existingDraftPO = await prisma.purchaseOrder.findFirst({
      where: {
        supplierId: resolvedSupplierId,
        status: "draft",
      },
      include: {
        lines: { orderBy: { lineNumber: "desc" } },
      },
    });

    if (existingDraftPO) {
      // Check if same part already exists in this PO → cộng dồn
      const existingLine = existingDraftPO.lines.find(
        (l) => l.partId === suggestion.partId
      );

      if (existingLine) {
        const newQty = existingLine.quantity + qty;
        await prisma.purchaseOrderLine.update({
          where: { id: existingLine.id },
          data: {
            quantity: newQty,
            lineTotal: newQty * existingLine.unitPrice,
          },
        });
      } else {
        const maxLineNumber =
          existingDraftPO.lines.length > 0
            ? existingDraftPO.lines[0].lineNumber
            : 0;
        await prisma.purchaseOrderLine.create({
          data: {
            poId: existingDraftPO.id,
            lineNumber: maxLineNumber + 1,
            partId: suggestion.partId,
            quantity: qty,
            unitPrice: resolvedUnitPrice,
            lineTotal: qty * resolvedUnitPrice,
          },
        });
      }

      // Recalculate PO total
      const allLines = await prisma.purchaseOrderLine.findMany({
        where: { poId: existingDraftPO.id },
      });
      const newTotal = allLines.reduce(
        (sum, l) => sum + (l.lineTotal || 0),
        0
      );
      const updatedPO = await prisma.purchaseOrder.update({
        where: { id: existingDraftPO.id },
        data: { totalAmount: newTotal },
      });

      await prisma.mrpSuggestion.update({
        where: { id: suggestionId },
        data: {
          status: "converted",
          convertedPoId: existingDraftPO.id,
        },
      });

      return { suggestion, po: updatedPO, consolidated: true };
    }

    // --- No existing draft PO → create new ---
    const poNumber = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: resolvedSupplierId,
        orderDate: new Date(),
        expectedDate: suggestion.suggestedDate || new Date(),
        status: "draft",
        totalAmount: qty * resolvedUnitPrice,
        notes: `Tạo tự động từ MRP suggestion`,
        lines: {
          create: {
            lineNumber: 1,
            partId: suggestion.partId,
            quantity: qty,
            unitPrice: resolvedUnitPrice,
            lineTotal: qty * resolvedUnitPrice,
          },
        },
      },
    });

    await prisma.mrpSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: "converted",
        convertedPoId: po.id,
      },
    });

    return { suggestion, po };
  }

  return { suggestion };
}

// Reject suggestion
export async function rejectSuggestion(suggestionId: string, userId: string) {
  return prisma.mrpSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: "rejected",
      approvedBy: userId,
      approvedAt: new Date(),
    },
  });
}
