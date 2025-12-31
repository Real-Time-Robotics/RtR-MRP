'use client';

import React, { useState } from 'react';
import {
  Package,
  Search,
  Download,
  Plus,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  Box,
  Warehouse,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn, formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import { useInventory, InventoryItem } from '@/lib/hooks/use-data';

// =============================================================================
// INVENTORY PAGE - CONNECTED TO API
// =============================================================================

const stockStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  IN_STOCK: { label: 'In Stock', color: 'text-success-700 dark:text-success-400', bgColor: 'bg-success-100 dark:bg-success-900/30' },
  LOW_STOCK: { label: 'Low Stock', color: 'text-warning-700 dark:text-warning-400', bgColor: 'bg-warning-100 dark:bg-warning-900/30' },
  CRITICAL: { label: 'Critical', color: 'text-danger-700 dark:text-danger-400', bgColor: 'bg-danger-100 dark:bg-danger-900/30' },
  OUT_OF_STOCK: { label: 'Out of Stock', color: 'text-danger-700 dark:text-danger-400', bgColor: 'bg-danger-200 dark:bg-danger-900/50' },
  OVERSTOCK: { label: 'Overstock', color: 'text-info-700 dark:text-info-400', bgColor: 'bg-info-100 dark:bg-info-900/30' },
};

// Badge component
const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
}> = ({ children, variant = 'default', size = 'sm' }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300',
    success: 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300',
    warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300',
    danger: 'bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-300',
    info: 'bg-info-100 text-info-700 dark:bg-info-900 dark:text-info-300',
  };

  return (
    <span className={cn(
      'inline-flex items-center font-medium rounded-full',
      variants[variant],
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
    )}>
      {children}
    </span>
  );
};

// Stock Status Badge
const StockStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = stockStatusConfig[status] || stockStatusConfig.IN_STOCK;
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
  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div className={cn('p-2 rounded-lg', iconColor)}>{icon}</div>
      {change !== undefined && (
        <div className={cn('flex items-center gap-1 text-sm font-medium', change >= 0 ? 'text-success-600' : 'text-danger-600')}>
          {change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {Math.abs(change)}%
        </div>
      )}
    </div>
    <div className="mt-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <p className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-1">{value}</p>
    </div>
  </div>
);

// Loading skeleton
const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 h-24">
          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg mb-3" />
          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
          <div className="h-5 w-20 bg-slate-100 dark:bg-slate-600 rounded" />
        </div>
      ))}
    </div>
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded ml-auto" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Main Inventory Page
export default function InventoryConnected() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [page, setPage] = useState(1);

  // Use the API hook
  const { inventory, total, totalPages, kpis, stockSummary, filters, isLoading, isError, refresh } = useInventory({
    page,
    pageSize: 20,
    search: searchQuery || undefined,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    stockStatus: selectedStatus !== 'all' ? selectedStatus : undefined,
  });

  const categories = [
    { value: 'all', label: 'All Categories' },
    ...(filters?.categories || []).map(c => ({ value: c.value, label: `${c.value} (${c.count})` })),
  ];

  const statuses = [
    { value: 'all', label: 'All Status' },
    { value: 'IN_STOCK', label: 'In Stock' },
    { value: 'LOW_STOCK', label: 'Low Stock' },
    { value: 'CRITICAL', label: 'Critical' },
    { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
    { value: 'OVERSTOCK', label: 'Overstock' },
  ];

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-xl p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-danger-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-danger-700 dark:text-danger-400">Failed to load inventory</h2>
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
                  <li className="text-slate-700 dark:text-slate-200 font-medium">Inventory</li>
                </ol>
              </nav>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventory Management</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage parts, stock levels, and warehouse locations</p>
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
                Add Item
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <KPICard
                title="Total Items"
                value={formatNumber(kpis?.totalItems || total)}
                icon={<Package className="h-5 w-5 text-primary-600" />}
                iconColor="bg-primary-100 dark:bg-primary-900/30"
              />
              <KPICard
                title="Total Value"
                value={formatCurrency(kpis?.totalValue || 0)}
                icon={<DollarSign className="h-5 w-5 text-success-600" />}
                iconColor="bg-success-100 dark:bg-success-900/30"
              />
              <KPICard
                title="Low Stock"
                value={kpis?.lowStockCount || stockSummary?.lowStock || 0}
                icon={<AlertTriangle className="h-5 w-5 text-warning-600" />}
                iconColor="bg-warning-100 dark:bg-warning-900/30"
              />
              <KPICard
                title="Out of Stock"
                value={kpis?.outOfStockCount || stockSummary?.outOfStock || 0}
                icon={<Box className="h-5 w-5 text-danger-600" />}
                iconColor="bg-danger-100 dark:bg-danger-900/30"
              />
              <KPICard
                title="Expiring Soon"
                value={kpis?.expiringCount || 0}
                icon={<Warehouse className="h-5 w-5 text-info-600" />}
                iconColor="bg-info-100 dark:bg-info-900/30"
              />
            </div>

            {/* Stock Summary */}
            {stockSummary && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Stock Distribution</h3>
                <div className="flex gap-4">
                  {[
                    { label: 'In Stock', value: stockSummary.inStock, color: 'bg-success-500' },
                    { label: 'Low Stock', value: stockSummary.lowStock, color: 'bg-warning-500' },
                    { label: 'Critical', value: stockSummary.critical, color: 'bg-danger-500' },
                    { label: 'Out of Stock', value: stockSummary.outOfStock, color: 'bg-slate-500' },
                    { label: 'Overstock', value: stockSummary.overstock, color: 'bg-info-500' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className={cn('w-3 h-3 rounded-full', item.color)} />
                      <span className="text-sm text-slate-600 dark:text-slate-400">{item.label}: <span className="font-semibold text-slate-900 dark:text-white">{item.value}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 p-4 flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search inventory..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            {/* Inventory Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Part #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Warehouse</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Value</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                        No inventory items found. Try adjusting your filters.
                      </td>
                    </tr>
                  ) : (
                    inventory.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-semibold text-primary-600 dark:text-primary-400">{item.partNumber}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{item.partName}</p>
                          {item.location && <p className="text-xs text-slate-500 dark:text-slate-400">Loc: {item.location}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge>{item.category}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600 dark:text-slate-400">{item.warehouse.name}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-mono text-sm text-slate-900 dark:text-white">{item.quantity}</span>
                            <span className="text-slate-400">/</span>
                            <span className="text-slate-500 dark:text-slate-400 font-mono text-sm">{item.minStock}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-sm text-slate-900 dark:text-white">{formatCurrency(item.totalValue)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <StockStatusBadge status={item.stockStatus} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button className="p-1 text-slate-400 hover:text-danger-600">
                              <ArrowUpDown className="h-4 w-4" />
                            </button>
                          </div>
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
                    Page {page} of {totalPages} ({total} items)
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
          </>
        )}
      </div>
    </div>
  );
}
