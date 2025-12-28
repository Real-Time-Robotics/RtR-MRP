"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck } from "lucide-react";

interface SuppliersStats {
  total: number;
  ndaaCompliant: number;
  avgLeadTime: number;
}

export function SuppliersHeader() {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("suppliers.title")}</h1>
        <p className="text-muted-foreground">{t("suppliers.description")}</p>
      </div>
    </div>
  );
}

export function SuppliersStatsCards({ stats }: { stats: SuppliersStats }) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t("suppliers.totalSuppliers")}</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t("suppliers.ndaaCompliant")}</p>
          <p className="text-2xl font-bold text-green-600">{stats.ndaaCompliant}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t("suppliers.avgLeadTime")}</p>
          <p className="text-2xl font-bold">{stats.avgLeadTime} {t("suppliers.days")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function SuppliersTableHeader() {
  const { t } = useLanguage();
  return (
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Truck className="h-5 w-5" />
        {t("suppliers.title")}
      </CardTitle>
    </CardHeader>
  );
}

export function SuppliersTableHeaders() {
  const { t } = useLanguage();
  return (
    <tr className="border-b transition-colors hover:bg-muted/50">
      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t("suppliers.code")}</th>
      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t("suppliers.name")}</th>
      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t("suppliers.country")}</th>
      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t("suppliers.category")}</th>
      <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">{t("suppliers.leadTime")}</th>
      <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">{t("suppliers.rating")}</th>
      <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">{t("suppliers.ndaa")}</th>
    </tr>
  );
}

export function SuppliersNoData() {
  const { t } = useLanguage();
  return <p className="text-muted-foreground">{t("suppliers.noSuppliers")}</p>;
}

export function SuppliersDays() {
  const { t } = useLanguage();
  return t("suppliers.days");
}
