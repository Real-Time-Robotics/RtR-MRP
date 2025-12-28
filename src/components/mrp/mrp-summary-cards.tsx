"use client";

import { Card } from "@/components/ui/card";
import { Package, ShoppingCart, AlertTriangle, Clock } from "lucide-react";

interface MrpSummaryProps {
  totalParts: number;
  purchaseSuggestions: number;
  expediteAlerts: number;
  deferSuggestions: number;
}

export function MrpSummaryCards({
  totalParts,
  purchaseSuggestions,
  expediteAlerts,
  deferSuggestions,
}: MrpSummaryProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Package className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalParts}</p>
            <p className="text-sm text-muted-foreground">Parts Analyzed</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <ShoppingCart className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{purchaseSuggestions}</p>
            <p className="text-sm text-muted-foreground">Purchase Needed</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{expediteAlerts}</p>
            <p className="text-sm text-muted-foreground">Expedite Alerts</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Clock className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{deferSuggestions}</p>
            <p className="text-sm text-muted-foreground">Defer Suggested</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
