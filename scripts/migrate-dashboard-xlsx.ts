#!/usr/bin/env tsx
// scripts/migrate-dashboard-xlsx.ts — Import DASHBOARD.xlsx into DB (TIP-S27-04)
// Usage: npx tsx scripts/migrate-dashboard-xlsx.ts [--dry-run] [--file <path>] [--only <entity>]

import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// =============================================================================
// CLI ARGS
// =============================================================================

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const fileIdx = args.indexOf('--file');
const filePath = fileIdx !== -1 ? args[fileIdx + 1] : path.join(process.cwd(), 'data/DASHBOARD.xlsx');
const onlyIdx = args.indexOf('--only');
const onlyEntity = onlyIdx !== -1 ? args[onlyIdx + 1] : null;
const mappingIdx = args.indexOf('--mapping-file');
const mappingPath = mappingIdx !== -1 ? args[mappingIdx + 1] : path.join(process.cwd(), 'scripts/dashboard-category-mapping.json');

// =============================================================================
// TYPES
// =============================================================================

interface MigrationStats {
  entity: string;
  created: number;
  updated: number;
  skipped: number;
  warnings: string[];
}

interface CategoryMapping {
  version: number;
  clusters: Array<{ code: string; name: string; parent: string }>;
  mapping: Record<string, string>;
  unresolved: string[];
}

// =============================================================================
// HELPERS
// =============================================================================

function readSheet<T>(wb: XLSX.WorkBook, name: string): T[] {
  const ws = wb.Sheets[name];
  if (!ws) { console.warn(`Sheet "${name}" not found`); return []; }
  return XLSX.utils.sheet_to_json<T>(ws);
}

function mapSerialStatus(raw: string): string {
  const s = (raw || '').trim().toUpperCase();
  if (s === 'TỒN' || s === 'TON') return 'IN_STOCK';
  if (s.includes('XUẤT') || s.includes('XUAT') || s === 'SHIPPED') return 'SHIPPED';
  if (s.includes('DÙNG') || s === 'CONSUMED') return 'CONSUMED';
  if (s.includes('LỖI') || s.includes('HỎNG') || s === 'SCRAPPED') return 'SCRAPPED';
  if (s.includes('TRẢ') || s === 'RETURNED') return 'RETURNED';
  return 'IN_STOCK';
}

function mapSerialSource(raw: string): string {
  const s = (raw || '').trim().toUpperCase();
  if (s.includes('GIA CÔNG') || s.includes('GIA_CONG')) return 'MANUFACTURED';
  if (s.includes('NHẬP') || s.includes('MUA') || s === 'RECEIVED') return 'RECEIVED';
  return 'IMPORTED';
}

function mapBomSourceType(raw: string): string {
  const s = (raw || '').trim().toUpperCase();
  if (s === 'EXTERNAL' || s.includes('MUA')) return 'EXTERNAL';
  return 'INTERNAL';
}

function excelDateToJS(serial: number): Date {
  // Excel serial date → JS Date
  const epoch = new Date(1899, 11, 30);
  return new Date(epoch.getTime() + serial * 86400000);
}

function shouldRun(entity: string): boolean {
  if (!onlyEntity) return true;
  return onlyEntity.toLowerCase() === entity.toLowerCase();
}

// =============================================================================
// CATEGORY CLUSTERING
// =============================================================================

