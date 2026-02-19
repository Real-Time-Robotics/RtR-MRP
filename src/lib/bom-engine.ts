import prisma from "./prisma";
import { BomExplosionResult, BomModule, StockStatus } from "@/types";
import { logger } from '@/lib/logger';

const MAX_BOM_DEPTH = 10;

export async function explodeBOM(
  productId: string,
  buildQuantity: number
): Promise<{
  results: BomExplosionResult[];
  tree: BomExplosionResult[];
  modules: BomModule[];
  summary: {
    totalParts: number;
    totalCost: number;
    canBuild: number;
    shortageCount: number;
    totalSubAssemblies: number;
    totalLevels: number;
  };
}> {
  // Pre-fetch all products with active BOMs to build SKU->ProductId map
  const productsWithBom = await prisma.product.findMany({
    where: {
      bomHeaders: { some: { status: "active" } },
    },
    select: { id: true, sku: true },
  });
  const skuToProductId = new Map(productsWithBom.map((p) => [p.sku, p.id]));

  // Collect all partIds across all levels for batch inventory lookup
  const allPartIds = new Set<string>();
  const visitedProductIds = new Set<string>();

  // Recursive function to explode BOM
  async function explodeRecursive(
    currentProductId: string,
    parentQuantity: number,
    level: number,
    parentPartNumber?: string
  ): Promise<BomExplosionResult[]> {
    if (level > MAX_BOM_DEPTH) return [];
    if (visitedProductIds.has(currentProductId)) {
      logger.warn(`Circular BOM reference detected for product ${currentProductId}, skipping`, { context: 'bom-engine' });
      return [];
    }

    visitedProductIds.add(currentProductId);

    const bomHeader = await prisma.bomHeader.findFirst({
      where: { productId: currentProductId, status: "active" },
      include: {
        bomLines: {
          include: { part: { include: { costs: true } } },
          orderBy: [{ moduleCode: "asc" }, { lineNumber: "asc" }],
        },
      },
    });

    if (!bomHeader) {
      visitedProductIds.delete(currentProductId);
      return [];
    }

    const results: BomExplosionResult[] = [];

    for (const line of bomHeader.bomLines) {
      allPartIds.add(line.partId);

      const isSubAssembly =
        line.subAssembly === true || skuToProductId.has(line.part.partNumber);
      const subProductId = skuToProductId.get(line.part.partNumber);
      const quantityPer = line.quantity;
      const neededRaw = quantityPer * parentQuantity * (1 + line.scrapRate);
      const needed = Math.ceil(neededRaw);

      const result: BomExplosionResult = {
        partId: line.partId,
        partNumber: line.part.partNumber,
        name: line.part.name,
        needed,
        available: 0, // filled later
        shortage: 0, // filled later
        unit: line.unit,
        unitCost: line.part.costs?.[0]?.unitCost || 0,
        totalCost: needed * (line.part.costs?.[0]?.unitCost || 0),
        status: "OK",
        moduleCode: line.moduleCode || undefined,
        moduleName: line.moduleName || undefined,
        level,
        isSubAssembly,
        parentPartNumber,
        quantityPer,
      };

      if (isSubAssembly && subProductId) {
        // Recurse into sub-assembly BOM
        const children = await explodeRecursive(
          subProductId,
          quantityPer * parentQuantity,
          level + 1,
          line.part.partNumber
        );
        if (children.length > 0) {
          result.children = children;
        } else {
          // No sub-BOM found, treat as leaf
          result.isSubAssembly = false;
        }
      }

      // Phantom BOM: skip the phantom part itself but keep children
      if (line.phantom && result.children) {
        // Promote children directly, don't add the phantom row
        results.push(...result.children);
      } else {
        results.push(result);
      }
    }

    visitedProductIds.delete(currentProductId);
    return results;
  }

  // Execute recursive explosion
  const tree = await explodeRecursive(productId, buildQuantity, 0);

  // Batch fetch inventory for ALL parts across all levels
  const inventoryData = await prisma.inventory.groupBy({
    by: ["partId"],
    _sum: { quantity: true, reservedQty: true },
    where: { partId: { in: Array.from(allPartIds) } },
  });

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

  // Fill inventory data and calculate shortage in tree
  function fillInventory(items: BomExplosionResult[]): void {
    for (const item of items) {
      if (item.isSubAssembly && item.children) {
        // Sub-assembly: check its own inventory too
        const inv = inventoryMap.get(item.partId) || { available: 0 };
        item.available = inv.available;
        item.shortage = 0; // Sub-assembly shortage is determined by children
        item.status = "OK";
        fillInventory(item.children);
      } else {
        const inv = inventoryMap.get(item.partId) || { available: 0 };
        item.available = inv.available;
        item.shortage = Math.max(0, item.needed - inv.available);
        item.status = item.shortage > 0 ? "SHORTAGE" : "OK";
      }
    }
  }

  fillInventory(tree);

  // Flatten tree for consolidated results (leaf parts only, with dedup)
  const flatMap = new Map<string, BomExplosionResult>();

  function flattenTree(items: BomExplosionResult[]): void {
    for (const item of items) {
      if (item.isSubAssembly && item.children) {
        // Add sub-assembly row itself to flat results (for display)
        const saKey = `sa-${item.partId}`;
        if (!flatMap.has(saKey)) {
          flatMap.set(saKey, { ...item });
        } else {
          const existing = flatMap.get(saKey)!;
          existing.needed += item.needed;
          existing.totalCost = existing.needed * existing.unitCost;
        }
        flattenTree(item.children);
      } else {
        // Leaf part - consolidate duplicates
        if (flatMap.has(item.partId)) {
          const existing = flatMap.get(item.partId)!;
          existing.needed += item.needed;
          existing.totalCost = existing.needed * existing.unitCost;
          existing.shortage = Math.max(0, existing.needed - existing.available);
          existing.status = existing.shortage > 0 ? "SHORTAGE" : "OK";
        } else {
          flatMap.set(item.partId, { ...item });
        }
      }
    }
  }

  flattenTree(tree);
  const results = Array.from(flatMap.values());

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

  // Calculate canBuild based on leaf parts only
  const leafParts = results.filter((r) => !r.isSubAssembly);
  let canBuild = buildQuantity;
  leafParts.forEach((result) => {
    if (result.needed > 0) {
      const perUnit = result.needed / buildQuantity;
      const possible = Math.floor(result.available / perUnit);
      canBuild = Math.min(canBuild, possible);
    }
  });

  // Count sub-assemblies and max depth
  let totalSubAssemblies = 0;
  let maxLevel = 0;

  function countStats(items: BomExplosionResult[]): void {
    for (const item of items) {
      if (item.level > maxLevel) maxLevel = item.level;
      if (item.isSubAssembly) {
        totalSubAssemblies++;
        if (item.children) countStats(item.children);
      }
    }
  }

  countStats(tree);

  const summary = {
    totalParts: leafParts.length,
    totalCost: results.reduce((sum, r) => sum + r.totalCost, 0),
    canBuild: Math.max(0, canBuild),
    shortageCount: leafParts.filter((r) => r.status === "SHORTAGE").length,
    totalSubAssemblies,
    totalLevels: maxLevel + 1,
  };

  return { results, tree, modules, summary };
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
