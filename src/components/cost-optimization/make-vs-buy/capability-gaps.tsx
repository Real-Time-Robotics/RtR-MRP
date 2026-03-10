"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Wrench } from "lucide-react";

interface CapabilityGap {
  area: string;
  current: number;
  required: number;
  gap: number;
  action: string;
}

interface CapabilityGapsProps {
  gaps: CapabilityGap[];
}

export function CapabilityGaps({ gaps }: CapabilityGapsProps) {
  if (!gaps || gaps.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Capability Gaps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Khong co gap nang luc nao
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wrench className="w-4 h-4" />
          Capability Gaps
          <Badge variant="secondary" className="ml-auto">
            {gaps.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {gaps.map((gap, i) => {
            const severity =
              gap.gap > 5 ? "high" : gap.gap > 2 ? "medium" : "low";
            const colors = {
              high: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
              medium: "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30",
              low: "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30",
            };

            return (
              <div
                key={i}
                className={`p-3 rounded-lg border ${colors[severity]}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle
                      className={`w-3.5 h-3.5 ${
                        severity === "high"
                          ? "text-red-500"
                          : severity === "medium"
                          ? "text-yellow-500"
                          : "text-green-500"
                      }`}
                    />
                    <span className="text-sm font-medium">{gap.area}</span>
                  </div>
                  <Badge
                    variant={
                      severity === "high"
                        ? "destructive"
                        : severity === "medium"
                        ? "outline"
                        : "secondary"
                    }
                  >
                    Gap: {gap.gap}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-1">
                  <span>Hien tai: {gap.current}/10</span>
                  <span>Yeu cau: {gap.required}/10</span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(gap.current / gap.required) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{gap.action}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
