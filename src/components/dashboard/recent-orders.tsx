"use client";

// =============================================================================
// RECENT ORDERS - Industrial Precision Style
// Excel-like table with row numbers
// =============================================================================

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowNumber,
} from "@/components/ui/table";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

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
  { label: string; color: string }
> = {
  draft: { label: "DRAFT", color: "text-mrp-text-muted bg-gunmetal" },
  confirmed: { label: "CONFIRMED", color: "text-info-cyan bg-info-cyan-dim" },
  in_production: { label: "IN PROD", color: "text-alert-amber bg-alert-amber-dim" },
  ready: { label: "READY", color: "text-production-green bg-production-green-dim" },
  shipped: { label: "SHIPPED", color: "text-info-cyan bg-info-cyan-dim" },
  delivered: { label: "DELIVERED", color: "text-production-green bg-production-green-dim" },
  cancelled: { label: "CANCELLED", color: "text-urgent-red bg-urgent-red-dim" },
};

function getDeliveryStatus(requiredDate: Date, status: string, t: (key: string) => string) {
  if (status === "delivered" || status === "shipped") {
    return { label: t("dashboard.onTrack"), color: "text-production-green bg-production-green-dim" };
  }
  const today = new Date();
  const daysUntilDue = Math.ceil(
    (requiredDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysUntilDue < 0) {
    return { label: t("dashboard.delayed"), color: "text-urgent-red bg-urgent-red-dim" };
  }
  if (daysUntilDue < 14) {
    return { label: t("dashboard.atRisk"), color: "text-alert-amber bg-alert-amber-dim" };
  }
  return { label: t("dashboard.onTrack"), color: "text-production-green bg-production-green-dim" };
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-white dark:bg-gunmetal border border-gray-200 dark:border-mrp-border">
      {/* Header - Industrial Style */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-mrp-border">
        <h3 className="text-sm font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary">
          {t("dashboard.recentOrders")}
        </h3>
        <Link href="/orders">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs font-mono uppercase tracking-wider text-mrp-text-muted hover:text-info-cyan hover:bg-transparent"
          >
            {t("dashboard.viewAll")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 text-center">#</TableHead>
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
              <TableCell colSpan={6} className="text-center py-8">
                <p className="text-mrp-text-muted text-xs font-mono uppercase">
                  {t("orders.noOrders")}
                </p>
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order, index) => {
              const statusInfo = statusConfig[order.status] || {
                label: order.status.toUpperCase(),
                color: "text-mrp-text-muted bg-gunmetal",
              };
              const deliveryStatus = getDeliveryStatus(
                new Date(order.requiredDate),
                order.status,
                t
              );
              return (
                <TableRow key={order.id}>
                  {/* Row Number */}
                  <TableRowNumber rowNumber={index + 1} />

                  {/* Order Number */}
                  <TableCell className="font-medium">
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-info-cyan hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </TableCell>

                  {/* Customer */}
                  <TableCell className="text-mrp-text-secondary">
                    {order.customerName}
                  </TableCell>

                  {/* Due Date */}
                  <TableCell className="text-mrp-text-secondary">
                    {format(new Date(order.requiredDate), "MMM d")}
                  </TableCell>

                  {/* Status Badge - Industrial Style */}
                  <TableCell>
                    <span className={cn(
                      "inline-flex px-2 py-0.5 text-[10px] font-bold font-mono uppercase tracking-wider",
                      statusInfo.color
                    )}>
                      {statusInfo.label}
                    </span>
                  </TableCell>

                  {/* Delivery Status */}
                  <TableCell className="text-right">
                    <span className={cn(
                      "inline-flex px-2 py-0.5 text-[10px] font-bold font-mono uppercase tracking-wider",
                      deliveryStatus.color
                    )}>
                      {deliveryStatus.label}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