function generateCategoryMapping(categories: string[]): CategoryMapping {
  const RULES: Array<{ pattern: RegExp; code: string; name: string; parent: string }> = [
    { pattern: /^res|resistor|trimmer/i, code: 'RESISTOR', name: 'Điện trở', parent: 'PASSIVE' },
    { pattern: /^cap|mlcc|wcap|tant/i, code: 'CAPACITOR', name: 'Tụ điện', parent: 'PASSIVE' },
    { pattern: /inductor|choke|cmc|ferrite|fixed ind/i, code: 'INDUCTOR', name: 'Cuộn cảm', parent: 'PASSIVE' },
    { pattern: /filter|common mode/i, code: 'FILTER', name: 'Bộ lọc', parent: 'PASSIVE' },
    { pattern: /crystal/i, code: 'CRYSTAL', name: 'Thạch anh', parent: 'PASSIVE' },
    { pattern: /fuse|ptc/i, code: 'FUSE', name: 'Cầu chì', parent: 'PASSIVE' },
    { pattern: /thermistor/i, code: 'THERMISTOR', name: 'Nhiệt điện trở', parent: 'PASSIVE' },
    { pattern: /diode|tvs|zener/i, code: 'DIODE', name: 'Diode', parent: 'SEMICONDUCTOR' },
    { pattern: /mosfet|transistor|trans npn|trans pnp/i, code: 'TRANSISTOR', name: 'Transistor', parent: 'SEMICONDUCTOR' },
    { pattern: /^ic|mcu|integrated|controller|lm5176|nand|gate/i, code: 'IC', name: 'IC', parent: 'SEMICONDUCTOR' },
    { pattern: /^led/i, code: 'LED', name: 'LED', parent: 'SEMICONDUCTOR' },
    { pattern: /sensor|imu|hall|motion|digital.*ang/i, code: 'SENSOR', name: 'Cảm biến', parent: 'SEMICONDUCTOR' },
    { pattern: /module|dc.dc|converter/i, code: 'MODULE', name: 'Module nguồn', parent: 'SEMICONDUCTOR' },
    { pattern: /optoisolator|ssr|relay/i, code: 'RELAY', name: 'Relay/Opto', parent: 'SEMICONDUCTOR' },
    { pattern: /conn|rcpt|usb|hdmi|fpc|header|socket|pin|female|male|crimp|edgeboard|mezzanine|cabline|micro coax|mhf4|receptacle|inline|jack/i, code: 'CONNECTOR', name: 'Đầu nối', parent: 'CONNECTOR' },
    { pattern: /cable|ffc/i, code: 'CABLE', name: 'Cáp', parent: 'CONNECTOR' },
    { pattern: /rf|diplexer|coaxial/i, code: 'RF', name: 'RF', parent: 'CONNECTOR' },
    { pattern: /switch|tactile|slide|toggle/i, code: 'SWITCH', name: 'Công tắc', parent: 'ELECTROMECH' },
    { pattern: /buzzer|speaker/i, code: 'BUZZER', name: 'Loa/Buzzer', parent: 'ELECTROMECH' },
    { pattern: /batter/i, code: 'BATTERY', name: 'Pin', parent: 'POWER' },
    { pattern: /pcb|pcba/i, code: 'PCB', name: 'PCB', parent: 'MECHANICAL' },
    { pattern: /screw|standoff|spacer|round/i, code: 'FASTENER', name: 'Ốc vít/Spacer', parent: 'MECHANICAL' },
    { pattern: /shield|em pad/i, code: 'SHIELDING', name: 'Che chắn', parent: 'MECHANICAL' },
    { pattern: /terminal/i, code: 'TERMINAL', name: 'Terminal', parent: 'CONNECTOR' },
    { pattern: /lan|transformer|pulse/i, code: 'TRANSFORMER', name: 'Biến áp', parent: 'PASSIVE' },
    { pattern: /smd|specialized|automotive|single|half.bridge/i, code: 'OTHER_ELECTRONIC', name: 'Linh kiện khác', parent: 'ELECTRONICS' },
  ];

  const mapping: Record<string, string> = {};
  const unresolved: string[] = [];
  const clusterSet = new Map<string, { code: string; name: string; parent: string }>();

  // Add parent categories
  for (const p of ['PASSIVE', 'SEMICONDUCTOR', 'CONNECTOR', 'ELECTROMECH', 'POWER', 'MECHANICAL', 'ELECTRONICS']) {
    clusterSet.set(p, { code: p, name: p, parent: '' });
  }

  for (const cat of categories) {
    let matched = false;
    for (const rule of RULES) {
      if (rule.pattern.test(cat)) {
        mapping[cat] = rule.code;
        clusterSet.set(rule.code, { code: rule.code, name: rule.name, parent: rule.parent });
        matched = true;
        break;
      }
    }
    if (!matched) {
      mapping[cat] = 'OTHER_ELECTRONIC';
      clusterSet.set('OTHER_ELECTRONIC', { code: 'OTHER_ELECTRONIC', name: 'Linh kiện khác', parent: 'ELECTRONICS' });
    }
  }

  return {
    version: 1,
    clusters: Array.from(clusterSet.values()).filter(c => c.parent !== ''),
    mapping,
    unresolved,
  };
}

