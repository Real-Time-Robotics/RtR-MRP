"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/language-context";
import {
  Package,
  AlertTriangle,
  ClipboardList,
  Bell,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Target,
  Activity,
  ShieldCheck,
  Truck,
  ExternalLink,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type IconName =
  | "package"
  | "alert-triangle"
  | "clipboard-list"
  | "bell"
  | "trending-up"
  | "trending-down"
  | "dollar-sign"
  | "bar-chart"
  | "target"
  | "activity"
  | "shield-check"
  | "truck";

interface SparklineData {
  date: string;
  value: number;
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  iconName: IconName;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "danger";
  // Enhanced props
  sparklineData?: SparklineData[];
  target?: number;
  targetLabel?: string;
  onClick?: () => void;
  showDrillDown?: boolean;
  loading?: boolean;
  refreshing?: boolean;
}

const variantStyles = {
  default: "bg-primary/20 text-primary",
  success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const iconMap = {
  "package": Package,
  "alert-triangle": AlertTriangle,
  "clipboard-list": ClipboardList,
  "bell": Bell,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "dollar-sign": DollarSign,
  "bar-chart": BarChart3,
  "target": Target,
  "activity": Activity,
  "shield-check": ShieldCheck,
  "truck": Truck,
};

export function KPICard({
  title,
  value,
  subtitle,
  iconName,
  trend,
  variant = "default",
  sparklineData,
  target,
  targetLabel,
  onClick,
  showDrillDown = false,
  loading = false,
  refreshing = false,
}: KPICardProps) {
  const { t } = useLanguage();
  const Icon = iconMap[iconName] || Activity;

  // Calculate target progress
  const targetProgress =
    target && typeof value === "number"
      ? Math.min((value / target) * 100, 100)
      : null;

  // Sparkline color based on trend
  const sparklineColor =
    variant === "success"
      ? "#10B981"
      : variant === "danger"
      ? "#EF4444"
      : variant === "warning"
      ? "#F59E0B"
      : "#6366F1";

  const isClickable = onClick || showDrillDown;

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        isClickable && "cursor-pointer hover:shadow-md hover:scale-[1.02]",
        loading && "animate-pulse"
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {showDrillDown && (
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <p
                className={cn(
                  "text-2xl font-bold",
                  variant === "danger" && "text-red-600",
                  variant === "warning" && "text-amber-600",
                  variant === "success" && "text-green-600"
                )}
              >
                {loading ? "—" : value}
              </p>
              {trend && !loading && (
                <span
                  className={cn(
                    "text-xs font-medium flex items-center gap-0.5",
                    trend.isPositive ? "text-green-600" : "text-red-600"
                  )}
                >
                  {trend.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {trend.isPositive ? "+" : ""}
                  {trend.value}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}

            {/* Target progress bar */}
            {targetProgress !== null && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {targetLabel || t("kpi.target", { target: String(target) })}
                  </span>
                  <span>{targetProgress.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      targetProgress >= 100
                        ? "bg-green-500"
                        : targetProgress >= 75
                        ? "bg-primary"
                        : targetProgress >= 50
                        ? "bg-amber-500"
                        : "bg-red-500"
                    )}
                    style={{ width: `${targetProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Sparkline chart */}
            {sparklineData && sparklineData.length > 1 && !loading && (
              <div className="h-10 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={sparklineColor}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-popover border rounded-md px-2 py-1 text-xs shadow-md">
                              <p className="font-medium">
                                {typeof payload[0].value === "number"
                                  ? payload[0].value.toLocaleString("vi-VN")
                                  : payload[0].value}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div
            className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center shrink-0 ml-4",
              variantStyles[variant],
              refreshing && "animate-pulse"
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced KPI Card with auto-refresh
export interface EnhancedKPICardProps extends Omit<KPICardProps, "value" | "trend" | "sparklineData"> {
  metric: string;
  refreshInterval?: number; // in seconds
}

export function EnhancedKPICard({
  metric,
  refreshInterval,
  ...props
}: EnhancedKPICardProps) {
  // This would be implemented with a hook that fetches KPI data
  // For now, it's a placeholder showing the pattern
  return (
    <KPICard
      {...props}
      value="—"
      loading={true}
    />
  );
}
