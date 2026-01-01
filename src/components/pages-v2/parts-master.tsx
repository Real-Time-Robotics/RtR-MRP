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
  Copy,
  FileText,
  History,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  StarOff,
  Link,
  Unlink,
  Settings,
  Tag,
  Box,
  Layers,
  ChevronRight,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { cn, formatCurrency, formatNumber, formatDate } from '../../lib/utils';

// =============================================================================
// PARTS MASTER PAGE - REDESIGNED
// Comprehensive parts management with AS9100/ITAR compliance
// =============================================================================

// Mock data
const partsData = [
  {
    id: '1',
    partNumber: 'PRT-MOT-001',
    internalPN: 'INT-2024-0001',
    name: 'Motor U15 II KV100',
    description: 'High-performance brushless motor for heavy-lift applications',
    category: 'Propulsion',
    subcategory: 'Motors',
    type: 'PURCHASED',
    status: 'ACTIVE',
    revision: 'B',
    unitOfMeasure: 'EA',
    unitCost: 385.00,
    leadTime: 21,
    minStock: 24,
    currentStock: 12,
    supplier: 'T-Motor Technology',
    supplierPN: 'U15-II-KV100',
    manufacturer: 'T-Motor',
    manufacturerPN: 'U15-II-100',
    countryOfOrigin: 'CN',
    hsCode: '8501.10.40',
    eccn: 'EAR99',
    itarControlled: false,
    hazmat: false,
    serialTracked: true,
    lotTracked: true,
    shelfLife: null,
    weight: 0.525,
    weightUnit: 'kg',
    createdAt: '2024-01-15',
    updatedAt: '2024-12-28',
    lastPurchase: '2024-12-15',
    avgMonthlyUsage: 8,
    certifications: ['RoHS', 'CE'],
    documents: 3,
    bomUsage: 5,
    isFavorite: true,
  },
  {
    id: '2',
    partNumber: 'PRT-ELC-002',
    internalPN: 'INT-2024-0002',
    name: 'Pixhawk 6X Flight Controller',
    description: 'Advanced autopilot system with redundant sensors',
    category: 'Electronics',
    subcategory: 'Controllers',
    type: 'PURCHASED',
    status: 'ACTIVE',
    revision: 'A',
    unitOfMeasure: 'EA',
    unitCost: 589.00,
    leadTime: 14,
    minStock: 15,
    currentStock: 8,
    supplier: 'Holybro',
    supplierPN: 'PX6X-001',
    manufacturer: 'Holybro',
    manufacturerPN: 'PX6X-001',
    countryOfOrigin: 'US',
    hsCode: '8526.91.00',
    eccn: '7A003',
    itarControlled: false,
    hazmat: false,
    serialTracked: true,
    lotTracked: false,
    shelfLife: null,
    weight: 0.045,
    weightUnit: 'kg',
    createdAt: '2024-02-10',
    updatedAt: '2024-12-27',
    lastPurchase: '2024-12-20',
    avgMonthlyUsage: 6,
    certifications: ['FCC', 'CE'],
    documents: 5,
    bomUsage: 8,
    isFavorite: true,
  },
  {
    id: '3',
    partNumber: 'PRT-BAT-001',
    internalPN: 'INT-2024-0003',
    name: 'Battery LiPo 6S 22000mAh',
    description: 'High-capacity lithium polymer battery pack',
    category: 'Power',
    subcategory: 'Batteries',
    type: 'PURCHASED',
    status: 'ACTIVE',
    revision: 'C',
    unitOfMeasure: 'EA',
    unitCost: 285.00,
    leadTime: 30,
    minStock: 20,
    currentStock: 45,
    supplier: 'Tattu',
    supplierPN: 'TA-6S-22000',
    manufacturer: 'Gensace',
    manufacturerPN: 'GS-6S-22000',
    countryOfOrigin: 'CN',
    hsCode: '8507.60.00',
    eccn: 'EAR99',
    itarControlled: false,
    hazmat: true,
    serialTracked: false,
    lotTracked: true,
    shelfLife: 365,
    weight: 2.8,
    weightUnit: 'kg',
    createdAt: '2024-01-20',
    updatedAt: '2024-12-26',
    lastPurchase: '2024-12-10',
    avgMonthlyUsage: 12,
    certifications: ['UN38.3', 'MSDS'],
    documents: 4,
    bomUsage: 3,
    isFavorite: false,
  },
  {
    id: '4',
    partNumber: 'ASM-FRM-X8',
    internalPN: 'INT-2024-0010',
    name: 'Frame Assembly HERA-X8',
    description: 'Complete carbon fiber frame assembly for X8 configuration',
    category: 'Frame',
    subcategory: 'Assemblies',
    type: 'MANUFACTURED',
    status: 'ACTIVE',
    revision: 'D',
    unitOfMeasure: 'EA',
    unitCost: 4500.00,
    leadTime: 15,
    minStock: 5,
    currentStock: 3,
    supplier: null,
    supplierPN: null,
    manufacturer: 'RTR',
    manufacturerPN: 'ASM-FRM-X8-D',
    countryOfOrigin: 'VN',
    hsCode: '8802.20.00',
    eccn: '9A610',
    itarControlled: true,
    hazmat: false,
    serialTracked: true,
    lotTracked: true,
    shelfLife: null,
    weight: 8.5,
    weightUnit: 'kg',
    createdAt: '2024-03-01',
    updatedAt: '2024-12-28',
    lastPurchase: null,
    avgMonthlyUsage: 2,
    certifications: ['AS9100'],
    documents: 12,
    bomUsage: 2,
    isFavorite: true,
  },
  {
    id: '5',
    partNumber: 'PRT-SEN-GPS',
    internalPN: 'INT-2024-0015',
    name: 'GPS Module RTK F9P',
    description: 'High-precision RTK GPS module for centimeter accuracy',
    category: 'Sensors',
    subcategory: 'Navigation',
    type: 'PURCHASED',
    status: 'ACTIVE',
    revision: 'A',
    unitOfMeasure: 'EA',
    unitCost: 450.00,
    leadTime: 18,
    minStock: 15,
    currentStock: 32,
    supplier: 'u-blox',
    supplierPN: 'ZED-F9P',
    manufacturer: 'u-blox',
    manufacturerPN: 'ZED-F9P-02B',
    countryOfOrigin: 'CH',
    hsCode: '8526.91.00',
    eccn: '7A003',
    itarControlled: false,
    hazmat: false,
    serialTracked: true,
    lotTracked: false,
    shelfLife: null,
    weight: 0.015,
    weightUnit: 'kg',
    createdAt: '2024-04-05',
    updatedAt: '2024-12-25',
    lastPurchase: '2024-12-01',
    avgMonthlyUsage: 10,
    certifications: ['FCC', 'CE', 'ISED'],
    documents: 6,
    bomUsage: 6,
    isFavorite: false,
  },
  {
    id: '6',
    partNumber: 'PRT-PRP-28',
    internalPN: 'INT-2024-0020',
    name: 'Carbon Propeller 28x9.5',
    description: 'Carbon fiber propeller for heavy-lift drones',
    category: 'Propulsion',
    subcategory: 'Propellers',
    type: 'PURCHASED',
    status: 'ACTIVE',
    revision: 'B',
    unitOfMeasure: 'EA',
    unitCost: 45.00,
    leadTime: 21,
    minStock: 50,
    currentStock: 156,
    supplier: 'T-Motor',
    supplierPN: 'P28x9.5-CF',
    manufacturer: 'T-Motor',
    manufacturerPN: 'P28x9.5-CF',
    countryOfOrigin: 'CN',
    hsCode: '8803.30.00',
    eccn: 'EAR99',
    itarControlled: false,
    hazmat: false,
    serialTracked: false,
    lotTracked: true,
    shelfLife: null,
    weight: 0.085,
    weightUnit: 'kg',
    createdAt: '2024-02-28',
    updatedAt: '2024-12-28',
    lastPurchase: '2024-12-18',
    avgMonthlyUsage: 24,
    certifications: [],
    documents: 2,
    bomUsage: 4,
    isFavorite: false,
  },
];

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
  { value: 'PURCHASED', label: 'Purchased' },
  { value: 'MANUFACTURED', label: 'Manufactured' },
  { value: 'PHANTOM', label: 'Phantom' },
];

