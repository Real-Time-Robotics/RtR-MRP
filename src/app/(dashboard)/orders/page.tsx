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
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrdersHeader, OrdersNewButton, OrdersTableHeader, OrdersNoData, OrdersStatsCards } from "@/components/orders/orders-content";
import prisma from "@/lib/prisma";
import { format } from "date-fns";

async function getOrders() {
  const orders = await prisma.salesOrder.findMany({
    include: {
      customer: true,
      lines: {
        include: {
          product: true,
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

export default async function OrdersPage() {
  const orders = await getOrders();

  const totalValue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <OrdersHeader />
        <Link href="/orders/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            <OrdersNewButton />
          </Button>
        </Link>
      </div>

      {/* Summary */}
      <OrdersStatsCards
        stats={{
          total: orders.length,
          totalValue: formatCurrency(totalValue),
          inProduction: orders.filter((o) => o.status === "in_production").length,
          readyToShip: orders.filter((o) => o.status === "ready").length,
        }}
      />

      {/* Orders Table */}
      <Card>
        <OrdersTableHeader />
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <OrdersNoData />
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-medium">
                      <Link
                        href={`/orders/${order.id}`}
                        className="hover:underline text-primary"
                      >
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{order.customer.name}</TableCell>
                    <TableCell>{format(order.orderDate, "MMM d, yyyy")}</TableCell>
                    <TableCell>{format(order.requiredDate, "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <span
                        className={`capitalize ${
                          order.priority === "urgent"
                            ? "text-red-600 font-medium"
                            : order.priority === "high"
                            ? "text-amber-600"
                            : ""
                        }`}
                      >
                        {order.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(order.totalAmount || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <OrderStatusBadge status={order.status} />
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
