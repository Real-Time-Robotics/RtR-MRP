// lib/quality/traceability-engine.ts
import { prisma } from "@/lib/prisma";

interface LotNode {
  lotNumber: string;
  partId?: string;
  partNumber?: string;
  partName?: string;
  productId?: string;
  productSku?: string;
  productName?: string;
  quantity: number;
  type: "part" | "product";
  status: string;
}

interface TraceabilityDocument {
  type: string;
  number: string;
  date: Date;
}

interface QualityInfo {
  inspectionResult?: string;
  ncrCount: number;
}

export interface TraceabilityNode extends LotNode {
  children: TraceabilityNode[];
  documents: TraceabilityDocument[];
  quality: QualityInfo;
}

export async function getForwardTraceability(
  lotNumber: string
): Promise<TraceabilityNode | null> {
  const transactions = await prisma.lotTransaction.findMany({
    where: { lotNumber },
    orderBy: { createdAt: "asc" },
    include: {
      part: true,
      product: true,
    },
  });

  if (transactions.length === 0) return null;

  const firstTx = transactions[0];

  // Build root node
  const rootNode: TraceabilityNode = {
    lotNumber,
    partId: firstTx.partId || undefined,
    partNumber: firstTx.part?.partNumber,
    partName: firstTx.part?.name,
    quantity: transactions
      .filter((t) => t.transactionType === "RECEIVED")
      .reduce((sum, t) => sum + t.quantity, 0),
    type: "part",
    status: "released",
    children: [],
    documents: [],
    quality: {
      ncrCount: 0,
    },
  };

  // Get related documents
  const poTx = transactions.find((t) => t.poId);
  if (poTx) {
    rootNode.documents.push({
      type: "PO",
      number: poTx.poId!,
      date: poTx.createdAt,
    });
  }

  // Get inspection results
  const inspection = await prisma.inspection.findFirst({
    where: { lotNumber },
  });
  if (inspection) {
    rootNode.quality.inspectionResult = inspection.result || undefined;
    rootNode.documents.push({
      type: "Inspection",
      number: inspection.inspectionNumber,
      date: inspection.inspectedAt || inspection.createdAt,
    });
  }

  // Get NCR count
  const ncrCount = await prisma.nCR.count({
    where: { lotNumber },
  });
  rootNode.quality.ncrCount = ncrCount;

  // Find where this lot was consumed (issued to work orders)
  const issuedTxs = transactions.filter(
    (t) => t.transactionType === "ISSUED" && t.workOrderId
  );

  for (const tx of issuedTxs) {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: tx.workOrderId! },
      include: {
        product: true,
        salesOrder: {
          include: { customer: true },
        },
      },
    });

    if (workOrder) {
      // Find produced lot from this work order
      const producedTxs = await prisma.lotTransaction.findMany({
        where: {
          workOrderId: workOrder.id,
          transactionType: "PRODUCED",
        },
      });

      for (const prodTx of producedTxs) {
        const childNode: TraceabilityNode = {
          lotNumber: prodTx.lotNumber,
          productId: workOrder.productId,
          productSku: workOrder.product.sku,
          productName: workOrder.product.name,
          quantity: prodTx.quantity,
          type: "product",
          status: workOrder.status,
          children: [],
          documents: [
            {
              type: "Work Order",
              number: workOrder.woNumber,
              date: workOrder.createdAt,
            },
          ],
          quality: { ncrCount: 0 },
        };

        if (workOrder.salesOrder) {
          childNode.documents.push({
            type: "Sales Order",
            number: workOrder.salesOrder.orderNumber,
            date: workOrder.salesOrder.createdAt,
          });

          // Add shipped info if applicable
          const shippedTx = await prisma.lotTransaction.findFirst({
            where: {
              lotNumber: prodTx.lotNumber,
              transactionType: "SHIPPED",
            },
          });

          if (shippedTx) {
            childNode.status = "shipped";
          }
        }

        rootNode.children.push(childNode);
      }
    }
  }

  return rootNode;
}

export async function getBackwardTraceability(
  lotNumber: string
): Promise<TraceabilityNode | null> {
  const transactions = await prisma.lotTransaction.findMany({
    where: { lotNumber },
    orderBy: { createdAt: "asc" },
    include: { product: true },
  });

  if (transactions.length === 0) return null;

  // Check if this is a produced lot
  const producedTx = transactions.find((t) => t.transactionType === "PRODUCED");
  if (!producedTx || !producedTx.parentLots) {
    return null;
  }

  // Build root node
  const rootNode: TraceabilityNode = {
    lotNumber,
    productId: producedTx.productId || undefined,
    productSku: producedTx.product?.sku,
    productName: producedTx.product?.name,
    quantity: producedTx.quantity,
    type: "product",
    status: "produced",
    children: [],
    documents: [],
    quality: { ncrCount: 0 },
  };

  // Get parent lots (components)
  const parentLots = producedTx.parentLots as Array<{
    lotNumber: string;
    partId: string;
    quantity: number;
  }>;

  for (const parent of parentLots) {
    const parentTraceability = await getForwardTraceability(parent.lotNumber);
    if (parentTraceability) {
      const parentNode: TraceabilityNode = {
        ...parentTraceability,
        children: [],
      };
      rootNode.children.push(parentNode);
    }
  }

  return rootNode;
}

export async function getLotSummary(lotNumber: string) {
  const transactions = await prisma.lotTransaction.findMany({
    where: { lotNumber },
    orderBy: { createdAt: "asc" },
    include: {
      part: { select: { partNumber: true, name: true } },
      product: { select: { sku: true, name: true } },
    },
  });

  if (transactions.length === 0) return null;

  const firstTx = transactions[0];
  const received = transactions
    .filter((t) => t.transactionType === "RECEIVED")
    .reduce((sum, t) => sum + t.quantity, 0);
  const consumed = transactions
    .filter((t) => t.transactionType === "CONSUMED" || t.transactionType === "ISSUED")
    .reduce((sum, t) => sum + t.quantity, 0);
  const scrapped = transactions
    .filter((t) => t.transactionType === "SCRAPPED")
    .reduce((sum, t) => sum + t.quantity, 0);

  return {
    lotNumber,
    partId: firstTx.partId,
    partNumber: firstTx.part?.partNumber,
    partName: firstTx.part?.name,
    productId: firstTx.productId,
    productSku: firstTx.product?.sku,
    productName: firstTx.product?.name,
    originalQty: received,
    consumedQty: consumed,
    scrappedQty: scrapped,
    availableQty: received - consumed - scrapped,
    transactions,
  };
}
