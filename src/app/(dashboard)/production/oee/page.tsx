'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, TrendingUp, AlertCircle, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import {
  OEEGauge,
  OEEMiniGauge,
  OEEBars,
  SimpleLossChart,
  LiveStatusIndicator,
  ShiftInfo,
  EquipmentStatusSummary,
  AlertBadges,
} from '@/components/oee';
import { clientLogger } from '@/lib/client-logger';

interface OEEDashboard {
  overallOEE: number;
  avgAvailability: number;
  avgPerformance: number;
  avgQuality: number;
  workCenters: Array<{
    id: string;
    code: string;
    name: string;
    oee: number;
    availability: number;
    performance: number;
    quality: number;
    status: 'world_class' | 'good' | 'average' | 'poor';
  }>;
  topLosses: Array<{
    category: string;
    minutes: number;
    percentage: number;
  }>;
}

const REFRESH_INTERVAL = 30000; // 30 seconds

export default function OEEDashboardPage() {
  const [data, setData] = useState<OEEDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchOEE = useCallback(async () => {
    try {
      const res = await fetch('/api/production/oee');
      if (res.ok) {
        const result = await res.json();
        setData(result);
        setLastUpdate(new Date());
      }
    } catch (error) {
      clientLogger.error('Failed to fetch OEE:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOEE();
  }, [fetchOEE]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchOEE, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOEE]);

  // Calculate shift info (mock data - in real app would come from API)
  const getCurrentShift = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return { name: 'Morning Shift', start: '06:00', end: '14:00', progress: ((hour - 6) / 8) * 100 };
    if (hour >= 14 && hour < 22) return { name: 'Afternoon Shift', start: '14:00', end: '22:00', progress: ((hour - 14) / 8) * 100 };
    return { name: 'Night Shift', start: '22:00', end: '06:00', progress: hour >= 22 ? ((hour - 22) / 8) * 100 : ((hour + 2) / 8) * 100 };
  };

  const shift = getCurrentShift();

  // Equipment status summary (mock - would come from API)
  const equipmentStatus = {
    running: data?.workCenters.filter(wc => wc.status === 'world_class' || wc.status === 'good').length || 0,
    idle: data?.workCenters.filter(wc => wc.status === 'average').length || 0,
    warning: data?.workCenters.filter(wc => wc.status === 'poor' && wc.oee >= 30).length || 0,
    down: data?.workCenters.filter(wc => wc.status === 'poor' && wc.oee < 30).length || 0,
  };

  // Alert counts
  const alerts = {
    critical: data?.workCenters.filter(wc => wc.oee < 40).length || 0,
    warning: data?.workCenters.filter(wc => wc.oee >= 40 && wc.oee < 60).length || 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load OEE data</p>
        <Button variant="outline" onClick={fetchOEE} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'world_class': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'average': return 'text-yellow-600';
      default: return 'text-red-600';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'world_class': return 'bg-green-50 border-green-200';
      case 'good': return 'bg-blue-50 border-blue-200';
      case 'average': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-red-50 border-red-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Live Status */}
      <div className="flex items-center justify-between">
        <div>
          <PageHeader
            title="Real-time OEE Dashboard"
            description="Overall Equipment Effectiveness - Live monitoring"
          />
        </div>
        <div className="flex items-center gap-4">
          <LiveStatusIndicator isLive={autoRefresh} lastUpdate={lastUpdate} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Pause' : 'Resume'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchOEE}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border">
        <ShiftInfo
          shiftName={shift.name}
          startTime={shift.start}
          endTime={shift.end}
          progress={shift.progress}
          className="flex-1 max-w-xs"
        />
        <EquipmentStatusSummary {...equipmentStatus} />
        <AlertBadges {...alerts} />
      </div>

      {/* Main OEE Display */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Large OEE Gauge */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center">
            <OEEGauge
              value={data.overallOEE}
              target={85}
              size="lg"
              label="Overall OEE"
            />
            <div className="mt-4 w-full grid grid-cols-3 gap-2">
              <OEEMiniGauge value={data.avgAvailability} label="A" color="blue" />
              <OEEMiniGauge value={data.avgPerformance} label="P" color="green" />
              <OEEMiniGauge value={data.avgQuality} label="Q" color="purple" />
            </div>
          </CardContent>
        </Card>

        {/* OEE Breakdown */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              OEE Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Availability</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {data.avgAvailability.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-700"
                    style={{ width: `${data.avgAvailability}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Run Time / Planned Production Time
                </p>
                <div className="p-2 rounded bg-blue-50 dark:bg-blue-900/20 text-xs">
                  <span className="font-medium">Formula:</span> (Planned - Downtime) / Planned
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Performance</span>
                  <span className="text-2xl font-bold text-green-600">
                    {data.avgPerformance.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-700"
                    style={{ width: `${data.avgPerformance}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  (Ideal Cycle Time x Total Count) / Run Time
                </p>
                <div className="p-2 rounded bg-green-50 dark:bg-green-900/20 text-xs">
                  <span className="font-medium">Formula:</span> Ideal Time / Actual Run Time
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Quality</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {data.avgQuality.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all duration-700"
                    style={{ width: `${data.avgQuality}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Good Count / Total Count
                </p>
                <div className="p-2 rounded bg-purple-50 dark:bg-purple-900/20 text-xs">
                  <span className="font-medium">Formula:</span> (Total - Defects) / Total
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Work Centers and Losses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Work Center OEE */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Work Center OEE (This Week)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.workCenters?.map((wc) => (
                <div
                  key={wc.id}
                  className={`flex items-center gap-4 p-3 rounded-lg border ${getStatusBg(wc.status)}`}
                >
                  <div className="flex-1">
                    <p className="font-medium">{wc.code}</p>
                    <p className="text-sm text-muted-foreground">{wc.name}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${getStatusColor(wc.status)}`}>
                      {wc.oee.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {wc.status.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-center min-w-[120px]">
                    <div className="p-1 rounded bg-white/50 dark:bg-gray-800/50">
                      <p className="font-medium text-blue-600">{wc.availability.toFixed(0)}%</p>
                      <p className="text-muted-foreground">A</p>
                    </div>
                    <div className="p-1 rounded bg-white/50 dark:bg-gray-800/50">
                      <p className="font-medium text-green-600">{wc.performance.toFixed(0)}%</p>
                      <p className="text-muted-foreground">P</p>
                    </div>
                    <div className="p-1 rounded bg-white/50 dark:bg-gray-800/50">
                      <p className="font-medium text-purple-600">{wc.quality.toFixed(0)}%</p>
                      <p className="text-muted-foreground">Q</p>
                    </div>
                  </div>
                </div>
              ))}
              {data.workCenters.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">
                  No work centers with OEE data this week
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Losses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Top Losses (Pareto Analysis)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleLossChart losses={data.topLosses} />

            <div className="mt-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                Focus Area
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {data.topLosses[0]?.category || 'N/A'} represents the largest loss.
                Reducing this by 20% could improve OEE by approximately{' '}
                {((data.topLosses[0]?.percentage || 0) * 0.2 * (100 - data.overallOEE) / 100).toFixed(1)}%.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* OEE Reference */}
      <Card>
        <CardHeader>
          <CardTitle>OEE Reference (TPM World Class Standards)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-2xl font-bold text-red-600">&lt; 50%</p>
              <p className="text-sm text-red-700 dark:text-red-400">Poor</p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-1">Significant improvement needed</p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <p className="text-2xl font-bold text-yellow-600">50-70%</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">Average</p>
              <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">Room for improvement</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-2xl font-bold text-blue-600">70-85%</p>
              <p className="text-sm text-blue-700 dark:text-blue-400">Good</p>
              <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">Typical for discrete manufacturers</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <p className="text-2xl font-bold text-green-600">&gt; 85%</p>
              <p className="text-sm text-green-700 dark:text-green-400">World Class</p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">Best-in-class performance</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
