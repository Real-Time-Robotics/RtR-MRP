// ============ COMMON TYPES ============
export type Status = "active" | "inactive" | "obsolete" | "pending";

export type OrderStatus =
  | "draft"
  | "confirmed"
  | "in_production"
  | "ready"
  | "shipped"
  | "delivered"
  | "cancelled";

export type POStatus =
  | "draft"
  | "sent"
  | "confirmed"
  | "partial"
  | "received"
  | "cancelled";

export type Priority = "low" | "normal" | "high" | "urgent";

export type StockStatus = "OK" | "REORDER" | "CRITICAL" | "OUT_OF_STOCK";

// ============ SUPPLIER ============
export interface Supplier {
  id: string;
  code: string;
  name: string;
  country: string;
  ndaaCompliant: boolean;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  paymentTerms?: string;
  leadTimeDays: number;
  rating?: number;
  category?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============ PART ============
export interface Part {
  id: string;
  partNumber: string;
  name: string;
  category: string;
  description?: string;
  unit: string;
  unitCost: number;
  weightKg?: number;
  isCritical: boolean;
  minStockLevel: number;
  reorderPoint: number;
  safetyStock: number;
  shelfLifeDays?: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartWithInventory extends Part {
  quantity: number;
  reservedQty: number;
  availableQty: number;
  stockStatus: StockStatus;
}

// ============ PRODUCT & BOM ============
export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  basePrice?: number;
  assemblyHours?: number;
  testingHours?: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BomHeader {
  id: string;
  productId: string;
  version: string;
  effectiveDate: Date;
  expiryDate?: Date;
  status: string;
  notes?: string;
  createdAt: Date;
}

export interface BomLine {
  id: string;
  bomId: string;
  lineNumber: number;
  partId: string;
  quantity: number;
  unit: string;
  level: number;
  moduleCode?: string;
  moduleName?: string;
  position?: string;
  isCritical: boolean;
  scrapRate: number;
  notes?: string;
  part?: Part;
}

export interface BomModule {
  moduleCode: string;
  moduleName: string;
  lines: BomLine[];
  totalParts: number;
  totalCost: number;
}

export interface BomExplosionResult {
  partId: string;
  partNumber: string;
  name: string;
  needed: number;
  available: number;
  shortage: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  status: "OK" | "SHORTAGE";
  moduleCode?: string;
  moduleName?: string;
  level: number;
  isSubAssembly: boolean;
  parentPartNumber?: string;
  children?: BomExplosionResult[];
  quantityPer: number;
}

// ============ INVENTORY ============
export type WarehouseType = 'RECEIVING' | 'QUARANTINE' | 'MAIN' | 'WIP' | 'FINISHED_GOODS' | 'SHIPPING' | 'HOLD' | 'SCRAP';

/** Material flow order for warehouse sorting */
export const WAREHOUSE_FLOW_ORDER: Record<string, number> = {
  RECEIVING: 1,
  QUARANTINE: 2,
  MAIN: 3,
  WIP: 4,
  FINISHED_GOODS: 5,
  SHIPPING: 6,
  HOLD: 7,
  SCRAP: 8,
};

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location?: string;
  type?: string;
  status: string;
  createdAt: Date;
}

export interface Inventory {
  id: string;
  partId: string;
  warehouseId: string;
  quantity: number;
  reservedQty: number;
  lotNumber?: string;
  locationCode?: string;
  expiryDate?: Date;
  lastCountDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  part?: Part;
  warehouse?: Warehouse;
}

// ============ CUSTOMER & SALES ============
export interface Customer {
  id: string;
  code: string;
  name: string;
  type?: string;
  country?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  billingAddress?: string;
  paymentTerms?: string;
  creditLimit?: number;
  status: string;
  createdAt: Date;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  orderDate: Date;
  requiredDate: Date;
  promisedDate?: Date;
  priority: Priority;
  status: OrderStatus;
  totalAmount?: number;
  currency: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  customer?: Customer;
  lines?: SalesOrderLine[];
}

export interface SalesOrderLine {
  id: string;
  orderId: string;
  lineNumber: number;
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal?: number;
  options?: string;
  status: string;
  createdAt: Date;
  product?: Product;
}

// ============ PURCHASING ============
export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  orderDate: Date;
  expectedDate: Date;
  status: POStatus;
  totalAmount?: number;
  currency: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  supplier?: Supplier;
  lines?: PurchaseOrderLine[];
}

export interface PurchaseOrderLine {
  id: string;
  poId: string;
  lineNumber: number;
  partId: string;
  quantity: number;
  receivedQty: number;
  unitPrice: number;
  lineTotal?: number;
  status: string;
  createdAt: Date;
  part?: Part;
}

// ============ DASHBOARD ============
export interface DashboardKPI {
  pendingOrders: number;
  pendingOrdersValue: number;
  criticalStock: number;
  activePOs: number;
  activePOsValue: number;
  reorderAlerts: number;
}

export interface OrderStatusSummary {
  draft: number;
  confirmed: number;
  in_production: number;
  ready: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

export interface StockAlert {
  partId: string;
  partNumber: string;
  name: string;
  available: number;
  minStockLevel: number;
  reorderPoint: number;
  status: StockStatus;
  isCritical: boolean;
}

// ============ USER ============
export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============ NAVIGATION ============
export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}
