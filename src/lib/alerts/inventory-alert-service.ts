// =============================================================================
// INVENTORY ALERT SERVICE
// Monitors inventory levels and generates reorder alerts
// =============================================================================

import { prisma } from '../prisma';
import { Alert, AlertType, createAlert } from './alert-engine';

// =============================================================================
// TYPES
// =============================================================================

export interface InventoryAlertItem {
  partId: string;
  partNumber: string;
  partName: string;
  category: string;
  currentStock: number;
  reorderPoint: number;
  minStockLevel: number;
  safetyStock: number;
  status: 'CRITICAL' | 'LOW' | 'WARNING';
  daysOfStock: number;
  avgDailyUsage: number;
  preferredSupplier?: {
    id: string;
    name: string;
    leadTimeDays: number;
  };
  suggestedOrderQty: number;
  estimatedCost: number;
}

export interface ReorderSuggestion {
  partId: string;
  partNumber: string;
  partName: string;
  quantity: number;
  supplier: {
    id: string;
    name: string;
    leadTimeDays: number;
  } | null;
  unitCost: number;
  totalCost: number;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

export interface InventoryAlertSummary {
  critical: number;
  low: number;
  warning: number;
  totalValue: number;
  items: InventoryAlertItem[];
  suggestions: ReorderSuggestion[];
  lastChecked: Date;
}

// =============================================================================
// INVENTORY ALERT SERVICE
// =============================================================================

class InventoryAlertService {
  private lastCheckTime: Date | null = null;
  private cachedAlerts: InventoryAlertItem[] = [];
  private alertCooldown: Map<string, Date> = new Map(); // Prevent duplicate alerts
  private cooldownMinutes = 60; // Don't create same alert within 60 minutes

  // ===========================================================================
  // CHECK INVENTORY LEVELS
  // ===========================================================================

  async checkInventoryLevels(): Promise<InventoryAlertItem[]> {
    // Get all parts with inventory info
    const parts = await prisma.part.findMany({
      where: {
        status: 'active',
      },
      select: {
        id: true,
        partNumber: true,
        name: true,
        category: true,
        unitCost: true,
        reorderPoint: true,
        minStockLevel: true,
        safetyStock: true,
        partSuppliers: {
          where: { isPreferred: true },
          include: { supplier: true },
          take: 1,
        },
        // Get inventory records
        inventory: {
          select: {
            quantity: true,
            reservedQty: true,
          },
        },
      },
    });

    // Create a map for quick lookup - sum up all inventory locations
    const stockMap = new Map<string, number>();
    parts.forEach((part) => {
      const totalStock = part.inventory.reduce(
        (sum: number, inv: { quantity: number; reservedQty: number }) =>
          sum + (inv.quantity - inv.reservedQty),
        0
      );
      stockMap.set(part.id, totalStock);
    });

    // For daily usage, we'll estimate based on a fraction of safety stock
    // In production, this should be calculated from actual consumption history
    const usageMap = new Map<string, number>();
    parts.forEach((part) => {
      // Estimate: if part has safety stock, assume usage is safetyStock/14 per day
      const estimatedUsage = part.safetyStock > 0 ? part.safetyStock / 14 : 0;
      usageMap.set(part.id, estimatedUsage);
    });

    // Analyze each part
    const alertItems: InventoryAlertItem[] = [];

    for (const part of parts) {
      const currentStock = stockMap.get(part.id) || 0;
      const avgDailyUsage = usageMap.get(part.id) || 0;
      const reorderPoint = part.reorderPoint || part.minStockLevel || 0;
      const safetyStock = part.safetyStock || 0;

      // Determine status
      let status: 'CRITICAL' | 'LOW' | 'WARNING' | null = null;

      if (currentStock <= 0) {
        status = 'CRITICAL';
      } else if (currentStock <= safetyStock) {
        status = 'CRITICAL';
      } else if (currentStock <= reorderPoint) {
        status = 'LOW';
      } else if (currentStock <= reorderPoint * 1.2) {
        status = 'WARNING';
      }

      if (status) {
        // Calculate days of stock remaining
        const daysOfStock = avgDailyUsage > 0 ? Math.floor(currentStock / avgDailyUsage) : 999;

        // Calculate suggested order quantity (EOQ simplified)
        const suggestedOrderQty = Math.max(
          reorderPoint - currentStock + safetyStock,
          Math.ceil(avgDailyUsage * 30) // At least 30 days supply
        );

        const preferredSupplier = part.partSuppliers[0]?.supplier;

        alertItems.push({
          partId: part.id,
          partNumber: part.partNumber,
          partName: part.name,
          category: part.category,
          currentStock,
          reorderPoint,
          minStockLevel: part.minStockLevel,
          safetyStock,
          status,
          daysOfStock,
          avgDailyUsage,
          preferredSupplier: preferredSupplier
            ? {
                id: preferredSupplier.id,
                name: preferredSupplier.name,
                leadTimeDays: preferredSupplier.leadTimeDays,
              }
            : undefined,
          suggestedOrderQty,
          estimatedCost: suggestedOrderQty * part.unitCost,
        });
      }
    }

    // Sort by status priority
    alertItems.sort((a, b) => {
      const priority = { CRITICAL: 0, LOW: 1, WARNING: 2 };
      return priority[a.status] - priority[b.status];
    });

    this.cachedAlerts = alertItems;
    this.lastCheckTime = new Date();

    return alertItems;
  }

