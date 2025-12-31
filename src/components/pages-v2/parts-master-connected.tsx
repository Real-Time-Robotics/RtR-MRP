'use client';

import React, { useState } from 'react';
import {
  Package,
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  Star,
  StarOff,
  FileText,
  History,
  Layers,
  ChevronRight,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { cn, formatCurrency, formatNumber, formatDate } from '../../lib/utils';
import { useParts, Part } from '@/lib/hooks/use-data';

// =============================================================================
// PARTS MASTER PAGE - CONNECTED TO API
// =============================================================================

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'propulsion', label: 'Propulsion' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'power', label: 'Power' },
  { value: 'sensors', label: 'Sensors' },
  { value: 'frame', label: 'Frame' },
  { value: 'hardware', label: 'Hardware' },
];

const types = [
  { value: 'all', label: 'All Types' },
  { value: 'BUY', label: 'Purchased' },
  { value: 'MAKE', label: 'Manufactured' },
  { value: 'BOTH', label: 'Both' },
];

const statuses = [
  { value: 'all', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'OBSOLETE', label: 'Obsolete' },
  { value: 'PENDING', label: 'Pending' },
];

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
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      )}
    >
      {children}
    </span>
  );
};

// Status badge
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { variant: 'success' | 'warning' | 'danger' | 'default'; label: string }> = {
    ACTIVE: { variant: 'success', label: 'Active' },
    INACTIVE: { variant: 'default', label: 'Inactive' },
    OBSOLETE: { variant: 'danger', label: 'Obsolete' },
    PENDING: { variant: 'warning', label: 'Pending' },
  };

  const { variant, label } = config[status] || { variant: 'default' as const, label: status };

  const dotColors = {
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
    default: 'bg-slate-400',
  };

  return (
    <Badge variant={variant}>
      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', dotColors[variant])} />
      {label}
    </Badge>
  );
};

// Stock status indicator
const StockStatus: React.FC<{ current: number; min: number }> = ({ current, min }) => {
  const ratio = min > 0 ? current / min : current > 0 ? 1 : 0;

  if (current === 0) {
    return <Badge variant="danger">Out of Stock</Badge>;
  } else if (ratio < 0.5) {
    return <Badge variant="danger">Critical</Badge>;
  } else if (ratio < 1) {
    return <Badge variant="warning">Low Stock</Badge>;
  }
  return <Badge variant="success">In Stock</Badge>;
};

// Loading skeleton
const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-64" />
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="flex-1">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-2" />
              <div className="h-3 bg-slate-100 dark:bg-slate-600 rounded w-48" />
            </div>
            <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Part detail panel
