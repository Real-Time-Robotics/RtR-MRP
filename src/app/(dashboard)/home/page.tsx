'use client';

// =============================================================================
// ENTERPRISE MRP DASHBOARD - Industrial Precision ULTRA COMPACT
// Data-dense layout like Bloomberg Terminal / Excel
// =============================================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { PendingApprovals } from '@/components/workflow';

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

// =============================================================================
// MOCK DATA
// =============================================================================

const mockWorkOrders: WorkOrder[] = [
  { id: '1', number: 'WO-2024-001', product: 'HERA X8 Frame', quantity: 50, completed: 35, status: 'running', progress: 70 },
  { id: '2', number: 'WO-2024-002', product: 'Motor Assembly', quantity: 200, completed: 180, status: 'running', progress: 90 },
  { id: '3', number: 'WO-2024-003', product: 'Flight Controller', quantity: 100, completed: 45, status: 'paused', progress: 45 },
  { id: '4', number: 'WO-2024-004', product: 'Battery Pack', quantity: 80, completed: 80, status: 'completed', progress: 100 },
  { id: '5', number: 'WO-2024-005', product: 'Propeller Set', quantity: 500, completed: 150, status: 'delayed', progress: 30 },
];

const mockAlerts: Alert[] = [
  { id: '1', type: 'critical', title: 'Low stock: Carbon Fiber Tubes (5 remaining)', time: '2m ago' },
  { id: '2', type: 'critical', title: 'Machine CNC-01 requires maintenance', time: '15m ago' },
  { id: '3', type: 'warning', title: 'PO-2024-089 delivery delayed by 2 days', time: '1h ago' },
  { id: '4', type: 'warning', title: 'Quality issue reported on WO-2024-003', time: '2h ago' },
  { id: '5', type: 'info', title: 'New supplier quote received', time: '3h ago' },
];

