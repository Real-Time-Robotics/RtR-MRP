'use client';

import React, { useState } from 'react';
import {
  Layers,
  Search,
  Download,
  Plus,
  Eye,
  Edit,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  Package,
  Clock,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { useBOMs, useBOM, Product, BOMLine } from '@/lib/hooks/use-data';

// =============================================================================
// BOM PAGE - CONNECTED TO API
// =============================================================================

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

// Loading skeleton
const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded ml-auto" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// BOM Line Component
const BOMLineRow: React.FC<{
  line: BOMLine;
  depth?: number;
}> = ({ line, depth = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const hasAlternates = line.alternates && line.alternates.length > 0;

  return (
    <>
      <tr className={cn(
        'border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50',
        line.critical && 'bg-danger-50/50 dark:bg-danger-900/10'
      )}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2" style={{ paddingLeft: depth * 20 }}>
            {hasAlternates && (
              <button onClick={() => setExpanded(!expanded)} className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            )}
            <span className="font-mono text-sm text-primary-600 dark:text-primary-400">{line.partNumber}</span>
            {line.critical && <Badge variant="danger">Critical</Badge>}
          </div>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm text-slate-900 dark:text-white">{line.partName}</p>
          {line.partDescription && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{line.partDescription}</p>}
        </td>
        <td className="px-4 py-3">
          {line.module && <Badge>{line.module}</Badge>}
        </td>
        <td className="px-4 py-3 text-right">
          <span className="font-mono text-sm text-slate-900 dark:text-white">{line.quantity}</span>
          <span className="text-slate-500 dark:text-slate-400 text-xs ml-1">{line.unit}</span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="font-mono text-sm text-slate-900 dark:text-white">{formatCurrency(line.unitCost)}</span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="font-mono text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(line.extendedCost)}</span>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            <span className={cn(
              'font-mono text-sm',
              line.shortage > 0 ? 'text-danger-600 font-medium' : 'text-slate-900 dark:text-white'
            )}>
              {line.onHand}
            </span>
            {line.shortage > 0 && (
              <Badge variant="danger">-{line.shortage}</Badge>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-sm text-slate-600 dark:text-slate-400">{line.leadTimeDays}d</span>
        </td>
      </tr>
      {expanded && hasAlternates && line.alternates.map((alt, idx) => (
        <tr key={alt.id} className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30">
          <td className="px-4 py-2" style={{ paddingLeft: (depth + 1) * 20 + 24 }}>
            <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{alt.partNumber}</span>
            <span className="ml-2"><Badge variant="info">Alt {idx + 1}</Badge></span>
          </td>
          <td className="px-4 py-2">
            <p className="text-xs text-slate-600 dark:text-slate-400">{alt.name}</p>
          </td>
          <td className="px-4 py-2"></td>
          <td className="px-4 py-2"></td>
          <td className="px-4 py-2 text-right">
            <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{formatCurrency(alt.unitCost)}</span>
          </td>
          <td className="px-4 py-2"></td>
          <td className="px-4 py-2"></td>
          <td className="px-4 py-2"></td>
        </tr>
      ))}
    </>
  );
};

// BOM Detail Panel
const BOMDetailPanel: React.FC<{
  productId: string;
  onClose: () => void;
}> = ({ productId, onClose }) => {
  const { product, bomLines, summary, isLoading, isError } = useBOM(productId);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="h-full flex items-center justify-center text-danger-600">
        Failed to load BOM
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{product.sku}</h2>
              {product.revision && <Badge variant="primary">Rev {product.revision}</Badge>}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{product.name}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <span className="text-xl">&times;</span>
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Cost</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">{formatCurrency(summary.totalCost)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Margin</p>
              <p className="text-lg font-bold text-success-600 font-mono">{summary.margin}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Parts</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">{summary.totalParts}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Lead Time</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">{summary.longestLeadTime}d</p>
            </div>
          </div>
          {(summary.criticalCount > 0 || summary.shortageCount > 0) && (
            <div className="mt-3 flex gap-2">
              {summary.criticalCount > 0 && (
                <Badge variant="danger">{summary.criticalCount} Critical</Badge>
              )}
              {summary.shortageCount > 0 && (
                <Badge variant="warning">{summary.shortageCount} Shortages</Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* BOM Lines */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Part #</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Name</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Module</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Qty</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Unit Cost</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Ext Cost</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Stock</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Lead</th>
            </tr>
          </thead>
          <tbody>
            {bomLines.map((line) => (
              <BOMLineRow key={line.id} line={line} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Main BOM Page
export default function BOMConnected() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Use the API hook
  const { products, total, totalPages, isLoading, isError, refresh } = useBOMs({
    page,
    pageSize: 20,
    search: searchQuery || undefined,
  });

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-xl p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-danger-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-danger-700 dark:text-danger-400">Failed to load BOMs</h2>
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
                  <li className="text-slate-700 dark:text-slate-200 font-medium">Bill of Materials</li>
                </ol>
              </nav>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bill of Materials</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage product structures and component lists</p>
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
                New Product
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div className="flex gap-6">
            {/* Products List */}
            <div className={cn('flex-1', selectedProductId && 'hidden lg:block')}>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Product</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Parts</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">BOM Cost</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Price</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Margin</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                          No products found. Try adjusting your search.
                        </td>
                      </tr>
                    ) : (
                      products.map((product) => (
                        <tr
                          key={product.id}
                          onClick={() => setSelectedProductId(product.id)}
                          className={cn(
                            'border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer',
                            selectedProductId === product.id && 'bg-primary-50 dark:bg-primary-900/20'
                          )}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-primary-600 dark:text-primary-400">{product.sku}</span>
                              {product.revision && <Badge variant="default">{product.revision}</Badge>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{product.name}</p>
                            {product.description && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{product.description}</p>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-mono text-sm text-slate-900 dark:text-white">{product.bomLineCount}</span>
                              {product.criticalParts > 0 && (
                                <Badge variant="danger">{product.criticalParts} critical</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono text-sm text-slate-900 dark:text-white">{formatCurrency(product.totalBOMCost)}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono text-sm text-slate-900 dark:text-white">{formatCurrency(product.basePrice)}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono text-sm text-success-600">{product.margin}</span>
                          </td>
                          <td className="px-4 py-3">
                            <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                              <Eye className="h-4 w-4" />
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
            </div>

            {/* BOM Detail Panel */}
            {selectedProductId && (
              <div className="w-[600px] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0">
                <BOMDetailPanel productId={selectedProductId} onClose={() => setSelectedProductId(null)} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
