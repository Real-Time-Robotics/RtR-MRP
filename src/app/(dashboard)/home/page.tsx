'use client';

// =============================================================================
// ENTERPRISE MRP DASHBOARD - Industrial Precision ULTRA COMPACT
// Data-dense layout like Bloomberg Terminal / Excel
// =============================================================================

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CompactStatsBar } from '@/components/ui/compact-stats-bar';
import { LivePanel } from '@/components/ui/live-panel';
import { AutoRefreshBar } from '@/components/ui/auto-refresh-bar';
import { BreakingAlertBanner, type BreakingAlert } from '@/components/ui/breaking-alert-banner';
import { TickingValue } from '@/components/ui/ticking-value';
import { LiveRelativeTime } from '@/components/ui/live-relative-time';
import { DataFreshnessBadge } from '@/components/ui/data-freshness-badge';
import {
  Package,
  ShoppingCart,
  Factory,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Loader2,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  BarChart3,
  Users,
  Truck,
  Boxes,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Zap,
  Target,
  Calendar,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { PendingApprovals } from '@/components/workflow';
import { toast } from 'sonner';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// TYPES
// =============================================================================

interface DashboardData {
  pendingOrders: number;
  pendingOrdersValue: number;
  criticalStock: number;
  activePOs: number;
  activePOsValue: number;
  reorderAlerts: number;
}

interface WorkOrder {
  id: string;
  number: string;
  product: string;
  quantity: number;
  completed: number;
  status: 'running' | 'paused' | 'completed' | 'delayed';
  progress: number;
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  time: string;
}

interface OEEData {
  overallOEE: number;
  avgAvailability: number;
  avgQuality: number;
}

interface WorkOrderSummary {
  completed: number;
  inProgress: number;
  pending: number;
  issues: number;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Map API work order status string to dashboard display status */
function mapWoStatus(status: string): WorkOrder['status'] {
  const s = status.toUpperCase();
  if (s === 'IN_PROGRESS' || s === 'RELEASED') return 'running';
  if (s === 'ON_HOLD') return 'paused';
  if (s === 'COMPLETED' || s === 'CLOSED') return 'completed';
  if (s === 'DELAYED' || s === 'OVERDUE') return 'delayed';
  // draft, cancelled, etc. fall through
  return 'paused';
}

/** Map API alert priority to dashboard alert type */
function mapAlertPriority(priority: string): Alert['type'] {
  const p = priority.toUpperCase();
  if (p === 'CRITICAL') return 'critical';
  if (p === 'HIGH') return 'warning';
  return 'info';
}

/** Format relative time in Vietnamese */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
}

// =============================================================================
// ULTRA COMPACT COMPONENTS
// =============================================================================

/** KpiTile — Clickable live metric tile for dashboard KPI grid */
function KpiTile({
  label,
  value,
  icon: Icon,
  href,
  severity = 'default',
  pulse = false,
  tooltip,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  href: string;
  severity?: 'default' | 'success' | 'warning' | 'danger';
  pulse?: boolean;
  tooltip?: string;
}) {
  const router = useRouter();

  const severityStyles = {
    default: {
      border: 'border-gray-200 dark:border-mrp-border',
      icon: 'text-gray-500 dark:text-mrp-text-muted',
      value: 'text-gray-900 dark:text-mrp-text-primary',
      bg: '',
    },
    success: {
      border: 'border-production-green/30',
      icon: 'text-production-green',
      value: 'text-production-green',
      bg: '',
    },
    warning: {
      border: 'border-alert-amber/30',
      icon: 'text-alert-amber',
      value: 'text-alert-amber',
      bg: 'bg-alert-amber-dim',
    },
    danger: {
      border: 'border-urgent-red/40',
      icon: 'text-urgent-red',
      value: 'text-urgent-red',
      bg: 'bg-urgent-red-dim',
    },
  };

  const s = severityStyles[severity];

  return (
    <button
      onClick={() => router.push(href)}
      aria-label={`${label}: ${typeof value === 'number' ? value.toLocaleString() : value}`}
      title={tooltip}
      className={cn(
        'relative flex flex-col items-center gap-0.5 p-2 border bg-white dark:bg-gunmetal transition-all',
        'hover:bg-gray-50 dark:hover:bg-gunmetal-light cursor-pointer touch-manipulation active:scale-[0.97]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
        s.border,
        s.bg,
      )}
    >
      {/* Pulse indicator for critical metrics */}
      {pulse && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-urgent-red animate-[pulse-dot_1s_infinite]" />
      )}

      <Icon className={cn('w-3.5 h-3.5', s.icon)} />

      <span className={cn('text-base font-mono font-bold tabular-nums leading-none', s.value)}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>

      <span className="text-[8px] font-mono uppercase tracking-wider text-gray-500 dark:text-mrp-text-muted text-center leading-tight truncate max-w-full" title={label}>
        {label}
      </span>
    </button>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  status = 'default',
  onClick,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  status?: 'default' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}) {
  const statusColors = {
    default: 'border-gray-200 dark:border-mrp-border',
    success: 'border-production-green/50',
    warning: 'border-alert-amber/50',
    danger: 'border-urgent-red/50',
  };

  const iconBg = {
    default: 'bg-gray-100 dark:bg-info-cyan-dim text-gray-600 dark:text-info-cyan',
    success: 'bg-production-green-dim text-production-green',
    warning: 'bg-alert-amber-dim text-alert-amber',
    danger: 'bg-urgent-red-dim text-urgent-red',
  };

  return (
    <div
      className={cn(
        // COMPACT: p-4 → p-3, min-h reduced
        'bg-white dark:bg-gunmetal border p-3 transition-all min-h-[72px]',
        statusColors[status],
        onClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gunmetal-light touch-manipulation active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1'
      )}
      onClick={onClick}
      {...(onClick ? {
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } },
      } : {})}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          {/* COMPACT: text-xs → text-[10px] */}
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-mrp-text-secondary">
            {title}
          </p>
          {/* COMPACT: text-2xl → text-xl */}
          <p className="text-xl font-semibold font-mono tabular-nums text-gray-900 dark:text-mrp-text-primary leading-none">
            {value}
          </p>
          {subtitle && (
            <p className="text-[10px] font-mono text-gray-500 dark:text-mrp-text-muted">
              {subtitle}
            </p>
          )}
          {trend && trendValue && (
            <div className={cn(
              'flex items-center gap-0.5 text-[10px] font-medium',
              trend === 'up' && 'text-production-green',
              trend === 'down' && 'text-urgent-red',
              trend === 'neutral' && 'text-gray-500'
            )}>
              {trend === 'up' && <TrendingUp className="w-2.5 h-2.5" />}
              {trend === 'down' && <TrendingDown className="w-2.5 h-2.5" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {/* COMPACT: w-10 h-10 → w-8 h-8 */}
        <div className={cn('w-8 h-8 flex items-center justify-center', iconBg[status])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

function ProductionStatusCard({ order }: { order: WorkOrder }) {
  const { t } = useLanguage();
  const statusConfig = {
    running: { icon: Play, color: 'text-production-green bg-production-green-dim', label: t('dashboard.woRunning') },
    paused: { icon: Pause, color: 'text-alert-amber bg-alert-amber-dim', label: t('dashboard.woPaused') },
    completed: { icon: CheckCircle2, color: 'text-info-cyan bg-info-cyan-dim', label: t('dashboard.woCompleted') },
    delayed: { icon: AlertCircle, color: 'text-urgent-red bg-urgent-red-dim', label: t('dashboard.woDelayed') },
  };

  const config = statusConfig[order.status];
  const StatusIcon = config.icon;

  return (
    // COMPACT: gap-4 → gap-2, p-3 → p-2
    <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-steel-dark border border-gray-200 dark:border-mrp-border">
      {/* COMPACT: w-8 h-8 → w-6 h-6 */}
      <div className={cn('w-6 h-6 flex items-center justify-center flex-shrink-0', config.color)}>
        <StatusIcon className="w-3 h-3" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono font-medium text-gray-900 dark:text-mrp-text-primary">
            {order.number}
          </span>
          <span className={cn('px-1 py-0.5 text-[8px] font-bold font-mono', config.color)}>
            {config.label}
          </span>
        </div>
        <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted truncate">
          {order.product}
        </p>
      </div>

      {/* COMPACT: w-24 → w-20 */}
      <div className="w-20">
        <div className="flex items-center justify-between text-[9px] font-mono mb-0.5">
          <span className="text-gray-500 dark:text-mrp-text-muted">{order.completed}/{order.quantity}</span>
          <span className="font-medium text-gray-900 dark:text-mrp-text-primary">{order.progress}%</span>
        </div>
        <div className="h-1 bg-gray-200 dark:bg-mrp-border">
          <div
            className={cn(
              'h-full w-full origin-left transition-transform',
              order.status === 'completed' ? 'bg-info-cyan' :
              order.status === 'delayed' ? 'bg-urgent-red' :
              order.status === 'paused' ? 'bg-alert-amber' : 'bg-production-green'
            )}
            style={{ transform: `scaleX(${(order.progress || 0) / 100})` }}
          />
        </div>
      </div>
    </div>
  );
}

function AlertItem({ alert }: { alert: Alert }) {
  const typeConfig = {
    critical: { icon: XCircle, color: 'text-urgent-red', bg: 'bg-urgent-red-dim' },
    warning: { icon: AlertTriangle, color: 'text-alert-amber', bg: 'bg-alert-amber-dim' },
    info: { icon: Activity, color: 'text-info-cyan', bg: 'bg-info-cyan-dim' },
  };

  const config = typeConfig[alert.type];
  const Icon = config.icon;

  return (
    // Mobile-optimized with larger touch target
    <div className="flex items-start gap-2 p-2.5 sm:p-2 border-b border-gray-100 dark:border-mrp-border/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gunmetal-light transition-colors cursor-pointer touch-manipulation active:bg-gray-100 dark:active:bg-gunmetal">
      {/* Larger icon on mobile */}
      <div className={cn('w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0', config.bg)}>
        <Icon className={cn('w-3.5 h-3.5 sm:w-3 sm:h-3', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-[11px] text-gray-900 dark:text-mrp-text-primary leading-tight">
          {alert.title}
        </p>
        <p className="text-[10px] sm:text-[9px] text-gray-500 dark:text-mrp-text-muted">
          {alert.time}
        </p>
      </div>
    </div>
  );
}

function QuickActionButton({
  label,
  icon: Icon,
  href,
  color,
}: {
  label: string;
  icon: React.ElementType;
  href: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      // Mobile-optimized with larger touch target
      className="flex items-center gap-2 p-2.5 sm:p-2 bg-gray-50 dark:bg-steel-dark border border-gray-200 dark:border-mrp-border hover:bg-gray-100 dark:hover:bg-gunmetal transition-colors group touch-manipulation active:scale-[0.98]"
    >
      {/* Larger icon on mobile */}
      <div className={cn('w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center', color)}>
        <Icon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs sm:text-[11px] font-medium text-gray-900 dark:text-mrp-text-primary truncate block">
          {label}
        </span>
      </div>
      <ChevronRight className="w-4 h-4 sm:w-3 sm:h-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-mrp-text-primary transition-colors flex-shrink-0" />
    </Link>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function HomePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Real data states (replacing mock data)
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [workOrdersLoading, setWorkOrdersLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertCriticalCount, setAlertCriticalCount] = useState(0);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [oeeData, setOeeData] = useState<OEEData | null>(null);
  const [oeeLoading, setOeeLoading] = useState(true);
  const [woSummary, setWoSummary] = useState<WorkOrderSummary>({ completed: 0, inProgress: 0, pending: 0, issues: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [breakingAlerts, setBreakingAlerts] = useState<BreakingAlert[]>([]);

  // Fetch all dashboard data
  const fetchAllData = useCallback(async (showRefreshToast = false) => {
    if (showRefreshToast) setRefreshing(true);

    // 1. Dashboard stats (existing)
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        } else {
          setError('Không thể tải dữ liệu bảng điều khiển');
        }
      } catch (err) {
        clientLogger.error('Failed to fetch dashboard stats:', err);
        setError('Không thể kết nối đến máy chủ');
      } finally {
        setLoading(false);
      }
    };

    // 2. Work orders from /api/production
    const fetchWorkOrders = async () => {
      try {
        const res = await fetch('/api/production?pageSize=10&sortBy=updatedAt&sortOrder=desc');
        if (res.ok) {
          const data = await res.json();
          // data shape: { data: [...], pagination: {...}, meta: {...} }
          const items = data.data || [];

          // Map API work orders to dashboard WorkOrder shape
          const mapped: WorkOrder[] = items.map((wo: Record<string, unknown>) => {
            const quantity = (wo.quantity as number) || 0;
            const completedQty = (wo.completedQty as number) || 0;
            const progress = quantity > 0 ? Math.round((completedQty / quantity) * 100) : 0;
            return {
              id: wo.id as string,
              number: wo.woNumber as string,
              product: (wo.product as Record<string, unknown>)?.name as string || 'N/A',
              quantity,
              completed: completedQty,
              status: mapWoStatus(wo.status as string),
              progress,
            };
          });

          setWorkOrders(mapped.slice(0, 5));

          // Compute today's summary from ALL fetched work orders
          const summary: WorkOrderSummary = { completed: 0, inProgress: 0, pending: 0, issues: 0 };
          for (const wo of items) {
            const s = ((wo as Record<string, unknown>).status as string || '').toUpperCase();
            if (s === 'COMPLETED' || s === 'CLOSED') summary.completed++;
            else if (s === 'IN_PROGRESS' || s === 'RELEASED') summary.inProgress++;
            else if (s === 'DRAFT' || s === 'PLANNED') summary.pending++;
            else if (s === 'ON_HOLD' || s === 'DELAYED' || s === 'OVERDUE' || s === 'CANCELLED') summary.issues++;
          }
          setWoSummary(summary);
        }
      } catch (err) {
        clientLogger.error('Failed to fetch work orders:', err);
        // Silently fail - work orders section will show empty state
      } finally {
        setWorkOrdersLoading(false);
      }
    };

    // 3. Alerts from /api/ai/alerts
    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/ai/alerts?limit=5&sortField=createdAt&sortDirection=desc');
        if (res.ok) {
          const data = await res.json();
          // data shape: { success, data: { alerts: [...], counts: {...}, pagination: {...} } }
          const apiAlerts = data.data?.alerts || [];
          const counts = data.data?.counts;

          const mapped: Alert[] = apiAlerts.map((a: Record<string, unknown>) => ({
            id: a.id as string,
            type: mapAlertPriority(a.priority as string),
            title: a.title as string,
            time: a.createdAt ? formatRelativeTime(a.createdAt as string) : '',
          }));

          setAlerts(mapped);
          setAlertCriticalCount(counts?.critical ?? mapped.filter((a: Alert) => a.type === 'critical').length);

          // Generate breaking alert banners from critical alerts
          const criticals = mapped.filter((a: Alert) => a.type === 'critical');
          if (criticals.length > 0) {
            setBreakingAlerts(criticals.map((a: Alert) => ({
              id: a.id,
              type: 'critical' as const,
              message: a.title,
              link: '/alerts',
              dismissAfterMs: 60_000,
            })));
          }
        }
      } catch (err) {
        clientLogger.error('Failed to fetch alerts:', err);
        // Silently fail - alerts section will show empty state
      } finally {
        setAlertsLoading(false);
      }
    };

    // 4. OEE from /api/production/oee
    const fetchOEE = async () => {
      try {
        const res = await fetch('/api/production/oee');
        if (res.ok) {
          const data = await res.json();
          // data shape: { overallOEE, avgAvailability, avgPerformance, avgQuality, workCenters: [...] }
          setOeeData({
            overallOEE: data.overallOEE ?? 0,
            avgAvailability: data.avgAvailability ?? 0,
            avgQuality: data.avgQuality ?? 0,
          });
        }
      } catch (err) {
        clientLogger.error('Failed to fetch OEE data:', err);
        // Silently fail - OEE cards will show fallback
      } finally {
        setOeeLoading(false);
      }
    };

    // 5. User session (existing)
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const session = await res.json();
          if (session?.user?.id) {
            setUserId(session.user.id);
          }
        }
      } catch (err) {
        clientLogger.error('Failed to fetch user session:', err);
      }
    };

    // Run all fetches in parallel
    await Promise.allSettled([
      fetchStats(),
      fetchWorkOrders(),
      fetchAlerts(),
      fetchOEE(),
      fetchUser(),
    ]);

    setLastUpdated(new Date());

    if (showRefreshToast) {
      setRefreshing(false);
      toast.success('Dữ liệu đã được cập nhật');
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'decimal',
      maximumFractionDigits: 0
    }).format(value) + ' ₫';
  };

  if (loading) {
    return (
      <div className="space-y-3 pb-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-7 w-24" />
        </div>
        {/* KPI grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 p-2 border border-gray-200 dark:border-mrp-border bg-white dark:bg-gunmetal">
              <Skeleton className="w-3.5 h-3.5 rounded" />
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-2 w-12" />
            </div>
          ))}
        </div>
        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          <div className="lg:col-span-2 border border-gray-200 dark:border-mrp-border p-3 space-y-2">
            <Skeleton className="h-4 w-32" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
          <div className="border border-gray-200 dark:border-mrp-border p-3 space-y-2">
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // OEE metrics - from real API or fallback to 0
  const oee = oeeData?.overallOEE ?? 0;
  const uptime = oeeData?.avgAvailability ?? 0;
  const quality = oeeData?.avgQuality ?? 0;
  const oeeAvailable = !oeeLoading && oeeData !== null;

  return (
    // COMPACT: space-y-6 → space-y-3, pb-8 → pb-4
    <div className="space-y-3 pb-4">
      {/* Page Header - Real-time aware */}
      <div className="flex items-start sm:items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary truncate">
              {t('dashboard.title')}
            </h1>
            <DataFreshnessBadge lastUpdated={lastUpdated} />
          </div>
          <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-mrp-text-muted">
            <span>{t('dashboard.description')}</span>
            <span className="hidden sm:inline"> • {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </p>
        </div>
        {/* Auto-refresh bar replaces manual refresh button */}
        <AutoRefreshBar
          intervalMs={60_000}
          onRefresh={() => fetchAllData(true)}
        />
      </div>

      {/* Breaking alerts banner */}
      <BreakingAlertBanner
        alerts={breakingAlerts}
        onDismiss={(id) => setBreakingAlerts((prev) => prev.filter((a) => a.id !== id))}
      />

      {error && (
        <div className="p-2 bg-alert-amber-dim border border-alert-amber/30 text-alert-amber text-[11px] font-mono">
          {error}
        </div>
      )}

      {/* KPI Tiles — Clickable, live, visual */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
        <KpiTile
          label={t('dashboard.pendingOrders')}
          value={stats?.pendingOrders ?? 0}
          icon={ShoppingCart}
          href="/orders"
          severity={(stats?.pendingOrders ?? 0) > 5 ? 'warning' : 'default'}
          tooltip="Đơn hàng: Số lượng đơn hàng chờ xử lý"
        />
        <KpiTile
          label={t('dashboard.criticalStock')}
          value={stats?.criticalStock ?? 0}
          icon={AlertTriangle}
          href="/inventory"
          severity={(stats?.criticalStock ?? 0) > 0 ? 'danger' : 'success'}
          pulse={(stats?.criticalStock ?? 0) > 0}
          tooltip="Tồn kho: Số mặt hàng dưới mức tồn kho tối thiểu"
        />
        <KpiTile
          label={t('dashboard.activePOs')}
          value={stats?.activePOs ?? 0}
          icon={Package}
          href="/purchase-orders"
          severity="default"
          tooltip="Đơn mua: Số đơn đặt hàng đang xử lý"
        />
        <KpiTile
          label={t('dashboard.reorderAlerts')}
          value={stats?.reorderAlerts ?? 0}
          icon={AlertCircle}
          href="/alerts"
          severity={(stats?.reorderAlerts ?? 0) > 0 ? 'warning' : 'success'}
          pulse={(stats?.reorderAlerts ?? 0) > 3}
          tooltip="Cảnh báo: Số cảnh báo đặt hàng lại cần xử lý"
        />
        <KpiTile
          label={t('dashboard.oee')}
          value={oeeLoading ? '...' : `${oee.toFixed(1)}%`}
          icon={Activity}
          href="/production"
          severity={oee >= 85 ? 'success' : oee >= 60 ? 'warning' : 'danger'}
          tooltip="OEE: Hiệu suất thiết bị tổng thể (%)"
        />
        <KpiTile
          label={t('dashboard.uptime')}
          value={oeeLoading ? '...' : `${uptime.toFixed(1)}%`}
          icon={Target}
          href="/production"
          severity={uptime >= 90 ? 'success' : uptime >= 70 ? 'warning' : 'danger'}
          tooltip="Khả dụng: Tỷ lệ thời gian máy hoạt động (%)"
        />
        <KpiTile
          label={t('dashboard.qualityRate')}
          value={oeeLoading ? '...' : `${quality.toFixed(1)}%`}
          icon={CheckCircle2}
          href="/quality"
          severity={quality >= 95 ? 'success' : quality >= 85 ? 'warning' : 'danger'}
          tooltip="Chất lượng: Tỷ lệ sản phẩm đạt yêu cầu (%)"
        />
        <KpiTile
          label={t('dashboard.activeWorkOrders')}
          value={workOrdersLoading ? '...' : workOrders.filter(wo => wo.status === 'running').length}
          icon={Factory}
          href="/production"
          severity="default"
          tooltip="Sản xuất: Số lệnh sản xuất đang thực hiện"
        />
      </div>

      {/* Main Content Grid - COMPACT: gap-6 → gap-2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Production Status — LivePanel with freshness */}
        <LivePanel
          title={t('dashboard.productionStatus')}
          icon={<Factory className="w-3.5 h-3.5 text-info-cyan" />}
          lastUpdated={lastUpdated}
          action={
            <Link
              href="/production"
              className="text-[10px] font-mono uppercase tracking-wider text-gray-500 dark:text-mrp-text-muted hover:text-info-cyan transition-colors flex items-center gap-0.5"
            >
              {t('dashboard.viewAll')}
              <ArrowRight className="w-3 h-3" />
            </Link>
          }
          className="lg:col-span-2"
          contentClassName="space-y-1"
        >
          {workOrdersLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-info-cyan" />
              <span className="ml-2 text-[11px] text-gray-500 dark:text-mrp-text-muted">Đang tải dữ liệu sản xuất...</span>
            </div>
          ) : workOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Factory className="h-8 w-8 text-gray-300 dark:text-mrp-border" />
              <span className="text-[11px] font-medium text-gray-500 dark:text-mrp-text-muted">Chưa có lệnh sản xuất</span>
              <span className="text-[10px] text-gray-400 dark:text-mrp-text-muted">Tạo lệnh sản xuất mới để bắt đầu theo dõi tiến độ</span>
            </div>
          ) : (
            workOrders.map((order) => (
              <ProductionStatusCard key={order.id} order={order} />
            ))
          )}
        </LivePanel>

        {/* Alerts Panel — LivePanel with freshness + critical count */}
        <LivePanel
          title={t('dashboard.alerts')}
          icon={
            <>
              <AlertCircle className="w-3.5 h-3.5 text-alert-amber" />
              {alertCriticalCount > 0 && (
                <span className="px-1 py-0.5 text-[9px] font-bold bg-urgent-red-dim text-urgent-red animate-[pulse-dot_1.5s_infinite]">
                  {alertCriticalCount}
                </span>
              )}
            </>
          }
          lastUpdated={lastUpdated}
          action={
            <Link
              href="/alerts"
              className="text-[10px] font-mono uppercase tracking-wider text-gray-500 dark:text-mrp-text-muted hover:text-info-cyan transition-colors"
            >
              {t('dashboard.viewAll')}
            </Link>
          }
          contentClassName="p-0 max-h-[240px] overflow-y-auto"
        >
          {alertsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-info-cyan" />
              <span className="ml-2 text-[11px] text-gray-500 dark:text-mrp-text-muted">Đang tải cảnh báo...</span>
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle2 className="h-8 w-8 text-production-green/50" />
              <span className="text-[11px] font-medium text-gray-500 dark:text-mrp-text-muted">Không có cảnh báo</span>
              <span className="text-[10px] text-gray-400 dark:text-mrp-text-muted">Hệ thống đang hoạt động bình thường</span>
            </div>
          ) : (
            alerts.map((a) => (
              <AlertItem key={a.id} alert={a} />
            ))
          )}
        </LivePanel>
      </div>

      {/* Pending Approvals - Workflow */}
      {userId && (
        <PendingApprovals userId={userId} />
      )}

      {/* Quick Actions & Summary - COMPACT: gap-6 → gap-2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Quick Actions */}
        <LivePanel
          title={t('dashboard.quickActions')}
          icon={<Zap className="w-3.5 h-3.5 text-info-cyan" />}
          className="lg:col-span-2"
        >
          {/* COMPACT: p-4 → p-2, gap-3 → gap-1.5 */}
          <div className="p-2 grid grid-cols-2 gap-1.5">
            <QuickActionButton
              label={t('dashboard.salesOrders')}
              icon={ShoppingCart}
              href="/orders"
              color="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
            />
            <QuickActionButton
              label={t('dashboard.inventory')}
              icon={Package}
              href="/inventory"
              color="bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400"
            />
            <QuickActionButton
              label={t('dashboard.production')}
              icon={Factory}
              href="/production"
              color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
            />
            <QuickActionButton
              label={t('dashboard.mrpPlanning')}
              icon={BarChart3}
              href="/mrp"
              color="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
            />
            <QuickActionButton
              label={t('dashboard.qualityControl')}
              icon={CheckCircle2}
              href="/quality"
              color="bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400"
            />
            <QuickActionButton
              label={t('dashboard.suppliers')}
              icon={Users}
              href="/suppliers"
              color="bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400"
            />
          </div>
        </LivePanel>

        {/* Today's Summary — LivePanel with TickingValue */}
        <LivePanel
          title={t('dashboard.todaySummary')}
          icon={<Calendar className="w-3.5 h-3.5 text-info-cyan" />}
          lastUpdated={lastUpdated}
          contentClassName="space-y-1.5"
        >
          {workOrdersLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-info-cyan" />
              <span className="ml-2 text-[11px] text-gray-500 dark:text-mrp-text-muted">Đang tải...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-steel-dark">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 flex items-center justify-center bg-production-green-dim">
                    <CheckCircle2 className="w-3 h-3 text-production-green" />
                  </div>
                  <span className="text-[11px] text-gray-600 dark:text-mrp-text-secondary">{t('dashboard.completed')}</span>
                </div>
                <TickingValue value={woSummary.completed} className="text-sm text-gray-900 dark:text-mrp-text-primary" />
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-steel-dark">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 flex items-center justify-center bg-info-cyan-dim">
                    <Play className="w-3 h-3 text-info-cyan" />
                  </div>
                  <span className="text-[11px] text-gray-600 dark:text-mrp-text-secondary">{t('dashboard.inProgress')}</span>
                </div>
                <TickingValue value={woSummary.inProgress} className="text-sm text-gray-900 dark:text-mrp-text-primary" />
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-steel-dark">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 flex items-center justify-center bg-alert-amber-dim">
                    <Clock className="w-3 h-3 text-alert-amber" />
                  </div>
                  <span className="text-[11px] text-gray-600 dark:text-mrp-text-secondary">{t('dashboard.pending')}</span>
                </div>
                <TickingValue value={woSummary.pending} className="text-sm text-gray-900 dark:text-mrp-text-primary" />
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-steel-dark">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 flex items-center justify-center bg-urgent-red-dim">
                    <AlertTriangle className="w-3 h-3 text-urgent-red" />
                  </div>
                  <span className="text-[11px] text-gray-600 dark:text-mrp-text-secondary">{t('dashboard.issues')}</span>
                </div>
                <TickingValue value={woSummary.issues} className="text-sm text-urgent-red" />
              </div>
            </>
          )}
        </LivePanel>
      </div>
    </div>
  );
}
