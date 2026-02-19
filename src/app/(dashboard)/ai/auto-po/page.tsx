'use client';

// =============================================================================
// AUTO-PO PAGE - Main page for AI-powered Purchase Order suggestions
// 4 Tabs: Queue | History | Analytics | Settings
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Bot,
  ListChecks,
  History,
  BarChart3,
  Settings,
  RefreshCw,
  Play,
  Pause,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Building2,
  AlertTriangle,
  Info,
  Calendar,
} from 'lucide-react';
import type { POSuggestion } from '@/components/ai/auto-po';
import dynamic from 'next/dynamic';
import { formatCurrency, formatDate } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';

// Lazy-load heavy auto-PO AI components (~1100 lines total)
const ApprovalQueue = dynamic(
  () => import('@/components/ai/auto-po/approval-queue').then(mod => mod.ApprovalQueue),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted h-64 rounded-lg" />,
  }
);

const BulkApprovalModal = dynamic(
  () => import('@/components/ai/auto-po/bulk-approval-modal').then(mod => mod.BulkApprovalModal),
  {
    ssr: false,
    loading: () => null,
  }
);

const ConfidenceIndicator = dynamic(
  () => import('@/components/ai/auto-po/confidence-indicator').then(mod => mod.ConfidenceIndicator),
  { ssr: false, loading: () => <div className="animate-pulse bg-muted h-4 w-12 rounded" /> }
);

// Types
interface QueueStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  executed: number;
}

interface AnalyticsData {
  approvalRate: string;
  rejectionRate: string;
  avgProcessingTime: number | null;
  totalSuggestedValue: number;
  approvedValue: number;
  executedValue: number;
  byConfidence: {
    high: number;
    medium: number;
    low: number;
  };
}

interface AutoPOSettings {
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly';
  confidenceThreshold: number;
  autoApproveHighConfidence: boolean;
  notifyOnNewSuggestion: boolean;
  notifyOnApproval: boolean;
  maxSuggestionsPerRun: number;
}

