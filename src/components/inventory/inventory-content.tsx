"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";

interface InventoryStats {
  total: number;
  critical: number;
  reorder: number;
  ok: number;
}

export function InventoryHeader() {
  const { t } = useLanguage();
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("inventory.title")}</h1>
      <p className="text-muted-foreground">{t("inventory.description")}</p>
    </div>
  );
}

export function InventoryStatsCards({ stats }: { stats: InventoryStats }) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t("inventory.totalParts")}</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </CardContent>
      </Card>
      <Card className={stats.critical > 0 ? "border-red-200" : ""}>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t("inventory.critical")}</p>
          <p className={cn("text-2xl font-bold", stats.critical > 0 && "text-red-600")}>
            {stats.critical}
          </p>
        </CardContent>
      </Card>
      <Card className={stats.reorder > 0 ? "border-amber-200" : ""}>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t("inventory.reorderNeeded")}</p>
          <p className={cn("text-2xl font-bold", stats.reorder > 0 && "text-amber-600")}>
            {stats.reorder}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t("inventory.okStatus")}</p>
          <p className="text-2xl font-bold text-green-600">{stats.ok}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function InventoryTableHeader() {
  const { t } = useLanguage();
  return (
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Warehouse className="h-5 w-5" />
        {t("inventory.partsInventory")}
      </CardTitle>
    </CardHeader>
  );
}

export function InventoryTableHeaders() {
  const { t } = useLanguage();
  return (
    <tr className="border-b transition-colors hover:bg-muted/50">
      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t("inventory.partNumber")}</th>
      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t("inventory.name")}</th>
      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t("inventory.category")}</th>
      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">{t("inventory.qty")}</th>
      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">{t("inventory.reserved")}</th>
      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">{t("inventory.available")}</th>
      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">{t("inventory.unitCost")}</th>
      <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">{t("inventory.status")}</th>
    </tr>
  );
}

export function InventoryNoData() {
  const { t } = useLanguage();
  return <p className="text-muted-foreground">{t("inventory.noInventory")}</p>;
}

export function InventoryAlertButton({ count }: { count: number }) {
  const { t } = useLanguage();
  return (
    <>
      {count} {t("inventory.alerts")}
    </>
  );
}
