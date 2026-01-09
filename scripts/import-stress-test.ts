// scripts/import-stress-test.ts
// Script to import stress test data from Excel into database
// Usage: npx ts-node scripts/import-stress-test.ts

import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

// Configuration
const EXCEL_FILE = path.join(__dirname, '../data/RTR_MRP_StressTest_2024.xls');
const BATCH_SIZE = 100;

// Progress tracking
let totalProcessed = 0;
let totalErrors = 0;

// Helper to log progress
function logProgress(entity: string, processed: number, total: number, errors: number = 0) {
  const percent = Math.round((processed / total) * 100);
  console.log(`[${entity}] ${processed}/${total} (${percent}%) - Errors: ${errors}`);
}

// Helper to parse boolean
function parseBoolean(value: unknown, defaultValue: boolean = false): boolean {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  const strValue = String(value).toLowerCase().trim();
  return strValue === 'true' || strValue === 'yes' || strValue === '1' || strValue === 'y';
}

// Helper to parse date
function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const date = new Date(String(value));
  return isNaN(date.getTime()) ? null : date;
}

// Helper to parse number
function parseNumber(value: unknown, defaultValue: number = 0): number {
  if (value === undefined || value === null || value === '') return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

// Import Suppliers
async function importSuppliers(sheet: XLSX.WorkSheet): Promise<void> {
  console.log('\n📦 Importing Suppliers...');
  const data = XLSX.utils.sheet_to_json(sheet);
  const total = data.length;
  let processed = 0;
  let errors = 0;

  for (const row of data as Record<string, unknown>[]) {
    try {
      if (processed === 0) console.log('[DEBUG] Supplier Row Keys:', Object.keys(row));

      const code = String(row['Supplier Code'] || row['Code'] || '').trim();
      if (!code) continue;
      if (processed === 0) console.log('[DEBUG] First Supplier Code:', code);

      await prisma.supplier.upsert({
        where: { code },
        create: {
          code,
          name: String(row['Name'] || row['Supplier Name'] || '').trim(),
          country: String(row['Country'] || 'VN').trim(),
          contactName: row['Contact Name'] ? String(row['Contact Name']).trim() : null,
          contactEmail: row['Email'] ? String(row['Email']).trim() : null,
          contactPhone: row['Phone'] ? String(row['Phone']).trim() : null,
          address: row['Address'] ? String(row['Address']).trim() : null,
          paymentTerms: row['Payment Terms'] ? String(row['Payment Terms']).trim() : 'NET30',
          leadTimeDays: parseNumber(row['Lead Time'] || row['Lead Time Days'], 14),
          rating: parseNumber(row['Rating'] || row['Quality Score'], null as unknown as number) || null,
          category: row['Category'] ? String(row['Category']).trim() : null,
          ndaaCompliant: parseBoolean(row['NDAA Compliant'], true),
          status: String(row['Status'] || 'active').toLowerCase(),
        },
        update: {
          name: String(row['Name'] || row['Supplier Name'] || '').trim(),
          country: String(row['Country'] || 'VN').trim(),
          contactName: row['Contact Name'] ? String(row['Contact Name']).trim() : null,
          contactEmail: row['Email'] ? String(row['Email']).trim() : null,
          contactPhone: row['Phone'] ? String(row['Phone']).trim() : null,
          address: row['Address'] ? String(row['Address']).trim() : null,
          paymentTerms: row['Payment Terms'] ? String(row['Payment Terms']).trim() : 'NET30',
          leadTimeDays: parseNumber(row['Lead Time'] || row['Lead Time Days'], 14),
          rating: parseNumber(row['Rating'] || row['Quality Score'], null as unknown as number) || null,
          category: row['Category'] ? String(row['Category']).trim() : null,
          ndaaCompliant: parseBoolean(row['NDAA Compliant'], true),
          status: String(row['Status'] || 'active').toLowerCase(),
        },
      });
      processed++;
    } catch (error) {
      errors++;
      console.error(`  Error importing supplier: ${error}`);
    }

    if (processed % 10 === 0) logProgress('Suppliers', processed, total, errors);
  }

  logProgress('Suppliers', processed, total, errors);
  totalProcessed += processed;
  totalErrors += errors;
}

// Import Parts
async function importParts(sheet: XLSX.WorkSheet): Promise<void> {
  console.log('\n🔧 Importing Parts...');
  const data = XLSX.utils.sheet_to_json(sheet);
  const total = data.length;
  let processed = 0;
  let errors = 0;

  for (const row of data as Record<string, unknown>[]) {
    try {
      const partNumber = String(row['Part Number'] || row['PartNumber'] || '').trim();
      if (!partNumber) continue;

      // Map category from Excel to database format
      const categoryMap: Record<string, string> = {
        'FINISHED_GOOD': 'finished_goods',
        'COMPONENT': 'components',
        'RAW_MATERIAL': 'raw_materials',
        'PACKAGING': 'packaging',
      };
      const rawCategory = String(row['Category'] || row['Type'] || 'General').trim();
      const category = categoryMap[rawCategory] || rawCategory.toLowerCase();

      const planningData = {
        minStockLevel: parseNumber(row['Min Stock'] || row['Safety Stock'], 0),
        reorderPoint: parseNumber(row['Reorder Point'], 0),
        safetyStock: parseNumber(row['Safety Stock'], 0),
        maxStock: parseNumber(row['Max Stock'], null as unknown as number) || null,
        leadTimeDays: parseNumber(row['Lead Time'] || row['Lead Time Days'], 14),
        moq: parseNumber(row['MOQ'] || row['Min Order Qty'], 1),
        orderMultiple: parseNumber(row['Order Multiple'], 1),
      };

      const costData = {
        unitCost: parseNumber(row['Unit Cost'] || row['Cost'], 0),
        standardCost: parseNumber(row['Standard Cost'] || row['Cost'], 0),
      };

      await prisma.part.upsert({
        where: { partNumber },
        create: {
          partNumber,
          name: String(row['Name'] || row['Part Name'] || '').trim(),
          category,
          // subCategory: row['Sub-Category'] ? String(row['Sub-Category']).trim() : null, // Removed as not in schema
          description: row['Description'] ? String(row['Description']).trim() : null,
          unit: String(row['Unit'] || row['UOM'] || 'pcs').trim(),
          isCritical: parseBoolean(row['Critical'] || row['Is Critical'], false),
          status: String(row['Status'] || 'active').toLowerCase(),

          planning: {
            create: planningData
          },
          cost: {
            create: costData
          }
        },
        update: {
          name: String(row['Name'] || row['Part Name'] || '').trim(),
          category,
          description: row['Description'] ? String(row['Description']).trim() : null,
          unit: String(row['Unit'] || row['UOM'] || 'pcs').trim(),
          isCritical: parseBoolean(row['Critical'] || row['Is Critical'], false),
          status: String(row['Status'] || 'active').toLowerCase(),

          planning: {
            upsert: {
              create: planningData,
              update: planningData
            }
          },
          cost: {
            upsert: {
              create: costData,
              update: costData
            }
          }
        },
      });
      processed++;
    } catch (error) {
      errors++;
      if (errors <= 5) console.error(`  Error importing part: ${error}`);
    }

    if (processed % 50 === 0) logProgress('Parts', processed, total, errors);
  }

  logProgress('Parts', processed, total, errors);
  totalProcessed += processed;
  totalErrors += errors;
}

// Import Customers
async function importCustomers(sheet: XLSX.WorkSheet): Promise<void> {
  console.log('\n👥 Importing Customers...');
  const data = XLSX.utils.sheet_to_json(sheet);
  const total = data.length;
  let processed = 0;
  let errors = 0;

  for (const row of data as Record<string, unknown>[]) {
    try {
      if (processed === 0) {
        console.log('[DEBUG] Customer Row Keys:', Object.keys(row));
        console.log('[DEBUG] Customer First Row:', row);
      }
      const code = String(row['Customer Code'] || row['Code'] || '').trim();
      if (!code) {
        if (processed === 0) console.log('[DEBUG] Customer Row Keys:', Object.keys(row));
        if (processed === 0) console.log('[DEBUG] Customer First Row:', row);
        continue;
      }
      if (processed === 0) console.log('[DEBUG] First Customer Code:', code);

      await prisma.customer.upsert({
        where: { code },
        create: {
          code,
          name: String(row['Name'] || row['Customer Name'] || '').trim(),
          type: row['Type'] || row['Tier'] ? String(row['Type'] || row['Tier']).trim() : null,
          country: row['Country'] ? String(row['Country']).trim() : 'VN',
          contactName: row['Contact Name'] || row['Contact'] ? String(row['Contact Name'] || row['Contact']).trim() : null,
          contactEmail: row['Email'] ? String(row['Email']).trim() : null,
          contactPhone: row['Phone'] ? String(row['Phone']).trim() : null,
          billingAddress: row['Address'] || row['Billing Address'] ? String(row['Address'] || row['Billing Address']).trim() : null,
          paymentTerms: row['Payment Terms'] ? String(row['Payment Terms']).trim() : 'NET30',
          creditLimit: parseNumber(row['Credit Limit'], null as unknown as number) || null,
          status: String(row['Status'] || 'active').toLowerCase(),
        },
        update: {
          name: String(row['Name'] || row['Customer Name'] || '').trim(),
          type: row['Type'] || row['Tier'] ? String(row['Type'] || row['Tier']).trim() : null,
          country: row['Country'] ? String(row['Country']).trim() : 'VN',
          contactName: row['Contact Name'] || row['Contact'] ? String(row['Contact Name'] || row['Contact']).trim() : null,
          contactEmail: row['Email'] ? String(row['Email']).trim() : null,
          contactPhone: row['Phone'] ? String(row['Phone']).trim() : null,
          billingAddress: row['Address'] || row['Billing Address'] ? String(row['Address'] || row['Billing Address']).trim() : null,
          paymentTerms: row['Payment Terms'] ? String(row['Payment Terms']).trim() : 'NET30',
          creditLimit: parseNumber(row['Credit Limit'], null as unknown as number) || null,
          status: String(row['Status'] || 'active').toLowerCase(),
        },
      });
      processed++;
    } catch (error) {
      errors++;
      console.error(`  Error importing customer: ${error}`);
    }

    if (processed % 20 === 0) logProgress('Customers', processed, total, errors);
  }

  logProgress('Customers', processed, total, errors);
  totalProcessed += processed;
  totalErrors += errors;
}

// Import Sales Orders
async function importSalesOrders(sheet: XLSX.WorkSheet): Promise<void> {
  console.log('\n📋 Importing Sales Orders...');
  const data = XLSX.utils.sheet_to_json(sheet);
  const total = data.length;
  let processed = 0;
  let errors = 0;

  // Get customer mapping
  const customers = await prisma.customer.findMany({ select: { id: true, code: true } });
  const customerMap = new Map(customers.map(c => [c.code, c.id]));

  for (const row of data as Record<string, unknown>[]) {
    try {
      if (processed === 0 && errors === 0) console.log('[DEBUG] SalesOrder Row Keys:', Object.keys(row));

      const orderNumber = String(row['Order Number'] || row['SO Number'] || '').trim();
      if (!orderNumber) {
        if (errors === 0) console.log('[DEBUG] First Row Keys:', Object.keys(row));
        continue;
      }

      let customerCode = String(row['Customer Code'] || row['Customer'] || row['Customer ID'] || '').trim();

      // Smart Lookup: Convert cust-X to KHxxxx
      if (customerCode.toLowerCase().startsWith('cust-')) {
        const num = customerCode.split('-')[1];
        if (num) {
          customerCode = `KH${num.padStart(4, '0')}`;
        }
      }

      const customerId = customerMap.get(customerCode);
      if (!customerId) {
        if (errors < 3) console.log(`[DEBUG] Failed to find CustomerID for code: '${customerCode}' (Original: ${row['Customer ID']}).`);
        errors++;
        continue;
      }

      // Map status
      const statusMap: Record<string, string> = {
        'DRAFT': 'draft',
        'CONFIRMED': 'confirmed',
        'IN_PRODUCTION': 'in_production',
        'READY': 'ready',
        'SHIPPED': 'shipped',
        'DELIVERED': 'delivered',
        'COMPLETED': 'completed',
        'CANCELLED': 'cancelled',
      };
      const rawStatus = String(row['Status'] || 'draft').toUpperCase();
      const status = statusMap[rawStatus] || rawStatus.toLowerCase();

      await prisma.salesOrder.upsert({
        where: { orderNumber },
        create: {
          orderNumber,
          customerId,
          orderDate: parseDate(row['Order Date']) || new Date(),
          requiredDate: parseDate(row['Required Date'] || row['Due Date']) || new Date(),
          promisedDate: parseDate(row['Promised Date']),
          priority: String(row['Priority'] || 'normal').toLowerCase(),
          status,
          totalAmount: parseNumber(row['Total Amount'] || row['Total'], null as unknown as number) || null,
          currency: String(row['Currency'] || 'VND').trim(),
          notes: row['Notes'] ? String(row['Notes']).trim() : null,
        },
        update: {
          customerId,
          orderDate: parseDate(row['Order Date']) || new Date(),
          requiredDate: parseDate(row['Required Date'] || row['Due Date']) || new Date(),
          promisedDate: parseDate(row['Promised Date']),
          priority: String(row['Priority'] || 'normal').toLowerCase(),
          status,
          totalAmount: parseNumber(row['Total Amount'] || row['Total'], null as unknown as number) || null,
          currency: String(row['Currency'] || 'VND').trim(),
          notes: row['Notes'] ? String(row['Notes']).trim() : null,
        },
      });
      processed++;
    } catch (error) {
      errors++;
      if (errors <= 5) console.error(`  Error importing SO: ${error}`);
    }

    if (processed % 200 === 0) logProgress('Sales Orders', processed, total, errors);
  }

  logProgress('Sales Orders', processed, total, errors);
  totalProcessed += processed;
  totalErrors += errors;
}

// Import Purchase Orders
async function importPurchaseOrders(sheet: XLSX.WorkSheet): Promise<void> {
  console.log('\n🛒 Importing Purchase Orders...');
  const data = XLSX.utils.sheet_to_json(sheet);
  const total = data.length;
  let processed = 0;
  let errors = 0;

  // Get supplier mapping
  const suppliers = await prisma.supplier.findMany({ select: { id: true, code: true } });
  const supplierMap = new Map(suppliers.map(s => [s.code, s.id]));

  for (const row of data as Record<string, unknown>[]) {
    try {
      const poNumber = String(row['PO Number'] || row['Order Number'] || '').trim();
      if (!poNumber) continue;

      let supplierCode = String(row['Supplier Code'] || row['Supplier'] || row['Supplier ID'] || '').trim();

      // Smart Lookup: Convert supp-X to NCCxxx
      if (supplierCode.toLowerCase().startsWith('supp-')) {
        const num = supplierCode.split('-')[1];
        if (num) {
          supplierCode = `NCC${num.padStart(3, '0')}`;
        }
      }

      const supplierId = supplierMap.get(supplierCode);
      if (!supplierId) {
        if (errors < 3) console.log(`[DEBUG] Failed to find SupplierID for code: '${supplierCode}' (Original: ${row['Supplier ID']}).`);
        errors++;
        continue;
      }

      // Map status
      const statusMap: Record<string, string> = {
        'DRAFT': 'draft',
        'SENT': 'sent',
        'CONFIRMED': 'confirmed',
        'PARTIAL': 'partial',
        'RECEIVED': 'received',
        'CLOSED': 'closed',
        'CANCELLED': 'cancelled',
      };
      const rawStatus = String(row['Status'] || 'draft').toUpperCase();
      const status = statusMap[rawStatus] || rawStatus.toLowerCase();

      await prisma.purchaseOrder.upsert({
        where: { poNumber },
        create: {
          poNumber,
          supplierId,
          orderDate: parseDate(row['Order Date']) || new Date(),
          expectedDate: parseDate(row['Expected Date'] || row['Due Date']) || new Date(),
          status,
          totalAmount: parseNumber(row['Total Amount'] || row['Total'], null as unknown as number) || null,
          currency: String(row['Currency'] || 'VND').trim(),
          notes: row['Notes'] ? String(row['Notes']).trim() : null,
        },
        update: {
          supplierId,
          orderDate: parseDate(row['Order Date']) || new Date(),
          expectedDate: parseDate(row['Expected Date'] || row['Due Date']) || new Date(),
          status,
          totalAmount: parseNumber(row['Total Amount'] || row['Total'], null as unknown as number) || null,
          currency: String(row['Currency'] || 'VND').trim(),
          notes: row['Notes'] ? String(row['Notes']).trim() : null,
        },
      });
      processed++;
    } catch (error) {
      errors++;
      if (errors <= 5) console.error(`  Error importing PO: ${error}`);
    }

    if (processed % 100 === 0) logProgress('Purchase Orders', processed, total, errors);
  }

  logProgress('Purchase Orders', processed, total, errors);
  totalProcessed += processed;
  totalErrors += errors;
}

// Import Work Orders
async function importWorkOrders(sheet: XLSX.WorkSheet): Promise<void> {
  console.log('\n🏭 Importing Work Orders...');
  const data = XLSX.utils.sheet_to_json(sheet);
  const total = data.length;
  let processed = 0;
  let errors = 0;

  // Get products mapping
  const products = await prisma.product.findMany({ select: { id: true, sku: true } });
  const productMap = new Map(products.map(p => [p.sku, p.id]));

  // Get sales orders mapping
  const salesOrders = await prisma.salesOrder.findMany({ select: { id: true, orderNumber: true } });
  const soMap = new Map(salesOrders.map(s => [s.orderNumber, s.id]));

  for (const row of data as Record<string, unknown>[]) {
    try {
      const woNumber = String(row['WO Number'] || row['Work Order'] || '').trim();
      if (!woNumber) continue;

      const productSku = String(row['Product SKU'] || row['Product'] || '').trim();
      let productId = productMap.get(productSku);

      // If product doesn't exist, create it
      if (!productId && productSku) {
        const newProduct = await prisma.product.create({
          data: {
            sku: productSku,
            name: String(row['Product Name'] || productSku),
            status: 'active',
          },
        });
        productId = newProduct.id;
        productMap.set(productSku, productId);
      }

      if (!productId) {
        errors++;
        continue;
      }

      const soNumber = row['SO Number'] || row['Sales Order'] ? String(row['SO Number'] || row['Sales Order']).trim() : null;
      const salesOrderId = soNumber ? soMap.get(soNumber) : null;

      // Map status
      const statusMap: Record<string, string> = {
        'PLANNED': 'planned',
        'RELEASED': 'released',
        'IN_PROGRESS': 'in_progress',
        'ON_HOLD': 'on_hold',
        'COMPLETED': 'completed',
        'CLOSED': 'closed',
        'CANCELLED': 'cancelled',
      };
      const rawStatus = String(row['Status'] || 'planned').toUpperCase();
      const status = statusMap[rawStatus] || rawStatus.toLowerCase();

      await prisma.workOrder.upsert({
        where: { woNumber },
        create: {
          woNumber,
          productId,
          salesOrderId,
          quantity: parseNumber(row['Quantity'] || row['Qty'], 1),
          priority: String(row['Priority'] || 'normal').toLowerCase(),
          status,
          plannedStart: parseDate(row['Planned Start']),
          plannedEnd: parseDate(row['Planned End']),
          actualStart: parseDate(row['Actual Start']),
          actualEnd: parseDate(row['Actual End']),
          assignedTo: row['Assigned To'] ? String(row['Assigned To']).trim() : null,
          workCenter: row['Work Center'] || row['Line'] ? String(row['Work Center'] || row['Line']).trim() : null,
          completedQty: parseNumber(row['Completed Qty'], 0),
          scrapQty: parseNumber(row['Scrap Qty'], 0),
          notes: row['Notes'] ? String(row['Notes']).trim() : null,
        },
        update: {
          productId,
          salesOrderId,
          quantity: parseNumber(row['Quantity'] || row['Qty'], 1),
          priority: String(row['Priority'] || 'normal').toLowerCase(),
          status,
          plannedStart: parseDate(row['Planned Start']),
          plannedEnd: parseDate(row['Planned End']),
          actualStart: parseDate(row['Actual Start']),
          actualEnd: parseDate(row['Actual End']),
          assignedTo: row['Assigned To'] ? String(row['Assigned To']).trim() : null,
          workCenter: row['Work Center'] || row['Line'] ? String(row['Work Center'] || row['Line']).trim() : null,
          completedQty: parseNumber(row['Completed Qty'], 0),
          scrapQty: parseNumber(row['Scrap Qty'], 0),
          notes: row['Notes'] ? String(row['Notes']).trim() : null,
        },
      });
      processed++;
    } catch (error) {
      errors++;
      if (errors <= 5) console.error(`  Error importing WO: ${error}`);
    }

    if (processed % 500 === 0) logProgress('Work Orders', processed, total, errors);
  }

  logProgress('Work Orders', processed, total, errors);
  totalProcessed += processed;
  totalErrors += errors;
}

// Import NCRs
async function importNCRs(sheet: XLSX.WorkSheet): Promise<void> {
  console.log('\n⚠️ Importing NCRs...');
  const data = XLSX.utils.sheet_to_json(sheet);
  const total = data.length;
  let processed = 0;
  let errors = 0;

  for (const row of data as Record<string, unknown>[]) {
    try {
      const ncrNumber = String(row['NCR Number'] || row['NCR'] || '').trim();
      if (!ncrNumber) continue;

      // Map source
      const sourceMap: Record<string, string> = {
        'INCOMING': 'RECEIVING',
        'PROCESS': 'IN_PROCESS',
        'FINAL': 'FINAL',
        'CUSTOMER': 'CUSTOMER',
        'SUPPLIER': 'RECEIVING',
      };
      const rawSource = String(row['Type'] || row['Source'] || 'IN_PROCESS').toUpperCase();
      const source = sourceMap[rawSource] || rawSource;

      // Map status
      const statusMap: Record<string, string> = {
        'OPEN': 'open',
        'UNDER_REVIEW': 'under_review',
        'PENDING_DISPOSITION': 'pending_disposition',
        'IN_REWORK': 'in_rework',
        'COMPLETED': 'completed',
        'CLOSED': 'closed',
      };
      const rawStatus = String(row['Status'] || 'open').toUpperCase().replace(' ', '_');
      const status = statusMap[rawStatus] || rawStatus.toLowerCase();

      await prisma.nCR.upsert({
        where: { ncrNumber },
        create: {
          ncrNumber,
          status,
          priority: String(row['Severity'] || row['Priority'] || 'medium').toLowerCase(),
          source,
          lotNumber: row['Lot Number'] ? String(row['Lot Number']).trim() : null,
          quantityAffected: parseNumber(row['Qty Affected'] || row['Quantity'], 1),
          title: String(row['Title'] || row['Description'] || 'NCR').trim().substring(0, 200),
          description: String(row['Description'] || row['Details'] || '').trim(),
          defectCode: row['Defect Code'] ? String(row['Defect Code']).trim() : null,
          defectCategory: row['Defect Category'] ? String(row['Defect Category']).trim() : null,
          preliminaryCause: row['Root Cause'] || row['Cause'] ? String(row['Root Cause'] || row['Cause']).trim() : null,
          disposition: row['Disposition'] ? String(row['Disposition']).toUpperCase() : null,
          dispositionReason: row['Disposition Reason'] ? String(row['Disposition Reason']).trim() : null,
          laborCost: parseNumber(row['Labor Cost'], null as unknown as number) || null,
          materialCost: parseNumber(row['Material Cost'], null as unknown as number) || null,
          totalCost: parseNumber(row['Total Cost'], null as unknown as number) || null,
          createdBy: 'system',
        },
        update: {
          status,
          priority: String(row['Severity'] || row['Priority'] || 'medium').toLowerCase(),
          source,
          lotNumber: row['Lot Number'] ? String(row['Lot Number']).trim() : null,
          quantityAffected: parseNumber(row['Qty Affected'] || row['Quantity'], 1),
          title: String(row['Title'] || row['Description'] || 'NCR').trim().substring(0, 200),
          description: String(row['Description'] || row['Details'] || '').trim(),
          defectCode: row['Defect Code'] ? String(row['Defect Code']).trim() : null,
          defectCategory: row['Defect Category'] ? String(row['Defect Category']).trim() : null,
          preliminaryCause: row['Root Cause'] || row['Cause'] ? String(row['Root Cause'] || row['Cause']).trim() : null,
          disposition: row['Disposition'] ? String(row['Disposition']).toUpperCase() : null,
          dispositionReason: row['Disposition Reason'] ? String(row['Disposition Reason']).trim() : null,
          laborCost: parseNumber(row['Labor Cost'], null as unknown as number) || null,
          materialCost: parseNumber(row['Material Cost'], null as unknown as number) || null,
          totalCost: parseNumber(row['Total Cost'], null as unknown as number) || null,
        },
      });
      processed++;
    } catch (error) {
      errors++;
      if (errors <= 5) console.error(`  Error importing NCR: ${error}`);
    }

    if (processed % 20 === 0) logProgress('NCRs', processed, total, errors);
  }

  logProgress('NCRs', processed, total, errors);
  totalProcessed += processed;
  totalErrors += errors;
}

// Main import function
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 RTR MRP - STRESS TEST DATA IMPORT');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📁 File: ${EXCEL_FILE}`);
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════');

  // Check if file exists
  if (!fs.existsSync(EXCEL_FILE)) {
    console.error(`❌ File not found: ${EXCEL_FILE}`);
    console.log('Please ensure the stress test file is in the data/ folder.');
    process.exit(1);
  }

  // Read Excel file
  console.log('\n📖 Reading Excel file...');
  const workbook = XLSX.readFile(EXCEL_FILE, { cellDates: true });
  console.log(`   Found ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(', ')}`);

  // Import in order (dependencies first)
  const sheetMapping: Record<string, (sheet: XLSX.WorkSheet) => Promise<void>> = {
    'Suppliers': importSuppliers,
    'Parts': importParts,
    'Customers': importCustomers,
    'Sales Orders': importSalesOrders,
    'Purchase Orders': importPurchaseOrders,
    'Work Orders': importWorkOrders,
    'NCRs': importNCRs,
  };

  for (const [sheetName, importFn] of Object.entries(sheetMapping)) {
    const sheet = workbook.Sheets[sheetName];
    if (sheet) {
      await importFn(sheet);
    } else {
      console.log(`\n⚠️ Sheet "${sheetName}" not found, skipping...`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ IMPORT COMPLETED');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   Total Processed: ${totalProcessed}`);
  console.log(`   Total Errors: ${totalErrors}`);
  console.log(`   Completed: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════');
}

// Run the import
main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
