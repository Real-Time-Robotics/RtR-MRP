// =============================================================================
// DATABASE QUERY GENERATOR
// Translates AI intents into database queries for RTR MRP
// =============================================================================

import { QueryIntent, DetectedIntent } from './prompts';
import { prismaDataFetcher } from './prisma-data-fetcher';

// =============================================================================
// TYPES
// =============================================================================

export interface QueryResult {
  success: boolean;
  data: Record<string, any>;
  error?: string;
}

export interface DataFetcher {
  getInventorySummary: () => Promise<any>;
  getInventoryAlerts: () => Promise<any[]>;
  getInventoryByParts: (partNumbers: string[]) => Promise<any[]>;
  getOrdersSummary: () => Promise<any>;
  getOrdersByNumbers: (orderNumbers: string[]) => Promise<any[]>;
  getPendingOrders: () => Promise<any[]>;
  getRecentOrders: (limit: number) => Promise<any[]>;
  getProductionSummary: () => Promise<any>;
  getWorkOrders: (status?: string) => Promise<any[]>;
  getMRPResults: (orderIds: string[]) => Promise<any>;
  getPurchaseSuggestions: () => Promise<any[]>;
  getQualitySummary: () => Promise<any>;
  getOpenNCRs: () => Promise<any[]>;
  getAnalytics: (period: string) => Promise<any>;
  getSupplierInfo: (supplierNames?: string[]) => Promise<any[]>;
}

// =============================================================================
// MOCK DATA FETCHER (Replace with real Prisma queries)
// =============================================================================

