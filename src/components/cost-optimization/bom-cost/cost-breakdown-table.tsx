"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MakeBuyBadge } from "@/components/cost-optimization/shared/make-buy-badge";
import { NdaaBadge } from "@/components/cost-optimization/shared/ndaa-badge";
import { formatCurrency } from "@/lib/currency";
import type { BomCostItem } from "@/hooks/cost-optimization/use-bom-cost";

interface CostBreakdownTableProps {
  items: BomCostItem[];
}

type SortField = "totalCost" | "partNumber" | "quantity" | "unitCost" | "costPercent";
type SortDir = "asc" | "desc";

export function CostBreakdownTable({ items }: CostBreakdownTableProps) {
  const [search, setSearch] = useState("");
  const [filterMakeOrBuy, setFilterMakeOrBuy] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("totalCost");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    let result = items;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.partNumber.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q)
      );
    }

    if (filterMakeOrBuy !== "all") {
      result = result.filter((item) => item.makeOrBuy === filterMakeOrBuy);
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === "partNumber") {
        cmp = a.partNumber.localeCompare(b.partNumber);
      } else {
        cmp = (a[sortField] as number) - (b[sortField] as number);
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [items, search, filterMakeOrBuy, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {children}
      <ArrowUpDown className={`h-3 w-3 ${sortField === field ? "text-primary" : "text-muted-foreground/50"}`} />
    </button>
  );

  return (
    <Card>
      <CardHeader className="pb-2 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-sm font-medium">Chi tiet linh kien</CardTitle>
          <div className="flex-1" />
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Tim kiem..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select value={filterMakeOrBuy} onValueChange={setFilterMakeOrBuy}>
            <SelectTrigger className="h-8 w-auto min-w-[80px] text-xs gap-1 px-2.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tat ca</SelectItem>
              <SelectItem value="MAKE">Make</SelectItem>
              <SelectItem value="BUY">Buy</SelectItem>
              <SelectItem value="BOTH">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">
                  <SortHeader field="partNumber">Part #</SortHeader>
                </th>
                <th className="px-3 py-2 text-left font-medium">Ten</th>
                <th className="px-3 py-2 text-right font-medium">
                  <SortHeader field="quantity">SL</SortHeader>
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  <SortHeader field="unitCost">Don gia</SortHeader>
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  <SortHeader field="totalCost">Thanh tien</SortHeader>
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  <SortHeader field="costPercent">%</SortHeader>
                </th>
                <th className="px-3 py-2 text-center font-medium">Make/Buy</th>
                <th className="px-3 py-2 text-center font-medium">NDAA</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                    Khong tim thay linh kien
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={item.partId} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/parts/${item.partId}`}
                          className="font-mono text-primary hover:underline"
                        >
                          {item.partNumber}
                        </Link>
                        {item.isCritical && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0">
                            Critical
                          </Badge>
                        )}
                        {item.hasSubBom && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            Sub-BOM
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 max-w-[200px] truncate">{item.name}</td>
                    <td className="px-3 py-2 text-right">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatCurrency(item.unitCost)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-medium">
                      {formatCurrency(item.totalCost)}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {item.costPercent.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-center">
                      <MakeBuyBadge type={item.makeOrBuy} size="sm" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <NdaaBadge compliant={item.ndaaCompliant} size="sm" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {filtered.length} / {items.length} items
        </div>
      </CardContent>
    </Card>
  );
}
