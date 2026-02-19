"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw, DollarSign, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { AiInsightCard } from "@/components/ai/ai-insight-card";
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

export default function RecommendationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/recommendations");
      if (!response.ok) {
        throw new Error(`Failed to fetch recommendations (${response.status})`);
      }
      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (err) {
      clientLogger.error("Failed to load recommendations:", err);
      setError(err instanceof Error ? err.message : "Failed to load recommendations");
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

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

  const filteredRecommendations = recommendations.filter((r) => {
    if (r.status !== "active") return false;
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
    return true;
  });

  const highPriority = filteredRecommendations.filter(
    (r) => r.priority === "HIGH"
  );
  const mediumPriority = filteredRecommendations.filter(
    (r) => r.priority === "MEDIUM"
  );
  const lowPriority = filteredRecommendations.filter(
    (r) => r.priority === "LOW"
  );

  const totalSavings = filteredRecommendations.reduce(
    (sum, r) => sum + (r.savingsEstimate || 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart Recommendations"
        description="AI-powered recommendations to optimize your supply chain"
        backHref="/ai"
        actions={
          <Button
            variant="outline"
            onClick={loadRecommendations}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Generate
          </Button>
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Category</label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="inventory">Inventory</SelectItem>
                <SelectItem value="purchasing">Purchasing</SelectItem>
                <SelectItem value="supplier">Supplier</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Priority</label>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-green-50 dark:bg-green-900/30 px-4 py-2 rounded-lg">
            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm text-green-600 dark:text-green-400">Potential Savings</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-300">
                ${totalSavings.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Recommendations */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={loadRecommendations}>
            Retry
          </Button>
        </Card>
      ) : filteredRecommendations.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No recommendations match the selected filters
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {highPriority.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">
                  High Priority ({highPriority.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {highPriority.map((rec) => (
                  <AiInsightCard
                    key={rec.id}
                    recommendation={rec}
                    onImplement={handleImplement}
                    onDismiss={handleDismiss}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {mediumPriority.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-amber-600">
                  Medium Priority ({mediumPriority.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mediumPriority.map((rec) => (
                  <AiInsightCard
                    key={rec.id}
                    recommendation={rec}
                    onImplement={handleImplement}
                    onDismiss={handleDismiss}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {lowPriority.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">
                  Low Priority ({lowPriority.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lowPriority.map((rec) => (
                  <AiInsightCard
                    key={rec.id}
                    recommendation={rec}
                    onImplement={handleImplement}
                    onDismiss={handleDismiss}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Savings Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Potential Savings Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            If all recommendations are implemented:
          </p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Reduced stock-outs</span>
              <span className="font-medium">~$125,000/year</span>
            </div>
            <div className="flex justify-between">
              <span>Lower safety stock (freed capital)</span>
              <span className="font-medium">~$18,000</span>
            </div>
            <div className="flex justify-between">
              <span>Volume discounts</span>
              <span className="font-medium">~$8,500/year</span>
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between font-bold">
              <span>Total potential</span>
              <span className="text-green-600">~$151,500/year</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
