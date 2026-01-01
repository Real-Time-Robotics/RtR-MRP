"use client";

import { useState, useEffect } from "react";
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
import { generateMockRecommendations } from "@/lib/ai/mock-recommendations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [recommendations, setRecommendations] = useState<ReturnType<typeof generateMockRecommendations>>([]);
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
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRecommendations(generateMockRecommendations());
    setLastUpdated(new Date().toLocaleTimeString());
    setLoading(false);
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

      {/* Model Status Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-semibold">Demand Forecasting</p>
              <p className="text-xs text-muted-foreground">
                Prophet + ARIMA Ensemble
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Truck className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-lg font-semibold">Lead Time Prediction</p>
              <p className="text-xs text-muted-foreground">
                XGBoost Regression
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Package className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-semibold">Inventory Optimization</p>
              <p className="text-xs text-muted-foreground">
                Safety Stock + EOQ
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-semibold">Anomaly Detection</p>
              <p className="text-xs text-muted-foreground">
                Isolation Forest
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="models">Model Status</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{highPriority.length}</p>
                  <p className="text-sm text-muted-foreground">High Priority</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Brain className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{recommendations.length}</p>
                  <p className="text-sm text-muted-foreground">Total Insights</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${totalSavings.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Potential Savings</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">87%</p>
                  <p className="text-sm text-muted-foreground">Avg Confidence</p>
                </div>
              </div>
            </Card>
          </div>

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
              ) : (
                <div className="space-y-4">
                  {highPriority.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-red-600 mb-2">
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
                      <h4 className="text-sm font-medium text-amber-600 mb-2">
                        MEDIUM PRIORITY ({mediumPriority.length})
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {mediumPriority.length} recommendations available
                      </p>
                    </div>
                  )}

                  {lowPriority.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-green-600 mb-2">
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
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      15 Low Risk
                    </Badge>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800">
                      4 Medium
                    </Badge>
                    <Badge variant="outline" className="bg-red-100 text-red-800">
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
