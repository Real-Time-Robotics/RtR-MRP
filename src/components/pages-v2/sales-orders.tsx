'use client';

import React, { useState } from 'react';
import {
  ShoppingCart,
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Edit,
  Trash2,
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
  Copy,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Building,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  TrendingUp,
} from 'lucide-react';
import { cn, formatCurrency, formatNumber, formatDate } from '../../lib/utils';

// =============================================================================
// SALES ORDERS PAGE - REDESIGNED
// Modern sales order management with kanban and list views
// =============================================================================

// Mock data
const salesStats = {
  totalOrders: 156,
  totalRevenue: 3450000,
  pendingOrders: 12,
  avgOrderValue: 22115,
  thisMonth: {
    orders: 28,
    revenue: 680000,
    change: 15.3,
  },
};

const ordersData = [
  {
    id: '1',
    orderNumber: 'SO-2024-0156',
    customer: {
      name: 'VN Air Force',
      code: 'CUST-001',
      contact: 'Colonel Nguyen Van A',
      email: 'procurement@vnaf.gov.vn',
      phone: '+84 28 1234 5678',
    },
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    orderDate: '2024-12-28',
    requiredDate: '2025-01-15',
    promisedDate: '2025-01-12',
    shippedDate: null,
    subtotal: 285000,
    tax: 28500,
    shipping: 0,
    total: 313500,
    currency: 'USD',
    paymentTerms: 'NET30',
    paymentStatus: 'PARTIAL',
    paidAmount: 156750,
    shippingMethod: 'Air Freight',
    shippingAddress: 'Tan Son Nhat AB, Ho Chi Minh City',
    notes: 'Priority delivery for Q1 exercises',
    lines: [
      { id: 1, partNumber: 'HERA-X8-PRO', name: 'HERA X8 Professional', qty: 3, unitPrice: 85000, total: 255000 },
      { id: 2, partNumber: 'ACC-BAT-22K', name: 'Battery Pack 22000mAh', qty: 6, unitPrice: 5000, total: 30000 },
    ],
    createdBy: 'admin',
    createdAt: '2024-12-28T09:30:00Z',
    updatedAt: '2024-12-28T14:20:00Z',
  },
  {
    id: '2',
    orderNumber: 'SO-2024-0155',
    customer: {
      name: 'AgriTech Corp',
      code: 'CUST-002',
      contact: 'John Smith',
      email: 'john@agritech.com',
      phone: '+1 555 123 4567',
    },
    status: 'PENDING',
    priority: 'MEDIUM',
    orderDate: '2024-12-28',
    requiredDate: '2025-02-01',
    promisedDate: null,
    shippedDate: null,
    subtotal: 142000,
    tax: 14200,
    shipping: 2500,
    total: 158700,
    currency: 'USD',
    paymentTerms: 'NET45',
    paymentStatus: 'UNPAID',
    paidAmount: 0,
    shippingMethod: 'Sea Freight',
    shippingAddress: 'Los Angeles, CA, USA',
    notes: 'Agricultural mapping project',
    lines: [
      { id: 1, partNumber: 'HERA-X6-AGR', name: 'HERA X6 Agriculture', qty: 2, unitPrice: 65000, total: 130000 },
      { id: 2, partNumber: 'ACC-SPRAY-20L', name: 'Spray System 20L', qty: 2, unitPrice: 6000, total: 12000 },
    ],
    createdBy: 'sales01',
    createdAt: '2024-12-28T10:15:00Z',
    updatedAt: '2024-12-28T10:15:00Z',
  },
  {
    id: '3',
    orderNumber: 'SO-2024-0154',
    customer: {
      name: 'Survey Systems Inc',
      code: 'CUST-003',
      contact: 'Maria Garcia',
      email: 'maria@surveysys.com',
      phone: '+1 555 987 6543',
    },
    status: 'COMPLETED',
    priority: 'LOW',
    orderDate: '2024-12-27',
    requiredDate: '2024-12-30',
    promisedDate: '2024-12-29',
    shippedDate: '2024-12-28',
    subtotal: 89000,
    tax: 8900,
    shipping: 1500,
    total: 99400,
    currency: 'USD',
    paymentTerms: 'NET30',
    paymentStatus: 'PAID',
    paidAmount: 99400,
    shippingMethod: 'Express Air',
    shippingAddress: 'Miami, FL, USA',
    notes: '',
    lines: [
      { id: 1, partNumber: 'HERA-X4-SRV', name: 'HERA X4 Survey', qty: 1, unitPrice: 45000, total: 45000 },
      { id: 2, partNumber: 'ACC-RTK-F9P', name: 'RTK Module F9P', qty: 2, unitPrice: 12000, total: 24000 },
      { id: 3, partNumber: 'ACC-CAM-S3', name: 'Survey Camera S3', qty: 1, unitPrice: 20000, total: 20000 },
    ],
    createdBy: 'sales02',
    createdAt: '2024-12-27T08:00:00Z',
    updatedAt: '2024-12-28T16:00:00Z',
  },
  {
    id: '4',
    orderNumber: 'SO-2024-0153',
    customer: {
      name: 'Logistics Plus',
      code: 'CUST-004',
      contact: 'David Lee',
      email: 'david@logisticsplus.sg',
      phone: '+65 6123 4567',
    },
    status: 'SHIPPED',
    priority: 'HIGH',
    orderDate: '2024-12-27',
    requiredDate: '2025-01-05',
    promisedDate: '2025-01-03',
    shippedDate: '2024-12-28',
    subtotal: 156000,
    tax: 0,
    shipping: 3500,
    total: 159500,
    currency: 'USD',
    paymentTerms: 'NET30',
    paymentStatus: 'PARTIAL',
    paidAmount: 79750,
    shippingMethod: 'Air Freight',
    shippingAddress: 'Singapore',
    notes: 'Warehouse inspection drones',
    lines: [
      { id: 1, partNumber: 'HERA-X4-IND', name: 'HERA X4 Industrial', qty: 2, unitPrice: 55000, total: 110000 },
      { id: 2, partNumber: 'ACC-THERMAL-640', name: 'Thermal Camera 640', qty: 2, unitPrice: 23000, total: 46000 },
    ],
    createdBy: 'admin',
    createdAt: '2024-12-27T11:30:00Z',
    updatedAt: '2024-12-28T09:00:00Z',
  },
  {
    id: '5',
    orderNumber: 'SO-2024-0152',
    customer: {
      name: 'Energy Dynamics',
      code: 'CUST-005',
      contact: 'Ahmed Hassan',
      email: 'ahmed@energydyn.ae',
      phone: '+971 4 123 4567',
    },
    status: 'CONFIRMED',
    priority: 'MEDIUM',
    orderDate: '2024-12-26',
    requiredDate: '2025-01-20',
    promisedDate: '2025-01-18',
    shippedDate: null,
    subtotal: 198000,
    tax: 9900,
    shipping: 4500,
    total: 212400,
    currency: 'USD',
    paymentTerms: 'NET60',
    paymentStatus: 'UNPAID',
    paidAmount: 0,
    shippingMethod: 'Air Freight',
    shippingAddress: 'Dubai, UAE',
    notes: 'Solar farm inspection',
    lines: [
      { id: 1, partNumber: 'HERA-X8-ENT', name: 'HERA X8 Enterprise', qty: 2, unitPrice: 95000, total: 190000 },
      { id: 2, partNumber: 'ACC-LIPO-6S-44K', name: 'Battery Pack 44000mAh', qty: 4, unitPrice: 2000, total: 8000 },
    ],
    createdBy: 'sales01',
    createdAt: '2024-12-26T14:00:00Z',
    updatedAt: '2024-12-27T10:00:00Z',
  },
];

