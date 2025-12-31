'use client';

import React, { useState } from 'react';
import {
  ShoppingCart,
  Search,
  Download,
  Plus,
  Edit,
  MoreHorizontal,
  Calendar,
  User,
  DollarSign,
  Package,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Send,
  Printer,
  Building,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn, formatCurrency, formatNumber, formatDate } from '../../lib/utils';
import { useSalesOrders, SalesOrder } from '@/lib/hooks/use-data';

// =============================================================================
// SALES ORDERS PAGE - CONNECTED TO API
// =============================================================================

const statusConfig: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  dotColor: string;
  icon: React.ReactNode;
}> = {
  DRAFT: {
    label: 'Draft',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-700',
    dotColor: 'bg-slate-400',
    icon: <FileText className="h-4 w-4" />,
  },
  PENDING: {
    label: 'Pending',
    color: 'text-warning-700 dark:text-warning-400',
    bgColor: 'bg-warning-100 dark:bg-warning-900/30',
    dotColor: 'bg-warning-500',
    icon: <Clock className="h-4 w-4" />,
  },
  CONFIRMED: {
    label: 'Confirmed',
    color: 'text-info-700 dark:text-info-400',
    bgColor: 'bg-info-100 dark:bg-info-900/30',
    dotColor: 'bg-info-500',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'text-primary-700 dark:text-primary-400',
    bgColor: 'bg-primary-100 dark:bg-primary-900/30',
    dotColor: 'bg-primary-500',
    icon: <Package className="h-4 w-4" />,
  },
  SHIPPED: {
    label: 'Shipped',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    dotColor: 'bg-purple-500',
    icon: <Truck className="h-4 w-4" />,
  },
  COMPLETED: {
    label: 'Completed',
    color: 'text-success-700 dark:text-success-400',
    bgColor: 'bg-success-100 dark:bg-success-900/30',
    dotColor: 'bg-success-500',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'text-danger-700 dark:text-danger-400',
    bgColor: 'bg-danger-100 dark:bg-danger-900/30',
    dotColor: 'bg-danger-500',
    icon: <XCircle className="h-4 w-4" />,
  },
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

// Priority Badge
const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const config = priorityConfig[priority] || priorityConfig.normal;
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full', config.bgColor, config.color)}>
      {config.label}
    </span>
  );
};

// KPI Card
const KPICard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  iconColor: string;
}> = ({ title, value, change, icon, iconColor }) => (
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
      <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-1">{value}</p>
    </div>
  </div>
);

// Loading skeleton
const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 h-32">
          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4" />
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
          <div className="h-6 w-32 bg-slate-100 dark:bg-slate-600 rounded" />
        </div>
      ))}
    </div>
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded ml-auto" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Order Card for Kanban
const OrderCard: React.FC<{
  order: SalesOrder;
  onClick: () => void;
}> = ({ order, onClick }) => (
  <div
    onClick={onClick}
    className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 transition-all"
  >
    <div className="flex items-start justify-between mb-3">
      <div>
        <p className="font-mono text-sm font-semibold text-primary-600 dark:text-primary-400">{order.soNumber}</p>
        <p className="text-sm text-slate-900 dark:text-white font-medium mt-0.5">{order.customer.name}</p>
      </div>
      <PriorityBadge priority={order.priority} />
    </div>

    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-slate-500 dark:text-slate-400">Total</span>
        <span className="font-mono font-medium text-slate-900 dark:text-white">{formatCurrency(order.totalAmount)}</span>
      </div>
      {order.requestedDate && (
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Required</span>
          <span className="text-slate-700 dark:text-slate-300">{formatDate(order.requestedDate, 'short')}</span>
        </div>
      )}
    </div>

    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
      <Badge variant="default">{order.lineCount} items</Badge>
      <span className="text-xs text-slate-400">{formatDate(order.orderDate, 'short')}</span>
    </div>
  </div>
);

