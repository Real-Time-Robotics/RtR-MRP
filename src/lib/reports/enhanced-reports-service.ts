// src/lib/reports/enhanced-reports-service.ts
// R21: Enhanced reports — Inventory, Production, and Sales analytical reports

import { prisma } from "@/lib/prisma";

// ============ INVENTORY REPORTS ============

interface InventoryValuationReport {
  generatedAt: Date;
  totalValue: number;
  totalItems: number;
  byWarehouse: Array<{
    warehouseCode: string;
    warehouseName: string;
    itemCount: number;
    totalValue: number;
    percentOfTotal: number;
  }>;
  byCategory: Array<{
    category: string;
    itemCount: number;
    totalValue: number;
    percentOfTotal: number;
  }>;
  byABCClass: Array<{
    abcClass: string;
    itemCount: number;
    totalValue: number;
    percentOfTotal: number;
  }>;
  topItems: Array<{
    partNumber: string;
    partName: string;
    quantity: number;
    unitCost: number;
    totalValue: number;
    warehouseCode: string;
    abcClass: string | null;
  }>;
}

/**
 * Generate a comprehensive inventory valuation report.
 */
export async function generateInventoryValuationReport(
  warehouseId?: string,
  topN: number = 20
): Promise<InventoryValuationReport> {
  const whereClause: Record<string, unknown> = { quantity: { gt: 0 } };
  if (warehouseId) whereClause.warehouseId = warehouseId;

  const inventory = await prisma.inventory.findMany({
    where: whereClause,
    include: {
      part: { select: { partNumber: true, name: true, category: true, unitCost: true, abcClass: true } },
      warehouse: { select: { code: true, name: true } },
    },
  });

  let totalValue = 0;
  const warehouseMap = new Map<string, { code: string; name: string; count: number; value: number }>();
  const categoryMap = new Map<string, { count: number; value: number }>();
  const abcMap = new Map<string, { count: number; value: number }>();

  const itemValues: Array<{
    partNumber: string;
    partName: string;
    quantity: number;
    unitCost: number;
    totalValue: number;
    warehouseCode: string;
    abcClass: string | null;
  }> = [];

  for (const inv of inventory) {
    const value = inv.quantity * inv.part.unitCost;
    totalValue += value;

    // By warehouse
    const wKey = inv.warehouse.code;
    const wEntry = warehouseMap.get(wKey) || { code: wKey, name: inv.warehouse.name, count: 0, value: 0 };
    wEntry.count++;
    wEntry.value += value;
    warehouseMap.set(wKey, wEntry);

    // By category
    const cat = inv.part.category || "UNCATEGORIZED";
    const cEntry = categoryMap.get(cat) || { count: 0, value: 0 };
    cEntry.count++;
    cEntry.value += value;
    categoryMap.set(cat, cEntry);

    // By ABC class
    const abc = inv.part.abcClass || "Unclassified";
    const aEntry = abcMap.get(abc) || { count: 0, value: 0 };
    aEntry.count++;
    aEntry.value += value;
    abcMap.set(abc, aEntry);

    itemValues.push({
      partNumber: inv.part.partNumber,
      partName: inv.part.name,
      quantity: inv.quantity,
      unitCost: inv.part.unitCost,
      totalValue: value,
      warehouseCode: inv.warehouse.code,
      abcClass: inv.part.abcClass,
    });
  }

  // Sort items by value descending
  itemValues.sort((a, b) => b.totalValue - a.totalValue);

  return {
    generatedAt: new Date(),
    totalValue,
    totalItems: inventory.length,
    byWarehouse: Array.from(warehouseMap.values())
      .map((w) => ({
        warehouseCode: w.code,
        warehouseName: w.name,
        itemCount: w.count,
        totalValue: w.value,
        percentOfTotal: totalValue > 0 ? (w.value / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue),
    byCategory: Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        itemCount: data.count,
        totalValue: data.value,
        percentOfTotal: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue),
    byABCClass: Array.from(abcMap.entries())
      .map(([abcClass, data]) => ({
        abcClass,
        itemCount: data.count,
        totalValue: data.value,
        percentOfTotal: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue),
    topItems: itemValues.slice(0, topN),
  };
}

// ============ PRODUCTION REPORTS ============

interface ProductionPerformanceReport {
  generatedAt: Date;
  period: { from: Date; to: Date };
  totalWOs: number;
  completedWOs: number;
  onTimeCompletion: number;
  averageLeadTime: number; // days
  totalProduced: number;
  totalScrapped: number;
  scrapRate: number;
  byProduct: Array<{
    productName: string;
    sku: string;
    woCount: number;
    totalQuantity: number;
    completedQty: number;
    scrappedQty: number;
    avgLeadTimeDays: number;
    onTimePercent: number;
  }>;
  byMonth: Array<{
    month: string;
    woCount: number;
    completedQty: number;
    scrappedQty: number;
  }>;
}

/**
 * Generate a production performance report for a given period.
 */
export async function generateProductionReport(
  fromDate: Date,
  toDate: Date
): Promise<ProductionPerformanceReport> {
  const workOrders = await prisma.workOrder.findMany({
    where: {
      createdAt: { gte: fromDate, lte: toDate },
    },
    include: {
      product: { select: { name: true, sku: true } },
    },
  });

  let completedWOs = 0;
  let onTimeWOs = 0;
  let totalLeadTimeDays = 0;
  let totalProduced = 0;
  let totalScrapped = 0;
  let leadTimeCount = 0;

  const productMap = new Map<
    string,
    {
      name: string;
      sku: string;
      woCount: number;
      totalQty: number;
      completedQty: number;
      scrappedQty: number;
      leadTimeDays: number[];
      onTime: number;
      total: number;
    }
  >();

  const monthMap = new Map<string, { woCount: number; completedQty: number; scrappedQty: number }>();

  for (const wo of workOrders) {
    const monthKey = `${wo.createdAt.getFullYear()}-${String(wo.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const mEntry = monthMap.get(monthKey) || { woCount: 0, completedQty: 0, scrappedQty: 0 };
    mEntry.woCount++;
    mEntry.completedQty += wo.completedQty;
    mEntry.scrappedQty += wo.scrapQty;
    monthMap.set(monthKey, mEntry);

    totalProduced += wo.completedQty;
    totalScrapped += wo.scrapQty;

    if (wo.status === "completed" || wo.status === "closed") {
      completedWOs++;

      if (wo.actualEnd && wo.actualStart) {
        const leadTime = (wo.actualEnd.getTime() - wo.actualStart.getTime()) / (1000 * 60 * 60 * 24);
        totalLeadTimeDays += leadTime;
        leadTimeCount++;
      }

      if (wo.actualEnd && wo.plannedEnd && wo.actualEnd <= wo.plannedEnd) {
        onTimeWOs++;
      }
    }

    // By product
    const pKey = wo.productId;
    const pEntry = productMap.get(pKey) || {
      name: wo.product.name,
      sku: wo.product.sku,
      woCount: 0,
      totalQty: 0,
      completedQty: 0,
      scrappedQty: 0,
      leadTimeDays: [],
      onTime: 0,
      total: 0,
    };
    pEntry.woCount++;
    pEntry.totalQty += wo.quantity;
    pEntry.completedQty += wo.completedQty;
    pEntry.scrappedQty += wo.scrapQty;
    pEntry.total++;

    if (wo.actualEnd && wo.actualStart) {
      pEntry.leadTimeDays.push(
        (wo.actualEnd.getTime() - wo.actualStart.getTime()) / (1000 * 60 * 60 * 24)
      );
    }
    if (wo.actualEnd && wo.plannedEnd && wo.actualEnd <= wo.plannedEnd) {
      pEntry.onTime++;
    }

    productMap.set(pKey, pEntry);
  }

  return {
    generatedAt: new Date(),
    period: { from: fromDate, to: toDate },
    totalWOs: workOrders.length,
    completedWOs,
    onTimeCompletion: completedWOs > 0 ? (onTimeWOs / completedWOs) * 100 : 0,
    averageLeadTime: leadTimeCount > 0 ? totalLeadTimeDays / leadTimeCount : 0,
    totalProduced,
    totalScrapped,
    scrapRate: totalProduced + totalScrapped > 0 ? (totalScrapped / (totalProduced + totalScrapped)) * 100 : 0,
    byProduct: Array.from(productMap.values())
      .map((p) => ({
        productName: p.name,
        sku: p.sku,
        woCount: p.woCount,
        totalQuantity: p.totalQty,
        completedQty: p.completedQty,
        scrappedQty: p.scrappedQty,
        avgLeadTimeDays:
          p.leadTimeDays.length > 0
            ? p.leadTimeDays.reduce((a, b) => a + b, 0) / p.leadTimeDays.length
            : 0,
        onTimePercent: p.total > 0 ? (p.onTime / p.total) * 100 : 0,
      }))
      .sort((a, b) => b.woCount - a.woCount),
    byMonth: Array.from(monthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  };
}

// ============ SALES REPORTS ============

interface SalesAnalyticsReport {
  generatedAt: Date;
  period: { from: Date; to: Date };
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  fulfillmentRate: number;
  byCustomer: Array<{
    customerName: string;
    customerCode: string;
    orderCount: number;
    totalRevenue: number;
    percentOfTotal: number;
  }>;
  byProduct: Array<{
    productName: string;
    sku: string;
    unitsSold: number;
    revenue: number;
    averagePrice: number;
  }>;
  byMonth: Array<{
    month: string;
    orderCount: number;
    revenue: number;
    avgOrderValue: number;
  }>;
  topOrders: Array<{
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    status: string;
    orderDate: Date;
  }>;
}

/**
 * Generate a comprehensive sales analytics report.
 */
export async function generateSalesReport(
  fromDate: Date,
  toDate: Date,
  topN: number = 10
): Promise<SalesAnalyticsReport> {
  const orders = await prisma.salesOrder.findMany({
    where: {
      orderDate: { gte: fromDate, lte: toDate },
      status: { not: "cancelled" },
    },
    include: {
      customer: { select: { name: true, code: true } },
      lines: {
        include: { product: { select: { name: true, sku: true } } },
      },
    },
    orderBy: { orderDate: "asc" },
  });

  let totalRevenue = 0;
  let fullyShippedOrders = 0;

  const customerMap = new Map<string, { name: string; code: string; orders: number; revenue: number }>();
  const productMap = new Map<string, { name: string; sku: string; units: number; revenue: number }>();
  const monthMap = new Map<string, { orders: number; revenue: number }>();

  for (const order of orders) {
    const orderValue = order.totalAmount || 0;
    totalRevenue += orderValue;

    if (order.status === "shipped" || order.status === "delivered") {
      fullyShippedOrders++;
    }

    // By customer
    const cKey = order.customerId;
    const cEntry = customerMap.get(cKey) || { name: order.customer.name, code: order.customer.code, orders: 0, revenue: 0 };
    cEntry.orders++;
    cEntry.revenue += orderValue;
    customerMap.set(cKey, cEntry);

    // By month
    const mKey = `${order.orderDate.getFullYear()}-${String(order.orderDate.getMonth() + 1).padStart(2, "0")}`;
    const mEntry = monthMap.get(mKey) || { orders: 0, revenue: 0 };
    mEntry.orders++;
    mEntry.revenue += orderValue;
    monthMap.set(mKey, mEntry);

    // By product (from lines)
    for (const line of order.lines) {
      const pKey = line.productId;
      const pEntry = productMap.get(pKey) || { name: line.product.name, sku: line.product.sku, units: 0, revenue: 0 };
      pEntry.units += line.quantity;
      pEntry.revenue += line.lineTotal || line.quantity * line.unitPrice;
      productMap.set(pKey, pEntry);
    }
  }

  // Top orders by value
  const sortedOrders = [...orders].sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));

  return {
    generatedAt: new Date(),
    period: { from: fromDate, to: toDate },
    totalOrders: orders.length,
    totalRevenue,
    averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
    fulfillmentRate: orders.length > 0 ? (fullyShippedOrders / orders.length) * 100 : 0,
    byCustomer: Array.from(customerMap.values())
      .map((c) => ({
        customerName: c.name,
        customerCode: c.code,
        orderCount: c.orders,
        totalRevenue: c.revenue,
        percentOfTotal: totalRevenue > 0 ? (c.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue),
    byProduct: Array.from(productMap.values())
      .map((p) => ({
        productName: p.name,
        sku: p.sku,
        unitsSold: p.units,
        revenue: p.revenue,
        averagePrice: p.units > 0 ? p.revenue / p.units : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue),
    byMonth: Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        orderCount: data.orders,
        revenue: data.revenue,
        avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    topOrders: sortedOrders.slice(0, topN).map((o) => ({
      orderNumber: o.orderNumber,
      customerName: o.customer.name,
      totalAmount: o.totalAmount || 0,
      status: o.status,
      orderDate: o.orderDate,
    })),
  };
}

/**
 * Generate an inventory turnover report.
 * Turnover = COGS / Average Inventory Value
 */
export async function generateInventoryTurnoverReport(
  fromDate: Date,
  toDate: Date
): Promise<
  Array<{
    partNumber: string;
    partName: string;
    abcClass: string | null;
    currentStock: number;
    issuedQty: number;
    averageStock: number;
    turnoverRatio: number;
    daysOfSupply: number;
  }>
> {
  const parts = await prisma.part.findMany({
    where: { status: "active" },
    select: {
      id: true,
      partNumber: true,
      name: true,
      abcClass: true,
      unitCost: true,
    },
  });

  const results = [];

  for (const part of parts) {
    // Current stock
    const currentStockAgg = await prisma.inventory.aggregate({
      where: { partId: part.id },
      _sum: { quantity: true },
    });
    const currentStock = currentStockAgg._sum.quantity || 0;

    // Total issued in period
    const issuedAgg = await prisma.lotTransaction.aggregate({
      where: {
        partId: part.id,
        transactionType: { in: ["ISSUED", "CONSUMED", "SHIPPED"] },
        createdAt: { gte: fromDate, lte: toDate },
      },
      _sum: { quantity: true },
    });
    const issuedQty = issuedAgg._sum.quantity || 0;

    if (currentStock === 0 && issuedQty === 0) continue;

    // Average stock (approximation: (current + current + issued) / 2)
    const averageStock = (currentStock + currentStock + issuedQty) / 2;

    // Turnover ratio
    const periodDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    const annualizedIssued = periodDays > 0 ? (issuedQty / periodDays) * 365 : 0;
    const turnoverRatio = averageStock > 0 ? annualizedIssued / averageStock : 0;

    // Days of supply
    const dailyUsage = periodDays > 0 ? issuedQty / periodDays : 0;
    const daysOfSupply = dailyUsage > 0 ? currentStock / dailyUsage : 999;

    results.push({
      partNumber: part.partNumber,
      partName: part.name,
      abcClass: part.abcClass,
      currentStock,
      issuedQty,
      averageStock: Math.round(averageStock),
      turnoverRatio: Math.round(turnoverRatio * 100) / 100,
      daysOfSupply: Math.round(daysOfSupply),
    });
  }

  return results.sort((a, b) => b.turnoverRatio - a.turnoverRatio);
}
