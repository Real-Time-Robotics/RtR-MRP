'use client';

import React, { useState } from 'react';
import {
  Calculator,
  ChevronRight,
  ChevronLeft,
  Check,
  FileText,
  Package,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ArrowRight,
  Download,
  Send,
  Building,
  Calendar,
  DollarSign,
  TrendingUp,
  Filter,
  Search,
  Sparkles,
  Zap,
  Eye,
  Plus,
  RefreshCw,
  BarChart3,
  Layers,
  Target,
  Box,
} from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

// =============================================================================
// MRP WIZARD - STEP-BY-STEP WORKFLOW
// Giao diện wizard giúp người dùng dễ dàng thực hiện MRP
// =============================================================================

// Types
interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'current' | 'completed';
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  customer: string;
  product: string;
  productName: string;
  quantity: number;
  requiredDate: string;
  status: string;
  value: number;
  selected: boolean;
}

interface MaterialRequirement {
  id: string;
  partNumber: string;
  partName: string;
  category: string;
  unit: string;
  required: number;
  onHand: number;
  onOrder: number;
  safetyStock: number;
  shortage: number;
  status: 'OK' | 'LOW' | 'CRITICAL';
  supplier: string;
  leadTime: number;
  unitCost: number;
}

interface PurchaseSuggestion {
  id: string;
  partNumber: string;
  partName: string;
  supplier: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  orderDate: string;
  requiredDate: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
  selected: boolean;
}

// Mock Data
const mockSalesOrders: SalesOrder[] = [
  { id: '1', orderNumber: 'SO-2025-001', customer: 'ABC Manufacturing', product: 'FG-PRD-A1', productName: 'Sản phẩm Model A1', quantity: 10, requiredDate: '2025-01-15', status: 'Confirmed', value: 150000000, selected: false },
  { id: '2', orderNumber: 'SO-2025-002', customer: 'XYZ Industries', product: 'FG-PRD-A2', productName: 'Sản phẩm Model A2', quantity: 5, requiredDate: '2025-01-20', status: 'Confirmed', value: 92500000, selected: false },
  { id: '3', orderNumber: 'SO-2025-003', customer: 'Đông Á Group', product: 'FG-PRD-B1', productName: 'Sản phẩm Model B1', quantity: 15, requiredDate: '2025-01-25', status: 'Pending', value: 180000000, selected: false },
  { id: '4', orderNumber: 'SO-2025-004', customer: 'Tech Solutions', product: 'FG-PRD-A1', productName: 'Sản phẩm Model A1', quantity: 8, requiredDate: '2025-01-30', status: 'Confirmed', value: 120000000, selected: false },
];

const mockMRPResults: MaterialRequirement[] = [
  { id: '1', partNumber: 'CMP-BRG-002', partName: 'Bạc đạn bi 6201-2RS', category: 'Components', unit: 'pcs', required: 60, onHand: 25, onOrder: 0, safetyStock: 30, shortage: 65, status: 'CRITICAL', supplier: 'SKF Vietnam', leadTime: 7, unitCost: 42000 },
  { id: '2', partNumber: 'CMP-MOT-001', partName: 'Motor DC 12V 50W', category: 'Components', unit: 'pcs', required: 40, onHand: 15, onOrder: 10, safetyStock: 10, shortage: 25, status: 'CRITICAL', supplier: 'Oriental Motor VN', leadTime: 14, unitCost: 250000 },
  { id: '3', partNumber: 'RM-STL-002', partName: 'Thép tấm carbon 3mm', category: 'Raw Materials', unit: 'kg', required: 180, onHand: 120, onOrder: 0, safetyStock: 40, shortage: 100, status: 'LOW', supplier: 'Thép Việt Nam Steel', leadTime: 7, unitCost: 26000 },
  { id: '4', partNumber: 'CMP-GBX-001', partName: 'Hộp số giảm tốc 1:10', category: 'Components', unit: 'pcs', required: 30, onHand: 18, onOrder: 5, safetyStock: 5, shortage: 12, status: 'LOW', supplier: 'Oriental Motor VN', leadTime: 21, unitCost: 450000 },
  { id: '5', partNumber: 'CMP-SCR-001', partName: 'Vít lục giác M4x10 inox', category: 'Components', unit: 'pcs', required: 800, onHand: 2500, onOrder: 0, safetyStock: 500, shortage: 0, status: 'OK', supplier: 'Ốc vít Tân Tiến', leadTime: 3, unitCost: 500 },
  { id: '6', partNumber: 'RM-ALU-001', partName: 'Nhôm tấm 1.5mm', category: 'Raw Materials', unit: 'kg', required: 75, onHand: 85, onOrder: 50, safetyStock: 30, shortage: 0, status: 'OK', supplier: 'Nhôm Đông Á', leadTime: 10, unitCost: 85000 },
];