// Export for testing
export { mapSerialStatus, mapSerialSource, mapBomSourceType, generateCategoryMapping };

// =============================================================================
// DRY-RUN SAFE DB ACCESS
// In dry-run mode: reads (find*) work normally, writes (create/upsert/update/delete) are no-ops
// =============================================================================

/** Helper: execute a DB write only when not in dry-run mode */
async function dbWrite<T>(fn: () => Promise<T>): Promise<T | null> {
  if (dryRun) return null;
  return fn();
}

// =============================================================================
// MIGRATION STEPS
// =============================================================================

async function migrateCategories(mapping: CategoryMapping): Promise<MigrationStats> {
  const stats: MigrationStats = { entity: 'Categories', created: 0, updated: 0, skipped: 0, warnings: [] };

  // Create parent categories
  const parents = [...new Set(mapping.clusters.map(c => c.parent).filter(Boolean))];
  for (const parentCode of parents) {
    await dbWrite(() => prisma.category.upsert({
      where: { code: parentCode },
      create: { code: parentCode, name: parentCode, status: 'active' },
      update: {},
    }));
  }

  // Create child clusters
  for (const cluster of mapping.clusters) {
    const parent = cluster.parent ? await prisma.category.findUnique({ where: { code: cluster.parent } }) : null;
    await dbWrite(() => prisma.category.upsert({
      where: { code: cluster.code },
      create: { code: cluster.code, name: cluster.name, parentId: parent?.id || null, status: 'active' },
      update: { name: cluster.name, parentId: parent?.id || null },
    }));
    stats.created++;
  }

  return stats;
}

async function migrateSuppliers(data: Array<Record<string, string>>): Promise<MigrationStats> {
  const stats: MigrationStats = { entity: 'Suppliers', created: 0, updated: 0, skipped: 0, warnings: [] };
  const suppliers = [...new Set(data.map(r => r['Supplier']).filter(Boolean))];

  for (const name of suppliers) {
    const code = name.toUpperCase().replace(/\s+/g, '_').substring(0, 20);
    await dbWrite(() => prisma.supplier.upsert({
      where: { code },
      create: { name, code, status: 'active', country: 'VN', leadTimeDays: 14 },
      update: { name },
    }));
    stats.created++;
  }
  return stats;
}

async function migrateParts(data: Array<Record<string, string>>, mapping: CategoryMapping): Promise<MigrationStats> {
  const stats: MigrationStats = { entity: 'Parts', created: 0, updated: 0, skipped: 0, warnings: [] };

  for (const row of data) {
    const partNumber = String(row['Part Number'] || '').trim();
    if (!partNumber) { stats.skipped++; continue; }

    const rawCat = String(row['Category'] || '').trim();
    const clusterCode = mapping.mapping[rawCat] || 'OTHER_ELECTRONIC';
    const category = await prisma.category.findUnique({ where: { code: clusterCode } });

    await dbWrite(() => prisma.part.upsert({
      where: { partNumber },
      create: {
        partNumber,
        name: String(row['Part Name'] || partNumber).trim(),
        category: rawCat || 'Uncategorized',
        categoryId: category?.id || null,
        description: String(row['Description'] || '').trim() || null,
        unit: 'pcs',
        unitCost: parseFloat(String(row['Price'] || '0')) || 0,
        minStockLevel: parseInt(String(row['Min Stock'] || '0')) || 0,
      },
      update: {
        name: String(row['Part Name'] || partNumber).trim(),
        categoryId: category?.id || null,
        description: String(row['Description'] || '').trim() || null,
        unitCost: parseFloat(String(row['Price'] || '0')) || 0,
      },
    }));
    stats.created++;
  }
  return stats;
}

