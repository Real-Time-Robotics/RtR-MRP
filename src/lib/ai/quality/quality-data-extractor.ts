// =============================================================================
// QUALITY DATA EXTRACTOR
// Extracts and prepares quality data for AI analysis
// =============================================================================

import { prisma } from '@/lib/prisma';

// =============================================================================
// TYPES
// =============================================================================

export interface InspectionHistoryPoint {
  id: string;
  inspectionNumber: string;
  date: Date;
  type: string;
  result: string | null;
  quantityInspected: number | null;
  quantityAccepted: number | null;
  quantityRejected: number | null;
  lotNumber: string | null;
  supplierId: string | null;
  supplierName: string | null;
  defectCount: number;
  criticalDefects: number;
  characteristics: InspectionCharacteristicResult[];
}

export interface InspectionCharacteristicResult {
  name: string;
  type: string;
  result: string;
  measuredValue: number | null;
  nominalValue: number | null;
  upperLimit: number | null;
  lowerLimit: number | null;
  isCritical: boolean;
  deviation: number | null;
}

export interface NCRHistoryPoint {
  id: string;
  ncrNumber: string;
  createdAt: Date;
  closedAt: Date | null;
  status: string;
  priority: string;
  source: string;
  defectCategory: string | null;
  defectCode: string | null;
  quantityAffected: number;
  partId: string | null;
  partSku: string | null;
  supplierId: string | null;
  supplierName: string | null;
  disposition: string | null;
  daysOpen: number;
  preliminaryCause: string | null;
  rootCause: string | null;
}

export interface SupplierQualityData {
  supplierId: string;
  supplierName: string;
  totalLots: number;
  acceptedLots: number;
  rejectedLots: number;
  acceptanceRate: number;
  totalNCRs: number;
  openNCRs: number;
  avgDaysToResolve: number;
  defectCategories: { category: string; count: number }[];
  qualityTrend: QualityTrendData[];
  lastInspectionDate: Date | null;
  qualityScore: number;
}

export interface LotQualityData {
  lotNumber: string;
  partId: string | null;
  partSku: string | null;
  supplierId: string | null;
  supplierName: string | null;
  receivedDate: Date | null;
  quantity: number;
  inspectionResult: string | null;
  inspectionDate: Date | null;
  defectCount: number;
  ncrCount: number;
  disposition: string | null;
  status: string;
  transactions: LotTransaction[];
}

export interface LotTransaction {
  type: string;
  quantity: number;
  date: Date;
  notes: string | null;
}

export interface QualityTrendData {
  period: string;
  totalInspections: number;
  passCount: number;
  failCount: number;
  firstPassYield: number;
  ncrCount: number;
  avgDefectsPerLot: number;
}

export interface PartQualitySummary {
  partId: string;
  partSku: string;
  partName: string;
  totalInspections: number;
  passCount: number;
  failCount: number;
  firstPassYield: number;
  totalNCRs: number;
  openNCRs: number;
  topDefects: { category: string; count: number }[];
  supplierQuality: { supplierId: string; supplierName: string; acceptanceRate: number }[];
  qualityTrend: QualityTrendData[];
}

// =============================================================================
// QUALITY DATA EXTRACTOR CLASS
// =============================================================================

