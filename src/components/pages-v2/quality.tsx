'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Camera,
  Paperclip,
  MessageSquare,
  User,
  Calendar,
  Tag,
  MoreHorizontal,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Target,
  AlertCircle,
  Clipboard,
  Users,
  Building,
  Package,
  History,
} from 'lucide-react';
import { cn, formatNumber, formatDate } from '../../lib/utils';

// =============================================================================
// QUALITY / NCR PAGE - REDESIGNED
// Non-Conformance Reports and Quality Management
// =============================================================================

// Mock data
const qualityStats = {
  openNCRs: 8,
  closedThisMonth: 23,
  avgResolutionTime: 4.2,
  fpy: 98.8,
  dpmo: 450,
  customerComplaints: 2,
};

const ncrData = [
  {
    id: '1',
    ncrNumber: 'NCR-2024-0089',
    title: 'Motor vibration exceeds specification',
    description: 'Motor U15 II shows excessive vibration at high RPM during QC inspection. Measured 2.5mm displacement vs 1.5mm spec.',
    source: 'INTERNAL',
    type: 'PRODUCT',
    severity: 'MAJOR',
    priority: 'HIGH',
    status: 'OPEN',
    partNumber: 'PRT-MOT-001',
    partName: 'Motor U15 II KV100',
    lotNumber: 'LOT-2024-1215',
    serialNumber: 'SN-MOT-2024-0456',
    quantity: 3,
    workOrder: 'WO-2024-0089',
    supplier: 'T-Motor Technology',
    rootCause: null,
    correctiveAction: null,
    preventiveAction: null,
    disposition: null,
    assignedTo: 'Nguyen Van A',
    reportedBy: 'Tran Van B',
    reportedDate: '2024-12-28',
    dueDate: '2025-01-05',
    closedDate: null,
    attachments: 2,
    comments: 3,
    createdAt: '2024-12-28T09:00:00Z',
    updatedAt: '2024-12-28T14:30:00Z',
  },
  {
    id: '2',
    ncrNumber: 'NCR-2024-0088',
    title: 'GPS module calibration failure',
    description: 'RTK GPS module fails to achieve centimeter accuracy. Max observed error is 15cm vs 2cm spec.',
    source: 'INTERNAL',
    type: 'PRODUCT',
    severity: 'MINOR',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    partNumber: 'PRT-SEN-GPS',
    partName: 'GPS Module RTK F9P',
    lotNumber: 'LOT-2024-1210',
    serialNumber: 'SN-GPS-2024-0123',
    quantity: 1,
    workOrder: 'WO-2024-0088',
    supplier: 'u-blox',
    rootCause: 'Firmware version mismatch with base station',
    correctiveAction: 'Update firmware to v1.32',
    preventiveAction: null,
    disposition: 'REWORK',
    assignedTo: 'Le Van C',
    reportedBy: 'Nguyen Van A',
    reportedDate: '2024-12-27',
    dueDate: '2025-01-03',
    closedDate: null,
    attachments: 4,
    comments: 7,
    createdAt: '2024-12-27T10:30:00Z',
    updatedAt: '2024-12-28T11:00:00Z',
  },
  {
    id: '3',
    ncrNumber: 'NCR-2024-0087',
    title: 'Carbon fiber delamination on frame',
    description: 'Visual inspection revealed small delamination on frame arm joint. Size approximately 5mm x 8mm.',
    source: 'INTERNAL',
    type: 'MATERIAL',
    severity: 'CRITICAL',
    priority: 'CRITICAL',
    status: 'CLOSED',
    partNumber: 'ASM-FRM-X8',
    partName: 'Frame Assembly HERA-X8',
    lotNumber: 'LOT-2024-1205',
    serialNumber: 'SN-FRM-2024-0045',
    quantity: 1,
    workOrder: 'WO-2024-0085',
    supplier: null,
    rootCause: 'Insufficient curing time in autoclave',
    correctiveAction: 'Extended cure cycle from 4h to 6h',
    preventiveAction: 'Updated SOP for composite curing, added temperature monitoring',
    disposition: 'SCRAP',
    assignedTo: 'Pham Van D',
    reportedBy: 'Tran Van B',
    reportedDate: '2024-12-20',
    dueDate: '2024-12-25',
    closedDate: '2024-12-24',
    attachments: 6,
    comments: 12,
    createdAt: '2024-12-20T08:00:00Z',
    updatedAt: '2024-12-24T16:00:00Z',
  },
  {
    id: '4',
    ncrNumber: 'NCR-2024-0086',
    title: 'Customer complaint - Battery swelling',
    description: 'Customer reported battery pack swelling after 3 months of use. No physical damage observed.',
    source: 'CUSTOMER',
    type: 'PRODUCT',
    severity: 'MAJOR',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    partNumber: 'PRT-BAT-001',
    partName: 'Battery LiPo 6S 22000mAh',
    lotNumber: 'LOT-2024-0920',
    serialNumber: null,
    quantity: 2,
    workOrder: null,
    supplier: 'Tattu',
    rootCause: 'Investigation in progress - suspected manufacturing defect',
    correctiveAction: null,
    preventiveAction: null,
    disposition: 'RMA',
    assignedTo: 'Nguyen Van A',
    reportedBy: 'Customer Service',
    reportedDate: '2024-12-25',
    dueDate: '2025-01-08',
    closedDate: null,
    attachments: 3,
    comments: 5,
    createdAt: '2024-12-25T14:00:00Z',
    updatedAt: '2024-12-28T09:00:00Z',
  },
  {
    id: '5',
    ncrNumber: 'NCR-2024-0085',
    title: 'Propeller balance out of spec',
    description: 'Batch of propellers showing balance deviation > 0.5g on dynamic balancer.',
    source: 'INCOMING',
    type: 'MATERIAL',
    severity: 'MINOR',
    priority: 'LOW',
    status: 'CLOSED',
    partNumber: 'PRT-PRP-28',
    partName: 'Carbon Propeller 28x9.5',
    lotNumber: 'LOT-2024-1201',
    serialNumber: null,
    quantity: 24,
    workOrder: null,
    supplier: 'T-Motor',
    rootCause: 'Supplier QC process variance',
    correctiveAction: 'Returned to supplier, received replacement batch',
    preventiveAction: 'Added incoming inspection step for propeller balance',
    disposition: 'RETURN_TO_SUPPLIER',
    assignedTo: 'Le Van C',
    reportedBy: 'Incoming QC',
    reportedDate: '2024-12-18',
    dueDate: '2024-12-22',
    closedDate: '2024-12-21',
    attachments: 2,
    comments: 4,
    createdAt: '2024-12-18T11:00:00Z',
    updatedAt: '2024-12-21T15:00:00Z',
  },
];

