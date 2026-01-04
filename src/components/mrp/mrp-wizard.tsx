'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calculator,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Package,
  ShoppingCart,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Truck,
  FileText,
  Download,
  Plus,
  RefreshCw,
  Search,
  Calendar,
  Building2,
  Sparkles,
  TrendingUp,
  Clock,
  Zap,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useSalesOrdersForMRP,
  useMRPCalculation,
  formatCurrency,
  formatDate,
  getPriorityLabel,
  type SalesOrderForMRP,
  type MRPRequirement,
  type PurchaseSuggestion,
} from '@/lib/hooks/use-mrp-data';

// =============================================================================
// MRP WIZARD - 4-Step wizard với real API integration
// =============================================================================

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: Step[] = [
  { id: 1, title: 'Chọn đơn hàng', description: 'Chọn SO cần hoạch định', icon: <ShoppingCart className="w-5 h-5" /> },
  { id: 2, title: 'Chạy MRP', description: 'Tính toán nhu cầu vật tư', icon: <Calculator className="w-5 h-5" /> },
  { id: 3, title: 'Kết quả', description: 'Xem nhu cầu và thiếu hụt', icon: <FileText className="w-5 h-5" /> },
  { id: 4, title: 'Đề xuất mua', description: 'Tạo đề xuất mua hàng', icon: <Truck className="w-5 h-5" /> },
];

// =============================================================================
// STEP INDICATOR
// =============================================================================

interface StepIndicatorProps {
  currentStep: number;
  completedSteps: number[];
}

