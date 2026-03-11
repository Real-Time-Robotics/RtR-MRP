"use client";

import { useState, useEffect } from "react";
import { CompactStatsBar } from "@/components/ui/compact-stats-bar";
import { useRouter } from "next/navigation";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  ChevronRight,
  Loader2,
  RefreshCw,
  CheckCircle,
  Package,
  Truck,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { AiInsightCard } from "@/components/ai/ai-insight-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnomalyAlerts } from "@/components/ml/anomaly-alerts";
import { OptimizationSuggestions } from "@/components/ml/optimization-suggestions";
import { clientLogger } from '@/lib/client-logger';

interface Recommendation {
  id: string;
  type: "REORDER" | "SUPPLIER_CHANGE" | "SAFETY_STOCK" | "EXPEDITE" | "CONSOLIDATE";
  priority: "HIGH" | "MEDIUM" | "LOW";
  category: "inventory" | "purchasing" | "production" | "supplier";
  title: string;
  description: string;
  impact?: string;
  savingsEstimate?: number;
  confidence: number;
  partId?: string;
  supplierId?: string;
  productId?: string;
  status: string;
}

interface ModelStatus {
  modelId: string;
  modelType: string;
  status: "active" | "training" | "error" | "pending";
  lastTrained: string | null;
  metrics: Record<string, number>;
}

interface MLServiceStatus {
  status: string;
  modelsLoaded: number;
  totalModels: number;
}

