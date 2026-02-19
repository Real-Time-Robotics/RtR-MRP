'use client';

import React, { useState } from 'react';
import {
  Calculator,
  Package,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingDown,
  TrendingUp,
  Clock,
  Truck,
  FileText,
  Download,
  RefreshCw,
  Play,
  Filter,
  Search,
  ChevronRight,
  ChevronDown,
  Eye,
  Plus,
  Send,
  Building,
  Calendar,
  DollarSign,
  Layers,
  ArrowRight,
  AlertCircle,
  Info,
  Zap,
} from 'lucide-react';
import { cn, formatCurrency, formatNumber, formatDate } from '@/lib/utils';

// =============================================================================
// MRP PLANNING PAGE
// Material Requirements Planning - Tính toán nhu cầu vật tư
// =============================================================================

// Types
interface MaterialRequirement {
  id: string;
  partNumber: string;
  partName: string;
  category: string;
  unit: string;
  grossRequirement: number;
  onHand: number;
  onOrder: number;
  safetyStock: number;
  netRequirement: number;
  status: 'OK' | 'LOW' | 'CRITICAL' | 'OUT';
  leadTimeDays: number;
  suggestedOrderDate: string;
  supplier: {
    code: string;
    name: string;
  };
  unitCost: number;
  totalCost: number;
}

interface PurchaseSuggestion {
  id: string;
  partNumber: string;
  partName: string;
  supplier: string;
  supplierCode: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  leadTimeDays: number;
  requiredDate: string;
  suggestedOrderDate: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  status: 'PENDING' | 'APPROVED' | 'ORDERED';
}

interface SalesOrderForMRP {
  id: string;
  orderNumber: string;
  customer: string;
  product: string;
  quantity: number;
  requiredDate: string;
  status: string;
  selected: boolean;
}

// Mock Data - Sales Orders để tính MRP
const salesOrdersForMRP: SalesOrderForMRP[] = [
  { id: '1', orderNumber: 'SO-2025-001', customer: 'ABC Manufacturing', product: 'FG-PRD-A1', quantity: 10, requiredDate: '2025-01-15', status: 'Confirmed', selected: true },
  { id: '2', orderNumber: 'SO-2025-002', customer: 'XYZ Industries', product: 'FG-PRD-A2', quantity: 5, requiredDate: '2025-01-20', status: 'Confirmed', selected: true },
  { id: '3', orderNumber: 'SO-2025-003', customer: 'Đông Á Group', product: 'FG-PRD-B1', quantity: 15, requiredDate: '2025-01-25', status: 'Pending', selected: false },
];

// Mock Data - Kết quả tính toán MRP
const mrpResults: MaterialRequirement[] = [
  // Critical - Cần mua gấp
  { id: '1', partNumber: 'CMP-BRG-002', partName: 'Bạc đạn bi 6201-2RS', category: 'Components', unit: 'pcs', grossRequirement: 60, onHand: 25, onOrder: 0, safetyStock: 30, netRequirement: 65, status: 'CRITICAL', leadTimeDays: 7, suggestedOrderDate: '2025-01-03', supplier: { code: 'SUP-006', name: 'SKF Vietnam' }, unitCost: 42000, totalCost: 2730000 },
  { id: '2', partNumber: 'CMP-MOT-001', partName: 'Motor DC 12V 50W', category: 'Components', unit: 'pcs', grossRequirement: 40, onHand: 15, onOrder: 10, safetyStock: 10, netRequirement: 25, status: 'CRITICAL', leadTimeDays: 14, suggestedOrderDate: '2024-12-27', supplier: { code: 'SUP-007', name: 'Oriental Motor VN' }, unitCost: 250000, totalCost: 6250000 },
  
  // Low - Cần đặt hàng
  { id: '3', partNumber: 'RM-STL-002', partName: 'Thép tấm carbon 3mm', category: 'Raw Materials', unit: 'kg', grossRequirement: 180, onHand: 120, onOrder: 0, safetyStock: 40, netRequirement: 100, status: 'LOW', leadTimeDays: 7, suggestedOrderDate: '2025-01-05', supplier: { code: 'SUP-001', name: 'Thép Việt Nam Steel' }, unitCost: 26000, totalCost: 2600000 },
  { id: '4', partNumber: 'CMP-GBX-001', partName: 'Hộp số giảm tốc 1:10', category: 'Components', unit: 'pcs', grossRequirement: 30, onHand: 18, onOrder: 5, safetyStock: 5, netRequirement: 12, status: 'LOW', leadTimeDays: 21, suggestedOrderDate: '2024-12-22', supplier: { code: 'SUP-007', name: 'Oriental Motor VN' }, unitCost: 450000, totalCost: 5400000 },
  
  // OK - Đủ hàng
  { id: '5', partNumber: 'CMP-SCR-001', partName: 'Vít lục giác M4x10 inox', category: 'Components', unit: 'pcs', grossRequirement: 800, onHand: 2500, onOrder: 0, safetyStock: 500, netRequirement: 0, status: 'OK', leadTimeDays: 3, suggestedOrderDate: '-', supplier: { code: 'SUP-005', name: 'Ốc vít Tân Tiến' }, unitCost: 500, totalCost: 0 },
  { id: '6', partNumber: 'CMP-SCR-002', partName: 'Vít lục giác M5x12 inox', category: 'Components', unit: 'pcs', grossRequirement: 600, onHand: 2200, onOrder: 0, safetyStock: 500, netRequirement: 0, status: 'OK', leadTimeDays: 3, suggestedOrderDate: '-', supplier: { code: 'SUP-005', name: 'Ốc vít Tân Tiến' }, unitCost: 600, totalCost: 0 },
  { id: '7', partNumber: 'RM-STL-001', partName: 'Thép tấm carbon 2mm', category: 'Raw Materials', unit: 'kg', grossRequirement: 120, onHand: 250, onOrder: 0, safetyStock: 50, netRequirement: 0, status: 'OK', leadTimeDays: 7, suggestedOrderDate: '-', supplier: { code: 'SUP-001', name: 'Thép Việt Nam Steel' }, unitCost: 25000, totalCost: 0 },
  { id: '8', partNumber: 'RM-ALU-001', partName: 'Nhôm tấm 1.5mm', category: 'Raw Materials', unit: 'kg', grossRequirement: 75, onHand: 85, onOrder: 50, safetyStock: 30, netRequirement: 0, status: 'OK', leadTimeDays: 10, suggestedOrderDate: '-', supplier: { code: 'SUP-002', name: 'Nhôm Đông Á' }, unitCost: 85000, totalCost: 0 },
];