// Order Detail Drawer
const OrderDetail: React.FC<{
  order: SalesOrder;
  onClose: () => void;
}> = ({ order, onClose }) => (
  <div className="h-full flex flex-col">
    {/* Header */}
    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{order.soNumber}</h2>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{order.customer.name}</p>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          <XCircle className="h-5 w-5" />
        </button>
      </div>
    </div>

    {/* Content */}
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <p className="text-xs text-slate-500 dark:text-slate-400">Order Total</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white font-mono">{formatCurrency(order.totalAmount)}</p>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <p className="text-xs text-slate-500 dark:text-slate-400">Currency</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{order.currency}</p>
        </div>
      </div>

      {/* Customer Info */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Customer</h3>
        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-900 dark:text-white">{order.customer.name}</span>
            <Badge variant="default">{order.customer.code}</Badge>
          </div>
          {order.customer.contactName && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">{order.customer.contactName}</span>
            </div>
          )}
          {order.customer.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              <a href={`mailto:${order.customer.email}`} className="text-sm text-primary-600 dark:text-primary-400">{order.customer.email}</a>
            </div>
          )}
          {order.customer.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">{order.customer.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Dates */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Timeline</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Order Date</span>
            <span className="text-slate-900 dark:text-white">{formatDate(order.orderDate, 'medium')}</span>
          </div>
          {order.requestedDate && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Required By</span>
              <span className="text-slate-900 dark:text-white font-medium">{formatDate(order.requestedDate, 'medium')}</span>
            </div>
          )}
          {order.promisedDate && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Promised Date</span>
              <span className="text-slate-900 dark:text-white">{formatDate(order.promisedDate, 'medium')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Shipping */}
      {(order.shippingMethod || order.shippingAddress) && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Shipping</h3>
          <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-2">
            {order.shippingMethod && (
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-900 dark:text-white">{order.shippingMethod}</span>
              </div>
            )}
            {order.shippingAddress && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                <span className="text-sm text-slate-600 dark:text-slate-400">{order.shippingAddress}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Lines */}
      {order.lines && order.lines.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Order Items ({order.lines.length})</h3>
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Item</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">Qty</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => (
                  <tr key={line.id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="px-3 py-2">
                      <p className="font-mono text-xs text-primary-600 dark:text-primary-400">{line.product.sku}</p>
                      <p className="text-slate-700 dark:text-slate-300">{line.product.name}</p>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-900 dark:text-white">{line.quantity}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-900 dark:text-white">{formatCurrency(line.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-700">
                <tr className="font-semibold">
                  <td className="px-3 py-2 text-slate-900 dark:text-white">Total</td>
                  <td></td>
                  <td className="px-3 py-2 text-right font-mono text-slate-900 dark:text-white">{formatCurrency(order.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Notes</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">{order.notes}</p>
        </div>
      )}
    </div>

    {/* Footer Actions */}
    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
      <div className="flex gap-2">
        <button className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center justify-center gap-2">
          <Printer className="h-4 w-4" />
          Print
        </button>
        <button className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center justify-center gap-2">
          <Edit className="h-4 w-4" />
          Edit
        </button>
        <button className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2">
          <Send className="h-4 w-4" />
          Send
        </button>
      </div>
    </div>
  </div>
);

// Main Sales Orders Component
export default function SalesOrdersConnected() {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Use the API hook
  const { orders, total, totalPages, kpis, isLoading, isError, refresh } = useSalesOrders({
    page,
    pageSize: 20,
    search: searchQuery || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    view: viewMode,
  });

  // Group orders by status for Kanban
  const ordersByStatus = orders.reduce((acc, order) => {
    if (!acc[order.status]) acc[order.status] = [];
    acc[order.status].push(order);
    return acc;
  }, {} as Record<string, SalesOrder[]>);

  const kanbanColumns = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'SHIPPED', 'COMPLETED'];

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-xl p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-danger-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-danger-700 dark:text-danger-400">Failed to load sales orders</h2>
            <p className="text-sm text-danger-600 dark:text-danger-500 mt-2">Please try again later</p>
            <button
              onClick={() => refresh()}
              className="mt-4 px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <nav className="mb-2">
                <ol className="flex items-center gap-2 text-sm">
                  <li><a href="/v2/dashboard" className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">Dashboard</a></li>
                  <li className="text-slate-400">/</li>
                  <li className="text-slate-700 dark:text-slate-200 font-medium">Sales Orders</li>
                </ol>
              </nav>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sales Orders</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage customer orders and fulfillment</p>
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
                <Download className="h-4 w-4" />
                Export
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KPICard
                title="Total Orders"
                value={formatNumber(kpis?.totalOrders || total)}
                icon={<ShoppingCart className="h-5 w-5 text-primary-600" />}
                iconColor="bg-primary-100 dark:bg-primary-900/30"
              />
              <KPICard
                title="Monthly Revenue"
                value={formatCurrency(kpis?.monthlyRevenue || 0)}
                icon={<DollarSign className="h-5 w-5 text-success-600" />}
                iconColor="bg-success-100 dark:bg-success-900/30"
              />
              <KPICard
                title="Pending Orders"
                value={kpis?.pendingOrders || 0}
                icon={<Clock className="h-5 w-5 text-warning-600" />}
                iconColor="bg-warning-100 dark:bg-warning-900/30"
              />
              <KPICard
                title="Avg Order Value"
                value={formatCurrency(kpis?.avgOrderValue || 0)}
                icon={<TrendingUp className="h-5 w-5 text-info-600" />}
                iconColor="bg-info-100 dark:bg-info-900/30"
              />
            </div>

            {/* Filters & View Toggle */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Search orders..."
                      className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
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
            </div>

            <div className="flex gap-6">
              {/* Main Content */}
              <div className={cn('flex-1', selectedOrder && viewMode === 'list' && 'hidden lg:block')}>
                {viewMode === 'list' ? (
                  /* List View */
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Order</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Customer</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Status</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Total</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Date</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                              No orders found. Try adjusting your filters.
                            </td>
                          </tr>
                        ) : (
                          orders.map((order) => (
                            <tr
                              key={order.id}
                              onClick={() => setSelectedOrder(order)}
                              className={cn(
                                'border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer',
                                selectedOrder?.id === order.id && 'bg-primary-50 dark:bg-primary-900/20'
                              )}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-semibold text-primary-600 dark:text-primary-400">{order.soNumber}</span>
                                  <PriorityBadge priority={order.priority} />
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{order.customer.name}</p>
                                {order.customer.contactName && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{order.customer.contactName}</p>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={order.status} />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(order.totalAmount)}</span>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm text-slate-700 dark:text-slate-300">{formatDate(order.orderDate, 'short')}</p>
                                {order.requestedDate && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400">Due: {formatDate(order.requestedDate, 'short')}</p>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Page {page} of {totalPages}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPage(page - 1)}
                            disabled={page <= 1}
                            className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setPage(page + 1)}
                            disabled={page >= totalPages}
                            className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Kanban View */
                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {kanbanColumns.map((status) => {
                      const config = statusConfig[status];
                      const statusOrders = ordersByStatus[status] || [];
                      return (
                        <div key={status} className="flex-shrink-0 w-72">
                          <div className="bg-slate-100 dark:bg-slate-700/50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className={cn('p-1 rounded', config.bgColor, config.color)}>
                                  {config.icon}
                                </span>
                                <span className="font-medium text-slate-900 dark:text-white">{config.label}</span>
                              </div>
                              <Badge>{statusOrders.length}</Badge>
                            </div>
                            <div className="space-y-3">
                              {statusOrders.map((order) => (
                                <OrderCard
                                  key={order.id}
                                  order={order}
                                  onClick={() => setSelectedOrder(order)}
                                />
                              ))}
                              {statusOrders.length === 0 && (
                                <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
                                  No orders
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Detail Panel */}
              {selectedOrder && (
                <div className="w-96 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0">
                  <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