async function migratePartSuppliers(data: Array<Record<string, string>>): Promise<MigrationStats> {
  const stats: MigrationStats = { entity: 'PartSuppliers', created: 0, updated: 0, skipped: 0, warnings: [] };

  for (const row of data) {
    const partNumber = String(row['Part Number'] || '').trim();
    const supplierName = String(row['Supplier'] || '').trim();
    if (!partNumber || !supplierName) { stats.skipped++; continue; }

    const part = await prisma.part.findUnique({ where: { partNumber } });
    const supplierCode = supplierName.toUpperCase().replace(/\s+/g, '_').substring(0, 20);
    const supplier = await prisma.supplier.findUnique({ where: { code: supplierCode } });
    if (!part || !supplier) { stats.skipped++; continue; }

    const price = parseFloat(String(row['Price'] || '0')) || 0;
    const existing = await prisma.partSupplier.findFirst({
      where: { partId: part.id, supplierId: supplier.id },
    });
    if (!existing) {
      await dbWrite(() => prisma.partSupplier.create({
        data: { partId: part.id, supplierId: supplier.id, unitPrice: price, leadTimeDays: 14, isPreferred: true },
      }));
      stats.created++;
    } else {
      stats.skipped++;
    }
  }
  return stats;
}

async function migrateProducts(data: Array<Record<string, string>>): Promise<MigrationStats> {
  const stats: MigrationStats = { entity: 'Products (EBOX)', created: 0, updated: 0, skipped: 0, warnings: [] };
  const products = [...new Set(data.map(r => String(r['Product'] || '').trim()).filter(Boolean))];

  for (const sku of products) {
    await dbWrite(() => prisma.product.upsert({
      where: { sku },
      create: { sku, name: sku },
      update: {},
    }));
    stats.created++;
  }
  return stats;
}

async function migrateModuleDesigns(
  serialGenData: Array<Record<string, string>>,
  bomData: Array<Record<string, string>>,
  duAnData: Array<Record<string, string>>
): Promise<MigrationStats> {
  const stats: MigrationStats = { entity: 'ModuleDesigns', created: 0, updated: 0, skipped: 0, warnings: [] };

  // From SERIAL_GEN: each product has prefix/version
  const moduleSet = new Map<string, { code: string; name: string; version: string; prefix: string }>();

  for (const row of serialGenData) {
    const product = String(row['Product'] || '').trim();
    const prefix = String(row['Prefix'] || '').trim();
    const ver = String(row['VER'] || '').trim();
    if (!product || !prefix) continue;
    const code = `${prefix}_${ver}`.toUpperCase().replace(/\s+/g, '_');
    moduleSet.set(code, { code, name: product, version: ver, prefix });
  }

  // From BOM_CHUAN: components
  for (const row of bomData) {
    const comp = String(row['Component'] || '').trim();
    const logKey = String(row['LOG_KEY'] || '').trim();
    if (!comp) continue;
    const code = logKey || comp.toUpperCase().replace(/[\s.]+/g, '_').substring(0, 50);
    if (!moduleSet.has(code)) {
      moduleSet.set(code, { code, name: comp, version: 'V1', prefix: code.split('_')[0] || code.substring(0, 3) });
    }
  }

  // From DU_AN: projects
  const projects = [...new Set(duAnData.map(r => String(r['Project'] || '').trim()).filter(Boolean))];
  for (const proj of projects) {
    const code = proj.toUpperCase().replace(/[\s.]+/g, '_').substring(0, 50);
    if (!moduleSet.has(code)) {
      const parts = proj.split(/\s+/);
      const prefix = parts[0]?.substring(0, 4).toUpperCase() || 'MOD';
      const version = parts.find(p => /v\d/i.test(p)) || 'V1';
      moduleSet.set(code, { code, name: proj, version, prefix });
    }
  }

  for (const [, md] of moduleSet) {
    await dbWrite(() => prisma.moduleDesign.upsert({
      where: { code: md.code },
      create: { code: md.code, name: md.name, version: md.version, prefix: md.prefix, isInternal: true, status: 'ACTIVE' },
      update: { name: md.name },
    }));
    stats.created++;
  }
  return stats;
}

