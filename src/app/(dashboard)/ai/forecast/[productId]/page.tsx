"use client";

import { useState, useEffect, useCallback, use } from "react";
import {
  Loader2,
  RefreshCw,
  Download,
  Brain,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Calendar,
  Zap,
  ArrowLeft,
  Settings,
  History,
  FileText,
  Package,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
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

const AccuracyMetrics = dynamic(
  () => import("@/components/ai/forecast/accuracy-metrics").then(mod => mod.AccuracyMetrics),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted h-48 rounded-lg" />,
  }
);

const SeasonalPatternChart = dynamic(
  () => import("@/components/ai/forecast/seasonal-pattern-chart").then(mod => mod.SeasonalPatternChart),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted h-64 rounded-lg" />,
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
  useForecastTraining,
} from "@/hooks/use-forecast";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

// =============================================================================
// TYPES
// =============================================================================

interface PageProps {
  params: Promise<{
    productId: string;
  }>;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ForecastProductDetailPage({ params }: PageProps) {
  const { productId } = use(params);
  const { toast } = useToast();
  const [periodType, setPeriodType] = useState<"weekly" | "monthly">("monthly");
  const [activeTab, setActiveTab] = useState("overview");

  // Hooks
  const {
    forecast,
    salesHistory,
    accuracy,
    chartData,
    isLoading,
    error,
    fetchForecast,
    generateForecast,
  } = useForecast({ productId, periodType });

  const {
    isTraining,
    evaluateModels,
    optimizeParameters,
  } = useForecastTraining();

  const [modelEvaluation, setModelEvaluation] = useState<{
    recommendedModel?: { model: string; metrics: { mape: number } };
    models?: Array<{ model: string; rank: number; metrics: { mape: number; rmse: number }; sampleSize: number }>;
  } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Handle regenerate forecast
  const handleRegenerate = useCallback(async (enhance: boolean) => {
    const result = await generateForecast(enhance);
    if (result) {
      toast({
        title: enhance ? "Enhanced Forecast Generated" : "Forecast Regenerated",
        description: `New forecast generated with ${result.model} model`,
      });
    }
  }, [generateForecast, toast]);

  // Handle model evaluation
  const handleEvaluateModels = useCallback(async () => {
    setIsEvaluating(true);
    const result = await evaluateModels(productId);
    if (result) {
      setModelEvaluation(result);
      toast({
        title: "Model Evaluation Complete",
        description: `Recommended model: ${result.recommendedModel?.model}`,
      });
    }
    setIsEvaluating(false);
  }, [productId, evaluateModels, toast]);

  // Prepare seasonal data
  const seasonalData = salesHistory?.salesHistory
    ? salesHistory.salesHistory.slice(-12).map((item) => ({
        period: item.period,
        value: item.quantity,
      }))
    : [];

  // Get trend icon
  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case "down":
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-gray-500" />;
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Forecast Details"
          backHref="/ai/forecast"
        />
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mb-4 text-amber-500" />
              <p className="text-lg font-medium">Error Loading Forecast</p>
              <p className="text-sm">{error}</p>
              <Button className="mt-4" onClick={() => fetchForecast(productId)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={forecast?.productName || "Forecast Details"}
        description={forecast ? `${forecast.productSku} - AI Demand Forecast` : "Loading..."}
        backHref="/ai/forecast"
        actions={
          <div className="flex items-center gap-2">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRegenerate(false)}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => handleRegenerate(true)}
              disabled={isLoading}
            >
              <Brain className="h-4 w-4 mr-2" />
              Enhance with AI
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading forecast data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Product Info & KPIs */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Trend</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getTrendIcon(forecast?.trend)}
                      <span className="text-lg font-bold capitalize">
                        {forecast?.trend || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Next Period</p>
                    <p className="text-2xl font-bold">
                      {forecast?.predictions[0]?.quantity.toLocaleString() || "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {forecast?.predictions[0]?.period}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Confidence</p>
                    <p className="text-2xl font-bold">
                      {forecast ? `${(forecast.confidence * 100).toFixed(0)}%` : "N/A"}
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
                    <p className="text-sm font-medium text-muted-foreground">Model</p>
                    <p className="text-lg font-bold font-mono">
                      {forecast?.model || "N/A"}
                    </p>
                  </div>
                  <Settings className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Seasonality</p>
                    <p className="text-lg font-bold capitalize">
                      {forecast?.seasonality || "N/A"}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
              <TabsTrigger value="accuracy">
                <Target className="h-4 w-4 mr-2" />
                Accuracy
              </TabsTrigger>
              <TabsTrigger value="models">
                <Brain className="h-4 w-4 mr-2" />
                Models
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Forecast Chart */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Demand Forecast
                        {forecast && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {forecast.model}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Historical data and predicted demand
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {chartData.length > 0 ? (
                        <ForecastChart data={chartData} />
                      ) : (
                        <div className="flex items-center justify-center py-16 text-muted-foreground">
                          <BarChart3 className="h-8 w-8 mr-2" />
                          No data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Recommendations & Metrics */}
                <div className="space-y-6">
                  {forecast?.recommendations && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">Safety Stock</span>
                              <Package className="h-4 w-4 text-blue-600" />
                            </div>
                            <p className="text-2xl font-bold text-blue-600">
                              {forecast.recommendations.safetyStock.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Recommended buffer inventory
                            </p>
                          </div>

                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">Reorder Point</span>
                              <AlertTriangle className="h-4 w-4 text-green-600" />
                            </div>
                            <p className="text-2xl font-bold text-green-600">
                              {forecast.recommendations.reorderPoint.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Order when stock reaches this level
                            </p>
                          </div>

                          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">EOQ</span>
                              <DollarSign className="h-4 w-4 text-purple-600" />
                            </div>
                            <p className="text-2xl font-bold text-purple-600">
                              {forecast.recommendations.economicOrderQuantity.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Optimal order quantity
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Forecast Metrics */}
                  {forecast?.metrics && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Forecast Metrics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-2 bg-muted/50 rounded">
                            <p className="text-xs text-muted-foreground">MAPE</p>
                            <p className="font-bold">{forecast.metrics.mape.toFixed(2)}%</p>
                          </div>
                          <div className="p-2 bg-muted/50 rounded">
                            <p className="text-xs text-muted-foreground">RMSE</p>
                            <p className="font-bold">{forecast.metrics.rmse.toFixed(2)}</p>
                          </div>
                          <div className="p-2 bg-muted/50 rounded">
                            <p className="text-xs text-muted-foreground">MAE</p>
                            <p className="font-bold">{forecast.metrics.mae.toFixed(2)}</p>
                          </div>
                          <div className="p-2 bg-muted/50 rounded">
                            <p className="text-xs text-muted-foreground">Bias</p>
                            <p className={`font-bold ${forecast.metrics.bias > 0 ? "text-amber-600" : forecast.metrics.bias < 0 ? "text-blue-600" : ""}`}>
                              {forecast.metrics.bias > 0 ? "+" : ""}{forecast.metrics.bias.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Predictions Table */}
              {forecast && forecast.predictions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Detailed Predictions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b bg-muted/50">
                          <tr>
                            <th className="text-left p-3">Period</th>
                            <th className="text-right p-3">Quantity</th>
                            <th className="text-right p-3">Lower Bound</th>
                            <th className="text-right p-3">Upper Bound</th>
                            <th className="text-center p-3">Confidence</th>
                            <th className="text-right p-3">Holiday Factor</th>
                            <th className="text-right p-3">Seasonal Factor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {forecast.predictions.map((pred, idx) => (
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
                              <td className="p-3 text-right">
                                {pred.factors?.holiday ? `${(pred.factors.holiday * 100).toFixed(0)}%` : "-"}
                              </td>
                              <td className="p-3 text-right">
                                {pred.factors?.seasonal ? `${(pred.factors.seasonal * 100).toFixed(0)}%` : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <SeasonalPatternChart
                  data={seasonalData}
                  title="Monthly Demand Pattern"
                  height={300}
                />

                {salesHistory && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Sales Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Total Quantity</p>
                          <p className="text-2xl font-bold">
                            {salesHistory.totalQuantity.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Total Revenue</p>
                          <p className="text-2xl font-bold">
                            {salesHistory.totalRevenue.toLocaleString()} ₫
                          </p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Trend</p>
                          <div className="flex items-center gap-2">
                            {getTrendIcon(salesHistory.trend)}
                            <span className="text-lg font-bold capitalize">
                              {salesHistory.trend}
                            </span>
                          </div>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Volatility</p>
                          <p className="text-2xl font-bold">
                            {(salesHistory.volatility * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Historical Data Table */}
              {salesHistory && salesHistory.salesHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Historical Sales Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b bg-muted/50">
                          <tr>
                            <th className="text-left p-3">Period</th>
                            <th className="text-right p-3">Quantity</th>
                            <th className="text-right p-3">Revenue</th>
                            <th className="text-right p-3">Avg Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {salesHistory.salesHistory.map((item, idx) => (
                            <tr key={idx} className="border-b last:border-0">
                              <td className="p-3 font-medium">{item.period}</td>
                              <td className="p-3 text-right">{item.quantity.toLocaleString()}</td>
                              <td className="p-3 text-right">{item.revenue.toLocaleString()} ₫</td>
                              <td className="p-3 text-right">
                                {item.quantity > 0 ? Math.round(item.revenue / item.quantity).toLocaleString() : 0} ₫
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Accuracy Tab */}
            <TabsContent value="accuracy" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <AccuracyMetrics
                  metrics={accuracy || null}
                  showDetails
                />

                {/* Comparison Placeholder */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Forecast vs Actual</CardTitle>
                    <CardDescription>
                      Historical comparison of forecasts vs actual sales
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Target className="h-12 w-12 mb-4 opacity-50" />
                      <p className="font-medium">Coming Soon</p>
                      <p className="text-sm">Sync actuals to see comparison data</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Models Tab */}
            <TabsContent value="models" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Model Evaluation</span>
                    <Button
                      size="sm"
                      onClick={handleEvaluateModels}
                      disabled={isEvaluating}
                    >
                      {isEvaluating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Brain className="h-4 w-4 mr-2" />
                      )}
                      Evaluate Models
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Compare different forecasting models for this product
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {modelEvaluation ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <span className="font-medium">Recommended Model</span>
                        </div>
                        <p className="text-xl font-bold text-green-600">
                          {modelEvaluation.recommendedModel?.model}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          MAPE: {modelEvaluation.recommendedModel?.metrics.mape.toFixed(2)}%
                        </p>
                      </div>

                      <div className="rounded-md border">
                        <table className="w-full text-sm">
                          <thead className="border-b bg-muted/50">
                            <tr>
                              <th className="text-left p-3">Rank</th>
                              <th className="text-left p-3">Model</th>
                              <th className="text-right p-3">MAPE</th>
                              <th className="text-right p-3">RMSE</th>
                              <th className="text-right p-3">Samples</th>
                            </tr>
                          </thead>
                          <tbody>
                            {modelEvaluation.models?.map((model: { model: string; rank: number; metrics: { mape: number; rmse: number }; sampleSize: number }) => (
                              <tr key={model.model} className="border-b last:border-0">
                                <td className="p-3">
                                  <Badge variant="outline">#{model.rank}</Badge>
                                </td>
                                <td className="p-3 font-mono">{model.model}</td>
                                <td className="p-3 text-right">{model.metrics.mape.toFixed(2)}%</td>
                                <td className="p-3 text-right">{model.metrics.rmse.toFixed(2)}</td>
                                <td className="p-3 text-right">{model.sampleSize}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Brain className="h-12 w-12 mb-4 opacity-50" />
                      <p className="font-medium">No evaluation data</p>
                      <p className="text-sm">Click "Evaluate Models" to compare forecasting models</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Current Model Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Current Model Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Model</p>
                      <p className="font-bold font-mono">{forecast?.model || "N/A"}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Period Type</p>
                      <p className="font-bold capitalize">{periodType}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Confidence</p>
                      <p className="font-bold">{forecast ? `${(forecast.confidence * 100).toFixed(0)}%` : "N/A"}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Seasonality</p>
                      <p className="font-bold capitalize">{forecast?.seasonality || "N/A"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Export & Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Export Forecast Data</p>
                  <p className="text-sm text-muted-foreground">
                    Download forecast data in various formats
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    PDF Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
