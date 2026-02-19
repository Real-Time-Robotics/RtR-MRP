// src/components/inventory/inventory-types.ts
// Shared types for Inventory components

import { StockStatus } from '@/types';
import { FieldChange } from '@/lib/change-impact/types';

export interface InventoryItem {
  id: string; // Inventory ID (or Part ID if distinct)
  partId: string;
  partNumber: string;
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  isCritical: boolean;
  minStockLevel: number;
  reorderPoint: number;
  safetyStock: number;
  quantity: number;
  reserved: number;
  available: number;
  status: StockStatus;
  warehouseId?: string;
  warehouseName?: string;
  lotNumber?: string;
  expiryDate?: string;
  locationCode?: string;
}

export interface InventoryTableProps {
  initialData?: InventoryItem[];
}

export interface AdjustData {
  inventoryId: string;
  partId: string;
  warehouseId: string;
  adjustmentType: string;
  quantity: string;
  reason: string;
}

export const DEFAULT_ADJUST_DATA: AdjustData = {
  inventoryId: '',
  partId: '',
  warehouseId: '',
  adjustmentType: 'ADD',
  quantity: '',
  reason: '',
};

// Field labels for change impact
export const INVENTORY_FIELD_LABELS: Record<string, { label: string; valueType: FieldChange['valueType'] }> = {
  quantity: { label: 'Quantity', valueType: 'number' },
  safetyStock: { label: 'Safety Stock', valueType: 'number' },
  minStockLevel: { label: 'Min Stock Level', valueType: 'number' },
  reorderPoint: { label: 'Reorder Point', valueType: 'number' },
};

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
