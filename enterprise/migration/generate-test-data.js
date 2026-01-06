#!/usr/bin/env node
// =============================================================================
// RTR-MRP TEST DATA GENERATOR
// Generate sample CSV files for migration testing
// =============================================================================

const fs = require('fs');
const path = require('path');

// Configuration
const OUTPUT_DIR = process.argv[2] || './test-data';
const RECORD_COUNTS = {
  parts: parseInt(process.argv[3]) || 100000,
  customers: parseInt(process.argv[4]) || 10000,
  suppliers: parseInt(process.argv[5]) || 5000,
  inventory: parseInt(process.argv[6]) || 100000,
};

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper functions
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max, decimals = 2) => 
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

// Data generators
const CATEGORIES = ['COMPONENT', 'ASSEMBLY', 'RAW_MATERIAL', 'FINISHED_GOOD', 'CONSUMABLE', 'TOOL'];
const UNITS = ['pcs', 'kg', 'm', 'l', 'set', 'box', 'roll'];
const PREFIXES = ['MTL', 'CMP', 'ASM', 'FIN', 'TOL', 'CON'];
const PART_NAMES = [
  'Bolt', 'Nut', 'Screw', 'Washer', 'Bearing', 'Gear', 'Motor', 'Valve', 
  'Pump', 'Sensor', 'Switch', 'Connector', 'Cable', 'Housing', 'Bracket',
  'Plate', 'Shaft', 'Spring', 'Gasket', 'Seal', 'Filter', 'Actuator'
];
const SIZES = ['M4', 'M6', 'M8', 'M10', 'M12', '10mm', '20mm', '50mm', '100mm'];
const MATERIALS = ['Steel', 'Aluminum', 'Brass', 'Plastic', 'Copper', 'Stainless'];

const CITIES = [
  'Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hai Phong', 'Can Tho',
  'Bien Hoa', 'Nha Trang', 'Buon Ma Thuot', 'Hue', 'Vung Tau'
];

function generatePartNumber(index) {
  const prefix = randomFrom(PREFIXES);
  return `${prefix}-${String(index).padStart(6, '0')}`;
}

function generatePartName() {
  const name = randomFrom(PART_NAMES);
  const size = randomFrom(SIZES);
  const material = randomFrom(MATERIALS);
  return `${material} ${name} ${size}`;
}

function generateCompanyName(prefix, index) {
  const types = ['Co., Ltd', 'Corp', 'Inc', 'JSC', 'Vietnam', 'Trading'];
  return `${prefix} ${String(index).padStart(4, '0')} ${randomFrom(types)}`;
}

function generateEmail(name) {
  const domains = ['gmail.com', 'yahoo.com', 'company.vn', 'business.com'];
  return `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@${randomFrom(domains)}`;
}

function generatePhone() {
  const prefixes = ['090', '091', '093', '094', '096', '097', '098', '099'];
  return `${randomFrom(prefixes)}${randomInt(1000000, 9999999)}`;
}

function generateTaxCode() {
  return `${randomInt(1000000000, 9999999999)}`;
}

// =============================================================================
// PARTS GENERATOR
// =============================================================================

function generateParts(count) {
  console.log(`Generating ${count.toLocaleString()} parts...`);
  
  const headers = [
    'partNumber', 'partName', 'description', 'category', 'unit', 
    'unitCost', 'sellingPrice', 'leadTime', 'minOrderQty', 'isActive'
  ];
  
  const lines = [headers.join(',')];
  
  for (let i = 1; i <= count; i++) {
    const partNumber = generatePartNumber(i);
    const partName = generatePartName();
    const category = randomFrom(CATEGORIES);
    const unit = randomFrom(UNITS);
    const unitCost = randomFloat(1, 1000);
    const sellingPrice = unitCost * randomFloat(1.2, 2.5);
    const leadTime = randomInt(1, 30);
    const minOrderQty = randomFrom([1, 5, 10, 25, 50, 100]);
    const isActive = Math.random() > 0.05; // 95% active
    
    lines.push([
      partNumber,
      `"${partName}"`,
      `"${partName} - ${category.toLowerCase()} part"`,
      category,
      unit,
      unitCost,
      sellingPrice.toFixed(2),
      leadTime,
      minOrderQty,
      isActive
    ].join(','));
    
    if (i % 10000 === 0) {
      process.stdout.write(`\r  Progress: ${((i/count)*100).toFixed(1)}%`);
    }
  }
  
  console.log('\r  Progress: 100%   ');
  
  const filePath = path.join(OUTPUT_DIR, 'parts.csv');
  fs.writeFileSync(filePath, lines.join('\n'));
  console.log(`  ✓ Saved to ${filePath} (${(lines.length * 100 / 1024 / 1024).toFixed(1)} MB estimated)`);
  
  return count;
}

