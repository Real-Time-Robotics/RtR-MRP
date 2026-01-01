'use client';

import React, { useState } from 'react';
import {
  Layers,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Copy,
  ChevronRight,
  ChevronDown,
  Package,
  FileText,
  Download,
  Upload,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Calculator,
  GitBranch,
  Box,
  Boxes,
} from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '../../lib/utils';

// =============================================================================
// BOM (BILL OF MATERIALS) PAGE - REDESIGNED
// Hierarchical BOM viewer with cost rollup
// =============================================================================

// Mock BOM data
const bomData = {
  id: '1',
  partNumber: 'HERA-X8-PRO',
  name: 'HERA X8 Professional UAV',
  revision: 'D',
  status: 'RELEASED',
  effectiveDate: '2024-12-01',
  unitCost: 42500,
  laborCost: 8500,
  overheadCost: 2500,
  totalCost: 53500,
  components: [
    {
      id: '1-1',
      level: 1,
      itemNumber: '10',
      partNumber: 'ASM-FRM-X8',
      name: 'Frame Assembly HERA-X8',
      revision: 'D',
      type: 'MANUFACTURED',
      quantity: 1,
      uom: 'EA',
      unitCost: 4500,
      extendedCost: 4500,
      leadTime: 15,
      status: 'ACTIVE',
      hasChildren: true,
      children: [
        {
          id: '1-1-1',
          level: 2,
          itemNumber: '10.10',
          partNumber: 'PRT-CFB-ARM',
          name: 'Carbon Fiber Arm',
          revision: 'B',
          type: 'PURCHASED',
          quantity: 8,
          uom: 'EA',
          unitCost: 350,
          extendedCost: 2800,
          leadTime: 30,
          status: 'ACTIVE',
          hasChildren: false,
        },
        {
          id: '1-1-2',
          level: 2,
          itemNumber: '10.20',
          partNumber: 'PRT-CFB-BODY',
          name: 'Carbon Fiber Body',
          revision: 'C',
          type: 'PURCHASED',
          quantity: 1,
          uom: 'EA',
          unitCost: 1200,
          extendedCost: 1200,
          leadTime: 30,
          status: 'ACTIVE',
          hasChildren: false,
        },
      ],
    },
    {
      id: '1-2',
      level: 1,
      itemNumber: '20',
      partNumber: 'ASM-PROP-X8',
      name: 'Propulsion Assembly',
      revision: 'C',
      type: 'MANUFACTURED',
      quantity: 1,
      uom: 'EA',
      unitCost: 12400,
      extendedCost: 12400,
      leadTime: 10,
      status: 'ACTIVE',
      hasChildren: true,
      children: [
        {
          id: '1-2-1',
          level: 2,
          itemNumber: '20.10',
          partNumber: 'PRT-MOT-001',
          name: 'Motor U15 II KV100',
          revision: 'B',
          type: 'PURCHASED',
          quantity: 8,
          uom: 'EA',
          unitCost: 385,
          extendedCost: 3080,
          leadTime: 21,
          status: 'LOW_STOCK',
          hasChildren: false,
        },
        {
          id: '1-2-2',
          level: 2,
          itemNumber: '20.20',
          partNumber: 'PRT-ESC-80A',
          name: 'ESC 80A FOC',
          revision: 'A',
          type: 'PURCHASED',
          quantity: 8,
          uom: 'EA',
          unitCost: 120,
          extendedCost: 960,
          leadTime: 14,
          status: 'ACTIVE',
          hasChildren: false,
        },
        {
          id: '1-2-3',
          level: 2,
          itemNumber: '20.30',
          partNumber: 'PRT-PRP-28',
          name: 'Carbon Propeller 28x9.5',
          revision: 'B',
          type: 'PURCHASED',
          quantity: 8,
          uom: 'EA',
          unitCost: 45,
          extendedCost: 360,
          leadTime: 21,
          status: 'ACTIVE',
          hasChildren: false,
        },
      ],
    },
    {
      id: '1-3',
      level: 1,
      itemNumber: '30',
      partNumber: 'ASM-ELEC-X8',
      name: 'Electronics Assembly',
      revision: 'B',
      type: 'MANUFACTURED',
      quantity: 1,
      uom: 'EA',
      unitCost: 8500,
      extendedCost: 8500,
      leadTime: 12,
      status: 'ACTIVE',
      hasChildren: true,
      children: [
        {
          id: '1-3-1',
          level: 2,
          itemNumber: '30.10',
          partNumber: 'PRT-ELC-002',
          name: 'Pixhawk 6X Flight Controller',
          revision: 'A',
          type: 'PURCHASED',
          quantity: 1,
          uom: 'EA',
          unitCost: 589,
          extendedCost: 589,
          leadTime: 14,
          status: 'LOW_STOCK',
          hasChildren: false,
        },
        {
          id: '1-3-2',
          level: 2,
          itemNumber: '30.20',
          partNumber: 'PRT-SEN-GPS',
          name: 'GPS Module RTK F9P',
          revision: 'A',
          type: 'PURCHASED',
          quantity: 2,
          uom: 'EA',
          unitCost: 450,
          extendedCost: 900,
          leadTime: 18,
          status: 'ACTIVE',
          hasChildren: false,
        },
      ],
    },
    {
      id: '1-4',
      level: 1,
      itemNumber: '40',
      partNumber: 'ASM-PWR-X8',
      name: 'Power System Assembly',
      revision: 'B',
      type: 'MANUFACTURED',
      quantity: 1,
      uom: 'EA',
      unitCost: 3200,
      extendedCost: 3200,
      leadTime: 8,
      status: 'ACTIVE',
      hasChildren: true,
      children: [
        {
          id: '1-4-1',
          level: 2,
          itemNumber: '40.10',
          partNumber: 'PRT-BAT-001',
          name: 'Battery LiPo 6S 22000mAh',
          revision: 'C',
          type: 'PURCHASED',
          quantity: 2,
          uom: 'EA',
          unitCost: 285,
          extendedCost: 570,
          leadTime: 30,
          status: 'ACTIVE',
          hasChildren: false,
        },
        {
          id: '1-4-2',
          level: 2,
          itemNumber: '40.20',
          partNumber: 'PRT-PDB-X8',
          name: 'Power Distribution Board X8',
          revision: 'A',
          type: 'PURCHASED',
          quantity: 1,
          uom: 'EA',
          unitCost: 180,
          extendedCost: 180,
          leadTime: 14,
          status: 'ACTIVE',
          hasChildren: false,
        },
      ],
    },
  ],
};

