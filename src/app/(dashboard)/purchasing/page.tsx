import Link from "next/link";
import { Plus } from "lucide-react";
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
import { POStatusBadge } from "@/components/purchasing/po-status-badge";
import { PurchasingHeader, PurchasingNewButton, PurchasingTableHeader, PurchasingNoData, PurchasingStatsCards } from "@/components/purchasing/purchasing-content";
import prisma from "@/lib/prisma";
import { format } from "date-fns";

async function getPurchaseOrders() {
  const orders = await prisma.purchaseOrder.findMany({
    include: {
      supplier: true,
      lines: {
        include: {
          part: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function PurchasingPage() {
  const orders = await getPurchaseOrders();

  const totalValue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const pendingOrders = orders.filter(
    (o) => !["received", "cancelled"].includes(o.status)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PurchasingHeader />
        <Link href="/purchasing/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            <PurchasingNewButton />
          </Button>
        </Link>
      </div>

      {/* Summary */}
      <PurchasingStatsCards
        stats={{
          total: orders.length,
          totalValue: formatCurrency(totalValue),
          pending: pendingOrders.length,
          received: orders.filter((o) => o.status === "received").length,
        }}
      />

      {/* PO Table */}
      <Card>
        <PurchasingTableHeader />
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <PurchasingNoData />
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-medium">
                      <Link
                        href={`/purchasing/${order.id}`}
                        className="hover:underline text-primary"
                      >
                        {order.poNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{order.supplier.name}</TableCell>
                    <TableCell>{format(order.orderDate, "MMM d, yyyy")}</TableCell>
                    <TableCell>{format(order.expectedDate, "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-center">{order.lines.length}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(order.totalAmount || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <POStatusBadge status={order.status} />
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