const PartDetailPanel: React.FC<{ part: Part; onClose: () => void }> = ({ part, onClose }) => (
  <div className="h-full flex flex-col">
    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{part.partNumber}</h2>
            <Badge variant="primary">{part.revision || 'A'}</Badge>
            <StatusBadge status={part.lifecycleStatus} />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{part.name}</p>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          <XCircle className="h-5 w-5" />
        </button>
      </div>
    </div>

    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <p className="text-xs text-slate-500 dark:text-slate-400">On Hand</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white font-mono">{part.onHand}</p>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <p className="text-xs text-slate-500 dark:text-slate-400">Unit Cost</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white font-mono">{formatCurrency(part.unitCost)}</p>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <p className="text-xs text-slate-500 dark:text-slate-400">Lead Time</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white font-mono">{part.leadTimeDays}d</p>
        </div>
      </div>

      {/* Description */}
      {part.description && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{part.description}</p>
        </div>
      )}

      {/* Classification */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Classification</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Category</span>
            <span className="text-slate-900 dark:text-white">{part.category}</span>
          </div>
          {part.subCategory && (
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Subcategory</span>
              <span className="text-slate-900 dark:text-white">{part.subCategory}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Type</span>
            <Badge>{part.makeOrBuy}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">UoM</span>
            <span className="text-slate-900 dark:text-white">{part.unit}</span>
          </div>
        </div>
      </div>

      {/* Compliance */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Compliance & Export</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {part.countryOfOrigin && (
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Country</span>
              <span className="text-slate-900 dark:text-white">{part.countryOfOrigin}</span>
            </div>
          )}
          {part.hsCode && (
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">HS Code</span>
              <span className="text-slate-900 dark:text-white font-mono">{part.hsCode}</span>
            </div>
          )}
          {part.eccn && (
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">ECCN</span>
              <span className="text-slate-900 dark:text-white font-mono">{part.eccn}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">ITAR</span>
            {part.itarControlled ? (
              <Badge variant="danger">Controlled</Badge>
            ) : (
              <Badge variant="success">Not Controlled</Badge>
            )}
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">NDAA</span>
            {part.ndaaCompliant ? (
              <Badge variant="success">Compliant</Badge>
            ) : (
              <Badge variant="warning">Non-Compliant</Badge>
            )}
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">RoHS</span>
            {part.rohsCompliant ? (
              <Badge variant="success">Compliant</Badge>
            ) : (
              <Badge variant="default">N/A</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tracking */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tracking</h3>
        <div className="flex gap-2 flex-wrap">
          {part.serialControl && <Badge variant="info">Serial Tracked</Badge>}
          {part.lotControl && <Badge variant="info">Lot Tracked</Badge>}
          {part.critical && <Badge variant="danger">Critical</Badge>}
          {part.shelfLifeDays && <Badge variant="warning">Shelf Life: {part.shelfLifeDays}d</Badge>}
        </div>
      </div>

      {/* Supplier Info */}
      {part.primarySupplier && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Primary Supplier</h3>
          <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-sm">
            <p className="font-medium text-slate-900 dark:text-white">{part.primarySupplier.name}</p>
            <p className="text-slate-500 dark:text-slate-400">Code: {part.primarySupplier.code}</p>
            {part.primarySupplier.country && (
              <p className="text-slate-500 dark:text-slate-400">Country: {part.primarySupplier.country}</p>
            )}
          </div>
        </div>
      )}

      {/* Links */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Related</h3>
        <div className="space-y-2">
          <button className="w-full flex items-center justify-between p-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              Documents
            </span>
            <span className="text-slate-500">{part.documentCount}</span>
          </button>
          <button className="w-full flex items-center justify-between p-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg">
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-400" />
              Suppliers
            </span>
            <span className="text-slate-500">{part.supplierCount}</span>
          </button>
          <button className="w-full flex items-center justify-between p-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg">
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-400" />
              Alternates
            </span>
            <span className="text-slate-500">{part.alternateCount}</span>
          </button>
          <button className="w-full flex items-center justify-between p-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg">
            <span className="flex items-center gap-2">
              <History className="h-4 w-4 text-slate-400" />
              History
            </span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>

    {/* Footer Actions */}
    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex gap-2">
      <button className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600">
        <Edit className="h-4 w-4 inline mr-2" />
        Edit
      </button>
      <button className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">
        <Eye className="h-4 w-4 inline mr-2" />
        Full View
      </button>
    </div>
  </div>
);

// Main Parts Master Component
export default function PartsMasterConnected() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  // Use the API hook
  const { parts, total, totalPages, isLoading, isError, refresh } = useParts({
    page,
    pageSize: 20,
    search: searchQuery || undefined,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    type: selectedType !== 'all' ? selectedType : undefined,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
  });

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-xl p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-danger-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-danger-700 dark:text-danger-400">Failed to load parts</h2>
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
                  <li className="text-slate-700 dark:text-slate-200 font-medium">Parts Master</li>
                </ol>
              </nav>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Parts Master</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Manage {formatNumber(total)} parts with AS9100/ITAR compliance
              </p>
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
                <Upload className="h-4 w-4" />
                Import
              </button>
              <button className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Part
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Parts List */}
          <div className={cn('flex-1', selectedPart && 'hidden lg:block')}>
            {/* Filters Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
              <div className="p-4 flex items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search parts..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Quick Filters */}
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>

                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  {types.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  {statuses.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    'px-3 py-2 text-sm font-medium rounded-lg flex items-center gap-2',
                    showFilters
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  )}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </button>
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing <span className="font-medium text-slate-900 dark:text-white">{parts.length}</span> of{' '}
                <span className="font-medium text-slate-900 dark:text-white">{total}</span> parts
              </p>
            </div>

            {/* Loading State */}
            {isLoading ? (
              <LoadingSkeleton />
            ) : (
              /* Parts Table */
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Part</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Stock</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Cost</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Compliance</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                          No parts found. Try adjusting your filters.
                        </td>
                      </tr>
                    ) : (
                      parts.map((part) => (
                        <tr
                          key={part.id}
                          className={cn(
                            'border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors',
                            selectedPart?.id === part.id && 'bg-primary-50 dark:bg-primary-900/20'
                          )}
                          onClick={() => setSelectedPart(part)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="text-slate-300 dark:text-slate-600 hover:text-warning-500"
                              >
                                {part.critical ? (
                                  <Star className="h-4 w-4 fill-warning-500 text-warning-500" />
                                ) : (
                                  <StarOff className="h-4 w-4" />
                                )}
                              </button>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-medium text-primary-600 dark:text-primary-400">
                                    {part.partNumber}
                                  </span>
                                  <Badge variant="default">{part.revision || 'A'}</Badge>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs">{part.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge>{part.category}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-slate-600 dark:text-slate-400">{part.makeOrBuy}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-mono text-sm text-slate-900 dark:text-white">{part.onHand}</span>
                              <StockStatus current={part.onHand} min={part.minStock} />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono text-sm text-slate-900 dark:text-white">{formatCurrency(part.unitCost)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={part.lifecycleStatus} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {part.itarControlled && <Badge variant="danger">ITAR</Badge>}
                              {!part.ndaaCompliant && <Badge variant="warning">NDAA</Badge>}
                              {part.serialControl && <Badge variant="info">SN</Badge>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPart(part);
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                              >
                                <MoreHorizontal className="h-4 w-4" />
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
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                        if (pageNum > totalPages) return null;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={cn(
                              'px-3 py-1.5 text-sm rounded',
                              pageNum === page
                                ? 'bg-primary-600 text-white'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                            )}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
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
            )}
          </div>

          {/* Detail Panel */}
          {selectedPart && (
            <div className="w-96 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden lg:block">
              <PartDetailPanel part={selectedPart} onClose={() => setSelectedPart(null)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
