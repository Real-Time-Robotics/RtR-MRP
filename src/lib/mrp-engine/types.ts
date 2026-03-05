/**
 * Types and interfaces for the MRP Engine modules.
 * Shared across all mrp-engine sub-modules.
 */

export interface MrpParams {
  planningHorizonDays: number;
  includeConfirmed: boolean;
  includeDraft: boolean;
  includeSafetyStock: boolean;
}

export interface PartRequirement {
  partId: string;
  partNumber: string;
  partName: string;
  requiredQty: number;
  currentStock: number;
  reservedQty: number;
  availableStock: number;
  incomingQty: number;
  netRequirement: number;
  safetyStock: number;
  reorderPoint: number;
  sourceOrders: Array<{
    orderId: string;
    orderNumber: string;
    quantity: number;
    dueDate: Date;
  }>;
}

export interface MrpSuggestionData {
  partId: string;
  actionType: "PURCHASE" | "MANUFACTURE" | "EXPEDITE" | "DEFER" | "CANCEL";
  priority: "HIGH" | "MEDIUM" | "LOW";
  suggestedQty?: number;
  suggestedDate?: Date;
  reason: string;
  sourceOrderId?: string;
  supplierId?: string;
  estimatedCost?: number;
  currentStock?: number;
  requiredQty?: number;
  shortageQty?: number;
}
