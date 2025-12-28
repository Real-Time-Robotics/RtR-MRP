import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StockStatusBadge } from "@/components/inventory/stock-status-badge";
import { InventoryHeader, InventoryStatsCards, InventoryTableHeader, InventoryNoData, InventoryAlertButton } from "@/components/inventory/inventory-content";
import prisma from "@/lib/prisma";
import { getStockStatus } from "@/lib/bom-engine";
import { StockStatus } from "@/types";

async function getInventory() {
  const inventoryData = await prisma.inventory.findMany({
    include: {
      part: true,
      warehouse: true,
    },
    orderBy: [{ part: { partNumber: "asc" } }],
  });

  // Group by part
  const partMap = new Map<
    string,
    {
      partId: string;
      partNumber: string;
      name: string;
      category: string;
      unit: string;
      unitCost: number;
      isCritical: boolean;
      minStockLevel: number;
      reorderPoint: number;
      quantity: number;
      reserved: number;
      available: number;
      status: StockStatus;
    }
  >();

  inventoryData.forEach((inv) => {
    const existing = partMap.get(inv.partId);
    if (existing) {
      existing.quantity += inv.quantity;
      existing.reserved += inv.reservedQty;
      existing.available = existing.quantity - existing.reserved;
      existing.status = getStockStatus(
        existing.available,
        existing.minStockLevel,
        existing.reorderPoint
      );
    } else {
      const available = inv.quantity - inv.reservedQty;
      partMap.set(inv.partId, {
        partId: inv.partId,
        partNumber: inv.part.partNumber,
        name: inv.part.name,
        category: inv.part.category,
        unit: inv.part.unit,
        unitCost: inv.part.unitCost,
        isCritical: inv.part.isCritical,
        minStockLevel: inv.part.minStockLevel,
        reorderPoint: inv.part.reorderPoint,
        quantity: inv.quantity,
        reserved: inv.reservedQty,
        available,
        status: getStockStatus(available, inv.part.minStockLevel, inv.part.reorderPoint),
      });
    }
  });

  return Array.from(partMap.values());
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function InventoryPage() {
  const inventory = await getInventory();

  const criticalCount = inventory.filter(
    (i) => i.status === "CRITICAL" || i.status === "OUT_OF_STOCK"
  ).length;
  const reorderCount = inventory.filter((i) => i.status === "REORDER").length;
  const okCount = inventory.filter((i) => i.status === "OK").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <InventoryHeader />
        <Link href="/inventory/alerts">
          <Button variant={criticalCount > 0 ? "destructive" : "outline"}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            <InventoryAlertButton count={criticalCount + reorderCount} />
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <InventoryStatsCards
        stats={{
          total: inventory.length,
          critical: criticalCount,
          reorder: reorderCount,
          ok: okCount,
        }}
      />

      {/* Inventory Table */}
      <Card>
        <InventoryTableHeader />
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <InventoryNoData />
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((item) => (
                  <TableRow key={item.partId}>
                    <TableCell className="font-mono font-medium">
                      <Link
                        href={`/inventory/${item.partId}`}
                        className="hover:underline text-primary"
                      >
                        {item.partNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.reserved}</TableCell>
                    <TableCell className="text-right font-medium">
                      {item.available}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(item.unitCost)}
                    </TableCell>
                    <TableCell className="text-center">
                      <StockStatusBadge status={item.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
