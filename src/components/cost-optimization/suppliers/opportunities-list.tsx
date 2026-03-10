"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package, ArrowRightLeft, Handshake, MapPin,
  ChevronRight, Lightbulb,
} from "lucide-react";
import { SupplierOpportunity } from "@/hooks/cost-optimization/use-supplier-opportunities";

interface OpportunitiesListProps {
  opportunities: SupplierOpportunity[];
  totalSavings: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 0,
  }).format(value);
}

const TYPE_CONFIG: Record<string, { icon: typeof Package; color: string; bg: string; label: string }> = {
  CONSOLIDATE: { icon: Package, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", label: "Consolidate" },
  SWITCH_SUPPLIER: { icon: ArrowRightLeft, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30", label: "Switch NCC" },
  NEGOTIATE: { icon: Handshake, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30", label: "Negotiate" },
  LOCAL_SOURCE: { icon: MapPin, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30", label: "Local Source" },
};

const EFFORT_BADGE: Record<string, string> = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-red-100 text-red-700",
};

export function OpportunitiesList({
  opportunities,
  totalSavings,
}: OpportunitiesListProps) {
  const [filter, setFilter] = useState("all");

  const filtered =
    filter === "all"
      ? opportunities
      : opportunities.filter((o) => o.type === filter);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white dark:bg-gray-800 rounded-full">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Tiet kiem tiem nang</div>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(totalSavings)}/nam
            </div>
          </div>
        </div>
        <Badge variant="secondary">{opportunities.length} co hoi</Badge>
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">
            Tat ca ({opportunities.length})
          </TabsTrigger>
          <TabsTrigger value="CONSOLIDATE">
            Consolidate ({opportunities.filter((o) => o.type === "CONSOLIDATE").length})
          </TabsTrigger>
          <TabsTrigger value="SWITCH_SUPPLIER">
            Switch ({opportunities.filter((o) => o.type === "SWITCH_SUPPLIER").length})
          </TabsTrigger>
          <TabsTrigger value="NEGOTIATE">
            Negotiate ({opportunities.filter((o) => o.type === "NEGOTIATE").length})
          </TabsTrigger>
          <TabsTrigger value="LOCAL_SOURCE">
            Local ({opportunities.filter((o) => o.type === "LOCAL_SOURCE").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* List */}
      <div className="space-y-3">
        {filtered.map((opportunity) => {
          const config = TYPE_CONFIG[opportunity.type] || TYPE_CONFIG.CONSOLIDATE;
          const Icon = config.icon;

          return (
            <Card key={opportunity.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg shrink-0 ${config.bg}`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-sm">{opportunity.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {opportunity.description}
                        </p>

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {opportunity.affectedParts.slice(0, 3).map((p) => (
                            <Badge key={p.partId} variant="outline" className="text-xs">
                              {p.partNumber}
                            </Badge>
                          ))}
                          {opportunity.affectedParts.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{opportunity.affectedParts.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(opportunity.potentialSavings)}
                        </div>
                        <div className="text-xs text-muted-foreground">/nam</div>
                        <Badge className={`mt-1 ${EFFORT_BADGE[opportunity.effort] || ""}`}>
                          {opportunity.effort === "LOW" ? "De" : opportunity.effort === "MEDIUM" ? "TB" : "Kho"}
                        </Badge>
                      </div>
                    </div>

                    {/* Action steps (collapsed) */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{config.label}</Badge>
                        {opportunity.supplierName && (
                          <span className="text-xs text-muted-foreground">
                            {opportunity.supplierName}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Khong tim thay co hoi toi uu
        </div>
      )}
    </div>
  );
}
