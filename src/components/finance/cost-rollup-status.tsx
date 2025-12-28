"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface RollupStatusProps {
  totalParts: number;
  rolledUpParts: number;
  staleParts: number;
  lastRollupAt?: string;
  isRunning?: boolean;
  onRunRollup: () => void;
}

export function CostRollupStatus({
  totalParts,
  rolledUpParts,
  staleParts,
  lastRollupAt,
  isRunning = false,
  onRunRollup,
}: RollupStatusProps) {
  const progress = totalParts > 0 ? (rolledUpParts / totalParts) * 100 : 0;
  const hasStaleData = staleParts > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Cost Rollup Status</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onRunRollup}
          disabled={isRunning}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? "animate-spin" : ""}`} />
          {isRunning ? "Running..." : "Run Rollup"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Parts with Cost Data</span>
            <span className="font-medium">
              {rolledUpParts} / {totalParts}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <div>
              <div className="text-sm font-medium">{rolledUpParts - staleParts}</div>
              <div className="text-xs text-muted-foreground">Current</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${hasStaleData ? "text-yellow-500" : "text-muted-foreground"}`} />
            <div>
              <div className="text-sm font-medium">{staleParts}</div>
              <div className="text-xs text-muted-foreground">Stale</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{totalParts - rolledUpParts}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </div>
        </div>

        {lastRollupAt && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Last rollup: {new Date(lastRollupAt).toLocaleString()}
          </div>
        )}

        {hasStaleData && (
          <Badge variant="outline" className="text-yellow-600 border-yellow-300">
            {staleParts} parts need cost recalculation
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
