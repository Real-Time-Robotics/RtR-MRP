'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  RefreshCw,
  Bell,
  TrendingDown,
  TrendingUp,
  Package
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AnomalyItem {
  date: string;
  value: number;
  isAnomaly: boolean;
  anomalyScore: number;
}

interface PartAnomaly {
  partId: string;
  partNumber?: string;
  partName?: string;
  anomalies: AnomalyItem[];
  anomalyCount: number;
  totalRecords: number;
  contamination: number;
  analyzedAt: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

const severityConfig = {
  critical: { icon: AlertTriangle, color: 'destructive' as const, bg: 'bg-red-50 dark:bg-red-950', border: 'border-red-200 dark:border-red-800' },
  high: { icon: AlertCircle, color: 'destructive' as const, bg: 'bg-orange-50 dark:bg-orange-950', border: 'border-orange-200 dark:border-orange-800' },
  medium: { icon: Info, color: 'secondary' as const, bg: 'bg-yellow-50 dark:bg-yellow-950', border: 'border-yellow-200 dark:border-yellow-800' },
  low: { icon: CheckCircle, color: 'outline' as const, bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-200 dark:border-blue-800' },
};

function calculateSeverity(anomalyCount: number, totalRecords: number): 'low' | 'medium' | 'high' | 'critical' {
  const ratio = anomalyCount / totalRecords;
  if (ratio > 0.3) return 'critical';
  if (ratio > 0.2) return 'high';
  if (ratio > 0.1) return 'medium';
  return 'low';
}

export function AnomalyAlerts() {
  const [anomalies, setAnomalies] = useState<PartAnomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [mlOnline, setMlOnline] = useState<boolean | null>(null);

  const checkAnomalies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // First check if ML service is online
      const healthRes = await fetch('/api/ml/health');
      const healthData = await healthRes.json();
      setMlOnline(healthData.status !== 'offline');

      if (healthData.status === 'offline') {
        setAnomalies([]);
        setLastChecked(new Date());
        setLoading(false);
        return;
      }

      // Get parts to check for anomalies
      const partsRes = await fetch('/api/parts?limit=10&type=COMPONENT');
      const partsData = await partsRes.json();
      const parts = partsData.parts || [];

      if (parts.length === 0) {
        setAnomalies([]);
        setLastChecked(new Date());
        setLoading(false);
        return;
      }

      // Check anomalies for each part
      const anomalyResults: PartAnomaly[] = [];

      for (const part of parts.slice(0, 5)) {
        try {
          const res = await fetch('/api/ml/anomaly', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              partId: part.id,
              lookbackDays: 90,
              contamination: 0.1,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.anomalyCount > 0) {
              const severity = calculateSeverity(data.anomalyCount, data.totalRecords);
              anomalyResults.push({
                ...data,
                partNumber: part.partNumber,
                partName: part.name,
                severity,
                trend: data.anomalyCount > 3 ? 'up' : 'stable',
              });
            }
          }
        } catch {
          // Skip failed part checks
        }
      }

      // Sort by severity
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      anomalyResults.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      setAnomalies(anomalyResults);
      setLastChecked(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check anomalies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAnomalies();
    // Auto-refresh every 5 minutes
    const interval = setInterval(checkAnomalies, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkAnomalies]);

  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
  const highCount = anomalies.filter(a => a.severity === 'high').length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            AI Anomaly Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            AI Anomaly Detection
          </CardTitle>
          {lastChecked && (
            <p className="text-xs text-muted-foreground mt-1">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {mlOnline === false && (
            <Badge variant="outline" className="text-muted-foreground">
              ML Offline
            </Badge>
          )}
          {criticalCount > 0 && (
            <Badge variant="destructive">{criticalCount} Critical</Badge>
          )}
          {highCount > 0 && (
            <Badge variant="secondary">{highCount} High</Badge>
          )}
          <Button variant="outline" size="sm" onClick={checkAnomalies} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {mlOnline === false ? (
          <div className="text-center py-6 text-muted-foreground">
            <Info className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">ML Service is offline</p>
            <p className="text-xs">Anomaly detection requires the ML service</p>
          </div>
        ) : anomalies.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
            <p className="font-medium">No anomalies detected</p>
            <p className="text-xs">All inventory patterns are normal</p>
          </div>
        ) : (
          <div className="space-y-3">
            {anomalies.slice(0, 4).map((anomaly) => {
              const config = severityConfig[anomaly.severity];
              const Icon = config.icon;

              return (
                <div
                  key={anomaly.partId}
                  className={`p-3 rounded-lg border ${config.bg} ${config.border}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <Icon className="w-4 h-4 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">
                          {anomaly.partNumber || anomaly.partId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {anomaly.partName}
                        </p>
                      </div>
                    </div>
                    <Badge variant={config.color}>{anomaly.severity}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {anomaly.anomalyCount} anomalies
                    </span>
                    <span>
                      {((anomaly.anomalyCount / anomaly.totalRecords) * 100).toFixed(1)}% rate
                    </span>
                    {anomaly.trend === 'up' && (
                      <span className="flex items-center gap-1 text-red-600">
                        <TrendingUp className="w-3 h-3" />
                        Increasing
                      </span>
                    )}
                    {anomaly.trend === 'down' && (
                      <span className="flex items-center gap-1 text-green-600">
                        <TrendingDown className="w-3 h-3" />
                        Decreasing
                      </span>
                    )}
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

export default AnomalyAlerts;