// =============================================================================
// CUSTOMERS GENERATOR
// =============================================================================

function generateCustomers(count) {
  console.log(`Generating ${count.toLocaleString()} customers...`);
  
  const headers = [
    'code', 'name', 'contactPerson', 'email', 'phone', 
    'address', 'city', 'taxCode', 'paymentTerms', 'isActive'
  ];
  
  const lines = [headers.join(',')];
  const paymentTerms = ['Net 30', 'Net 45', 'Net 60', 'COD', 'Prepaid'];
  
  for (let i = 1; i <= count; i++) {
    const code = `CUST-${String(i).padStart(5, '0')}`;
    const name = generateCompanyName('Customer', i);
    const contactPerson = `Contact Person ${i}`;
    const email = generateEmail(`cust${i}`);
    const phone = generatePhone();
    const city = randomFrom(CITIES);
    const address = `${randomInt(1, 999)} Street ${randomInt(1, 50)}, District ${randomInt(1, 12)}`;
    const taxCode = generateTaxCode();
    const payment = randomFrom(paymentTerms);
    const isActive = Math.random() > 0.02; // 98% active
    
    lines.push([
      code,
      `"${name}"`,
      `"${contactPerson}"`,
      email,
      phone,
      `"${address}, ${city}"`,
      city,
      taxCode,
      payment,
      isActive
    ].join(','));
    
    if (i % 1000 === 0) {
      process.stdout.write(`\r  Progress: ${((i/count)*100).toFixed(1)}%`);
    }
  }
  
  console.log('\r  Progress: 100%   ');
  
  const filePath = path.join(OUTPUT_DIR, 'customers.csv');
  fs.writeFileSync(filePath, lines.join('\n'));
  console.log(`  ✓ Saved to ${filePath}`);
  
  return count;
}

// =============================================================================
// SUPPLIERS GENERATOR
// =============================================================================

function generateSuppliers(count) {
  console.log(`Generating ${count.toLocaleString()} suppliers...`);
  
  const headers = [
    'code', 'name', 'contactPerson', 'email', 'phone', 
    'address', 'taxCode', 'isActive'
  ];
  
  const lines = [headers.join(',')];
  
  for (let i = 1; i <= count; i++) {
    const code = `SUP-${String(i).padStart(4, '0')}`;
    const name = generateCompanyName('Supplier', i);
    const contactPerson = `Sales Rep ${i}`;
    const email = generateEmail(`sup${i}`);
    const phone = generatePhone();
    const city = randomFrom(CITIES);
    const address = `${randomInt(1, 999)} Industrial Road ${randomInt(1, 20)}`;
    const taxCode = generateTaxCode();
    const isActive = Math.random() > 0.03; // 97% active
    
    lines.push([
      code,
      `"${name}"`,
      `"${contactPerson}"`,
      email,
      phone,
      `"${address}, ${city}"`,
      taxCode,
      isActive
    ].join(','));
    
    if (i % 1000 === 0) {
      process.stdout.write(`\r  Progress: ${((i/count)*100).toFixed(1)}%`);
    }
  }
  
  console.log('\r  Progress: 100%   ');
  
  const filePath = path.join(OUTPUT_DIR, 'suppliers.csv');
  fs.writeFileSync(filePath, lines.join('\n'));
  console.log(`  ✓ Saved to ${filePath}`);
  
  return count;
}