async function migrateBomChuan(data: Array<Record<string, string>>): Promise<MigrationStats> {
  const stats: MigrationStats = { entity: 'BOM (EBOX)', created: 0, updated: 0, skipped: 0, warnings: [] };

  // Group by Product
  const grouped = new Map<string, Array<Record<string, string>>>();
  for (const row of data) {
    const product = String(row['Product'] || '').trim();
    if (!product) continue;
    if (!grouped.has(product)) grouped.set(product, []);
    grouped.get(product)!.push(row);
  }

  for (const [sku, lines] of grouped) {
    const product = await prisma.product.findUnique({ where: { sku } });
    if (!product) { stats.warnings.push(`Product not found: ${sku}`); stats.skipped++; continue; }

    const version = String(lines[0]?.['Version'] || 'V1').trim();
    let bomHeader = await prisma.bomHeader.findFirst({ where: { productId: product.id, version } });
    if (!bomHeader && !dryRun) {
      bomHeader = await prisma.bomHeader.create({
        data: { productId: product.id, version, effectiveDate: new Date(), status: 'active' },
      });
    }

    if (bomHeader) {
      await dbWrite(() => prisma.bomLine.deleteMany({ where: { bomId: bomHeader!.id } }));
    }

    let lineNum = 0;
    for (const row of lines) {
      lineNum++;
      const compName = String(row['Component'] || '').trim();
      const logKey = String(row['LOG_KEY'] || '').trim();
      const qty = parseFloat(String(row['Qty'] || '1')) || 1;
      const sourceType = mapBomSourceType(String(row['TYPE'] || ''));

      const part = await prisma.part.findFirst({ where: { OR: [{ partNumber: compName }, { name: compName }] } });
      if (!part && !dryRun) {
        const newPart = await prisma.part.upsert({
          where: { partNumber: logKey || compName.toUpperCase().replace(/\s+/g, '_') },
          create: {
            partNumber: logKey || compName.toUpperCase().replace(/\s+/g, '_'),
            name: compName,
            category: 'Module',
            unit: 'pcs',
          },
          update: {},
        });
        await prisma.bomLine.create({
          data: { bomId: bomHeader!.id, lineNumber: lineNum, partId: newPart.id, quantity: qty, sourceType: sourceType as 'INTERNAL' | 'EXTERNAL' },
        });
      } else if (part && bomHeader) {
        await dbWrite(() => prisma.bomLine.create({
          data: { bomId: bomHeader!.id, lineNumber: lineNum, partId: part.id, quantity: qty, sourceType: sourceType as 'INTERNAL' | 'EXTERNAL' },
        }));
      }
      stats.created++;
    }
  }
  return stats;
}

