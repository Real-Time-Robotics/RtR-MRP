"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Loader2,
  RefreshCw,
  Download,
  Brain,
  Target,
  TrendingUp,
  BarChart3,
  Calendar,
  Zap,
  AlertTriangle,
  ChevronRight,
  Plus,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import dynamic from "next/dynamic";
import { ConfidenceBadge } from "@/components/ai/confidence-badge";

// Lazy-load chart/visualization components (recharts ~500KB)
const ForecastChart = dynamic(
  () => import("@/components/ai/forecast-chart").then(mod => mod.ForecastChart),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted h-[400px] rounded-lg" />,
  }
);

const SeasonalPatternChart = dynamic(
  () => import("@/components/ai/forecast/seasonal-pattern-chart").then(mod => mod.SeasonalPatternChart),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted h-64 rounded-lg" />,
  }
);

const AccuracyMetrics = dynamic(
  () => import("@/components/ai/forecast/accuracy-metrics").then(mod => mod.AccuracyMetrics),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted h-48 rounded-lg" />,
  }
);

const AccuracyBadge = dynamic(
  () => import("@/components/ai/forecast/accuracy-metrics").then(mod => mod.AccuracyBadge),
  { ssr: false, loading: () => <div className="animate-pulse bg-muted h-6 w-16 rounded" /> }
);

const ForecastTable = dynamic(
  () => import("@/components/ai/forecast/forecast-table").then(mod => mod.ForecastTable),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted h-64 rounded-lg" />,
  }
);

const ForecastList = dynamic(
  () => import("@/components/ai/forecast/forecast-table").then(mod => mod.ForecastList),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted h-48 rounded-lg" />,
  }
);

const AIExplanationPanel = dynamic(
  () => import("@/components/ai/forecast/ai-explanation-panel").then(mod => mod.AIExplanationPanel),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted h-48 rounded-lg" />,
  }
);
import {
  useForecast,
  useForecastAccuracy,
  useGenerateForecast,
  useSyncActuals,
} from "@/hooks/use-forecast";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// TYPES
// =============================================================================

interface Product {
  id: string;
  sku: string;
  name: string;
  category?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ForecastDashboardPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [periodType, setPeriodType] = useState<"weekly" | "monthly">("monthly");
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Hooks
  const {
    forecast,
    salesHistory,
    accuracy,
    chartData,
    isLoading: isForecastLoading,
    fetchForecast,
    generateForecast: regenerateForecast,
  } = useForecast({ productId: selectedProduct, periodType });

  const {
    summary: accuracySummary,
    leaderboard,
    trends: accuracyTrends,
    isLoading: isAccuracyLoading,
    refetch: refetchAccuracy,
  } = useForecastAccuracy({ periodType });

  const {
    isGenerating,
    generateBatch,
    generateSingle,
  } = useGenerateForecast();

  const { isSyncing, syncActuals } = useSyncActuals();

