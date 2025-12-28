"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Package,
  Check,
  X,
  Users,
} from "lucide-react";

interface AiInsightCardProps {
  recommendation: {
    id: string;
    type: string;
    priority: string;
    title: string;
    description: string;
    impact?: string;
    savingsEstimate?: number;
    confidence: number;
    status: string;
  };
  onImplement?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  REORDER: ShoppingCart,
  SUPPLIER_CHANGE: AlertTriangle,
  SAFETY_STOCK: Package,
  EXPEDITE: TrendingUp,
  CONSOLIDATE: Users,
};

const priorityColors: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800 border-red-200",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-200",
  LOW: "bg-green-100 text-green-800 border-green-200",
};

export function AiInsightCard({
  recommendation,
  onImplement,
  onDismiss,
}: AiInsightCardProps) {
  const Icon = typeIcons[recommendation.type] || Package;

  return (
    <Card
      className={`p-4 border-l-4 ${priorityColors[recommendation.priority] || priorityColors.MEDIUM}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className={priorityColors[recommendation.priority]}
            >
              {recommendation.priority}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {Math.round(recommendation.confidence * 100)}% confidence
            </span>
          </div>

          <h4 className="font-semibold">{recommendation.title}</h4>
          <p className="text-sm text-muted-foreground mt-1">
            {recommendation.description}
          </p>

          {recommendation.impact && (
            <p className="text-sm mt-2">
              <span className="font-medium">Impact:</span> {recommendation.impact}
            </p>
          )}

          {recommendation.savingsEstimate &&
            recommendation.savingsEstimate > 0 && (
              <p className="text-sm text-green-600 mt-1">
                Potential savings: $
                {recommendation.savingsEstimate.toLocaleString()}
              </p>
            )}
        </div>

        {recommendation.status === "active" && (
          <div className="flex gap-2">
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDismiss(recommendation.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {onImplement && (
              <Button size="sm" onClick={() => onImplement(recommendation.id)}>
                <Check className="h-4 w-4 mr-1" />
                Implement
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
