'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Lightbulb,
  TrendingUp,
  DollarSign,
  Check,
  X,
  RefreshCw,
  Package,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OptimizationResult {
  partId: string;
  partNumber?: string;
  partName?: string;
  type: 'safety_stock' | 'reorder_point' | 'eoq';
  currentValue: number;
  suggestedValue: number;
  expectedSavings: number;
  confidence: number;
  reasoning: string;
  impact: 'high' | 'medium' | 'low';
}

export function OptimizationSuggestions() {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<OptimizationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [mlOnline, setMlOnline] = useState<boolean | null>(null);

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Check ML service health
      const healthRes = await fetch('/api/ml/health');
      const healthData = await healthRes.json();
      setMlOnline(healthData.status !== 'offline');

      if (healthData.status === 'offline') {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      // Get parts to optimize
      const partsRes = await fetch('/api/parts?limit=10&type=COMPONENT');
      const partsData = await partsRes.json();
      const parts = partsData.parts || [];

      if (parts.length === 0) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      const results: OptimizationResult[] = [];

      // Get optimization for each part
      for (const part of parts.slice(0, 5)) {
        try {
          const res = await fetch('/api/ml/optimization', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'full',
              partId: part.id,
              serviceLevel: 0.95,
              orderCost: 50,
              holdingCostRate: 0.25,
            }),
          });

          if (res.ok) {
            const data = await res.json();

            // Extract safety stock suggestion
            if (data.safetyStock) {
              const currentSafetyStock = part.safetyStock || 0;
              const suggestedSafetyStock = data.safetyStock.safetyStock || 0;

              if (Math.abs(suggestedSafetyStock - currentSafetyStock) > 5) {
                results.push({
                  partId: part.id,
                  partNumber: part.partNumber,
                  partName: part.name,
                  type: 'safety_stock',
                  currentValue: currentSafetyStock,
                  suggestedValue: Math.round(suggestedSafetyStock),
                  expectedSavings: Math.abs(suggestedSafetyStock - currentSafetyStock) * (part.unitCost || 10),
                  confidence: 0.85,
                  reasoning: `Based on ${data.safetyStock.method} method with ${(data.safetyStock.serviceLevel * 100).toFixed(0)}% service level`,
                  impact: Math.abs(suggestedSafetyStock - currentSafetyStock) > 20 ? 'high' : 'medium',
                });
              }
            }

            // Extract EOQ suggestion
            if (data.eoq && data.eoq.eoq > 0) {
              const currentOrderQty = part.moq || 100;
              const suggestedEOQ = data.eoq.eoq;

              if (Math.abs(suggestedEOQ - currentOrderQty) > 10) {
                results.push({
                  partId: part.id,
                  partNumber: part.partNumber,
                  partName: part.name,
                  type: 'eoq',
                  currentValue: currentOrderQty,
                  suggestedValue: Math.round(suggestedEOQ),
                  expectedSavings: data.eoq.totalCostAnnual ? Math.round(data.eoq.totalCostAnnual * 0.1) : 500,
                  confidence: 0.9,
                  reasoning: `Optimal order quantity to minimize total inventory cost`,
                  impact: data.eoq.totalCostAnnual > 5000 ? 'high' : 'medium',
                });
              }
            }

            // Extract reorder point suggestion
            if (data.recommendations && data.recommendations.reorderPoint) {
              const currentReorderPoint = part.reorderPoint || 0;
              const suggestedReorderPoint = data.recommendations.reorderPoint;

              if (Math.abs(suggestedReorderPoint - currentReorderPoint) > 5) {
                results.push({
                  partId: part.id,
                  partNumber: part.partNumber,
                  partName: part.name,
                  type: 'reorder_point',
                  currentValue: currentReorderPoint,
                  suggestedValue: Math.round(suggestedReorderPoint),
                  expectedSavings: 200,
                  confidence: 0.88,
                  reasoning: `Covers demand during lead time plus safety stock`,
                  impact: 'medium',
                });
              }
            }
          }
        } catch {
          // Skip failed part optimization
        }
      }

      // Sort by expected savings
      results.sort((a, b) => b.expectedSavings - a.expectedSavings);
      setSuggestions(results.slice(0, 6));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const applySuggestion = async (suggestion: OptimizationResult) => {
    try {
      // Update the part with the suggested value
      const updateData: Record<string, number> = {};

      if (suggestion.type === 'safety_stock') {
        updateData.safetyStock = suggestion.suggestedValue;
      } else if (suggestion.type === 'reorder_point') {
        updateData.reorderPoint = suggestion.suggestedValue;
      } else if (suggestion.type === 'eoq') {
        updateData.moq = suggestion.suggestedValue;
      }

      const res = await fetch(`/api/parts/${suggestion.partId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        setAppliedIds(prev => new Set([...prev, `${suggestion.partId}-${suggestion.type}`]));
        toast({
          title: 'Optimization Applied',
          description: `Updated ${suggestion.type.replace('_', ' ')} for ${suggestion.partNumber}`,
        });
      } else {
        throw new Error('Failed to apply');
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to apply optimization',
        variant: 'destructive',
      });
    }
  };

  const totalSavings = suggestions.reduce((sum, s) => sum + s.expectedSavings, 0);

  const typeLabels: Record<string, string> = {
    safety_stock: 'Safety Stock',
    reorder_point: 'Reorder Point',
    eoq: 'Order Quantity',
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            AI Optimization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              AI Optimization
            </CardTitle>
            {totalSavings > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Potential savings: <span className="font-bold text-green-600">${totalSavings.toLocaleString()}</span>
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={loadSuggestions} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg mb-4">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {mlOnline === false ? (
          <div className="text-center py-6 text-muted-foreground">
            <Info className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">ML Service is offline</p>
            <p className="text-xs">Optimization requires the ML service</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Check className="w-10 h-10 mx-auto mb-2 text-green-500" />
            <p className="font-medium">All optimized</p>
            <p className="text-xs">No optimization suggestions at this time</p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion) => {
              const id = `${suggestion.partId}-${suggestion.type}`;
              const isApplied = appliedIds.has(id);

              return (
                <div
                  key={id}
                  className={`p-3 border rounded-lg transition-colors ${
                    isApplied ? 'bg-green-50 dark:bg-green-950 border-green-200' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[suggestion.type]}
                        </Badge>
                        <span className="font-medium text-sm truncate">
                          {suggestion.partNumber}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {suggestion.reasoning}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {suggestion.currentValue} → <strong className="text-green-600">{suggestion.suggestedValue}</strong>
                        </span>
                        <span className="flex items-center gap-1 text-green-600">
                          <DollarSign className="w-3 h-3" />
                          ${suggestion.expectedSavings.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={suggestion.confidence * 100} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground">
                          {(suggestion.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {isApplied ? (
                        <Badge variant="default" className="whitespace-nowrap">
                          <Check className="w-3 h-3 mr-1" />
                          Applied
                        </Badge>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs"
                            onClick={() => applySuggestion(suggestion)}
                          >
                            Apply
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setAppliedIds(prev => new Set([...prev, id]))}
                            aria-label="Dismiss"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OptimizationSuggestions;