// =============================================================================
// ULTRA COMPACT COMPONENTS
// =============================================================================

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
        onClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gunmetal-light touch-manipulation active:scale-[0.98]'
      )}
      onClick={onClick}
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
  const statusConfig = {
    running: { icon: Play, color: 'text-production-green bg-production-green-dim', label: 'RUN' },
    paused: { icon: Pause, color: 'text-alert-amber bg-alert-amber-dim', label: 'PAUSE' },
    completed: { icon: CheckCircle2, color: 'text-info-cyan bg-info-cyan-dim', label: 'DONE' },
    delayed: { icon: AlertCircle, color: 'text-urgent-red bg-urgent-red-dim', label: 'DELAY' },
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
              'h-full transition-all',
              order.status === 'completed' ? 'bg-info-cyan' :
              order.status === 'delayed' ? 'bg-urgent-red' :
              order.status === 'paused' ? 'bg-alert-amber' : 'bg-production-green'
            )}
            style={{ width: `${order.progress}%` }}
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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        } else {
          setError('Failed to load dashboard');
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    };

    // Fetch current user ID for workflow approvals
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
        console.error('Failed to fetch user session:', err);
      }
    };

    fetchUser();
    fetchStats();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'decimal',
      maximumFractionDigits: 0
    }).format(value) + ' ₫';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-info-cyan" />
      </div>
    );
  }

  // OEE metrics
  const oee = 87.5;
  const uptime = 94.2;
  const quality = 98.1;

  return (
    // COMPACT: space-y-6 → space-y-3, pb-8 → pb-4
    <div className="space-y-3 pb-4">
      {/* Page Header - Responsive */}
      <div className="flex items-start sm:items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {/* Mobile: smaller title, Desktop: normal */}
          <h1 className="text-sm sm:text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary truncate">
            {t('dashboard.title')}
          </h1>
          {/* Hide date on mobile for cleaner look */}
          <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-mrp-text-muted">
            <span>{t('dashboard.description')}</span>
            <span className="hidden sm:inline"> • {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </p>
        </div>
        {/* Refresh button - larger touch target on mobile */}
        <button className="flex items-center justify-center gap-1.5 px-2 py-1.5 sm:py-1 min-h-[36px] sm:min-h-0 text-[10px] font-mono uppercase tracking-wider text-gray-600 dark:text-mrp-text-muted hover:text-info-cyan hover:bg-gray-100 dark:hover:bg-gunmetal transition-colors touch-manipulation rounded">
          <RefreshCw className="w-4 h-4 sm:w-3 sm:h-3" />
          <span className="hidden sm:inline">REFRESH</span>
        </button>
      </div>

      {error && (
        <div className="p-2 bg-alert-amber-dim border border-alert-amber/30 text-alert-amber text-[11px] font-mono">
          {error}
        </div>
      )}

      {/* KPI Cards Row 1 - COMPACT: gap-4 → gap-2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard
          title="Pending Orders"
          value={stats?.pendingOrders ?? 0}
          subtitle={formatCurrency(stats?.pendingOrdersValue ?? 0)}
          icon={ShoppingCart}
          trend="up"
          trendValue="+12% vs last week"
          onClick={() => router.push('/orders')}
        />
        <StatCard
          title="Critical Stock"
          value={stats?.criticalStock ?? 0}
          subtitle="Items below minimum"
          icon={AlertTriangle}
          status={(stats?.criticalStock ?? 0) > 0 ? 'danger' : 'success'}
          onClick={() => router.push('/inventory?filter=critical')}
        />
        <StatCard
          title="Active POs"
          value={stats?.activePOs ?? 0}
          subtitle={formatCurrency(stats?.activePOsValue ?? 0)}
          icon={Truck}
          trend="neutral"
          trendValue="Same as last week"
          onClick={() => router.push('/purchasing')}
        />
        <StatCard
          title="Reorder Alerts"
          value={stats?.reorderAlerts ?? 0}
          subtitle="Items to reorder"
          icon={Boxes}
          status={(stats?.reorderAlerts ?? 0) > 0 ? 'warning' : 'success'}
          onClick={() => router.push('/inventory?filter=reorder')}
        />
      </div>

      {/* KPI Cards Row 2 - COMPACT: gap-4 → gap-2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard
          title="OEE"
          value={`${oee}%`}
          subtitle="Overall Equipment Effectiveness"
          icon={Target}
          status={oee >= 85 ? 'success' : oee >= 70 ? 'warning' : 'danger'}
        />
        <StatCard
          title="Uptime"
          value={`${uptime}%`}
          subtitle="Machine availability"
          icon={Activity}
          trend="up"
          trendValue="+2.3% this month"
        />
        <StatCard
          title="Quality Rate"
          value={`${quality}%`}
          subtitle="First pass yield"
          icon={CheckCircle2}
          status="success"
        />
        <StatCard
          title="Active Work Orders"
          value={mockWorkOrders.filter(wo => wo.status === 'running').length}
          subtitle={`${mockWorkOrders.length} total orders`}
          icon={Factory}
          onClick={() => router.push('/production')}
        />
      </div>

      {/* Main Content Grid - COMPACT: gap-6 → gap-2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Production Status */}
        <div className="lg:col-span-2 bg-white dark:bg-gunmetal border border-gray-200 dark:border-mrp-border">
          {/* COMPACT: px-4 py-3 → px-3 py-2 */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-mrp-border">
            <h2 className="text-[11px] font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary flex items-center gap-1.5">
              <Factory className="w-3.5 h-3.5 text-info-cyan" />
              PRODUCTION STATUS
            </h2>
            <Link
              href="/production"
              className="text-[10px] font-mono uppercase tracking-wider text-gray-500 dark:text-mrp-text-muted hover:text-info-cyan transition-colors flex items-center gap-0.5"
            >
              VIEW ALL
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {/* COMPACT: p-4 → p-2, space-y-2 → space-y-1 */}
          <div className="p-2 space-y-1">
            {mockWorkOrders.map((order) => (
              <ProductionStatusCard key={order.id} order={order} />
            ))}
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="bg-white dark:bg-gunmetal border border-gray-200 dark:border-mrp-border">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-mrp-border">
            <h2 className="text-[11px] font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-alert-amber" />
              ALERTS
              <span className="px-1 py-0.5 text-[9px] font-bold bg-urgent-red-dim text-urgent-red">
                {mockAlerts.filter(a => a.type === 'critical').length}
              </span>
            </h2>
            <Link
              href="/alerts"
              className="text-[10px] font-mono uppercase tracking-wider text-gray-500 dark:text-mrp-text-muted hover:text-info-cyan transition-colors"
            >
              VIEW ALL
            </Link>
          </div>
          {/* COMPACT: max-h reduced */}
          <div className="max-h-[240px] overflow-y-auto">
            {mockAlerts.map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
          </div>
        </div>
      </div>

      {/* Pending Approvals - Workflow */}
      {userId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <PendingApprovals userId={userId} />
        </div>
      )}

      {/* Quick Actions & Summary - COMPACT: gap-6 → gap-2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white dark:bg-gunmetal border border-gray-200 dark:border-mrp-border">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-mrp-border">
            <h2 className="text-[11px] font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-info-cyan" />
              QUICK ACTIONS
            </h2>
          </div>
          {/* COMPACT: p-4 → p-2, gap-3 → gap-1.5 */}
          <div className="p-2 grid grid-cols-2 gap-1.5">
            <QuickActionButton
              label="Sales Orders"
              icon={ShoppingCart}
              href="/orders"
              color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            />
            <QuickActionButton
              label="Inventory"
              icon={Package}
              href="/inventory"
              color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
            />
            <QuickActionButton
              label="Production"
              icon={Factory}
              href="/production"
              color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
            />
            <QuickActionButton
              label="MRP Planning"
              icon={BarChart3}
              href="/mrp"
              color="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
            />
            <QuickActionButton
              label="Quality Control"
              icon={CheckCircle2}
              href="/quality"
              color="bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400"
            />
            <QuickActionButton
              label="Suppliers"
              icon={Users}
              href="/suppliers"
              color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
            />
          </div>
        </div>

        {/* Today's Summary - COMPACT */}
        <div className="bg-white dark:bg-gunmetal border border-gray-200 dark:border-mrp-border">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-mrp-border">
            <h2 className="text-[11px] font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-info-cyan" />
              TODAY'S SUMMARY
            </h2>
          </div>
          {/* COMPACT: p-4 → p-2, space-y-4 → space-y-1.5 */}
          <div className="p-2 space-y-1.5">
            {/* COMPACT: p-3 → p-2 */}
            <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-steel-dark">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center bg-production-green-dim">
                  <CheckCircle2 className="w-3 h-3 text-production-green" />
                </div>
                <span className="text-[11px] text-gray-600 dark:text-mrp-text-secondary">Completed</span>
              </div>
              <span className="text-sm font-mono font-semibold text-gray-900 dark:text-mrp-text-primary">12</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-steel-dark">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center bg-info-cyan-dim">
                  <Play className="w-3 h-3 text-info-cyan" />
                </div>
                <span className="text-[11px] text-gray-600 dark:text-mrp-text-secondary">In Progress</span>
              </div>
              <span className="text-sm font-mono font-semibold text-gray-900 dark:text-mrp-text-primary">8</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-steel-dark">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center bg-alert-amber-dim">
                  <Clock className="w-3 h-3 text-alert-amber" />
                </div>
                <span className="text-[11px] text-gray-600 dark:text-mrp-text-secondary">Pending</span>
              </div>
              <span className="text-sm font-mono font-semibold text-gray-900 dark:text-mrp-text-primary">5</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-steel-dark">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center bg-urgent-red-dim">
                  <AlertTriangle className="w-3 h-3 text-urgent-red" />
                </div>
                <span className="text-[11px] text-gray-600 dark:text-mrp-text-secondary">Issues</span>
              </div>
              <span className="text-sm font-mono font-semibold text-urgent-red">2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