// =============================================================================
// INVENTORY GENERATOR
// =============================================================================

function generateInventory(count) {
  console.log(`Generating ${count.toLocaleString()} inventory records...`);
  
  const headers = [
    'partNumber', 'onHand', 'onOrder', 'allocated', 
    'safetyStock', 'reorderPoint', 'maxStock', 
    'warehouseLocation', 'binLocation', 'lotNumber'
  ];
  
  const lines = [headers.join(',')];
  const warehouses = ['WH-A', 'WH-B', 'WH-C', 'MAIN'];
  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  for (let i = 1; i <= count; i++) {
    const partNumber = generatePartNumber(i);
    const onHand = randomInt(0, 5000);
    const onOrder = Math.random() > 0.7 ? randomInt(100, 1000) : 0;
    const allocated = Math.random() > 0.8 ? randomInt(10, Math.min(onHand, 500)) : 0;
    const safetyStock = randomInt(10, 200);
    const reorderPoint = safetyStock + randomInt(50, 200);
    const maxStock = reorderPoint * randomInt(3, 10);
    const warehouse = randomFrom(warehouses);
    const row = randomFrom(rows);
    const bin = `${row}-${String(randomInt(1, 50)).padStart(2, '0')}-${String(randomInt(1, 10)).padStart(2, '0')}`;
    const lotNumber = Math.random() > 0.5 ? `LOT-${Date.now()}-${i}` : '';
    
    lines.push([
      partNumber,
      onHand,
      onOrder,
      allocated,
      safetyStock,
      reorderPoint,
      maxStock,
      `${warehouse}-${row}`,
      bin,
      lotNumber
    ].join(','));
    
    if (i % 10000 === 0) {
      process.stdout.write(`\r  Progress: ${((i/count)*100).toFixed(1)}%`);
    }
  }
  
  console.log('\r  Progress: 100%   ');
  
  const filePath = path.join(OUTPUT_DIR, 'inventory.csv');
  fs.writeFileSync(filePath, lines.join('\n'));
  console.log(`  ✓ Saved to ${filePath}`);
  
  return count;
}

// =============================================================================
// MAIN
// =============================================================================

console.log(`
╔════════════════════════════════════════════════════════════════╗
║  RTR-MRP TEST DATA GENERATOR                                   ║
╚════════════════════════════════════════════════════════════════╝

Output Directory: ${OUTPUT_DIR}
`);

const startTime = Date.now();

const partCount = generateParts(RECORD_COUNTS.parts);
const customerCount = generateCustomers(RECORD_COUNTS.customers);
const supplierCount = generateSuppliers(RECORD_COUNTS.suppliers);
const inventoryCount = generateInventory(Math.min(RECORD_COUNTS.inventory, partCount));

const duration = ((Date.now() - startTime) / 1000).toFixed(1);

console.log(`
╔════════════════════════════════════════════════════════════════╗
║  GENERATION COMPLETE                                           ║
╠════════════════════════════════════════════════════════════════╣
║  Parts:      ${partCount.toLocaleString().padStart(10)}                                     ║
║  Customers:  ${customerCount.toLocaleString().padStart(10)}                                     ║
║  Suppliers:  ${supplierCount.toLocaleString().padStart(10)}                                     ║
║  Inventory:  ${inventoryCount.toLocaleString().padStart(10)}                                     ║
║  Duration:   ${duration.padStart(10)}s                                     ║
╚════════════════════════════════════════════════════════════════╝

Usage:
  # Import parts first (inventory depends on parts)
  npx ts-node enterprise/migration/migrate.ts parts ${OUTPUT_DIR}/parts.csv --batch-size=1000
  
  # Then import customers & suppliers
  npx ts-node enterprise/migration/migrate.ts customers ${OUTPUT_DIR}/customers.csv
  npx ts-node enterprise/migration/migrate.ts suppliers ${OUTPUT_DIR}/suppliers.csv
  
  # Finally import inventory
  npx ts-node enterprise/migration/migrate.ts inventory ${OUTPUT_DIR}/inventory.csv
`);