const mockPurchaseSuggestions: PurchaseSuggestion[] = [
  { id: '1', partNumber: 'CMP-MOT-001', partName: 'Motor DC 12V 50W', supplier: 'Oriental Motor VN', quantity: 25, unit: 'pcs', unitCost: 250000, totalCost: 6250000, orderDate: '2024-12-27', requiredDate: '2025-01-10', priority: 'URGENT', selected: true },
  { id: '2', partNumber: 'CMP-BRG-002', partName: 'Bạc đạn bi 6201-2RS', supplier: 'SKF Vietnam', quantity: 65, unit: 'pcs', unitCost: 42000, totalCost: 2730000, orderDate: '2025-01-03', requiredDate: '2025-01-10', priority: 'URGENT', selected: true },
  { id: '3', partNumber: 'CMP-GBX-001', partName: 'Hộp số giảm tốc 1:10', supplier: 'Oriental Motor VN', quantity: 12, unit: 'pcs', unitCost: 450000, totalCost: 5400000, orderDate: '2024-12-22', requiredDate: '2025-01-12', priority: 'HIGH', selected: true },
  { id: '4', partNumber: 'RM-STL-002', partName: 'Thép tấm carbon 3mm', supplier: 'Thép Việt Nam Steel', quantity: 100, unit: 'kg', unitCost: 26000, totalCost: 2600000, orderDate: '2025-01-05', requiredDate: '2025-01-12', priority: 'NORMAL', selected: true },
];

// =============================================================================
// STEP INDICATOR COMPONENT
// =============================================================================

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          {/* Step circle */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300',
                step.status === 'completed' && 'bg-green-500 text-white',
                step.status === 'current' && 'bg-purple-600 text-white shadow-lg shadow-purple-500/30',
                step.status === 'pending' && 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              )}
            >
              {step.status === 'completed' ? (
                <Check className="w-6 h-6" />
              ) : (
                step.icon
              )}
            </div>
            <div className="mt-2 text-center">
              <p className={cn(
                'text-sm font-medium',
                step.status === 'current' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500'
              )}>
                {step.title}
              </p>
              <p className="text-xs text-gray-400 hidden sm:block">{step.description}</p>
            </div>
          </div>

          {/* Connector line */}
          {index < steps.length - 1 && (
            <div className={cn(
              'flex-1 h-1 mx-4 rounded transition-all duration-300',
              currentStep > index + 1 ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// =============================================================================
// STATUS BADGE COMPONENT
// =============================================================================

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    LOW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    OK: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    NORMAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  };

  const icons: Record<string, React.ReactNode> = {
    CRITICAL: <XCircle className="w-3 h-3" />,
    LOW: <AlertTriangle className="w-3 h-3" />,
    OK: <CheckCircle className="w-3 h-3" />,
    URGENT: <Zap className="w-3 h-3" />,
    HIGH: <AlertTriangle className="w-3 h-3" />,
    NORMAL: <Clock className="w-3 h-3" />,
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border',
      styles[status] || 'bg-gray-100 text-gray-700'
    )}>
      {icons[status]}
      {status}
    </span>
  );
}

// =============================================================================
// MAIN MRP WIZARD COMPONENT
// =============================================================================