async function migrateDuAnBom(data: Array<Record<string, string>>): Promise<MigrationStats> {
  const stats: MigrationStats = { entity: 'BOM (Module)', created: 0, updated: 0, skipped: 0, warnings: [] };

  const grouped = new Map<string, Array<Record<string, string>>>();
  for (const row of data) {
    const project = String(row['Project'] || '').trim();
    if (!project) continue;
    if (!grouped.has(project)) grouped.set(project, []);
    grouped.get(project)!.push(row);
  }

  // We need a Product for each project to create BomHeader
  for (const [project, lines] of grouped) {
    const sku = project.toUpperCase().replace(/[\s.]+/g, '_').substring(0, 50);

    let product = await prisma.product.findUnique({ where: { sku } });
    if (!product && !dryRun) {
      product = await prisma.product.create({ data: { sku, name: project } });
    }
    if (!product) { stats.created++; continue; } // dry-run: count but skip

    let bomHeader = await prisma.bomHeader.findFirst({ where: { productId: product.id, version: 'V1' } });
    if (!bomHeader && !dryRun) {
      bomHeader = await prisma.bomHeader.create({
        data: { productId: product.id, version: 'V1', effectiveDate: new Date(), status: 'active' },
      });
    }
    if (!bomHeader) { continue; } // dry-run: skip lines

    await dbWrite(() => prisma.bomLine.deleteMany({ where: { bomId: bomHeader!.id } }));

    let lineNum = 0;
    for (const row of lines) {
      lineNum++;
      const partNumber = String(row['Part'] || '').trim();
      const qty = parseFloat(String(row['Qty'] || '1')) || 1;
      if (!partNumber) { stats.skipped++; continue; }

      const part = await prisma.part.findUnique({ where: { partNumber } });
      if (!part) {
        stats.warnings.push(`Part not found: ${partNumber}`);
        stats.skipped++;
        continue;
      }

      await dbWrite(() => prisma.bomLine.create({
        data: { bomId: bomHeader!.id, lineNumber: lineNum, partId: part.id, quantity: qty, sourceType: 'INTERNAL' },
      }));
      stats.created++;
    }
  }
  return stats;
}

async function migrateNumberingRules(data: Array<Record<string, string>>): Promise<MigrationStats> {
  const stats: MigrationStats = { entity: 'NumberingRules', created: 0, updated: 0, skipped: 0, warnings: [] };

  for (const row of data) {
    const product = String(row['Product'] || '').trim();
    const prefix = String(row['Prefix'] || '').trim();
    const ver = String(row['VER'] || '').trim();
    const counter = parseInt(String(row['Counter'] || '0')) || 0;
    const lastMMY = parseInt(String(row['Last_MMY'] || '0')) || null;

    if (!product || !prefix) { stats.skipped++; continue; }

    const code = `${prefix}_${ver}`.toUpperCase().replace(/\s+/g, '_');
    const md = await prisma.moduleDesign.findUnique({ where: { code } });
    if (!md) {
      stats.warnings.push(`ModuleDesign not found for rule: ${code}`);
      stats.skipped++;
      continue;
    }

    await dbWrite(() => prisma.serialNumberingRule.upsert({
      where: { moduleDesignId: md.id },
      create: { moduleDesignId: md.id, prefix, version: ver, counter, counterLastMMYY: lastMMY },
      update: { counter, counterLastMMYY: lastMMY },
    }));
    stats.created++;
  }
  return stats;
}

async function migrateSerialUnits(data: Array<Record<string, string>>): Promise<MigrationStats> {
  const stats: MigrationStats = { entity: 'SerialUnits', created: 0, updated: 0, skipped: 0, warnings: [] };

  // Build user lookup
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
  const userMap = new Map<string, string>();
  for (const u of users) {
    if (u.name) userMap.set(u.name.toLowerCase(), u.id);
  }

  for (const row of data) {
    const serial = String(row['Serial'] || '').trim();
    if (!serial) { stats.skipped++; continue; }

    const productName = String(row['Product'] || '').trim();
    const status = mapSerialStatus(String(row['Status'] || ''));
    const source = mapSerialSource(String(row['Source'] || ''));
    const userName = String(row['User'] || '').trim().toLowerCase();
    const logKey = String(row['LOG_KEY'] || '').trim();

    // Find moduleDesign by LOG_KEY
    let moduleDesignId: string | null = null;
    if (logKey) {
      const md = await prisma.moduleDesign.findUnique({ where: { code: logKey } });
      moduleDesignId = md?.id || null;
    }

    const userId = userMap.get(userName) || null;
    if (userName && !userId) {
      stats.warnings.push(`User not found: ${userName} (serial: ${serial})`);
    }

    const dateVal = row['Date'];
    const createdAt = typeof dateVal === 'number' ? excelDateToJS(dateVal) : new Date();

    await dbWrite(() => prisma.serialUnit.upsert({
      where: { serial },
      create: {
        serial,
        moduleDesignId,
        status: status as 'IN_STOCK',
        source: source as 'MANUFACTURED',
        createdByUserId: userId,
        createdAt,
      },
      update: {
        status: status as 'IN_STOCK',
        moduleDesignId,
      },
    }));
    stats.created++;
  }
  return stats;
}