const bomList = [
  { partNumber: 'HERA-X8-PRO', name: 'HERA X8 Professional', revision: 'D', status: 'RELEASED', components: 45, cost: 53500 },
  { partNumber: 'HERA-X8-ENT', name: 'HERA X8 Enterprise', revision: 'C', status: 'RELEASED', components: 52, cost: 68000 },
  { partNumber: 'HERA-X6-AGR', name: 'HERA X6 Agriculture', revision: 'B', status: 'RELEASED', components: 38, cost: 42000 },
  { partNumber: 'HERA-X4-SRV', name: 'HERA X4 Survey', revision: 'B', status: 'RELEASED', components: 32, cost: 35000 },
  { partNumber: 'HERA-X4-IND', name: 'HERA X4 Industrial', revision: 'A', status: 'DRAFT', components: 28, cost: 38500 },
];

// Status config
const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  ACTIVE: { label: 'Active', color: 'text-success-700', bgColor: 'bg-success-100' },
  LOW_STOCK: { label: 'Low Stock', color: 'text-warning-700', bgColor: 'bg-warning-100' },
  OUT_OF_STOCK: { label: 'Out of Stock', color: 'text-danger-700', bgColor: 'bg-danger-100' },
  OBSOLETE: { label: 'Obsolete', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  RELEASED: { label: 'Released', color: 'text-success-700', bgColor: 'bg-success-100' },
  DRAFT: { label: 'Draft', color: 'text-warning-700', bgColor: 'bg-warning-100' },
};

