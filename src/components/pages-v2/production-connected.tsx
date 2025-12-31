'use client';

import React, { useState } from 'react';
import {
  Factory,
  Search,
  Plus,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  Package,
  MoreHorizontal,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Timer,
  Gauge,
  Activity,
  Users,
  RefreshCw,
} from 'lucide-react';
import { cn, formatNumber, formatDate } from '../../lib/utils';
import { useWorkOrders, WorkOrder } from '@/lib/hooks/use-data';

// =============================================================================
// PRODUCTION PAGE - CONNECTED TO API
// =============================================================================

const statusConfig: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  dotColor: string;
}> = {
  DRAFT: { label: 'Draft', color: 'text-slate-600 dark:text-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-700', dotColor: 'bg-slate-400' },
  RELEASED: { label: 'Released', color: 'text-info-700 dark:text-info-400', bgColor: 'bg-info-100 dark:bg-info-900/30', dotColor: 'bg-info-500' },
  SCHEDULED: { label: 'Scheduled', color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30', dotColor: 'bg-purple-500' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-primary-700 dark:text-primary-400', bgColor: 'bg-primary-100 dark:bg-primary-900/30', dotColor: 'bg-primary-500' },
  ON_HOLD: { label: 'On Hold', color: 'text-warning-700 dark:text-warning-400', bgColor: 'bg-warning-100 dark:bg-warning-900/30', dotColor: 'bg-warning-500' },
  COMPLETED: { label: 'Completed', color: 'text-success-700 dark:text-success-400', bgColor: 'bg-success-100 dark:bg-success-900/30', dotColor: 'bg-success-500' },
  CANCELLED: { label: 'Cancelled', color: 'text-danger-700 dark:text-danger-400', bgColor: 'bg-danger-100 dark:bg-danger-900/30', dotColor: 'bg-danger-500' },
};

const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: 'text-slate-600 dark:text-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-700' },
  normal: { label: 'Normal', color: 'text-info-700 dark:text-info-400', bgColor: 'bg-info-100 dark:bg-info-900/30' },
  high: { label: 'High', color: 'text-warning-700 dark:text-warning-400', bgColor: 'bg-warning-100 dark:bg-warning-900/30' },
  urgent: { label: 'Urgent', color: 'text-danger-700 dark:text-danger-400', bgColor: 'bg-danger-100 dark:bg-danger-900/30' },
};

// Badge component
const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
}> = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300',
    success: 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300',
    warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300',
    danger: 'bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-300',
    info: 'bg-info-100 text-info-700 dark:bg-info-900 dark:text-info-300',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full', variants[variant])}>
      {children}
    </span>
  );
};

// Status Badge
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = statusConfig[status] || statusConfig.DRAFT;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full', config.bgColor, config.color)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />
      {config.label}
    </span>
  );
};

// KPI Card
const KPICard: React.FC<{
  title: string;
  value: string | number;
  suffix?: string;
  change?: number;
  icon: React.ReactNode;
  iconColor: string;
  progress?: number;
}> = ({ title, value, suffix, change, icon, iconColor, progress }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div className={cn('p-2 rounded-lg', iconColor)}>{icon}</div>
      {change !== undefined && (
        <div className={cn('flex items-center gap-1 text-sm font-medium', change >= 0 ? 'text-success-600' : 'text-danger-600')}>
          {change >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
          {Math.abs(change)}%
        </div>
      )}
    </div>
    <div className="mt-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-1">
        {value}{suffix && <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">{suffix}</span>}
      </p>
    </div>
    {progress !== undefined && (
      <div className="mt-3">
        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    )}
  </div>
);

// Progress Ring
const ProgressRing: React.FC<{ value: number; size?: number; strokeWidth?: number }> = ({
  value,
  size = 48,
  strokeWidth = 4,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={value >= 80 ? '#10B981' : value >= 50 ? '#F59E0B' : '#EF4444'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{value}%</span>
      </div>
    </div>
  );
};

// Loading skeleton
const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 h-28">
          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg mb-3" />
          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
          <div className="h-6 w-20 bg-slate-100 dark:bg-slate-600 rounded" />
        </div>
      ))}
    </div>
    <div className="flex gap-4 overflow-x-auto pb-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex-shrink-0 w-72 bg-slate-100 dark:bg-slate-700/50 rounded-xl p-3 h-64" />
      ))}
    </div>
  </div>
);

