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

// ============================================
// QUALITY MODULE TEST DATA
// ============================================

// Test NCR (Non-Conformance Report) data
export const createTestNCR = () => ({
  ncrNumber: generateTestId('NCR'),
  title: 'E2E Test NCR - Material Defect',
  type: 'MATERIAL', // MATERIAL, PROCESS, PRODUCT, SUPPLIER
  severity: 'MAJOR', // MINOR, MAJOR, CRITICAL
  source: 'RECEIVING_INSPECTION',
  description: 'Defect found during E2E testing - dimensional out of spec',
  partNumber: 'TEST-PART-001',
  quantity: 10,
  lotNumber: generateTestId('LOT'),
  disposition: 'PENDING', // PENDING, USE_AS_IS, REWORK, SCRAP, RETURN_TO_SUPPLIER
  rootCause: '',
  containmentAction: 'Parts segregated and quarantined',
  assignedTo: 'QA Engineer',
});

// Test CAPA (Corrective and Preventive Action) data
export const createTestCAPA = () => ({
  capaNumber: generateTestId('CAPA'),
  title: 'E2E Test CAPA - Process Improvement',
  type: 'CORRECTIVE', // CORRECTIVE, PREVENTIVE
  priority: 'HIGH', // LOW, MEDIUM, HIGH, CRITICAL
  status: 'OPEN', // OPEN, IN_PROGRESS, PENDING_VERIFICATION, CLOSED
  sourceType: 'NCR', // NCR, AUDIT, CUSTOMER_COMPLAINT, INTERNAL
  sourceReference: '',
  problemDescription: 'Recurring quality issue requiring systematic correction',
  rootCauseAnalysis: '',
  correctiveActions: [],
  preventiveActions: [],
  targetCompletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  assignedTo: 'Quality Manager',
  verificationMethod: 'Data review and process audit',
});

// Test Inspection Plan data
export const createTestInspectionPlan = () => ({
  planNumber: generateTestId('IP'),
  name: 'E2E Test Inspection Plan',
  type: 'RECEIVING', // RECEIVING, IN_PROCESS, FINAL
  status: 'ACTIVE', // DRAFT, ACTIVE, INACTIVE
  partNumber: '',
  revision: 'A',
  effectiveDate: new Date().toISOString().split('T')[0],
  samplingType: 'AQL', // 100_PERCENT, AQL, SKIP_LOT
  aqlLevel: '1.0',
  characteristics: [],
});

// Test Inspection Characteristic data
export const createTestCharacteristic = () => ({
  name: 'E2E Test Dimension',
  type: 'DIMENSIONAL', // DIMENSIONAL, VISUAL, FUNCTIONAL, MATERIAL
  specification: '10.0 +/- 0.1 mm',
  nominalValue: 10.0,
  upperLimit: 10.1,
  lowerLimit: 9.9,
  unit: 'mm',
  measuringEquipment: 'Caliper',
  inspectionMethod: 'Direct measurement',
  isCritical: false,
  frequency: 'EACH', // EACH, SAMPLE, FIRST_ARTICLE
});

// Test Inspection Record data
export const createTestInspectionRecord = () => ({
  recordNumber: generateTestId('IR'),
  type: 'RECEIVING', // RECEIVING, IN_PROCESS, FINAL
  status: 'PENDING', // PENDING, IN_PROGRESS, PASSED, FAILED, ON_HOLD
  partNumber: '',
  lotNumber: generateTestId('LOT'),
  quantity: 100,
  sampleSize: 13,
  inspectionDate: new Date().toISOString().split('T')[0],
  inspector: 'QA Inspector',
  measurements: [],
  result: '',
  notes: 'E2E Test inspection record',
});

// Test Certificate data
export const createTestCertificate = () => ({
  certificateNumber: generateTestId('COC'),
  type: 'COC', // COC (Certificate of Conformance), COA (Certificate of Analysis), FAI (First Article)
  status: 'DRAFT', // DRAFT, ISSUED, VOID
  partNumber: '',
  orderNumber: '',
  quantity: 100,
  lotNumber: generateTestId('LOT'),
  issueDate: new Date().toISOString().split('T')[0],
  issuedBy: 'Quality Manager',
  specifications: [],
  testResults: [],
  approved: false,
});

