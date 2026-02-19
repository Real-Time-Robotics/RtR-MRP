'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PendingApprovals,
  WorkflowTimeline,
  ApprovalStats,
  ApprovalQuickFilters,
} from '@/components/workflow';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  History,
  RefreshCw,
  Timer,
  Search,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';

interface WorkflowInstance {
  id: string;
  entityType: string;
  entityId: string;
  status: string;
  currentStepNumber: number;
  startedAt: string;
  completedAt: string | null;
  dueDate?: string | null;
  workflow: {
    name: string;
    code: string;
  };
  initiatedByUser: {
    name: string | null;
    email: string;
  };
  _count: {
    approvals: number;
  };
}

interface PendingApproval {
  id: string;
  instanceId: string;
  requestedAt: string;
  dueDate: string | null;
  step: {
    name: string;
    stepNumber: number;
  };
  instance: {
    id: string;
    entityType: string;
    entityId: string;
    status: string;
    contextData: Record<string, unknown>;
    workflow: {
      name: string;
      code: string;
    };
  };
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  PENDING: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  IN_PROGRESS: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
  APPROVED: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  REJECTED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
  CANCELLED: { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-100' },
  ESCALATED: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100' },
};

export default function ApprovalsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [myWorkflows, setMyWorkflows] = useState<WorkflowInstance[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<'all' | 'urgent' | 'overdue'>('all');
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const sessionRes = await fetch('/api/auth/session');
      if (sessionRes.ok) {
        const session = await sessionRes.json();
        if (session?.user?.id) {
          setUserId(session.user.id);

          // Fetch user's initiated workflows and pending approvals in parallel
          const [workflowsRes, approvalsRes] = await Promise.all([
            fetch(`/api/workflows?userId=${session.user.id}&limit=50`),
            fetch(`/api/workflows/approvals?userId=${session.user.id}`),
          ]);

          if (workflowsRes.ok) {
            const data = await workflowsRes.json();
            setMyWorkflows(data.instances || []);
          }

          if (approvalsRes.ok) {
            const data = await approvalsRes.json();
            setPendingApprovals(data.approvals || []);
          }
        }
      }
    } catch (error) {
      clientLogger.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const now = new Date();
    return {
      all: pendingApprovals.length,
      urgent: pendingApprovals.filter((a) => {
        if (!a.dueDate) return false;
        const hoursRemaining = differenceInHours(new Date(a.dueDate), now);
        return hoursRemaining > 0 && hoursRemaining < 4;
      }).length,
      overdue: pendingApprovals.filter((a) => {
        if (!a.dueDate) return false;
        return new Date(a.dueDate) < now;
      }).length,
    };
  }, [pendingApprovals]);

  // Filter pending approvals based on quick filter
  const filteredApprovals = useMemo(() => {
    if (quickFilter === 'all') return pendingApprovals;

    const now = new Date();
    return pendingApprovals.filter((a) => {
      if (!a.dueDate) return false; // No due date means not urgent or overdue
      const hoursRemaining = differenceInHours(new Date(a.dueDate), now);

      if (quickFilter === 'urgent') {
        return hoursRemaining > 0 && hoursRemaining < 4;
      }
      if (quickFilter === 'overdue') {
        return hoursRemaining < 0;
      }
      return true;
    });
  }, [pendingApprovals, quickFilter]);

  // Filter workflows by search term
  const filteredWorkflows = useMemo(() => {
    if (!search.trim()) return myWorkflows;
    const q = search.toLowerCase();
    return myWorkflows.filter((w) =>
      w.workflow.name.toLowerCase().includes(q) ||
      w.entityType.toLowerCase().includes(q) ||
      w.entityId.toLowerCase().includes(q) ||
      w.status.toLowerCase().includes(q)
    );
  }, [myWorkflows, search]);

  const pendingCount = pendingApprovals.length;
  const completedCount = myWorkflows.filter((w) => w.status === 'APPROVED').length;
  const rejectedCount = myWorkflows.filter((w) => w.status === 'REJECTED').length;

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Phê duyệt
          </h1>
          <p className="text-muted-foreground">
            Quản lý các yêu cầu chờ phê duyệt và theo dõi quy trình
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Xóa tìm kiếm">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <ApprovalStats
        pendingApprovals={pendingApprovals}
        workflows={myWorkflows}
      />

      {/* Main Content */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Chờ phê duyệt
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="my-workflows" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Quy trình của tôi
          </TabsTrigger>
          {selectedInstance && (
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Timeline
            </TabsTrigger>
          )}
        </TabsList>

        {/* Pending Approvals Tab */}
        <TabsContent value="pending" className="space-y-4">
          {/* Quick Filters */}
          <div className="flex items-center justify-between">
            <ApprovalQuickFilters
              activeFilter={quickFilter}
              onFilterChange={setQuickFilter}
              counts={filterCounts}
            />
            {quickFilter !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuickFilter('all')}
              >
                Xóa bộ lọc
              </Button>
            )}
          </div>

          {userId ? (
            <PendingApprovals
              userId={userId}
              enableBulkActions={true}
              onApprovalComplete={loadData}
            />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Vui lòng đăng nhập để xem các yêu cầu chờ phê duyệt
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* My Workflows Tab */}
        <TabsContent value="my-workflows">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Quy trình tôi khởi tạo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredWorkflows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{search ? 'Không tìm thấy quy trình phù hợp' : 'Chưa có quy trình nào được khởi tạo'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredWorkflows.map((workflow) => {
                    const config = statusConfig[workflow.status] || statusConfig.PENDING;
                    const StatusIcon = config.icon;

                    return (
                      <div
                        key={workflow.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedInstance(workflow.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn('p-2 rounded-lg', config.bg)}>
                            <StatusIcon className={cn('w-4 h-4', config.color)} />
                          </div>
                          <div>
                            <p className="font-medium">{workflow.workflow.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {workflow.entityType}: {workflow.entityId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Bắt đầu{' '}
                              {formatDistanceToNow(new Date(workflow.startedAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={
                              workflow.status === 'APPROVED'
                                ? 'default'
                                : workflow.status === 'REJECTED'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className={
                              workflow.status === 'APPROVED'
                                ? 'bg-success-600'
                                : undefined
                            }
                          >
                            {workflow.status === 'APPROVED'
                              ? 'Đã duyệt'
                              : workflow.status === 'REJECTED'
                              ? 'Từ chối'
                              : workflow.status === 'PENDING' ||
                                workflow.status === 'IN_PROGRESS'
                              ? 'Đang xử lý'
                              : workflow.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Bước {workflow.currentStepNumber}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          {selectedInstance ? (
            <WorkflowTimeline instanceId={selectedInstance} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Chọn một quy trình để xem timeline
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
