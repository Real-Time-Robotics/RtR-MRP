'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Wrench,
  Shield,
  DollarSign,
  Zap,
  Filter,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// AI INSIGHTS PAGE
// View and manage AI-generated insights and anomalies
// =============================================================================

interface AIInsight {
  id: string;
  category: 'FORECASTING' | 'MAINTENANCE' | 'QUALITY' | 'EFFICIENCY' | 'COST';
  type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  impact: string;
  confidence: number;
  dataPoints: number;
  generatedAt: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface Anomaly {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  value: number;
  expectedValue: number;
  deviation: number;
  detectedAt: string;
  source: string;
  status: string;
}

interface InsightsSummary {
  total: number;
  byCategory: { category: string; count: number }[];
  byPriority: { critical: number; high: number; medium: number; low: number };
}

const CATEGORY_CONFIG = {
  FORECASTING: { icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Forecasting' },
  MAINTENANCE: { icon: Wrench, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30', label: 'Maintenance' },
  QUALITY: { icon: Shield, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Quality' },
  EFFICIENCY: { icon: Zap, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30', label: 'Efficiency' },
  COST: { icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Cost' },
};

const PRIORITY_CONFIG = {
  CRITICAL: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800' },
  HIGH: { color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-200 dark:border-orange-800' },
  MEDIUM: { color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800' },
  LOW: { color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700' },
};

export default function AIInsightsPage() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'insights' | 'anomalies'>('insights');

  useEffect(() => {
    fetchData();
  }, [categoryFilter, priorityFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch insights
      let insightsUrl = '/api/v2/ai?view=insights';
      if (categoryFilter !== 'ALL') insightsUrl += `&category=${categoryFilter}`;
      if (priorityFilter !== 'ALL') insightsUrl += `&priority=${priorityFilter}`;

      const [insightsRes, anomaliesRes] = await Promise.all([
        fetch(insightsUrl),
        fetch('/api/v2/ai?view=anomalies'),
      ]);

      const insightsJson = await insightsRes.json();
      const anomaliesJson = await anomaliesRes.json();

      if (insightsJson.success) {
        setInsights(insightsJson.data.insights);
        setSummary(insightsJson.data.summary);
      }
      if (anomaliesJson.success) {
        setAnomalies(anomaliesJson.data.anomalies);
      }
    } catch (error) {
      clientLogger.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${diffDays} ngày trước`;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600">
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Insights</h1>
            <p className="text-gray-500 dark:text-gray-400">Phát hiện bất thường và đề xuất cải thiện</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Category Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          const count = summary?.byCategory.find(c => c.category === key)?.count || 0;
          return (
            <button
              key={key}
              onClick={() => setCategoryFilter(categoryFilter === key ? 'ALL' : key)}
              className={cn(
                'rounded-xl p-4 border transition-all',
                categoryFilter === key
                  ? `${config.bg} border-current ${config.color}`
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', config.bg)}>
                  <Icon className={cn('w-5 h-5', config.color)} />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                  <p className="text-xs text-gray-500">{config.label}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('insights')}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              activeTab === 'insights'
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            <Lightbulb className="w-4 h-4 inline mr-2" />
            Insights ({insights.length})
          </button>
          <button
            onClick={() => setActiveTab('anomalies')}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              activeTab === 'anomalies'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Anomalies ({anomalies.filter(a => a.status !== 'RESOLVED').length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Bộ lọc mức ưu tiên"
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'insights' ? (
        <div className="space-y-4">
          {insights.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Không có insights nào</p>
            </div>
          ) : (
            insights.map((insight) => {
              const catConfig = CATEGORY_CONFIG[insight.category];
              const prioConfig = PRIORITY_CONFIG[insight.priority];
              const CatIcon = catConfig.icon;

              return (
                <div
                  key={insight.id}
                  className={cn(
                    'bg-white dark:bg-gray-800 rounded-xl border p-6',
                    prioConfig.border
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn('p-3 rounded-xl', catConfig.bg)}>
                      <CatIcon className={cn('w-6 h-6', catConfig.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{insight.title}</h3>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full', prioConfig.bg, prioConfig.color)}>
                              {insight.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{insight.description}</p>
                          <p className="text-sm text-gray-500">{insight.impact}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                            <BarChart3 className="w-4 h-4" />
                            <span>Confidence: {insight.confidence}%</span>
                          </div>
                          <p className="text-xs text-gray-400">{insight.dataPoints} data points</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(insight.generatedAt)}
                          </span>
                          <span className={cn('px-2 py-0.5 rounded-full', catConfig.bg, catConfig.color)}>
                            {catConfig.label}
                          </span>
                        </div>
                        {insight.actionUrl && (
                          <Link
                            href={insight.actionUrl}
                            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
                          >
                            {insight.actionLabel || 'View Details'}
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {anomalies.filter(a => a.status !== 'RESOLVED').length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-gray-500">Không có bất thường nào đang active</p>
            </div>
          ) : (
            anomalies.filter(a => a.status !== 'RESOLVED').map((anomaly) => {
              const severityConfig = PRIORITY_CONFIG[anomaly.severity as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.LOW;

              return (
                <div
                  key={anomaly.id}
                  className={cn(
                    'bg-white dark:bg-gray-800 rounded-xl border p-6',
                    severityConfig.border
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn('p-3 rounded-xl', severityConfig.bg)}>
                      <AlertTriangle className={cn('w-6 h-6', severityConfig.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{anomaly.title}</h3>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full', severityConfig.bg, severityConfig.color)}>
                              {anomaly.severity}
                            </span>
                            <span className={cn(
                              'text-xs px-2 py-0.5 rounded-full',
                              anomaly.status === 'NEW' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                              anomaly.status === 'ACKNOWLEDGED' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' :
                              'bg-gray-100 dark:bg-gray-700 text-gray-600'
                            )}>
                              {anomaly.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{anomaly.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm">
                            <span className="text-gray-500">Value: </span>
                            <span className="font-medium text-gray-900 dark:text-white">{anomaly.value}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500">Expected: </span>
                            <span className="font-medium text-gray-900 dark:text-white">{anomaly.expectedValue}</span>
                          </div>
                          <div className={cn(
                            'text-sm font-bold',
                            anomaly.deviation > 0 ? 'text-red-500' : 'text-green-500'
                          )}>
                            {anomaly.deviation > 0 ? '+' : ''}{anomaly.deviation}%
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(anomaly.detectedAt)}
                          </span>
                          <span>Source: {anomaly.source}</span>
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                            {anomaly.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {anomaly.status === 'NEW' && (
                            <button className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg hover:bg-blue-200">
                              Acknowledge
                            </button>
                          )}
                          <button className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 rounded-lg hover:bg-gray-200">
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Priority Summary */}
      {summary && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Priority Distribution</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
              {summary.byPriority.critical > 0 && (
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${(summary.byPriority.critical / summary.total) * 100}%` }}
                />
              )}
              {summary.byPriority.high > 0 && (
                <div
                  className="h-full bg-orange-500"
                  style={{ width: `${(summary.byPriority.high / summary.total) * 100}%` }}
                />
              )}
              {summary.byPriority.medium > 0 && (
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${(summary.byPriority.medium / summary.total) * 100}%` }}
                />
              )}
              {summary.byPriority.low > 0 && (
                <div
                  className="h-full bg-gray-400"
                  style={{ width: `${(summary.byPriority.low / summary.total) * 100}%` }}
                />
              )}
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span>Critical ({summary.byPriority.critical})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-500 rounded" />
              <span>High ({summary.byPriority.high})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span>Medium ({summary.byPriority.medium})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-400 rounded" />
              <span>Low ({summary.byPriority.low})</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
