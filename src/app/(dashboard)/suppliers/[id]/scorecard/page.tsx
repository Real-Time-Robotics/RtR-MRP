'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus,
  Package, CheckCircle, DollarSign, Clock,
  Plus, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui-v2/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { AuditForm } from '@/components/suppliers/audit-form';

// ===========================================================================
// Helpers
// ===========================================================================

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

function scoreBg(score: number) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

function scoreBadgeClass(score: number) {
  if (score >= 80) return 'bg-green-100 text-green-800';
  if (score >= 60) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

function trendIcon(value: number) {
  if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-gray-400" />;
}

const auditTypeLabels: Record<string, string> = {
  quality: 'Chất lượng',
  compliance: 'Tuân thủ',
  financial: 'Tài chính',
  site_visit: 'Thăm nhà máy',
};

const auditStatusLabels: Record<string, string> = {
  scheduled: 'Đã lên lịch',
  in_progress: 'Đang thực hiện',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

// ===========================================================================
// KPI Card
// ===========================================================================

interface KPICardProps {
  title: string;
  icon: React.ReactNode;
  score: number;
  trend?: number;
  weight: string;
}

function KPICard({ title, icon, score, trend, weight }: KPICardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-2">{icon} {title}</span>
          <span className="text-xs">{weight}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <p className={`text-3xl font-bold ${scoreColor(score)}`}>
            {score.toFixed(1)}
          </p>
          {trend !== undefined && (
            <div className="flex items-center gap-1 text-sm">
              {trendIcon(trend)}
              <span className={trend >= 0 ? 'text-green-600' : 'text-red-600'}>
                {trend >= 0 ? '+' : ''}{trend.toFixed(1)}
              </span>
            </div>
          )}
        </div>
        <div className="mt-2 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${scoreBg(score)}`}
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ===========================================================================
// Component
// ===========================================================================

interface ScoreData {
  latestScore: any;
  trend: any;
  history: any[];
}

interface AuditItem {
  id: string;
  supplierId: string;
  auditDate: string;
  auditType: string;
  auditorId: string;
  score: number | null;
  findings: string | null;
  recommendations: string | null;
  nextAuditDate: string | null;
  status: string;
}

export default function SupplierScorecardPage() {
  const router = useRouter();
  const params = useParams();
  const supplierId = params.id as string;

  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [scoresRes, auditsRes, supplierRes] = await Promise.all([
        fetch(`/api/suppliers/${supplierId}/scores`),
        fetch(`/api/suppliers/${supplierId}/audits`),
        fetch(`/api/suppliers/${supplierId}`),
      ]);

      const scoresJson = await scoresRes.json();
      const auditsJson = await auditsRes.json();
      const supplierJson = await supplierRes.json();

      if (scoresJson.success) setScoreData(scoresJson.data);
      if (auditsJson.success) setAudits(auditsJson.data);
      if (supplierJson.success) {
        const s = supplierJson.data;
        setSupplierName(`${s.name} (${s.code})`);
      }
    } catch {
      toast.error('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const periodEnd = new Date();
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - 90);

      const res = await fetch(`/api/suppliers/${supplierId}/scores/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
        }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success(`Đã tính điểm: ${result.data.overallScore.toFixed(1)}/100`);
        fetchData();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Có lỗi xảy ra');
    } finally {
      setCalculating(false);
    }
  };

  const handleAuditSuccess = () => {
    setAuditDialogOpen(false);
    fetchData();
    toast.success('Đã lưu audit');
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const latest = scoreData?.latestScore;
  const trend = scoreData?.trend;

  return (
    <div className="space-y-6 container mx-auto max-w-6xl py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" iconOnly onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{supplierName || 'Scorecard'}</h1>
            <p className="text-sm text-muted-foreground">
              {latest
                ? `Cập nhật: ${formatDate(latest.calculatedAt)}`
                : 'Chưa có dữ liệu — bấm Tính điểm'}
            </p>
          </div>
        </div>
        <Button onClick={handleCalculate} disabled={calculating}>
          <RefreshCw className={`mr-2 h-4 w-4 ${calculating ? 'animate-spin' : ''}`} />
          Tính điểm (90 ngày)
        </Button>
      </div>

      {/* Overall Score */}
      {latest && (
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Điểm tổng hợp</p>
                <p className={`text-5xl font-bold ${scoreColor(latest.overallScore)}`}>
                  {latest.overallScore.toFixed(1)}
                  <span className="text-lg text-muted-foreground">/100</span>
                </p>
              </div>
              {trend && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">So với kỳ trước</p>
                  <div className="flex items-center gap-2 text-2xl justify-end">
                    {trendIcon(trend.overall)}
                    <span className={trend.overall >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {trend.overall >= 0 ? '+' : ''}{trend.overall.toFixed(1)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Giao hàng"
            icon={<Package className="h-4 w-4" />}
            score={latest.deliveryScore}
            trend={trend?.delivery}
            weight="30%"
          />
          <KPICard
            title="Chất lượng"
            icon={<CheckCircle className="h-4 w-4" />}
            score={latest.qualityScore}
            trend={trend?.quality}
            weight="30%"
          />
          <KPICard
            title="Giá"
            icon={<DollarSign className="h-4 w-4" />}
            score={latest.priceScore}
            trend={trend?.price}
            weight="25%"
          />
          <KPICard
            title="Phản hồi"
            icon={<Clock className="h-4 w-4" />}
            score={latest.responseScore}
            trend={trend?.response}
            weight="15%"
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="stats" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stats">Thống kê</TabsTrigger>
          <TabsTrigger value="history">Lịch sử ({scoreData?.history?.length || 0})</TabsTrigger>
          <TabsTrigger value="audits">Audit ({audits.length})</TabsTrigger>
        </TabsList>

        {/* Stats Tab */}
        <TabsContent value="stats">
          {latest ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Giao hàng</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tổng đơn hàng</span>
                    <span className="font-medium">{latest.totalOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Đúng hạn</span>
                    <span className="font-medium text-green-600">{latest.onTimeOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trễ hạn</span>
                    <span className="font-medium text-red-600">{latest.lateOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lead time TB</span>
                    <span className="font-medium">
                      {latest.avgLeadTimeDays !== null ? `${latest.avgLeadTimeDays} ngày` : 'N/A'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Chất lượng</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tổng SP nhận</span>
                    <span className="font-medium">{latest.totalItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chấp nhận</span>
                    <span className="font-medium text-green-600">{latest.acceptedItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Từ chối</span>
                    <span className="font-medium text-red-600">{latest.rejectedItems}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Giá</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chênh lệch TB</span>
                    <span className={`font-medium ${
                      (latest.avgPriceVariance || 0) <= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {latest.avgPriceVariance !== null
                        ? `${latest.avgPriceVariance >= 0 ? '+' : ''}${latest.avgPriceVariance.toFixed(1)}%`
                        : 'N/A'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Chưa có dữ liệu. Bấm &quot;Tính điểm (90 ngày)&quot; để bắt đầu.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kỳ</TableHead>
                    <TableHead className="text-center">Giao hàng</TableHead>
                    <TableHead className="text-center">Chất lượng</TableHead>
                    <TableHead className="text-center">Giá</TableHead>
                    <TableHead className="text-center">Phản hồi</TableHead>
                    <TableHead className="text-center">Tổng điểm</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!scoreData?.history || scoreData.history.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Chưa có lịch sử
                      </TableCell>
                    </TableRow>
                  ) : (
                    scoreData.history.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-sm">
                          {formatDate(s.periodStart)} — {formatDate(s.periodEnd)}
                        </TableCell>
                        <TableCell className={`text-center font-mono ${scoreColor(s.deliveryScore)}`}>
                          {s.deliveryScore.toFixed(1)}
                        </TableCell>
                        <TableCell className={`text-center font-mono ${scoreColor(s.qualityScore)}`}>
                          {s.qualityScore.toFixed(1)}
                        </TableCell>
                        <TableCell className={`text-center font-mono ${scoreColor(s.priceScore)}`}>
                          {s.priceScore.toFixed(1)}
                        </TableCell>
                        <TableCell className={`text-center font-mono ${scoreColor(s.responseScore)}`}>
                          {s.responseScore.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={scoreBadgeClass(s.overallScore)}>
                            {s.overallScore.toFixed(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audits Tab */}
        <TabsContent value="audits">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Lịch sử Audit</CardTitle>
              <Dialog open={auditDialogOpen} onOpenChange={setAuditDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Thêm Audit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tạo Audit mới</DialogTitle>
                  </DialogHeader>
                  <AuditForm
                    supplierId={supplierId}
                    onSuccess={handleAuditSuccess}
                    onCancel={() => setAuditDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead className="text-center">Điểm</TableHead>
                    <TableHead>Phát hiện</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Chưa có audit nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    audits.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{formatDate(a.auditDate)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {auditTypeLabels[a.auditType] || a.auditType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {a.score !== null ? (
                            <span className={scoreColor(a.score)}>{a.score}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {a.findings || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {auditStatusLabels[a.status] || a.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