function StepIndicator({ currentStep, completedSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = currentStep === step.id;

        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300',
                  isCompleted
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                    : isCurrent
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 scale-110'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                )}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : step.icon}
              </div>
              <div className="hidden sm:block">
                <p className={cn(
                  'font-semibold text-sm',
                  isCurrent ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'
                )}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                'flex-1 h-1 mx-4 rounded-full transition-colors duration-300',
                completedSteps.includes(step.id) ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// =============================================================================
// STEP 1: ORDER SELECTION
// =============================================================================

interface Step1Props {
  orders: SalesOrderForMRP[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  isLoading: boolean;
}

function Step1OrderSelection({ orders, selectedIds, onSelectionChange, isLoading }: Step1Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const handleSelectAll = () => {
    if (selectedIds.length === filteredOrders.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredOrders.map((o) => o.id));
    }
  };

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const selectedOrders = orders.filter((o) => selectedIds.includes(o.id));
  const totalValue = selectedOrders.reduce((sum, o) => sum + o.totalValue, 0);
  const totalItems = selectedOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <span className="ml-3 text-gray-500">Đang tải đơn hàng...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-xs font-medium">Đã chọn</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedIds.length}</p>
          <p className="text-xs text-gray-500">đơn hàng</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
            <Package className="w-4 h-4" />
            <span className="text-xs font-medium">Tổng sản phẩm</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalItems}</p>
          <p className="text-xs text-gray-500">sản phẩm</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Giá trị</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</p>
          <p className="text-xs text-gray-500">VND</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, khách hàng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="Confirmed">Đã xác nhận</option>
          <option value="Pending">Chờ xác nhận</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredOrders.length && filteredOrders.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-xs font-semibold text-gray-500 uppercase">Chọn tất cả</span>
                  </label>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã đơn</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Khách hàng</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày giao</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Giá trị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredOrders.map((order) => {
                const isSelected = selectedIds.includes(order.id);
                return (
                  <tr
                    key={order.id}
                    onClick={() => handleToggle(order.id)}
                    className={cn(
                      'cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggle(order.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium text-gray-900 dark:text-white">
                        {order.orderNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{order.customer.name}</p>
                        <p className="text-xs text-gray-500">{order.items.length} sản phẩm</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">{formatDate(order.requiredDate)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium',
                        order.status === 'Confirmed'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      )}>
                        {order.status === 'Confirmed' ? 'Đã xác nhận' : 'Chờ xác nhận'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(order.totalValue)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="py-12 text-center">
            <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500">Không tìm thấy đơn hàng</p>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// STEP 2: MRP CALCULATION
// =============================================================================

interface Step2Props {
  isCalculating: boolean;
  selectedCount: number;
  onRun: () => void;
}

function Step2Calculation({ isCalculating, selectedCount, onRun }: Step2Props) {
  const [progress, setProgress] = useState(0);

  React.useEffect(() => {
    if (isCalculating) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + Math.random() * 15, 95));
      }, 200);
      return () => clearInterval(interval);
    } else {
      setProgress(100);
    }
  }, [isCalculating]);

  return (
    <div className="max-w-xl mx-auto py-12 text-center">
      {isCalculating ? (
        <>
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Calculator className="w-12 h-12 text-white animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Đang tính toán MRP...
          </h3>
          <p className="text-gray-500 mb-6">
            Phân tích BOM và tính toán nhu cầu vật tư cho {selectedCount} đơn hàng
          </p>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang xử lý...
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
        </>
      ) : (
        <>
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 flex items-center justify-center">
            <Zap className="w-12 h-12 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Sẵn sàng chạy MRP
          </h3>
          <p className="text-gray-500 mb-6">
            Đã chọn <span className="font-semibold text-purple-600">{selectedCount}</span> đơn hàng để hoạch định
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">MRP sẽ thực hiện:</p>
                <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Phân tích BOM cho tất cả sản phẩm</li>
                  <li>• Tính toán nhu cầu nguyên vật liệu</li>
                  <li>• So sánh với tồn kho hiện tại</li>
                  <li>• Tạo đề xuất mua hàng</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={onRun}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-200 flex items-center gap-2 mx-auto"
          >
            <Calculator className="w-5 h-5" />
            Chạy MRP
          </button>
        </>
      )}
    </div>
  );
}

// =============================================================================
// STEP 3: RESULTS
// =============================================================================

interface Step3Props {
  requirements: MRPRequirement[];
  summary: {
    totalRequirements: number;
    criticalItems: number;
    lowItems: number;
    okItems: number;
  };
}

function Step3Results({ requirements, summary }: Step3Props) {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredRequirements = useMemo(() => {
    if (statusFilter === 'all') return requirements;
    return requirements.filter((r) => r.status === statusFilter);
  }, [requirements, statusFilter]);

  const statusConfig = {
    CRITICAL: { icon: <AlertCircle className="w-4 h-4" />, bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Thiếu nghiêm trọng' },
    LOW: { icon: <AlertTriangle className="w-4 h-4" />, bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Sắp hết' },
    OK: { icon: <CheckCircle className="w-4 h-4" />, bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Đủ hàng' },
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={cn(
            'rounded-xl p-4 border-2 transition-all text-left',
            statusFilter === 'all'
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
          )}
        >
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalRequirements}</p>
          <p className="text-sm text-gray-500">Tổng vật tư</p>
        </button>
        <button
          onClick={() => setStatusFilter('CRITICAL')}
          className={cn(
            'rounded-xl p-4 border-2 transition-all text-left',
            statusFilter === 'CRITICAL'
              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-red-300'
          )}
        >
          <p className="text-2xl font-bold text-red-600">{summary.criticalItems}</p>
          <p className="text-sm text-gray-500">Thiếu nghiêm trọng</p>
        </button>
        <button
          onClick={() => setStatusFilter('LOW')}
          className={cn(
            'rounded-xl p-4 border-2 transition-all text-left',
            statusFilter === 'LOW'
              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-amber-300'
          )}
        >
          <p className="text-2xl font-bold text-amber-600">{summary.lowItems}</p>
          <p className="text-sm text-gray-500">Sắp hết</p>
        </button>
        <button
          onClick={() => setStatusFilter('OK')}
          className={cn(
            'rounded-xl p-4 border-2 transition-all text-left',
            statusFilter === 'OK'
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
          )}
        >
          <p className="text-2xl font-bold text-green-600">{summary.okItems}</p>
          <p className="text-sm text-gray-500">Đủ hàng</p>
        </button>
      </div>

      {/* Requirements Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vật tư</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Nhu cầu</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Tồn kho</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Đang đặt</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Thiếu</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nhà cung cấp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredRequirements.map((req) => {
                const config = statusConfig[req.status];
                return (
                  <tr key={req.partId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-mono font-medium text-gray-900 dark:text-white">{req.partNumber}</p>
                        <p className="text-sm text-gray-500">{req.partName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                      {req.grossRequirement} {req.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                      {req.onHand} {req.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                      {req.onOrder} {req.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn('font-semibold', req.netRequirement > 0 ? 'text-red-600' : 'text-green-600')}>
                        {req.netRequirement > 0 ? `-${req.netRequirement}` : '0'} {req.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium', config.bg, config.text)}>
                        {config.icon}
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Building2 className="w-4 h-4" />
                        <span className="text-sm">{req.supplierName}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formula Explanation */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-sm">
        <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Công thức tính:</p>
        <p className="text-gray-600 dark:text-gray-400">
          <span className="font-mono bg-white dark:bg-gray-700 px-2 py-1 rounded">
            Thiếu = Nhu cầu - Tồn kho - Đang đặt + Safety Stock
          </span>
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// STEP 4: PURCHASE SUGGESTIONS
// =============================================================================

interface Step4Props {
  suggestions: PurchaseSuggestion[];
  totalValue: number;
}

function Step4Suggestions({ suggestions, totalValue }: Step4Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>(suggestions.map((s) => s.id));

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedSuggestions = suggestions.filter((s) => selectedIds.includes(s.id));
  const selectedValue = selectedSuggestions.reduce((sum, s) => sum + s.totalCost, 0);

  // Group by supplier
  const bySupplier = useMemo(() => {
    const grouped: Record<string, PurchaseSuggestion[]> = {};
    selectedSuggestions.forEach((s) => {
      if (!grouped[s.supplierName]) {
        grouped[s.supplierName] = [];
      }
      grouped[s.supplierName].push(s);
    });
    return grouped;
  }, [selectedSuggestions]);

  const priorityConfig = {
    URGENT: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
    HIGH: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
    NORMAL: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-5 border border-purple-200 dark:border-purple-800">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Tổng đề xuất mua hàng</p>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(selectedValue)}</p>
          <p className="text-sm text-gray-500">{selectedIds.length} / {suggestions.length} items đã chọn</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
            <Plus className="w-4 h-4" />
            Tạo PO
          </button>
        </div>
      </div>

      {/* Grouped by Supplier */}
      {Object.entries(bySupplier).map(([supplier, items]) => {
        const supplierTotal = items.reduce((sum, i) => sum + i.totalCost, 0);
        return (
          <div key={supplier} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-500" />
                <span className="font-semibold text-gray-900 dark:text-white">{supplier}</span>
                <span className="text-sm text-gray-500">({items.length} items)</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(supplierTotal)}</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((item) => {
                const pConfig = priorityConfig[item.priority];
                return (
                  <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => handleToggle(item.id)}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-gray-900 dark:text-white">{item.partNumber}</span>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', pConfig.bg, pConfig.text)}>
                          {getPriorityLabel(item.priority)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{item.partName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.quantity} {item.unit}
                      </p>
                      <p className="text-sm text-gray-500">@ {formatCurrency(item.unitCost)}</p>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(item.totalCost)}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>Lead: {item.leadTime} ngày</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {suggestions.length === 0 && (
        <div className="py-12 text-center">
          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
          <p className="text-gray-500">Không có đề xuất mua hàng - Tất cả vật tư đều đủ!</p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN WIZARD COMPONENT
// =============================================================================

export default function MRPWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const { orders, isLoading: ordersLoading } = useSalesOrdersForMRP();
  const { result: mrpResult, isCalculating, runMRP, reset } = useMRPCalculation();

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1:
        return selectedOrderIds.length > 0;
      case 2:
        return mrpResult !== null;
      case 3:
        return true;
      default:
        return false;
    }
  }, [currentStep, selectedOrderIds, mrpResult]);

  const handleNext = async () => {
    if (currentStep === 2 && !mrpResult) {
      await runMRP(selectedOrderIds);
    }

    setCompletedSteps((prev) => Array.from(new Set([...prev, currentStep])));
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleReset = () => {
    setCurrentStep(1);
    setCompletedSteps([]);
    setSelectedOrderIds([]);
    reset();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-lg shadow-purple-500/30">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MRP Wizard</h1>
            <p className="text-gray-500">Hoạch định nhu cầu vật tư</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Làm lại
        </button>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

      {/* Step Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        {currentStep === 1 && (
          <Step1OrderSelection
            orders={orders}
            selectedIds={selectedOrderIds}
            onSelectionChange={setSelectedOrderIds}
            isLoading={ordersLoading}
          />
        )}

        {currentStep === 2 && (
          <Step2Calculation
            isCalculating={isCalculating}
            selectedCount={selectedOrderIds.length}
            onRun={() => runMRP(selectedOrderIds)}
          />
        )}

        {currentStep === 3 && mrpResult && (
          <Step3Results
            requirements={mrpResult.requirements}
            summary={{
              totalRequirements: mrpResult.totalRequirements,
              criticalItems: mrpResult.criticalItems,
              lowItems: mrpResult.lowItems,
              okItems: mrpResult.okItems,
            }}
          />
        )}

        {currentStep === 4 && mrpResult && (
          <Step4Suggestions
            suggestions={mrpResult.suggestions}
            totalValue={mrpResult.totalPurchaseValue}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
            currentStep === 1
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          <ChevronLeft className="w-5 h-5" />
          Quay lại
        </button>

        <div className="flex items-center gap-2">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => completedSteps.includes(step.id) && setCurrentStep(step.id)}
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-all',
                currentStep === step.id
                  ? 'bg-purple-600 w-8'
                  : completedSteps.includes(step.id)
                  ? 'bg-green-500 cursor-pointer hover:scale-110'
                  : 'bg-gray-300 dark:bg-gray-600'
              )}
            />
          ))}
        </div>

        {currentStep < 4 ? (
          <button
            onClick={handleNext}
            disabled={!canProceed || isCalculating}
            className={cn(
              'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
              canProceed && !isCalculating
                ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/30'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
          >
            {isCalculating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Đang xử lý...
              </>
            ) : currentStep === 2 && !mrpResult ? (
              <>
                Chạy MRP
                <Zap className="w-5 h-5" />
              </>
            ) : (
              <>
                Tiếp tục
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        ) : (
          <Link
            href="/purchasing"
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 shadow-lg shadow-green-500/30 transition-all"
          >
            <CheckCircle className="w-5 h-5" />
            Hoàn tất
          </Link>
        )}
      </div>
    </div>
  );
}