export class QualityDataExtractor {
  /**
   * Extract inspection history for a part
   */
  async extractInspectionHistory(
    partId: string,
    months: number = 12
  ): Promise<InspectionHistoryPoint[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const inspections = await prisma.inspection.findMany({
      where: {
        partId,
        createdAt: { gte: startDate },
        status: 'completed',
      },
      include: {
        part: {
          include: {
            partSuppliers: {
              include: { supplier: true },
              take: 1,
            },
          },
        },
        results: {
          include: {
            characteristic: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return inspections.map((insp) => {
      const defectCount = insp.results.filter((r) => r.result === 'FAIL').length;
      const criticalDefects = insp.results.filter(
        (r) => r.result === 'FAIL' && r.characteristic.isCritical
      ).length;

      const supplier = insp.part?.partSuppliers[0]?.supplier;

      return {
        id: insp.id,
        inspectionNumber: insp.inspectionNumber,
        date: insp.createdAt,
        type: insp.type,
        result: insp.result,
        quantityInspected: insp.quantityInspected,
        quantityAccepted: insp.quantityAccepted,
        quantityRejected: insp.quantityRejected,
        lotNumber: insp.lotNumber,
        supplierId: supplier?.id || null,
        supplierName: supplier?.name || null,
        defectCount,
        criticalDefects,
        characteristics: insp.results.map((r) => ({
          name: r.characteristic.name,
          type: r.characteristic.type,
          result: r.result,
          measuredValue: r.measuredValue,
          nominalValue: r.characteristic.nominalValue,
          upperLimit: r.characteristic.upperLimit,
          lowerLimit: r.characteristic.lowerLimit,
          isCritical: r.characteristic.isCritical,
          deviation: r.measuredValue && r.characteristic.nominalValue
            ? r.measuredValue - r.characteristic.nominalValue
            : null,
        })),
      };
    });
  }

  /**
   * Extract NCR history with filters
   */
  async extractNCRHistory(filters: {
    partId?: string;
    supplierId?: string;
    months?: number;
    status?: string[];
    defectCategory?: string;
  } = {}): Promise<NCRHistoryPoint[]> {
    const { partId, supplierId, months = 12, status, defectCategory } = filters;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const whereClause: Record<string, unknown> = {
      createdAt: { gte: startDate },
    };

    if (partId) whereClause.partId = partId;
    if (status && status.length > 0) whereClause.status = { in: status };
    if (defectCategory) whereClause.defectCategory = defectCategory;

    // If supplierId is provided, need to join through part
    if (supplierId) {
      whereClause.part = {
        partSuppliers: {
          some: { supplierId },
        },
      };
    }

    const ncrs = await prisma.nCR.findMany({
      where: whereClause,
      include: {
        part: {
          include: {
            partSuppliers: {
              include: { supplier: true },
              take: 1,
            },
          },
        },
        capa: {
          select: { rootCause: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ncrs.map((ncr) => {
      const supplier = ncr.part?.partSuppliers[0]?.supplier;
      const closedAt = ncr.status === 'closed' ? ncr.updatedAt : null;
      const daysOpen = closedAt
        ? Math.ceil((closedAt.getTime() - ncr.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : Math.ceil((Date.now() - ncr.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: ncr.id,
        ncrNumber: ncr.ncrNumber,
        createdAt: ncr.createdAt,
        closedAt,
        status: ncr.status,
        priority: ncr.priority,
        source: ncr.source,
        defectCategory: ncr.defectCategory,
        defectCode: ncr.defectCode,
        quantityAffected: ncr.quantityAffected,
        partId: ncr.partId,
        partSku: ncr.part?.partNumber || null,
        supplierId: supplier?.id || null,
        supplierName: supplier?.name || null,
        disposition: ncr.disposition,
        daysOpen,
        preliminaryCause: ncr.preliminaryCause,
        rootCause: ncr.capa?.rootCause || null,
      };
    });
  }

  /**
   * Extract supplier quality data
   */
  async extractSupplierQualityData(
    supplierId: string,
    months: number = 12
  ): Promise<SupplierQualityData | null> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) return null;

    // Get parts supplied by this supplier
    const partSuppliers = await prisma.partSupplier.findMany({
      where: { supplierId },
      select: { partId: true },
    });
    const partIds = partSuppliers.map((ps) => ps.partId);

    // Get inspections for these parts (RECEIVING type)
    const inspections = await prisma.inspection.findMany({
      where: {
        partId: { in: partIds },
        type: 'RECEIVING',
        status: 'completed',
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalLots = inspections.length;
    const acceptedLots = inspections.filter((i) => i.result === 'PASS').length;
    const rejectedLots = inspections.filter((i) => i.result === 'FAIL').length;

    // Get NCRs for this supplier's parts
    const ncrs = await prisma.nCR.findMany({
      where: {
        partId: { in: partIds },
        createdAt: { gte: startDate },
      },
    });

    const openNCRs = ncrs.filter((n) => !['closed', 'voided'].includes(n.status)).length;

    // Calculate avg days to resolve
    const closedNCRs = ncrs.filter((n) => n.status === 'closed');
    const avgDaysToResolve = closedNCRs.length > 0
      ? closedNCRs.reduce((sum, n) => {
          const days = Math.ceil((n.updatedAt.getTime() - n.createdAt.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / closedNCRs.length
      : 0;

    // Defect categories
    const defectCategoryCounts = new Map<string, number>();
    ncrs.forEach((n) => {
      const cat = n.defectCategory || 'Unknown';
      defectCategoryCounts.set(cat, (defectCategoryCounts.get(cat) || 0) + 1);
    });

    const defectCategories = Array.from(defectCategoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Quality trend by month
    const qualityTrend = this.calculateMonthlyQualityTrend(inspections, ncrs, months);

    // Calculate quality score (0-100)
    const acceptanceRate = totalLots > 0 ? (acceptedLots / totalLots) * 100 : 100;
    const ncrPenalty = Math.min(ncrs.length * 2, 30); // Max 30 point penalty
    const resolutionBonus = avgDaysToResolve < 14 ? 5 : avgDaysToResolve < 30 ? 0 : -5;
    const qualityScore = Math.max(0, Math.min(100, acceptanceRate - ncrPenalty + resolutionBonus));

    return {
      supplierId,
      supplierName: supplier.name,
      totalLots,
      acceptedLots,
      rejectedLots,
      acceptanceRate: Math.round(acceptanceRate * 10) / 10,
      totalNCRs: ncrs.length,
      openNCRs,
      avgDaysToResolve: Math.round(avgDaysToResolve * 10) / 10,
      defectCategories,
      qualityTrend,
      lastInspectionDate: inspections[0]?.createdAt || null,
      qualityScore: Math.round(qualityScore),
    };
  }

  /**
   * Extract lot quality data
   */
  async extractLotQualityData(lotNumber: string): Promise<LotQualityData | null> {
    // Get lot transactions
    const transactions = await prisma.lotTransaction.findMany({
      where: { lotNumber },
      include: {
        part: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (transactions.length === 0) return null;

    const firstTx = transactions[0];
    const partId = firstTx.partId;

    // Get part with supplier info
    const part = partId ? await prisma.part.findUnique({
      where: { id: partId },
      include: {
        partSuppliers: {
          include: { supplier: true },
          take: 1,
        },
      },
    }) : null;

    // Get inspection for this lot
    const inspection = await prisma.inspection.findFirst({
      where: { lotNumber, status: 'completed' },
      orderBy: { createdAt: 'desc' },
    });

    // Get NCRs for this lot
    const ncrs = await prisma.nCR.findMany({
      where: { lotNumber },
    });

    const supplier = part?.partSuppliers[0]?.supplier;
    const receivedTx = transactions.find((t) => t.transactionType === 'RECEIVED');

    // Calculate total quantity
    const quantity = receivedTx?.quantity || transactions[0].quantity;

    // Determine status
    let status = 'received';
    if (inspection) {
      status = inspection.result === 'PASS' ? 'accepted' : 'rejected';
    }
    if (ncrs.some((n) => n.disposition === 'SCRAP')) {
      status = 'scrapped';
    }

    return {
      lotNumber,
      partId,
      partSku: part?.partNumber || null,
      supplierId: supplier?.id || null,
      supplierName: supplier?.name || null,
      receivedDate: receivedTx?.createdAt || transactions[0].createdAt,
      quantity,
      inspectionResult: inspection?.result || null,
      inspectionDate: inspection?.inspectedAt || null,
      defectCount: ncrs.length,
      ncrCount: ncrs.length,
      disposition: ncrs[0]?.disposition || null,
      status,
      transactions: transactions.map((t) => ({
        type: t.transactionType,
        quantity: t.quantity,
        date: t.createdAt,
        notes: t.notes,
      })),
    };
  }

  /**
   * Extract part quality summary
   */
  async extractPartQualitySummary(
    partId: string,
    months: number = 12
  ): Promise<PartQualitySummary | null> {
    const part = await prisma.part.findUnique({
      where: { id: partId },
      include: {
        partSuppliers: {
          include: { supplier: true },
        },
      },
    });

    if (!part) return null;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Get inspections
    const inspections = await prisma.inspection.findMany({
      where: {
        partId,
        status: 'completed',
        createdAt: { gte: startDate },
      },
    });

    const totalInspections = inspections.length;
    const passCount = inspections.filter((i) => i.result === 'PASS').length;
    const failCount = inspections.filter((i) => i.result === 'FAIL').length;
    const firstPassYield = totalInspections > 0 ? (passCount / totalInspections) * 100 : 100;

    // Get NCRs
    const ncrs = await prisma.nCR.findMany({
      where: {
        partId,
        createdAt: { gte: startDate },
      },
    });

    const totalNCRs = ncrs.length;
    const openNCRs = ncrs.filter((n) => !['closed', 'voided'].includes(n.status)).length;

    // Top defects
    const defectCounts = new Map<string, number>();
    ncrs.forEach((n) => {
      const cat = n.defectCategory || 'Unknown';
      defectCounts.set(cat, (defectCounts.get(cat) || 0) + 1);
    });
    const topDefects = Array.from(defectCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Supplier quality
    const supplierQuality = await this.getSupplierQualityForPart(partId, months);

    // Quality trend
    const qualityTrend = this.calculateMonthlyQualityTrend(inspections, ncrs, months);

    return {
      partId,
      partSku: part.partNumber,
      partName: part.name,
      totalInspections,
      passCount,
      failCount,
      firstPassYield: Math.round(firstPassYield * 10) / 10,
      totalNCRs,
      openNCRs,
      topDefects,
      supplierQuality,
      qualityTrend,
    };
  }

  /**
   * Get production quality data for a work order
   */
  async extractProductionQualityData(workOrderId: string): Promise<{
    workOrderNumber: string;
    productSku: string;
    inspections: InspectionHistoryPoint[];
    ncrs: NCRHistoryPoint[];
    yieldRate: number;
    defectRate: number;
  } | null> {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        product: true,
      },
    });

    if (!workOrder) return null;

    // Get inspections
    const inspections = await prisma.inspection.findMany({
      where: { workOrderId, status: 'completed' },
      include: {
        results: {
          include: { characteristic: true },
        },
      },
    });

    // Get NCRs
    const ncrs = await prisma.nCR.findMany({
      where: { workOrderId },
    });

    const passCount = inspections.filter((i) => i.result === 'PASS').length;
    const yieldRate = inspections.length > 0 ? (passCount / inspections.length) * 100 : 100;

    const totalQuantity = inspections.reduce((sum, i) => sum + (i.quantityInspected || 0), 0);
    const defectQuantity = ncrs.reduce((sum, n) => sum + n.quantityAffected, 0);
    const defectRate = totalQuantity > 0 ? (defectQuantity / totalQuantity) * 100 : 0;

    return {
      workOrderNumber: workOrder.woNumber,
      productSku: workOrder.product.sku,
      inspections: inspections.map((insp) => ({
        id: insp.id,
        inspectionNumber: insp.inspectionNumber,
        date: insp.createdAt,
        type: insp.type,
        result: insp.result,
        quantityInspected: insp.quantityInspected,
        quantityAccepted: insp.quantityAccepted,
        quantityRejected: insp.quantityRejected,
        lotNumber: insp.lotNumber,
        supplierId: null,
        supplierName: null,
        defectCount: insp.results.filter((r) => r.result === 'FAIL').length,
        criticalDefects: insp.results.filter((r) => r.result === 'FAIL' && r.characteristic.isCritical).length,
        characteristics: insp.results.map((r) => ({
          name: r.characteristic.name,
          type: r.characteristic.type,
          result: r.result,
          measuredValue: r.measuredValue,
          nominalValue: r.characteristic.nominalValue,
          upperLimit: r.characteristic.upperLimit,
          lowerLimit: r.characteristic.lowerLimit,
          isCritical: r.characteristic.isCritical,
          deviation: null,
        })),
      })),
      ncrs: ncrs.map((ncr) => ({
        id: ncr.id,
        ncrNumber: ncr.ncrNumber,
        createdAt: ncr.createdAt,
        closedAt: ncr.status === 'closed' ? ncr.updatedAt : null,
        status: ncr.status,
        priority: ncr.priority,
        source: ncr.source,
        defectCategory: ncr.defectCategory,
        defectCode: ncr.defectCode,
        quantityAffected: ncr.quantityAffected,
        partId: ncr.partId,
        partSku: null,
        supplierId: null,
        supplierName: null,
        disposition: ncr.disposition,
        daysOpen: Math.ceil((Date.now() - ncr.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        preliminaryCause: ncr.preliminaryCause,
        rootCause: null,
      })),
      yieldRate: Math.round(yieldRate * 10) / 10,
      defectRate: Math.round(defectRate * 100) / 100,
    };
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private calculateMonthlyQualityTrend(
    inspections: Array<{ createdAt: Date; result: string | null }>,
    ncrs: Array<{ createdAt: Date; quantityAffected?: number | null }>,
    months: number
  ): QualityTrendData[] {
    const trend: QualityTrendData[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const period = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;

      const monthInspections = inspections.filter((insp) => {
        const date = new Date(insp.createdAt);
        return date >= monthStart && date <= monthEnd;
      });

      const monthNCRs = ncrs.filter((ncr) => {
        const date = new Date(ncr.createdAt);
        return date >= monthStart && date <= monthEnd;
      });

      const totalInspections = monthInspections.length;
      const passCount = monthInspections.filter((i) => i.result === 'PASS').length;
      const failCount = monthInspections.filter((i) => i.result === 'FAIL').length;
      const firstPassYield = totalInspections > 0 ? (passCount / totalInspections) * 100 : 100;

      const totalDefects = monthNCRs.reduce((sum, n) => sum + (n.quantityAffected || 1), 0);
      const avgDefectsPerLot = totalInspections > 0 ? totalDefects / totalInspections : 0;

      trend.push({
        period,
        totalInspections,
        passCount,
        failCount,
        firstPassYield: Math.round(firstPassYield * 10) / 10,
        ncrCount: monthNCRs.length,
        avgDefectsPerLot: Math.round(avgDefectsPerLot * 100) / 100,
      });
    }

    return trend;
  }

  private async getSupplierQualityForPart(
    partId: string,
    months: number
  ): Promise<{ supplierId: string; supplierName: string; acceptanceRate: number }[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Get suppliers for this part
    const partSuppliers = await prisma.partSupplier.findMany({
      where: { partId },
      include: { supplier: true },
    });

    const results: { supplierId: string; supplierName: string; acceptanceRate: number }[] = [];

    for (const ps of partSuppliers) {
      // Get receiving inspections where lot came from this supplier
      // This is a simplification - in reality you'd track supplier per lot
      const inspections = await prisma.inspection.findMany({
        where: {
          partId,
          type: 'RECEIVING',
          status: 'completed',
          createdAt: { gte: startDate },
        },
      });

      const total = inspections.length;
      const accepted = inspections.filter((i) => i.result === 'PASS').length;
      const acceptanceRate = total > 0 ? (accepted / total) * 100 : 100;

      results.push({
        supplierId: ps.supplierId,
        supplierName: ps.supplier.name,
        acceptanceRate: Math.round(acceptanceRate * 10) / 10,
      });
    }

    return results;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let extractorInstance: QualityDataExtractor | null = null;

export function getQualityDataExtractor(): QualityDataExtractor {
  if (!extractorInstance) {
    extractorInstance = new QualityDataExtractor();
  }
  return extractorInstance;
}
