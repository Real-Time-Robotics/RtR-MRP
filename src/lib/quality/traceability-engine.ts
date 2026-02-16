// lib/quality/traceability-engine.ts
// Deep traceability engine: forward (RM→FG→Customer) + backward (FG→RM→Supplier)
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
  detail?: string;
}

interface QualityInfo {
  inspectionResult?: string;
  ncrCount: number;
  ncrNumbers?: string[];
}

interface SupplierInfo {
  supplierId?: string;
  supplierName?: string;
  supplierCode?: string;
}

interface CustomerInfo {
  customerId?: string;
  customerName?: string;
  shippedAt?: Date;
  trackingNumber?: string;
}

export interface TraceabilityNode extends LotNode {
  children: TraceabilityNode[];
  documents: TraceabilityDocument[];
  quality: QualityInfo;
  supplier?: SupplierInfo;
  customer?: CustomerInfo;
}

/**
 * Full forward traceability: Raw Material → WO → Finished Good → Shipment → Customer
 * Also includes Supplier, Inspection, NCR at each level.
 */
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

  // --- Supplier info (via PO → Supplier) ---
  const poTx = transactions.find((t) => t.poId);
  if (poTx?.poId) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poTx.poId },
      include: { supplier: { select: { id: true, name: true, code: true } } },
    });
    if (po) {
      rootNode.documents.push({
        type: "PO",
        number: po.poNumber,
        date: po.orderDate,
        detail: `${po.supplier.name} (${po.supplier.code})`,
      });
      rootNode.supplier = {
        supplierId: po.supplier.id,
        supplierName: po.supplier.name,
        supplierCode: po.supplier.code,
      };
    }
  }

  // --- Inspection results ---
  const inspection = await prisma.inspection.findFirst({
    where: { lotNumber },
  });
  if (inspection) {
    rootNode.quality.inspectionResult = inspection.result || undefined;
    rootNode.documents.push({
      type: "Inspection",
      number: inspection.inspectionNumber,
      date: inspection.inspectedAt || inspection.createdAt,
      detail: inspection.result || undefined,
    });
  }

  // --- NCR info ---
  const ncrs = await prisma.nCR.findMany({
    where: { lotNumber },
    select: { ncrNumber: true },
  });
  rootNode.quality.ncrCount = ncrs.length;
  if (ncrs.length > 0) {
    rootNode.quality.ncrNumbers = ncrs.map((n) => n.ncrNumber);
  }

  // --- Forward: find where this lot was consumed (issued to work orders) ---
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
            detail: workOrder.salesOrder.customer?.name,
          });

          // Shipment + Customer info
          const shippedTx = await prisma.lotTransaction.findFirst({
            where: {
              lotNumber: prodTx.lotNumber,
              transactionType: "SHIPPED",
              salesOrderId: workOrder.salesOrderId!,
            },
          });

          if (shippedTx) {
            childNode.status = "shipped";

            // Get shipment details
            const shipment = await prisma.shipment.findFirst({
              where: { salesOrderId: workOrder.salesOrderId! },
              include: { customer: true },
            });
            if (shipment) {
              childNode.documents.push({
                type: "Shipment",
                number: shipment.shipmentNumber,
                date: shipment.shippedAt || shipment.createdAt,
                detail: shipment.trackingNumber || undefined,
              });
              childNode.customer = {
                customerId: shipment.customer?.id,
                customerName: shipment.customer?.name,
                shippedAt: shipment.shippedAt || undefined,
                trackingNumber: shipment.trackingNumber || undefined,
              };
            }
          }
        }

        // NCRs on produced lot
        const prodNcrs = await prisma.nCR.count({
          where: { lotNumber: prodTx.lotNumber },
        });
        childNode.quality.ncrCount = prodNcrs;

        rootNode.children.push(childNode);
      }
    }
  }

  // --- Forward: find if this lot was shipped directly (finished good) ---
  const shippedTxs = transactions.filter(
    (t) => t.transactionType === "SHIPPED" && t.salesOrderId
  );
  for (const sTx of shippedTxs) {
    const shipment = await prisma.shipment.findFirst({
      where: { salesOrderId: sTx.salesOrderId! },
      include: { customer: true, salesOrder: true },
    });
    if (shipment && !rootNode.children.some((c) => c.lotNumber === lotNumber && c.status === "shipped")) {
      rootNode.status = "shipped";
      rootNode.customer = {
        customerId: shipment.customer?.id,
        customerName: shipment.customer?.name,
        shippedAt: shipment.shippedAt || undefined,
        trackingNumber: shipment.trackingNumber || undefined,
      };
      rootNode.documents.push({
        type: "Shipment",
        number: shipment.shipmentNumber,
        date: shipment.shippedAt || shipment.createdAt,
        detail: shipment.trackingNumber || undefined,
      });
    }
  }

  return rootNode;
}

/**
 * Full backward traceability: Finished Product → Components → Raw Materials → Suppliers
 * Works recursively for multi-level BOMs.
 */
