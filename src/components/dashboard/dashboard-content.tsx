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
      {/* Pending Orders - Industrial Precision Style */}
      <div className="bg-white dark:bg-gunmetal border border-gray-200 dark:border-mrp-border p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground dark:text-mrp-text-secondary">
              {t("dashboard.pendingOrders")}
            </p>
            <p className="text-2xl font-semibold font-mono tabular-nums text-foreground dark:text-mrp-text-primary">
              {kpis.pendingOrders}
            </p>
            <p className="text-xs font-mono text-muted-foreground dark:text-mrp-text-muted">
              {kpis.pendingOrdersValue}
            </p>
          </div>
          <div className="h-10 w-10 flex items-center justify-center bg-info-cyan/20 dark:bg-info-cyan-dim">
            <Package className="h-5 w-5 text-info-cyan" />
          </div>
        </div>
      </div>

      {/* Critical Stock - Industrial Precision Style */}
      <div className={cn(
        "bg-white dark:bg-gunmetal border p-5",
        kpis.criticalStock > 0
          ? "border-urgent-red/50 dark:border-urgent-red/30"
          : "border-gray-200 dark:border-mrp-border"
      )}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground dark:text-mrp-text-secondary">
              {t("dashboard.criticalStock")}
            </p>
            <p className={cn(
              "text-2xl font-semibold font-mono tabular-nums",
              kpis.criticalStock > 0
                ? "text-urgent-red"
                : "text-foreground dark:text-mrp-text-primary"
            )}>
              {kpis.criticalStock}
            </p>
            <p className="text-xs font-mono text-muted-foreground dark:text-mrp-text-muted">
              {t("dashboard.itemsBelowMinimum")}
            </p>
          </div>
          <div className={cn(
            "h-10 w-10 flex items-center justify-center",
            kpis.criticalStock > 0
              ? "bg-urgent-red-dim"
              : "bg-production-green-dim"
          )}>
            <AlertTriangle className={cn(
              "h-5 w-5",
              kpis.criticalStock > 0 ? "text-urgent-red" : "text-production-green"
            )} />
          </div>
        </div>
      </div>

      {/* Active POs - Industrial Precision Style */}
      <div className="bg-white dark:bg-gunmetal border border-gray-200 dark:border-mrp-border p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground dark:text-mrp-text-secondary">
              {t("dashboard.activePOs")}
            </p>
            <p className="text-2xl font-semibold font-mono tabular-nums text-foreground dark:text-mrp-text-primary">
              {kpis.activePOs}
            </p>
            <p className="text-xs font-mono text-muted-foreground dark:text-mrp-text-muted">
              {kpis.activePOsValue}
            </p>
          </div>
          <div className="h-10 w-10 flex items-center justify-center bg-info-cyan/20 dark:bg-info-cyan-dim">
            <ClipboardList className="h-5 w-5 text-info-cyan" />
          </div>
        </div>
      </div>

      {/* Reorder Alerts - Industrial Precision Style */}
      <div className={cn(
        "bg-white dark:bg-gunmetal border p-5",
        kpis.reorderAlerts > 0
          ? "border-alert-amber/50 dark:border-alert-amber/30"
          : "border-gray-200 dark:border-mrp-border"
      )}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground dark:text-mrp-text-secondary">
              {t("dashboard.reorderAlerts")}
            </p>
            <p className={cn(
              "text-2xl font-semibold font-mono tabular-nums",
              kpis.reorderAlerts > 0
                ? "text-alert-amber"
                : "text-foreground dark:text-mrp-text-primary"
            )}>
              {kpis.reorderAlerts}
            </p>
            <p className="text-xs font-mono text-muted-foreground dark:text-mrp-text-muted">
              {t("dashboard.itemsToReorder")}
            </p>
          </div>
          <div className={cn(
            "h-10 w-10 flex items-center justify-center",
            kpis.reorderAlerts > 0
              ? "bg-alert-amber-dim"
              : "bg-production-green-dim"
          )}>
            <Bell className={cn(
              "h-5 w-5",
              kpis.reorderAlerts > 0 ? "text-alert-amber" : "text-production-green"
            )} />
          </div>
        </div>
      </div>
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
