// src/app/api/excel/stress-test/route.ts
// API endpoint to import stress test data from Excel file

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/with-auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@/lib/logger';
import { checkHeavyEndpointLimit } from '@/lib/rate-limit';

const EXCEL_FILE = path.join(process.cwd(), 'data', 'RTR_MRP_StressTest_2024.xls');

// Helper functions
function parseBoolean(value: unknown, defaultValue: boolean = false): boolean {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  const strValue = String(value).toLowerCase().trim();
  return strValue === 'true' || strValue === 'yes' || strValue === '1' || strValue === 'y';
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const date = new Date(String(value));
  return isNaN(date.getTime()) ? null : date;
}

function parseNumber(value: unknown, defaultValue: number = 0): number {
  if (value === undefined || value === null || value === '') return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

// GET - Check status and get info about stress test file
export const GET = withAuth(async (request, context, session) => {
  try {
const fileExists = fs.existsSync(EXCEL_FILE);
    let fileInfo = null;

    if (fileExists) {
      const stats = fs.statSync(EXCEL_FILE);

      try {
        // Read file as buffer for better compatibility with different Excel formats
        const fileBuffer = fs.readFileSync(EXCEL_FILE);
        const workbook = XLSX.read(fileBuffer, { cellDates: true, type: 'buffer' });

        const sheets = workbook.SheetNames.map(name => {
          const sheet = workbook.Sheets[name];
          const data = XLSX.utils.sheet_to_json(sheet);
          return { name, rowCount: data.length };
        });

        fileInfo = {
          fileName: 'RTR_MRP_StressTest_2024.xls',
          fileSize: stats.size,
          modifiedAt: stats.mtime,
          sheets,
        };
      } catch (readError) {
        logger.logError(readError instanceof Error ? readError : new Error(String(readError)), { context: '/api/excel/stress-test' });
        // Return file info without sheet details if reading fails
        fileInfo = {
          fileName: 'RTR_MRP_StressTest_2024.xls',
          fileSize: stats.size,
          modifiedAt: stats.mtime,
          sheets: [],
          readError: 'Không thể đọc nội dung file. Có thể định dạng không được hỗ trợ.',
        };
      }
    }

    // Get current database counts
    const [
      suppliersCount,
      partsCount,
      customersCount,
      salesOrdersCount,
      purchaseOrdersCount,
      workOrdersCount,
      ncrsCount,
    ] = await Promise.all([
      prisma.supplier.count(),
      prisma.part.count(),
      prisma.customer.count(),
      prisma.salesOrder.count(),
      prisma.purchaseOrder.count(),
      prisma.workOrder.count(),
      prisma.nCR.count(),
    ]);

    return NextResponse.json({
      fileExists,
      fileInfo,
      currentData: {
        suppliers: suppliersCount,
        parts: partsCount,
        customers: customersCount,
        salesOrders: salesOrdersCount,
        purchaseOrders: purchaseOrdersCount,
        workOrders: workOrdersCount,
        ncrs: ncrsCount,
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/excel/stress-test' });
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
});

// POST - Import stress test data
export const POST = withAuth(async (request, context, session) => {
  try {
// Rate limiting (heavy endpoint)
    const rateLimit = await checkHeavyEndpointLimit(request, session.user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter || 60) } }
      );
    }

    const bodySchema = z.object({
      entities: z.array(z.string()).default(['all']),
    });

    const rawBody = await request.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { entities } = parseResult.data;

    if (!fs.existsSync(EXCEL_FILE)) {
      return NextResponse.json(
        { error: 'Stress test file not found. Please place RTR_MRP_StressTest_2024.xls in the data/ folder.' },
        { status: 404 }
      );
    }

    // Read file as buffer for better compatibility with different Excel formats
    const fileBuffer = fs.readFileSync(EXCEL_FILE);
    const workbook = XLSX.read(fileBuffer, { cellDates: true, type: 'buffer' });
    const results: Record<string, { processed: number; errors: number }> = {};
    const shouldImport = (entity: string) => entities.includes('all') || entities.includes(entity);

    // Import Suppliers
    if (shouldImport('suppliers') && workbook.Sheets['Suppliers']) {
      const data = XLSX.utils.sheet_to_json(workbook.Sheets['Suppliers']) as Record<string, unknown>[];
      let processed = 0, errors = 0;

      for (const row of data) {
        try {
          const code = String(row['Supplier Code'] || row['Code'] || '').trim();
          if (!code) continue;

          await prisma.supplier.upsert({
            where: { code },
            create: {
              code,
              name: String(row['Name'] || '').trim(),
              country: String(row['Country'] || 'VN').trim(),
              contactName: row['Contact Name'] ? String(row['Contact Name']).trim() : null,
              contactEmail: row['Email'] ? String(row['Email']).trim() : null,
              contactPhone: row['Phone'] ? String(row['Phone']).trim() : null,
              address: row['Address'] ? String(row['Address']).trim() : null,
              paymentTerms: row['Payment Terms'] ? String(row['Payment Terms']).trim() : 'NET30',
              leadTimeDays: parseNumber(row['Lead Time'] || row['Lead Time Days'], 14),
              rating: parseNumber(row['Rating'], 0) || null,
              category: row['Category'] ? String(row['Category']).trim() : null,
              ndaaCompliant: parseBoolean(row['NDAA Compliant'], true),
              status: 'active',
            },
            update: {
              name: String(row['Name'] || '').trim(),
              leadTimeDays: parseNumber(row['Lead Time'] || row['Lead Time Days'], 14),
            },
          });
          processed++;
        } catch { errors++; }
      }
      results.suppliers = { processed, errors };
    }

    // Import Parts
    if (shouldImport('parts') && workbook.Sheets['Parts']) {
      const data = XLSX.utils.sheet_to_json(workbook.Sheets['Parts']) as Record<string, unknown>[];
      let processed = 0, errors = 0;

      for (const row of data) {
        try {
          const partNumber = String(row['Part Number'] || row['PartNumber'] || '').trim();
          if (!partNumber) continue;

          const categoryMap: Record<string, string> = {
            'FINISHED_GOOD': 'finished_goods',
            'COMPONENT': 'components',
            'RAW_MATERIAL': 'raw_materials',
            'PACKAGING': 'packaging',
          };
          const rawCategory = String(row['Category'] || row['Type'] || 'General').trim();
          const category = categoryMap[rawCategory] || rawCategory.toLowerCase();

          await prisma.part.upsert({
            where: { partNumber },
            create: {
              partNumber,
              name: String(row['Name'] || row['Part Name'] || '').trim(),
              category,
              description: row['Description'] ? String(row['Description']).trim() : null,
              unit: String(row['Unit'] || row['UOM'] || 'pcs').trim(),
              status: 'active',
              // Nested relations
              costs: {
                create: {
                  unitCost: parseNumber(row['Unit Cost'] || row['Cost'], 0),
                }
              },
              planning: {
                create: {
                  minStockLevel: parseNumber(row['Min Stock'] || row['Safety Stock'], 0),
                  safetyStock: parseNumber(row['Safety Stock'], 0),
                  leadTimeDays: parseNumber(row['Lead Time'] || row['Lead Time Days'], 14),
                  moq: parseNumber(row['MOQ'] || row['Min Order Qty'], 1),
                }
              },
              compliance: {
                create: {
                  ndaaCompliant: parseBoolean(row['NDAA'], true),
                }
              },
              isCritical: parseBoolean(row['Critical'], false),
            },
            update: {
              name: String(row['Name'] || row['Part Name'] || '').trim(),
              costs: {
                deleteMany: {},
                create: {
                  unitCost: parseNumber(row['Unit Cost'] || row['Cost'], 0),
                }
              }
            },
          });
          processed++;
        } catch { errors++; }
      }
      results.parts = { processed, errors };
    }

    // Import Customers
    if (shouldImport('customers') && workbook.Sheets['Customers']) {
      const data = XLSX.utils.sheet_to_json(workbook.Sheets['Customers']) as Record<string, unknown>[];
      let processed = 0, errors = 0;

      for (const row of data) {
        try {
          const code = String(row['Customer Code'] || row['Code'] || '').trim();
          if (!code) continue;

          await prisma.customer.upsert({
            where: { code },
            create: {
              code,
              name: String(row['Name'] || row['Customer Name'] || '').trim(),
              type: row['Type'] || row['Tier'] ? String(row['Type'] || row['Tier']).trim() : null,
              country: row['Country'] ? String(row['Country']).trim() : 'VN',
              contactName: row['Contact Name'] ? String(row['Contact Name']).trim() : null,
              contactEmail: row['Email'] ? String(row['Email']).trim() : null,
              contactPhone: row['Phone'] ? String(row['Phone']).trim() : null,
              billingAddress: row['Address'] ? String(row['Address']).trim() : null,
              paymentTerms: row['Payment Terms'] ? String(row['Payment Terms']).trim() : 'NET30',
              creditLimit: parseNumber(row['Credit Limit'], 0),
              status: 'active',
            },
            update: {
              name: String(row['Name'] || row['Customer Name'] || '').trim(),
              creditLimit: parseNumber(row['Credit Limit'], 0),
            },
          });
          processed++;
        } catch { errors++; }
      }
      results.customers = { processed, errors };
    }

    // Import Sales Orders
    if (shouldImport('salesOrders') && workbook.Sheets['Sales Orders']) {
      const data = XLSX.utils.sheet_to_json(workbook.Sheets['Sales Orders']) as Record<string, unknown>[];
      let processed = 0, errors = 0;

      const customers = await prisma.customer.findMany({ select: { id: true, code: true }, orderBy: { createdAt: 'asc' } });
      const customerMap = new Map(customers.map(c => [c.code, c.id]));
      // Also create index-based map for 'cust-N' format
      const customerIndexMap = new Map(customers.map((c, idx) => [`cust-${idx + 1}`, c.id]));

      for (const row of data) {
        try {
          const orderNumber = String(row['Order Number'] || row['SO Number'] || '').trim();
          if (!orderNumber) continue;

          const customerRef = String(row['Customer ID'] || row['Customer Code'] || row['Customer'] || '').trim();
          // Try exact match first, then index-based match
          let customerId = customerMap.get(customerRef) || customerIndexMap.get(customerRef);
          // Fallback: extract number and match by index
          if (!customerId && customerRef.startsWith('cust-')) {
            const idx = parseInt(customerRef.replace('cust-', '')) - 1;
            if (idx >= 0 && idx < customers.length) customerId = customers[idx].id;
          }
          if (!customerId && customers.length > 0) {
            // Last resort: assign to random customer
            customerId = customers[Math.floor(Math.random() * customers.length)].id;
          }
          if (!customerId) continue;

          const statusMap: Record<string, string> = {
            'DRAFT': 'draft', 'CONFIRMED': 'confirmed', 'IN_PRODUCTION': 'in_production',
            'READY': 'ready', 'SHIPPED': 'shipped', 'DELIVERED': 'delivered',
            'COMPLETED': 'completed', 'CANCELLED': 'cancelled',
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
              totalAmount: parseNumber(row['Total Amount'] || row['Total'], 0) || null,
              currency: String(row['Currency'] || 'VND').trim(),
              notes: row['Notes'] ? String(row['Notes']).trim() : null,
            },
            update: { status, totalAmount: parseNumber(row['Total Amount'] || row['Total'], 0) || null },
          });
          processed++;
        } catch { errors++; }
      }
      results.salesOrders = { processed, errors };
    }

    // Import Purchase Orders
    if (shouldImport('purchaseOrders') && workbook.Sheets['Purchase Orders']) {
      const data = XLSX.utils.sheet_to_json(workbook.Sheets['Purchase Orders']) as Record<string, unknown>[];
      let processed = 0, errors = 0;

      const suppliers = await prisma.supplier.findMany({ select: { id: true, code: true }, orderBy: { createdAt: 'asc' } });
      const supplierMap = new Map(suppliers.map(s => [s.code, s.id]));
      // Also create index-based map for 'supp-N' format
      const supplierIndexMap = new Map(suppliers.map((s, idx) => [`supp-${idx + 1}`, s.id]));

      for (const row of data) {
        try {
          const poNumber = String(row['PO Number'] || row['Order Number'] || '').trim();
          if (!poNumber) continue;

          const supplierRef = String(row['Supplier ID'] || row['Supplier Code'] || row['Supplier'] || '').trim();
          // Try exact match first, then index-based match
          let supplierId = supplierMap.get(supplierRef) || supplierIndexMap.get(supplierRef);
          // Fallback: extract number and match by index
          if (!supplierId && supplierRef.startsWith('supp-')) {
            const idx = parseInt(supplierRef.replace('supp-', '')) - 1;
            if (idx >= 0 && idx < suppliers.length) supplierId = suppliers[idx].id;
          }
          if (!supplierId && suppliers.length > 0) {
            // Last resort: assign to random supplier
            supplierId = suppliers[Math.floor(Math.random() * suppliers.length)].id;
          }
          if (!supplierId) continue;

          const statusMap: Record<string, string> = {
            'DRAFT': 'draft', 'SENT': 'sent', 'CONFIRMED': 'confirmed',
            'PARTIAL': 'partial', 'RECEIVED': 'received', 'CLOSED': 'closed', 'CANCELLED': 'cancelled',
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
              totalAmount: parseNumber(row['Total Amount'] || row['Total'], 0) || null,
              currency: String(row['Currency'] || 'VND').trim(),
              notes: row['Notes'] ? String(row['Notes']).trim() : null,
            },
            update: { status, totalAmount: parseNumber(row['Total Amount'] || row['Total'], 0) || null },
          });
          processed++;
        } catch { errors++; }
      }
      results.purchaseOrders = { processed, errors };
    }

    // Import Work Orders
    if (shouldImport('workOrders') && workbook.Sheets['Work Orders']) {
      const data = XLSX.utils.sheet_to_json(workbook.Sheets['Work Orders']) as Record<string, unknown>[];
      let processed = 0, errors = 0;

      // Get parts for mapping (Work Orders in this file reference Parts, not Products)
      const parts = await prisma.part.findMany({ select: { id: true, partNumber: true }, orderBy: { createdAt: 'asc' } });
      const partMap = new Map(parts.map(p => [p.partNumber, p.id]));

      // Get or create products for Work Orders
      const products = await prisma.product.findMany({ select: { id: true, sku: true } });
      const productMap = new Map(products.map(p => [p.sku, p.id]));

      for (const row of data) {
        try {
          const woNumber = String(row['Order Number'] || row['WO Number'] || row['Work Order'] || '').trim();
          if (!woNumber) continue;

          // Handle Part ID mapping (e.g., 'part-fg-34')
          const partRef = String(row['Part ID'] || row['Product SKU'] || row['Product'] || '').trim();
          let productId: string | undefined;

          // First try to match by SKU
          productId = productMap.get(partRef);

          // If not found, try to extract part number and find/create product
          if (!productId && partRef) {
            // Try to match by part reference (extract index from 'part-fg-N' or 'part-N')
            const partMatch = partRef.match(/part-(?:fg-)?(\d+)/);
            if (partMatch) {
              const idx = parseInt(partMatch[1]) - 1;
              if (idx >= 0 && idx < parts.length) {
                // Create product from part
                const part = parts[idx];
                const existingProduct = await prisma.product.findFirst({ where: { sku: part.partNumber } });
                if (existingProduct) {
                  productId = existingProduct.id;
                } else {
                  const newProduct = await prisma.product.create({
                    data: { sku: part.partNumber, name: `Product from ${part.partNumber}`, status: 'active' },
                  });
                  productId = newProduct.id;
                  productMap.set(part.partNumber, productId);
                }
              }
            }

            // Fallback: create product with the partRef as SKU
            if (!productId) {
              const newProduct = await prisma.product.create({
                data: { sku: partRef, name: `Product ${partRef}`, status: 'active' },
              });
              productId = newProduct.id;
              productMap.set(partRef, productId);
            }
          }

          if (!productId) continue;

          const statusMap: Record<string, string> = {
            'PLANNED': 'planned', 'RELEASED': 'released', 'IN_PROGRESS': 'in_progress',
            'ON_HOLD': 'on_hold', 'COMPLETED': 'completed', 'CLOSED': 'closed', 'CANCELLED': 'cancelled',
          };
          const rawStatus = String(row['Status'] || 'planned').toUpperCase();
          const status = statusMap[rawStatus] || rawStatus.toLowerCase();

          await prisma.workOrder.upsert({
            where: { woNumber },
            create: {
              woNumber,
              productId,
              quantity: parseNumber(row['Planned Qty'] || row['Quantity'] || row['Qty'], 1),
              priority: String(row['Priority'] || 'normal').toLowerCase(),
              status,
              plannedStart: parseDate(row['Planned Start']),
              plannedEnd: parseDate(row['Planned End']),
              workCenter: row['Production Line'] || row['Work Center'] || row['Line'] ? String(row['Production Line'] || row['Work Center'] || row['Line']).trim() : null,
              completedQty: parseNumber(row['Completed Qty'], 0),
              scrapQty: parseNumber(row['Scrap Qty'], 0),
            },
            update: { status, completedQty: parseNumber(row['Completed Qty'], 0) },
          });
          processed++;
        } catch { errors++; }
      }
      results.workOrders = { processed, errors };
    }

    // Import NCRs
    if (shouldImport('ncrs') && workbook.Sheets['NCRs']) {
      const data = XLSX.utils.sheet_to_json(workbook.Sheets['NCRs']) as Record<string, unknown>[];
      let processed = 0, errors = 0;

      for (const row of data) {
        try {
          const ncrNumber = String(row['NCR Number'] || row['NCR'] || '').trim();
          if (!ncrNumber) continue;

          const sourceMap: Record<string, string> = {
            'INCOMING': 'RECEIVING', 'PROCESS': 'IN_PROCESS', 'FINAL': 'FINAL', 'CUSTOMER': 'CUSTOMER',
          };
          const rawSource = String(row['Type'] || row['Source'] || 'IN_PROCESS').toUpperCase();
          const source = sourceMap[rawSource] || rawSource;

          await prisma.nCR.upsert({
            where: { ncrNumber },
            create: {
              ncrNumber,
              status: String(row['Status'] || 'open').toLowerCase(),
              priority: String(row['Severity'] || row['Priority'] || 'medium').toLowerCase(),
              source,
              quantityAffected: parseNumber(row['Qty Affected'] || row['Quantity'], 1),
              title: String(row['Title'] || row['Description'] || 'NCR').trim().substring(0, 200),
              description: String(row['Description'] || row['Details'] || '').trim(),
              defectCode: row['Defect Code'] ? String(row['Defect Code']).trim() : null,
              disposition: row['Disposition'] ? String(row['Disposition']).toUpperCase() : null,
              createdBy: session.user.id,
            },
            update: {
              status: String(row['Status'] || 'open').toLowerCase(),
              disposition: row['Disposition'] ? String(row['Disposition']).toUpperCase() : null,
            },
          });
          processed++;
        } catch { errors++; }
      }
      results.ncrs = { processed, errors };
    }

    // Calculate totals
    const totalProcessed = Object.values(results).reduce((sum, r) => sum + r.processed, 0);
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);

    return NextResponse.json({
      success: true,
      message: `Import completed: ${totalProcessed} records processed, ${totalErrors} errors`,
      results,
      totals: { processed: totalProcessed, errors: totalErrors },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/excel/stress-test' });
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
});