// Badge
const Badge: React.FC<{ children: React.ReactNode; variant?: string }> = ({ children, variant = 'default' }) => {
  const variants: Record<string, string> = {
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-primary-100 text-primary-700',
    success: 'bg-success-100 text-success-700',
    warning: 'bg-warning-100 text-warning-700',
    danger: 'bg-danger-100 text-danger-700',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full', variants[variant])}>
      {children}
    </span>
  );
};

// BOM Tree Node
interface BOMNode {
  id: string;
  level: number;
  itemNumber: string;
  partNumber: string;
  name: string;
  revision: string;
  type: string;
  quantity: number;
  uom: string;
  unitCost: number;
  extendedCost: number;
  leadTime: number;
  status: string;
  hasChildren: boolean;
  children?: BOMNode[];
}

const BOMTreeRow: React.FC<{
  node: BOMNode;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}> = ({ node, expanded, onToggle, onSelect }) => {
  const statusConf = statusConfig[node.status] || statusConfig.ACTIVE;
  const indent = (node.level - 1) * 24;

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={onSelect}>
      <td className="px-4 py-3">
        <div className="flex items-center" style={{ paddingLeft: indent }}>
          {node.hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="p-1 mr-1 hover:bg-slate-200 rounded"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </button>
          )}
          {!node.hasChildren && <span className="w-6" />}
          <span className="text-sm text-slate-500 font-mono mr-3">{node.itemNumber}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {node.type === 'MANUFACTURED' ? (
            <Boxes className="h-4 w-4 text-primary-500" />
          ) : (
            <Box className="h-4 w-4 text-slate-400" />
          )}
          <div>
            <p className="font-mono text-sm text-primary-600">{node.partNumber}</p>
            <p className="text-sm text-slate-600">{node.name}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge>{node.revision}</Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-sm">{node.quantity}</span>
        <span className="text-xs text-slate-500 ml-1">{node.uom}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-sm">{formatCurrency(node.unitCost)}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-sm font-medium">{formatCurrency(node.extendedCost)}</span>
      </td>
      <td className="px-4 py-3">
        <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', statusConf.bgColor, statusConf.color)}>
          {statusConf.label}
        </span>
      </td>
    </tr>
  );
};

