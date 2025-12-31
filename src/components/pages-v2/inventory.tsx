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
  ArrowUpDown,
  Grid3X3,
  List,
  LayoutGrid,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Box,
  Warehouse,
  DollarSign,
} from 'lucide-react';

// Import from UI system
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import {
  Button,
  IconButton,
  Input,
  SearchInput,
  Select,
  Card,
  CardHeader,
  CardBody,
  KPICard,
  KPICardGroup,
  Badge,
  StatusBadge,
  DataTable,
  BarChart,
  DonutChart,
  Sparkline,
  Modal,
  ConfirmDialog,
} from '../ui-v2';
import {
  PageContainer,
  PageHeader,
  PageSection,
  Grid,
} from '../layout-v2';

// =============================================================================
// INVENTORY PAGE - REDESIGNED
// Data-dense inventory management interface
// =============================================================================

// Mock data
const inventoryStats = {
  totalParts: 2847,
  totalValue: 1250000,
  lowStock: 23,
  outOfStock: 5,
  turnoverRate: 4.2,
};

const inventoryData = [
  {
    id: '1',
    partNumber: 'PRT-MOT-001',
    name: 'Motor U15 II KV100',
    category: 'Propulsion',
    quantity: 12,
    minStock: 24,
    unitCost: 385,
    totalValue: 4620,
    warehouse: 'WH-01',
    supplier: 'SUP-TW-001',
    leadTime: 21,
    trend: [15, 18, 14, 12, 10, 12],
    status: 'low_stock',
    lastUpdated: '2024-12-28',
  },
  {
    id: '2',
    partNumber: 'PRT-ELC-002',
    name: 'Pixhawk 6X Flight Controller',
    category: 'Electronics',
    quantity: 8,
    minStock: 15,
    unitCost: 589,
    totalValue: 4712,
    warehouse: 'WH-01',
    supplier: 'SUP-US-001',
    leadTime: 14,
    trend: [12, 10, 9, 11, 8, 8],
    status: 'low_stock',
    lastUpdated: '2024-12-28',
  },
  {
    id: '3',
    partNumber: 'PRT-BAT-001',
    name: 'Battery LiPo 6S 22000mAh',
    category: 'Power',
    quantity: 45,
    minStock: 20,
    unitCost: 285,
    totalValue: 12825,
    warehouse: 'WH-02',
    supplier: 'SUP-CN-001',
    leadTime: 30,
    trend: [38, 42, 40, 43, 45, 45],
    status: 'in_stock',
    lastUpdated: '2024-12-27',
  },
  {
    id: '4',
    partNumber: 'PRT-SEN-001',
    name: 'GPS Module RTK',
    category: 'Sensors',
    quantity: 32,
    minStock: 15,
    unitCost: 450,
    totalValue: 14400,
    warehouse: 'WH-01',
    supplier: 'SUP-JP-001',
    leadTime: 18,
    trend: [25, 28, 30, 29, 31, 32],
    status: 'in_stock',
    lastUpdated: '2024-12-27',
  },
  {
    id: '5',
    partNumber: 'PRT-FRM-001',
    name: 'Carbon Fiber Frame X8',
    category: 'Frame',
    quantity: 0,
    minStock: 10,
    unitCost: 1200,
    totalValue: 0,
    warehouse: 'WH-01',
    supplier: 'SUP-TW-002',
    leadTime: 45,
    trend: [5, 3, 2, 1, 0, 0],
    status: 'out_of_stock',
    lastUpdated: '2024-12-25',
  },
  {
    id: '6',
    partNumber: 'PRT-PRP-001',
    name: 'Carbon Propeller 28x9.5',
    category: 'Propulsion',
    quantity: 156,
    minStock: 50,
    unitCost: 45,
    totalValue: 7020,
    warehouse: 'WH-02',
    supplier: 'SUP-CN-002',
    leadTime: 21,
    trend: [140, 145, 150, 155, 158, 156],
    status: 'in_stock',
    lastUpdated: '2024-12-28',
  },
];

