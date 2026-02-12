const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  // Find the shipment
  const shipment = await p.shipment.findFirst({
    where: { shipmentNumber: "SHP-SO-880474" },
    include: { salesOrder: true },
  });

  if (!shipment) {
    console.log("No shipment found to reset.");
    return;
  }

  console.log("Resetting shipment:", shipment.shipmentNumber);

  // Delete shipment (cascade deletes ShipmentLines)
  await p.shipment.delete({ where: { id: shipment.id } });
  console.log("Deleted shipment");

  // Reset SO status back to completed
  await p.salesOrder.update({
    where: { id: shipment.salesOrderId },
    data: { status: "completed" },
  });
  console.log("Reset SO", shipment.salesOrder.orderNumber, "to completed");

  // Show current inventory
  const part = await p.part.findFirst({ where: { partNumber: "HERA-V2" } });
  if (part) {
    const inv = await p.inventory.findMany({ where: { partId: part.id } });
    console.log("\nCurrent HERA-V2 inventory:");
    inv.forEach(i => console.log("  lot:", i.lotNumber, "qty:", i.quantity));
    console.log("  Total:", inv.reduce((s, i) => s + i.quantity, 0));
  }

  console.log("\nDone! You can now test shipping again.");
}

main().then(() => p.$disconnect()).catch(e => { console.error(e); p.$disconnect(); });