export async function getBackwardTraceability(
  lotNumber: string,
  depth: number = 0,
  maxDepth: number = 10
): Promise<TraceabilityNode | null> {
  if (depth > maxDepth) return null; // Prevent infinite recursion

  const transactions = await prisma.lotTransaction.findMany({
    where: { lotNumber },
    orderBy: { createdAt: "asc" },
    include: { product: true, part: true },
  });

  if (transactions.length === 0) return null;

  // Check if this is a produced lot
  const producedTx = transactions.find((t) => t.transactionType === "PRODUCED");

  // Build root node
  const firstTx = transactions[0];
  const rootNode: TraceabilityNode = {
    lotNumber,
    partId: firstTx.partId || undefined,
    partNumber: firstTx.part?.partNumber,
    partName: firstTx.part?.name,
    productId: producedTx?.productId || undefined,
    productSku: producedTx?.product?.sku,
    productName: producedTx?.product?.name,
    quantity: producedTx?.quantity || transactions
      .filter((t) => t.transactionType === "RECEIVED")
      .reduce((sum, t) => sum + t.quantity, 0),
    type: producedTx ? "product" : "part",
    status: producedTx ? "produced" : "released",
    children: [],
    documents: [],
    quality: { ncrCount: 0 },
  };

  // WO document
  if (producedTx?.workOrderId) {
    const wo = await prisma.workOrder.findUnique({
      where: { id: producedTx.workOrderId },
      select: { woNumber: true, createdAt: true },
    });
    if (wo) {
      rootNode.documents.push({
        type: "Work Order",
        number: wo.woNumber,
        date: wo.createdAt,
      });
    }
  }

  // NCRs
  const ncrs = await prisma.nCR.findMany({
    where: { lotNumber },
    select: { ncrNumber: true },
  });
  rootNode.quality.ncrCount = ncrs.length;
  if (ncrs.length > 0) {
    rootNode.quality.ncrNumbers = ncrs.map((n) => n.ncrNumber);
  }

  if (!producedTx || !producedTx.parentLots) {
    // This is a raw material lot — try to get supplier info
    const poTx = transactions.find((t) => t.poId);
    if (poTx?.poId) {
      const po = await prisma.purchaseOrder.findUnique({
        where: { id: poTx.poId },
        include: { supplier: { select: { id: true, name: true, code: true } } },
      });
      if (po) {
        rootNode.supplier = {
          supplierId: po.supplier.id,
          supplierName: po.supplier.name,
          supplierCode: po.supplier.code,
        };
        rootNode.documents.push({
          type: "PO",
          number: po.poNumber,
          date: po.orderDate,
          detail: `${po.supplier.name}`,
        });
      }
    }

    // Inspection
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

    return rootNode;
  }

  // --- Recurse into parent lots (multi-level) ---
  const parentLots = producedTx.parentLots as Array<{
    lotNumber: string;
    partId: string;
    quantity: number;
  }>;

  for (const parent of parentLots) {
    const parentNode = await getBackwardTraceability(
      parent.lotNumber,
      depth + 1,
      maxDepth
    );
    if (parentNode) {
      rootNode.children.push(parentNode);
    }
  }

  return rootNode;
}

/**
 * Get lot summary with full transaction history.
 */
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

/**
 * Recall analysis: Given a defective lot, find ALL affected products, customers, and orders.
 */
export async function getRecallImpact(lotNumber: string) {
  const forward = await getForwardTraceability(lotNumber);
  if (!forward) return null;

  const affectedProducts: Array<{ productName: string; lotNumber: string; quantity: number }> = [];
  const affectedCustomers: Array<{ customerName: string; shipmentNumber: string; shippedAt?: Date }> = [];
  const affectedOrders: Array<{ orderNumber: string; type: string }> = [];

  function collectImpact(node: TraceabilityNode) {
    if (node.type === "product") {
      affectedProducts.push({
        productName: node.productName || node.lotNumber,
        lotNumber: node.lotNumber,
        quantity: node.quantity,
      });
    }
    if (node.customer?.customerName) {
      affectedCustomers.push({
        customerName: node.customer.customerName,
        shipmentNumber: node.documents.find((d) => d.type === "Shipment")?.number || "",
        shippedAt: node.customer.shippedAt,
      });
    }
    for (const doc of node.documents) {
      if (doc.type === "Sales Order" || doc.type === "Work Order") {
        affectedOrders.push({ orderNumber: doc.number, type: doc.type });
      }
    }
    for (const child of node.children) {
      collectImpact(child);
    }
  }

  collectImpact(forward);

  return {
    sourceLot: lotNumber,
    sourcePart: forward.partNumber || forward.productSku,
    supplier: forward.supplier,
    affectedProducts,
    affectedCustomers,
    affectedOrders,
    totalImpact: {
      products: affectedProducts.length,
      customers: affectedCustomers.length,
      orders: affectedOrders.length,
    },
  };
}
