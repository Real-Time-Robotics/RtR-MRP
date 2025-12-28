"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, ClipboardList, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardKPIs {
  pendingOrders: number;
  pendingOrdersValue: string;
  criticalStock: number;
  activePOs: number;
  activePOsValue: string;
  reorderAlerts: number;
}

interface DashboardContentProps {
  kpis: DashboardKPIs;
}

export function DashboardHeader() {
  const { t } = useLanguage();

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
      <p className="text-muted-foreground">{t("dashboard.description")}</p>
    </div>
  );
}

export function DashboardKPICards({ kpis }: DashboardContentProps) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("dashboard.pendingOrders")}</p>
              <p className="text-2xl font-bold">{kpis.pendingOrders}</p>
              <p className="text-xs text-muted-foreground">{kpis.pendingOrdersValue}</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={kpis.criticalStock > 0 ? "border-red-200" : ""}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("dashboard.criticalStock")}</p>
              <p className={cn("text-2xl font-bold", kpis.criticalStock > 0 && "text-red-600")}>
                {kpis.criticalStock}
              </p>
              <p className="text-xs text-muted-foreground">{t("dashboard.itemsBelowMinimum")}</p>
            </div>
            <div className={cn(
              "h-12 w-12 rounded-lg flex items-center justify-center",
              kpis.criticalStock > 0 ? "bg-red-100" : "bg-green-100"
            )}>
              <AlertTriangle className={cn("h-6 w-6", kpis.criticalStock > 0 ? "text-red-600" : "text-green-600")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("dashboard.activePOs")}</p>
              <p className="text-2xl font-bold">{kpis.activePOs}</p>
              <p className="text-xs text-muted-foreground">{kpis.activePOsValue}</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <ClipboardList className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={kpis.reorderAlerts > 0 ? "border-amber-200" : ""}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("dashboard.reorderAlerts")}</p>
              <p className={cn("text-2xl font-bold", kpis.reorderAlerts > 0 && "text-amber-600")}>
                {kpis.reorderAlerts}
              </p>
              <p className="text-xs text-muted-foreground">{t("dashboard.itemsToReorder")}</p>
            </div>
            <div className={cn(
              "h-12 w-12 rounded-lg flex items-center justify-center",
              kpis.reorderAlerts > 0 ? "bg-amber-100" : "bg-green-100"
            )}>
              <Bell className={cn("h-6 w-6", kpis.reorderAlerts > 0 ? "text-amber-600" : "text-green-600")} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AlertsPanelHeader() {
  const { t } = useLanguage();
  return <CardTitle>{t("dashboard.alerts")}</CardTitle>;
}

export function OrderStatusChartHeader() {
  const { t } = useLanguage();
  return <CardTitle>{t("dashboard.orderStatus")}</CardTitle>;
}

export function RecentOrdersHeader() {
  const { t } = useLanguage();
  return <CardTitle>{t("dashboard.recentOrders")}</CardTitle>;
}
