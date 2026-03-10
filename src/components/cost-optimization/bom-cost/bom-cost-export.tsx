"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BomCostItem } from "@/hooks/cost-optimization/use-bom-cost";

interface BomCostExportProps {
  productName: string;
  productSku: string;
  bomVersion: string;
  items: BomCostItem[];
  totalCost: number;
}

export function BomCostExport({
  productName,
  productSku,
  bomVersion,
  items,
  totalCost,
}: BomCostExportProps) {
  const handleExport = () => {
    const headers = [
      "#",
      "Part Number",
      "Name",
      "Category",
      "Quantity",
      "Unit",
      "Unit Cost",
      "Total Cost",
      "% of Total",
      "Make/Buy",
      "NDAA",
      "Module",
      "Critical",
    ];

    const rows = items.map((item, idx) => [
      idx + 1,
      item.partNumber,
      `"${item.name.replace(/"/g, '""')}"`,
      item.category || "",
      item.quantity,
      item.unit,
      item.unitCost.toFixed(2),
      item.totalCost.toFixed(2),
      item.costPercent.toFixed(1) + "%",
      item.makeOrBuy,
      item.ndaaCompliant ? "Yes" : "No",
      item.moduleCode || "",
      item.isCritical ? "Yes" : "No",
    ]);

    // Add total row
    rows.push([
      "",
      "",
      `"TOTAL — ${productName}"`,
      "",
      "",
      "",
      "",
      totalCost.toFixed(2),
      "100%",
      "",
      "",
      "",
      "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `BOM-Cost-${productSku}-${bomVersion}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={items.length === 0}>
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
}
