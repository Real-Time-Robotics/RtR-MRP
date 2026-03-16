import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

const VARIANCE_THRESHOLD_PCT = 5;

export async function createMatchFromGRN(
  purchaseOrderId: string,
  grnId: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  const po = await tx.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    include: { lines: true },
  });

  if (!po) return;

  const grn = await tx.goodsReceiptNote.findUnique({
    where: { id: grnId },
    include: { items: true },
  });

  if (!grn) return;

  const poQuantity = po.lines.reduce((sum, l) => sum + l.quantity, 0);
  const poTotalAmount = po.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const poUnitPrice = poQuantity > 0 ? poTotalAmount / poQuantity : 0;

  const grnQuantity = grn.items.reduce((sum, i) => sum + i.quantityReceived, 0);
  const grnAcceptedQty = grn.items.reduce((sum, i) => sum + i.quantityAccepted, 0);

  const qtyVariance = grnAcceptedQty - poQuantity;
  const qtyVariancePct = poQuantity > 0 ? (Math.abs(qtyVariance) / poQuantity) * 100 : 0;

  const status = qtyVariancePct <= VARIANCE_THRESHOLD_PCT ? 'pending' : 'mismatch_pending_review';

  await tx.threeWayMatch.create({
    data: {
      purchaseOrderId,
      grnId,
      status,
      poQuantity,
      poUnitPrice,
      poTotalAmount,
      grnQuantity,
      grnAcceptedQty,
      qtyVariance,
      qtyVariancePct,
    },
  });
}

export async function updateMatchWithInvoice(
  matchId: string,
  invoiceNumber: string,
  invoiceAmount: number,
  invoiceDate: Date,
  purchaseInvoiceId?: string
) {
  const match = await prisma.threeWayMatch.findUnique({ where: { id: matchId } });
  if (!match) return null;

  const amtVariance = invoiceAmount - match.poTotalAmount;
  const amtVariancePct =
    match.poTotalAmount > 0 ? (Math.abs(amtVariance) / match.poTotalAmount) * 100 : 0;

  const hasQtyMismatch = match.qtyVariancePct != null && match.qtyVariancePct > VARIANCE_THRESHOLD_PCT;
  const hasAmtMismatch = amtVariancePct > VARIANCE_THRESHOLD_PCT;

  let status = 'matched';
  if (hasQtyMismatch || hasAmtMismatch) status = 'mismatch_pending_review';

  return prisma.threeWayMatch.update({
    where: { id: matchId },
    data: {
      invoiceNumber,
      invoiceAmount,
      invoiceDate,
      purchaseInvoiceId: purchaseInvoiceId || null,
      amtVariance,
      amtVariancePct,
      status,
    },
  });
}