export const mockDataFetcher: DataFetcher = {
  async getInventorySummary() {
    return {
      totalItems: 1645,
      okCount: 1234,
      lowCount: 45,
      outCount: 8,
      totalValue: 4850000000,
    };
  },

  async getInventoryAlerts() {
    return [
      { partNumber: 'CMP-BRG-002', partName: 'Bạc đạn bi 6201-2RS', onHand: 25, minStock: 50, status: 'CRITICAL', unitCost: 42000 },
      { partNumber: 'CMP-MOT-001', partName: 'Motor DC 12V 50W', onHand: 15, minStock: 20, status: 'CRITICAL', unitCost: 250000 },
      { partNumber: 'RM-STL-002', partName: 'Thép tấm carbon 3mm', onHand: 120, minStock: 150, status: 'LOW', unitCost: 26000 },
      { partNumber: 'CMP-GBX-001', partName: 'Hộp số giảm tốc 1:10', onHand: 18, minStock: 25, status: 'LOW', unitCost: 450000 },
      { partNumber: 'RM-ALU-001', partName: 'Nhôm tấm 1.5mm', onHand: 85, minStock: 80, status: 'OK', unitCost: 85000 },
      { partNumber: 'CMP-SEN-001', partName: 'Cảm biến tiệm cận', onHand: 80, minStock: 50, status: 'OK', unitCost: 120000 },
    ];
  },

  async getInventoryByParts(partNumbers: string[]) {
    const allItems = await this.getInventoryAlerts();
    if (partNumbers.length === 0) return allItems;
    return allItems.filter(item => partNumbers.some(pn => item.partNumber.includes(pn)));
  },

  async getOrdersSummary() {
    return {
      totalOrders: 156,
      pendingCount: 12,
      processingCount: 28,
      completedCount: 116,
      monthlyRevenue: 3450000000,
      growthPercent: 15.3,
    };
  },

  async getOrdersByNumbers(orderNumbers: string[]) {
    const allOrders = await this.getRecentOrders(50);
    return allOrders.filter(o => orderNumbers.includes(o.orderNumber));
  },

  async getPendingOrders() {
    return [
      { orderNumber: 'SO-2025-001', customer: 'ABC Manufacturing', product: 'FG-PRD-A1', quantity: 10, value: 150000000, requiredDate: '2025-01-15', status: 'Pending' },
      { orderNumber: 'SO-2025-002', customer: 'XYZ Industries', product: 'FG-PRD-A2', quantity: 5, value: 92500000, requiredDate: '2025-01-20', status: 'Pending' },
      { orderNumber: 'SO-2025-003', customer: 'Đông Á Group', product: 'FG-PRD-B1', quantity: 15, value: 180000000, requiredDate: '2025-01-25', status: 'Pending' },
    ];
  },

  async getRecentOrders(limit: number) {
    return [
      { orderNumber: 'SO-2025-001', customer: 'ABC Manufacturing', value: 150000000, status: 'Processing', requiredDate: '2025-01-15' },
      { orderNumber: 'SO-2025-002', customer: 'XYZ Industries', value: 92500000, status: 'Pending', requiredDate: '2025-01-20' },
      { orderNumber: 'SO-2024-155', customer: 'AgriTech Corp', value: 128000000, status: 'Completed', requiredDate: '2024-12-28' },
      { orderNumber: 'SO-2024-154', customer: 'Tech Solutions', value: 95000000, status: 'Completed', requiredDate: '2024-12-25' },
      { orderNumber: 'SO-2024-153', customer: 'Green Energy', value: 220000000, status: 'Completed', requiredDate: '2024-12-20' },
    ].slice(0, limit);
  },

  async getProductionSummary() {
    return {
      efficiency: 94.5,
      runningCount: 8,
      waitingCount: 3,
      completedToday: 15,
      completedWeek: 45,
    };
  },

  async getWorkOrders(status?: string) {
    const orders = [
      { orderNumber: 'WO-2025-001', product: 'FG-PRD-A1', status: 'Running', progress: 80, quantity: 10 },
      { orderNumber: 'WO-2025-002', product: 'FG-PRD-A2', status: 'Running', progress: 60, quantity: 5 },
      { orderNumber: 'WO-2025-003', product: 'FG-PRD-B1', status: 'Waiting Material', progress: 0, quantity: 15 },
      { orderNumber: 'WO-2024-098', product: 'FG-PRD-A1', status: 'Completed', progress: 100, quantity: 8 },
    ];
    if (status) return orders.filter(o => o.status === status);
    return orders;
  },

  async getMRPResults(orderIds: string[]) {
    return {
      requirements: [
        { partNumber: 'CMP-BRG-002', partName: 'Bạc đạn bi 6201-2RS', required: 60, onHand: 25, shortage: 65, unit: 'pcs' },
        { partNumber: 'CMP-MOT-001', partName: 'Motor DC 12V 50W', required: 40, onHand: 15, shortage: 25, unit: 'pcs' },
        { partNumber: 'RM-STL-002', partName: 'Thép tấm carbon 3mm', required: 180, onHand: 120, shortage: 100, unit: 'kg' },
      ],
      shortages: [
        { partNumber: 'CMP-BRG-002', partName: 'Bạc đạn bi 6201-2RS', shortage: 65, unit: 'pcs', safetyStock: 30 },
        { partNumber: 'CMP-MOT-001', partName: 'Motor DC 12V 50W', shortage: 25, unit: 'pcs', safetyStock: 10 },
      ],
      suggestions: await this.getPurchaseSuggestions(),
    };
  },

  async getPurchaseSuggestions() {
    return [
      { partNumber: 'CMP-MOT-001', partName: 'Motor DC 12V 50W', supplier: 'Oriental Motor VN', quantity: 25, unit: 'pcs', unitCost: 250000, totalCost: 6250000, priority: 'URGENT', orderDate: '2024-12-27' },
      { partNumber: 'CMP-BRG-002', partName: 'Bạc đạn bi 6201-2RS', supplier: 'SKF Vietnam', quantity: 65, unit: 'pcs', unitCost: 42000, totalCost: 2730000, priority: 'URGENT', orderDate: '2025-01-03' },
      { partNumber: 'CMP-GBX-001', partName: 'Hộp số giảm tốc 1:10', supplier: 'Oriental Motor VN', quantity: 12, unit: 'pcs', unitCost: 450000, totalCost: 5400000, priority: 'HIGH', orderDate: '2024-12-22' },
      { partNumber: 'RM-STL-002', partName: 'Thép tấm carbon 3mm', supplier: 'Thép Việt Nam Steel', quantity: 100, unit: 'kg', unitCost: 26000, totalCost: 2600000, priority: 'NORMAL', orderDate: '2025-01-05' },
    ];
  },

  async getQualitySummary() {
    return {
      passRate: 98.2,
      openNCRs: 3,
      inspectionsToday: 24,
      passedToday: 23,
      failedToday: 1,
    };
  },

  async getOpenNCRs() {
    return [
      { ncrNumber: 'NCR-2024-045', description: 'Lỗi kích thước Motor mount', product: 'SF-FRM-001', status: 'Open', severity: 'Major' },
      { ncrNumber: 'NCR-2024-044', description: 'Vết xước bề mặt', product: 'SF-CVR-001', status: 'In Progress', severity: 'Minor' },
      { ncrNumber: 'NCR-2024-043', description: 'Bearing noise', product: 'CMP-BRG-002', status: 'Open', severity: 'Critical' },
    ];
  },

  async getAnalytics(period: string) {
    return {
      revenue: {
        thisMonth: 3450000000,
        lastMonth: 2990000000,
        growth: 15.3,
      },
      production: {
        efficiency: 94.5,
        lastMonthEfficiency: 92.4,
      },
      inventory: {
        turnover: 4.2,
        avgDaysOnHand: 45,
      },
      trends: [
        { period: 'T7', value: 2800000000 },
        { period: 'T8', value: 2950000000 },
        { period: 'T9', value: 3100000000 },
        { period: 'T10', value: 2990000000 },
        { period: 'T11', value: 3200000000 },
        { period: 'T12', value: 3450000000 },
      ],
    };
  },

  async getSupplierInfo(supplierNames?: string[]) {
    const suppliers = [
      { name: 'Oriental Motor VN', items: 45, totalValue: 85000000, leadTime: 14, rating: 4.8 },
      { name: 'SKF Vietnam', items: 28, totalValue: 42000000, leadTime: 7, rating: 4.9 },
      { name: 'Thép Việt Nam Steel', items: 15, totalValue: 65000000, leadTime: 5, rating: 4.5 },
      { name: 'Nhôm Đông Á', items: 12, totalValue: 38000000, leadTime: 10, rating: 4.6 },
    ];
    if (supplierNames && supplierNames.length > 0) {
      return suppliers.filter(s => supplierNames.some(n => s.name.includes(n)));
    }
    return suppliers;
  },
};

