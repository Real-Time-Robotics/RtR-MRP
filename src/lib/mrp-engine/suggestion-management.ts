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

  if (
    createPO &&
    suggestion.actionType === "PURCHASE" &&
    suggestion.supplierId
  ) {
    const poNumber = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: suggestion.supplierId,
        orderDate: new Date(),
        expectedDate: suggestion.suggestedDate || new Date(),
        status: "draft",
        totalAmount: suggestion.estimatedCost,
        notes: `Auto-generated from MRP suggestion`,
        lines: {
          create: {
            lineNumber: 1,
            partId: suggestion.partId,
            quantity: suggestion.suggestedQty || 0,
            unitPrice: unitCost,
            lineTotal: (suggestion.suggestedQty || 0) * unitCost,
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
