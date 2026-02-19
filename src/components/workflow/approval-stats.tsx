'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInHours } from 'date-fns';

interface WorkflowInstance {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  dueDate?: string | null;
}

interface PendingApproval {
  id: string;
  instanceId: string;
  requestedAt: string;
  dueDate: string | null;
}

interface ApprovalStatsProps {
  pendingApprovals: PendingApproval[];
  workflows: WorkflowInstance[];
  className?: string;
}

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  highlight?: boolean;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
  trend,
  highlight,
}: StatCardProps) {
  return (
    <Card className={cn(highlight && 'border-primary bg-primary/5')}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && (
              <div
                className={cn(
                  'flex items-center gap-1 mt-2 text-xs font-medium',
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {trend.value}% so với tuần trước
              </div>
            )}
          </div>
          <div className={cn('p-3 rounded-lg', iconBg)}>
            <Icon className={cn('w-5 h-5', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ApprovalStats({
  pendingApprovals,
  workflows,
  className,
}: ApprovalStatsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Pending count
    const pendingCount = pendingApprovals.length;

    // Urgent (< 4 hours remaining)
    const urgentCount = pendingApprovals.filter((a) => {
      if (!a.dueDate) return false;
      const hoursRemaining = differenceInHours(new Date(a.dueDate), now);
      return hoursRemaining > 0 && hoursRemaining < 4;
    }).length;

    // Overdue
    const overdueCount = pendingApprovals.filter((a) => {
      if (!a.dueDate) return false;
      return new Date(a.dueDate) < now;
    }).length;

    // Approved today
    const approvedToday = workflows.filter(
      (w) =>
        w.status === 'APPROVED' &&
        w.completedAt &&
        new Date(w.completedAt) >= today
    ).length;

    // Rejected today
    const rejectedToday = workflows.filter(
      (w) =>
        w.status === 'REJECTED' &&
        w.completedAt &&
        new Date(w.completedAt) >= today
    ).length;

    // Total processed today
    const processedToday = approvedToday + rejectedToday;

    // Approval rate (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentWorkflows = workflows.filter(
      (w) =>
        (w.status === 'APPROVED' || w.status === 'REJECTED') &&
        w.completedAt &&
        new Date(w.completedAt) >= sevenDaysAgo
    );
    const approvalRate =
      recentWorkflows.length > 0
        ? Math.round(
            (recentWorkflows.filter((w) => w.status === 'APPROVED').length /
              recentWorkflows.length) *
              100
          )
        : 0;

    return {
      pendingCount,
      urgentCount,
      overdueCount,
      approvedToday,
      rejectedToday,
      processedToday,
      approvalRate,
    };
  }, [pendingApprovals, workflows]);

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      <StatCard
        title="Chờ phê duyệt"
        value={stats.pendingCount}
        subtitle={stats.urgentCount > 0 ? `${stats.urgentCount} sắp hết hạn` : undefined}
        icon={Clock}
        iconColor="text-blue-600"
        iconBg="bg-blue-100 dark:bg-blue-900"
        highlight={stats.pendingCount > 0}
      />

      <StatCard
        title="Quá hạn"
        value={stats.overdueCount}
        subtitle="Cần xử lý ngay"
        icon={AlertTriangle}
        iconColor="text-red-600"
        iconBg="bg-red-100 dark:bg-red-900"
        highlight={stats.overdueCount > 0}
      />

      <StatCard
        title="Đã duyệt hôm nay"
        value={stats.approvedToday}
        subtitle={`${stats.rejectedToday} từ chối`}
        icon={CheckCircle}
        iconColor="text-green-600"
        iconBg="bg-green-100 dark:bg-green-900"
      />

      <StatCard
        title="Tỷ lệ phê duyệt"
        value={`${stats.approvalRate}%`}
        subtitle="7 ngày qua"
        icon={Timer}
        iconColor="text-purple-600"
        iconBg="bg-purple-100 dark:bg-purple-900"
      />
    </div>
  );
}

// Quick filter buttons component
interface QuickFiltersProps {
  activeFilter: 'all' | 'urgent' | 'overdue';
  onFilterChange: (filter: 'all' | 'urgent' | 'overdue') => void;
  counts: {
    all: number;
    urgent: number;
    overdue: number;
  };
}

export function ApprovalQuickFilters({
  activeFilter,
  onFilterChange,
  counts,
}: QuickFiltersProps) {
  const filters = [
    {
      key: 'all' as const,
      label: 'Tất cả',
      icon: Clock,
      count: counts.all,
    },
    {
      key: 'urgent' as const,
      label: 'Sắp hết hạn',
      icon: Timer,
      count: counts.urgent,
    },
    {
      key: 'overdue' as const,
      label: 'Quá hạn',
      icon: AlertTriangle,
      count: counts.overdue,
    },
  ];

  return (
    <div className="flex items-center gap-2">
      {filters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onFilterChange(filter.key)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            activeFilter === filter.key
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          <filter.icon className="w-4 h-4" />
          {filter.label}
          {filter.count > 0 && (
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-full text-xs',
                activeFilter === filter.key
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-background text-foreground'
              )}
            >
              {filter.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export default ApprovalStats;