const statusConfig: Record<string, { label: string; color: string; bgColor: string; dotColor: string }> = {
  OPEN: { label: 'Open', color: 'text-danger-700', bgColor: 'bg-danger-100', dotColor: 'bg-danger-500' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-warning-700', bgColor: 'bg-warning-100', dotColor: 'bg-warning-500' },
  PENDING_REVIEW: { label: 'Pending Review', color: 'text-info-700', bgColor: 'bg-info-100', dotColor: 'bg-info-500' },
  CLOSED: { label: 'Closed', color: 'text-success-700', bgColor: 'bg-success-100', dotColor: 'bg-success-500' },
};

const severityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  MINOR: { label: 'Minor', color: 'text-info-700', bgColor: 'bg-info-100' },
  MAJOR: { label: 'Major', color: 'text-warning-700', bgColor: 'bg-warning-100' },
  CRITICAL: { label: 'Critical', color: 'text-danger-700', bgColor: 'bg-danger-100' },
};

const sourceConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  INTERNAL: { label: 'Internal', color: 'text-primary-700', bgColor: 'bg-primary-100' },
  INCOMING: { label: 'Incoming', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  CUSTOMER: { label: 'Customer', color: 'text-danger-700', bgColor: 'bg-danger-100' },
  SUPPLIER: { label: 'Supplier', color: 'text-warning-700', bgColor: 'bg-warning-100' },
};

const dispositionConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  USE_AS_IS: { label: 'Use As-Is', icon: <CheckCircle className="h-4 w-4 text-success-500" /> },
  REWORK: { label: 'Rework', icon: <Edit className="h-4 w-4 text-warning-500" /> },
  REPAIR: { label: 'Repair', icon: <Edit className="h-4 w-4 text-info-500" /> },
  SCRAP: { label: 'Scrap', icon: <XCircle className="h-4 w-4 text-danger-500" /> },
  RETURN_TO_SUPPLIER: { label: 'Return to Supplier', icon: <Building className="h-4 w-4 text-purple-500" /> },
  RMA: { label: 'RMA', icon: <Package className="h-4 w-4 text-slate-500" /> },
};

// Badge component
const Badge: React.FC<{ children: React.ReactNode; variant?: string; className?: string }> = ({ children, variant = 'default', className }) => {
  const variants: Record<string, string> = {
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-primary-100 text-primary-700',
    success: 'bg-success-100 text-success-700',
    warning: 'bg-warning-100 text-warning-700',
    danger: 'bg-danger-100 text-danger-700',
    info: 'bg-info-100 text-info-700',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full', variants[variant], className)}>
      {children}
    </span>
  );
};

// Status Badge
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = statusConfig[status] || statusConfig.OPEN;
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
  trend?: 'up' | 'down' | 'neutral';
  trendGood?: boolean;
}> = ({ title, value, suffix, change, icon, iconColor, trend, trendGood }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div className={cn('p-2 rounded-lg', iconColor)}>{icon}</div>
      {change !== undefined && (
        <div className={cn(
          'flex items-center gap-1 text-sm font-medium',
          trendGood ? 'text-success-600' : 'text-danger-600'
        )}>
          {trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
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
  </div>
);

// NCR Card
const NCRCard: React.FC<{ ncr: typeof ncrData[0]; onClick: () => void }> = ({ ncr, onClick }) => {
  const isOverdue = new Date(ncr.dueDate) < new Date() && ncr.status !== 'CLOSED';
  const severityConf = severityConfig[ncr.severity];
  const sourceConf = sourceConfig[ncr.source];

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md',
        isOverdue ? 'border-danger-200 hover:border-danger-300' : 'border-slate-200 hover:border-primary-200'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-mono text-sm font-semibold text-primary-600">{ncr.ncrNumber}</p>
          <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full mt-1', severityConf.bgColor, severityConf.color)}>
            {severityConf.label}
          </span>
        </div>
        <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full', sourceConf.bgColor, sourceConf.color)}>
          {sourceConf.label}
        </span>
      </div>

      <h4 className="text-sm font-medium text-slate-900 mb-2 line-clamp-2">{ncr.title}</h4>

      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
        <Package className="h-3 w-3" />
        <span className="truncate">{ncr.partName}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Calendar className="h-3 w-3" />
          <span className={isOverdue ? 'text-danger-600 font-medium' : ''}>
            Due: {formatDate(ncr.dueDate, 'short')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {ncr.attachments > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Paperclip className="h-3 w-3" />
              {ncr.attachments}
            </div>
          )}
          {ncr.comments > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <MessageSquare className="h-3 w-3" />
              {ncr.comments}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// NCR Detail
const NCRDetail: React.FC<{ ncr: typeof ncrData[0]; onClose: () => void }> = ({ ncr, onClose }) => {
  const severityConf = severityConfig[ncr.severity];
  const sourceConf = sourceConfig[ncr.source];
  const isOverdue = new Date(ncr.dueDate) < new Date() && ncr.status !== 'CLOSED';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">{ncr.ncrNumber}</h2>
              <StatusBadge status={ncr.status} />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', severityConf.bgColor, severityConf.color)}>
                {severityConf.label}
              </span>
              <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', sourceConf.bgColor, sourceConf.color)}>
                {sourceConf.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Title & Description */}
        <div>
          <h3 className="text-base font-semibold text-slate-900 mb-2">{ncr.title}</h3>
          <p className="text-sm text-slate-600">{ncr.description}</p>
        </div>

        {/* Part Info */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Affected Part</h4>
          <div className="p-4 bg-slate-50 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-400" />
              <span className="font-mono text-sm text-primary-600">{ncr.partNumber}</span>
            </div>
            <p className="text-sm text-slate-900">{ncr.partName}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {ncr.lotNumber && <Badge>Lot: {ncr.lotNumber}</Badge>}
              {ncr.serialNumber && <Badge>S/N: {ncr.serialNumber}</Badge>}
              <Badge>Qty: {ncr.quantity}</Badge>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Timeline</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Reported</span>
              <span className="text-slate-900">{formatDate(ncr.reportedDate, 'medium')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Due Date</span>
              <span className={isOverdue ? 'text-danger-600 font-medium' : 'text-slate-900'}>
                {formatDate(ncr.dueDate, 'medium')}
              </span>
            </div>
            {ncr.closedDate && (
              <div className="flex justify-between">
                <span className="text-slate-500">Closed</span>
                <span className="text-success-600">{formatDate(ncr.closedDate, 'medium')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Assignment */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Assignment</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <User className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Assigned To</p>
                <p className="text-sm text-slate-900">{ncr.assignedTo}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <User className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Reported By</p>
                <p className="text-sm text-slate-900">{ncr.reportedBy}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Root Cause & Actions */}
        {ncr.rootCause && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Root Cause</h4>
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{ncr.rootCause}</p>
          </div>
        )}

        {ncr.correctiveAction && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Corrective Action</h4>
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{ncr.correctiveAction}</p>
          </div>
        )}

        {ncr.preventiveAction && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Preventive Action</h4>
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{ncr.preventiveAction}</p>
          </div>
        )}

        {/* Disposition */}
        {ncr.disposition && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Disposition</h4>
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
              {dispositionConfig[ncr.disposition]?.icon}
              <span className="text-sm font-medium text-slate-900">
                {dispositionConfig[ncr.disposition]?.label || ncr.disposition}
              </span>
            </div>
          </div>
        )}

        {/* Related */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Related</h4>
          <div className="space-y-2">
            {ncr.workOrder && (
              <button className="w-full flex items-center justify-between p-3 text-sm bg-slate-50 rounded-lg hover:bg-slate-100">
                <span className="text-slate-600">Work Order</span>
                <span className="font-mono text-primary-600">{ncr.workOrder}</span>
              </button>
            )}
            {ncr.supplier && (
              <button className="w-full flex items-center justify-between p-3 text-sm bg-slate-50 rounded-lg hover:bg-slate-100">
                <span className="text-slate-600">Supplier</span>
                <span className="text-slate-900">{ncr.supplier}</span>
              </button>
            )}
          </div>
        </div>

        {/* Attachments */}
        {ncr.attachments > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Attachments ({ncr.attachments})</h4>
            <button className="w-full flex items-center justify-between p-3 text-sm bg-slate-50 rounded-lg hover:bg-slate-100">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">View attachments</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
        <div className="flex gap-2">
          <button className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </button>
          {ncr.status !== 'CLOSED' && (
            <button className="flex-1 px-4 py-2 text-sm font-medium text-white bg-success-600 rounded-lg hover:bg-success-700 flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Close NCR
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Quality Page
const QualityPage: React.FC = () => {
  const [selectedNCR, setSelectedNCR] = useState<typeof ncrData[0] | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [statusFilter, setStatusFilter] = useState('all');

  // Group by status
  const ncrByStatus = ncrData.reduce((acc, ncr) => {
    if (!acc[ncr.status]) acc[ncr.status] = [];
    acc[ncr.status].push(ncr);
    return acc;
  }, {} as Record<string, typeof ncrData>);

  const kanbanColumns = ['OPEN', 'IN_PROGRESS', 'PENDING_REVIEW', 'CLOSED'];

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
                  <li className="text-slate-700 font-medium">Quality</li>
                </ol>
              </nav>
              <h1 className="text-2xl font-bold text-slate-900">Quality Management</h1>
              <p className="text-sm text-slate-500 mt-1">Non-Conformance Reports and CAPA tracking</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2">
                <Clipboard className="h-4 w-4" />
                Reports
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New NCR
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
            title="Open NCRs"
            value={qualityStats.openNCRs}
            icon={<AlertTriangle className="h-5 w-5 text-danger-600" />}
            iconColor="bg-danger-100"
          />
          <KPICard
            title="Closed (MTD)"
            value={qualityStats.closedThisMonth}
            icon={<CheckCircle className="h-5 w-5 text-success-600" />}
            iconColor="bg-success-100"
          />
          <KPICard
            title="Avg Resolution"
            value={qualityStats.avgResolutionTime}
            suffix="days"
            icon={<Clock className="h-5 w-5 text-info-600" />}
            iconColor="bg-info-100"
          />
          <KPICard
            title="First Pass Yield"
            value={qualityStats.fpy}
            suffix="%"
            change={-0.2}
            trendGood={false}
            trend="down"
            icon={<Target className="h-5 w-5 text-primary-600" />}
            iconColor="bg-primary-100"
          />
          <KPICard
            title="DPMO"
            value={qualityStats.dpmo}
            icon={<TrendingUp className="h-5 w-5 text-warning-600" />}
            iconColor="bg-warning-100"
          />
          <KPICard
            title="Customer Issues"
            value={qualityStats.customerComplaints}
            icon={<Users className="h-5 w-5 text-purple-600" />}
            iconColor="bg-purple-100"
          />
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl border border-slate-200 mb-4 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search NCRs..."
                className="w-64 pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select className="px-3 py-2 text-sm border border-slate-300 rounded-lg">
              <option value="all">All Severity</option>
              <option value="MINOR">Minor</option>
              <option value="MAJOR">Major</option>
              <option value="CRITICAL">Critical</option>
            </select>
            <select className="px-3 py-2 text-sm border border-slate-300 rounded-lg">
              <option value="all">All Sources</option>
              <option value="INTERNAL">Internal</option>
              <option value="INCOMING">Incoming</option>
              <option value="CUSTOMER">Customer</option>
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
          <div className={cn('flex-1', selectedNCR && 'hidden lg:block')}>
            {viewMode === 'kanban' ? (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {kanbanColumns.map((status) => {
                  const config = statusConfig[status];
                  const ncrs = ncrByStatus[status] || [];
                  return (
                    <div key={status} className="flex-shrink-0 w-72">
                      <div className="bg-slate-100 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={cn('w-2 h-2 rounded-full', config.dotColor)} />
                            <span className="font-medium text-slate-900">{config.label}</span>
                          </div>
                          <Badge>{ncrs.length}</Badge>
                        </div>
                        <div className="space-y-3">
                          {ncrs.map((ncr) => (
                            <NCRCard key={ncr.id} ncr={ncr} onClick={() => setSelectedNCR(ncr)} />
                          ))}
                          {ncrs.length === 0 && (
                            <div className="text-center py-8 text-sm text-slate-400">No NCRs</div>
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">NCR #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Severity</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Due Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Assigned</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ncrData.map((ncr) => {
                      const severityConf = severityConfig[ncr.severity];
                      const isOverdue = new Date(ncr.dueDate) < new Date() && ncr.status !== 'CLOSED';
                      return (
                        <tr
                          key={ncr.id}
                          onClick={() => setSelectedNCR(ncr)}
                          className={cn(
                            'border-b border-slate-100 hover:bg-slate-50 cursor-pointer',
                            selectedNCR?.id === ncr.id && 'bg-primary-50'
                          )}
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm font-semibold text-primary-600">{ncr.ncrNumber}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-slate-900 truncate max-w-xs">{ncr.title}</p>
                            <p className="text-xs text-slate-500">{ncr.partNumber}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', severityConf.bgColor, severityConf.color)}>
                              {severityConf.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={ncr.status} />
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('text-sm', isOverdue ? 'text-danger-600 font-medium' : 'text-slate-700')}>
                              {formatDate(ncr.dueDate, 'short')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-slate-600">{ncr.assignedTo}</span>
                          </td>
                          <td className="px-4 py-3">
                            <button className="p-1 text-slate-400 hover:text-slate-600">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedNCR && (
            <div className="w-96 bg-white rounded-xl border border-slate-200 overflow-hidden flex-shrink-0">
              <NCRDetail ncr={selectedNCR} onClose={() => setSelectedNCR(null)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QualityPage;
