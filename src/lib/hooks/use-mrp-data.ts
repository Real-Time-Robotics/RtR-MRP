// =============================================================================
// MRP DATA HOOKS
// Hooks để fetch và quản lý real data cho MRP Wizard
// =============================================================================

'use client';

import { useState, useCallback, useEffect } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface SalesOrderForMRP {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    code: string;
  };
  orderDate: string;
  requiredDate: string;
  status: string;
  totalValue: number;
  items: {
    id: string;
    partId: string;
    partNumber: string;
    partName: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface BOMItem {
  id: string;
  parentPartId: string;
  childPartId: string;
  childPart: {
    partNumber: string;
    partName: string;
    category: string;
    unit: string;
    unitCost: number;
  };
  quantity: number;
  unit: string;
}

export interface InventoryItem {
  partId: string;
  partNumber: string;
  partName: string;
  category: string;
  unit: string;
  onHand: number;
  onOrder: number;
  allocated: number;
  available: number;
  safetyStock: number;
  reorderPoint: number;
  unitCost: number;
  supplierId: string;
  supplierName: string;
  leadTime: number;
}

export interface MRPRequirement {
  partId: string;
  partNumber: string;
  partName: string;
  category: string;
  unit: string;
  grossRequirement: number;
  onHand: number;
  onOrder: number;
  safetyStock: number;
  netRequirement: number;
  status: 'OK' | 'LOW' | 'CRITICAL';
  supplierId: string;
  supplierName: string;
  leadTime: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseSuggestion {
  id: string;
  partId: string;
  partNumber: string;
  partName: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  orderDate: string;
  requiredDate: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
  leadTime: number;
}

export interface MRPRunResult {
  runId: string;
  runDate: string;
  salesOrders: string[];
  totalRequirements: number;
  criticalItems: number;
  lowItems: number;
  okItems: number;
  totalPurchaseValue: number;
  requirements: MRPRequirement[];
  suggestions: PurchaseSuggestion[];
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

const API_BASE = '/api/mrp';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// MOCK DATA
// Used as fallback for the MRP Wizard. For real API integration, use the SWR-based
// hooks in src/lib/hooks/ (e.g., useSalesOrders, useInventory, useParts) which
// fetch from /api/v2/* endpoints with proper caching and revalidation.
// =============================================================================

const mockSalesOrders: SalesOrderForMRP[] = [
  {
    id: '1',
    orderNumber: 'SO-2025-001',
    customer: { id: 'c1', name: 'ABC Manufacturing', code: 'ABC' },
    orderDate: '2025-01-02',
    requiredDate: '2025-01-15',
    status: 'Confirmed',
    totalValue: 150000000,
    items: [
      { id: 'i1', partId: 'fg1', partNumber: 'FG-PRD-A1', partName: 'Sản phẩm Model A1', quantity: 10, unitPrice: 15000000 },
    ],
  },
  {
    id: '2',
    orderNumber: 'SO-2025-002',
    customer: { id: 'c2', name: 'XYZ Industries', code: 'XYZ' },
    orderDate: '2025-01-02',
    requiredDate: '2025-01-20',
    status: 'Confirmed',
    totalValue: 92500000,
    items: [
      { id: 'i2', partId: 'fg2', partNumber: 'FG-PRD-A2', partName: 'Sản phẩm Model A2', quantity: 5, unitPrice: 18500000 },
    ],
  },
  {
    id: '3',
    orderNumber: 'SO-2025-003',
    customer: { id: 'c3', name: 'Đông Á Group', code: 'DAG' },
    orderDate: '2025-01-03',
    requiredDate: '2025-01-25',
    status: 'Pending',
    totalValue: 180000000,
    items: [
      { id: 'i3', partId: 'fg3', partNumber: 'FG-PRD-B1', partName: 'Sản phẩm Model B1', quantity: 15, unitPrice: 12000000 },
    ],
  },
];

const mockInventory: InventoryItem[] = [
  { partId: 'p1', partNumber: 'CMP-BRG-002', partName: 'Bạc đạn bi 6201-2RS', category: 'Components', unit: 'pcs', onHand: 25, onOrder: 0, allocated: 0, available: 25, safetyStock: 30, reorderPoint: 50, unitCost: 42000, supplierId: 's1', supplierName: 'SKF Vietnam', leadTime: 7 },
  { partId: 'p2', partNumber: 'CMP-MOT-001', partName: 'Motor DC 12V 50W', category: 'Components', unit: 'pcs', onHand: 15, onOrder: 10, allocated: 0, available: 25, safetyStock: 10, reorderPoint: 20, unitCost: 250000, supplierId: 's2', supplierName: 'Oriental Motor VN', leadTime: 14 },
  { partId: 'p3', partNumber: 'RM-STL-002', partName: 'Thép tấm carbon 3mm', category: 'Raw Materials', unit: 'kg', onHand: 120, onOrder: 0, allocated: 0, available: 120, safetyStock: 40, reorderPoint: 100, unitCost: 26000, supplierId: 's3', supplierName: 'Thép Việt Nam Steel', leadTime: 7 },
  { partId: 'p4', partNumber: 'CMP-GBX-001', partName: 'Hộp số giảm tốc 1:10', category: 'Components', unit: 'pcs', onHand: 18, onOrder: 5, allocated: 0, available: 23, safetyStock: 5, reorderPoint: 15, unitCost: 450000, supplierId: 's2', supplierName: 'Oriental Motor VN', leadTime: 21 },
  { partId: 'p5', partNumber: 'CMP-SCR-001', partName: 'Vít lục giác M4x10 inox', category: 'Components', unit: 'pcs', onHand: 2500, onOrder: 0, allocated: 0, available: 2500, safetyStock: 500, reorderPoint: 1000, unitCost: 500, supplierId: 's4', supplierName: 'Ốc vít Tân Tiến', leadTime: 3 },
  { partId: 'p6', partNumber: 'RM-ALU-001', partName: 'Nhôm tấm 1.5mm', category: 'Raw Materials', unit: 'kg', onHand: 85, onOrder: 50, allocated: 0, available: 135, safetyStock: 30, reorderPoint: 60, unitCost: 85000, supplierId: 's5', supplierName: 'Nhôm Đông Á', leadTime: 10 },
];

// Mock BOM explosion for products
const mockBOMExplosion: Record<string, { partId: string; quantity: number }[]> = {
  'fg1': [ // FG-PRD-A1
    { partId: 'p1', quantity: 2 },  // 2 bearings per product
    { partId: 'p2', quantity: 1 },  // 1 motor per product
    { partId: 'p3', quantity: 5 },  // 5kg steel per product
    { partId: 'p4', quantity: 1 },  // 1 gearbox per product
    { partId: 'p5', quantity: 20 }, // 20 screws per product
    { partId: 'p6', quantity: 2 },  // 2kg aluminum per product
  ],
  'fg2': [ // FG-PRD-A2
    { partId: 'p1', quantity: 4 },
    { partId: 'p2', quantity: 2 },
    { partId: 'p3', quantity: 8 },
    { partId: 'p4', quantity: 2 },
    { partId: 'p5', quantity: 30 },
    { partId: 'p6', quantity: 3 },
  ],
  'fg3': [ // FG-PRD-B1
    { partId: 'p1', quantity: 2 },
    { partId: 'p2', quantity: 1 },
    { partId: 'p3', quantity: 4 },
    { partId: 'p5', quantity: 15 },
  ],
};

// =============================================================================
// MRP CALCULATION ENGINE
// =============================================================================

function calculateMRP(
  selectedOrders: SalesOrderForMRP[],
  inventory: InventoryItem[],
  bomExplosion: Record<string, { partId: string; quantity: number }[]>
): MRPRunResult {
  // Step 1: Explode BOM to get gross requirements
  const grossRequirements: Record<string, number> = {};

  selectedOrders.forEach((order) => {
    order.items.forEach((item) => {
      const bom = bomExplosion[item.partId];
      if (bom) {
        bom.forEach((bomItem) => {
          const qty = bomItem.quantity * item.quantity;
          grossRequirements[bomItem.partId] = (grossRequirements[bomItem.partId] || 0) + qty;
        });
      }
    });
  });

  // Step 2: Calculate net requirements
  const requirements: MRPRequirement[] = [];
  const inventoryMap = new Map(inventory.map((i) => [i.partId, i]));

  Object.entries(grossRequirements).forEach(([partId, grossQty]) => {
    const inv = inventoryMap.get(partId);
    if (!inv) return;

    const netRequirement = Math.max(0, grossQty - inv.available + inv.safetyStock);
    let status: 'OK' | 'LOW' | 'CRITICAL' = 'OK';

    if (netRequirement > inv.safetyStock * 2) {
      status = 'CRITICAL';
    } else if (netRequirement > 0) {
      status = 'LOW';
    }

    requirements.push({
      partId,
      partNumber: inv.partNumber,
      partName: inv.partName,
      category: inv.category,
      unit: inv.unit,
      grossRequirement: grossQty,
      onHand: inv.onHand,
      onOrder: inv.onOrder,
      safetyStock: inv.safetyStock,
      netRequirement,
      status,
      supplierId: inv.supplierId,
      supplierName: inv.supplierName,
      leadTime: inv.leadTime,
      unitCost: inv.unitCost,
      totalCost: netRequirement * inv.unitCost,
    });
  });

  // Sort by status priority
  requirements.sort((a, b) => {
    const priority = { CRITICAL: 0, LOW: 1, OK: 2 };
    return priority[a.status] - priority[b.status];
  });

  // Step 3: Generate purchase suggestions
  const today = new Date();
  const suggestions: PurchaseSuggestion[] = requirements
    .filter((r) => r.netRequirement > 0)
    .map((r) => {
      const orderDate = new Date(today);
      const requiredDate = new Date(selectedOrders[0]?.requiredDate || today);
      
      // Calculate order date based on lead time
      orderDate.setDate(requiredDate.getDate() - r.leadTime);

      let priority: 'URGENT' | 'HIGH' | 'NORMAL' = 'NORMAL';
      if (orderDate <= today) {
        priority = 'URGENT';
      } else if (r.status === 'CRITICAL') {
        priority = 'HIGH';
      }

      return {
        id: `sug_${r.partId}`,
        partId: r.partId,
        partNumber: r.partNumber,
        partName: r.partName,
        supplierId: r.supplierId,
        supplierName: r.supplierName,
        quantity: r.netRequirement,
        unit: r.unit,
        unitCost: r.unitCost,
        totalCost: r.totalCost,
        orderDate: orderDate.toISOString().split('T')[0],
        requiredDate: requiredDate.toISOString().split('T')[0],
        priority,
        leadTime: r.leadTime,
      };
    });

  // Sort suggestions by priority
  suggestions.sort((a, b) => {
    const priority = { URGENT: 0, HIGH: 1, NORMAL: 2 };
    return priority[a.priority] - priority[b.priority];
  });

  // Step 4: Generate result summary
  const criticalItems = requirements.filter((r) => r.status === 'CRITICAL').length;
  const lowItems = requirements.filter((r) => r.status === 'LOW').length;
  const okItems = requirements.filter((r) => r.status === 'OK').length;
  const totalPurchaseValue = suggestions.reduce((sum, s) => sum + s.totalCost, 0);

  return {
    runId: `MRP_${Date.now()}`,
    runDate: new Date().toISOString(),
    salesOrders: selectedOrders.map((o) => o.orderNumber),
    totalRequirements: requirements.length,
    criticalItems,
    lowItems,
    okItems,
    totalPurchaseValue,
    requirements,
    suggestions,
  };
}

// =============================================================================
// HOOKS
// =============================================================================

export function useSalesOrdersForMRP() {
  const [orders, setOrders] = useState<SalesOrderForMRP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Uses mock data for the MRP Wizard. For real API integration, use the
      // SWR-based useSalesOrders hook which fetches from /api/v2/sales-orders.
      // const data = await fetchAPI<SalesOrderForMRP[]>('/sales-orders');
      await new Promise((resolve) => setTimeout(resolve, 500));
      setOrders(mockSalesOrders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { orders, isLoading, error, refetch: fetchOrders };
}

export function useMRPCalculation() {
  const [result, setResult] = useState<MRPRunResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const runMRP = useCallback(async (selectedOrderIds: string[]) => {
    setIsCalculating(true);
    setError(null);
    setProgress(0);
    try {
      // Submit MRP calculation to background job queue
      const response = await fetch('/api/mrp/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selectedOrderIds }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'MRP request failed' }));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const submitResult = await response.json();
      const bgJobId = submitResult.backgroundJobId;

      if (!bgJobId) {
        // Fallback: direct result (no background job)
        if (submitResult.data) {
          const data = submitResult.data;
          setResult(data);
          return data;
        }
        throw new Error('Unexpected response format');
      }

      // Poll for background job completion
      let attempts = 0;
      const maxAttempts = 300; // 5 minutes at 1s intervals
      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;

        const statusRes = await fetch(`/api/jobs/${bgJobId}`);
        if (!statusRes.ok) continue;

        const jobStatus = await statusRes.json();
        setProgress(jobStatus.progress || 0);

        if (jobStatus.status === 'completed') {
          const mrpResult = jobStatus.result as MRPRunResult;
          setResult(mrpResult);
          setProgress(100);
          return mrpResult;
        }

        if (jobStatus.status === 'failed' || jobStatus.status === 'cancelled') {
          throw new Error(jobStatus.error || 'MRP calculation failed');
        }
      }

      throw new Error('MRP calculation timed out after 5 minutes');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'MRP calculation failed';
      setError(message);
      throw new Error(message);
    } finally {
      setIsCalculating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setProgress(0);
  }, []);

  return { result, isCalculating, progress, error, runMRP, reset };
}

export function useInventoryData() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      setIsLoading(true);
      // Uses mock data. For real API integration, use the SWR-based
      // useInventory hook which fetches from /api/v2/inventory.
      await new Promise((resolve) => setTimeout(resolve, 300));
      setInventory(mockInventory);
      setIsLoading(false);
    };
    fetchInventory();
  }, []);

  return { inventory, isLoading };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function formatCurrency(value: number): string {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)} tỷ`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)} triệu`;
  }
  return new Intl.NumberFormat('vi-VN').format(value);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    URGENT: 'Khẩn cấp',
    HIGH: 'Cao',
    NORMAL: 'Bình thường',
  };
  return labels[priority] || priority;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    CRITICAL: 'Thiếu nghiêm trọng',
    LOW: 'Sắp hết',
    OK: 'Đủ hàng',
  };
  return labels[status] || status;
}
