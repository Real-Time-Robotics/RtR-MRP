// =============================================================================
// PO SUGGESTION ENGINE - Automatic Purchase Order Generation
// =============================================================================
// Core engine for detecting reorder needs and generating optimal PO suggestions
// Part of Phase 3: Autonomous Operations
// =============================================================================

import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface POSuggestion {
  id: string;
  partId: string;
  partNumber: string;
  partName: string;
  partCategory: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  expectedDeliveryDate: Date;
  reorderReason: ReorderReason;
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
  confidenceScore: number;
  explanation: string;
  alternatives: AlternativeSupplier[];
  risks: SuggestionRisk[];
  metadata: SuggestionMetadata;
  status: 'pending' | 'approved' | 'rejected' | 'modified' | 'expired';
  createdAt: Date;
  expiresAt: Date;
}

export interface ReorderReason {
  type: 'below_reorder_point' | 'forecast_demand' | 'safety_stock' | 'lead_time' | 'scheduled_production';
  currentStock: number;
  reorderPoint: number;
  safetyStock: number;
  forecastDemand: number;
  forecastPeriodDays: number;
  daysOfSupply: number;
  leadTimeDays: number;
  description: string;
}

export interface AlternativeSupplier {
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  leadTimeDays: number;
  qualityScore: number;
  deliveryScore: number;
  overallScore: number;
  priceDifference: number;
  leadTimeDifference: number;
}

export interface SuggestionRisk {
  type: 'supplier' | 'price' | 'lead_time' | 'quality' | 'capacity' | 'market';
  severity: 'high' | 'medium' | 'low';
  description: string;
  mitigation: string;
}

export interface SuggestionMetadata {
  averageMonthlyDemand: number;
  demandVariability: number;
  lastPurchaseDate: Date | null;
  lastPurchasePrice: number | null;
  priceChangePercent: number | null;
  supplierLeadTime: number;
  supplierReliability: number;
  eoqQuantity: number;
  moqQuantity: number;
  roundedQuantity: number;
}

export interface ReorderNeed {
  partId: string;
  partNumber: string;
  partName: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  reorderPoint: number;
  safetyStock: number;
  forecastDemand: number;
  daysOfSupply: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
}

export interface SupplierSelection {
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  unitPrice: number;
  leadTimeDays: number;
  moq: number;
  qualityScore: number;
  deliveryScore: number;
  priceScore: number;
  overallScore: number;
  isPreferred: boolean;
}

export interface POSuggestionConfig {
  safetyStockDays: number;
  forecastHorizonDays: number;
  eoqHoldingCostRate: number;
  eoqOrderingCost: number;
  urgencyThresholds: {
    critical: number; // Days of supply
    high: number;
    medium: number;
  };
  supplierWeights: {
    quality: number;
    delivery: number;
    price: number;
    preferred: number;
  };
  expirationHours: number;
}

const DEFAULT_CONFIG: POSuggestionConfig = {
  safetyStockDays: 7,
  forecastHorizonDays: 30,
  eoqHoldingCostRate: 0.25, // 25% annual holding cost
  eoqOrderingCost: 500000, // VND per order
  urgencyThresholds: {
    critical: 3, // Less than 3 days supply
    high: 7,     // Less than 7 days supply
    medium: 14,  // Less than 14 days supply
  },
  supplierWeights: {
    quality: 0.3,
    delivery: 0.3,
    price: 0.25,
    preferred: 0.15,
  },
  expirationHours: 72, // Suggestions expire after 72 hours
};

// =============================================================================
// PO SUGGESTION ENGINE
// =============================================================================

export class POSuggestionEngine {
  private config: POSuggestionConfig;

