'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Package, AlertTriangle, Clock, CheckCircle, RefreshCw } from 'lucide-react';

interface DashboardData {
  kpi: {
    totalOutput: number;
    totalScrap: number;
    scrapRate: number;
    totalDowntimeMinutes: number;
    totalLaborMinutes: number;
    onTimeRate: number;
    completedWOs: number;
  };
  trend: {
    outputChange: number;
    scrapRateChange: number;
  };
  workCenterBreakdown: Array<{ id: string; code: string; name: string; output: number; scrap: number; downtime: number }>;
  dailyTrend: Array<{ date: string; output: number; scrap: number; downtime: number }>;
  topDowntime: Array<{ id: string; workCenter: string; reason: string; durationMinutes: number; type: string }>;
}

type DateRange = 'today' | 'week' | 'month';

function getDateRange(range: DateRange): { from: string; to: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case 'today':
      return {
        from: today.toISOString().split('T')[0],
        to: new Date(today.getTime() + 86400000).toISOString().split('T')[0],
      };
    case 'week': {
      const day = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
      return {
        from: monday.toISOString().split('T')[0],
        to: new Date(today.getTime() + 86400000).toISOString().split('T')[0],
      };
    }
    case 'month':
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        to: new Date(today.getTime() + 86400000).toISOString().split('T')[0],
      };
  }
}

function TrendBadge({ value }: { value: number }) {
  if (Math.abs(value) < 0.1) return null;
  const isPositive = value > 0;
  return (
    <Badge variant={isPositive ? 'default' : 'destructive'} className="text-xs gap-1">
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? '+' : ''}{value.toFixed(1)}%
    </Badge>
  );
}

export default function ProductionReportPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>('today');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    const { from, to } = getDateRange(range);
    const res = await fetch(`/api/production/dashboard?from=${from}&to=${to}`);
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }, [range]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // Auto-refresh 5m for "today"
  useEffect(() => {
    if (range !== 'today') return;
    const interval = setInterval(fetchDashboard, 300000);
    return () => clearInterval(interval);
  }, [range, fetchDashboard]);

  if (loading || !data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Báo cáo sản xuất</h1>
        <p className="text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  const { kpi, trend, workCenterBreakdown, dailyTrend, topDowntime } = data;
  const maxWcOutput = Math.max(...workCenterBreakdown.map((wc) => wc.output), 1);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Báo cáo sản xuất</h1>
        <div className="flex items-center gap-2">
          {(['today', 'week', 'month'] as DateRange[]).map((r) => (
            <Button
              key={r}
              variant={range === r ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRange(r)}
            >
              {r === 'today' ? 'Hôm nay' : r === 'week' ? 'Tuần này' : 'Tháng này'}
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={fetchDashboard}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Package className="h-3 w-3" /> Sản lượng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{kpi.totalOutput}</p>
            <TrendBadge value={trend.outputChange} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Tỉ lệ phế phẩm
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${kpi.scrapRate <= 0.02 ? 'text-emerald-600' : kpi.scrapRate <= 0.05 ? 'text-amber-600' : 'text-red-600'}`}>
              {(kpi.scrapRate * 100).toFixed(1)}%
            </p>
            <TrendBadge value={-trend.scrapRateChange} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> On-time rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${kpi.onTimeRate >= 0.9 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {(kpi.onTimeRate * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">{kpi.completedWOs} WO done</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Downtime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">
              {kpi.totalDowntimeMinutes > 60
                ? `${(kpi.totalDowntimeMinutes / 60).toFixed(1)}h`
                : `${Math.round(kpi.totalDowntimeMinutes)}m`}
            </p>
            <p className="text-xs text-muted-foreground">Labor: {Math.round(kpi.totalLaborMinutes / 60)}h</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Work Center Bars */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sản lượng theo Work Center</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {workCenterBreakdown.length === 0 ? (
              <p className="text-muted-foreground text-sm">Chưa có dữ liệu.</p>
            ) : (
              workCenterBreakdown
                .sort((a, b) => b.output - a.output)
                .map((wc) => (
                  <div key={wc.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{wc.code} — {wc.name}</span>
                      <span>{wc.output} pcs</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-3 rounded-full bg-emerald-500"
                        style={{ width: `${(wc.output / maxWcOutput) * 100}%` }}
                      />
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>Scrap: {wc.scrap}</span>
                      <span>Downtime: {wc.downtime}m</span>
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        {/* Top Downtime Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top sự cố downtime</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topDowntime.length === 0 ? (
              <p className="text-muted-foreground text-sm">Không có sự cố.</p>
            ) : (
              topDowntime.map((dt, i) => (
                <div key={dt.id} className="flex items-center justify-between p-2 rounded-md bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{dt.workCenter}</p>
                      <p className="text-xs text-muted-foreground">{dt.reason}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={dt.type === 'BREAKDOWN' ? 'destructive' : 'secondary'} className="text-xs">
                      {dt.type}
                    </Badge>
                    <p className="text-xs font-medium mt-0.5">{dt.durationMinutes}m</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily trend (simple table chart) */}
      {dailyTrend.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Xu hướng theo ngày</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="text-left pb-2 font-normal">Ngày</th>
                    <th className="text-right pb-2 font-normal">Output</th>
                    <th className="text-right pb-2 font-normal">Scrap</th>
                    <th className="text-right pb-2 font-normal">Downtime</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyTrend.map((d) => (
                    <tr key={d.date} className="border-b border-slate-100">
                      <td className="py-1.5">{new Date(d.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}</td>
                      <td className="text-right font-medium">{d.output}</td>
                      <td className="text-right text-red-600">{d.scrap}</td>
                      <td className="text-right text-amber-600">{d.downtime}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
