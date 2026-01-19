"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface AccuracyMetrics {
  mape: number;
  rmse: number;
  mae: number;
  bias: number;
}

interface AccuracyMetricsProps {
  metrics: AccuracyMetrics | null;
  trend?: "improving" | "declining" | "stable";
  showDetails?: boolean;
  compact?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getAccuracyLevel(mape: number): {
  level: "excellent" | "good" | "fair" | "poor";
  color: string;
  bgColor: string;
  icon: typeof CheckCircle2;
} {
  if (mape <= 10) {
    return {
      level: "excellent",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      icon: CheckCircle2,
    };
  } else if (mape <= 20) {
    return {
      level: "good",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      icon: Target,
    };
  } else if (mape <= 30) {
    return {
      level: "fair",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      icon: AlertTriangle,
    };
  } else {
    return {
      level: "poor",
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      icon: AlertTriangle,
    };
  }
}

function getTrendIcon(trend?: string) {
  switch (trend) {
    case "improving":
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "declining":
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="h-4 w-4 text-gray-500" />;
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AccuracyMetrics({
  metrics,
  trend,
  showDetails = true,
  compact = false,
}: AccuracyMetricsProps) {
  if (!metrics) {
    return (
      <Card className={compact ? "p-3" : ""}>
        <CardContent className={compact ? "p-0" : "pt-6"}>
          <div className="flex items-center justify-center text-muted-foreground py-4">
            <BarChart3 className="h-5 w-5 mr-2" />
            <span>No accuracy data available</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const accuracy = 100 - metrics.mape;
  const { level, color, bgColor, icon: LevelIcon } = getAccuracyLevel(metrics.mape);

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Target className={`h-4 w-4 ${color}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{accuracy.toFixed(1)}%</span>
            {getTrendIcon(trend)}
          </div>
          <span className="text-xs text-muted-foreground capitalize">{level} accuracy</span>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Forecast Accuracy
          </span>
          <Badge variant="outline" className={`${bgColor} ${color} border-0`}>
            <LevelIcon className="h-3 w-3 mr-1" />
            {level}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main accuracy score */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">{accuracy.toFixed(1)}%</span>
                {getTrendIcon(trend)}
              </div>
              <span className="text-sm text-muted-foreground">Overall Accuracy</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <Progress value={accuracy} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Poor</span>
              <span>Excellent</span>
            </div>
          </div>

          {/* Detailed metrics */}
          {showDetails && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">MAPE</span>
                <p className="font-medium">{metrics.mape.toFixed(2)}%</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">RMSE</span>
                <p className="font-medium">{metrics.rmse.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">MAE</span>
                <p className="font-medium">{metrics.mae.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Bias</span>
                <p className={`font-medium ${metrics.bias > 0 ? "text-amber-600" : metrics.bias < 0 ? "text-blue-600" : ""}`}>
                  {metrics.bias > 0 ? "+" : ""}{metrics.bias.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Interpretation */}
          <div className={`p-3 rounded-lg ${bgColor}`}>
            <p className="text-sm">
              {level === "excellent" && "Forecasts are highly accurate. Trust these predictions for planning."}
              {level === "good" && "Forecasts are reliable. Minor adjustments may be needed."}
              {level === "fair" && "Forecasts need improvement. Consider adjusting safety stock."}
              {level === "poor" && "Forecasts are unreliable. Review data quality and model selection."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// COMPACT ACCURACY BADGE
// =============================================================================

export function AccuracyBadge({ mape, size = "default" }: { mape: number; size?: "sm" | "default" }) {
  const accuracy = 100 - mape;
  const { level, color, bgColor } = getAccuracyLevel(mape);

  if (size === "sm") {
    return (
      <Badge variant="outline" className={`${bgColor} ${color} border-0 text-xs`}>
        {accuracy.toFixed(0)}%
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={`${bgColor} ${color} border-0`}>
      <Target className="h-3 w-3 mr-1" />
      {accuracy.toFixed(1)}% accuracy
    </Badge>
  );
}
