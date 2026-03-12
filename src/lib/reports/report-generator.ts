// src/lib/reports/report-generator.ts
// Report Data Generator - Queries real database data for each report template

import prisma from '@/lib/prisma';
import { ReportTemplateConfig, getReportTemplate } from './report-templates';

export interface ReportData {
  template: ReportTemplateConfig;
  generatedAt: Date;
  filters?: Record<string, unknown>;
  summary: {
    totalRows: number;
    highlights: { label: string; value: string | number }[];
  };
  rows: Record<string, unknown>[];
}

type GeneratorResult = {
  rows: Record<string, unknown>[];
  highlights: { label: string; value: string | number }[];
};

export async function generateReportData(
  templateId: string,
  filters?: Record<string, unknown>
): Promise<ReportData> {
  const template = getReportTemplate(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  let result: GeneratorResult;

  switch (templateId) {
    case 'inventory-summary':
      result = await generateInventorySummary();
      break;
    case 'low-stock-alert':
      result = await generateLowStockAlert();
      break;
    case 'po-summary':
      result = await generatePOSummary();
      break;
    case 'production-status':
      result = await generateProductionStatus();
      break;
    case 'supplier-performance':
      result = await generateSupplierPerformance();
      break;
    case 'quality-report':
      result = await generateQualityReport();
      break;
    default:
      throw new Error(`No generator for template: ${templateId}`);
  }

  return {
    template,
    generatedAt: new Date(),
    filters,
    summary: {
      totalRows: result.rows.length,
      highlights: result.highlights,
    },
    rows: result.rows,
  };
}

async function generateInventorySummary(): Promise<GeneratorResult> {
  const parts = await prisma.part.findMany({
    include: {
      inventory: {
        include: { warehouse: true },
      },
    },
    orderBy: { partNumber: 'asc' },
  });

  let totalValue = 0;
  let lowStockCount = 0;

  const rows: Record<string, unknown>[] = parts.map((part) => {
    const totalQty = part.inventory.reduce((sum: number, inv) => sum + inv.quantity, 0);
    const value = totalQty * (part.unitCost || 0);
    totalValue += value;

    const isLowStock = part.reorderPoint > 0 && totalQty < part.reorderPoint;
    if (isLowStock) lowStockCount++;

    return {
      partNumber: part.partNumber,
      name: part.name,
      category: part.category || '-',
      quantityOnHand: totalQty,
      unit: part.unit || 'PCS',
      unitCost: part.unitCost || 0,
      totalValue: value,
      reorderPoint: part.reorderPoint || 0,
      status: isLowStock ? 'Sap het' : 'Du hang',
    };
  });

  return {
    rows,
    highlights: [
      { label: 'Tong SKU', value: parts.length },
      { label: 'Tong gia tri', value: `${totalValue.toLocaleString('vi-VN')} VND` },
      { label: 'Sap het hang', value: lowStockCount },
    ],
  };
}

async function generateLowStockAlert(): Promise<GeneratorResult> {
  const parts = await prisma.part.findMany({
    where: {
      reorderPoint: { gt: 0 },
    },
    include: {
      inventory: true,
      partSuppliers: {
        include: { supplier: true },
        take: 1,
        orderBy: { isPreferred: 'desc' },
      },
    },
  });

  const lowStockParts = parts.filter((part) => {
    const totalQty = part.inventory.reduce((sum: number, inv) => sum + inv.quantity, 0);
    return totalQty < part.reorderPoint;
  });

  const rows: Record<string, unknown>[] = lowStockParts.map((part) => {
    const totalQty = part.inventory.reduce((sum: number, inv) => sum + inv.quantity, 0);
    const shortage = part.reorderPoint - totalQty;
    const primarySupplier = part.partSuppliers[0]?.supplier;

    return {
      partNumber: part.partNumber,
      name: part.name,
      quantityOnHand: totalQty,
      reorderPoint: part.reorderPoint,
      shortage,
      primarySupplier: primarySupplier?.name || '-',
    };
  });

  const outOfStock = lowStockParts.filter((p) => {
    const qty = p.inventory.reduce((sum: number, inv) => sum + inv.quantity, 0);
    return qty === 0;
  }).length;

  return {
    rows,
    highlights: [
      { label: 'Tong SP thieu', value: lowStockParts.length },
      { label: 'Het hang hoan toan', value: outOfStock },
    ],
  };
}

async function generatePOSummary(): Promise<GeneratorResult> {
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    include: {
      supplier: true,
      lines: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  let totalValue = 0;
  const statusCounts: Record<string, number> = {};

  const rows: Record<string, unknown>[] = purchaseOrders.map((po) => {
    const value = po.totalAmount || po.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    totalValue += value;
    statusCounts[po.status] = (statusCounts[po.status] || 0) + 1;

    const receivedQty = po.lines.reduce((sum, line) => sum + (line.receivedQty || 0), 0);
    const totalQty = po.lines.reduce((sum, line) => sum + line.quantity, 0);
    const receivedPercent = totalQty > 0 ? (receivedQty / totalQty) * 100 : 0;

    return {
      poNumber: po.poNumber,
      supplierName: po.supplier?.name || '-',
      orderDate: po.orderDate,
      totalAmount: value,
      status: po.status,
      expectedDate: po.expectedDate,
      receivedPercent: Math.round(receivedPercent * 10) / 10,
    };
  });

  return {
    rows,
    highlights: [
      { label: 'Tong PO', value: purchaseOrders.length },
      { label: 'Tong gia tri', value: `${totalValue.toLocaleString('vi-VN')} VND` },
      { label: 'Dang cho', value: statusCounts['draft'] || statusCounts['pending'] || 0 },
    ],
  };
}

async function generateProductionStatus(): Promise<GeneratorResult> {
  const workOrders = await prisma.workOrder.findMany({
    include: {
      product: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const statusCounts: Record<string, number> = {};

  const rows: Record<string, unknown>[] = workOrders.map((wo) => {
    statusCounts[wo.status] = (statusCounts[wo.status] || 0) + 1;
    const progress = wo.quantity > 0 ? ((wo.completedQty || 0) / wo.quantity) * 100 : 0;

    return {
      woNumber: wo.woNumber,
      productName: wo.product?.name || '-',
      plannedQty: wo.quantity,
      completedQty: wo.completedQty || 0,
      progress: Math.round(progress * 10) / 10,
      status: wo.status,
    };
  });

  return {
    rows,
    highlights: [
      { label: 'Tong WO', value: workOrders.length },
      { label: 'Dang san xuat', value: statusCounts['in_progress'] || statusCounts['IN_PROGRESS'] || 0 },
      { label: 'Hoan thanh', value: statusCounts['completed'] || statusCounts['COMPLETED'] || 0 },
    ],
  };
}

async function generateSupplierPerformance(): Promise<GeneratorResult> {
  const suppliers = await prisma.supplier.findMany({
    include: {
      purchaseOrders: {
        include: { lines: true },
      },
    },
  });

  const rows: Record<string, unknown>[] = suppliers
    .map((supplier) => {
      const pos = supplier.purchaseOrders;
      if (pos.length === 0) return null;

      const totalValue = pos.reduce(
        (sum, po) =>
          sum + (po.totalAmount || po.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)),
        0
      );

      const completedPOs = pos.filter((po) =>
        ['completed', 'received', 'COMPLETED', 'RECEIVED'].includes(po.status)
      );
      // Calculate on-time rate from actual delivery data
      const deliveredWithDate = completedPOs.filter(po => po.expectedDate);
      const onTimePOs = deliveredWithDate.filter(po => po.updatedAt <= po.expectedDate);
      const onTimeRate = deliveredWithDate.length > 0
        ? Math.round((onTimePOs.length / deliveredWithDate.length) * 1000) / 10
        : (completedPOs.length > 0 ? 100 : 0);
      // Calculate quality rate from inspection/line acceptance data
      const allLines = pos.flatMap(po => po.lines || []);
      const acceptedLines = allLines.filter(l => l.receivedQty && l.receivedQty > 0);
      const qualityRate = allLines.length > 0
        ? Math.round((acceptedLines.length / allLines.length) * 1000) / 10
        : 100;
      const score = Math.round((onTimeRate + qualityRate) / 2);

      return {
        supplierName: supplier.name,
        poCount: pos.length,
        onTimeRate,
        qualityRate,
        avgPrice: Math.round(totalValue / Math.max(pos.length, 1)),
        score,
      } as Record<string, unknown>;
    })
    .filter((r): r is Record<string, unknown> => r !== null);

  rows.sort((a, b) => (b.score as number) - (a.score as number));

  return {
    rows,
    highlights: [
      { label: 'Tong NCC', value: rows.length },
      { label: 'NCC tot nhat', value: (rows[0]?.supplierName as string) || '-' },
    ],
  };
}

async function generateQualityReport(): Promise<GeneratorResult> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  const [totalNCRs, openNCRs, recentNCRs, inspections] = await Promise.all([
    prisma.nCR.count(),
    prisma.nCR.count({ where: { status: 'open' } }),
    prisma.nCR.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.inspection.findMany({
      where: { createdAt: { gte: monthAgo } },
      select: { result: true, createdAt: true },
    }),
  ]);

  const passCount = inspections.filter((i) =>
    ['pass', 'PASS', 'passed', 'PASSED', 'accept', 'ACCEPT'].includes(i.result || '')
  ).length;
  const failCount = inspections.filter((i) =>
    ['fail', 'FAIL', 'failed', 'FAILED', 'reject', 'REJECT'].includes(i.result || '')
  ).length;
  const passRate = inspections.length > 0 ? (passCount / inspections.length) * 100 : 0;

  const rows: Record<string, unknown>[] = [
    {
      period: 'Tuan nay',
      inspectionCount: inspections.filter((i) => i.createdAt >= weekAgo).length,
      passCount,
      failCount,
      passRate: Math.round(passRate * 10) / 10,
      topDefects: '-',
    },
  ];

  return {
    rows,
    highlights: [
      { label: 'Tong NCR', value: totalNCRs },
      { label: 'NCR mo', value: openNCRs },
      { label: 'NCR tuan nay', value: recentNCRs },
      { label: 'Ty le dat', value: `${Math.round(passRate)}%` },
    ],
  };
}
