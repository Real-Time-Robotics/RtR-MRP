'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  BarChart3,
  Target,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// DEMAND FORECASTING PAGE
// ML-powered demand prediction with recommendations
// =============================================================================

interface ForecastItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  currentStock: number;
  avgDailyDemand: number;
  trendDirection: 'UP' | 'DOWN' | 'STABLE';
  accuracy: number;
  hasRecommendations: boolean;
  criticalRecommendations: number;
}

interface ForecastDetail {
  itemId: string;
  itemCode: string;
  itemName: string;
  currentStock: number;
  avgDailyDemand: number;
  historicalData: { date: string; value: number }[];
  forecast: { date: string; predicted: number; lowerBound: number; upperBound: number; confidence: number }[];
  metrics: { mape: number; mae: number; rmse: number; accuracy: number };
  recommendations: {
    type: string;
    priority: string;
    title: string;
    description: string;
    impact: string;
    suggestedAction?: string;
  }[];
  seasonalityDetected: boolean;
  trendDirection: 'UP' | 'DOWN' | 'STABLE';
}

const TREND_ICONS = {
  UP: <TrendingUp className="w-4 h-4 text-success-500" />,
  DOWN: <TrendingDown className="w-4 h-4 text-danger-500" />,
  STABLE: <Minus className="w-4 h-4 text-gray-400" />,
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: 'bg-danger-50 dark:bg-danger-900/20', text: 'text-danger-700 dark:text-danger-300', border: 'border-danger-200 dark:border-danger-800' },
  HIGH: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  MEDIUM: { bg: 'bg-primary-50 dark:bg-primary-900/20', text: 'text-primary-700 dark:text-primary-300', border: 'border-primary-200 dark:border-primary-800' },
  LOW: { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
};

export default function DemandForecastingPage() {
  const [items, setItems] = useState<ForecastItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ForecastDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch('/api/v2/ai?view=forecasting');
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items);
        // Auto-select first item
        if (json.data.items.length > 0) {
          fetchItemDetail(json.data.items[0].itemId);
        }
      }
    } catch (error) {
      clientLogger.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchItemDetail(itemId: string) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/v2/ai?view=forecasting&itemId=${itemId}`);
      const json = await res.json();
      if (json.success) {
        setSelectedItem(json.data);
      }
    } catch (error) {
      clientLogger.error('Error fetching item detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="lg:col-span-2 h-96 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-600">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Demand Forecasting</h1>
            <p className="text-gray-500 dark:text-gray-400">Dự báo nhu cầu với Double Exponential Smoothing</p>
          </div>
        </div>
        <button
          onClick={fetchItems}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Item List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Items ({items.length})</h3>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {items.map((item) => (
              <button
                key={item.itemId}
                onClick={() => fetchItemDetail(item.itemId)}
                className={cn(
                  'w-full p-4 text-left border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                  selectedItem?.itemId === item.itemId && 'bg-primary-50 dark:bg-primary-900/20'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{item.itemCode}</p>
                    <p className="text-sm text-gray-500 truncate">{item.itemName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.criticalRecommendations > 0 && (
                      <span className="w-2 h-2 bg-danger-500 rounded-full" />
                    )}
                    {TREND_ICONS[item.trendDirection]}
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <span className="text-gray-500">Stock: {item.currentStock.toLocaleString()}</span>
                  <span className="text-gray-500">Accuracy: {item.accuracy}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Forecast Detail */}
        <div className="lg:col-span-2 space-y-6">
          {loadingDetail ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <RefreshCw className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading forecast...</p>
            </div>
          ) : selectedItem ? (
            <>
              {/* Item Info & Metrics */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedItem.itemCode}</h2>
                    <p className="text-gray-500">{selectedItem.itemName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {TREND_ICONS[selectedItem.trendDirection]}
                    <span className="text-sm text-gray-500">
                      {selectedItem.trendDirection === 'UP' ? 'Xu hướng tăng' :
                       selectedItem.trendDirection === 'DOWN' ? 'Xu hướng giảm' : 'Ổn định'}
                    </span>
                    {selectedItem.seasonalityDetected && (
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                        Seasonal
                      </span>
                    )}
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-sm text-gray-500 mb-1">Accuracy</p>
                    <p className="text-2xl font-bold text-success-600">{selectedItem.metrics.accuracy}%</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-sm text-gray-500 mb-1">MAPE</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedItem.metrics.mape}%</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-sm text-gray-500 mb-1">MAE</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedItem.metrics.mae}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-sm text-gray-500 mb-1">RMSE</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedItem.metrics.rmse}</p>
                  </div>
                </div>
              </div>

              {/* Forecast Chart (Simple representation) */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary-500" />
                  Forecast (7 days)
                </h3>
                <div className="space-y-3">
                  {selectedItem.forecast.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-24 text-sm text-gray-500">{f.date}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative">
                            <div
                              className="absolute h-full bg-primary-200 dark:bg-primary-900/50 rounded-full"
                              style={{
                                left: `${(f.lowerBound / (f.upperBound * 1.2)) * 100}%`,
                                right: `${100 - (f.upperBound / (f.upperBound * 1.2)) * 100}%`,
                              }}
                            />
                            <div
                              className="absolute h-full w-1 bg-primary-600 rounded-full"
                              style={{ left: `${(f.predicted / (f.upperBound * 1.2)) * 100}%` }}
                            />
                          </div>
                          <span className="w-16 text-sm font-medium text-gray-900 dark:text-white text-right">
                            {f.predicted}
                          </span>
                        </div>
                      </div>
                      <div className="w-16 text-xs text-gray-500 text-right">
                        {f.confidence}%
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-primary-600 rounded" />
                    <span>Predicted</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-primary-200 dark:bg-primary-900/50 rounded" />
                    <span>Confidence Interval</span>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {selectedItem.recommendations.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-500" />
                    AI Recommendations
                  </h3>
                  <div className="space-y-4">
                    {selectedItem.recommendations.map((rec, idx) => {
                      const colors = PRIORITY_COLORS[rec.priority] || PRIORITY_COLORS.LOW;
                      return (
                        <div
                          key={idx}
                          className={cn('p-4 rounded-xl border', colors.bg, colors.border)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {rec.priority === 'CRITICAL' || rec.priority === 'HIGH' ? (
                                <AlertTriangle className={cn('w-5 h-5', colors.text)} />
                              ) : (
                                <CheckCircle2 className={cn('w-5 h-5', colors.text)} />
                              )}
                              <span className={cn('text-sm font-medium', colors.text)}>{rec.title}</span>
                            </div>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full', colors.bg, colors.text)}>
                              {rec.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{rec.description}</p>
                          <p className="text-xs text-gray-500">{rec.impact}</p>
                          {rec.suggestedAction && (
                            <p className="text-sm text-primary-600 dark:text-primary-400 mt-2 font-medium">
                              {rec.suggestedAction}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stock Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-5 h-5 text-primary-500" />
                    <span className="text-sm text-gray-500">Current Stock</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedItem.currentStock.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-success-500" />
                    <span className="text-sm text-gray-500">Avg Daily Demand</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedItem.avgDailyDemand.toLocaleString()}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Chọn một item để xem forecast</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
