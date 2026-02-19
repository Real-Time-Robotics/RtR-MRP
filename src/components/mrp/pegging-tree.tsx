"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Package,
  ShoppingCart,
  Truck,
  Factory,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";

interface SupplySource {
  supplyType: string;
  supplyId: string;
  quantity: number;
}

interface DemandPeg {
  demandType: string;
  demandId: string;
  reference: string;
  date: Date;
  quantity: number;
  peggedQty: number;
  peggedFrom: SupplySource[];
  status: "FULLY_PEGGED" | "PARTIALLY_PEGGED" | "UNPEGGED";
}

interface SupplyPeg {
  supplyType: string;
  supplyId: string;
  reference: string;
  date: Date;
  quantity: number;
  allocatedQty: number;
  availableQty: number;
}

interface PeggingTreeProps {
  partNumber: string;
  demands: DemandPeg[];
  supplies: SupplyPeg[];
  summary: {
    onHand: number;
    totalDemand: number;
    totalSupply: number;
    projected: number;
    shortages: number;
  };
}

export function PeggingTree({ partNumber, demands, supplies, summary }: PeggingTreeProps) {
  const [expandedDemands, setExpandedDemands] = useState<Set<string>>(new Set());

  const toggleDemand = (demandId: string) => {
    setExpandedDemands((prev) => {
      const next = new Set(prev);
      if (next.has(demandId)) {
        next.delete(demandId);
      } else {
        next.add(demandId);
      }
      return next;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "FULLY_PEGGED":
        return "bg-green-100 text-green-800";
      case "PARTIALLY_PEGGED":
        return "bg-yellow-100 text-yellow-800";
      case "UNPEGGED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "SALES_ORDER":
        return <ShoppingCart className="h-4 w-4" />;
      case "WORK_ORDER":
        return <Factory className="h-4 w-4" />;
      case "PURCHASE_ORDER":
        return <Truck className="h-4 w-4" />;
      case "INVENTORY":
        return <Package className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getSupplyReference = (source: SupplySource) => {
    const supply = supplies.find(
      (s) => s.supplyId === source.supplyId && s.supplyType === source.supplyType
    );
    return supply?.reference || source.supplyId;
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Pegging Summary - {partNumber}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{summary.onHand}</div>
              <div className="text-sm text-muted-foreground">On Hand</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{summary.totalSupply}</div>
              <div className="text-sm text-muted-foreground">Total Supply</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{summary.totalDemand}</div>
              <div className="text-sm text-muted-foreground">Total Demand</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${summary.projected >= 0 ? "text-green-600" : "text-red-600"}`}>
                {summary.projected}
              </div>
              <div className="text-sm text-muted-foreground">Projected</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{summary.shortages}</div>
              <div className="text-sm text-muted-foreground">Shortages</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demands Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Demands ({demands.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {demands.map((demand) => (
              <div key={demand.demandId} className="p-4">
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => toggleDemand(demand.demandId)}
                >
                  <Button variant="ghost" size="sm" className="p-0 h-6 w-6" aria-label={expandedDemands.has(demand.demandId) ? "Thu gọn" : "Mở rộng"}>
                    {expandedDemands.has(demand.demandId) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  {getTypeIcon(demand.demandType)}
                  <div className="flex-1">
                    <div className="font-medium">{demand.reference}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(demand.date), "MMM dd, yyyy")} • Qty: {demand.quantity}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {demand.peggedQty} / {demand.quantity} pegged
                    </div>
                    <Badge className={getStatusColor(demand.status)}>
                      {demand.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>

                {/* Pegging Details */}
                {expandedDemands.has(demand.demandId) && demand.peggedFrom.length > 0 && (
                  <div className="mt-3 ml-10 space-y-2">
                    {demand.peggedFrom.map((source, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded"
                      >
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        {getTypeIcon(source.supplyType)}
                        <span>{getSupplyReference(source)}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-medium">{source.quantity} units</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {demands.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No demands found for this part
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Supplies Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Supplies ({supplies.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {supplies.map((supply) => (
              <div key={supply.supplyId} className="p-4 flex items-center gap-3">
                {getTypeIcon(supply.supplyType)}
                <div className="flex-1">
                  <div className="font-medium">{supply.reference}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(supply.date), "MMM dd, yyyy")} • {supply.supplyType.replace("_", " ")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{supply.quantity} units</div>
                  <div className="text-sm">
                    <span className="text-green-600">{supply.availableQty} available</span>
                    {" • "}
                    <span className="text-orange-600">{supply.allocatedQty} allocated</span>
                  </div>
                </div>
              </div>
            ))}
            {supplies.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No supplies found for this part
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