// Mock Data - Đề xuất mua hàng
const purchaseSuggestions: PurchaseSuggestion[] = [
  { id: '1', partNumber: 'CMP-MOT-001', partName: 'Motor DC 12V 50W', supplier: 'Oriental Motor VN', supplierCode: 'SUP-007', quantity: 25, unit: 'pcs', unitCost: 250000, totalCost: 6250000, leadTimeDays: 14, requiredDate: '2025-01-10', suggestedOrderDate: '2024-12-27', priority: 'URGENT', status: 'PENDING' },
  { id: '2', partNumber: 'CMP-BRG-002', partName: 'Bạc đạn bi 6201-2RS', supplier: 'SKF Vietnam', supplierCode: 'SUP-006', quantity: 65, unit: 'pcs', unitCost: 42000, totalCost: 2730000, leadTimeDays: 7, requiredDate: '2025-01-10', suggestedOrderDate: '2025-01-03', priority: 'URGENT', status: 'PENDING' },
  { id: '3', partNumber: 'CMP-GBX-001', partName: 'Hộp số giảm tốc 1:10', supplier: 'Oriental Motor VN', supplierCode: 'SUP-007', quantity: 12, unit: 'pcs', unitCost: 450000, totalCost: 5400000, leadTimeDays: 21, requiredDate: '2025-01-10', suggestedOrderDate: '2024-12-22', priority: 'HIGH', status: 'PENDING' },
  { id: '4', partNumber: 'RM-STL-002', partName: 'Thép tấm carbon 3mm', supplier: 'Thép Việt Nam Steel', supplierCode: 'SUP-001', quantity: 100, unit: 'kg', unitCost: 26000, totalCost: 2600000, leadTimeDays: 7, requiredDate: '2025-01-12', suggestedOrderDate: '2025-01-05', priority: 'NORMAL', status: 'PENDING' },
];

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    OUT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    LOW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    OK: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    NORMAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    PENDING: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    ORDERED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  const icons = {
    CRITICAL: <XCircle className="w-3 h-3" />,
    OUT: <XCircle className="w-3 h-3" />,
    LOW: <AlertTriangle className="w-3 h-3" />,
    OK: <CheckCircle className="w-3 h-3" />,
    URGENT: <Zap className="w-3 h-3" />,
    HIGH: <AlertCircle className="w-3 h-3" />,
    NORMAL: <Info className="w-3 h-3" />,
    PENDING: <Clock className="w-3 h-3" />,
    APPROVED: <CheckCircle className="w-3 h-3" />,
    ORDERED: <Send className="w-3 h-3" />,
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      styles[status as keyof typeof styles] || styles.PENDING
    )}>
      {icons[status as keyof typeof icons]}
      {status}
    </span>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function MRPPlanningPage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'results' | 'purchase'>('orders');
  const [selectedOrders, setSelectedOrders] = useState<string[]>(['1', '2']);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Calculate summary stats
  const summaryStats = {
    totalOrders: salesOrdersForMRP.filter(o => selectedOrders.includes(o.id)).length,
    criticalItems: mrpResults.filter(r => r.status === 'CRITICAL').length,
    lowItems: mrpResults.filter(r => r.status === 'LOW').length,
    okItems: mrpResults.filter(r => r.status === 'OK').length,
    totalPurchaseValue: purchaseSuggestions.reduce((sum, p) => sum + p.totalCost, 0),
    urgentPurchases: purchaseSuggestions.filter(p => p.priority === 'URGENT').length,
  };

  const handleRunMRP = () => {
    setIsCalculating(true);
    // Simulate calculation
    setTimeout(() => {
      setIsCalculating(false);
      setShowResults(true);
      setActiveTab('results');
    }, 2000);
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const filteredResults = filterStatus === 'all' 
    ? mrpResults 
    : mrpResults.filter(r => r.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-7 h-7 text-blue-600" />
            MRP Planning
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Tính toán nhu cầu vật tư và đề xuất mua hàng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button 
            onClick={handleRunMRP}
            disabled={isCalculating || selectedOrders.length === 0}
            className={cn(
              "px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all",
              isCalculating 
                ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            )}
          >
            {isCalculating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Đang tính toán...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Chạy MRP
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
            <FileText className="w-4 h-4" />
            Đơn hàng
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {summaryStats.totalOrders}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-red-200 dark:border-red-900">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <XCircle className="w-4 h-4" />
            Thiếu nghiêm trọng
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            {summaryStats.criticalItems}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-amber-200 dark:border-amber-900">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            Sắp hết
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {summaryStats.lowItems}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-green-200 dark:border-green-900">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            Đủ hàng
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {summaryStats.okItems}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-blue-200 dark:border-blue-900">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm">
            <ShoppingCart className="w-4 h-4" />
            Cần mua
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {purchaseSuggestions.length}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-purple-200 dark:border-purple-900">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-sm">
            <DollarSign className="w-4 h-4" />
            Tổng giá trị
          </div>
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">
            {formatCurrency(summaryStats.totalPurchaseValue)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          {[
            { id: 'orders', label: 'Đơn hàng nguồn', icon: FileText, count: salesOrdersForMRP.length },
            { id: 'results', label: 'Kết quả MRP', icon: Calculator, count: mrpResults.length },
            { id: 'purchase', label: 'Đề xuất mua hàng', icon: ShoppingCart, count: purchaseSuggestions.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs',
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {/* Tab 1: Sales Orders for MRP */}
        {activeTab === 'orders' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Chọn đơn hàng để tính MRP
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Đã chọn: {selectedOrders.length} đơn</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                      <input
                        type="checkbox"
                        className="rounded"
                        aria-label="Chọn tất cả đơn hàng"
                        checked={selectedOrders.length === salesOrdersForMRP.length}
                        onChange={() => {
                          if (selectedOrders.length === salesOrdersForMRP.length) {
                            setSelectedOrders([]);
                          } else {
                            setSelectedOrders(salesOrdersForMRP.map(o => o.id));
                          }
                        }}
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Số đơn hàng</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Khách hàng</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Sản phẩm</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Số lượng</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Ngày yêu cầu</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {salesOrdersForMRP.map((order) => (
                    <tr 
                      key={order.id} 
                      className={cn(
                        "border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer",
                        selectedOrders.includes(order.id) && "bg-blue-50 dark:bg-blue-900/20"
                      )}
                      onClick={() => toggleOrderSelection(order.id)}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          className="rounded"
                          aria-label={`Chọn đơn hàng ${order.orderNumber}`}
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                        />
                      </td>
                      <td className="py-3 px-4 font-medium text-blue-600 dark:text-blue-400">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">{order.customer}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {order.product}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">{order.quantity}</td>
                      <td className="py-3 px-4 text-gray-500">{order.requiredDate}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={order.status === 'Confirmed' ? 'OK' : 'PENDING'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: MRP Results - Kết quả tính toán */}
        {activeTab === 'results' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Kết quả tính toán nhu cầu vật tư
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  aria-label="Bộ lọc trạng thái"
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
                >
                  <option value="all">Tất cả</option>
                  <option value="CRITICAL">🔴 Thiếu nghiêm trọng</option>
                  <option value="LOW">🟡 Sắp hết</option>
                  <option value="OK">🟢 Đủ hàng</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Trạng thái</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Mã vật tư</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Tên vật tư</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Nhu cầu</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Tồn kho</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Đang đặt</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">An toàn</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20">Thiếu</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Nhà cung cấp</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((item) => (
                    <tr 
                      key={item.id} 
                      className={cn(
                        "border-b border-gray-100 dark:border-gray-700",
                        item.status === 'CRITICAL' && "bg-red-50 dark:bg-red-900/10",
                        item.status === 'LOW' && "bg-amber-50 dark:bg-amber-900/10"
                      )}
                    >
                      <td className="py-3 px-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                          {item.partNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{item.partName}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatNumber(item.grossRequirement)} {item.unit}</td>
                      <td className="py-3 px-4 text-right">{formatNumber(item.onHand)}</td>
                      <td className="py-3 px-4 text-right text-blue-600">{formatNumber(item.onOrder)}</td>
                      <td className="py-3 px-4 text-right text-gray-500">{formatNumber(item.safetyStock)}</td>
                      <td className={cn(
                        "py-3 px-4 text-right font-bold bg-blue-50 dark:bg-blue-900/20",
                        item.netRequirement > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                      )}>
                        {item.netRequirement > 0 ? formatNumber(item.netRequirement) : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">{item.supplier.name}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        {item.totalCost > 0 ? formatCurrency(item.totalCost) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 font-semibold">
                    <td colSpan={9} className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                      Tổng giá trị cần mua:
                    </td>
                    <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400">
                      {formatCurrency(mrpResults.reduce((sum, r) => sum + r.totalCost, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Công thức:</strong> Thiếu = Nhu cầu - Tồn kho - Đang đặt + Tồn an toàn
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Purchase Suggestions - Đề xuất mua hàng */}
        {activeTab === 'purchase' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Đề xuất đơn mua hàng (Purchase Suggestions)
              </h3>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Duyệt tất cả
                </button>
                <button className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1">
                  <Send className="w-4 h-4" />
                  Tạo PO
                </button>
              </div>
            </div>

            {/* Alert for urgent items */}
            {summaryStats.urgentPurchases > 0 && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-300">
                    Có {summaryStats.urgentPurchases} vật tư cần đặt hàng GẤP!
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Ngày đặt hàng đề xuất đã qua hoặc sắp đến. Vui lòng xử lý ngay.
                  </p>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                      <input type="checkbox" className="rounded" aria-label="Chọn tất cả đề xuất mua hàng" />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Ưu tiên</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Mã vật tư</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Tên vật tư</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Nhà cung cấp</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Số lượng</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Đơn giá</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Thành tiền</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Ngày đặt</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Ngày cần</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Trạng thái</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseSuggestions.map((item) => (
                    <tr 
                      key={item.id}
                      className={cn(
                        "border-b border-gray-100 dark:border-gray-700",
                        item.priority === 'URGENT' && "bg-red-50 dark:bg-red-900/10"
                      )}
                    >
                      <td className="py-3 px-4">
                        <input type="checkbox" className="rounded" aria-label={`Chọn ${item.partNumber}`} />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={item.priority} />
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                          {item.partNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{item.partName}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{item.supplier}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatNumber(item.quantity)} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-right">{formatCurrency(item.unitCost)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrency(item.totalCost)}
                      </td>
                      <td className={cn(
                        "py-3 px-4",
                        new Date(item.suggestedOrderDate) < new Date() && "text-red-600 dark:text-red-400 font-medium"
                      )}>
                        {item.suggestedOrderDate}
                      </td>
                      <td className="py-3 px-4">{item.requiredDate}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Xem chi tiết" aria-label="Xem chi tiết">
                            <Eye className="w-4 h-4 text-gray-500" />
                          </button>
                          <button className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Duyệt" aria-label="Duyệt">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </button>
                          <button className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Tạo PO" aria-label="Tạo PO">
                            <Send className="w-4 h-4 text-blue-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 font-semibold">
                    <td colSpan={7} className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                      Tổng giá trị đề xuất mua:
                    </td>
                    <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400 text-lg">
                      {formatCurrency(purchaseSuggestions.reduce((sum, p) => sum + p.totalCost, 0))}
                    </td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Summary by Supplier */}
            <div className="mt-6">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                Tổng hợp theo nhà cung cấp
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(
                  purchaseSuggestions.reduce((acc, p) => {
                    if (!acc[p.supplier]) {
                      acc[p.supplier] = { items: 0, total: 0 };
                    }
                    acc[p.supplier].items++;
                    acc[p.supplier].total += p.totalCost;
                    return acc;
                  }, {} as Record<string, { items: number; total: number }>)
                ).map(([supplier, data]) => (
                  <div key={supplier} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Building className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white">{supplier}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{data.items} vật tư</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrency(data.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
