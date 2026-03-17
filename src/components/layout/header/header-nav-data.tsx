// =============================================================================
// NAVIGATION DATA
// =============================================================================

import React from 'react';
import {
  Plus,
  Package,
  ShoppingCart,
  Factory,
  Truck,
  ClipboardCheck,
  BarChart3,
  Calculator,
  Layers,
  Activity,
  FileText,
  Users,
  Wrench,
  AlertTriangle,
  Sparkles,
  Target,
  Clock,
  Zap,
  Box,
  TrendingUp,
  PieChart,
  Gauge,
  Shield,
  Cog,
  Building2,
  Download,
  X,
  CalendarDays,
  DollarSign,
  Receipt,
  PauseCircle,
  Trash2,
  FileUp,
  LayoutGrid,
} from 'lucide-react';
import { NavTab, MegaMenuItem } from './header-types';

export const navigationTabs: NavTab[] = [
  {
    id: 'operations',
    labelKey: 'header.operationsTab',
    icon: <Zap className="w-4 h-4" />,
    sections: [
      {
        titleKey: 'header.salesAndOrders',
        items: [
          { id: 'sales', labelKey: 'header.salesOrders', descriptionKey: 'header.desc.salesOrders', icon: <ShoppingCart className="w-5 h-5" />, href: '/sales', color: 'text-violet-600 bg-violet-50' },
          { id: 'customers', labelKey: 'header.customers', descriptionKey: 'header.desc.customers', icon: <Users className="w-5 h-5" />, href: '/customers', color: 'text-blue-600 bg-blue-50' },
          { id: 'quotes', labelKey: 'header.quotations', descriptionKey: 'header.desc.quotations', icon: <FileText className="w-5 h-5" />, href: '/sales/quotations', color: 'text-indigo-600 bg-indigo-50' },
          { id: 'pricing-rules', labelKey: 'header.pricingRules', descriptionKey: 'header.desc.pricingRules', icon: <DollarSign className="w-5 h-5" />, href: '/sales/pricing-rules', color: 'text-green-600 bg-green-50' },
        ]
      },
      {
        titleKey: 'header.inventorySection',
        items: [
          { id: 'inventory', labelKey: 'header.inventoryItem', descriptionKey: 'header.desc.inventory', icon: <Package className="w-5 h-5" />, href: '/inventory', color: 'text-emerald-600 bg-emerald-50' },
          { id: 'parts', labelKey: 'header.partsMaster', descriptionKey: 'header.desc.partsMaster', icon: <Box className="w-5 h-5" />, href: '/parts', color: 'text-teal-600 bg-teal-50' },
          { id: 'bom', labelKey: 'header.billOfMaterials', descriptionKey: 'header.desc.bom', icon: <Layers className="w-5 h-5" />, href: '/bom', color: 'text-cyan-600 bg-cyan-50' },
          { id: 'smart-import', labelKey: 'header.smartImport', descriptionKey: 'header.desc.smartImport', icon: <FileUp className="w-5 h-5" />, href: '/import/smart', color: 'text-purple-600 bg-purple-50', isNew: true },
        ]
      },
      {
        titleKey: 'header.purchasingSection',
        items: [
          { id: 'purchasing', labelKey: 'header.purchaseOrders', descriptionKey: 'header.desc.purchaseOrders', icon: <Truck className="w-5 h-5" />, href: '/purchasing', color: 'text-orange-600 bg-orange-50' },
          { id: 'suppliers', labelKey: 'header.suppliers', descriptionKey: 'header.desc.suppliers', icon: <Building2 className="w-5 h-5" />, href: '/suppliers', color: 'text-amber-600 bg-amber-50' },
          { id: 'receiving', labelKey: 'header.receiving', descriptionKey: 'header.desc.receiving', icon: <Download className="w-5 h-5" />, href: '/quality/receiving', color: 'text-lime-600 bg-lime-50' },
          { id: 'supplier-eval', labelKey: 'header.supplierEvaluation', descriptionKey: 'header.desc.supplierEvaluation', icon: <Target className="w-5 h-5" />, href: '/suppliers/evaluation', color: 'text-rose-600 bg-rose-50' },
        ]
      },
    ],
    quickActions: [
      { id: 'new-so', labelKey: 'header.newSalesOrder', icon: <Plus className="w-4 h-4" />, href: '/sales', color: 'text-violet-600 bg-violet-100' },
      { id: 'new-po', labelKey: 'header.newPurchaseOrder', icon: <Plus className="w-4 h-4" />, href: '/purchasing', color: 'text-orange-600 bg-orange-100' },
    ]
  },
  {
    id: 'production',
    labelKey: 'header.productionTab',
    icon: <Factory className="w-4 h-4" />,
    sections: [
      {
        titleKey: 'header.manufacturing',
        items: [
          { id: 'work-orders', labelKey: 'header.workOrders', descriptionKey: 'header.desc.workOrders', icon: <Factory className="w-5 h-5" />, href: '/production', color: 'text-orange-600 bg-orange-50' },
          { id: 'scheduling', labelKey: 'header.scheduling', descriptionKey: 'header.desc.scheduling', icon: <CalendarDays className="w-5 h-5" />, href: '/production/schedule', color: 'text-blue-600 bg-blue-50' },
          { id: 'shop-floor', labelKey: 'header.shopFloor', descriptionKey: 'header.desc.shopFloor', icon: <Activity className="w-5 h-5" />, href: '/production/shop-floor', color: 'text-emerald-600 bg-emerald-50', isNew: true },
        ]
      },
      {
        titleKey: 'header.planning',
        items: [
          { id: 'mrp', labelKey: 'header.mrpPlanning', descriptionKey: 'header.desc.mrp', icon: <Calculator className="w-5 h-5" />, href: '/mrp', color: 'text-purple-600 bg-purple-50' },
          { id: 'capacity', labelKey: 'header.capacityPlanning', descriptionKey: 'header.desc.capacity', icon: <Gauge className="w-5 h-5" />, href: '/production/capacity', color: 'text-indigo-600 bg-indigo-50' },
          { id: 'resource', labelKey: 'header.resourcePlanning', descriptionKey: 'header.desc.resource', icon: <Target className="w-5 h-5" />, href: '/mrp/planning', color: 'text-pink-600 bg-pink-50' },
        ]
      },
      {
        titleKey: 'header.resources',
        items: [
          { id: 'workcenters', labelKey: 'header.workCenters', descriptionKey: 'header.desc.workCenters', icon: <Cog className="w-5 h-5" />, href: '/production/work-centers', color: 'text-slate-600 bg-slate-50' },
          { id: 'equipment', labelKey: 'header.equipment', descriptionKey: 'header.desc.equipment', icon: <Wrench className="w-5 h-5" />, href: '/production/equipment', color: 'text-gray-600 bg-gray-50' },
          { id: 'workforce', labelKey: 'header.workforce', descriptionKey: 'header.desc.workforce', icon: <Users className="w-5 h-5" />, href: '/production/capacity', color: 'text-sky-600 bg-sky-50' },
        ]
      },
    ],
    quickActions: [
      { id: 'new-wo', labelKey: 'header.newWorkOrder', icon: <Plus className="w-4 h-4" />, href: '/production', color: 'text-orange-600 bg-orange-100' },
      { id: 'run-mrp', labelKey: 'header.runMRP', icon: <Zap className="w-4 h-4" />, href: '/mrp', color: 'text-purple-600 bg-purple-100' },
    ]
  },
  {
    id: 'quality',
    labelKey: 'header.qualityTab',
    icon: <Shield className="w-4 h-4" />,
    sections: [
      {
        titleKey: 'header.qualityControl',
        items: [
          { id: 'quality', labelKey: 'header.qualityRecords', descriptionKey: 'header.desc.quality', icon: <ClipboardCheck className="w-5 h-5" />, href: '/quality', color: 'text-teal-600 bg-teal-50' },
          { id: 'spc', labelKey: 'header.spcCharts', descriptionKey: 'header.desc.spc', icon: <BarChart3 className="w-5 h-5" />, href: '/quality/spc', color: 'text-blue-600 bg-blue-50' },
          { id: 'capability', labelKey: 'header.processCapability', descriptionKey: 'header.desc.capability', icon: <Target className="w-5 h-5" />, href: '/quality/capability', color: 'text-indigo-600 bg-indigo-50' },
        ]
      },
      {
        titleKey: 'header.performance',
        items: [
          { id: 'oee', labelKey: 'header.oeeDashboard', descriptionKey: 'header.desc.oee', icon: <Activity className="w-5 h-5" />, href: '/production/oee', color: 'text-emerald-600 bg-emerald-50', badge: 'Live' },
          { id: 'downtime', labelKey: 'header.downtimeTracking', descriptionKey: 'header.desc.downtime', icon: <Clock className="w-5 h-5" />, href: '/production/oee', color: 'text-red-600 bg-red-50' },
          { id: 'maintenance', labelKey: 'header.maintenance', descriptionKey: 'header.desc.maintenance', icon: <Wrench className="w-5 h-5" />, href: '/production/routing', color: 'text-amber-600 bg-amber-50' },
        ]
      },
      {
        titleKey: 'header.alertsAndActions',
        items: [
          { id: 'alerts', labelKey: 'header.alertCenter', descriptionKey: 'header.desc.alerts', icon: <AlertTriangle className="w-5 h-5" />, href: '/alerts', color: 'text-orange-600 bg-orange-50' },
          { id: 'nc', labelKey: 'header.nonConformance', descriptionKey: 'header.desc.nc', icon: <X className="w-5 h-5" />, href: '/quality/ncr', color: 'text-red-600 bg-red-50' },
          { id: 'hold', labelKey: 'header.holdInventory', descriptionKey: 'header.desc.hold', icon: <PauseCircle className="w-5 h-5" />, href: '/quality/hold', color: 'text-amber-600 bg-amber-50' },
          { id: 'scrap', labelKey: 'header.scrapInventory', descriptionKey: 'header.desc.scrap', icon: <Trash2 className="w-5 h-5" />, href: '/quality/scrap', color: 'text-red-600 bg-red-50' },
        ]
      },
    ],
  },
  {
    id: 'analytics',
    labelKey: 'header.analyticsTab',
    icon: <PieChart className="w-4 h-4" />,
    sections: [
      {
        titleKey: 'header.dashboards',
        items: [
          { id: 'overview', labelKey: 'header.overview', descriptionKey: 'header.desc.overview', icon: <LayoutGrid className="w-5 h-5" />, href: '/home', color: 'text-blue-600 bg-blue-50' },
          { id: 'analytics', labelKey: 'header.analyticsItem', descriptionKey: 'header.desc.analytics', icon: <TrendingUp className="w-5 h-5" />, href: '/analytics', color: 'text-violet-600 bg-violet-50' },
          { id: 'realtime', labelKey: 'header.realtime', descriptionKey: 'header.desc.realtime', icon: <Activity className="w-5 h-5" />, href: '/analytics', color: 'text-emerald-600 bg-emerald-50', isNew: true },
        ]
      },
      {
        titleKey: 'header.reportsSection',
        items: [
          { id: 'reports', labelKey: 'header.reports', descriptionKey: 'header.desc.reports', icon: <FileText className="w-5 h-5" />, href: '/reports', color: 'text-slate-600 bg-slate-50' },
          { id: 'ai-insights', labelKey: 'header.aiInsights', descriptionKey: 'header.desc.aiInsights', icon: <Sparkles className="w-5 h-5" />, href: '/ai-insights', color: 'text-purple-600 bg-purple-50', isNew: true },
        ]
      },
      {
        titleKey: 'header.financeSection',
        items: [
          { id: 'costing', labelKey: 'header.costing', descriptionKey: 'header.desc.costing', icon: <DollarSign className="w-5 h-5" />, href: '/finance/costing', color: 'text-green-600 bg-green-50' },
          { id: 'invoicing', labelKey: 'header.invoicing', descriptionKey: 'header.desc.invoicing', icon: <Receipt className="w-5 h-5" />, href: '/finance/invoicing', color: 'text-amber-600 bg-amber-50' },
        ]
      },
    ],
  },
];

// Quick Create menu items
export const quickCreateItems: MegaMenuItem[] = [
  { id: 'new-so', labelKey: 'header.salesOrder', icon: <ShoppingCart className="w-4 h-4" />, href: '/sales', color: 'text-violet-600' },
  { id: 'new-po', labelKey: 'header.purchaseOrder', icon: <Truck className="w-4 h-4" />, href: '/purchasing', color: 'text-orange-600' },
  { id: 'new-wo', labelKey: 'header.workOrder', icon: <Factory className="w-4 h-4" />, href: '/production', color: 'text-blue-600' },
  { id: 'new-part', labelKey: 'header.newPart', icon: <Box className="w-4 h-4" />, href: '/parts', color: 'text-emerald-600' },
  { id: 'new-quality', labelKey: 'header.qualityRecord', icon: <ClipboardCheck className="w-4 h-4" />, href: '/quality', color: 'text-teal-600' },
];