  // ===========================================================================
  // GENERATE ALERTS
  // ===========================================================================

  async generateAlerts(): Promise<Alert[]> {
    const items = await this.checkInventoryLevels();
    const alerts: Alert[] = [];
    const now = new Date();

    for (const item of items) {
      const cooldownKey = `inventory:${item.partId}`;
      const lastAlert = this.alertCooldown.get(cooldownKey);

      // Skip if in cooldown
      if (lastAlert) {
        const minutesSinceLastAlert = (now.getTime() - lastAlert.getTime()) / (1000 * 60);
        if (minutesSinceLastAlert < this.cooldownMinutes) {
          continue;
        }
      }

      let alertType: AlertType;
      let severity: 'CRITICAL' | 'WARNING' | 'INFO';
      let title: string;
      let message: string;

      if (item.status === 'CRITICAL') {
        alertType = item.currentStock <= 0 ? 'STOCKOUT' : 'LOW_STOCK';
        severity = 'CRITICAL';
        title = item.currentStock <= 0
          ? `Het hang: ${item.partNumber}`
          : `Ton kho nguy hiem: ${item.partNumber}`;
        message = item.currentStock <= 0
          ? `${item.partName} da het hang. Can dat hang gap!`
          : `${item.partName} chi con ${item.currentStock} units (Safety: ${item.safetyStock})`;
      } else if (item.status === 'LOW') {
        alertType = 'LOW_STOCK';
        severity = 'WARNING';
        title = `Ton kho thap: ${item.partNumber}`;
        message = `${item.partName} con ${item.currentStock} units (Reorder: ${item.reorderPoint})`;
      } else {
        alertType = 'LOW_STOCK';
        severity = 'INFO';
        title = `Canh bao ton kho: ${item.partNumber}`;
        message = `${item.partName} sap can dat hang. Con ${item.daysOfStock} ngay ton kho`;
      }

      const alert = createAlert({
        type: alertType,
        title,
        message,
        severity,
        entityType: 'Part',
        entityId: item.partId,
        entityCode: item.partNumber,
        metadata: {
          currentStock: item.currentStock,
          reorderPoint: item.reorderPoint,
          safetyStock: item.safetyStock,
          daysOfStock: item.daysOfStock,
          suggestedOrderQty: item.suggestedOrderQty,
          estimatedCost: item.estimatedCost,
          preferredSupplier: item.preferredSupplier,
        },
      });

      alerts.push(alert);
      this.alertCooldown.set(cooldownKey, now);
    }

    return alerts;
  }

  // ===========================================================================
  // GET REORDER SUGGESTIONS
  // ===========================================================================

  async getReorderSuggestions(): Promise<ReorderSuggestion[]> {
    if (!this.cachedAlerts.length || !this.lastCheckTime) {
      await this.checkInventoryLevels();
    }

    return this.cachedAlerts
      .filter((item) => item.status !== 'WARNING')
      .map((item) => ({
        partId: item.partId,
        partNumber: item.partNumber,
        partName: item.partName,
        quantity: item.suggestedOrderQty,
        supplier: item.preferredSupplier || null,
        unitCost: item.estimatedCost / item.suggestedOrderQty,
        totalCost: item.estimatedCost,
        priority: item.status === 'CRITICAL' ? 'URGENT' : 'HIGH',
        reason:
          item.currentStock <= 0
            ? 'Het hang - Can dat gap'
            : item.daysOfStock <= 7
            ? `Chi con ${item.daysOfStock} ngay ton kho`
            : `Duoi muc reorder point (${item.currentStock}/${item.reorderPoint})`,
      }));
  }

  // ===========================================================================
  // GET SUMMARY
  // ===========================================================================

  async getSummary(): Promise<InventoryAlertSummary> {
    const items = await this.checkInventoryLevels();

    const critical = items.filter((i) => i.status === 'CRITICAL').length;
    const low = items.filter((i) => i.status === 'LOW').length;
    const warning = items.filter((i) => i.status === 'WARNING').length;
    const totalValue = items.reduce((sum, i) => sum + i.estimatedCost, 0);

    const suggestions = await this.getReorderSuggestions();

    return {
      critical,
      low,
      warning,
      totalValue,
      items,
      suggestions,
      lastChecked: this.lastCheckTime || new Date(),
    };
  }

  // ===========================================================================
  // CLEAR COOLDOWN (for testing)
  // ===========================================================================

  clearCooldown(): void {
    this.alertCooldown.clear();
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let inventoryAlertServiceInstance: InventoryAlertService | null = null;

export function getInventoryAlertService(): InventoryAlertService {
  if (!inventoryAlertServiceInstance) {
    inventoryAlertServiceInstance = new InventoryAlertService();
  }
  return inventoryAlertServiceInstance;
}

export default InventoryAlertService;