export default function MRPWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [orders, setOrders] = useState(mockSalesOrders);
  const [mrpResults, setMrpResults] = useState<MaterialRequirement[]>([]);
  const [purchaseSuggestions, setPurchaseSuggestions] = useState<PurchaseSuggestion[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const steps: Step[] = [
    { id: 1, title: 'Chọn đơn hàng', description: 'Chọn nguồn nhu cầu', icon: <FileText className="w-5 h-5" />, status: currentStep > 1 ? 'completed' : currentStep === 1 ? 'current' : 'pending' },
    { id: 2, title: 'Tính toán MRP', description: 'Phân tích nhu cầu', icon: <Calculator className="w-5 h-5" />, status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'current' : 'pending' },
    { id: 3, title: 'Xem kết quả', description: 'Vật tư thiếu hụt', icon: <BarChart3 className="w-5 h-5" />, status: currentStep > 3 ? 'completed' : currentStep === 3 ? 'current' : 'pending' },
    { id: 4, title: 'Tạo đề xuất', description: 'Đề xuất mua hàng', icon: <ShoppingCart className="w-5 h-5" />, status: currentStep === 4 ? 'current' : 'pending' },
  ];

  const selectedOrders = orders.filter((o) => o.selected);
  const selectedCount = selectedOrders.length;
  const totalValue = selectedOrders.reduce((sum, o) => sum + o.value, 0);
  const totalQuantity = selectedOrders.reduce((sum, o) => sum + o.quantity, 0);

  const handleOrderToggle = (id: string) => {
    setOrders(orders.map((o) => o.id === id ? { ...o, selected: !o.selected } : o));
  };

  const handleSelectAll = () => {
    const allSelected = orders.every((o) => o.selected);
    setOrders(orders.map((o) => ({ ...o, selected: !allSelected })));
  };

  const handleRunMRP = () => {
    setIsCalculating(true);
    setTimeout(() => {
      setMrpResults(mockMRPResults);
      setPurchaseSuggestions(mockPurchaseSuggestions);
      setIsCalculating(false);
      setCurrentStep(3);
    }, 2000);
  };

  const handlePurchaseToggle = (id: string) => {
    setPurchaseSuggestions(purchaseSuggestions.map((p) => 
      p.id === id ? { ...p, selected: !p.selected } : p
    ));
  };

  const filteredResults = filterStatus === 'all' 
    ? mrpResults 
    : mrpResults.filter((r) => r.status === filterStatus);

  const criticalCount = mrpResults.filter((r) => r.status === 'CRITICAL').length;
  const lowCount = mrpResults.filter((r) => r.status === 'LOW').length;
  const okCount = mrpResults.filter((r) => r.status === 'OK').length;
  const totalPurchaseValue = purchaseSuggestions.filter((p) => p.selected).reduce((sum, p) => sum + p.totalCost, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30">
              <Calculator className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                MRP Planning
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Hoạch định nhu cầu vật tư và đề xuất mua hàng
              </p>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator steps={steps} currentStep={currentStep} />

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          
          {/* STEP 1: Select Orders */}
          {currentStep === 1 && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Bước 1: Chọn đơn hàng nguồn
                  </h2>
                  <p className="text-sm text-gray-500">
                    Chọn các đơn hàng cần tính toán nhu cầu vật tư
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Đã chọn</p>
                  <p className="text-2xl font-bold text-purple-600">{selectedCount} đơn</p>
                </div>
              </div>

              {/* Summary cards */}
              {selectedCount > 0 && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                    <p className="text-sm text-purple-600 dark:text-purple-400">Số đơn hàng</p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{selectedCount}</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <p className="text-sm text-blue-600 dark:text-blue-400">Tổng sản phẩm</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalQuantity}</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <p className="text-sm text-green-600 dark:text-green-400">Tổng giá trị</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(totalValue)}</p>
                  </div>
                </div>
              )}

              {/* Orders table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                      <th className="text-left py-3 px-4">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300"
                          checked={orders.every((o) => o.selected)}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Đơn hàng</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Khách hàng</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Sản phẩm</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Số lượng</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Ngày cần</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Giá trị</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr 
                        key={order.id}
                        onClick={() => handleOrderToggle(order.id)}
                        className={cn(
                          'border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors',
                          order.selected 
                            ? 'bg-purple-50 dark:bg-purple-900/20' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        )}
                      >
                        <td className="py-3 px-4">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300"
                            checked={order.selected}
                            onChange={() => handleOrderToggle(order.id)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-900 dark:text-white">{order.orderNumber}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{order.customer}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-mono text-sm text-gray-600 dark:text-gray-400">{order.product}</p>
                            <p className="text-sm text-gray-500">{order.productName}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">{order.quantity}</td>
                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{order.requiredDate}</td>
                        <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(order.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 2: Calculate MRP */}
          {currentStep === 2 && (
            <div className="p-6">
              <div className="text-center py-12">
                {isCalculating ? (
                  <>
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Đang tính toán MRP...
                    </h2>
                    <p className="text-gray-500">
                      Hệ thống đang phân tích BOM và tính toán nhu cầu vật tư
                    </p>
                    <div className="mt-6 max-w-xs mx-auto">
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-600 rounded-full animate-pulse" style={{ width: '70%' }} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Calculator className="w-10 h-10 text-purple-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Sẵn sàng tính toán
                    </h2>
                    <p className="text-gray-500 mb-6">
                      Đã chọn {selectedCount} đơn hàng với tổng {totalQuantity} sản phẩm
                    </p>
                    <button
                      onClick={handleRunMRP}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl shadow-lg shadow-purple-500/30 transition-all flex items-center gap-2 mx-auto"
                    >
                      <Zap className="w-5 h-5" />
                      Chạy MRP ngay
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: View Results */}
          {currentStep === 3 && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Bước 3: Kết quả phân tích vật tư
                  </h2>
                  <p className="text-sm text-gray-500">
                    Danh sách vật tư và tình trạng thiếu hụt
                  </p>
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
                >
                  <option value="all">Tất cả ({mrpResults.length})</option>
                  <option value="CRITICAL">🔴 Thiếu nghiêm trọng ({criticalCount})</option>
                  <option value="LOW">🟡 Sắp hết ({lowCount})</option>
                  <option value="OK">🟢 Đủ hàng ({okCount})</option>
                </select>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600 dark:text-red-400">Thiếu nghiêm trọng</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">{criticalCount}</p>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-amber-600 dark:text-amber-400">Sắp hết</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{lowCount}</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">Đủ hàng</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{okCount}</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingCart className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-purple-600 dark:text-purple-400">Cần mua</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{criticalCount + lowCount}</p>
                </div>
              </div>

              {/* Results table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Trạng thái</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Mã vật tư</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Tên vật tư</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">Cần</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">Tồn</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">Đang đặt</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 bg-red-50 dark:bg-red-900/20">THIẾU</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">NCC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((item) => (
                      <tr 
                        key={item.id}
                        className={cn(
                          'border-b border-gray-100 dark:border-gray-700',
                          item.status === 'CRITICAL' && 'bg-red-50/50 dark:bg-red-900/10',
                          item.status === 'LOW' && 'bg-amber-50/50 dark:bg-amber-900/10'
                        )}
                      >
                        <td className="py-3 px-4">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="py-3 px-4 font-mono text-sm font-medium text-gray-900 dark:text-white">
                          {item.partNumber}
                        </td>
                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{item.partName}</td>
                        <td className="py-3 px-4 text-right font-medium">{item.required} {item.unit}</td>
                        <td className="py-3 px-4 text-right">{item.onHand}</td>
                        <td className="py-3 px-4 text-right text-blue-600">{item.onOrder}</td>
                        <td className={cn(
                          'py-3 px-4 text-right font-bold bg-red-50 dark:bg-red-900/20',
                          item.shortage > 0 ? 'text-red-600' : 'text-green-600'
                        )}>
                          {item.shortage > 0 ? item.shortage : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">{item.supplier}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Formula explanation */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Công thức:</strong> THIẾU = Cần - Tồn kho - Đang đặt + Tồn an toàn
                </span>
              </div>
            </div>
          )}

          {/* STEP 4: Purchase Suggestions */}
          {currentStep === 4 && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Bước 4: Đề xuất mua hàng
                  </h2>
                  <p className="text-sm text-gray-500">
                    Xác nhận và tạo đơn đặt hàng
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Tổng giá trị đề xuất</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalPurchaseValue)}</p>
                </div>
              </div>

              {/* Urgent alert */}
              {purchaseSuggestions.some((p) => p.priority === 'URGENT') && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-300">
                      Có {purchaseSuggestions.filter((p) => p.priority === 'URGENT').length} vật tư cần đặt hàng GẤP!
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Ngày đặt hàng đề xuất đã qua hoặc sắp đến.
                    </p>
                  </div>
                </div>
              )}

              {/* Purchase table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                      <th className="text-left py-3 px-4">
                        <input type="checkbox" className="rounded" />
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Ưu tiên</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Vật tư</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Nhà cung cấp</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">Số lượng</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">Thành tiền</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Ngày đặt</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Ngày cần</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseSuggestions.map((item) => (
                      <tr 
                        key={item.id}
                        className={cn(
                          'border-b border-gray-100 dark:border-gray-700',
                          item.priority === 'URGENT' && 'bg-red-50/50 dark:bg-red-900/10'
                        )}
                      >
                        <td className="py-3 px-4">
                          <input 
                            type="checkbox" 
                            className="rounded"
                            checked={item.selected}
                            onChange={() => handlePurchaseToggle(item.id)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={item.priority} />
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">{item.partNumber}</p>
                            <p className="text-sm text-gray-500">{item.partName}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{item.supplier}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-medium">{item.quantity} {item.unit}</td>
                        <td className="py-3 px-4 text-right font-semibold text-purple-600">{formatCurrency(item.totalCost)}</td>
                        <td className={cn(
                          'py-3 px-4',
                          new Date(item.orderDate) < new Date() && 'text-red-600 font-medium'
                        )}>
                          {item.orderDate}
                        </td>
                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{item.requiredDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary by supplier */}
              <div className="mt-6">
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Tổng hợp theo nhà cung cấp</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(
                    purchaseSuggestions.filter((p) => p.selected).reduce((acc, p) => {
                      if (!acc[p.supplier]) acc[p.supplier] = { items: 0, total: 0 };
                      acc[p.supplier].items++;
                      acc[p.supplier].total += p.totalCost;
                      return acc;
                    }, {} as Record<string, { items: number; total: number }>)
                  ).map(([supplier, data]) => (
                    <div key={supplier} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">{supplier}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{data.items} vật tư</span>
                        <span className="font-semibold text-purple-600">{formatCurrency(data.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer navigation */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors',
                currentStep === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <ChevronLeft className="w-5 h-5" />
              Quay lại
            </button>

            <div className="flex items-center gap-3">
              {currentStep === 4 && (
                <>
                  <button className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                    <Download className="w-5 h-5" />
                    Xuất Excel
                  </button>
                  <button className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl shadow-lg shadow-purple-500/30 transition-all">
                    <Send className="w-5 h-5" />
                    Tạo đơn mua hàng
                  </button>
                </>
              )}
              
              {currentStep < 4 && currentStep !== 2 && (
                <button
                  onClick={() => {
                    if (currentStep === 1 && selectedCount > 0) {
                      setCurrentStep(2);
                    } else if (currentStep === 3) {
                      setCurrentStep(4);
                    }
                  }}
                  disabled={currentStep === 1 && selectedCount === 0}
                  className={cn(
                    'flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all',
                    (currentStep === 1 && selectedCount === 0)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/30'
                  )}
                >
                  Tiếp tục
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {currentStep === 2 && !isCalculating && (
                <button
                  onClick={handleRunMRP}
                  className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl shadow-lg shadow-purple-500/30 transition-all"
                >
                  <Zap className="w-5 h-5" />
                  Chạy MRP
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