  // Fetch products
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products?limit=100");
        const data = await res.json();
        const productList = Array.isArray(data) ? data : data.products || [];
        setProducts(productList);
        if (productList.length > 0 && !selectedProduct) {
          setSelectedProduct(productList[0].id);
        }
      } catch (error) {
        clientLogger.error("Failed to fetch products:", error);
        toast({
          title: "Error",
          description: "Failed to load products",
          variant: "destructive",
        });
      } finally {
        setIsLoadingProducts(false);
      }
    }
    fetchProducts();
  }, [toast, selectedProduct]);

  // Handle generate all forecasts
  const handleGenerateAll = useCallback(async () => {
    const result = await generateBatch(undefined, { periodType, skipExisting: true });
    if (result) {
      toast({
        title: "Batch Generation Complete",
        description: `Generated ${result.success} forecasts, ${result.failed} failed`,
      });
      refetchAccuracy();
    }
  }, [generateBatch, periodType, toast, refetchAccuracy]);

  // Handle sync actuals
  const handleSyncActuals = useCallback(async () => {
    const result = await syncActuals({ periodType, periodsBack: 3 });
    if (result) {
      toast({
        title: "Sync Complete",
        description: `Updated ${result.recordsUpdated} records`,
      });
      refetchAccuracy();
    }
  }, [syncActuals, periodType, toast, refetchAccuracy]);

  // Handle regenerate single
  const handleRegenerate = useCallback(async () => {
    if (!selectedProduct) return;
    const result = await regenerateForecast(true);
    if (result) {
      toast({
        title: "Forecast Regenerated",
        description: `New forecast generated with ${result.model} model`,
      });
    }
  }, [selectedProduct, regenerateForecast, toast]);

  // Prepare seasonal data from sales history
  const seasonalData = useMemo(() => {
    if (!salesHistory?.salesHistory) return [];
    return salesHistory.salesHistory.slice(-12).map((item) => ({
      period: item.period,
      value: item.quantity,
    }));
  }, [salesHistory]);

  // Prepare forecast table data
  const forecastTableData = useMemo(() => {
    if (!forecast) return [];
    return [{
      productId: forecast.productId,
      productName: forecast.productName,
      productSku: forecast.productSku,
      nextPeriod: forecast.predictions[0] ? {
        period: forecast.predictions[0].period,
        quantity: forecast.predictions[0].quantity,
      } : { period: "", quantity: 0 },
      trend: forecast.trend,
      confidence: forecast.confidence,
      accuracy: accuracy ? 100 - accuracy.mape : undefined,
      model: forecast.model,
      generatedAt: forecast.generatedAt,
    }];
  }, [forecast, accuracy]);

  const selectedProductData = products.find((p) => p.id === selectedProduct);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Demand Forecasting"
        description="AI-powered demand predictions with Vietnamese calendar integration"
        backHref="/ai"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncActuals}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Actuals
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateAll}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Generate All
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall Accuracy</p>
                <p className="text-2xl font-bold">
                  {isAccuracyLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : accuracySummary ? (
                    `${(100 - (accuracySummary.averageAccuracy || 0)).toFixed(1)}%`
                  ) : (
                    "N/A"
                  )}
                </p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Forecasts</p>
                <p className="text-2xl font-bold">
                  {isAccuracyLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    accuracySummary?.totalForecasts || 0
                  )}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Best Model</p>
                <p className="text-lg font-bold truncate">
                  {isAccuracyLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    accuracySummary?.bestModel || "N/A"
                  )}
                </p>
              </div>
              <Brain className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">With Actuals</p>
                <p className="text-2xl font-bold">
                  {isAccuracyLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    accuracySummary?.forecastsWithActuals || 0
                  )}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Product Forecast */}
        <div className="lg:col-span-2 space-y-6">
          {/* Controls */}
          <Card className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-1 block">Product</label>
                <Select
                  value={selectedProduct}
                  onValueChange={setSelectedProduct}
                  disabled={isLoadingProducts}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.sku} - {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Period Type</label>
                <Select
                  value={periodType}
                  onValueChange={(v) => setPeriodType(v as "weekly" | "monthly")}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-6 flex gap-2">
                <Button variant="outline" onClick={() => fetchForecast(selectedProduct)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button onClick={handleRegenerate} disabled={isForecastLoading || !selectedProduct}>
                  {isForecastLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4 mr-2" />
                  )}
                  Enhance
                </Button>
              </div>
            </div>
          </Card>

          {/* Forecast Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Demand Forecast
                    {forecast && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {forecast.model}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {selectedProductData
                      ? `${selectedProductData.sku} - ${selectedProductData.name}`
                      : "Select a product to view forecast"}
                  </CardDescription>
                </div>
                {forecast && (
                  <div className="flex items-center gap-2">
                    <ConfidenceBadge confidence={forecast.confidence} />
                    <Badge
                      className={
                        forecast.trend === "up"
                          ? "bg-green-100 text-green-800"
                          : forecast.trend === "down"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                      }
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {forecast.trend}
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isForecastLoading || isLoadingProducts ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : chartData.length > 0 ? (
                <ForecastChart data={chartData} />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
                  <p className="font-medium">No forecast data available</p>
                  <p className="text-sm">Select a product and generate a forecast</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Predictions Table */}
          {forecast && forecast.predictions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Forecast Predictions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="text-left p-3">Period</th>
                        <th className="text-right p-3">Quantity</th>
                        <th className="text-right p-3">Lower Bound</th>
                        <th className="text-right p-3">Upper Bound</th>
                        <th className="text-center p-3">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast.predictions.slice(0, 6).map((pred, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="p-3 font-medium">{pred.period}</td>
                          <td className="p-3 text-right font-bold">
                            {pred.quantity.toLocaleString()}
                          </td>
                          <td className="p-3 text-right text-muted-foreground">
                            {pred.lowerBound.toLocaleString()}
                          </td>
                          <td className="p-3 text-right text-muted-foreground">
                            {pred.upperBound.toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline">
                              {(pred.confidence * 100).toFixed(0)}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Seasonal Pattern */}
          {seasonalData.length > 0 && (
            <SeasonalPatternChart
              data={seasonalData}
              title="Seasonal Demand Pattern"
              height={250}
            />
          )}
        </div>

        {/* Right Column - Accuracy & Insights */}
        <div className="space-y-6">
          {/* Accuracy Metrics */}
          <AccuracyMetrics
            metrics={accuracy || null}
            trend={
              accuracyTrends.length >= 2
                ? (accuracyTrends[accuracyTrends.length - 1]?.averageAccuracy ?? 0) >
                  (accuracyTrends[0]?.averageAccuracy ?? 0)
                  ? "improving"
                  : "declining"
                : "stable"
            }
            showDetails
          />

          {/* Recommendations */}
          {forecast?.recommendations && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm">Safety Stock</span>
                    <span className="font-bold">
                      {forecast.recommendations.safetyStock.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm">Reorder Point</span>
                    <span className="font-bold">
                      {forecast.recommendations.reorderPoint.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm">Economic Order Qty</span>
                    <span className="font-bold">
                      {forecast.recommendations.economicOrderQuantity.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Performers */}
          {leaderboard && leaderboard.topPerformers.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Top Accuracy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboard.topPerformers.slice(0, 5).map((item, idx) => (
                    <Link
                      key={item.productId}
                      href={`/ai/forecast/${item.productId}`}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium truncate max-w-[150px]">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{item.partNumber}</p>
                        </div>
                      </div>
                      <AccuracyBadge mape={item.metrics?.mape || 0} size="sm" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Attention Needed */}
          {leaderboard && leaderboard.bottomPerformers.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Needs Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboard.bottomPerformers.slice(0, 3).map((item) => (
                    <Link
                      key={item.productId}
                      href={`/ai/forecast/${item.productId}`}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium truncate max-w-[150px]">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.partNumber}</p>
                      </div>
                      <Badge className="bg-red-100 text-red-800 border-0">
                        {(100 - (item.metrics?.mape || 0)).toFixed(0)}%
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/ai/forecast/training">
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Model Training
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
              </Link>
              <Link href="/ai/forecast/accuracy">
                <Button variant="outline" className="w-full justify-start">
                  <Target className="h-4 w-4 mr-2" />
                  Accuracy Report
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
              </Link>
              <Link href="/mrp">
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  MRP Planning
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