const categoryData = [
  { name: 'Propulsion', value: 450000, color: '#3B82F6' },
  { name: 'Electronics', value: 320000, color: '#10B981' },
  { name: 'Power', value: 280000, color: '#F59E0B' },
  { name: 'Sensors', value: 120000, color: '#8B5CF6' },
  { name: 'Frame', value: 80000, color: '#06B6D4' },
];

const warehouseData = [
  { name: 'WH-01 Main', parts: 1820, value: 850000 },
  { name: 'WH-02 Secondary', parts: 756, value: 280000 },
  { name: 'WH-03 Overflow', parts: 271, value: 120000 },
];

// Quick action button component
const QuickActionCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  badge?: string;
  badgeColor?: 'danger' | 'warning' | 'success';
}> = ({ icon, label, onClick, badge, badgeColor }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-primary-300 hover:shadow-sm transition-all text-left w-full"
  >
    <div className="p-2 bg-slate-100 rounded-lg text-slate-600">{icon}</div>
    <div className="flex-1">
      <p className="text-sm font-medium text-slate-900">{label}</p>
    </div>
    {badge && (
      <Badge variant={badgeColor || 'danger'} size="sm">
        {badge}
      </Badge>
    )}
  </button>
);

// Inventory Page Component
const InventoryPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'propulsion', label: 'Propulsion' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'power', label: 'Power' },
    { value: 'sensors', label: 'Sensors' },
    { value: 'frame', label: 'Frame' },
  ];

  const statuses = [
    { value: 'all', label: 'All Status' },
    { value: 'in_stock', label: 'In Stock' },
    { value: 'low_stock', label: 'Low Stock' },
    { value: 'out_of_stock', label: 'Out of Stock' },
  ];

  return (
    <PageContainer maxWidth="2xl" padding="md">
      {/* Header */}
      <PageHeader
        title="Inventory Management"
        description="Manage parts, stock levels, and warehouse locations"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory' },
        ]}
        actions={
          <>
            <Button variant="ghost" size="sm" leftIcon={<Upload className="h-4 w-4" />}>
              Import
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<Download className="h-4 w-4" />}>
              Export
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
              Add Part
            </Button>
          </>
        }
      />

      {/* KPI Cards */}
      <PageSection>
        <KPICardGroup columns={5}>
          <KPICard
            title="Total Parts"
            value={inventoryStats.totalParts}
            valueFormat="number"
            icon={<Package className="h-5 w-5" />}
            iconColor="primary"
            variant="compact"
          />
          <KPICard
            title="Total Value"
            value={inventoryStats.totalValue}
            valueFormat="currency"
            change={8.5}
            icon={<DollarSign className="h-5 w-5" />}
            iconColor="success"
            variant="compact"
          />
          <KPICard
            title="Low Stock"
            value={inventoryStats.lowStock}
            icon={<AlertTriangle className="h-5 w-5" />}
            iconColor="warning"
            variant="compact"
          />
          <KPICard
            title="Out of Stock"
            value={inventoryStats.outOfStock}
            icon={<Box className="h-5 w-5" />}
            iconColor="danger"
            variant="compact"
          />
          <KPICard
            title="Turnover Rate"
            value={`${inventoryStats.turnoverRate}x`}
            change={0.3}
            icon={<RefreshCw className="h-5 w-5" />}
            iconColor="info"
            variant="compact"
          />
        </KPICardGroup>
      </PageSection>

      {/* Quick Actions & Charts */}
      <PageSection>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Quick Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Quick Actions</h3>
            <QuickActionCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Reorder Required"
              badge={String(inventoryStats.lowStock)}
              badgeColor="warning"
            />
            <QuickActionCard
              icon={<Box className="h-4 w-4" />}
              label="Out of Stock"
              badge={String(inventoryStats.outOfStock)}
              badgeColor="danger"
            />
            <QuickActionCard
              icon={<Warehouse className="h-4 w-4" />}
              label="Stock Transfer"
            />
            <QuickActionCard
              icon={<ArrowUpDown className="h-4 w-4" />}
              label="Stock Adjustment"
            />
          </div>

          {/* Category Distribution */}
          <div className="lg:col-span-2">
            <DonutChart
              title="Value by Category"
              data={categoryData}
              height={200}
              innerRadius={45}
              outerRadius={70}
              showLegend
              formatter={(value) => formatCurrency(value)}
            />
          </div>

          {/* Warehouse Stats */}
          <Card>
            <CardHeader title="Warehouses" />
            <CardBody className="space-y-3">
              {warehouseData.map((wh) => (
                <div key={wh.name} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{wh.name}</p>
                    <p className="text-xs text-slate-500">{formatNumber(wh.parts)} parts</p>
                  </div>
                  <span className="text-sm font-mono text-slate-700">
                    {formatCurrency(wh.value)}
                  </span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </PageSection>

      {/* Parts Table */}
      <PageSection title="Parts Inventory">
        <Card>
          {/* Filters */}
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-4 flex-wrap">
              <SearchInput
                placeholder="Search parts..."
                className="w-64"
              />
              <Select
                options={categories}
                value={selectedCategory}
                onChange={(v) => setSelectedCategory(v as string)}
                placeholder="Category"
                className="w-40"
              />
              <Select
                options={statuses}
                value={selectedStatus}
                onChange={(v) => setSelectedStatus(v as string)}
                placeholder="Status"
                className="w-36"
              />
              <div className="flex-1" />
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    'p-1.5 rounded',
                    viewMode === 'table' ? 'bg-white shadow-sm' : 'text-slate-500'
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-1.5 rounded',
                    viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-slate-500'
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <DataTable
            data={inventoryData}
            keyField="id"
            selectable
            selectedKeys={selectedRows}
            onSelectionChange={setSelectedRows}
            columns={[
              {
                key: 'partNumber',
                header: 'Part #',
                width: '130px',
                sortable: true,
                render: (value) => (
                  <span className="font-mono text-sm text-primary-600 font-medium">
                    {value}
                  </span>
                ),
              },
              {
                key: 'name',
                header: 'Name',
                sortable: true,
              },
              {
                key: 'category',
                header: 'Category',
                sortable: true,
                render: (value) => (
                  <Badge variant="secondary" size="sm">
                    {value}
                  </Badge>
                ),
              },
              {
                key: 'quantity',
                header: 'Qty',
                align: 'right',
                sortable: true,
                render: (value, row) => (
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-mono">{value}</span>
                    <span className="text-slate-400">/</span>
                    <span className="text-slate-500 font-mono">{row.minStock}</span>
                  </div>
                ),
              },
              {
                key: 'trend',
                header: 'Trend',
                width: '100px',
                render: (value) => (
                  <Sparkline
                    data={value}
                    color={value[value.length - 1] > value[0] ? '#10B981' : '#EF4444'}
                    width={80}
                    height={24}
                  />
                ),
              },
              {
                key: 'totalValue',
                header: 'Value',
                align: 'right',
                sortable: true,
                render: (value) => (
                  <span className="font-mono">{formatCurrency(value)}</span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (value) => <StatusBadge status={value} size="sm" />,
              },
              {
                key: 'warehouse',
                header: 'Location',
                render: (value) => (
                  <span className="text-slate-600">{value}</span>
                ),
              },
              {
                key: 'actions',
                header: '',
                width: '80px',
                render: (_, row) => (
                  <div className="flex items-center gap-1">
                    <button className="p-1 text-slate-400 hover:text-slate-600">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-1 text-slate-400 hover:text-slate-600">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="p-1 text-slate-400 hover:text-danger-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ),
              },
            ]}
            pagination
            pageSize={10}
          />
        </Card>
      </PageSection>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          // Handle delete
          setShowDeleteConfirm(false);
        }}
        title="Delete Parts"
        message={`Are you sure you want to delete ${selectedRows.size} selected parts? This action cannot be undone.`}
        variant="danger"
        confirmText="Delete"
      />
    </PageContainer>
  );
};

export default InventoryPage;
