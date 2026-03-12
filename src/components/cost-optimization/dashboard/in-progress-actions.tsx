"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Factory,
  ArrowRightLeft,
  Handshake,
  Wrench,
  Pencil,
  MapPin,
  PlayCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface InProgressAction {
  id: string;
  description: string;
  type: string;
  progressPercent: number;
  expectedSavings: number;
  partNumber?: string;
}

interface InProgressActionsProps {
  actions: InProgressAction[];
}

const TYPE_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string }
> = {
  MAKE_VS_BUY: { icon: Factory, color: "text-blue-600" },
  SUBSTITUTE: { icon: ArrowRightLeft, color: "text-green-600" },
  SUPPLIER_OPTIMIZE: { icon: Handshake, color: "text-purple-600" },
  PROCESS_IMPROVE: { icon: Wrench, color: "text-orange-600" },
  DESIGN_CHANGE: { icon: Pencil, color: "text-pink-600" },
  LOCALIZE: { icon: MapPin, color: "text-teal-600" },
};

export function InProgressActions({ actions }: InProgressActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <PlayCircle className="w-5 h-5 text-orange-500" />
          In Progress ({actions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Khong co action nao dang thuc hien
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((action) => {
              const typeConfig =
                TYPE_CONFIG[action.type] || TYPE_CONFIG.PROCESS_IMPROVE;
              const TypeIcon = typeConfig.icon;
              const weightedSavings =
                action.expectedSavings * (action.progressPercent / 100);

              return (
                <div
                  key={action.id}
                  className="flex items-center gap-4 p-3 rounded-lg border"
                >
                  <TypeIcon className={cn("w-5 h-5 flex-shrink-0", typeConfig.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {action.description}
                    </div>
                    {action.partNumber && (
                      <div className="text-xs text-muted-foreground font-mono">
                        {action.partNumber}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Progress
                        value={action.progressPercent}
                        className="h-1.5 flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-8">
                        {action.progressPercent}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-medium text-green-600">
                      {formatCurrency(action.expectedSavings)}/yr
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ~{formatCurrency(weightedSavings)} realized
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