export default function AiDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [mlServiceStatus, setMlServiceStatus] = useState<MLServiceStatus | null>(null);
  const [models, setModels] = useState<ModelStatus[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  useEffect(() => {
    loadData();
    checkMLService();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/recommendations");
      if (!response.ok) {
        throw new Error(`Failed to fetch recommendations (${response.status})`);
      }
      const data = await response.json();
      setRecommendations(data.recommendations || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      clientLogger.error("Failed to load recommendations:", err);
      setError(err instanceof Error ? err.message : "Failed to load recommendations");
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const checkMLService = async () => {
    try {
      const response = await fetch("/api/ml/health");
      if (response.ok) {
        const data = await response.json();
        setMlServiceStatus(data);
      }
    } catch {
      setMlServiceStatus(null);
    }

    try {
      const response = await fetch("/api/ml/models/status");
      const data = await response.json();
      setModels(data.models || []);
    } catch {
      setModels([]);
    }
  };

  const highPriority = recommendations.filter((r) => r.priority === "HIGH");
  const mediumPriority = recommendations.filter((r) => r.priority === "MEDIUM");
  const lowPriority = recommendations.filter((r) => r.priority === "LOW");

  const totalSavings = recommendations.reduce(
    (sum, r) => sum + (r.savingsEstimate || 0),
    0
  );

  const handleImplement = (id: string) => {
    setRecommendations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "implemented" } : r))
    );
  };

  const handleDismiss = (id: string) => {
    setRecommendations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "dismissed" } : r))
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Insights"
        description="AI-powered recommendations and predictions for your supply chain"
        actions={
          <div className="flex items-center gap-4">
            <Badge
              variant={mlServiceStatus ? "default" : "destructive"}
              className="gap-1"
            >
              {mlServiceStatus ? (
                <>
                  <CheckCircle className="h-3 w-3" />
                  ML Service Online
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3" />
                  ML Service Offline
                </>
              )}
            </Badge>
            <span className="text-sm text-muted-foreground" suppressHydrationWarning>
              Last updated: {lastUpdated || "--:--:--"}
            </span>
            <Button variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Model Status - compact inline */}
      <CompactStatsBar stats={[
        { label: 'Demand Forecasting', value: 'Prophet + ARIMA', color: 'text-primary-600' },
        { label: 'Lead Time Prediction', value: 'XGBoost', color: 'text-purple-600' },
        { label: 'Inventory Optimization', value: 'EOQ', color: 'text-success-600' },
        { label: 'Anomaly Detection', value: 'Isolation Forest', color: 'text-danger-600' },
      ]} />

      <Tabs defaultValue="ml-realtime" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ml-realtime">ML Real-time</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="models">Model Status</TabsTrigger>
        </TabsList>

        {/* ML Real-time Tab - Connected to ML Service */}
        <TabsContent value="ml-realtime" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <AnomalyAlerts />
            <OptimizationSuggestions />
          </div>

          {/* Quick Links to ML Features */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => router.push("/ai/forecast")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="font-medium">Forecast</p>
                  <p className="text-xs text-muted-foreground">Demand prediction</p>
                </div>
              </div>
            </Card>
            <Card
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => router.push("/ai/lead-time")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Truck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-medium">Lead Time</p>
                  <p className="text-xs text-muted-foreground">Supplier predictions</p>
                </div>
              </div>
            </Card>
            <Card
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => router.push("/ai/supplier-risk")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="font-medium">Supplier Risk</p>
                  <p className="text-xs text-muted-foreground">Risk analysis</p>
                </div>
              </div>
            </Card>
            <Card
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => router.push("/ai/simulation")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success-100 dark:bg-success-900 rounded-lg">
                  <Package className="h-5 w-5 text-success-600 dark:text-success-400" />
                </div>
                <div>
                  <p className="font-medium">Simulation</p>
                  <p className="text-xs text-muted-foreground">What-if analysis</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {/* Quick Stats - compact inline */}
          <CompactStatsBar stats={[
            { label: 'High Priority', value: highPriority.length, color: 'text-danger-600' },
            { label: 'Total Insights', value: recommendations.length, color: 'text-warning-600' },
            { label: 'Potential Savings', value: `$${totalSavings.toLocaleString()}`, color: 'text-success-600' },
            { label: 'Avg Confidence', value: `${recommendations.length > 0 ? Math.round((recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length) * 100) : 0}%`, color: 'text-primary-600' },
          ]} />

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Top Recommendations
                </CardTitle>
                <Button
                  variant="ghost"
                  onClick={() => router.push("/ai/recommendations")}
                >
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mb-2 text-destructive" />
                  <p className="text-sm">{error}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={loadData}>
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {highPriority.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-danger-600 mb-2">
                        HIGH PRIORITY ({highPriority.length})
                      </h4>
                      <div className="space-y-3">
                        {highPriority
                          .filter((r) => r.status === "active")
                          .slice(0, 2)
                          .map((rec) => (
                            <AiInsightCard
                              key={rec.id}
                              recommendation={rec}
                              onImplement={handleImplement}
                              onDismiss={handleDismiss}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {mediumPriority.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-warning-600 mb-2">
                        MEDIUM PRIORITY ({mediumPriority.length})
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {mediumPriority.length} recommendations available
                      </p>
                    </div>
                  )}

                  {lowPriority.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-success-600 mb-2">
                        LOW PRIORITY ({lowPriority.length})
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {lowPriority.length} recommendations available
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-6">
            <Card
              className="p-6 cursor-pointer hover:bg-gray-50"
              onClick={() => router.push("/ai/forecast")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Demand Forecast</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    ML-powered demand predictions using ensemble models
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>

            <Card
              className="p-6 cursor-pointer hover:bg-gray-50"
              onClick={() => router.push("/ai/suppliers")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Supplier Health</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="bg-success-100 text-success-800">
                      15 Low Risk
                    </Badge>
                    <Badge variant="outline" className="bg-warning-100 text-warning-800">
                      4 Medium
                    </Badge>
                    <Badge variant="outline" className="bg-danger-100 text-danger-800">
                      1 High Risk
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>

            <Card
              className="p-6 cursor-pointer hover:bg-gray-50"
              onClick={() => router.push("/ai/lead-time")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Lead Time Predictions</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    XGBoost-based supplier delivery predictions
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>

            <Card
              className="p-6 cursor-pointer hover:bg-gray-50"
              onClick={() => router.push("/ai/scenarios")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">What-If Analysis</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Simulate demand changes, supply disruptions, and more
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Model Registry
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkMLService}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Status
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {models.length > 0 ? (
                  models.map((model) => (
                    <div
                      key={model.modelId}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{model.modelId}</h4>
                        <p className="text-sm text-muted-foreground">
                          Type: {model.modelType} •{" "}
                          {model.lastTrained
                            ? `Last trained: ${new Date(model.lastTrained).toLocaleDateString()}`
                            : "Not trained"}
                        </p>
                        {model.metrics && Object.keys(model.metrics).length > 0 && (
                          <div className="flex gap-2 mt-1">
                            {model.metrics.mape && (
                              <Badge variant="secondary">
                                MAPE: {model.metrics.mape}%
                              </Badge>
                            )}
                            {model.metrics.mae && (
                              <Badge variant="secondary">
                                MAE: {model.metrics.mae}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            model.status === "active"
                              ? "default"
                              : model.status === "training"
                              ? "secondary"
                              : model.status === "error"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {model.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          Retrain
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No models loaded. Start the ML service to view model status.</p>
                    <p className="text-sm mt-2">
                      Run: <code className="bg-muted px-2 py-1 rounded">docker-compose up ml-service</code>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ML Service Info */}
          <Card>
            <CardHeader>
              <CardTitle>ML Service Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Forecasting Models</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Prophet - Facebook time series</li>
                    <li>• ARIMA - Auto-regressive integrated moving average</li>
                    <li>• ETS - Exponential smoothing</li>
                    <li>• Ensemble - Weighted combination</li>
                  </ul>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Optimization</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Safety Stock - King&apos;s method</li>
                    <li>• EOQ - Economic Order Quantity</li>
                    <li>• Reorder Point - Dynamic calculation</li>
                    <li>• Service Level - 95% default</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
