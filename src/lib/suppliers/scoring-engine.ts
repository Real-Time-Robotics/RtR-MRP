// =============================================================================
// SUPPLIER SCORING ENGINE
// Calculates 4 KPIs: Delivery (30%), Quality (30%), Price (25%), Response (15%)
// =============================================================================

import { prisma } from '@/lib/prisma';

const WEIGHTS = {
  delivery: 0.30,
  quality: 0.30,
  price: 0.25,
  response: 0.15,
};

export interface ScoreResult {
  deliveryScore: number;
  qualityScore: number;
  priceScore: number;
  responseScore: number;
  overallScore: number;
  stats: {
    totalOrders: number;
    onTimeOrders: number;
    lateOrders: number;
    totalItems: number;
    acceptedItems: number;
    rejectedItems: number;
    avgLeadTimeDays: number | null;
    avgPriceVariance: number | null;
  };
}

export async function calculateSupplierScore(
  supplierId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<ScoreResult> {
  // 1. Get POs in period with GRNs and lines
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: {
      supplierId,
      orderDate: { gte: periodStart, lte: periodEnd },
      status: { in: ['received', 'closed', 'partially_received'] },
    },
    include: {
      grns: {
        include: { items: true },
      },
      lines: true,
    },
  });

  if (purchaseOrders.length === 0) {
    return {
      deliveryScore: 0,
      qualityScore: 0,
      priceScore: 0,
      responseScore: 0,
      overallScore: 0,
      stats: {
        totalOrders: 0,
        onTimeOrders: 0,
        lateOrders: 0,
        totalItems: 0,
        acceptedItems: 0,
        rejectedItems: 0,
        avgLeadTimeDays: null,
        avgPriceVariance: null,
      },
    };
  }

  // 2. Delivery Score: on-time vs late
  let onTimeOrders = 0;
  let lateOrders = 0;
  const leadTimes: number[] = [];

  for (const po of purchaseOrders) {
    const expectedDate = new Date(po.expectedDate);

    // Find earliest GRN date for this PO
    const sortedGrns = [...po.grns].sort(
      (a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime()
    );
    const firstGRN = sortedGrns[0];

    if (firstGRN) {
      const grnDate = new Date(firstGRN.receivedDate);

      if (grnDate <= expectedDate) {
        onTimeOrders++;
      } else {
        lateOrders++;
      }

      // Lead time: PO creation → first GRN
      const leadTime = Math.ceil(
        (grnDate.getTime() - new Date(po.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      leadTimes.push(leadTime);
    }
  }

  const totalOrders = purchaseOrders.length;
  const deliveredOrders = onTimeOrders + lateOrders;
  const deliveryScore = deliveredOrders > 0
    ? (onTimeOrders / deliveredOrders) * 100
    : 0;

  const avgLeadTimeDays = leadTimes.length > 0
    ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
    : null;

  // 3. Quality Score: accepted / received
  let totalItems = 0;
  let acceptedItems = 0;
  let rejectedItems = 0;

  for (const po of purchaseOrders) {
    for (const grn of po.grns) {
      for (const item of grn.items) {
        totalItems += item.quantityReceived;
        acceptedItems += item.quantityAccepted;
        rejectedItems += item.quantityRejected;
      }
    }
  }

  const qualityScore = totalItems > 0
    ? (acceptedItems / totalItems) * 100
    : 0;

  // 4. Price Score: compare to average across all suppliers
  const priceVariances: number[] = [];

  for (const po of purchaseOrders) {
    for (const line of po.lines) {
      const benchmark = await prisma.purchaseOrderLine.aggregate({
        where: {
          partId: line.partId,
          po: {
            orderDate: { gte: periodStart, lte: periodEnd },
          },
        },
        _avg: { unitPrice: true },
      });

      if (benchmark._avg.unitPrice && benchmark._avg.unitPrice > 0) {
        const variance = ((line.unitPrice - benchmark._avg.unitPrice) / benchmark._avg.unitPrice) * 100;
        priceVariances.push(variance);
      }
    }
  }

  const avgPriceVariance = priceVariances.length > 0
    ? priceVariances.reduce((a, b) => a + b, 0) / priceVariances.length
    : null;

  // Lower variance (cheaper) = higher score. 0% variance = 100, +10% = 90, -10% = 110 (capped at 100)
  const priceScore = avgPriceVariance !== null
    ? Math.max(0, Math.min(100, 100 - avgPriceVariance))
    : 50;

  // 5. Response Score: proxy from lead time (no acknowledgment tracking yet)
  // 7 days = 100, each additional day = -5 points
  const responseScore = avgLeadTimeDays !== null
    ? Math.max(0, Math.min(100, 100 - (avgLeadTimeDays - 7) * 5))
    : 50;

  // 6. Weighted overall
  const overallScore =
    deliveryScore * WEIGHTS.delivery +
    qualityScore * WEIGHTS.quality +
    priceScore * WEIGHTS.price +
    responseScore * WEIGHTS.response;

  return {
    deliveryScore: Math.round(deliveryScore * 100) / 100,
    qualityScore: Math.round(qualityScore * 100) / 100,
    priceScore: Math.round(priceScore * 100) / 100,
    responseScore: Math.round(responseScore * 100) / 100,
    overallScore: Math.round(overallScore * 100) / 100,
    stats: {
      totalOrders,
      onTimeOrders,
      lateOrders,
      totalItems,
      acceptedItems,
      rejectedItems,
      avgLeadTimeDays: avgLeadTimeDays !== null ? Math.round(avgLeadTimeDays * 10) / 10 : null,
      avgPriceVariance: avgPriceVariance !== null ? Math.round(avgPriceVariance * 100) / 100 : null,
    },
  };
}
