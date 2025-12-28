"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";

export function OrdersHeader() {
  const { t } = useLanguage();
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("orders.title")}</h1>
      <p className="text-muted-foreground">{t("orders.description")}</p>
    </div>
  );
}

export function OrdersNewButton() {
  const { t } = useLanguage();
  return t("orders.newOrder");
}

export function OrdersTableHeader() {
  const { t } = useLanguage();
  return (
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <ShoppingCart className="h-5 w-5" />
        {t("orders.title")}
      </CardTitle>
    </CardHeader>
  );
}

export function OrdersNoData() {
  const { t } = useLanguage();
  return <p className="text-muted-foreground">{t("orders.noOrders")}</p>;
}

interface OrdersStatsProps {
  total: number;
  totalValue: string;
  inProduction: number;
  readyToShip: number;
}

export function OrdersStatsCards({ stats }: { stats: OrdersStatsProps }) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t("orders.title")}</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t("orders.total")}</p>
          <p className="text-2xl font-bold">{stats.totalValue}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t("status.inProduction")}</p>
          <p className="text-2xl font-bold text-blue-600">{stats.inProduction}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t("status.ready")}</p>
          <p className="text-2xl font-bold text-green-600">{stats.readyToShip}</p>
        </CardContent>
      </Card>
    </div>
  );
}
