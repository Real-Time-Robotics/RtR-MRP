'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, RefreshCw, Users, AlertTriangle, Package } from 'lucide-react';

interface ShiftReport {
  id: string;
  date: string;
  totalOutput: number;
  totalScrap: number;
  scrapRate: number | null;
  totalLaborMinutes: number;
  totalDowntimeMinutes: number;
  headcountPlanned: number;
  headcountActual: number;
  generatedAt: string;
  shift: { id: string; name: string; startTime: string; endTime: string };
  workCenter: { id: string; code: string; name: string } | null;
  generatedByUser: { id: string; name: string | null } | null;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

const SCRAP_THRESHOLDS = { good: 0.02, warn: 0.05 };

function scrapColor(rate: number | null): string {
  if (rate === null) return 'text-muted-foreground';
  if (rate <= SCRAP_THRESHOLDS.good) return 'text-emerald-600';
  if (rate <= SCRAP_THRESHOLDS.warn) return 'text-amber-600';
  return 'text-red-600';
}

export default function ShiftReportPage() {
  const [reports, setReports] = useState<ShiftReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateOffset, setDateOffset] = useState(0);
  const [generating, setGenerating] = useState(false);

  const refDate = new Date();
  refDate.setDate(refDate.getDate() + dateOffset);
  const dateStr = formatDate(refDate);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/production/shift-report?date=${dateStr}`);
    const data = await res.json();
    setReports(data.reports || []);
    setLoading(false);
  }, [dateStr]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  useEffect(() => {
    const interval = setInterval(fetchReports, 30000);
    return () => clearInterval(interval);
  }, [fetchReports]);

  const handleGenerate = async (shiftId: string, workCenterId: string) => {
    setGenerating(true);
    await fetch('/api/production/shift-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateStr, shiftId, workCenterId }),
    });
    await fetchReports();
    setGenerating(false);
  };

  const totalOutput = reports.reduce((s, r) => s + r.totalOutput, 0);
  const totalScrap = reports.reduce((s, r) => s + r.totalScrap, 0);
  const avgScrapRate = totalOutput + totalScrap > 0 ? totalScrap / (totalOutput + totalScrap) : 0;
  const totalDowntime = reports.reduce((s, r) => s + r.totalDowntimeMinutes, 0);
  const totalHeadcount = reports.reduce((s, r) => s + r.headcountActual, 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Báo cáo ca</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDateOffset((d) => d - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {refDate.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
          <Button variant="outline" size="sm" onClick={() => setDateOffset((d) => d + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDateOffset(0)}>Hôm nay</Button>
          <Button variant="ghost" size="sm" onClick={fetchReports} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="pt-4 pb-3 text-center"><p className="text-2xl font-bold">{totalOutput}</p><p className="text-xs text-muted-foreground">Sản lượng</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center"><p className={`text-2xl font-bold ${scrapColor(avgScrapRate)}`}>{(avgScrapRate * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">Phế phẩm</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center"><p className="text-2xl font-bold">{totalScrap}</p><p className="text-xs text-muted-foreground">Scrap qty</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center"><p className="text-2xl font-bold text-amber-600">{totalDowntime}m</p><p className="text-xs text-muted-foreground">Downtime</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center"><p className="text-2xl font-bold">{totalHeadcount}</p><p className="text-xs text-muted-foreground">Nhân sự</p></CardContent></Card>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">Đang tải...</p>
      ) : reports.length === 0 ? (
        <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground mb-4">Chưa có báo cáo ca cho ngày này.</p><p className="text-sm text-muted-foreground">Báo cáo sẽ tự động tạo khi ca kết thúc.</p></CardContent></Card>
      ) : (
        <Tabs defaultValue={reports[0]?.shift.id || ''}>
          <TabsList>
            {[...new Map(reports.map((r) => [r.shift.id, r.shift])).values()].map((shift) => (
              <TabsTrigger key={shift.id} value={shift.id}>{shift.name} ({shift.startTime}–{shift.endTime})</TabsTrigger>
            ))}
          </TabsList>

          {[...new Map(reports.map((r) => [r.shift.id, r.shift])).values()].map((shift) => {
            const shiftReports = reports.filter((r) => r.shift.id === shift.id);
            return (
              <TabsContent key={shift.id} value={shift.id} className="space-y-3 mt-3">
                {shiftReports.map((report) => (
                  <Card key={report.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          {report.workCenter?.name || 'Tất cả'}
                          <Badge variant="outline" className="ml-2 text-xs">{report.workCenter?.code}</Badge>
                        </CardTitle>
                        <span className="text-xs text-muted-foreground">Tạo: {new Date(report.generatedAt).toLocaleTimeString('vi-VN')}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div><Package className="h-4 w-4 mx-auto text-muted-foreground mb-1" /><p className="text-lg font-bold">{report.totalOutput}</p><p className="text-xs text-muted-foreground">Output</p></div>
                        <div><AlertTriangle className="h-4 w-4 mx-auto text-muted-foreground mb-1" /><p className={`text-lg font-bold ${scrapColor(report.scrapRate)}`}>{report.scrapRate !== null ? `${(report.scrapRate * 100).toFixed(1)}%` : '—'}</p><p className="text-xs text-muted-foreground">Scrap</p></div>
                        <div><Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" /><p className="text-lg font-bold">{report.headcountActual}/{report.headcountPlanned}</p><p className="text-xs text-muted-foreground">Người</p></div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Labor: {Math.round(report.totalLaborMinutes)}m · Downtime: {Math.round(report.totalDowntimeMinutes)}m</span>
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => report.workCenter && handleGenerate(shift.id, report.workCenter.id)} disabled={generating}>
                          <RefreshCw className="h-3 w-3 mr-1" /> Re-generate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
