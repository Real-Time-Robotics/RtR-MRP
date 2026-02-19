import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, XCircle, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: 'Cảnh báo tồn kho',
  description: 'Cảnh báo tồn kho thấp và hết hàng - Theo dõi và xử lý kịp thời',
};
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { StockStatusBadge } from "@/components/inventory/stock-status-badge";
import prisma from "@/lib/prisma";
import { getStockStatus } from "@/lib/bom-engine";
import { StockStatus } from "@/types";

async function getAlerts() {
  const inventoryData = await prisma.inventory.findMany({
    include: {
      part: {
        include: {
          planning: true,
        }
      },
    },
  });

  // Group by part
  const partMap = new Map<
    string,
    {
      partId: string;
      partNumber: string;
      name: string;
      isCritical: boolean;
      minStockLevel: number;
      reorderPoint: number;
      available: number;
      status: StockStatus;
    }
  >();

  inventoryData.forEach((inv) => {
    const existing = partMap.get(inv.partId);
    const newAvailable = inv.quantity - inv.reservedQty;
    const minStockLevel = inv.part.planning?.minStockLevel || 0;
    const reorderPoint = inv.part.planning?.reorderPoint || 0;

    if (existing) {
      existing.available += newAvailable;
      existing.status = getStockStatus(
        existing.available,
        existing.minStockLevel,
        existing.reorderPoint
      );
    } else {
      partMap.set(inv.partId, {
        partId: inv.partId,
        partNumber: inv.part.partNumber,
        name: inv.part.name,
        isCritical: inv.part.isCritical,
        minStockLevel,
        reorderPoint,
        available: newAvailable,
        status: getStockStatus(newAvailable, minStockLevel, reorderPoint),
      });
    }
  });

  const allItems = Array.from(partMap.values());
  const criticalItems = allItems.filter(
    (i) => i.status === "CRITICAL" || i.status === "OUT_OF_STOCK"
  );
  const reorderItems = allItems.filter((i) => i.status === "REORDER");

  return { criticalItems, reorderItems };
}

export default async function InventoryAlertsPage() {
  const { criticalItems, reorderItems } = await getAlerts();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Alerts"
        description="Items requiring immediate attention"
        backHref="/inventory"
        actions={
          <Button>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Create POs for All
          </Button>
        }
      />

      {/* Critical Items */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Critical Stock ({criticalItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {criticalItems.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No critical stock issues
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Min Level</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criticalItems.map((item) => (
                  <TableRow key={item.partId}>
                    <TableCell className="font-mono font-medium">
                      {item.partNumber}
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      {item.available}
                    </TableCell>
                    <TableCell className="text-right">{item.minStockLevel}</TableCell>
                    <TableCell className="text-center">
                      <StockStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href="/purchasing/new">
                        <Button size="sm">Order</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reorder Items */}
      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Below Reorder Point ({reorderItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reorderItems.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              All items above reorder point
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Reorder Point</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reorderItems.map((item) => (
                  <TableRow key={item.partId}>
                    <TableCell className="font-mono font-medium">
                      {item.partNumber}
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right font-medium text-amber-600">
                      {item.available}
                    </TableCell>
                    <TableCell className="text-right">{item.reorderPoint}</TableCell>
                    <TableCell className="text-center">
                      <StockStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href="/purchasing/new">
                        <Button size="sm" variant="outline">
                          Order
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