export default function AutoPOPage() {
  const router = useRouter();
  const { toast } = useToast();

  // State
  const [activeTab, setActiveTab] = useState('queue');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Queue state
  const [suggestions, setSuggestions] = useState<POSuggestion[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);

  // History state
  const [history, setHistory] = useState<POSuggestion[]>([]);
  const [historyFilter, setHistoryFilter] = useState<string>('all');
  const [historyPage, setHistoryPage] = useState(1);

  // Analytics state
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30d');

  // Settings state
  const [settings, setSettings] = useState<AutoPOSettings>({
    enabled: true,
    frequency: 'daily',
    confidenceThreshold: 60,
    autoApproveHighConfidence: false,
    notifyOnNewSuggestion: true,
    notifyOnApproval: true,
    maxSuggestionsPerRun: 50,
  });

  // Modal state
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject'>('approve');
  const [selectedForBulk, setSelectedForBulk] = useState<POSuggestion[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Fetch data
  const fetchQueueData = useCallback(async () => {
    try {
      const [queueRes, statsRes] = await Promise.all([
        fetch('/api/ai/auto-po/queue?status=pending&limit=100'),
        fetch('/api/ai/auto-po/stats'),
      ]);

      if (queueRes.ok) {
        const queueData = await queueRes.json();
        setSuggestions(queueData.items || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setQueueStats(statsData.stats?.queue || null);
        setAnalytics({
          approvalRate: statsData.stats?.rates?.approval || '0%',
          rejectionRate: statsData.stats?.rates?.rejection || '0%',
          avgProcessingTime: statsData.stats?.performance?.avgProcessingTimeMinutes || null,
          totalSuggestedValue: statsData.stats?.value?.totalSuggestedValue || 0,
          approvedValue: statsData.stats?.value?.approvedValue || 0,
          executedValue: statsData.stats?.value?.executedValue || 0,
          byConfidence: statsData.stats?.byConfidence || { high: 0, medium: 0, low: 0 },
        });
      }
    } catch (error) {
      clientLogger.error('Failed to fetch queue data:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải dữ liệu hàng đợi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  const fetchHistory = useCallback(async () => {
    try {
      const status = historyFilter === 'all' ? '' : `&status=${historyFilter}`;
      const res = await fetch(
        `/api/ai/auto-po/queue?${status}&page=${historyPage}&limit=20&sortBy=updatedAt&sortOrder=desc`
      );
      if (res.ok) {
        const data = await res.json();
        setHistory(data.items || []);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch history:', error);
    }
  }, [historyFilter, historyPage]);

  useEffect(() => {
    fetchQueueData();
  }, [fetchQueueData]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Handlers
  const handleRefresh = () => {
    setRefreshing(true);
    fetchQueueData();
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch('/api/ai/auto-po/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueItemId: id }),
      });

      if (res.ok) {
        toast({
          title: 'Thành công',
          description: 'Đã phê duyệt đề xuất PO',
        });
        fetchQueueData();
      } else {
        throw new Error('Failed to approve');
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể phê duyệt đề xuất',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await fetch('/api/ai/auto-po/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueItemId: id, reason: 'Từ chối bởi người dùng' }),
      });

      if (res.ok) {
        toast({
          title: 'Đã từ chối',
          description: 'Đề xuất PO đã bị từ chối',
        });
        fetchQueueData();
      } else {
        throw new Error('Failed to reject');
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể từ chối đề xuất',
        variant: 'destructive',
      });
    }
  };

  const handleBulkApprove = (ids: string[]) => {
    const selected = suggestions.filter((s) => ids.includes(s.id));
    setSelectedForBulk(selected);
    setBulkAction('approve');
    setBulkModalOpen(true);
  };

  const handleBulkReject = (ids: string[]) => {
    const selected = suggestions.filter((s) => ids.includes(s.id));
    setSelectedForBulk(selected);
    setBulkAction('reject');
    setBulkModalOpen(true);
  };

  const handleBulkConfirm = async (notes: string) => {
    setBulkLoading(true);
    try {
      const endpoint = bulkAction === 'approve' ? '/api/ai/auto-po/approve' : '/api/ai/auto-po/reject';
      const body =
        bulkAction === 'approve'
          ? { queueItemIds: selectedForBulk.map((s) => s.id), notes }
          : { queueItemIds: selectedForBulk.map((s) => s.id), reason: notes };

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: 'Thành công',
          description: `Đã ${bulkAction === 'approve' ? 'phê duyệt' : 'từ chối'} ${data.summary?.approved || data.summary?.rejected || 0} đề xuất`,
        });
        setBulkModalOpen(false);
        fetchQueueData();
      } else {
        throw new Error('Failed to process bulk action');
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: `Không thể ${bulkAction === 'approve' ? 'phê duyệt' : 'từ chối'} hàng loạt`,
        variant: 'destructive',
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleViewDetails = (id: string) => {
    router.push(`/ai/auto-po/${id}`);
  };

  const handleGenerateSuggestions = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/ai/auto-po', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoAddToQueue: true,
          includeAIEnhancement: true,
          filters: {
            minConfidence: settings.confidenceThreshold / 100,
            maxSuggestions: settings.maxSuggestionsPerRun,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: 'Thành công',
          description: `Đã tạo ${data.suggestions?.length || 0} đề xuất PO mới`,
        });
        fetchQueueData();
      } else {
        throw new Error('Failed to generate');
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo đề xuất PO',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      // In a real app, save to backend
      toast({
        title: 'Đã lưu',
        description: 'Cài đặt Auto-PO đã được cập nhật',
      });
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu cài đặt',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Auto-PO</h1>
            <p className="text-sm text-muted-foreground">
              Đề xuất đơn mua hàng tự động bằng AI
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          <Button onClick={handleGenerateSuggestions} disabled={refreshing}>
            <Play className="h-4 w-4 mr-2" />
            Tạo đề xuất mới
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {queueStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Chờ duyệt</span>
              </div>
              <p className="text-2xl font-bold mt-1">{queueStats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Đã duyệt</span>
              </div>
              <p className="text-2xl font-bold mt-1">{queueStats.approved}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Từ chối</span>
              </div>
              <p className="text-2xl font-bold mt-1">{queueStats.rejected}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Đã thực hiện</span>
              </div>
              <p className="text-2xl font-bold mt-1">{queueStats.executed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Giá trị duyệt</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(analytics?.approvedValue || 0, true)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            <span className="hidden sm:inline">Hàng đợi</span>
            {queueStats && queueStats.pending > 0 && (
              <Badge variant="secondary" className="ml-1">
                {queueStats.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Lịch sử</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Phân tích</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Cài đặt</span>
          </TabsTrigger>
        </TabsList>

        {/* Queue Tab */}
        <TabsContent value="queue" className="mt-6">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <Skeleton className="h-20 w-full mb-2" />
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <ApprovalQueue
              suggestions={suggestions}
              loading={refreshing}
              onApprove={handleApprove}
              onReject={handleReject}
              onBulkApprove={handleBulkApprove}
              onBulkReject={handleBulkReject}
              onViewDetails={handleViewDetails}
              onRefresh={handleRefresh}
            />
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Lịch sử phê duyệt</CardTitle>
                <Select value={historyFilter} onValueChange={setHistoryFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Lọc trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="approved">Đã duyệt</SelectItem>
                    <SelectItem value="rejected">Từ chối</SelectItem>
                    <SelectItem value="executed">Đã thực hiện</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã part</TableHead>
                      <TableHead>Nhà cung cấp</TableHead>
                      <TableHead>Số lượng</TableHead>
                      <TableHead>Giá trị</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Độ tin cậy</TableHead>
                      <TableHead>Ngày</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewDetails(item.id)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.partNumber}</p>
                            <p className="text-xs text-muted-foreground">{item.partName}</p>
                          </div>
                        </TableCell>
                        <TableCell>{item.supplierName}</TableCell>
                        <TableCell>{item.quantity.toLocaleString()}</TableCell>
                        <TableCell>{formatCurrency(item.totalAmount)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.status === 'approved'
                                ? 'default'
                                : item.status === 'rejected'
                                ? 'destructive'
                                : item.status === 'executed'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {item.status === 'approved'
                              ? 'Đã duyệt'
                              : item.status === 'rejected'
                              ? 'Từ chối'
                              : item.status === 'executed'
                              ? 'Đã thực hiện'
                              : 'Chờ duyệt'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ConfidenceIndicator score={item.confidence} size="sm" showLabel={false} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Approval Rate */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Tỷ lệ phê duyệt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-green-600">
                  {analytics?.approvalRate || '0%'}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Tỷ lệ từ chối: {analytics?.rejectionRate || '0%'}
                </p>
              </CardContent>
            </Card>

            {/* Processing Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Thời gian xử lý trung bình
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">
                  {analytics?.avgProcessingTime ? `${analytics.avgProcessingTime} phút` : 'N/A'}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Từ lúc tạo đến khi phê duyệt
                </p>
              </CardContent>
            </Card>

            {/* Value Stats */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Giá trị đề xuất
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Tổng đề xuất</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(analytics?.totalSuggestedValue || 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Đã phê duyệt</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(analytics?.approvedValue || 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Đã thực hiện</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(analytics?.executedValue || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Confidence Distribution */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Phân bố độ tin cậy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Cao (≥80%)</p>
                    <p className="text-2xl font-bold text-green-600">
                      {analytics?.byConfidence?.high || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Trung bình</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {analytics?.byConfidence?.medium || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Thấp (&lt;60%)</p>
                    <p className="text-2xl font-bold text-red-600">
                      {analytics?.byConfidence?.low || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cài đặt Auto-PO</CardTitle>
              <CardDescription>
                Tùy chỉnh hành vi của hệ thống đề xuất PO tự động
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Bật Auto-PO</Label>
                  <p className="text-sm text-muted-foreground">
                    Cho phép hệ thống tự động tạo đề xuất PO
                  </p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enabled: checked })
                  }
                />
              </div>

              {/* Frequency */}
              <div className="space-y-2">
                <Label>Tần suất tạo đề xuất</Label>
                <Select
                  value={settings.frequency}
                  onValueChange={(value: 'hourly' | 'daily' | 'weekly') =>
                    setSettings({ ...settings, frequency: value })
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Mỗi giờ</SelectItem>
                    <SelectItem value="daily">Mỗi ngày</SelectItem>
                    <SelectItem value="weekly">Mỗi tuần</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Confidence Threshold */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Ngưỡng độ tin cậy tối thiểu</Label>
                  <span className="font-medium">{settings.confidenceThreshold}%</span>
                </div>
                <Slider
                  value={[settings.confidenceThreshold]}
                  onValueChange={([value]) =>
                    setSettings({ ...settings, confidenceThreshold: value })
                  }
                  min={0}
                  max={100}
                  step={5}
                />
                <p className="text-sm text-muted-foreground">
                  Chỉ tạo đề xuất khi độ tin cậy AI ≥ {settings.confidenceThreshold}%
                </p>
              </div>

              {/* Auto-approve */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Tự động phê duyệt độ tin cậy cao</Label>
                  <p className="text-sm text-muted-foreground">
                    Tự động phê duyệt đề xuất có độ tin cậy ≥ 90%
                  </p>
                </div>
                <Switch
                  checked={settings.autoApproveHighConfidence}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, autoApproveHighConfidence: checked })
                  }
                />
              </div>

              {/* Max suggestions */}
              <div className="space-y-2">
                <Label>Số đề xuất tối đa mỗi lần</Label>
                <Input
                  type="number"
                  value={settings.maxSuggestionsPerRun}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxSuggestionsPerRun: parseInt(e.target.value) || 50,
                    })
                  }
                  className="w-[100px]"
                  min={1}
                  max={200}
                />
              </div>

              {/* Notifications */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium">Thông báo</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Thông báo đề xuất mới</Label>
                    <p className="text-sm text-muted-foreground">
                      Nhận thông báo khi có đề xuất PO mới
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifyOnNewSuggestion}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, notifyOnNewSuggestion: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Thông báo phê duyệt</Label>
                    <p className="text-sm text-muted-foreground">
                      Nhận thông báo khi đề xuất được phê duyệt
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifyOnApproval}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, notifyOnApproval: checked })
                    }
                  />
                </div>
              </div>

              {/* Save button */}
              <div className="pt-4 border-t">
                <Button onClick={handleSaveSettings}>
                  Lưu cài đặt
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Approval Modal */}
      <BulkApprovalModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        suggestions={selectedForBulk}
        action={bulkAction}
        onConfirm={handleBulkConfirm}
        loading={bulkLoading}
      />
    </div>
  );
}