// =============================================================================
// QUERY EXECUTOR
// =============================================================================

export class QueryExecutor {
  private dataFetcher: DataFetcher;

  constructor(fetcher?: DataFetcher) {
    // Use prismaDataFetcher as default for real database queries
    // Fall back to mockDataFetcher for testing
    this.dataFetcher = fetcher || prismaDataFetcher;
  }

  async execute(intent: DetectedIntent): Promise<QueryResult> {
    try {
      const data = await this.fetchDataForIntent(intent);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        data: {},
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async fetchDataForIntent(intent: DetectedIntent): Promise<Record<string, any>> {
    switch (intent.intent) {
      case 'inventory_status':
        return this.fetchInventoryStatus(intent);

      case 'inventory_shortage':
        return this.fetchInventoryShortage(intent);

      case 'order_status':
        return this.fetchOrderStatus(intent);

      case 'order_summary':
        return this.fetchOrderSummary();

      case 'production_status':
        return this.fetchProductionStatus();

      case 'mrp_calculation':
        return this.fetchMRPData(intent);

      case 'purchase_suggestion':
        return this.fetchPurchaseSuggestions();

      case 'quality_report':
        return this.fetchQualityReport();

      case 'supplier_info':
        return this.fetchSupplierInfo(intent);

      case 'analytics':
        return this.fetchAnalytics();

      case 'help':
        return { type: 'help' };

      default:
        return this.fetchGeneralOverview();
    }
  }

  private async fetchInventoryStatus(intent: DetectedIntent): Promise<Record<string, any>> {
    const [summary, alerts] = await Promise.all([
      this.dataFetcher.getInventorySummary(),
      this.dataFetcher.getInventoryAlerts(),
    ]);

    let items = alerts;
    if (intent.entities.partNumbers && intent.entities.partNumbers.length > 0) {
      items = await this.dataFetcher.getInventoryByParts(intent.entities.partNumbers);
    }

    return { summary, items, alerts: alerts.filter(a => a.status !== 'OK') };
  }

  private async fetchInventoryShortage(intent: DetectedIntent): Promise<Record<string, any>> {
    const [summary, alerts] = await Promise.all([
      this.dataFetcher.getInventorySummary(),
      this.dataFetcher.getInventoryAlerts(),
    ]);

    const shortages = alerts.filter(a => a.status === 'CRITICAL' || a.status === 'LOW');
    const critical = shortages.filter(a => a.status === 'CRITICAL');
    const low = shortages.filter(a => a.status === 'LOW');

    return {
      summary: {
        ...summary,
        criticalCount: critical.length,
        lowCount: low.length,
      },
      items: shortages,
      alerts: critical,
      critical,
      low,
    };
  }

  private async fetchOrderStatus(intent: DetectedIntent): Promise<Record<string, any>> {
    if (intent.entities.orderNumbers && intent.entities.orderNumbers.length > 0) {
      const orders = await this.dataFetcher.getOrdersByNumbers(intent.entities.orderNumbers);
      return { orders, summary: null };
    }

    const [summary, pending, recent] = await Promise.all([
      this.dataFetcher.getOrdersSummary(),
      this.dataFetcher.getPendingOrders(),
      this.dataFetcher.getRecentOrders(10),
    ]);

    return { summary, pending, orders: recent };
  }

  private async fetchOrderSummary(): Promise<Record<string, any>> {
    const [summary, pending, recent] = await Promise.all([
      this.dataFetcher.getOrdersSummary(),
      this.dataFetcher.getPendingOrders(),
      this.dataFetcher.getRecentOrders(5),
    ]);

    return { summary, pending, orders: recent };
  }

  private async fetchProductionStatus(): Promise<Record<string, any>> {
    const [summary, running, waiting] = await Promise.all([
      this.dataFetcher.getProductionSummary(),
      this.dataFetcher.getWorkOrders('Running'),
      this.dataFetcher.getWorkOrders('Waiting Material'),
    ]);

    return {
      summary,
      workOrders: [...running, ...waiting],
      issues: waiting.map(w => ({
        type: 'Chờ vật tư',
        description: `${w.orderNumber} - ${w.product}`,
      })),
    };
  }

  private async fetchMRPData(intent: DetectedIntent): Promise<Record<string, any>> {
    const orderIds = intent.entities.orderNumbers || [];
    const mrpResults = await this.dataFetcher.getMRPResults(orderIds);
    return mrpResults;
  }

  private async fetchPurchaseSuggestions(): Promise<Record<string, any>> {
    const suggestions = await this.dataFetcher.getPurchaseSuggestions();
    
    const bySupplier: Record<string, { items: number; total: number }> = {};
    let totalValue = 0;

    suggestions.forEach(s => {
      if (!bySupplier[s.supplier]) {
        bySupplier[s.supplier] = { items: 0, total: 0 };
      }
      bySupplier[s.supplier].items++;
      bySupplier[s.supplier].total += s.totalCost;
      totalValue += s.totalCost;
    });

    return { suggestions, bySupplier, totalValue };
  }

  private async fetchQualityReport(): Promise<Record<string, any>> {
    const [summary, ncrs] = await Promise.all([
      this.dataFetcher.getQualitySummary(),
      this.dataFetcher.getOpenNCRs(),
    ]);

    return { summary, ncrs };
  }

  private async fetchSupplierInfo(intent: DetectedIntent): Promise<Record<string, any>> {
    const suppliers = await this.dataFetcher.getSupplierInfo(intent.entities.suppliers);
    return { suppliers };
  }

  private async fetchAnalytics(): Promise<Record<string, any>> {
    const analytics = await this.dataFetcher.getAnalytics('6months');
    return analytics;
  }

  private async fetchGeneralOverview(): Promise<Record<string, any>> {
    const [inventory, orders, production, quality] = await Promise.all([
      this.dataFetcher.getInventorySummary(),
      this.dataFetcher.getOrdersSummary(),
      this.dataFetcher.getProductionSummary(),
      this.dataFetcher.getQualitySummary(),
    ]);

    return {
      inventory,
      orders,
      production,
      quality,
    };
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let queryExecutorInstance: QueryExecutor | null = null;

export function getQueryExecutor(fetcher?: DataFetcher): QueryExecutor {
  if (!queryExecutorInstance) {
    queryExecutorInstance = new QueryExecutor(fetcher);
  }
  return queryExecutorInstance;
}

export default QueryExecutor;
