'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, RefreshCw, Settings, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  AlertCard,
  AlertSummaryCard,
  AIDigestPanel,
  AlertFilterBar,
} from '@/components/ai/alerts';
import {
  AlertPriority,
  AlertSource,
  AlertStatus,
  Alert,
  AlertCounts,
} from '@/lib/ai/alerts';
import { clientLogger } from '@/lib/client-logger';

export default function AlertCenterPage() {
  const { toast } = useToast();

  // State
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [counts, setCounts] = useState<AlertCounts>({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    unread: 0,
    pendingAction: 0,
    escalated: 0,
  });
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedPriorities, setSelectedPriorities] = useState<AlertPriority[]>([]);
  const [selectedSources, setSelectedSources] = useState<AlertSource[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<AlertStatus | 'all'>('all');
  const [activeTab, setActiveTab] = useState('all');

  // Fetch alerts
  const fetchAlerts = useCallback(async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);

      const params = new URLSearchParams();
      if (refresh) params.set('refresh', 'true');
      params.set('includeSummary', 'true');

      if (selectedPriorities.length > 0) {
        params.set('priorities', selectedPriorities.join(','));
      }
      if (selectedSources.length > 0) {
        params.set('sources', selectedSources.join(','));
      }
      if (selectedStatus !== 'all') {
        params.set('statuses', selectedStatus);
      }
      if (search) {
        params.set('search', search);
      }

      const response = await fetch(`/api/ai/alerts?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setAlerts(data.data.alerts);
        setCounts(data.data.counts);
        if (data.data.aiSummary) {
          setAiSummary(data.data.aiSummary);
        }
      }
    } catch (error) {
      clientLogger.error('Failed to fetch alerts:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách cảnh báo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedPriorities, selectedSources, selectedStatus, search, toast]);

  // Initial fetch
  useEffect(() => {
    fetchAlerts(true);
  }, []);

  // Refetch when filters change
  useEffect(() => {
    fetchAlerts();
  }, [selectedPriorities, selectedSources, selectedStatus, search]);

  // Handle action
  const handleAction = async (alertId: string, actionId: string) => {
    try {
      const response = await fetch('/api/ai/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          alertId,
          actionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Thành công',
          description: data.data.message,
        });
        fetchAlerts();
      } else {
        toast({
          title: 'Lỗi',
          description: data.data?.error || 'Không thể thực hiện hành động',
          variant: 'destructive',
        });
      }
    } catch (error) {
      clientLogger.error('Failed to execute action:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể thực hiện hành động',
        variant: 'destructive',
      });
    }
  };

  // Handle dismiss
  const handleDismiss = async (alertId: string) => {
    try {
      const response = await fetch('/api/ai/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dismiss',
          alertId,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Đã bỏ qua',
          description: 'Cảnh báo đã được bỏ qua',
        });
        fetchAlerts();
      }
    } catch (error) {
      clientLogger.error('Failed to dismiss:', error);
    }
  };

  // Handle snooze
  const handleSnooze = async (alertId: string) => {
    try {
      const response = await fetch('/api/ai/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulkSnooze',
          alertIds: [alertId],
          durationHours: 4,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Đã tạm ẩn',
          description: 'Cảnh báo sẽ ẩn trong 4 giờ',
        });
        fetchAlerts();
      }
    } catch (error) {
      clientLogger.error('Failed to snooze:', error);
    }
  };

  // Filter by priority
  const handleFilterByPriority = (priority: AlertPriority) => {
    setSelectedPriorities([priority]);
    setActiveTab('all');
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearch('');
    setSelectedPriorities([]);
    setSelectedSources([]);
    setSelectedStatus('all');
  };

  // Filter alerts by tab
  const getFilteredAlerts = () => {
    let filtered = alerts;

    switch (activeTab) {
      case 'critical':
        filtered = alerts.filter(a => a.priority === AlertPriority.CRITICAL);
        break;
      case 'pending':
        filtered = alerts.filter(a =>
          a.status === AlertStatus.ACTIVE &&
          a.actions.some(action => action.isPrimary)
        );
        break;
      case 'history':
        filtered = alerts.filter(a =>
          a.status === AlertStatus.DISMISSED ||
          a.status === AlertStatus.RESOLVED
        );
        break;
    }

    return filtered;
  };

  const filteredAlerts = getFilteredAlerts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Alert Center</h1>
            <p className="text-muted-foreground">
              Quản lý tất cả cảnh báo từ các module AI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => fetchAlerts(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Cài đặt
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <AlertSummaryCard
          counts={counts}
          onFilterByPriority={handleFilterByPriority}
        />
      )}

      {/* AI Summary */}
      <AIDigestPanel
        summary={aiSummary}
        isLoading={isLoading}
        onRefresh={() => fetchAlerts(true)}
      />

      {/* Filters */}
      <AlertFilterBar
        search={search}
        onSearchChange={setSearch}
        selectedPriorities={selectedPriorities}
        onPrioritiesChange={setSelectedPriorities}
        selectedSources={selectedSources}
        onSourcesChange={setSelectedSources}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        onClearFilters={handleClearFilters}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            Tất cả ({counts.total})
          </TabsTrigger>
          <TabsTrigger value="critical" className="text-red-600">
            Khẩn cấp ({counts.critical})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Cần xử lý ({counts.pendingAction})
          </TabsTrigger>
          <TabsTrigger value="history">
            Lịch sử
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : filteredAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Không có cảnh báo</h3>
                <p className="text-muted-foreground">
                  {activeTab === 'critical'
                    ? 'Không có cảnh báo khẩn cấp nào'
                    : activeTab === 'pending'
                      ? 'Không có cảnh báo nào cần xử lý'
                      : 'Không có cảnh báo nào phù hợp với bộ lọc'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAction={handleAction}
                  onDismiss={handleDismiss}
                  onSnooze={handleSnooze}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Stats */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Chưa đọc</p>
              <p className="text-2xl font-bold">{counts.unread}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Cần xử lý</p>
              <p className="text-2xl font-bold">{counts.pendingAction}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Đã escalate</p>
              <p className="text-2xl font-bold">{counts.escalated}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Tổng cộng</p>
              <p className="text-2xl font-bold">{counts.total}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
