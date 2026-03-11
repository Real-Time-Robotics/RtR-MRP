"use client";

import React, { useState, useEffect } from "react";
import { CompactStatsBar } from "@/components/ui/compact-stats-bar";
import {
  Search,
  RefreshCw,
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  AlertTriangle,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { KPIDefinition, KPIValue, KPICategory } from "@/lib/analytics/types";
import { clientLogger } from '@/lib/client-logger';

const CATEGORY_LABELS: Record<KPICategory, string> = {
  inventory: "Tồn kho",
  sales: "Bán hàng",
  production: "Sản xuất",
  quality: "Chất lượng",
  financial: "Tài chính",
  supplier: "Nhà cung cấp",
};

export default function KPIsPage() {
  const [definitions, setDefinitions] = useState<KPIDefinition[]>([]);
  const [values, setValues] = useState<Record<string, KPIValue>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch KPI definitions and values
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch definitions
        const defResponse = await fetch("/api/analytics/kpis");
        const defData = await defResponse.json();

        if (defData.success) {
          setDefinitions(defData.data);

          // Fetch values for all KPIs
          const codes = defData.data.map((d: KPIDefinition) => d.code);
          const valResponse = await fetch("/api/analytics/kpis/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              codes,
              params: { includeTrend: true, trendPeriods: 6 },
            }),
          });
          const valData = await valResponse.json();

          if (valData.success) {
            const valueMap: Record<string, KPIValue> = {};
            valData.data.forEach((v: KPIValue) => {
              valueMap[v.code] = v;
            });
            setValues(valueMap);
          }
        }
      } catch (error) {
        clientLogger.error("Error fetching KPIs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Refresh values
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const codes = definitions.map((d) => d.code);
      const response = await fetch("/api/analytics/kpis/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codes,
          params: { includeTrend: true, trendPeriods: 6 },
        }),
      });
      const data = await response.json();

      if (data.success) {
        const valueMap: Record<string, KPIValue> = {};
        data.data.forEach((v: KPIValue) => {
          valueMap[v.code] = v;
        });
        setValues(valueMap);
      }
    } catch (error) {
      clientLogger.error("Error refreshing KPIs:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter definitions
  const filteredDefinitions = definitions.filter((d) => {
    const matchesCategory = selectedCategory === "all" || d.category === selectedCategory;
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.nameVi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group by category
  const groupedByCategory = filteredDefinitions.reduce((acc, def) => {
    if (!acc[def.category]) {
      acc[def.category] = [];
    }
    acc[def.category].push(def);
    return acc;
  }, {} as Record<string, KPIDefinition[]>);

  // Get status icon
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-warning-500" />;
      default:
        return null;
    }
  };

  // Get trend icon
  const getTrendIcon = (direction?: string) => {
    switch (direction) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-success-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-danger-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chỉ số KPI</h1>
          <p className="text-muted-foreground">
            Theo dõi và quản lý các chỉ số hiệu suất chính
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")}
            />
            Làm mới
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Cấu hình
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm KPI..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats summary - compact inline */}
      <CompactStatsBar stats={[
        { label: 'Tổng KPI', value: definitions.length },
        { label: 'Đạt mục tiêu', value: Object.values(values).filter((v) => v.status === "normal").length, color: 'text-success-600' },
        { label: 'Cảnh báo', value: Object.values(values).filter((v) => v.status === "warning").length, color: 'text-warning-500' },
        { label: 'Nghiêm trọng', value: Object.values(values).filter((v) => v.status === "critical").length, color: 'text-destructive' },
      ]} />

      {/* KPI cards by category */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-40 animate-pulse bg-muted" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByCategory).map(([category, defs]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold mb-4">
                {CATEGORY_LABELS[category as KPICategory] || category}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {defs.map((def) => {
                  const value = values[def.code];
                  return (
                    <Card key={def.code} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{def.nameVi}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                              {def.code}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(value?.status)}
                            {getTrendIcon(value?.trend?.direction)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-baseline gap-2">
                            <span
                              className={cn(
                                "text-2xl font-bold",
                                value?.status === "critical" && "text-destructive",
                                value?.status === "warning" && "text-warning-500"
                              )}
                            >
                              {value?.formattedValue || "—"}
                            </span>
                            {value?.changePercent !== undefined && (
                              <span
                                className={cn(
                                  "text-sm",
                                  value.changePercent > 0 ? "text-success-600" : "text-danger-600"
                                )}
                              >
                                {value.changePercent > 0 ? "+" : ""}
                                {value.changePercent.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          {def.targetValue && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Target className="h-3 w-3" />
                              <span>
                                Mục tiêu:{" "}
                                {def.format === "currency"
                                  ? new Intl.NumberFormat("vi-VN", {
                                      style: "currency",
                                      currency: "VND",
                                      maximumFractionDigits: 0,
                                    }).format(def.targetValue)
                                  : def.format === "percent"
                                  ? `${def.targetValue}%`
                                  : def.targetValue}
                              </span>
                            </div>
                          )}
                          {def.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {def.description}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