  constructor(config: Partial<POSuggestionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // =============================================================================
  // MAIN METHODS
  // =============================================================================

  /**
   * Detect all parts that need reordering
   */
  async detectReorderNeeds(): Promise<ReorderNeed[]> {
    // Get all parts with inventory and supplier info
    const parts = await prisma.part.findMany({
      where: {
        status: 'active',
        category: { in: ['raw_material', 'component', 'packaging'] },
      },
      include: {
        inventory: true,
        partSuppliers: {
          where: { status: 'active' },
          include: { supplier: true },
        },
      },
    });

    const reorderNeeds: ReorderNeed[] = [];

    for (const part of parts) {
      // Calculate current and available stock
      const currentStock = part.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      const reservedStock = part.inventory.reduce((sum, inv) => sum + inv.reservedQty, 0);
      const availableStock = currentStock - reservedStock;

      // Get reorder point and safety stock
      const reorderPoint = part.reorderPoint || 0;
      const safetyStock = part.safetyStock || 0;

      // Calculate forecast demand (simplified - use demand forecasting if available)
      const forecastDemand = await this.calculateForecastDemand(part.id);

      // Calculate days of supply
      const dailyDemand = forecastDemand / this.config.forecastHorizonDays;
      const daysOfSupply = dailyDemand > 0 ? availableStock / dailyDemand : 999;

      // Determine if reorder is needed
      const needsReorder = availableStock <= reorderPoint || daysOfSupply <= this.config.urgencyThresholds.medium;

      if (needsReorder && part.partSuppliers.length > 0) {
        const urgency = this.calculateUrgency(daysOfSupply);
        const reason = this.generateReorderReason(availableStock, reorderPoint, safetyStock, daysOfSupply);

        reorderNeeds.push({
          partId: part.id,
          partNumber: part.partNumber,
          partName: part.name,
          currentStock,
          reservedStock,
          availableStock,
          reorderPoint,
          safetyStock,
          forecastDemand,
          daysOfSupply: Math.round(daysOfSupply * 10) / 10,
          urgency,
          reason,
        });
      }
    }

    // Sort by urgency
    return reorderNeeds.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }

  /**
   * Calculate optimal order quantity using EOQ formula
   */
  async calculateOptimalQuantity(partId: string): Promise<{
    eoqQuantity: number;
    safetyStockQty: number;
    forecastQty: number;
    moqQuantity: number;
    recommendedQty: number;
  }> {
    const part = await prisma.part.findUnique({
      where: { id: partId },
      include: {
        planning: true,
        partSuppliers: {
          where: { status: 'active', isPreferred: true },
          take: 1,
        },
      },
    });

    if (!part) {
      throw new Error(`Part not found: ${partId}`);
    }

    // Get demand data
    const forecastDemand = await this.calculateForecastDemand(partId);
    const annualDemand = forecastDemand * (365 / this.config.forecastHorizonDays);

    // Get unit cost
    const unitCost = part.partSuppliers[0]?.unitPrice || part.standardCost || 100000;

    // Calculate EOQ: √(2DS/H)
    // D = Annual demand
    // S = Ordering cost per order
    // H = Holding cost per unit per year = unit cost * holding rate
    const holdingCost = unitCost * this.config.eoqHoldingCostRate;
    const eoqQuantity = annualDemand > 0 && holdingCost > 0
      ? Math.sqrt((2 * annualDemand * this.config.eoqOrderingCost) / holdingCost)
      : forecastDemand;

    // Calculate safety stock quantity
    const demandVariability = await this.calculateDemandVariability(partId);
    const leadTimeDays = part.partSuppliers[0]?.leadTimeDays || part.leadTimeDays || 14;
    const safetyStockQty = Math.ceil(
      (forecastDemand / this.config.forecastHorizonDays) * this.config.safetyStockDays * (1 + demandVariability)
    );

    // Get MOQ: use supplier MOQ if available, fallback to part MOQ
    const supplierMoq = part.partSuppliers[0]?.minOrderQty || 0;
    const partMoq = part.planning?.moq || part.moq || 1;
    const moqQuantity = Math.max(supplierMoq, partMoq);

    // Calculate recommended quantity
    // Take the max of EOQ and forecast demand for the horizon, then round up to MOQ
    const baseQty = Math.max(eoqQuantity, forecastDemand + safetyStockQty);
    const recommendedQty = Math.ceil(baseQty / moqQuantity) * moqQuantity;

    return {
      eoqQuantity: Math.round(eoqQuantity),
      safetyStockQty,
      forecastQty: Math.round(forecastDemand),
      moqQuantity,
      recommendedQty,
    };
  }

  /**
   * Select the optimal supplier for a part
   */
  async selectOptimalSupplier(partId: string): Promise<SupplierSelection | null> {
    const partSuppliers = await prisma.partSupplier.findMany({
      where: {
        partId,
        status: 'active',
      },
      include: {
        supplier: true,
      },
    });

    if (partSuppliers.length === 0) {
      return null;
    }

    const selections: SupplierSelection[] = [];

    for (const ps of partSuppliers) {
      const supplier = ps.supplier;

      // Get supplier performance metrics (using rating as a proxy for quality/delivery)
      const supplierRating = supplier.rating || 70;
      const qualityScore = supplierRating;
      const deliveryScore = supplierRating;

      // Calculate price score (inverse - lower price is better)
      // Normalize against the lowest price
      const prices = partSuppliers.map((p) => p.unitPrice);
      const minPrice = Math.min(...prices);
      const priceScore = minPrice > 0 ? (minPrice / ps.unitPrice) * 100 : 100;

      // Calculate overall score
      const { quality, delivery, price, preferred } = this.config.supplierWeights;
      const preferredBonus = ps.isPreferred ? 100 : 0;

      const overallScore =
        qualityScore * quality +
        deliveryScore * delivery +
        priceScore * price +
        preferredBonus * preferred;

      selections.push({
        supplierId: supplier.id,
        supplierName: supplier.name,
        supplierCode: supplier.code,
        unitPrice: ps.unitPrice,
        leadTimeDays: ps.leadTimeDays,
        moq: ps.minOrderQty || 1,
        qualityScore,
        deliveryScore,
        priceScore: Math.round(priceScore),
        overallScore: Math.round(overallScore),
        isPreferred: ps.isPreferred,
      });
    }

    // Sort by overall score (highest first)
    selections.sort((a, b) => b.overallScore - a.overallScore);

    return selections[0];
  }

  /**
   * Calculate expected delivery date
   */
  calculateDeliveryDate(leadTimeDays: number, orderDate: Date = new Date()): Date {
    const deliveryDate = new Date(orderDate);
    let daysAdded = 0;
    let businessDaysAdded = 0;

    while (businessDaysAdded < leadTimeDays) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);
      daysAdded++;

      // Skip weekends
      const dayOfWeek = deliveryDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Check for Vietnamese holidays (simplified - major holidays)
        if (!this.isVietnameseHoliday(deliveryDate)) {
          businessDaysAdded++;
        }
      }
    }

    // Add buffer for safety (10% of lead time, min 1 day)
    const bufferDays = Math.max(1, Math.ceil(leadTimeDays * 0.1));
    deliveryDate.setDate(deliveryDate.getDate() + bufferDays);

    return deliveryDate;
  }

  /**
   * Generate a complete PO suggestion for a part
   */
  async generatePOSuggestion(partId: string): Promise<POSuggestion | null> {
    // Get part details
    const part = await prisma.part.findUnique({
      where: { id: partId },
      include: {
        inventory: true,
        partSuppliers: {
          where: { status: 'active' },
          include: { supplier: true },
        },
      },
    });

    if (!part || part.partSuppliers.length === 0) {
      return null;
    }

    // Select optimal supplier
    const optimalSupplier = await this.selectOptimalSupplier(partId);
    if (!optimalSupplier) {
      return null;
    }

    // Calculate optimal quantity
    const quantityCalc = await this.calculateOptimalQuantity(partId);

    // Calculate delivery date
    const expectedDeliveryDate = this.calculateDeliveryDate(optimalSupplier.leadTimeDays);

    // Get current stock data
    const currentStock = part.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
    const reservedStock = part.inventory.reduce((sum, inv) => sum + inv.reservedQty, 0);
    const availableStock = currentStock - reservedStock;

    // Calculate forecast demand
    const forecastDemand = await this.calculateForecastDemand(partId);
    const dailyDemand = forecastDemand / this.config.forecastHorizonDays;
    const daysOfSupply = dailyDemand > 0 ? availableStock / dailyDemand : 999;

    // Determine urgency
    const urgencyLevel = this.calculateUrgency(daysOfSupply);

    // Build reorder reason
    const reorderReason: ReorderReason = {
      type: this.determineReorderType(availableStock, part.reorderPoint || 0, daysOfSupply),
      currentStock,
      reorderPoint: part.reorderPoint || 0,
      safetyStock: part.safetyStock || 0,
      forecastDemand: Math.round(forecastDemand),
      forecastPeriodDays: this.config.forecastHorizonDays,
      daysOfSupply: Math.round(daysOfSupply * 10) / 10,
      leadTimeDays: optimalSupplier.leadTimeDays,
      description: this.generateReorderReason(
        availableStock,
        part.reorderPoint || 0,
        part.safetyStock || 0,
        daysOfSupply
      ),
    };

    // Get alternative suppliers
    const alternatives = await this.getAlternativeSuppliers(partId, optimalSupplier.supplierId);

    // Calculate risks
    const risks = this.identifyRisks(optimalSupplier, part, quantityCalc.recommendedQty);

    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(
      optimalSupplier,
      quantityCalc,
      forecastDemand,
      risks
    );

    // Generate explanation
    const explanation = this.generateExplanation(
      part,
      optimalSupplier,
      quantityCalc,
      reorderReason,
      alternatives
    );

    // Get metadata
    const metadata = await this.buildMetadata(part, optimalSupplier, quantityCalc);

    // Generate suggestion ID
    const suggestionId = `PS-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Set expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.config.expirationHours);

    return {
      id: suggestionId,
      partId: part.id,
      partNumber: part.partNumber,
      partName: part.name,
      partCategory: part.category || 'Unknown',
      supplierId: optimalSupplier.supplierId,
      supplierName: optimalSupplier.supplierName,
      supplierCode: optimalSupplier.supplierCode,
      quantity: quantityCalc.recommendedQty,
      unitPrice: optimalSupplier.unitPrice,
      totalAmount: quantityCalc.recommendedQty * optimalSupplier.unitPrice,
      currency: 'VND',
      expectedDeliveryDate,
      reorderReason,
      urgencyLevel,
      confidenceScore,
      explanation,
      alternatives,
      risks,
      metadata,
      status: 'pending',
      createdAt: new Date(),
      expiresAt,
    };
  }

  /**
   * Generate suggestions for all parts needing reorder
   */
  async batchGenerateSuggestions(): Promise<POSuggestion[]> {
    const reorderNeeds = await this.detectReorderNeeds();
    const suggestions: POSuggestion[] = [];

    for (const need of reorderNeeds) {
      try {
        const suggestion = await this.generatePOSuggestion(need.partId);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      } catch (error) {
        logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'po-suggestion-engine', partNumber: need.partNumber });
      }
    }

    // Sort by urgency and confidence
    return suggestions.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const urgencyDiff = urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
      if (urgencyDiff !== 0) return urgencyDiff;
      return b.confidenceScore - a.confidenceScore;
    });
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private async calculateForecastDemand(partId: string): Promise<number> {
    // Get historical demand from sales order lines and work orders
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get demand from work orders (material consumption)
    const workOrderDemand = await prisma.materialAllocation.aggregate({
      where: {
        partId,
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { allocatedQty: true },
    });

    const historicalDemand = workOrderDemand._sum.allocatedQty || 0;

    // Apply simple forecast (historical demand * 1.1 for growth buffer)
    return Math.ceil(historicalDemand * 1.1);
  }

  private async calculateDemandVariability(partId: string): Promise<number> {
    // Calculate coefficient of variation for demand
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const weeklyDemand = await prisma.$queryRaw<{ week: string; demand: number }[]>`
      SELECT
        DATE_TRUNC('week', "createdAt") as week,
        SUM("quantityAllocated") as demand
      FROM "material_allocations"
      WHERE "partId" = ${partId}
        AND "createdAt" >= ${ninetyDaysAgo}
      GROUP BY DATE_TRUNC('week', "createdAt")
    `;

    if (weeklyDemand.length < 2) {
      return 0.2; // Default variability
    }

    const demands = weeklyDemand.map((w) => Number(w.demand));
    const mean = demands.reduce((a, b) => a + b, 0) / demands.length;
    const variance = demands.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / demands.length;
    const stdDev = Math.sqrt(variance);

    return mean > 0 ? stdDev / mean : 0.2;
  }

  private calculateUrgency(daysOfSupply: number): 'critical' | 'high' | 'medium' | 'low' {
    const { critical, high, medium } = this.config.urgencyThresholds;

    if (daysOfSupply <= critical) return 'critical';
    if (daysOfSupply <= high) return 'high';
    if (daysOfSupply <= medium) return 'medium';
    return 'low';
  }

  private generateReorderReason(
    availableStock: number,
    reorderPoint: number,
    safetyStock: number,
    daysOfSupply: number
  ): string {
    if (availableStock <= 0) {
      return 'Hết hàng! Cần đặt hàng khẩn cấp.';
    }
    if (availableStock <= safetyStock) {
      return `Tồn kho (${availableStock}) đã xuống dưới mức an toàn (${safetyStock}).`;
    }
    if (availableStock <= reorderPoint) {
      return `Tồn kho (${availableStock}) đã đạt điểm đặt hàng lại (${reorderPoint}).`;
    }
    if (daysOfSupply <= 7) {
      return `Chỉ còn ${Math.round(daysOfSupply)} ngày tồn kho dựa trên nhu cầu dự báo.`;
    }
    return `Cần bổ sung hàng để đáp ứng nhu cầu dự báo (${Math.round(daysOfSupply)} ngày tồn).`;
  }

  private determineReorderType(
    availableStock: number,
    reorderPoint: number,
    daysOfSupply: number
  ): ReorderReason['type'] {
    if (availableStock <= reorderPoint) return 'below_reorder_point';
    if (daysOfSupply <= 7) return 'lead_time';
    if (daysOfSupply <= 14) return 'forecast_demand';
    return 'safety_stock';
  }

  private async getAlternativeSuppliers(
    partId: string,
    excludeSupplierId: string
  ): Promise<AlternativeSupplier[]> {
    const partSuppliers = await prisma.partSupplier.findMany({
      where: {
        partId,
        status: 'active',
        supplierId: { not: excludeSupplierId },
      },
      include: { supplier: true },
    });

    // Get primary supplier for comparison
    const primarySupplier = await prisma.partSupplier.findFirst({
      where: { partId, supplierId: excludeSupplierId },
    });

    return partSuppliers.map((ps) => ({
      supplierId: ps.supplierId,
      supplierName: ps.supplier.name,
      unitPrice: ps.unitPrice,
      leadTimeDays: ps.leadTimeDays,
      qualityScore: ps.supplier.rating || 70,
      deliveryScore: ps.supplier.rating || 70,
      overallScore: Math.round(ps.supplier.rating || 70),
      priceDifference: primarySupplier
        ? Math.round(((ps.unitPrice - primarySupplier.unitPrice) / primarySupplier.unitPrice) * 100)
        : 0,
      leadTimeDifference: primarySupplier
        ? ps.leadTimeDays - primarySupplier.leadTimeDays
        : 0,
    }));
  }

  private identifyRisks(
    supplier: SupplierSelection,
    _part: { id: string; partNumber: string; name: string },
    quantity: number
  ): SuggestionRisk[] {
    const risks: SuggestionRisk[] = [];

    // Supplier reliability risk
    if (supplier.deliveryScore < 80) {
      risks.push({
        type: 'supplier',
        severity: supplier.deliveryScore < 60 ? 'high' : 'medium',
        description: `Nhà cung cấp có điểm giao hàng thấp (${supplier.deliveryScore}%)`,
        mitigation: 'Cân nhắc đặt thêm buffer time hoặc chọn nhà cung cấp khác',
      });
    }

    // Quality risk
    if (supplier.qualityScore < 80) {
      risks.push({
        type: 'quality',
        severity: supplier.qualityScore < 60 ? 'high' : 'medium',
        description: `Nhà cung cấp có điểm chất lượng thấp (${supplier.qualityScore}%)`,
        mitigation: 'Tăng cường kiểm tra chất lượng khi nhận hàng',
      });
    }

    // Lead time risk for urgent orders
    if (supplier.leadTimeDays > 14) {
      risks.push({
        type: 'lead_time',
        severity: supplier.leadTimeDays > 21 ? 'high' : 'medium',
        description: `Lead time dài (${supplier.leadTimeDays} ngày)`,
        mitigation: 'Đặt hàng sớm hoặc tìm nguồn cung gần hơn',
      });
    }

    // Large order risk
    const avgOrderValue = quantity * supplier.unitPrice;
    if (avgOrderValue > 500000000) { // > 500M VND
      risks.push({
        type: 'price',
        severity: 'medium',
        description: `Đơn hàng lớn (${(avgOrderValue / 1000000).toFixed(0)}M VND)`,
        mitigation: 'Xem xét chia nhỏ đơn hàng hoặc đàm phán chiết khấu',
      });
    }

    return risks;
  }

  private calculateConfidenceScore(
    supplier: SupplierSelection,
    quantityCalc: { eoqQuantity: number; recommendedQty: number },
    forecastDemand: number,
    risks: SuggestionRisk[]
  ): number {
    let score = 100;

    // Supplier score impact (0-20 points)
    score -= (100 - supplier.overallScore) * 0.2;

    // Risk impact (0-15 points per high risk, 0-8 per medium)
    for (const risk of risks) {
      if (risk.severity === 'high') score -= 15;
      else if (risk.severity === 'medium') score -= 8;
      else score -= 3;
    }

    // Forecast reliability (if low forecast, lower confidence)
    if (forecastDemand < 10) score -= 10;

    // EOQ alignment (if recommended qty is very different from EOQ)
    const eoqDiff = Math.abs(quantityCalc.recommendedQty - quantityCalc.eoqQuantity) / quantityCalc.eoqQuantity;
    if (eoqDiff > 0.5) score -= 10;

    // Preferred supplier bonus
    if (supplier.isPreferred) score += 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private generateExplanation(
    _part: { id: string; partNumber: string; name: string },
    supplier: SupplierSelection,
    quantityCalc: { recommendedQty: number; eoqQuantity: number; safetyStockQty: number },
    reorderReason: ReorderReason,
    alternatives: AlternativeSupplier[]
  ): string {
    const lines: string[] = [];

    // Why reorder
    lines.push(`📦 **Lý do đề xuất:** ${reorderReason.description}`);

    // Supplier selection
    lines.push(`\n🏭 **Nhà cung cấp:** ${supplier.supplierName} được chọn với điểm tổng hợp ${supplier.overallScore}/100:`);
    lines.push(`   - Chất lượng: ${supplier.qualityScore}%`);
    lines.push(`   - Giao hàng: ${supplier.deliveryScore}%`);
    lines.push(`   - Giá cả: ${supplier.priceScore}/100`);
    if (supplier.isPreferred) {
      lines.push(`   - ⭐ Nhà cung cấp ưu tiên`);
    }

    // Quantity explanation
    lines.push(`\n📊 **Số lượng đề xuất:** ${quantityCalc.recommendedQty} units`);
    lines.push(`   - EOQ tối ưu: ${quantityCalc.eoqQuantity} units`);
    lines.push(`   - Safety stock: ${quantityCalc.safetyStockQty} units`);
    lines.push(`   - Làm tròn theo MOQ: ${supplier.moq} units`);

    // Timing
    lines.push(`\n⏱️ **Lead time:** ${supplier.leadTimeDays} ngày làm việc`);
    lines.push(`   - Tồn kho hiện tại đủ cho: ${reorderReason.daysOfSupply} ngày`);

    // Alternatives
    if (alternatives.length > 0) {
      lines.push(`\n🔄 **Lựa chọn thay thế:** ${alternatives.length} nhà cung cấp khác`);
      const best = alternatives[0];
      if (best.priceDifference < 0) {
        lines.push(`   - ${best.supplierName}: rẻ hơn ${Math.abs(best.priceDifference)}% nhưng điểm thấp hơn`);
      }
    }

    return lines.join('\n');
  }

  private async buildMetadata(
    part: { id: string; partNumber: string; name: string },
    supplier: SupplierSelection,
    quantityCalc: { recommendedQty: number; eoqQuantity: number; moqQuantity: number }
  ): Promise<SuggestionMetadata> {
    // Get last purchase
    const lastPO = await prisma.purchaseOrderLine.findFirst({
      where: { partId: part.id },
      orderBy: { createdAt: 'desc' },
      include: { po: true },
    });

    // Calculate demand variability
    const demandVariability = await this.calculateDemandVariability(part.id);

    // Calculate average monthly demand
    const forecastDemand = await this.calculateForecastDemand(part.id);
    const avgMonthlyDemand = forecastDemand; // Already 30-day based

    // Price change
    const priceChangePercent = lastPO && lastPO.unitPrice > 0
      ? ((supplier.unitPrice - lastPO.unitPrice) / lastPO.unitPrice) * 100
      : null;

    return {
      averageMonthlyDemand: avgMonthlyDemand,
      demandVariability: Math.round(demandVariability * 100) / 100,
      lastPurchaseDate: lastPO?.po.orderDate || null,
      lastPurchasePrice: lastPO?.unitPrice || null,
      priceChangePercent: priceChangePercent !== null ? Math.round(priceChangePercent * 10) / 10 : null,
      supplierLeadTime: supplier.leadTimeDays,
      supplierReliability: supplier.deliveryScore,
      eoqQuantity: quantityCalc.eoqQuantity,
      moqQuantity: quantityCalc.moqQuantity,
      roundedQuantity: quantityCalc.recommendedQty,
    };
  }

  private isVietnameseHoliday(date: Date): boolean {
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // Fixed holidays (approximate lunar holidays)
    const holidays = [
      { month: 1, day: 1 },   // New Year
      { month: 4, day: 30 },  // Reunification Day
      { month: 5, day: 1 },   // Labor Day
      { month: 9, day: 2 },   // National Day
    ];

    // Tet holiday period (approximate - last week of Jan, first week of Feb)
    if ((month === 1 && day >= 25) || (month === 2 && day <= 7)) {
      return true;
    }

    return holidays.some((h) => h.month === month && h.day === day);
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let poSuggestionEngineInstance: POSuggestionEngine | null = null;

export function getPOSuggestionEngine(config?: Partial<POSuggestionConfig>): POSuggestionEngine {
  if (!poSuggestionEngineInstance) {
    poSuggestionEngineInstance = new POSuggestionEngine(config);
  }
  return poSuggestionEngineInstance;
}

export { DEFAULT_CONFIG as DEFAULT_PO_SUGGESTION_CONFIG };
