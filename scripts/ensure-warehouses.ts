/**
 * Ensure the warehouse system is consistent.
 *
 * Standard warehouses (8 total, ordered by material flow):
 *   WH-RECEIVING  (RECEIVING)      — Khu nhận hàng, chờ kiểm tra QC
 *   WH-QUARANTINE (QUARANTINE)     — Khu cách ly, hàng lỗi chờ xử lý
 *   WH-MAIN       (MAIN)           — Kho chính, nguyên vật liệu đã QC pass
 *   WH-WIP        (WIP)            — Khu sản xuất, hàng đang gia công
 *   WH-FG         (FINISHED_GOODS) — Kho thành phẩm, hàng hoàn thành
 *   WH-SHIP       (SHIPPING)       — Khu xuất hàng, hàng chờ vận chuyển
 *   WH-HOLD       (HOLD)           — Khu tạm giữ, hàng conditional
 *   WH-SCRAP      (SCRAP)          — Khu phế liệu, hàng hủy
 *
 * This script:
 *   1. Creates missing standard warehouses
 *   2. Fixes WH-MAIN type if it's 'mixed' or 'main' → 'MAIN'
 *   3. Removes legacy warehouses (WH-RAW) if they have no inventory
 *
 * Safe to run multiple times. Runs automatically during build.
 * Manual: npx tsx scripts/ensure-warehouses.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STANDARD_WAREHOUSES = [
  {
    code: "WH-RECEIVING",
    name: "Receiving Area",
    type: "RECEIVING",
    location: "Khu nhận hàng - Chờ kiểm tra QC",
    status: "active",
  },
  {
    code: "WH-QUARANTINE",
    name: "Quarantine",
    type: "QUARANTINE",
    location: "Khu cách ly - Hàng lỗi chờ xử lý",
    status: "active",
  },
  {
    code: "WH-MAIN",
    name: "Main Warehouse",
    type: "MAIN",
    location: "Austin, TX",
    status: "active",
  },
  {
    code: "WH-WIP",
    name: "Work-in-Progress",
    type: "WIP",
    location: "Khu sản xuất - Hàng đang gia công",
    status: "active",
  },
  {
    code: "WH-FG",
    name: "Finished Goods",
    type: "FINISHED_GOODS",
    location: "Kho thành phẩm - Hàng hoàn thành",
    status: "active",
  },
  {
    code: "WH-SHIP",
    name: "Shipping Area",
    type: "SHIPPING",
    location: "Khu xuất hàng - Chờ vận chuyển",
    status: "active",
  },
  {
    code: "WH-HOLD",
    name: "Hold Area",
    type: "HOLD",
    location: "Khu chờ xử lý - Hàng conditional",
    status: "active",
  },
  {
    code: "WH-SCRAP",
    name: "Scrap Area",
    type: "SCRAP",
    location: "Khu phế liệu - Hàng hủy chờ xử lý",
    status: "active",
  },
];

// Legacy warehouse codes that should be removed if empty
const LEGACY_CODES = ["WH-RAW"];

async function main() {
  console.log("=== Warehouse System Check ===\n");

  // Step 1: Ensure standard warehouses exist with correct type
  console.log("1. Checking standard warehouses...");
  for (const wh of STANDARD_WAREHOUSES) {
    const existing = await prisma.warehouse.findFirst({
      where: { code: wh.code },
    });

    if (existing) {
      // Fix type if wrong (e.g., 'mixed' → 'MAIN', 'main' → 'MAIN')
      if (existing.type !== wh.type) {
        await prisma.warehouse.update({
          where: { id: existing.id },
          data: { type: wh.type },
        });
        console.log(`   Fixed ${wh.code} type: '${existing.type}' → '${wh.type}'`);
      } else {
        console.log(`   ${wh.code} (${wh.type}) ✓`);
      }
    } else {
      await prisma.warehouse.create({ data: wh });
      console.log(`   Created ${wh.code} (${wh.type})`);
    }
  }

  // Step 2: Clean up legacy warehouses if empty
  console.log("\n2. Checking legacy warehouses...");
  for (const code of LEGACY_CODES) {
    const legacy = await prisma.warehouse.findFirst({
      where: { code },
    });

    if (!legacy) {
      console.log(`   ${code} not found (OK)`);
      continue;
    }

    // Check if it has any inventory
    const inventoryCount = await prisma.inventory.count({
      where: { warehouseId: legacy.id },
    });

    if (inventoryCount === 0) {
      await prisma.warehouse.delete({ where: { id: legacy.id } });
      console.log(`   Deleted ${code} (empty, legacy)`);
    } else {
      console.log(`   WARNING: ${code} has ${inventoryCount} inventory items — NOT deleted`);
      console.log(`   → Manual action needed: move items then delete`);
    }
  }

  // Step 3: Summary
  const allWarehouses = await prisma.warehouse.findMany({
    orderBy: { code: "asc" },
    select: { code: true, name: true, type: true },
  });
  console.log(`\n3. Final warehouse list (${allWarehouses.length}):`);
  for (const wh of allWarehouses) {
    const isStandard = STANDARD_WAREHOUSES.some((s) => s.code === wh.code);
    console.log(`   ${wh.code} (${wh.type}) — ${wh.name}${isStandard ? "" : " ⚠ NON-STANDARD"}`);
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
