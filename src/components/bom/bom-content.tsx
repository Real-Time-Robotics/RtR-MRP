"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Plus } from "lucide-react";
import Link from "next/link";

export function BOMHeader() {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-between">
      <div>
        {/* COMPACT: text-2xl → text-base, font-mono uppercase */}
        <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary">{t("bom.title")}</h1>
        <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">{t("bom.description")}</p>
      </div>
      <Link href="/bom/new">
        {/* COMPACT: smaller button */}
        <Button size="sm" className="text-xs">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Create BOM
        </Button>
      </Link>
    </div>
  );
}

export function BOMTableHeader() {
  const { t } = useLanguage();
  return (
    // COMPACT: px-3 py-2, smaller text and icon
    <CardHeader className="px-3 py-2 border-b border-gray-200 dark:border-mrp-border">
      <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
        <Package className="h-3.5 w-3.5" />
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
