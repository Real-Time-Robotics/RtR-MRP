import prisma from "./prisma";
import { BomExplosionResult, BomModule, StockStatus } from "@/types";

export async function explodeBOM(
  productId: string,
  buildQuantity: number
): Promise<{
  results: BomExplosionResult[];
  modules: BomModule[];
  summary: {
    totalParts: number;
    totalCost: number;
    canBuild: number;
    shortageCount: number;
  };
}> {
  // Get active BOM for product
  const bomHeader = await prisma.bomHeader.findFirst({
    where: {
      productId,
      status: "active",
    },
    include: {
      bomLines: {
        include: {
          part: true,
        },
        orderBy: [{ moduleCode: "asc" }, { lineNumber: "asc" }],
      },
    },
  });

  if (!bomHeader) {
    throw new Error("No active BOM found for this product");
  }

  // Get all inventory for parts in BOM
  const partIds = bomHeader.bomLines.map((line) => line.partId);
  const inventoryData = await prisma.inventory.groupBy({
    by: ["partId"],
    _sum: {
      quantity: true,
      reservedQty: true,
    },
    where: {
      partId: { in: partIds },
    },
  });

  // Create inventory lookup map
  const inventoryMap = new Map(
    inventoryData.map((inv) => [
      inv.partId,
      {
        quantity: inv._sum.quantity || 0,
        reserved: inv._sum.reservedQty || 0,
        available: (inv._sum.quantity || 0) - (inv._sum.reservedQty || 0),
      },
    ])
  );

  // Calculate requirements
  const results: BomExplosionResult[] = bomHeader.bomLines.map((line) => {
    const needed = Math.ceil(line.quantity * buildQuantity * (1 + line.scrapRate));
    const inv = inventoryMap.get(line.partId) || { available: 0 };
    const shortage = Math.max(0, needed - inv.available);

    return {
      partId: line.partId,
      partNumber: line.part.partNumber,
      name: line.part.name,
      needed,
      available: inv.available,
      shortage,
      unit: line.unit,
      unitCost: line.part.unitCost,
      totalCost: needed * line.part.unitCost,
      status: shortage > 0 ? "SHORTAGE" : "OK",
      moduleCode: line.moduleCode || undefined,
      moduleName: line.moduleName || undefined,
    };
  });

  // Group by module
  const moduleMap = new Map<string, BomModule>();
  results.forEach((result) => {
    const code = result.moduleCode || "MISC";
    const name = result.moduleName || "Miscellaneous";

    if (!moduleMap.has(code)) {
      moduleMap.set(code, {
        moduleCode: code,
        moduleName: name,
        lines: [],
        totalParts: 0,
        totalCost: 0,
      });
    }

    const bomModule = moduleMap.get(code)!;
    bomModule.lines.push(result as unknown as import("@/types").BomLine);
    bomModule.totalParts++;
    bomModule.totalCost += result.totalCost;
  });

  const modules = Array.from(moduleMap.values());

  // Calculate how many units can be built
  let canBuild = buildQuantity;
  results.forEach((result) => {
    if (result.needed > 0) {
      const possible = Math.floor(result.available / (result.needed / buildQuantity));
      canBuild = Math.min(canBuild, possible);
    }
  });

  const summary = {
    totalParts: results.length,
    totalCost: results.reduce((sum, r) => sum + r.totalCost, 0),
    canBuild: Math.max(0, canBuild),
    shortageCount: results.filter((r) => r.status === "SHORTAGE").length,
  };

  return { results, modules, summary };
}

export function getStockStatus(
  available: number,
  minStockLevel: number,
  reorderPoint: number
): StockStatus {
  if (available <= 0) return "OUT_OF_STOCK";
  if (available < minStockLevel) return "CRITICAL";
  if (available < reorderPoint) return "REORDER";
  return "OK";
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}