async function migrateLotTransactions(
  nhapData: Array<Record<string, string>>,
  xuatData: Array<Record<string, string>>
): Promise<MigrationStats> {
  const stats: MigrationStats = { entity: 'LotTransactions', created: 0, updated: 0, skipped: 0, warnings: [] };

  // Find default warehouse
  const warehouse = await prisma.warehouse.findFirst({ where: { code: 'WH-MAIN' } });

  async function processRows(rows: Array<Record<string, string>>, transactionType: string): Promise<void> {
    for (const row of rows) {
      const partNumber = String(row['Part Number'] || '').trim();
      const qty = parseInt(String(row['Qty'] || '0')) || 0;
      if (!partNumber || qty === 0) { stats.skipped++; continue; }

      const part = await prisma.part.findUnique({ where: { partNumber } });
      if (!part) { stats.skipped++; continue; }

      const dateVal = row['Date'];
      const createdAt = typeof dateVal === 'number' ? excelDateToJS(dateVal) : new Date();
      const note = String(row['Note'] || row['Use For'] || '').trim();
      const lotNumber = `IMPORT-${partNumber}-${Math.floor(typeof dateVal === 'number' ? dateVal : 0)}`;

      // Check existing by lotNumber + transactionType + partId to avoid duplicates
      const existing = await prisma.lotTransaction.findFirst({
        where: { lotNumber, transactionType, partId: part.id },
      });
      if (existing) { stats.skipped++; continue; }

      await dbWrite(() => prisma.lotTransaction.create({
        data: {
          partId: part.id,
          transactionType,
          quantity: qty,
          lotNumber,
          toWarehouseId: transactionType === 'RECEIVED' ? warehouse?.id : null,
          fromWarehouseId: transactionType === 'ISSUED' ? warehouse?.id : null,
          notes: note || null,
          userId: 'system',
          createdAt,
        },
      }));
      stats.created++;
    }
  }

  await processRows(nhapData, 'RECEIVED');
  await processRows(xuatData, 'ISSUED');
  return stats;
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  console.log(`\n=== DASHBOARD MIGRATION ===`);
  console.log(`File: ${filePath}`);
  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'REAL'}`);
  console.log(`Only: ${onlyEntity || 'all'}\n`);

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(filePath);
  const start = Date.now();
  const allStats: MigrationStats[] = [];

  // Load sheets
  const danhMuc = readSheet<Record<string, string>>(wb, 'DANH_MUC');
  const serialGen = readSheet<Record<string, string>>(wb, 'SERIAL_GEN');
  const bomChuan = readSheet<Record<string, string>>(wb, 'BOM_CHUAN');
  const duAn = readSheet<Record<string, string>>(wb, 'DU_AN');
  const serialMaster = readSheet<Record<string, string>>(wb, 'SERIAL_MASTER');
  const nhapKho = readSheet<Record<string, string>>(wb, 'NHAP_KHO');
  const xuatKho = readSheet<Record<string, string>>(wb, 'XUAT_KHO');

  // Step 1: Category mapping
  const rawCategories = [...new Set(danhMuc.map(r => String(r['Category'] || '').trim()).filter(Boolean))];
  let categoryMapping: CategoryMapping;

  if (fs.existsSync(mappingPath)) {
    categoryMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
    console.log(`Loaded category mapping from ${mappingPath} (${Object.keys(categoryMapping.mapping).length} entries)`);
  } else {
    categoryMapping = generateCategoryMapping(rawCategories);
    fs.writeFileSync(mappingPath, JSON.stringify(categoryMapping, null, 2));
    console.log(`Generated category mapping → ${mappingPath} (${Object.keys(categoryMapping.mapping).length} entries, ${categoryMapping.clusters.length} clusters)`);
  }

  if (categoryMapping.unresolved.length > 0) {
    console.error(`\nERROR: ${categoryMapping.unresolved.length} unresolved categories. Fix mapping file before import.`);
    categoryMapping.unresolved.forEach(c => console.error(`  - ${c}`));
    process.exit(1);
  }

  // Run migrations in order
  if (shouldRun('categories')) allStats.push(await migrateCategories(categoryMapping));
  if (shouldRun('suppliers')) allStats.push(await migrateSuppliers(danhMuc));
  if (shouldRun('parts')) allStats.push(await migrateParts(danhMuc, categoryMapping));
  if (shouldRun('partsuppliers')) allStats.push(await migratePartSuppliers(danhMuc));
  if (shouldRun('products')) allStats.push(await migrateProducts(bomChuan));
  if (shouldRun('moduledesigns')) allStats.push(await migrateModuleDesigns(serialGen, bomChuan, duAn));
  if (shouldRun('bom_ebox')) allStats.push(await migrateBomChuan(bomChuan));
  if (shouldRun('bom_module')) allStats.push(await migrateDuAnBom(duAn));
  if (shouldRun('numberingrules')) allStats.push(await migrateNumberingRules(serialGen));
  if (shouldRun('serialunits')) allStats.push(await migrateSerialUnits(serialMaster));
  if (shouldRun('lottransactions')) allStats.push(await migrateLotTransactions(nhapKho, xuatKho));

  const duration = ((Date.now() - start) / 1000).toFixed(1);

  // Print report
  console.log(`\n=== DASHBOARD MIGRATION REPORT ===`);
  console.log(`File: ${filePath}`);
  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'REAL'}`);
  console.log(`Duration: ${duration}s\n`);

  let totalWarnings = 0;
  for (const s of allStats) {
    const warn = s.warnings.length > 0 ? `   (${s.warnings.length} warnings)` : '';
    console.log(`${s.entity.padEnd(22)} ${String(s.created).padStart(6)} created, ${String(s.updated).padStart(4)} updated, ${String(s.skipped).padStart(4)} skipped${warn}`);
    totalWarnings += s.warnings.length;
  }

  console.log(`\nWARNINGS: ${totalWarnings}`);
  if (totalWarnings > 0) {
    for (const s of allStats) {
      for (const w of s.warnings.slice(0, 10)) {
        console.log(`  [${s.entity}] ${w}`);
      }
    }
  }
  console.log(`\nStatus: SUCCESS`);

  // Save report
  const reportPath = path.join(process.cwd(), 'docs/sprint-27/reports/DATA_MIGRATION_REPORT.md');
  const reportContent = `# Data Migration Report\n\n**Date:** ${new Date().toISOString()}\n**File:** ${filePath}\n**Mode:** ${dryRun ? 'DRY-RUN' : 'REAL'}\n**Duration:** ${duration}s\n\n| Entity | Created | Updated | Skipped | Warnings |\n|--------|---------|---------|---------|----------|\n${allStats.map(s => `| ${s.entity} | ${s.created} | ${s.updated} | ${s.skipped} | ${s.warnings.length} |`).join('\n')}\n\n**Total warnings:** ${totalWarnings}\n`;
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, reportContent);
}

// Only run when executed directly (not imported for testing)
const isDirectExecution = require.main === module || process.argv[1]?.includes('migrate-dashboard');
if (isDirectExecution) {
  main()
    .catch((e) => {
      console.error('Migration failed:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