// ============================================
// INVENTORY MODULE TEST DATA
// ============================================

// Test Stock Movement data
export const createTestStockMovement = () => ({
  movementNumber: generateTestId('SM'),
  type: 'RECEIPT', // RECEIPT, ISSUE, TRANSFER, ADJUSTMENT
  partNumber: '',
  quantity: 50,
  fromLocation: '',
  toLocation: 'WAREHOUSE-A',
  lotNumber: generateTestId('LOT'),
  referenceType: 'PO', // PO, WO, SO, MANUAL
  referenceNumber: '',
  reason: 'E2E Test stock movement',
  movementDate: new Date().toISOString().split('T')[0],
  performedBy: 'Warehouse Operator',
});

// Test Stock Adjustment data
export const createTestStockAdjustment = () => ({
  adjustmentNumber: generateTestId('ADJ'),
  type: 'CYCLE_COUNT', // CYCLE_COUNT, PHYSICAL_COUNT, DAMAGE, EXPIRED
  partNumber: '',
  location: 'WAREHOUSE-A',
  systemQuantity: 100,
  actualQuantity: 98,
  variance: -2,
  reason: 'E2E Test - Cycle count variance',
  adjustmentDate: new Date().toISOString().split('T')[0],
  approvedBy: '',
});

// Test Lot data
export const createTestLot = () => ({
  lotNumber: generateTestId('LOT'),
  partNumber: '',
  quantity: 100,
  status: 'AVAILABLE', // AVAILABLE, QUARANTINE, ON_HOLD, EXPIRED
  receivedDate: new Date().toISOString().split('T')[0],
  expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  supplier: 'Test Supplier',
  supplierLot: 'SUP-LOT-001',
  location: 'WAREHOUSE-A',
  certificates: [],
});

// ============================================
// PURCHASING MODULE TEST DATA
// ============================================

// Test Purchase Requisition data
export const createTestPurchaseRequisition = () => ({
  prNumber: generateTestId('PR'),
  status: 'DRAFT', // DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, CONVERTED
  requestedBy: 'Production Planner',
  requestDate: new Date().toISOString().split('T')[0],
  requiredDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  priority: 'NORMAL', // LOW, NORMAL, HIGH, URGENT
  items: [],
  notes: 'E2E Test purchase requisition',
});

// Test Supplier Evaluation data
export const createTestSupplierEvaluation = () => ({
  evaluationId: generateTestId('EVAL'),
  supplierId: '',
  period: 'Q1-2026',
  qualityScore: 85,
  deliveryScore: 90,
  priceScore: 80,
  serviceScore: 88,
  overallScore: 86,
  rating: 'A', // A, B, C, D
  evaluatedBy: 'Purchasing Manager',
  evaluationDate: new Date().toISOString().split('T')[0],
  comments: 'E2E Test supplier evaluation',
});

// ============================================
// MRP MODULE TEST DATA
// ============================================

// Test MRP Run data
export const createTestMRPRun = () => ({
  runId: generateTestId('MRP'),
  runDate: new Date().toISOString(),
  planningHorizon: 30, // days
  status: 'PENDING', // PENDING, RUNNING, COMPLETED, FAILED
  includeForecasts: true,
  includeSafetyStock: true,
  generatePRs: false,
  generatedPOs: 0,
  generatedWOs: 0,
  exceptions: 0,
});

// Test Demand Forecast data
export const createTestForecast = () => ({
  forecastId: generateTestId('FC'),
  partNumber: '',
  periodType: 'MONTHLY', // WEEKLY, MONTHLY, QUARTERLY
  periods: [
    { period: '2026-02', quantity: 100 },
    { period: '2026-03', quantity: 120 },
    { period: '2026-04', quantity: 110 },
  ],
  method: 'HISTORICAL', // HISTORICAL, MANUAL, AI
  confidence: 85,
  createdBy: 'Planner',
  createdDate: new Date().toISOString().split('T')[0],
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