const statusConfig: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  dotColor: string;
  icon: React.ReactNode;
}> = {
  DRAFT: {
    label: 'Draft',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    dotColor: 'bg-slate-400',
    icon: <FileText className="h-4 w-4" />,
  },
  PENDING: {
    label: 'Pending',
    color: 'text-warning-700',
    bgColor: 'bg-warning-100',
    dotColor: 'bg-warning-500',
    icon: <Clock className="h-4 w-4" />,
  },
  CONFIRMED: {
    label: 'Confirmed',
    color: 'text-info-700',
    bgColor: 'bg-info-100',
    dotColor: 'bg-info-500',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'text-primary-700',
    bgColor: 'bg-primary-100',
    dotColor: 'bg-primary-500',
    icon: <Package className="h-4 w-4" />,
  },
  SHIPPED: {
    label: 'Shipped',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    dotColor: 'bg-purple-500',
    icon: <Truck className="h-4 w-4" />,
  },
  COMPLETED: {
    label: 'Completed',
    color: 'text-success-700',
    bgColor: 'bg-success-100',
    dotColor: 'bg-success-500',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'text-danger-700',
    bgColor: 'bg-danger-100',
    dotColor: 'bg-danger-500',
    icon: <XCircle className="h-4 w-4" />,
  },
};

const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  LOW: { label: 'Low', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  MEDIUM: { label: 'Medium', color: 'text-info-700', bgColor: 'bg-info-100' },
  HIGH: { label: 'High', color: 'text-warning-700', bgColor: 'bg-warning-100' },
  CRITICAL: { label: 'Critical', color: 'text-danger-700', bgColor: 'bg-danger-100' },
};

const paymentConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  UNPAID: { label: 'Unpaid', color: 'text-danger-700', bgColor: 'bg-danger-100' },
  PARTIAL: { label: 'Partial', color: 'text-warning-700', bgColor: 'bg-warning-100' },
  PAID: { label: 'Paid', color: 'text-success-700', bgColor: 'bg-success-100' },
};

// Badge component
const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
}> = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-primary-100 text-primary-700',
    success: 'bg-success-100 text-success-700',
    warning: 'bg-warning-100 text-warning-700',
    danger: 'bg-danger-100 text-danger-700',
    info: 'bg-info-100 text-info-700',
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
  const config = priorityConfig[priority] || priorityConfig.MEDIUM;
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full', config.bgColor, config.color)}>
      {config.label}
    </span>
  );
};

// Payment Badge
const PaymentBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = paymentConfig[status] || paymentConfig.UNPAID;
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
  <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
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
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-900 font-mono mt-1">{value}</p>
    </div>
  </div>
);

// Order Card for Kanban
const OrderCard: React.FC<{
  order: typeof ordersData[0];
  onClick: () => void;
}> = ({ order, onClick }) => (
  <div
    onClick={onClick}
    className="bg-white rounded-lg border border-slate-200 p-4 cursor-pointer hover:shadow-md hover:border-primary-200 transition-all"
  >
    <div className="flex items-start justify-between mb-3">
      <div>
        <p className="font-mono text-sm font-semibold text-primary-600">{order.orderNumber}</p>
        <p className="text-sm text-slate-900 font-medium mt-0.5">{order.customer.name}</p>
      </div>
      <PriorityBadge priority={order.priority} />
    </div>
    
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-slate-500">Total</span>
        <span className="font-mono font-medium text-slate-900">{formatCurrency(order.total)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">Required</span>
        <span className="text-slate-700">{formatDate(order.requiredDate, 'short')}</span>
      </div>
    </div>

    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
      <PaymentBadge status={order.paymentStatus} />
      <span className="text-xs text-slate-400">{order.lines.length} items</span>
    </div>
  </div>
);

// Order Detail Drawer
const OrderDetail: React.FC<{
  order: typeof ordersData[0];
  onClose: () => void;
}> = ({ order, onClose }) => (
  <div className="h-full flex flex-col">
    {/* Header */}
    <div className="px-6 py-4 border-b border-slate-200">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">{order.orderNumber}</h2>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-slate-500 mt-1">{order.customer.name}</p>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
          <XCircle className="h-5 w-5" />
        </button>
      </div>
    </div>

    {/* Content */}
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500">Order Total</p>
          <p className="text-xl font-bold text-slate-900 font-mono">{formatCurrency(order.total)}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500">Payment</p>
          <div className="flex items-center gap-2 mt-1">
            <PaymentBadge status={order.paymentStatus} />
            {order.paymentStatus === 'PARTIAL' && (
              <span className="text-sm text-slate-600 font-mono">
                ({Math.round((order.paidAmount / order.total) * 100)}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Customer</h3>
        <div className="p-4 bg-slate-50 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-900">{order.customer.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-600">{order.customer.contact}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-slate-400" />
            <a href={`mailto:${order.customer.email}`} className="text-sm text-primary-600">{order.customer.email}</a>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-600">{order.customer.phone}</span>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Timeline</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Order Date</span>
            <span className="text-slate-900">{formatDate(order.orderDate, 'medium')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Required By</span>
            <span className="text-slate-900 font-medium">{formatDate(order.requiredDate, 'medium')}</span>
          </div>
          {order.promisedDate && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Promised Date</span>
              <span className="text-slate-900">{formatDate(order.promisedDate, 'medium')}</span>
            </div>
          )}
          {order.shippedDate && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Shipped Date</span>
              <span className="text-success-600">{formatDate(order.shippedDate, 'medium')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Shipping */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Shipping</h3>
        <div className="p-4 bg-slate-50 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-900">{order.shippingMethod}</span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
            <span className="text-sm text-slate-600">{order.shippingAddress}</span>
          </div>
        </div>
      </div>

      {/* Order Lines */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Order Items ({order.lines.length})</h3>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Item</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Qty</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={line.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <p className="font-mono text-xs text-primary-600">{line.partNumber}</p>
                    <p className="text-slate-700">{line.name}</p>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{line.qty}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatCurrency(line.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td className="px-3 py-2 text-slate-500">Subtotal</td>
                <td></td>
                <td className="px-3 py-2 text-right font-mono">{formatCurrency(order.subtotal)}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-slate-500">Tax</td>
                <td></td>
                <td className="px-3 py-2 text-right font-mono">{formatCurrency(order.tax)}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-slate-500">Shipping</td>
                <td></td>
                <td className="px-3 py-2 text-right font-mono">{formatCurrency(order.shipping)}</td>
              </tr>
              <tr className="font-semibold">
                <td className="px-3 py-2 text-slate-900">Total</td>
                <td></td>
                <td className="px-3 py-2 text-right font-mono text-slate-900">{formatCurrency(order.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Notes</h3>
          <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{order.notes}</p>
        </div>
      )}
    </div>

    {/* Footer Actions */}
    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
      <div className="flex gap-2">
        <button className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2">
          <Printer className="h-4 w-4" />
          Print
        </button>
        <button className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2">
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
const SalesOrdersPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedOrder, setSelectedOrder] = useState<typeof ordersData[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Group orders by status for Kanban
  const ordersByStatus = ordersData.reduce((acc, order) => {
    if (!acc[order.status]) acc[order.status] = [];
    acc[order.status].push(order);
    return acc;
  }, {} as Record<string, typeof ordersData>);

  const kanbanColumns = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'SHIPPED', 'COMPLETED'];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <nav className="mb-2">
                <ol className="flex items-center gap-2 text-sm">
                  <li><a href="#" className="text-slate-500 hover:text-slate-700">Dashboard</a></li>
                  <li className="text-slate-400">/</li>
                  <li className="text-slate-700 font-medium">Sales Orders</li>
                </ol>
              </nav>
              <h1 className="text-2xl font-bold text-slate-900">Sales Orders</h1>
              <p className="text-sm text-slate-500 mt-1">Manage customer orders and fulfillment</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2">
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
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Total Orders"
            value={formatNumber(salesStats.totalOrders)}
            icon={<ShoppingCart className="h-5 w-5 text-primary-600" />}
            iconColor="bg-primary-100"
          />
          <KPICard
            title="Total Revenue"
            value={formatCurrency(salesStats.totalRevenue)}
            change={salesStats.thisMonth.change}
            icon={<DollarSign className="h-5 w-5 text-success-600" />}
            iconColor="bg-success-100"
          />
          <KPICard
            title="Pending Orders"
            value={salesStats.pendingOrders}
            icon={<Clock className="h-5 w-5 text-warning-600" />}
            iconColor="bg-warning-100"
          />
          <KPICard
            title="Avg Order Value"
            value={formatCurrency(salesStats.avgOrderValue)}
            icon={<TrendingUp className="h-5 w-5 text-info-600" />}
            iconColor="bg-info-100"
          />
        </div>

        {/* Filters & View Toggle */}
        <div className="bg-white rounded-xl border border-slate-200 mb-4">
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search orders..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value="all">All Status</option>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={cn('px-3 py-1.5 text-sm font-medium rounded', viewMode === 'list' ? 'bg-white shadow-sm' : 'text-slate-500')}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={cn('px-3 py-1.5 text-sm font-medium rounded', viewMode === 'kanban' ? 'bg-white shadow-sm' : 'text-slate-500')}
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
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Order</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Payment</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersData.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={cn(
                          'border-b border-slate-100 hover:bg-slate-50 cursor-pointer',
                          selectedOrder?.id === order.id && 'bg-primary-50'
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-primary-600">{order.orderNumber}</span>
                            <PriorityBadge priority={order.priority} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">{order.customer.name}</p>
                          <p className="text-xs text-slate-500">{order.customer.contact}</p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-sm font-semibold text-slate-900">{formatCurrency(order.total)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <PaymentBadge status={order.paymentStatus} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700">{formatDate(order.orderDate, 'short')}</p>
                          <p className="text-xs text-slate-500">Due: {formatDate(order.requiredDate, 'short')}</p>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-slate-400 hover:text-slate-600"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Kanban View */
              <div className="flex gap-4 overflow-x-auto pb-4">
                {kanbanColumns.map((status) => {
                  const config = statusConfig[status];
                  const orders = ordersByStatus[status] || [];
                  return (
                    <div key={status} className="flex-shrink-0 w-72">
                      <div className="bg-slate-100 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={cn('p-1 rounded', config.bgColor, config.color)}>
                              {config.icon}
                            </span>
                            <span className="font-medium text-slate-900">{config.label}</span>
                          </div>
                          <Badge>{orders.length}</Badge>
                        </div>
                        <div className="space-y-3">
                          {orders.map((order) => (
                            <OrderCard
                              key={order.id}
                              order={order}
                              onClick={() => setSelectedOrder(order)}
                            />
                          ))}
                          {orders.length === 0 && (
                            <div className="text-center py-8 text-sm text-slate-400">
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
            <div className="w-96 bg-white rounded-xl border border-slate-200 overflow-hidden flex-shrink-0">
              <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesOrdersPage;