// BOM Detail Panel
const BOMDetailPanel: React.FC<{ bom: typeof bomData; onClose: () => void }> = ({ bom, onClose }) => (
  <div className="h-full flex flex-col">
    <div className="px-6 py-4 border-b border-slate-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-sm text-primary-600">{bom.partNumber}</p>
          <h2 className="text-lg font-semibold text-slate-900">{bom.name}</h2>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="primary">Rev {bom.revision}</Badge>
            <Badge variant="success">{bom.status}</Badge>
          </div>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>

    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Cost Summary */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Cost Summary</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500">Material Cost</p>
            <p className="text-lg font-semibold text-slate-900 font-mono">{formatCurrency(bom.unitCost)}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500">Labor Cost</p>
            <p className="text-lg font-semibold text-slate-900 font-mono">{formatCurrency(bom.laborCost)}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500">Overhead</p>
            <p className="text-lg font-semibold text-slate-900 font-mono">{formatCurrency(bom.overheadCost)}</p>
          </div>
          <div className="p-3 bg-primary-50 rounded-lg">
            <p className="text-xs text-primary-600">Total Cost</p>
            <p className="text-lg font-bold text-primary-700 font-mono">{formatCurrency(bom.totalCost)}</p>
          </div>
        </div>
      </div>

      {/* Structure Stats */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">BOM Structure</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Total Components</span>
            <span className="text-slate-900 font-mono">45</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Purchased Parts</span>
            <span className="text-slate-900 font-mono">38</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Manufactured Parts</span>
            <span className="text-slate-900 font-mono">7</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Max Depth</span>
            <span className="text-slate-900 font-mono">4 levels</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Alerts</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-3 bg-warning-50 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-warning-600" />
            <span className="text-sm text-warning-700">2 parts have low stock</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Actions</h3>
        <div className="space-y-2">
          <button className="w-full flex items-center justify-between p-3 text-sm bg-slate-50 rounded-lg hover:bg-slate-100">
            <span className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-slate-400" />
              Cost Rollup
            </span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
          <button className="w-full flex items-center justify-between p-3 text-sm bg-slate-50 rounded-lg hover:bg-slate-100">
            <span className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-slate-400" />
              Where Used
            </span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
          <button className="w-full flex items-center justify-between p-3 text-sm bg-slate-50 rounded-lg hover:bg-slate-100">
            <span className="flex items-center gap-2">
              <Copy className="h-4 w-4 text-slate-400" />
              Copy BOM
            </span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
          <button className="w-full flex items-center justify-between p-3 text-sm bg-slate-50 rounded-lg hover:bg-slate-100">
            <span className="flex items-center gap-2">
              <Download className="h-4 w-4 text-slate-400" />
              Export
            </span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>

    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
      <button className="w-full px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2">
        <Edit className="h-4 w-4" />
        Edit BOM
      </button>
    </div>
  </div>
);

// Main BOM Page
const BOMPage: React.FC = () => {
  const [selectedBOM, setSelectedBOM] = useState<typeof bomData | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['1-1', '1-2', '1-3', '1-4']));
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('tree');

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const renderTree = (nodes: BOMNode[]) => {
    const rows: React.ReactNode[] = [];
    
    const addNodes = (items: BOMNode[]) => {
      items.forEach((node) => {
        rows.push(
          <BOMTreeRow
            key={node.id}
            node={node}
            expanded={expandedNodes.has(node.id)}
            onToggle={() => toggleNode(node.id)}
            onSelect={() => setSelectedBOM(bomData)}
          />
        );
        if (node.children && expandedNodes.has(node.id)) {
          addNodes(node.children);
        }
      });
    };
    
    addNodes(nodes);
    return rows;
  };

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
                  <li className="text-slate-700 font-medium">Bill of Materials</li>
                </ol>
              </nav>
              <h1 className="text-2xl font-bold text-slate-900">Bill of Materials</h1>
              <p className="text-sm text-slate-500 mt-1">Manage product structure and cost rollup</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create BOM
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* BOM Selector */}
        <div className="bg-white rounded-xl border border-slate-200 mb-6">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search BOMs..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                <option>All Status</option>
                <option>Released</option>
                <option>Draft</option>
              </select>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {bomList.map((bom) => (
              <button
                key={bom.partNumber}
                onClick={() => setSelectedBOM(bomData)}
                className={cn(
                  'w-full flex items-center justify-between p-4 text-left hover:bg-slate-50',
                  selectedBOM && 'bg-primary-50'
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Layers className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-semibold text-primary-600">{bom.partNumber}</p>
                    <p className="text-sm text-slate-600">{bom.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Components</p>
                    <p className="text-sm font-mono">{bom.components}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Total Cost</p>
                    <p className="text-sm font-mono font-semibold">{formatCurrency(bom.cost)}</p>
                  </div>
                  <Badge variant={bom.status === 'RELEASED' ? 'success' : 'warning'}>
                    {bom.status}
                  </Badge>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* BOM Tree */}
        {selectedBOM && (
          <div className="flex gap-6">
            <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Layers className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="font-semibold text-slate-900">{bomData.name}</p>
                    <p className="text-xs text-slate-500">{bomData.partNumber} Rev {bomData.revision}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedNodes(new Set(bomData.components.map(c => c.id)))}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={() => setExpandedNodes(new Set())}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Collapse All
                  </button>
                </div>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-32">Item #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Part</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-20">Rev</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase w-24">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase w-28">Unit Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase w-28">Extended</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-28">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {renderTree(bomData.components)}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                      Total Material Cost:
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-slate-900 font-mono">
                      {formatCurrency(bomData.unitCost)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Detail Panel */}
            <div className="w-80 bg-white rounded-xl border border-slate-200 overflow-hidden flex-shrink-0">
              <BOMDetailPanel bom={bomData} onClose={() => setSelectedBOM(null)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BOMPage;
