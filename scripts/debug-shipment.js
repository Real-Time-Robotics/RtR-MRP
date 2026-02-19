const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const warehouses = await p.warehouse.findMany({
    select: { id: true, code: true, name: true, type: true, isDefault: true, status: true }
  });
  console.log("=== WAREHOUSES ===");
  warehouses.forEach(w =>
    console.log(w.id, "|", w.code, "|", w.name, "| type:", w.type, "| default:", w.isDefault, "| status:", w.status)
  );

  // HERA-V2 inventory
  const partId = "cmli0fxnk001oh0tjkggewqek";
  const invRecords = await p.inventory.findMany({ where: { partId } });
  console.log("\n=== HERA-V2 INVENTORY ===");
  invRecords.forEach(i =>
    console.log("  warehouseId:", i.warehouseId, "| qty:", i.quantity, "| lot:", i.lotNumber)
  );

  // Step 1: Find warehouse (same logic as confirmShipment)
  let wh = await p.warehouse.findFirst({ where: { type: "MAIN", status: "active" } });
  console.log("\n=== WAREHOUSE LOOKUP ===");
  console.log("type=MAIN:", wh ? wh.code + " (" + wh.id + ")" : "NOT FOUND");

  if (!wh) {
    wh = await p.warehouse.findFirst({ where: { isDefault: true, status: "active" } });
    console.log("isDefault:", wh ? wh.code + " (" + wh.id + ")" : "NOT FOUND");
  }
  if (!wh) {
    wh = await p.warehouse.findFirst({ where: { status: "active" }, orderBy: { createdAt: "asc" } });
    console.log("oldest active:", wh ? wh.code + " (" + wh.id + ")" : "NOT FOUND");
  }

  if (!wh) {
    console.log("\nNO WAREHOUSE FOUND - this is why inventory was not deducted!");
    return;
  }

  // Step 2: Find inventory
  const inv = await p.inventory.findFirst({ where: { partId, warehouseId: wh.id } });
  console.log("\n=== INVENTORY LOOKUP ===");
  console.log("warehouse:", wh.code, "(" + wh.id + ")");
  console.log("inventory record:", inv ? "FOUND qty=" + inv.quantity : "NOT FOUND");

  if (!inv) {
    console.log("Inventory warehouseId mismatch! Inventory is in:", invRecords.map(i => i.warehouseId).join(", "));
    console.log("But engine looked in:", wh.id);
    console.log("THIS IS THE BUG - warehouse IDs don't match!");
  } else {
    console.log("qty >= 2?", inv.quantity >= 2);
    if (inv.quantity < 2) {
      console.log("INSUFFICIENT STOCK - this is why it was silently skipped!");
    }
  }
}

main().then(() => p.$disconnect()).catch(e => { console.error(e); p.$disconnect(); });
