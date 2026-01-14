/**
 * Test data fixtures for E2E tests
 */

import { generateTestId } from '../utils/test-helpers';

// Test credentials - must match seed.ts
export const testCredentials = {
  admin: {
    email: 'admin@rtr.com',
    password: 'admin123456@',
  },
  demo: {
    email: 'demo@rtr-mrp.com',
    password: 'DemoMRP@2026!',
  },
  user: {
    email: 'user@rtr.vn',
    password: 'user123',
  },
};

// Test Part data
export const createTestPart = () => ({
  partNumber: generateTestId('PART'),
  name: 'E2E Test Part',
  category: 'COMPONENT',
  status: 'ACTIVE',
  unit: 'PCS',
  unitCost: 100.50,
  description: 'Created by Playwright E2E test',
});

// Test BOM data
export const createTestBOM = () => ({
  bomNumber: generateTestId('BOM'),
  productName: 'E2E Test Assembly',
  revision: 'A',
  status: 'ACTIVE',
});

// Test Work Order data
export const createTestWorkOrder = () => ({
  woNumber: generateTestId('WO'),
  productName: 'Test Product',
  quantity: 100,
  priority: 'normal',
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
});

// Test Supplier data
export const createTestSupplier = () => ({
  name: 'Test Supplier Co.',
  code: generateTestId('SUP'),
  email: 'supplier@test.com',
  phone: '0123456789',
  country: 'Vietnam',
});

// Test Customer data
export const createTestCustomer = () => ({
  name: 'Test Customer Corp.',
  code: generateTestId('CUST'),
  email: 'customer@test.com',
  phone: '0987654321',
});

// Test Purchase Order data
export const createTestPurchaseOrder = () => ({
  poNumber: generateTestId('PO'),
  supplierName: 'Test Supplier',
  orderDate: new Date().toISOString().split('T')[0],
  expectedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
});

// Test Sales Order data
export const createTestSalesOrder = () => ({
  orderNumber: generateTestId('SO'),
  customerName: 'Test Customer',
  orderDate: new Date().toISOString().split('T')[0],
  requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
});

// Test Message data
export const createTestMessage = () => ({
  content: `Test message ${Date.now()}`,
});

// Navigation paths
export const navigationPaths = {
  home: '/home',
  parts: '/parts',
  bom: '/bom',
  production: '/production',
  purchasing: '/purchasing',
  orders: '/orders',
  inventory: '/inventory',
  quality: '/quality',
  suppliers: '/suppliers',
  customers: '/customers',
  discussions: '/discussions',
  mrp: '/mrp',
  settings: '/settings',
};

// Expected page titles/headings (Vietnamese)
export const pageHeadings = {
  home: ['Dashboard', 'Tổng quan'],
  parts: ['Parts', 'Vật tư', 'Danh sách'],
  bom: ['BOM', 'Bill of Materials'],
  production: ['Production', 'Sản xuất', 'Work Orders'],
  purchasing: ['Purchase', 'Mua hàng', 'PO'],
  orders: ['Orders', 'Đơn hàng', 'Sales'],
  inventory: ['Inventory', 'Tồn kho'],
  quality: ['Quality', 'Chất lượng'],
};

// Status options
export const statuses = {
  workOrder: ['draft', 'pending', 'in_progress', 'completed', 'cancelled'],
  purchaseOrder: ['draft', 'pending', 'confirmed', 'received', 'cancelled'],
  salesOrder: ['draft', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
  part: ['ACTIVE', 'INACTIVE', 'OBSOLETE'],
  bom: ['DRAFT', 'ACTIVE', 'OBSOLETE'],
};

// Category options
export const categories = {
  part: ['FINISHED_GOOD', 'COMPONENT', 'RAW_MATERIAL', 'PACKAGING', 'CONSUMABLE'],
};
