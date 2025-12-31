// =============================================================================
// RTR MRP - DATA HOOKS (TYPE-SAFE)
// React hooks for data fetching with SWR - NO ANY TYPES
// =============================================================================

import useSWR, { SWRConfiguration } from 'swr';
import { useState, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface QueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | number | boolean | undefined;
}

// =============================================================================
// ENTITY TYPES
// =============================================================================

export interface RecentOrder {
  id: string;
  soNumber: string;
  customer: string;
  customerCode: string;
  amount: number;
  status: string;
  date: string;
  itemCount: number;
}

export interface RecentWorkOrder {
  id: string;
  woNumber: string;
  product: string;
  sku: string;
  quantity: number;
  completed: number;
  status: string;
  dueDate: string | null;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface Part {
  id: string;
  partNumber: string;
  name: string;
  description?: string;
  category: string;
  subCategory?: string;
  partType?: string;
  unit: string;
  revision?: string;
  ndaaCompliant: boolean;
  itarControlled: boolean;
  rohsCompliant: boolean;
  countryOfOrigin?: string;
  hsCode?: string;
  eccn?: string;
  lotControl: boolean;
  serialControl: boolean;
  shelfLifeDays?: number;
  lifecycleStatus: string;
  makeOrBuy: string;
  critical: boolean;
  onHand: number;
  available: number;
  minStock: number;
  maxStock?: number;
  reorderPoint: number;
  safetyStock: number;
  stockStatus: string;
  unitCost: number;
  standardCost?: number;
  primarySupplier?: {
    id: string;
    code: string;
    name: string;
    country?: string;
  };
  leadTimeDays: number;
  manufacturer?: string;
  manufacturerPn?: string;
  drawingNumber?: string;
  supplierCount: number;
  documentCount: number;
  alternateCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SalesOrder {
  id: string;
  soNumber: string;
  customer: {
    id: string;
    code: string;
    name: string;
    email?: string;
    phone?: string;
    contactName?: string;
    address?: string;
    city?: string;
    country?: string;
    type?: string;
    ndaaRequired?: boolean;
    itarRequired?: boolean;
  };
  orderDate: string;
  requestedDate?: string;
  promisedDate?: string;
  status: string;
  priority: string;
  totalAmount: number;
  currency: string;
  paymentTerms?: string;
  shippingMethod?: string;
  shippingAddress?: string;
  lines: SalesOrderLine[];
  lineCount: number;
  totalQuantity: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesOrderLine {
  id: string;
  lineNumber: number;
  product: {
    id: string;
    sku: string;
    name: string;
    basePrice?: number;
  };
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineTotal: number;
  status: string;
}

export interface WorkOrder {
  id: string;
  woNumber: string;
  product: {
    id: string;
    sku: string;
    name: string;
    revision?: string;
    basePrice?: number;
    assemblyHours?: number;
  };
  quantity: number;
  completedQty: number;
  scrapQty: number;
  progress: number;
  startDate?: string;
  dueDate?: string;
  completionDate?: string;
  isOverdue: boolean;
  status: string;
  priority: string;
  workCenter?: string;
  operations: WorkOrderOperation[];
  totalOperations: number;
  completedOperations: number;
  currentOperation?: string;
  operationProgress: number;
  plannedHours: number;
  actualHours: number;
  efficiency: number;
  materials: WorkOrderMaterial[];
  materialCount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderOperation {
  id: string;
  operationSeq: number;
  operationName: string;
  workCenter?: string;
  plannedHours: number;
  actualHours: number;
  status: string;
  startTime?: string;
  endTime?: string;
}

export interface WorkOrderMaterial {
  id: string;
  part: {
    id: string;
    partNumber: string;
    name: string;
    unitCost?: number;
  };
  requiredQty: number;
  issuedQty: number;
  scrapQty: number;
  status: string;
}

export interface NCR {
  id: string;
  ncrNumber: string;
  partId?: string;
  partNumber?: string;
  partName?: string;
  description: string;
  type: string;
  source: string;
  quantityAffected: number;
  rootCause?: string;
  disposition?: string;
  costImpact: number;
  status: string;
  severity: string;
  assignedTo?: string;
  dateCreated: string;
  dueDate: string;
  isOverdue: boolean;
  capas: CAPA[];
  capaCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CAPA {
  id: string;
  capaNumber: string;
  type: string;
  status: string;
  dueDate?: string;
}

export interface InventoryItem {
  id: string;
  partId: string;
  partNumber: string;
  partName: string;
  category: string;
  unit: string;
  critical: boolean;
  warehouse: {
    id: string;
    code: string;
    name: string;
    type?: string;
  };
  location?: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  minStock: number;
  maxStock?: number;
  reorderPoint: number;
  safetyStock: number;
  stockStatus: string;
  statusColor: string;
  lotNumber?: string;
  serialNumber?: string;
  lotControl: boolean;
  serialControl: boolean;
  receivedDate?: string;
  expiryDate?: string;
  lastCountDate?: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysUntilExpiry?: number;
  unitCost: number;
  totalValue: number;
  qualityStatus?: string;
  updatedAt: string;
}

export interface BOMLine {
  id: string;
  findNumber?: number;
  referenceDesignator?: string;
  sequence: number;
  partId: string;
  partNumber: string;
  partName: string;
  partDescription?: string;
  quantity: number;
  unit: string;
  scrapPercent: number;
  effectiveQty: number;
  module?: string;
  bomType: string;
  subAssembly: boolean;
  phantom: boolean;
  critical: boolean;
  isPrimary: boolean;
  revision: string;
  effectivityDate?: string;
  obsoleteDate?: string;
  alternateGroup?: string;
  alternates: BOMAlternate[];
  unitCost: number;
  extendedCost: number;
  onHand: number;
  available: number;
  shortage: number;
  supplier?: {
    id: string;
    code: string;
    name: string;
    leadTimeDays?: number;
  };
  leadTimeDays: number;
  positionX?: number;
  positionY?: number;
  positionZ?: number;
  operationSeq?: number;
  notes?: string;
}

export interface BOMAlternate {
  id: string;
  partNumber: string;
  name: string;
  unitCost: number;
  type?: string;
  priority?: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  revision?: string;
  status?: string;
  lifecycleStatus?: string;
  basePrice: number;
  bomLineCount: number;
  workOrderCount: number;
  totalBOMCost: number;
  criticalParts: number;
  modules: string[];
  margin: string;
  assemblyHours?: number;
  weightKg?: number;
  ndaaCompliant?: boolean;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface PartInput {
  partNumber: string;
  name: string;
  description?: string;
  category: string;
  subCategory?: string;
  partType?: string;
  unit?: string;
  ndaaCompliant?: boolean;
  itarControlled?: boolean;
  rohsCompliant?: boolean;
  reachCompliant?: boolean;
  countryOfOrigin?: string;
  hsCode?: string;
  eccn?: string;
  lotControl?: boolean;
  serialControl?: boolean;
  shelfLifeDays?: number;
  inspectionRequired?: boolean;
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number;
  safetyStock?: number;
  leadTimeDays?: number;
  critical?: boolean;
  unitCost?: number;
  standardCost?: number;
  makeOrBuy?: 'MAKE' | 'BUY' | 'BOTH';
  manufacturer?: string;
  manufacturerPn?: string;
  drawingNumber?: string;
  primarySupplierId?: string;
  notes?: string;
  tags?: string[];
}

export interface SalesOrderLineInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
}

export interface SalesOrderInput {
  customerId: string;
  orderDate?: string;
  requestedDate?: string;
  promisedDate?: string;
  status?: 'DRAFT' | 'PENDING' | 'CONFIRMED';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  currency?: string;
  paymentTerms?: string;
  shippingMethod?: string;
  shippingAddress?: string;
  notes?: string;
  lines: SalesOrderLineInput[];
}

export interface WorkOrderOperationInput {
  seq: number;
  name: string;
  workCenter?: string;
  plannedHours: number;
}

export interface WorkOrderInput {
  productId: string;
  quantity: number;
  startDate?: string;
  dueDate?: string;
  status?: 'DRAFT' | 'RELEASED';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  workCenter?: string;
  notes?: string;
  operations?: WorkOrderOperationInput[];
}

export interface InventoryActionInput {
  action: 'receive' | 'issue' | 'reserve' | 'transfer' | 'adjust';
  partId: string;
  warehouseId: string;
  quantity: number;
  toWarehouseId?: string;
  lotNumber?: string;
  serialNumber?: string;
  notes?: string;
}

export interface BOMLineInput {
  productId: string;
  partId: string;
  quantity: number;
  unit?: string;
  module?: string;
  critical?: boolean;
  notes?: string;
  findNumber?: number;
  referenceDesignator?: string;
  scrapPercent?: number;
  operationSeq?: number;
  revision?: string;
  effectivityDate?: string;
  alternateGroup?: string;
  isPrimary?: boolean;
  bomType?: string;
  subAssembly?: boolean;
  phantom?: boolean;
  sequence?: number;
  positionX?: number;
  positionY?: number;
  positionZ?: number;
}

// =============================================================================
// FETCHER
// =============================================================================

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    throw error;
  }
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'API request failed');
  }
  return json.data;
};

// Build URL with query params
const buildUrl = (base: string, params?: QueryParams): string => {
  if (!params) return base;
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `${base}?${query}` : base;
};

// =============================================================================
// DASHBOARD HOOKS
// =============================================================================

export interface DashboardData {
  kpis: {
    inventory: {
      totalParts: number;
      lowStockParts: number;
      outOfStockParts: number;
      totalValue: number;
    };
    sales: {
      totalOrders: number;
      pendingOrders: number;
      monthlyRevenue: number;
      revenueTrend: number;
    };
    production: {
      activeWorkOrders: number;
      completedMTD: number;
    };
    quality: {
      openNCRs: number;
    };
  };
  recentOrders: RecentOrder[];
  recentWorkOrders: RecentWorkOrder[];
  inventoryByCategory: CategoryCount[];
}

export function useDashboard(config?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<DashboardData>(
    '/api/v2/dashboard',
    fetcher,
    {
      refreshInterval: 30000,
      ...config,
    }
  );

  return {
    data,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

// =============================================================================
// PARTS HOOKS
// =============================================================================

export interface PartFilters {
  category?: string;
  status?: string;
  type?: string;
  itar?: string;
  stockStatus?: string;
}

interface PartsResponse {
  items: Part[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters?: {
    categories: Array<{ value: string; count: number }>;
  };
}

export function useParts(params?: QueryParams & PartFilters, config?: SWRConfiguration) {
  const url = buildUrl('/api/v2/parts', params);

  const { data, error, isLoading, mutate } = useSWR<PartsResponse>(
    url,
    fetcher,
    config
  );

  return {
    parts: data?.items || [],
    total: data?.total || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 20,
    totalPages: data?.totalPages || 0,
    filters: data?.filters,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

export function usePart(id: string | null, config?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<Part>(
    id ? `/api/v2/parts/${id}` : null,
    fetcher,
    config
  );

  return {
    part: data,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

// =============================================================================
// SALES HOOKS
// =============================================================================

export interface SalesFilters {
  status?: string;
  priority?: string;
  view?: 'list' | 'kanban';
}

interface SalesResponse {
  items?: SalesOrder[];
  kanban?: Record<string, SalesOrder[]>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  kpis?: {
    totalOrders: number;
    pendingOrders: number;
    monthlyRevenue: number;
    avgOrderValue: number;
  };
}

export function useSalesOrders(params?: QueryParams & SalesFilters, config?: SWRConfiguration) {
  const url = buildUrl('/api/v2/sales', params);

  const { data, error, isLoading, mutate } = useSWR<SalesResponse>(
    url,
    fetcher,
    config
  );

  return {
    orders: data?.items || [],
    kanban: data?.kanban,
    total: data?.total || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 20,
    totalPages: data?.totalPages || 0,
    kpis: data?.kpis,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

export function useSalesOrder(id: string | null, config?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<SalesOrder>(
    id ? `/api/v2/sales/${id}` : null,
    fetcher,
    config
  );

  return {
    order: data,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

// =============================================================================
// PRODUCTION HOOKS
// =============================================================================

export interface ProductionFilters {
  status?: string;
  priority?: string;
  workCenter?: string;
  view?: 'list' | 'kanban';
}

interface ProductionResponse {
  items?: WorkOrder[];
  kanban?: Record<string, WorkOrder[]>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  kpis?: {
    activeWorkOrders: number;
    completedMTD: number;
  };
}

export function useWorkOrders(params?: QueryParams & ProductionFilters, config?: SWRConfiguration) {
  const url = buildUrl('/api/v2/production', params);

  const { data, error, isLoading, mutate } = useSWR<ProductionResponse>(
    url,
    fetcher,
    config
  );

  return {
    workOrders: data?.items || [],
    kanban: data?.kanban,
    total: data?.total || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 20,
    totalPages: data?.totalPages || 0,
    kpis: data?.kpis,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

export function useWorkOrder(id: string | null, config?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<WorkOrder>(
    id ? `/api/v2/production/${id}` : null,
    fetcher,
    config
  );

  return {
    workOrder: data,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

// =============================================================================
// QUALITY HOOKS
// =============================================================================

export interface QualityFilters {
  status?: string;
  severity?: string;
  source?: string;
  view?: 'list' | 'kanban';
}

interface QualityResponse {
  items?: NCR[];
  kanban?: Record<string, NCR[]>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  kpis?: {
    openNCRs: number;
    closedMTD: number;
    customerIssues: number;
  };
}

export function useNCRs(params?: QueryParams & QualityFilters, config?: SWRConfiguration) {
  const url = buildUrl('/api/v2/quality', params);

  const { data, error, isLoading, mutate } = useSWR<QualityResponse>(
    url,
    fetcher,
    config
  );

  return {
    ncrs: data?.items || [],
    kanban: data?.kanban,
    total: data?.total || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 20,
    totalPages: data?.totalPages || 0,
    kpis: data?.kpis,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

// =============================================================================
// INVENTORY HOOKS
// =============================================================================

export interface InventoryFilters {
  warehouse?: string;
  category?: string;
  stockStatus?: string;
}

interface InventoryResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  kpis?: {
    totalValue: number;
    totalItems: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiringCount: number;
  };
  stockSummary?: {
    inStock: number;
    lowStock: number;
    critical: number;
    outOfStock: number;
    overstock: number;
  };
  filters?: {
    warehouses: Array<{ value: string; label: string; code: string }>;
    categories: Array<{ value: string; count: number }>;
  };
}

export function useInventory(params?: QueryParams & InventoryFilters, config?: SWRConfiguration) {
  const url = buildUrl('/api/v2/inventory', params);

  const { data, error, isLoading, mutate } = useSWR<InventoryResponse>(
    url,
    fetcher,
    config
  );

  return {
    inventory: data?.items || [],
    total: data?.total || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 20,
    totalPages: data?.totalPages || 0,
    kpis: data?.kpis,
    stockSummary: data?.stockSummary,
    filters: data?.filters,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

export function useInventoryActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const performAction = useCallback(async (
    action: 'receive' | 'issue' | 'reserve' | 'transfer' | 'adjust',
    data: Omit<InventoryActionInput, 'action'>
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v2/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error);
      }
      return json.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { performAction, isLoading, error };
}

// =============================================================================
// BOM HOOKS
// =============================================================================

export interface BOMFilters {
  search?: string;
  category?: string;
  bomType?: string;
}

interface BOMListResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface BOMTreeResponse {
  product: {
    id: string;
    sku: string;
    name: string;
    description?: string;
    revision?: string;
    basePrice: number;
    assemblyHours?: number;
  };
  bomLines: BOMLine[];
  tree?: Record<string, BOMLine[]>;
  summary: {
    totalCost: number;
    totalParts: number;
    criticalCount: number;
    shortageCount: number;
    longestLeadTime: number;
    margin: string | number;
    costByModule: Array<{ module: string; cost: number; partCount: number }>;
  };
}

export function useBOMs(params?: QueryParams & BOMFilters, config?: SWRConfiguration) {
  const url = buildUrl('/api/v2/bom', params);

  const { data, error, isLoading, mutate } = useSWR<BOMListResponse>(
    url,
    fetcher,
    config
  );

  return {
    products: data?.items || [],
    total: data?.total || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 20,
    totalPages: data?.totalPages || 0,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

export function useBOM(productId: string | null, includeTree: boolean = true, config?: SWRConfiguration) {
  const url = productId
    ? buildUrl('/api/v2/bom', { productId, includeTree: includeTree.toString() })
    : null;

  const { data, error, isLoading, mutate } = useSWR<BOMTreeResponse>(
    url,
    fetcher,
    config
  );

  return {
    product: data?.product,
    bomLines: data?.bomLines || [],
    tree: data?.tree,
    summary: data?.summary,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

export function useBOMActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addLine = useCallback(async (data: BOMLineInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v2/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateLine = useCallback(async (id: string, data: Partial<BOMLineInput>) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v2/bom', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteLine = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v2/bom?id=${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return true;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { addLine, updateLine, deleteLine, isLoading, error };
}

// =============================================================================
// ANALYTICS HOOKS
// =============================================================================

export type AnalyticsTab = 'overview' | 'inventory' | 'sales' | 'production' | 'quality';

export interface AnalyticsParams {
  tab?: AnalyticsTab;
  period?: number;
  startDate?: string;
  endDate?: string;
}

interface OverviewAnalytics {
  kpis: {
    totalRevenue: number;
    totalOrders: number;
    completedWorkOrders: number;
    inventoryValue: number;
    avgOrderValue: number;
  };
  recentOrders: Array<{
    id: string;
    soNumber: string;
    customer: string;
    amount: number;
    status: string;
    date: string;
  }>;
  recentWorkOrders: Array<{
    id: string;
    woNumber: string;
    product: string;
    sku: string;
    quantity: number;
    status: string;
  }>;
  alerts: {
    lowStock: number;
    overdueOrders: number;
    openNCRs: number;
  };
}

interface InventoryAnalytics {
  summary: {
    totalValue: number;
    totalQuantity: number;
    totalParts: number;
  };
  byCategory: Array<{ category: string; count: number }>;
  stockDistribution: {
    inStock: number;
    lowStock: number;
    critical: number;
    outOfStock: number;
    overstock: number;
  };
}

interface SalesAnalytics {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
  };
  byStatus: Array<{ status: string; count: number; revenue: number }>;
  trend: Array<{ date: string; orders: number; revenue: number }>;
}

interface ProductionAnalytics {
  summary: {
    totalWorkOrders: number;
    totalQuantity: number;
    completedQuantity: number;
    scrapQuantity: number;
    yieldRate: string | number;
  };
  byStatus: Array<{ status: string; count: number; quantity: number }>;
  onTimeDelivery: {
    total: number;
    onTime: number;
    rate: string | number;
  };
}

interface QualityAnalytics {
  summary: {
    totalNCRs: number;
    quantityAffected: number;
    totalCost: number;
  };
  bySource: Array<{ source: string; count: number; cost: number }>;
  byType: Array<{ type: string; count: number; cost: number }>;
}

type AnalyticsData =
  | OverviewAnalytics
  | InventoryAnalytics
  | SalesAnalytics
  | ProductionAnalytics
  | QualityAnalytics;

export function useAnalytics(params?: AnalyticsParams, config?: SWRConfiguration) {
  const url = buildUrl('/api/v2/analytics', params as QueryParams);

  const { data, error, isLoading, mutate } = useSWR<AnalyticsData>(
    url,
    fetcher,
    config
  );

  return {
    data,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

export function useOverviewAnalytics(period = 30, config?: SWRConfiguration) {
  return useAnalytics({ tab: 'overview', period }, config);
}

export function useInventoryAnalytics(period = 30, config?: SWRConfiguration) {
  return useAnalytics({ tab: 'inventory', period }, config);
}

export function useSalesAnalytics(period = 30, config?: SWRConfiguration) {
  return useAnalytics({ tab: 'sales', period }, config);
}

export function useProductionAnalytics(period = 30, config?: SWRConfiguration) {
  return useAnalytics({ tab: 'production', period }, config);
}

export function useQualityAnalytics(period = 30, config?: SWRConfiguration) {
  return useAnalytics({ tab: 'quality', period }, config);
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

export function useCreatePart() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createPart = useCallback(async (data: PartInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v2/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as Part;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createPart, isLoading, error };
}

export function useCreateSalesOrder() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createOrder = useCallback(async (data: SalesOrderInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v2/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as SalesOrder;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createOrder, isLoading, error };
}

export function useCreateWorkOrder() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createWorkOrder = useCallback(async (data: WorkOrderInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v2/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as WorkOrder;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createWorkOrder, isLoading, error };
}

export function useUpdateRecord<T>(endpoint: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(async (id: string, data: Partial<T>) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${endpoint}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as T;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  return { update, isLoading, error };
}

export function useDeleteRecord(endpoint: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteRecord = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${endpoint}/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return true;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  return { deleteRecord, isLoading, error };
}