// Work Order Card
const WorkOrderCard: React.FC<{
  wo: WorkOrder;
  onClick: () => void;
}> = ({ wo, onClick }) => {
  const isLate = wo.isOverdue;

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-slate-800 rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md',
        isLate ? 'border-danger-200 dark:border-danger-800 hover:border-danger-300' : 'border-slate-200 dark:border-slate-700 hover:border-primary-200 dark:hover:border-primary-700'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-mono text-sm font-semibold text-primary-600 dark:text-primary-400">{wo.woNumber}</p>
          <p className="text-sm text-slate-900 dark:text-white font-medium mt-0.5">{wo.product.name}</p>
        </div>
        <Badge variant={priorityConfig[wo.priority]?.color.includes('warning') ? 'warning' : priorityConfig[wo.priority]?.color.includes('danger') ? 'danger' : 'default'}>
          {wo.priority}
        </Badge>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-3">
        <ProgressRing value={wo.progress} size={40} />
        <div className="flex-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">Progress</p>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {wo.completedQty}/{wo.quantity} units
          </p>
        </div>
      </div>

      {/* Current Operation */}
      {wo.currentOperation && (
        <div className="mb-3 px-2 py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded text-sm">
          <span className="text-slate-500 dark:text-slate-400">Current: </span>
          <span className="text-slate-900 dark:text-white font-medium">{wo.currentOperation}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <Calendar className="h-3 w-3" />
          <span className={isLate ? 'text-danger-600 font-medium' : ''}>
            Due: {wo.dueDate ? formatDate(wo.dueDate, 'short') : 'N/A'}
          </span>
        </div>
        {wo.totalOperations > 0 && (
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <span>{wo.completedOperations}/{wo.totalOperations} ops</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Work Order Detail
const WorkOrderDetail: React.FC<{
  wo: WorkOrder;
  onClose: () => void;
}> = ({ wo, onClose }) => {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{wo.woNumber}</h2>
              <StatusBadge status={wo.status} />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{wo.product.name}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Progress Overview */}
        <div className="flex items-center gap-6">
          <ProgressRing value={wo.progress} size={80} strokeWidth={6} />
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Quantity</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white font-mono">
                {wo.completedQty} / {wo.quantity}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Hours</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white font-mono">
                {wo.actualHours} / {wo.plannedHours}h
              </p>
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Product</h3>
          <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-slate-600 rounded-lg">
                <Package className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="font-mono text-sm text-primary-600 dark:text-primary-400">{wo.product.sku}</p>
                <p className="text-sm text-slate-900 dark:text-white">{wo.product.name}</p>
                {wo.product.revision && <Badge>Rev {wo.product.revision}</Badge>}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Timeline</h3>
          <div className="space-y-2 text-sm">
            {wo.startDate && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Start Date</span>
                <span className="text-slate-900 dark:text-white">{formatDate(wo.startDate, 'medium')}</span>
              </div>
            )}
            {wo.dueDate && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Due Date</span>
                <span className={wo.isOverdue ? 'text-danger-600 font-medium' : 'text-slate-900 dark:text-white'}>
                  {formatDate(wo.dueDate, 'medium')}
                  {wo.isOverdue && ' (OVERDUE)'}
                </span>
              </div>
            )}
            {wo.completionDate && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Completed</span>
                <span className="text-success-600">{formatDate(wo.completionDate, 'medium')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Work Center */}
        {wo.workCenter && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Work Center</h3>
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <Factory className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-900 dark:text-white">{wo.workCenter}</span>
            </div>
          </div>
        )}

        {/* Operations */}
        {wo.operations && wo.operations.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Operations ({wo.operations.length})</h3>
            <div className="space-y-2">
              {wo.operations.map((op, idx) => {
                const isComplete = op.status === 'COMPLETED';
                const isInProgress = op.status === 'IN_PROGRESS';

                return (
                  <div
                    key={op.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border',
                      isInProgress ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800' :
                      isComplete ? 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800' :
                      'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700'
                    )}
                  >
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                      isComplete ? 'bg-success-500 text-white' :
                      isInProgress ? 'bg-primary-500 text-white' :
                      'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                    )}>
                      {isComplete ? <CheckCircle className="h-4 w-4" /> : op.operationSeq}
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        'text-sm font-medium',
                        isInProgress ? 'text-primary-700 dark:text-primary-400' : 'text-slate-900 dark:text-white'
                      )}>
                        {op.operationName}
                      </p>
                      {op.workCenter && <p className="text-xs text-slate-500 dark:text-slate-400">{op.workCenter}</p>}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{op.plannedHours}h</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        {wo.notes && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Notes</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">{wo.notes}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <div className="flex gap-2">
          {wo.status === 'IN_PROGRESS' && (
            <>
              <button className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center justify-center gap-2">
                <Pause className="h-4 w-4" />
                Pause
              </button>
              <button className="flex-1 px-4 py-2 text-sm font-medium text-white bg-success-600 rounded-lg hover:bg-success-700 flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Complete
              </button>
            </>
          )}
          {wo.status === 'RELEASED' && (
            <button className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2">
              <Play className="h-4 w-4" />
              Start Production
            </button>
          )}
          {wo.status === 'ON_HOLD' && (
            <button className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2">
              <Play className="h-4 w-4" />
              Resume
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Production Page
export default function ProductionConnected() {
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Use the API hook
  const { workOrders, total, totalPages, kpis, isLoading, isError, refresh } = useWorkOrders({
    page,
    pageSize: 50,
    search: searchQuery || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    view: viewMode,
  });

  // Group by status for Kanban
  const woByStatus = workOrders.reduce((acc, wo) => {
    if (!acc[wo.status]) acc[wo.status] = [];
    acc[wo.status].push(wo);
    return acc;
  }, {} as Record<string, WorkOrder[]>);

  const kanbanColumns = ['RELEASED', 'SCHEDULED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'];

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-xl p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-danger-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-danger-700 dark:text-danger-400">Failed to load work orders</h2>
            <p className="text-sm text-danger-600 dark:text-danger-500 mt-2">Please try again later</p>
            <button onClick={() => refresh()} className="mt-4 px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <nav className="mb-2">
                <ol className="flex items-center gap-2 text-sm">
                  <li><a href="/v2/dashboard" className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">Dashboard</a></li>
                  <li className="text-slate-400">/</li>
                  <li className="text-slate-700 dark:text-slate-200 font-medium">Production</li>
                </ol>
              </nav>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Production</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage work orders and production scheduling</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refresh()}
                className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Work Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <KPICard
                title="Active WOs"
                value={kpis?.activeWorkOrders || workOrders.filter(w => w.status === 'IN_PROGRESS').length}
                icon={<Factory className="h-5 w-5 text-primary-600" />}
                iconColor="bg-primary-100 dark:bg-primary-900/30"
              />
              <KPICard
                title="Completed (MTD)"
                value={kpis?.completedMTD || workOrders.filter(w => w.status === 'COMPLETED').length}
                icon={<CheckCircle className="h-5 w-5 text-success-600" />}
                iconColor="bg-success-100 dark:bg-success-900/30"
              />
              <KPICard
                title="Total Orders"
                value={total}
                icon={<Timer className="h-5 w-5 text-info-600" />}
                iconColor="bg-info-100 dark:bg-info-900/30"
              />
              <KPICard
                title="On Hold"
                value={workOrders.filter(w => w.status === 'ON_HOLD').length}
                icon={<Clock className="h-5 w-5 text-warning-600" />}
                iconColor="bg-warning-100 dark:bg-warning-900/30"
              />
              <KPICard
                title="Released"
                value={workOrders.filter(w => w.status === 'RELEASED').length}
                icon={<Gauge className="h-5 w-5 text-purple-600" />}
                iconColor="bg-purple-100 dark:bg-purple-900/30"
              />
              <KPICard
                title="Scheduled"
                value={workOrders.filter(w => w.status === 'SCHEDULED').length}
                icon={<Activity className="h-5 w-5 text-cyan-600" />}
                iconColor="bg-cyan-100 dark:bg-cyan-900/30"
              />
            </div>

            {/* View Toggle */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search work orders..."
                    className="w-64 pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="all">All Status</option>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn('px-3 py-1.5 text-sm font-medium rounded', viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400')}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={cn('px-3 py-1.5 text-sm font-medium rounded', viewMode === 'kanban' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400')}
                >
                  Kanban
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex gap-6">
              <div className={cn('flex-1', selectedWO && 'hidden lg:block')}>
                {viewMode === 'kanban' ? (
                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {kanbanColumns.map((status) => {
                      const config = statusConfig[status];
                      const wos = woByStatus[status] || [];
                      return (
                        <div key={status} className="flex-shrink-0 w-72">
                          <div className="bg-slate-100 dark:bg-slate-700/50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className={cn('w-2 h-2 rounded-full', config.dotColor)} />
                                <span className="font-medium text-slate-900 dark:text-white">{config.label}</span>
                              </div>
                              <Badge>{wos.length}</Badge>
                            </div>
                            <div className="space-y-3">
                              {wos.map((wo) => (
                                <WorkOrderCard key={wo.id} wo={wo} onClick={() => setSelectedWO(wo)} />
                              ))}
                              {wos.length === 0 && (
                                <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">No work orders</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Work Order</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Product</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Status</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Progress</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Due Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Work Center</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {workOrders.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                              No work orders found. Try adjusting your filters.
                            </td>
                          </tr>
                        ) : (
                          workOrders.map((wo) => (
                            <tr
                              key={wo.id}
                              onClick={() => setSelectedWO(wo)}
                              className={cn(
                                'border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer',
                                selectedWO?.id === wo.id && 'bg-primary-50 dark:bg-primary-900/20'
                              )}
                            >
                              <td className="px-4 py-3">
                                <span className="font-mono text-sm font-semibold text-primary-600 dark:text-primary-400">{wo.woNumber}</span>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{wo.product.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{wo.product.sku}</p>
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={wo.status} />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <ProgressRing value={wo.progress} size={32} strokeWidth={3} />
                                  <span className="text-sm text-slate-600 dark:text-slate-400">{wo.completedQty}/{wo.quantity}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={cn(
                                  'text-sm',
                                  wo.isOverdue ? 'text-danger-600 font-medium' : 'text-slate-700 dark:text-slate-300'
                                )}>
                                  {wo.dueDate ? formatDate(wo.dueDate, 'short') : 'N/A'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-slate-600 dark:text-slate-400">{wo.workCenter || 'N/A'}</span>
                              </td>
                              <td className="px-4 py-3">
                                <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Detail Panel */}
              {selectedWO && (
                <div className="w-96 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0">
                  <WorkOrderDetail wo={selectedWO} onClose={() => setSelectedWO(null)} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
