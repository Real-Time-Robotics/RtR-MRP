'use client';

import React, { useState } from 'react';
import {
  Factory,
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Edit,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  Package,
  Layers,
  Settings,
  MoreHorizontal,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Timer,
  Gauge,
  TrendingUp,
  Activity,
  Clipboard,
  FileText,
  Users,
} from 'lucide-react';
import { cn, formatNumber, formatDate } from '../../lib/utils';

// =============================================================================
// PRODUCTION / WORK ORDERS PAGE - REDESIGNED
// Modern production management with scheduling and tracking
// =============================================================================

// Mock data
const productionStats = {
  activeWorkOrders: 12,
  completedThisMonth: 45,
  onTimeDelivery: 94.5,
  avgCycleTime: 8.2,
  utilization: 78,
  efficiency: 92,
};

const workOrdersData = [
  {
    id: '1',
    woNumber: 'WO-2024-0089',
    product: {
      partNumber: 'HERA-X8-PRO',
      name: 'HERA X8 Professional',
      revision: 'D',
    },
    quantity: 3,
    completedQty: 1,
    scrappedQty: 0,
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    salesOrder: 'SO-2024-0156',
    startDate: '2024-12-26',
    dueDate: '2025-01-10',
    estimatedHours: 120,
    actualHours: 45,
    workCenter: 'Assembly Line 1',
    assignedTo: ['Nguyen Van A', 'Tran Van B'],
    currentOperation: 'Final Assembly',
    operationProgress: 65,
    notes: 'Priority order for VN Air Force',
    createdAt: '2024-12-24',
    updatedAt: '2024-12-28',
  },
  {
    id: '2',
    woNumber: 'WO-2024-0090',
    product: {
      partNumber: 'HERA-X6-AGR',
      name: 'HERA X6 Agriculture',
      revision: 'C',
    },
    quantity: 2,
    completedQty: 0,
    scrappedQty: 0,
    status: 'SCHEDULED',
    priority: 'MEDIUM',
    salesOrder: 'SO-2024-0155',
    startDate: '2025-01-02',
    dueDate: '2025-01-20',
    estimatedHours: 80,
    actualHours: 0,
    workCenter: 'Assembly Line 2',
    assignedTo: ['Le Van C'],
    currentOperation: null,
    operationProgress: 0,
    notes: '',
    createdAt: '2024-12-27',
    updatedAt: '2024-12-27',
  },
  {
    id: '3',
    woNumber: 'WO-2024-0088',
    product: {
      partNumber: 'HERA-X4-SRV',
      name: 'HERA X4 Survey',
      revision: 'B',
    },
    quantity: 1,
    completedQty: 1,
    scrappedQty: 0,
    status: 'COMPLETED',
    priority: 'LOW',
    salesOrder: 'SO-2024-0154',
    startDate: '2024-12-20',
    dueDate: '2024-12-27',
    estimatedHours: 40,
    actualHours: 38,
    workCenter: 'Assembly Line 1',
    assignedTo: ['Nguyen Van A'],
    currentOperation: null,
    operationProgress: 100,
    notes: '',
    createdAt: '2024-12-19',
    updatedAt: '2024-12-27',
  },
  {
    id: '4',
    woNumber: 'WO-2024-0091',
    product: {
      partNumber: 'HERA-X4-IND',
      name: 'HERA X4 Industrial',
      revision: 'B',
    },
    quantity: 2,
    completedQty: 0,
    scrappedQty: 0,
    status: 'ON_HOLD',
    priority: 'HIGH',
    salesOrder: 'SO-2024-0153',
    startDate: '2024-12-28',
    dueDate: '2025-01-03',
    estimatedHours: 60,
    actualHours: 8,
    workCenter: 'Assembly Line 2',
    assignedTo: ['Pham Van D'],
    currentOperation: 'Frame Assembly',
    operationProgress: 15,
    notes: 'On hold - waiting for parts',
    createdAt: '2024-12-26',
    updatedAt: '2024-12-28',
  },
  {
    id: '5',
    woNumber: 'WO-2024-0092',
    product: {
      partNumber: 'HERA-X8-ENT',
      name: 'HERA X8 Enterprise',
      revision: 'D',
    },
    quantity: 2,
    completedQty: 0,
    scrappedQty: 0,
    status: 'RELEASED',
    priority: 'MEDIUM',
    salesOrder: 'SO-2024-0152',
    startDate: '2025-01-05',
    dueDate: '2025-01-18',
    estimatedHours: 100,
    actualHours: 0,
    workCenter: 'Assembly Line 1',
    assignedTo: [],
    currentOperation: null,
    operationProgress: 0,
    notes: '',
    createdAt: '2024-12-27',
    updatedAt: '2024-12-27',
  },
];

