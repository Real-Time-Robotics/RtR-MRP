"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

export function BOMHeader() {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("bom.title")}</h1>
        <p className="text-muted-foreground">{t("bom.description")}</p>
      </div>
    </div>
  );
}

export function BOMTableHeader() {
  const { t } = useLanguage();
  return (
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Package className="h-5 w-5" />
        {t("bom.products")}
      </CardTitle>
    </CardHeader>
  );
}

export function BOMTableHeaders() {
  const { t } = useLanguage();
  return (
    <>
      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t("bom.sku")}</th>
      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t("bom.productName")}</th>
      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">{t("bom.bomVersion")}</th>
      <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">{t("bom.parts")}</th>
      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">{t("bom.basePrice")}</th>
      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">{t("bom.actions")}</th>
    </>
  );
}

export function BOMNoProducts() {
  const { t } = useLanguage();
  return <p className="text-muted-foreground">{t("bom.noProducts")}</p>;
}

export function BOMNoBom() {
  const { t } = useLanguage();
  return t("bom.noBom");
}

export function BOMView() {
  const { t } = useLanguage();
  return t("bom.view");
}

export function BOMExplode() {
  const { t } = useLanguage();
  return t("bom.explode");
}