const statuses = [
  { value: 'all', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'OBSOLETE', label: 'Obsolete' },
  { value: 'PENDING', label: 'Pending' },
];

// Badge component for inline use
const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
}> = ({ children, variant = 'default', size = 'sm' }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-primary-100 text-primary-700',
    success: 'bg-success-100 text-success-700',
    warning: 'bg-warning-100 text-warning-700',
    danger: 'bg-danger-100 text-danger-700',
    info: 'bg-info-100 text-info-700',
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

// Status badge with dot
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
  const ratio = current / min;
  
  if (current === 0) {
    return <Badge variant="danger">Out of Stock</Badge>;
  } else if (ratio < 0.5) {
    return <Badge variant="danger">Critical</Badge>;
  } else if (ratio < 1) {
    return <Badge variant="warning">Low Stock</Badge>;
  }
  return <Badge variant="success">In Stock</Badge>;
};

// Part detail drawer content
const PartDetailPanel: React.FC<{ part: typeof partsData[0]; onClose: () => void }> = ({ part, onClose }) => (
  <div className="h-full flex flex-col">
    {/* Header */}
    <div className="px-6 py-4 border-b border-slate-200">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{part.partNumber}</h2>
            <Badge variant="primary">{part.revision}</Badge>
            <StatusBadge status={part.status} />
          </div>
          <p className="text-sm text-slate-500 mt-1">{part.name}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600"
        >
          <XCircle className="h-5 w-5" />
        </button>
      </div>
    </div>

    {/* Content */}
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500">Current Stock</p>
          <p className="text-xl font-semibold text-slate-900 font-mono">{part.currentStock}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500">Unit Cost</p>
          <p className="text-xl font-semibold text-slate-900 font-mono">{formatCurrency(part.unitCost)}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500">Lead Time</p>
          <p className="text-xl font-semibold text-slate-900 font-mono">{part.leadTime}d</p>
        </div>
      </div>

      {/* Description */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-2">Description</h3>
        <p className="text-sm text-slate-600">{part.description}</p>
      </div>

      {/* Classification */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-2">Classification</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Category</span>
            <span className="text-slate-900">{part.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Subcategory</span>
            <span className="text-slate-900">{part.subcategory}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Type</span>
            <Badge>{part.type}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">UoM</span>
            <span className="text-slate-900">{part.unitOfMeasure}</span>
          </div>
        </div>
      </div>

      {/* Compliance */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-2">Compliance & Export</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Country</span>
            <span className="text-slate-900">{part.countryOfOrigin}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">HS Code</span>
            <span className="text-slate-900 font-mono">{part.hsCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">ECCN</span>
            <span className="text-slate-900 font-mono">{part.eccn}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">ITAR</span>
            {part.itarControlled ? (
              <Badge variant="danger">Controlled</Badge>
            ) : (
              <Badge variant="success">Not Controlled</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tracking */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-2">Tracking</h3>
        <div className="flex gap-2">
          {part.serialTracked && <Badge variant="info">Serial Tracked</Badge>}
          {part.lotTracked && <Badge variant="info">Lot Tracked</Badge>}
          {part.hazmat && <Badge variant="danger">HAZMAT</Badge>}
          {part.shelfLife && <Badge variant="warning">Shelf Life: {part.shelfLife}d</Badge>}
        </div>
      </div>

      {/* Supplier Info */}
      {part.supplier && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-2">Supplier</h3>
          <div className="p-3 bg-slate-50 rounded-lg text-sm">
            <p className="font-medium text-slate-900">{part.supplier}</p>
            <p className="text-slate-500">PN: {part.supplierPN}</p>
          </div>
        </div>
      )}

      {/* Certifications */}
      {part.certifications.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-2">Certifications</h3>
          <div className="flex flex-wrap gap-2">
            {part.certifications.map((cert) => (
              <Badge key={cert} variant="primary">{cert}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Links */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-2">Related</h3>
        <div className="space-y-2">
          <button className="w-full flex items-center justify-between p-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              Documents
            </span>
            <span className="text-slate-500">{part.documents}</span>
          </button>
          <button className="w-full flex items-center justify-between p-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-400" />
              BOM Usage
            </span>
            <span className="text-slate-500">{part.bomUsage}</span>
          </button>
          <button className="w-full flex items-center justify-between p-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">
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
    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex gap-2">
      <button className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
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
const PartsMasterPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPart, setSelectedPart] = useState<typeof partsData[0] | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter data
  const filteredParts = partsData.filter((part) => {
    const matchesSearch =
      !searchQuery ||
      part.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' ||
      part.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesType = selectedType === 'all' || part.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || part.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesType && matchesStatus;
  });

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
                  <li className="text-slate-700 font-medium">Parts Master</li>
                </ol>
              </nav>
              <h1 className="text-2xl font-bold text-slate-900">Parts Master</h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage {formatNumber(partsData.length)} parts with AS9100/ITAR compliance
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import
              </button>
              <button className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2">
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
            <div className="bg-white rounded-xl border border-slate-200 mb-4">
              <div className="p-4 flex items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search parts..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Quick Filters */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>

                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {types.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </button>
              </div>

              {/* Extended Filters */}
              {showFilters && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">ITAR Status</label>
                      <select className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        <option>All</option>
                        <option>ITAR Controlled</option>
                        <option>Not Controlled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Stock Status</label>
                      <select className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        <option>All</option>
                        <option>In Stock</option>
                        <option>Low Stock</option>
                        <option>Out of Stock</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tracking</label>
                      <select className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        <option>All</option>
                        <option>Serial Tracked</option>
                        <option>Lot Tracked</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">HAZMAT</label>
                      <select className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        <option>All</option>
                        <option>Yes</option>
                        <option>No</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Results Count */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing <span className="font-medium text-slate-900">{filteredParts.length}</span> parts
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Sort by:</span>
                <select className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  <option>Part Number</option>
                  <option>Name</option>
                  <option>Category</option>
                  <option>Stock</option>
                  <option>Last Updated</option>
                </select>
              </div>
            </div>

            {/* Parts Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Part</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Stock</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Compliance</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParts.map((part) => (
                    <tr
                      key={part.id}
                      className={cn(
                        'border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors',
                        selectedPart?.id === part.id && 'bg-primary-50'
                      )}
                      onClick={() => setSelectedPart(part)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Toggle favorite
                            }}
                            className="text-slate-300 hover:text-warning-500"
                          >
                            {part.isFavorite ? (
                              <Star className="h-4 w-4 fill-warning-500 text-warning-500" />
                            ) : (
                              <StarOff className="h-4 w-4" />
                            )}
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium text-primary-600">
                                {part.partNumber}
                              </span>
                              <Badge variant="default">{part.revision}</Badge>
                            </div>
                            <p className="text-sm text-slate-500 truncate max-w-xs">{part.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge>{part.category}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{part.type}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-mono text-sm">{part.currentStock}</span>
                          <StockStatus current={part.currentStock} min={part.minStock} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-sm text-slate-900">{formatCurrency(part.unitCost)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={part.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {part.itarControlled && (
                            <Badge variant="danger">ITAR</Badge>
                          )}
                          {part.hazmat && (
                            <Badge variant="warning">HAZ</Badge>
                          )}
                          {part.serialTracked && (
                            <Badge variant="info">SN</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPart(part);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Showing 1 to {filteredParts.length} of {filteredParts.length} results
                </p>
                <div className="flex items-center gap-1">
                  <button className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded disabled:opacity-50" disabled>
                    Previous
                  </button>
                  <button className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded">1</button>
                  <button className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded disabled:opacity-50" disabled>
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Detail Panel */}
          {selectedPart && (
            <div className="w-96 bg-white rounded-xl border border-slate-200 overflow-hidden lg:block">
              <PartDetailPanel part={selectedPart} onClose={() => setSelectedPart(null)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartsMasterPage;