const operations = [
  { id: 1, name: 'Frame Assembly', duration: 16, sequence: 10 },
  { id: 2, name: 'Motor Installation', duration: 8, sequence: 20 },
  { id: 3, name: 'Electronics Integration', duration: 12, sequence: 30 },
  { id: 4, name: 'Wiring & Harness', duration: 8, sequence: 40 },
  { id: 5, name: 'Final Assembly', duration: 8, sequence: 50 },
  { id: 6, name: 'Quality Inspection', duration: 4, sequence: 60 },
  { id: 7, name: 'Flight Test', duration: 4, sequence: 70 },
];

const statusConfig: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  dotColor: string;
}> = {
  DRAFT: { label: 'Draft', color: 'text-slate-600', bgColor: 'bg-slate-100', dotColor: 'bg-slate-400' },
  RELEASED: { label: 'Released', color: 'text-info-700', bgColor: 'bg-info-100', dotColor: 'bg-info-500' },
  SCHEDULED: { label: 'Scheduled', color: 'text-purple-700', bgColor: 'bg-purple-100', dotColor: 'bg-purple-500' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-primary-700', bgColor: 'bg-primary-100', dotColor: 'bg-primary-500' },
  ON_HOLD: { label: 'On Hold', color: 'text-warning-700', bgColor: 'bg-warning-100', dotColor: 'bg-warning-500' },
  COMPLETED: { label: 'Completed', color: 'text-success-700', bgColor: 'bg-success-100', dotColor: 'bg-success-500' },
  CANCELLED: { label: 'Cancelled', color: 'text-danger-700', bgColor: 'bg-danger-100', dotColor: 'bg-danger-500' },
};

const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  LOW: { label: 'Low', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  MEDIUM: { label: 'Medium', color: 'text-info-700', bgColor: 'bg-info-100' },
  HIGH: { label: 'High', color: 'text-warning-700', bgColor: 'bg-warning-100' },
  CRITICAL: { label: 'Critical', color: 'text-danger-700', bgColor: 'bg-danger-100' },
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
      <p className="text-2xl font-bold text-slate-900 font-mono mt-1">
        {value}{suffix && <span className="text-sm text-slate-500 ml-1">{suffix}</span>}
      </p>
    </div>
    {progress !== undefined && (
      <div className="mt-3">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
        />
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
        <span className="text-xs font-semibold text-slate-700">{value}%</span>
      </div>
    </div>
  );
};

// Work Order Card
const WorkOrderCard: React.FC<{
  wo: typeof workOrdersData[0];
  onClick: () => void;
}> = ({ wo, onClick }) => {
  const isLate = new Date(wo.dueDate) < new Date() && wo.status !== 'COMPLETED';
  const progress = wo.quantity > 0 ? Math.round((wo.completedQty / wo.quantity) * 100) : 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md',
        isLate ? 'border-danger-200 hover:border-danger-300' : 'border-slate-200 hover:border-primary-200'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-mono text-sm font-semibold text-primary-600">{wo.woNumber}</p>
          <p className="text-sm text-slate-900 font-medium mt-0.5">{wo.product.name}</p>
        </div>
        <Badge variant={priorityConfig[wo.priority].color.includes('warning') ? 'warning' : priorityConfig[wo.priority].color.includes('danger') ? 'danger' : 'default'}>
          {wo.priority}
        </Badge>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-3">
        <ProgressRing value={wo.operationProgress} size={40} />
        <div className="flex-1">
          <p className="text-xs text-slate-500">Progress</p>
          <p className="text-sm font-medium text-slate-900">
            {wo.completedQty}/{wo.quantity} units
          </p>
        </div>
      </div>

      {/* Current Operation */}
      {wo.currentOperation && (
        <div className="mb-3 px-2 py-1.5 bg-slate-50 rounded text-sm">
          <span className="text-slate-500">Current: </span>
          <span className="text-slate-900 font-medium">{wo.currentOperation}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-slate-500">
          <Calendar className="h-3 w-3" />
          <span className={isLate ? 'text-danger-600 font-medium' : ''}>
            Due: {formatDate(wo.dueDate, 'short')}
          </span>
        </div>
        {wo.assignedTo.length > 0 && (
          <div className="flex items-center gap-1 text-slate-500">
            <Users className="h-3 w-3" />
            <span>{wo.assignedTo.length}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Work Order Detail
const WorkOrderDetail: React.FC<{
  wo: typeof workOrdersData[0];
  onClose: () => void;
}> = ({ wo, onClose }) => {
  const isLate = new Date(wo.dueDate) < new Date() && wo.status !== 'COMPLETED';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">{wo.woNumber}</h2>
              <StatusBadge status={wo.status} />
            </div>
            <p className="text-sm text-slate-500 mt-1">{wo.product.name}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Progress Overview */}
        <div className="flex items-center gap-6">
          <ProgressRing value={wo.operationProgress} size={80} strokeWidth={6} />
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500">Quantity</p>
              <p className="text-lg font-semibold text-slate-900 font-mono">
                {wo.completedQty} / {wo.quantity}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Hours</p>
              <p className="text-lg font-semibold text-slate-900 font-mono">
                {wo.actualHours} / {wo.estimatedHours}h
              </p>
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Product</h3>
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg">
                <Package className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="font-mono text-sm text-primary-600">{wo.product.partNumber}</p>
                <p className="text-sm text-slate-900">{wo.product.name}</p>
                <Badge>Rev {wo.product.revision}</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Timeline</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Start Date</span>
              <span className="text-slate-900">{formatDate(wo.startDate, 'medium')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Due Date</span>
              <span className={isLate ? 'text-danger-600 font-medium' : 'text-slate-900'}>
                {formatDate(wo.dueDate, 'medium')}
                {isLate && ' (OVERDUE)'}
              </span>
            </div>
          </div>
        </div>

        {/* Work Center & Assignment */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Assignment</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Factory className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-900">{wo.workCenter}</span>
            </div>
            {wo.assignedTo.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {wo.assignedTo.map((person, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-900">{person}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Operations */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Operations</h3>
          <div className="space-y-2">
            {operations.map((op, idx) => {
              const isCurrentOp = wo.currentOperation === op.name;
              const isComplete = wo.operationProgress > (idx / operations.length) * 100;
              
              return (
                <div
                  key={op.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border',
                    isCurrentOp ? 'bg-primary-50 border-primary-200' :
                    isComplete ? 'bg-success-50 border-success-200' :
                    'bg-slate-50 border-slate-200'
                  )}
                >
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                    isComplete ? 'bg-success-500 text-white' :
                    isCurrentOp ? 'bg-primary-500 text-white' :
                    'bg-slate-300 text-slate-600'
                  )}>
                    {isComplete ? <CheckCircle className="h-4 w-4" /> : op.sequence / 10}
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      'text-sm font-medium',
                      isCurrentOp ? 'text-primary-700' : 'text-slate-900'
                    )}>
                      {op.name}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">{op.duration}h</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        {wo.notes && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Notes</h3>
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{wo.notes}</p>
          </div>
        )}

        {/* Related SO */}
        {wo.salesOrder && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Related Order</h3>
            <button className="w-full flex items-center justify-between p-3 text-sm bg-slate-50 rounded-lg hover:bg-slate-100">
              <span className="font-mono text-primary-600">{wo.salesOrder}</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
        <div className="flex gap-2">
          {wo.status === 'IN_PROGRESS' && (
            <>
              <button className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2">
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
const ProductionPage: React.FC = () => {
  const [selectedWO, setSelectedWO] = useState<typeof workOrdersData[0] | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [statusFilter, setStatusFilter] = useState('all');

  // Group by status for Kanban
  const woByStatus = workOrdersData.reduce((acc, wo) => {
    if (!acc[wo.status]) acc[wo.status] = [];
    acc[wo.status].push(wo);
    return acc;
  }, {} as Record<string, typeof workOrdersData>);

  const kanbanColumns = ['RELEASED', 'SCHEDULED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <nav className="mb-2">
                <ol className="flex items-center gap-2 text-sm">
                  <li><a href="#" className="text-slate-500 hover:text-slate-700">Dashboard</a></li>
                  <li className="text-slate-400">/</li>
                  <li className="text-slate-700 font-medium">Production</li>
                </ol>
              </nav>
              <h1 className="text-2xl font-bold text-slate-900">Production</h1>
              <p className="text-sm text-slate-500 mt-1">Manage work orders and production scheduling</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2">
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
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <KPICard
            title="Active WOs"
            value={productionStats.activeWorkOrders}
            icon={<Factory className="h-5 w-5 text-primary-600" />}
            iconColor="bg-primary-100"
          />
          <KPICard
            title="Completed (MTD)"
            value={productionStats.completedThisMonth}
            icon={<CheckCircle className="h-5 w-5 text-success-600" />}
            iconColor="bg-success-100"
          />
          <KPICard
            title="On-Time Delivery"
            value={productionStats.onTimeDelivery}
            suffix="%"
            icon={<Timer className="h-5 w-5 text-info-600" />}
            iconColor="bg-info-100"
          />
          <KPICard
            title="Avg Cycle Time"
            value={productionStats.avgCycleTime}
            suffix="days"
            icon={<Clock className="h-5 w-5 text-warning-600" />}
            iconColor="bg-warning-100"
          />
          <KPICard
            title="Utilization"
            value={productionStats.utilization}
            suffix="%"
            progress={productionStats.utilization}
            icon={<Gauge className="h-5 w-5 text-purple-600" />}
            iconColor="bg-purple-100"
          />
          <KPICard
            title="Efficiency"
            value={productionStats.efficiency}
            suffix="%"
            progress={productionStats.efficiency}
            icon={<Activity className="h-5 w-5 text-cyan-600" />}
            iconColor="bg-cyan-100"
          />
        </div>

        {/* View Toggle */}
        <div className="bg-white rounded-xl border border-slate-200 mb-4 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search work orders..."
                className="w-64 pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                      <div className="bg-slate-100 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={cn('w-2 h-2 rounded-full', config.dotColor)} />
                            <span className="font-medium text-slate-900">{config.label}</span>
                          </div>
                          <Badge>{wos.length}</Badge>
                        </div>
                        <div className="space-y-3">
                          {wos.map((wo) => (
                            <WorkOrderCard key={wo.id} wo={wo} onClick={() => setSelectedWO(wo)} />
                          ))}
                          {wos.length === 0 && (
                            <div className="text-center py-8 text-sm text-slate-400">No work orders</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Work Order</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Progress</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Due Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Work Center</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {workOrdersData.map((wo) => (
                      <tr
                        key={wo.id}
                        onClick={() => setSelectedWO(wo)}
                        className={cn(
                          'border-b border-slate-100 hover:bg-slate-50 cursor-pointer',
                          selectedWO?.id === wo.id && 'bg-primary-50'
                        )}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-semibold text-primary-600">{wo.woNumber}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">{wo.product.name}</p>
                          <p className="text-xs text-slate-500">{wo.product.partNumber}</p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={wo.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <ProgressRing value={wo.operationProgress} size={32} strokeWidth={3} />
                            <span className="text-sm text-slate-600">{wo.completedQty}/{wo.quantity}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'text-sm',
                            new Date(wo.dueDate) < new Date() && wo.status !== 'COMPLETED' ? 'text-danger-600 font-medium' : 'text-slate-700'
                          )}>
                            {formatDate(wo.dueDate, 'short')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">{wo.workCenter}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button className="p-1 text-slate-400 hover:text-slate-600">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedWO && (
            <div className="w-96 bg-white rounded-xl border border-slate-200 overflow-hidden flex-shrink-0">
              <WorkOrderDetail wo={selectedWO} onClose={() => setSelectedWO(null)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductionPage;
