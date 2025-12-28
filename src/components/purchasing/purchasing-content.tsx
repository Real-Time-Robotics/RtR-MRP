"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export function PurchasingHeader() {
  const { t } = useLanguage();
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("purchasing.title")}</h1>
      <p className="text-muted-foreground">{t("purchasing.description")}</p>
    </div>
  );
}

export function PurchasingNewButton() {
  const { t } = useLanguage();
  return t("purchasing.newPO");
}

export function PurchasingTableHeader() {
  const { t } = useLanguage();
  return (
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5" />
        {t("purchasing.title")}
      </CardTitle>
    </CardHeader>
  );
}

export function PurchasingNoData() {
  const { t } = useLanguage();
  return <p className="text-muted-foreground">{t("purchasing.noPOs")}</p>;
}

interface PurchasingStatsProps {
  total: number;
  totalValue: string;
  pending: number;
  received: number;
}

export function PurchasingStatsCards({ stats }: { stats: PurchasingStatsProps }) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t("purchasing.title")}</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t("purchasing.total")}</p>
          <p className="text-2xl font-bold">{stats.totalValue}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t("status.pending")}</p>
          <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t("status.completed")}</p>
          <p className="text-2xl font-bold text-green-600">{stats.received}</p>
        </CardContent>
      </Card>
    </div>
  );
}
