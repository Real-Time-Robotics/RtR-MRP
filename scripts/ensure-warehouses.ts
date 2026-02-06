/**
 * Ensure required warehouses exist in the database.
 * Safe to run multiple times — uses upsert (no data loss).
 * Run: npx tsx scripts/ensure-warehouses.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const requiredWarehouses = [
  {
    code: "WH-HOLD",
    name: "Hold Area",
    location: "Khu chờ xử lý - Hàng conditional",
    type: "HOLD",
    status: "active",
  },
  {
    code: "WH-QUARANTINE",
    name: "Quarantine",
    location: "Khu cách ly - Hàng lỗi chờ xử lý",
    type: "QUARANTINE",
    status: "active",
  },
  {
    code: "WH-RECEIVING",
    name: "Receiving Area",
    location: "Khu nhận hàng - Chờ kiểm tra QC",
    type: "RECEIVING",
    status: "active",
  },
];

async function main() {
  console.log("Ensuring required warehouses exist...");

  for (const wh of requiredWarehouses) {
    const existing = await prisma.warehouse.findFirst({
      where: { code: wh.code },
    });

    if (existing) {
      // Update type if it's missing or wrong
      if (existing.type !== wh.type) {
        await prisma.warehouse.update({
          where: { id: existing.id },
          data: { type: wh.type, location: wh.location },
        });
        console.log(`  Updated ${wh.code} type: ${existing.type} → ${wh.type}`);
      } else {
        console.log(`  ${wh.code} already exists ✓`);
      }
    } else {
      await prisma.warehouse.create({ data: wh });
      console.log(`  Created ${wh.code} (${wh.type})`);
    }
  }

  // Also ensure WH-MAIN has type "MAIN" if it exists
  const mainWh = await prisma.warehouse.findFirst({
    where: { code: "WH-MAIN" },
  });
  if (mainWh && mainWh.type !== "MAIN" && mainWh.type !== "mixed") {
    await prisma.warehouse.update({
      where: { id: mainWh.id },
      data: { type: "MAIN" },
    });
    console.log(`  Updated WH-MAIN type → MAIN`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
