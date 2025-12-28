"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useLanguage } from "@/lib/i18n/language-context";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  requiredDate: Date;
  status: string;
  totalAmount: number;
}

interface RecentOrdersProps {
  orders: Order[];
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "default" },
  in_production: { label: "In Production", variant: "default" },
  ready: { label: "Ready", variant: "default" },
  shipped: { label: "Shipped", variant: "default" },
  delivered: { label: "Delivered", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

function getDeliveryStatus(requiredDate: Date, status: string, t: (key: string) => string) {
  if (status === "delivered" || status === "shipped") {
    return { label: t("dashboard.onTrack"), color: "text-green-600 bg-green-50" };
  }
  const today = new Date();
  const daysUntilDue = Math.ceil(
    (requiredDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysUntilDue < 0) {
    return { label: t("dashboard.delayed"), color: "text-red-600 bg-red-50" };
  }
  if (daysUntilDue < 14) {
    return { label: t("dashboard.atRisk"), color: "text-amber-600 bg-amber-50" };
  }
  return { label: t("dashboard.onTrack"), color: "text-green-600 bg-green-50" };
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t("dashboard.recentOrders")}</CardTitle>
          <Link href="/orders">
            <Button variant="ghost" size="sm" className="gap-1">
              {t("dashboard.viewAll")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("orders.orderNumber")}</TableHead>
              <TableHead>{t("orders.customer")}</TableHead>
              <TableHead>{t("dashboard.dueDate")}</TableHead>
              <TableHead>{t("orders.status")}</TableHead>
              <TableHead className="text-right">{t("dashboard.delivery")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <p className="text-muted-foreground">{t("orders.noOrders")}</p>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const statusInfo = statusConfig[order.status] || {
                  label: order.status,
                  variant: "secondary" as const,
                };
                const deliveryStatus = getDeliveryStatus(
                  new Date(order.requiredDate),
                  order.status,
                  t
                );
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/orders/${order.id}`}
                        className="hover:underline text-primary"
                      >
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>
                      {format(new Date(order.requiredDate), "MMM d")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${deliveryStatus.color}`}
                      >
                        {deliveryStatus.label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
