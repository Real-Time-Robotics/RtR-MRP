// =============================================================================
// DATA EXTRACTOR SERVICE
// Extracts and preprocesses historical data for demand forecasting
// =============================================================================

import { prisma } from '@/lib/prisma';
import { formatPeriod, getWeekNumber } from './vn-calendar';

// =============================================================================
// TYPES
// =============================================================================

export interface SalesHistoryPoint {
  period: string;
  periodType: 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  quantity: number;
  revenue: number;
  orderCount: number;
  uniqueCustomers: number;
  avgOrderSize: number;
}

export interface ProductSalesHistory {
  productId: string;
  productSku: string;
  productName: string;
  history: SalesHistoryPoint[];
  totalQuantity: number;
  totalRevenue: number;
  avgMonthlyQuantity: number;
  avgMonthlyRevenue: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  volatility: number; // coefficient of variation
}

export interface CustomerBehavior {
  customerId: string;
  customerCode: string;
  customerName: string;
  totalOrders: number;
  totalQuantity: number;
  totalRevenue: number;
  avgOrderValue: number;
  avgOrderFrequency: number; // days between orders
  preferredProducts: Array<{
    productId: string;
    productSku: string;
    quantity: number;
    percentage: number;
  }>;
  seasonalPattern: Array<{
    month: number;
    avgQuantity: number;
    orderCount: number;
  }>;
  lastOrderDate: Date | null;
  daysSinceLastOrder: number;
}

export interface SupplierLeadTime {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  avgLeadTimeDays: number;
  minLeadTimeDays: number;
  maxLeadTimeDays: number;
  stdDeviation: number;
  reliability: number; // % on-time delivery
  recentTrend: 'improving' | 'worsening' | 'stable';
}

export interface TimeSeriesData {
  period: string;
  value: number;
  date: Date;
}

export interface PreparedForecastData {
  productId: string;
  productSku: string;
  productName: string;
  timeSeries: TimeSeriesData[];
  seasonalIndices: Record<number, number>; // month -> index
  trend: number; // slope
  level: number; // current level
  outliers: number[]; // indices of outlier periods
  dataQuality: 'good' | 'fair' | 'poor';
  missingPeriods: string[];
}

// =============================================================================
// DATA EXTRACTOR SERVICE
// =============================================================================

export class DataExtractorService {
  // ===========================================================================
  // SALES HISTORY EXTRACTION
  // ===========================================================================

