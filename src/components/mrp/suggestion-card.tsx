"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ShoppingCart } from "lucide-react";
import { format } from "date-fns";

interface SuggestionProps {
  suggestion: {
    id: string;
    partNumber: string;
    partName: string;
    actionType: string;
    priority: string;
    suggestedQty?: number | null;
    suggestedDate?: Date | string | null;
    reason: string | null;
    supplierName?: string | null;
    estimatedCost?: number | null;
    status: string;
  };
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCreatePO: (id: string) => void;
}

const priorityColors: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  LOW: "bg-green-100 text-green-800",
};

export function SuggestionCard({
  suggestion,
  onApprove,
  onReject,
  onCreatePO,
}: SuggestionProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={priorityColors[suggestion.priority] || priorityColors.MEDIUM}>
              {suggestion.priority}
            </Badge>
            <span className="text-lg font-medium">{suggestion.actionType}</span>
          </div>

          <h3 className="font-semibold">{suggestion.partNumber}</h3>
          <p className="text-sm text-muted-foreground">{suggestion.partName}</p>

          <p className="text-sm mt-2">{suggestion.reason}</p>

          {suggestion.suggestedQty && (
            <div className="mt-2 text-sm">
              <span className="font-medium">Qty: {suggestion.suggestedQty}</span>
              {suggestion.suggestedDate && (
                <span className="ml-4">
                  Order by:{" "}
                  {format(new Date(suggestion.suggestedDate), "MMM dd")}
                </span>
              )}
              {suggestion.estimatedCost && (
                <span className="ml-4">
                  Est. Cost: ${suggestion.estimatedCost.toLocaleString()}
                </span>
              )}
            </div>
          )}

          {suggestion.supplierName && (
            <p className="text-sm text-muted-foreground mt-1">
              Suggested supplier: {suggestion.supplierName}
            </p>
          )}
        </div>

        {suggestion.status === "pending" && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(suggestion.id)}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={() => onApprove(suggestion.id)}>
              <Check className="h-4 w-4 mr-1" /> Approve
            </Button>
            {suggestion.actionType === "PURCHASE" && (
              <Button
                size="sm"
                variant="default"
                onClick={() => onCreatePO(suggestion.id)}
              >
                <ShoppingCart className="h-4 w-4 mr-1" /> Create PO
              </Button>
            )}
          </div>
        )}

        {suggestion.status !== "pending" && (
          <Badge
            variant={suggestion.status === "approved" ? "default" : "secondary"}
          >
            {suggestion.status}
          </Badge>
        )}
      </div>
    </Card>
  );
}