  /**
   * Extract sales history for a specific product
   */
  async extractProductSalesHistory(
    productId: string,
    months: number = 24,
    periodType: 'weekly' | 'monthly' = 'monthly'
  ): Promise<ProductSalesHistory | null> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sku: true, name: true },
    });

    if (!product) return null;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Get all sales order lines for this product
    const salesLines = await prisma.salesOrderLine.findMany({
      where: {
        productId,
        order: {
          orderDate: { gte: startDate },
          status: { in: ['completed', 'shipped', 'delivered', 'confirmed'] },
        },
      },
      include: {
        order: {
          select: {
            orderDate: true,
            customerId: true,
          },
        },
      },
      orderBy: {
        order: { orderDate: 'asc' },
      },
    });

    // Group by period
    const periodMap = new Map<string, {
      quantity: number;
      revenue: number;
      orderIds: Set<string>;
      customerIds: Set<string>;
      startDate: Date;
      endDate: Date;
    }>();

    for (const line of salesLines) {
      const orderDate = line.order.orderDate;
      const period = formatPeriod(orderDate, periodType);

      if (!periodMap.has(period)) {
        const periodStart = this.getPeriodStart(orderDate, periodType);
        const periodEnd = this.getPeriodEnd(orderDate, periodType);
        periodMap.set(period, {
          quantity: 0,
          revenue: 0,
          orderIds: new Set(),
          customerIds: new Set(),
          startDate: periodStart,
          endDate: periodEnd,
        });
      }

      const data = periodMap.get(period)!;
      data.quantity += line.quantity;
      data.revenue += line.lineTotal || line.quantity * line.unitPrice;
      data.orderIds.add(line.orderId);
      data.customerIds.add(line.order.customerId);
    }

    // Convert to array
    const history: SalesHistoryPoint[] = Array.from(periodMap.entries())
      .map(([period, data]) => ({
        period,
        periodType,
        startDate: data.startDate,
        endDate: data.endDate,
        quantity: data.quantity,
        revenue: data.revenue,
        orderCount: data.orderIds.size,
        uniqueCustomers: data.customerIds.size,
        avgOrderSize: data.orderIds.size > 0 ? data.quantity / data.orderIds.size : 0,
      }))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    // Fill missing periods
    const filledHistory = this.fillMissingPeriods(history, periodType, months);

    // Calculate statistics
    const quantities = filledHistory.map((h) => h.quantity);
    const totalQuantity = quantities.reduce((a, b) => a + b, 0);
    const totalRevenue = filledHistory.reduce((a, h) => a + h.revenue, 0);
    const avgMonthlyQuantity = totalQuantity / Math.max(1, filledHistory.length);
    const avgMonthlyRevenue = totalRevenue / Math.max(1, filledHistory.length);

    // Calculate trend (simple linear regression slope)
    const trend = this.calculateTrend(quantities);

    // Calculate volatility (coefficient of variation)
    const volatility = this.calculateVolatility(quantities);

    return {
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      history: filledHistory,
      totalQuantity,
      totalRevenue,
      avgMonthlyQuantity,
      avgMonthlyRevenue,
      trend: trend > 0.05 ? 'increasing' : trend < -0.05 ? 'decreasing' : 'stable',
      volatility,
    };
  }

  /**
   * Extract sales history for all products
   */
  async extractAllProductsSalesHistory(
    months: number = 24,
    periodType: 'weekly' | 'monthly' = 'monthly',
    minOrderCount: number = 3
  ): Promise<ProductSalesHistory[]> {
    // Get all products with sales
    const products = await prisma.product.findMany({
      where: {
        status: 'active',
        salesOrderLines: {
          some: {
            order: {
              status: { in: ['completed', 'shipped', 'delivered', 'confirmed'] },
            },
          },
        },
      },
      select: { id: true },
    });

    const results: ProductSalesHistory[] = [];

    for (const product of products) {
      const history = await this.extractProductSalesHistory(
        product.id,
        months,
        periodType
      );

      if (history && history.history.filter((h) => h.quantity > 0).length >= minOrderCount) {
        results.push(history);
      }
    }

    // Sort by total quantity descending
    return results.sort((a, b) => b.totalQuantity - a.totalQuantity);
  }

  // ===========================================================================
  // CUSTOMER BEHAVIOR EXTRACTION
  // ===========================================================================

  /**
   * Extract customer ordering behavior
   */
  async extractCustomerBehavior(
    customerId: string,
    months: number = 24
  ): Promise<CustomerBehavior | null> {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, code: true, name: true },
    });

    if (!customer) return null;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const orders = await prisma.salesOrder.findMany({
      where: {
        customerId,
        orderDate: { gte: startDate },
        status: { in: ['completed', 'shipped', 'delivered', 'confirmed'] },
      },
      include: {
        lines: {
          include: {
            product: { select: { id: true, sku: true } },
          },
        },
      },
      orderBy: { orderDate: 'asc' },
    });

    if (orders.length === 0) {
      return {
        customerId: customer.id,
        customerCode: customer.code,
        customerName: customer.name,
        totalOrders: 0,
        totalQuantity: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        avgOrderFrequency: 0,
        preferredProducts: [],
        seasonalPattern: [],
        lastOrderDate: null,
        daysSinceLastOrder: 999,
      };
    }

    // Calculate totals
    let totalQuantity = 0;
    let totalRevenue = 0;
    const productQuantities = new Map<string, { sku: string; quantity: number }>();
    const monthlyOrders = new Map<number, { quantity: number; count: number }>();

    for (const order of orders) {
      const orderTotal = order.totalAmount || 0;
      totalRevenue += orderTotal;

      for (const line of order.lines) {
        totalQuantity += line.quantity;

        // Track product preferences
        const existing = productQuantities.get(line.productId) || {
          sku: line.product.sku,
          quantity: 0,
        };
        existing.quantity += line.quantity;
        productQuantities.set(line.productId, existing);

        // Track monthly pattern
        const month = order.orderDate.getMonth() + 1;
        const monthData = monthlyOrders.get(month) || { quantity: 0, count: 0 };
        monthData.quantity += line.quantity;
        monthData.count += 1;
        monthlyOrders.set(month, monthData);
      }
    }

    // Calculate order frequency
    let totalDaysBetweenOrders = 0;
    for (let i = 1; i < orders.length; i++) {
      const daysDiff = Math.round(
        (orders[i].orderDate.getTime() - orders[i - 1].orderDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      totalDaysBetweenOrders += daysDiff;
    }
    const avgOrderFrequency =
      orders.length > 1 ? totalDaysBetweenOrders / (orders.length - 1) : 0;

    // Preferred products
    const preferredProducts = Array.from(productQuantities.entries())
      .map(([productId, data]) => ({
        productId,
        productSku: data.sku,
        quantity: data.quantity,
        percentage: (data.quantity / totalQuantity) * 100,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Seasonal pattern
    const seasonalPattern = Array.from(monthlyOrders.entries())
      .map(([month, data]) => ({
        month,
        avgQuantity: data.quantity / Math.max(1, data.count),
        orderCount: data.count,
      }))
      .sort((a, b) => a.month - b.month);

    const lastOrder = orders[orders.length - 1];
    const daysSinceLastOrder = Math.round(
      (Date.now() - lastOrder.orderDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      customerId: customer.id,
      customerCode: customer.code,
      customerName: customer.name,
      totalOrders: orders.length,
      totalQuantity,
      totalRevenue,
      avgOrderValue: totalRevenue / orders.length,
      avgOrderFrequency,
      preferredProducts,
      seasonalPattern,
      lastOrderDate: lastOrder.orderDate,
      daysSinceLastOrder,
    };
  }

  // ===========================================================================
  // SUPPLIER LEAD TIME EXTRACTION
  // ===========================================================================

  /**
   * Extract supplier lead time data
   */
  async extractSupplierLeadTimes(
    supplierId?: string,
    months: number = 12
  ): Promise<SupplierLeadTime[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const whereClause: Record<string, unknown> = {
      orderDate: { gte: startDate },
      status: { in: ['received', 'completed'] },
    };

    if (supplierId) {
      whereClause.supplierId = supplierId;
    }

    const orders = await prisma.purchaseOrder.findMany({
      where: whereClause,
      include: {
        supplier: { select: { id: true, code: true, name: true } },
      },
    });

    // Group by supplier
    const supplierData = new Map<
      string,
      {
        supplier: { id: string; code: string; name: string };
        leadTimes: number[];
        onTimeCount: number;
        totalCount: number;
      }
    >();

    for (const order of orders) {
      // Use updatedAt as a proxy for received date when status is completed/received
      const receivedDate = order.updatedAt;

      const leadTime = Math.round(
        (receivedDate.getTime() - order.orderDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (!supplierData.has(order.supplierId)) {
        supplierData.set(order.supplierId, {
          supplier: order.supplier,
          leadTimes: [],
          onTimeCount: 0,
          totalCount: 0,
        });
      }

      const data = supplierData.get(order.supplierId)!;
      data.leadTimes.push(leadTime);
      data.totalCount++;

      // Check if on-time (within expected date)
      if (receivedDate <= order.expectedDate) {
        data.onTimeCount++;
      }
    }

    // Calculate statistics for each supplier
    const results: SupplierLeadTime[] = [];

    for (const [, data] of supplierData) {
      if (data.leadTimes.length === 0) continue;

      const leadTimes = data.leadTimes;
      const avg = leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length;
      const min = Math.min(...leadTimes);
      const max = Math.max(...leadTimes);

      // Standard deviation
      const squaredDiffs = leadTimes.map((lt) => Math.pow(lt - avg, 2));
      const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / leadTimes.length;
      const stdDev = Math.sqrt(avgSquaredDiff);

      // Recent trend (compare last 3 months vs previous 3 months)
      const sortedTimes = [...leadTimes].sort((a, b) => a - b);
      const midpoint = Math.floor(sortedTimes.length / 2);
      const recentAvg =
        sortedTimes.slice(midpoint).reduce((a, b) => a + b, 0) /
        Math.max(1, sortedTimes.length - midpoint);
      const earlierAvg =
        sortedTimes.slice(0, midpoint).reduce((a, b) => a + b, 0) /
        Math.max(1, midpoint);

      let recentTrend: 'improving' | 'worsening' | 'stable' = 'stable';
      if (recentAvg < earlierAvg * 0.9) recentTrend = 'improving';
      else if (recentAvg > earlierAvg * 1.1) recentTrend = 'worsening';

      results.push({
        supplierId: data.supplier.id,
        supplierCode: data.supplier.code,
        supplierName: data.supplier.name,
        avgLeadTimeDays: Math.round(avg * 10) / 10,
        minLeadTimeDays: min,
        maxLeadTimeDays: max,
        stdDeviation: Math.round(stdDev * 10) / 10,
        reliability: Math.round((data.onTimeCount / data.totalCount) * 100),
        recentTrend,
      });
    }

    return results.sort((a, b) => b.reliability - a.reliability);
  }

  // ===========================================================================
  // TIME SERIES PREPARATION
  // ===========================================================================

  /**
   * Prepare time series data for forecasting
   */
  async prepareTimeSeriesData(
    productId: string,
    months: number = 24,
    periodType: 'weekly' | 'monthly' = 'monthly'
  ): Promise<PreparedForecastData | null> {
    const salesHistory = await this.extractProductSalesHistory(
      productId,
      months,
      periodType
    );

    if (!salesHistory || salesHistory.history.length < 6) {
      return null;
    }

    // Convert to time series
    const timeSeries: TimeSeriesData[] = salesHistory.history.map((h) => ({
      period: h.period,
      value: h.quantity,
      date: h.startDate,
    }));

    // Calculate seasonal indices (only for monthly data)
    const seasonalIndices: Record<number, number> = {};
    if (periodType === 'monthly') {
      const monthlyTotals = new Map<number, { sum: number; count: number }>();

      for (const point of timeSeries) {
        const month = point.date.getMonth() + 1;
        const data = monthlyTotals.get(month) || { sum: 0, count: 0 };
        data.sum += point.value;
        data.count++;
        monthlyTotals.set(month, data);
      }

      const overallAvg = timeSeries.reduce((a, p) => a + p.value, 0) / timeSeries.length;

      for (let month = 1; month <= 12; month++) {
        const data = monthlyTotals.get(month);
        if (data && data.count > 0) {
          const monthAvg = data.sum / data.count;
          seasonalIndices[month] = overallAvg > 0 ? monthAvg / overallAvg : 1;
        } else {
          seasonalIndices[month] = 1;
        }
      }
    }

    // Calculate trend using linear regression
    const values = timeSeries.map((p) => p.value);
    const trend = this.calculateTrendSlope(values);
    const level = values[values.length - 1] || 0;

    // Detect outliers (values more than 2 std dev from mean)
    const outliers = this.detectOutliers(values);

    // Identify missing periods
    const missingPeriods = salesHistory.history
      .filter((h) => h.quantity === 0)
      .map((h) => h.period);

    // Assess data quality
    const nonZeroCount = values.filter((v) => v > 0).length;
    const dataQuality: 'good' | 'fair' | 'poor' =
      nonZeroCount >= values.length * 0.8
        ? 'good'
        : nonZeroCount >= values.length * 0.5
        ? 'fair'
        : 'poor';

    return {
      productId: salesHistory.productId,
      productSku: salesHistory.productSku,
      productName: salesHistory.productName,
      timeSeries,
      seasonalIndices,
      trend,
      level,
      outliers,
      dataQuality,
      missingPeriods,
    };
  }

  // ===========================================================================
  // AGGREGATE EXTRACTION
  // ===========================================================================

  /**
   * Extract seasonal patterns across all products
   */
  async extractSeasonalPatterns(months: number = 24): Promise<{
    monthly: Record<number, number>;
    quarterly: Record<number, number>;
    weekOfYear: Record<number, number>;
  }> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const salesLines = await prisma.salesOrderLine.findMany({
      where: {
        order: {
          orderDate: { gte: startDate },
          status: { in: ['completed', 'shipped', 'delivered', 'confirmed'] },
        },
      },
      include: {
        order: { select: { orderDate: true } },
      },
    });

    const monthly = new Map<number, { sum: number; count: number }>();
    const quarterly = new Map<number, { sum: number; count: number }>();
    const weekOfYear = new Map<number, { sum: number; count: number }>();

    for (const line of salesLines) {
      const date = line.order.orderDate;
      const month = date.getMonth() + 1;
      const quarter = Math.ceil(month / 3);
      const week = getWeekNumber(date);

      // Monthly
      const monthData = monthly.get(month) || { sum: 0, count: 0 };
      monthData.sum += line.quantity;
      monthData.count++;
      monthly.set(month, monthData);

      // Quarterly
      const quarterData = quarterly.get(quarter) || { sum: 0, count: 0 };
      quarterData.sum += line.quantity;
      quarterData.count++;
      quarterly.set(quarter, quarterData);

      // Weekly
      const weekData = weekOfYear.get(week) || { sum: 0, count: 0 };
      weekData.sum += line.quantity;
      weekData.count++;
      weekOfYear.set(week, weekData);
    }

    // Convert to indices
    const totalMonthlyAvg =
      Array.from(monthly.values()).reduce((a, d) => a + d.sum / d.count, 0) / 12;
    const totalQuarterlyAvg =
      Array.from(quarterly.values()).reduce((a, d) => a + d.sum / d.count, 0) / 4;
    const totalWeeklyAvg =
      Array.from(weekOfYear.values()).reduce((a, d) => a + d.sum / d.count, 0) / 52;

    const monthlyIndices: Record<number, number> = {};
    const quarterlyIndices: Record<number, number> = {};
    const weeklyIndices: Record<number, number> = {};

    for (let m = 1; m <= 12; m++) {
      const data = monthly.get(m);
      monthlyIndices[m] = data && totalMonthlyAvg > 0
        ? (data.sum / data.count) / totalMonthlyAvg
        : 1;
    }

    for (let q = 1; q <= 4; q++) {
      const data = quarterly.get(q);
      quarterlyIndices[q] = data && totalQuarterlyAvg > 0
        ? (data.sum / data.count) / totalQuarterlyAvg
        : 1;
    }

    for (let w = 1; w <= 52; w++) {
      const data = weekOfYear.get(w);
      weeklyIndices[w] = data && totalWeeklyAvg > 0
        ? (data.sum / data.count) / totalWeeklyAvg
        : 1;
    }

    return {
      monthly: monthlyIndices,
      quarterly: quarterlyIndices,
      weekOfYear: weeklyIndices,
    };
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private getPeriodStart(date: Date, periodType: 'weekly' | 'monthly'): Date {
    if (periodType === 'monthly') {
      return new Date(date.getFullYear(), date.getMonth(), 1);
    }
    // Weekly - get Monday of the week
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  private getPeriodEnd(date: Date, periodType: 'weekly' | 'monthly'): Date {
    if (periodType === 'monthly') {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    }
    // Weekly - get Sunday of the week
    const start = this.getPeriodStart(date, 'weekly');
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end;
  }

  private fillMissingPeriods(
    history: SalesHistoryPoint[],
    periodType: 'weekly' | 'monthly',
    months: number
  ): SalesHistoryPoint[] {
    if (history.length === 0) return [];

    const filledHistory: SalesHistoryPoint[] = [];
    const existingPeriods = new Set(history.map((h) => h.period));

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const endDate = new Date();

    const current = this.getPeriodStart(startDate, periodType);

    while (current <= endDate) {
      const period = formatPeriod(current, periodType);
      const existing = history.find((h) => h.period === period);

      if (existing) {
        filledHistory.push(existing);
      } else {
        const periodStart = this.getPeriodStart(current, periodType);
        const periodEnd = this.getPeriodEnd(current, periodType);
        filledHistory.push({
          period,
          periodType,
          startDate: periodStart,
          endDate: periodEnd,
          quantity: 0,
          revenue: 0,
          orderCount: 0,
          uniqueCustomers: 0,
          avgOrderSize: 0,
        });
      }

      if (periodType === 'monthly') {
        current.setMonth(current.getMonth() + 1);
      } else {
        current.setDate(current.getDate() + 7);
      }
    }

    return filledHistory;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;

    // Normalize by mean to get relative trend
    return yMean !== 0 ? slope / yMean : 0;
  }

  private calculateTrendSlope(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return isNaN(slope) ? 0 : slope;
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (mean === 0) return 0;

    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return stdDev / mean; // Coefficient of variation
  }

  private detectOutliers(values: number[]): number[] {
    if (values.length < 4) return [];

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const stdDev = Math.sqrt(
      squaredDiffs.reduce((a, b) => a + b, 0) / values.length
    );

    const outliers: number[] = [];
    const threshold = 2 * stdDev;

    for (let i = 0; i < values.length; i++) {
      if (Math.abs(values[i] - mean) > threshold) {
        outliers.push(i);
      }
    }

    return outliers;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let dataExtractorInstance: DataExtractorService | null = null;

export function getDataExtractorService(): DataExtractorService {
  if (!dataExtractorInstance) {
    dataExtractorInstance = new DataExtractorService();
  }
  return dataExtractorInstance;
}

export default DataExtractorService;
