'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Package,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  Leaf,
  Globe,
  Factory,
  Box,
  Ruler,
  Clock,
  ShoppingCart,
  Warehouse,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { ActionDropdown, ActionDropdownItem } from '@/components/ui/action-dropdown';
import { Part } from '@/components/forms/part-form';
import dynamic from 'next/dynamic';

const PartFormDialog = dynamic(
  () => import('@/components/parts/part-form-dialog').then(m => ({ default: m.PartFormDialog })),
  { ssr: false, loading: () => null }
);
const DeletePartDialog = dynamic(
  () => import('@/components/forms/part-form').then(m => ({ default: m.DeletePartDialog })),
  { ssr: false, loading: () => null }
);
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDataExport } from '@/hooks/use-data-export';

// Lazy-load ImportWizard (~858 lines, imports xlsx library) - only needed when import dialog opens
const ImportWizard = dynamic(
  () => import('@/components/excel/import-wizard').then(mod => mod.ImportWizard),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted h-96 rounded-lg" />,
  }
);
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { EntityTooltip } from '@/components/entity-tooltip';
import { useLanguage } from '@/lib/i18n/language-context';
import { DataTable, Column } from '@/components/ui-v2/data-table';
import { useApiData } from '@/hooks/use-api-data';
import { CompactStatsBar } from '@/components/ui/compact-stats-bar';

// =============================================================================
// TYPES
// =============================================================================

/** Raw part data from API with nested relations */
interface PartApiResponse extends Partial<Part> {
  id: string;
  partNumber: string;
  name: string;
  category: string;
  unit: string;
  costs?: { unitCost?: number };
  planning?: {
    makeOrBuy?: string;
    leadTimeDays?: number;
    moq?: number;
    orderMultiple?: number;
    minStockLevel?: number;
    reorderPoint?: number;
    safetyStock?: number;
    maxStock?: number | null;
  };
  specs?: {
    weightKg?: number | null;
    lengthMm?: number | null;
    widthMm?: number | null;
    heightMm?: number | null;
    material?: string;
    color?: string;
    manufacturer?: string;
    manufacturerPn?: string;
    drawingNumber?: string;
  };
  compliance?: {
    countryOfOrigin?: string;
    ndaaCompliant?: boolean;
    itarControlled?: boolean;
    rohsCompliant?: boolean;
    reachCompliant?: boolean;
  };
  partSuppliers?: Array<{
    isPreferred?: boolean;
    supplier?: { name?: string };
  }>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const LIFECYCLE_COLORS: Record<string, string> = {
  DEVELOPMENT: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  PROTOTYPE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  PHASE_OUT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  OBSOLETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  EOL: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

const MAKE_BUY_COLORS: Record<string, string> = {
  MAKE: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  BUY: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  BOTH: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
};

function formatCurrency(amount: number | null | undefined) {
  if (amount == null || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatNumber(value: number | null | undefined, decimals = 0) {
  if (value == null || isNaN(value)) return '-';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatDate(date: string | Date | null | undefined) {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDimensions(length: number | null, width: number | null, height: number | null) {
  if (!length && !width && !height) return '-';
  return `${length || 0} × ${width || 0} × ${height || 0} mm`;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PartsTable() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [deletingPart, setDeletingPart] = useState<Part | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Inline editing state
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [editingCostValue, setEditingCostValue] = useState<string>('');

  // Filters
  const [filters, setFilters] = useState<Record<string, string>>({
    category: 'all',
    lifecycle: 'all',
    makeOrBuy: 'all',
  });

  // Transform: flatten nested relations (planning, costs, specs, compliance) for display
  const transformParts = useCallback((raw: { data?: PartApiResponse[] | { data?: PartApiResponse[] } }): Part[] => {
    const rawData = raw.data;
    const partsArray = Array.isArray(rawData) ? rawData : ((rawData as { data?: PartApiResponse[] })?.data || []);
    return partsArray.map((p: PartApiResponse): Part => ({
      id: p.id,
      partNumber: p.partNumber,
      name: p.name,
      description: p.description ?? null,
      category: p.category,
      unit: p.unit,
      revision: p.revision ?? 'A',
      revisionDate: p.revisionDate ?? null,
      unitCost: p.costs?.unitCost ?? p.unitCost ?? 0,
      isCritical: p.isCritical ?? false,
      makeOrBuy: p.planning?.makeOrBuy ?? p.makeOrBuy ?? 'BUY',
      lifecycleStatus: p.lifecycleStatus ?? 'ACTIVE',
      weightKg: p.specs?.weightKg ?? p.weightKg ?? null,
      lengthMm: p.specs?.lengthMm ?? p.lengthMm ?? null,
      widthMm: p.specs?.widthMm ?? p.widthMm ?? null,
      heightMm: p.specs?.heightMm ?? p.heightMm ?? null,
      material: p.specs?.material ?? p.material ?? '',
      color: p.specs?.color ?? p.color ?? '',
      manufacturer: p.specs?.manufacturer ?? p.manufacturer ?? '',
      manufacturerPn: p.specs?.manufacturerPn ?? p.manufacturerPn ?? '',
      drawingNumber: p.specs?.drawingNumber ?? p.drawingNumber ?? '',
      leadTimeDays: p.planning?.leadTimeDays ?? p.leadTimeDays ?? 0,
      moq: p.planning?.moq ?? p.moq ?? 1,
      orderMultiple: p.planning?.orderMultiple ?? p.orderMultiple ?? 1,
      minStockLevel: p.planning?.minStockLevel ?? p.minStockLevel ?? 0,
      reorderPoint: p.planning?.reorderPoint ?? p.reorderPoint ?? 0,
      safetyStock: p.planning?.safetyStock ?? p.safetyStock ?? 0,
      maxStock: p.planning?.maxStock ?? null,
      countryOfOrigin: p.compliance?.countryOfOrigin ?? p.countryOfOrigin ?? '',
      ndaaCompliant: p.compliance?.ndaaCompliant ?? p.ndaaCompliant ?? false,
      itarControlled: p.compliance?.itarControlled ?? p.itarControlled ?? false,
      rohsCompliant: p.compliance?.rohsCompliant ?? p.rohsCompliant ?? false,
      reachCompliant: p.compliance?.reachCompliant ?? p.reachCompliant ?? false,
    }));
  }, []);

  // SWR-based data fetching with debounced search
  const { data: parts, loading, refresh } = useApiData<Part>(
    '/api/parts',
    {
      search,
      category: filters.category,
      lifecycleStatus: filters.lifecycle,
      makeOrBuy: filters.makeOrBuy,
      includeRelations: 'true',
    },
    { debounce: search ? 300 : 0, transform: transformParts }
  );

  const filteredParts = parts;

  // Handlers
  const handleAdd = () => {
    setEditingPart(null);
    setFormOpen(true);
  };

  const handleEdit = (part: Part) => {
    setEditingPart(part);
    setFormOpen(true);
  };

  const handleDelete = (part: Part) => {
    setDeletingPart(part);
    setDeleteOpen(true);
  };

  const handleFormSuccess = () => {
    refresh();
  };

  const handleDeleteSuccess = () => {
    refresh();
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(t('table.bulkDeleteConfirm', { count: String(selectedIds.size), itemType: t('parts.pageTitle') }))) {
      return;
    }

    try {
      const idsToDelete = Array.from(selectedIds);
      setSelectedIds(new Set());
      toast.info(t('table.bulkDeleting', { count: String(idsToDelete.length), itemType: t('parts.pageTitle') }));

      const results = await Promise.all(
        idsToDelete.map((id) =>
          fetch(`/api/parts/${id}`, { method: 'DELETE' })
        )
      );

      const failedCount = results.filter((r) => !r.ok).length;
      if (failedCount > 0) {
        toast.error(t('table.bulkDeleteError', { count: String(failedCount), itemType: t('parts.pageTitle') }));
      } else {
        toast.success(t('table.bulkDeleteSuccess', { count: String(idsToDelete.length), itemType: t('parts.pageTitle') }));
      }
      refresh();
    } catch (error) {
      toast.error(t('table.deleteError'));
      refresh();
    }
  };

  const { exportToExcel } = useDataExport();

  // Inline Edit Handlers
  const startEditingCost = (part: Part) => {
    setEditingCostId(part.id);
    setEditingCostValue(String(part.unitCost));
  };

  const saveCost = async (part: Part) => {
    if (!editingCostId) return;

    try {
      const newCost = parseFloat(editingCostValue);
      if (isNaN(newCost)) {
        toast.error(t('parts.invalidValue'));
        return;
      }

      const res = await fetch(`/api/parts/${part.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitCost: newCost }),
      });

      if (!res.ok) throw new Error('Failed to update');

      toast.success(t('parts.costUpdated'));
      setEditingCostId(null);
      refresh();
    } catch (error) {
      toast.error(t('parts.costUpdateFailed'));
      refresh();
    }
  };

  const handleCostKeyDown = (e: React.KeyboardEvent, part: Part) => {
    if (e.key === 'Enter') {
      saveCost(part);
    } else if (e.key === 'Escape') {
      setEditingCostId(null);
    }
  };

  const handleExport = () => {
    if (!parts || parts.length === 0) {
      toast.warning(t('table.noDataToExport'));
      return;
    }

    // Flatten nested relations (planning, costs, specs, compliance, suppliers) for export
    const flattenedParts = parts.map((p: Part & Partial<PartApiResponse>) => {
      // Get primary and secondary suppliers
      const primarySupplier = p.partSuppliers?.find((ps) => ps.isPreferred)?.supplier;
      const secondarySuppliers = p.partSuppliers
        ?.filter((ps) => !ps.isPreferred)
        ?.map((ps) => ps.supplier?.name)
        ?.filter(Boolean)
        ?.join(', ') || '';

      return {
        partNumber: p.partNumber,
        name: p.name,
        description: p.description,
        category: p.category,
        unit: p.unit,
        unitCost: p.costs?.unitCost ?? p.unitCost ?? 0,
        makeOrBuy: p.planning?.makeOrBuy ?? p.makeOrBuy ?? 'BUY',
        primarySupplier: primarySupplier?.name ?? '',
        secondarySuppliers: secondarySuppliers,
        leadTimeDays: p.planning?.leadTimeDays ?? p.leadTimeDays ?? 0,
        moq: p.planning?.moq ?? p.moq ?? 1,
        orderMultiple: p.planning?.orderMultiple ?? p.orderMultiple ?? 1,
        minStockLevel: p.planning?.minStockLevel ?? p.minStockLevel ?? 0,
        maxStock: p.planning?.maxStock ?? null,
        safetyStock: p.planning?.safetyStock ?? p.safetyStock ?? 0,
        reorderPoint: p.planning?.reorderPoint ?? p.reorderPoint ?? 0,
        weightKg: p.specs?.weightKg ?? p.weightKg ?? null,
        lengthMm: p.specs?.lengthMm ?? p.lengthMm ?? null,
        widthMm: p.specs?.widthMm ?? p.widthMm ?? null,
        heightMm: p.specs?.heightMm ?? p.heightMm ?? null,
        material: p.specs?.material ?? p.material ?? '',
        color: p.specs?.color ?? p.color ?? '',
        manufacturer: p.specs?.manufacturer ?? p.manufacturer ?? '',
        manufacturerPn: p.specs?.manufacturerPn ?? p.manufacturerPn ?? '',
        drawingNumber: p.specs?.drawingNumber ?? p.drawingNumber ?? '',
        countryOfOrigin: p.compliance?.countryOfOrigin ?? p.countryOfOrigin ?? '',
        ndaaCompliant: p.compliance?.ndaaCompliant ?? p.ndaaCompliant ?? true,
        itarControlled: p.compliance?.itarControlled ?? p.itarControlled ?? false,
        rohsCompliant: p.compliance?.rohsCompliant ?? p.rohsCompliant ?? true,
        reachCompliant: p.compliance?.reachCompliant ?? p.reachCompliant ?? true,
        lifecycleStatus: p.lifecycleStatus ?? 'ACTIVE',
        revision: p.revision ?? 'A',
        isCritical: p.isCritical ?? false,
      };
    });

    exportToExcel(flattenedParts, {
      fileName: 'Parts_List',
      sheetName: 'Parts Master'
    });

    toast.success(t('success.exported'));
  };

  const handleImport = () => {
    setImportDialogOpen(true);
  };

  const handleImportSuccess = () => {
    setImportDialogOpen(false);
    refresh();
    toast.success(t('parts.importSuccess'));
  };

  // Get unique categories
  const categories = Array.from(new Set(parts.map((p) => p.category))).sort();

  // Create action items for each row
  const createPartActions = (part: Part): ActionDropdownItem[] => [
    {
      label: t('table.viewDetails'),
      href: `/parts/${part.id}`,
    },
    {
      label: t('common.edit'),
      onClick: () => handleEdit(part),
      permission: 'orders:edit',
    },
    {
      label: t('common.delete'),
      onClick: () => handleDelete(part),
      permission: 'orders:delete',
      variant: 'destructive',
    },
  ];

  // Column definitions for DataTable - FULL SONG ÁNH với Form
  const columns: Column<Part>[] = useMemo(() => [
    // ===== TAB CƠ BẢN (Basic) =====
    {
      key: 'partNumber',
      header: t('parts.partNumber'),
      width: '130px',
      sortable: true,
      sticky: 'left',
      render: (value, row) => (
        <div className="flex items-center gap-1">
          <EntityTooltip type="part" id={row.id}>
            <Link href={`/parts/${row.id}`} className="font-mono font-medium text-primary hover:underline cursor-help">
              {value}
            </Link>
          </EntityTooltip>
          {row.isCritical && <AlertTriangle className="h-3 w-3 text-orange-500" />}
        </div>
      ),
    },
    {
      key: 'name',
      header: t('parts.partName'),
      width: '180px',
      sortable: true,
      render: (value) => <div className="truncate max-w-[160px]">{value || '-'}</div>,
    },
    {
      key: 'description',
      header: t('parts.descriptionCol'),
      width: '200px',
      hidden: true,
      render: (value) => <div className="truncate max-w-[180px] text-muted-foreground">{value || '-'}</div>,
    },
    {
      key: 'category',
      header: t('column.category'),
      width: '100px',
      sortable: true,
      cellClassName: (value) => value ? 'bg-slate-50 dark:bg-slate-900/30' : '',
      render: (value) => value || '-',
    },
    {
      key: 'unit',
      header: t('column.unit'),
      width: '70px',
      render: (value) => <span className="text-xs">{value || 'EA'}</span>,
    },
    {
      key: 'unitCost',
      header: t('column.unitCost'),
      width: '100px',
      type: 'currency',
      sortable: true,
      render: (value, row) => (
        editingCostId === row.id ? (
          <Input
            autoFocus
            className="h-6 w-20 text-right text-xs"
            value={editingCostValue}
            onChange={(e) => setEditingCostValue(e.target.value)}
            onBlur={() => saveCost(row)}
            onKeyDown={(e) => handleCostKeyDown(e, row)}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="cursor-pointer hover:text-primary font-mono"
            onClick={(e) => { e.stopPropagation(); startEditingCost(row); }}
          >
            {formatCurrency(value)}
          </span>
        )
      ),
    },
    {
      key: 'isCritical',
      header: t('parts.critical'),
      width: '90px',
      cellClassName: (value) => value ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' : '',
      render: (value) => value ? 'Critical' : <span className="text-muted-foreground">-</span>,
    },

    // ===== TAB VẬT LÝ (Physical) =====
    {
      key: 'weightKg',
      header: t('parts.weight'),
      width: '90px',
      hidden: true,
      render: (value) => value ? `${formatNumber(value, 3)} kg` : '-',
    },
    {
      key: 'dimensions',
      header: t('parts.dimensions'),
      width: '140px',
      hidden: true,
      render: (_, row) => formatDimensions(row.lengthMm ?? null, row.widthMm ?? null, row.heightMm ?? null),
    },
    {
      key: 'material',
      header: t('parts.material'),
      width: '100px',
      hidden: true,
      render: (value) => <span className="truncate">{value || '-'}</span>,
    },
    {
      key: 'color',
      header: t('parts.color'),
      width: '80px',
      hidden: true,
      render: (value) => value || '-',
    },

    // ===== TAB KỸ THUẬT (Engineering) =====
    {
      key: 'makeOrBuy',
      header: t('parts.makeOrBuyFilter'),
      width: '85px',
      sortable: true,
      cellClassName: (value) => {
        const map: Record<string, string> = {
          MAKE: 'bg-indigo-100 dark:bg-indigo-900/30',
          BUY: 'bg-orange-100 dark:bg-orange-900/30',
          BOTH: 'bg-teal-100 dark:bg-teal-900/30',
        };
        return map[value] || '';
      },
      render: (value) => <span className="text-xs font-medium">{value || 'BUY'}</span>,
    },
    {
      key: 'revision',
      header: t('parts.revision'),
      width: '55px',
      cellClassName: () => 'bg-slate-50 dark:bg-slate-900/30',
      render: (value) => value || 'A',
    },
    {
      key: 'revisionDate',
      header: t('parts.revisionDate'),
      width: '100px',
      hidden: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'drawingNumber',
      header: t('parts.drawingNumber'),
      width: '120px',
      hidden: true,
      render: (value) => <span className="font-mono text-xs">{value || '-'}</span>,
    },
    {
      key: 'manufacturer',
      header: t('parts.manufacturer'),
      width: '120px',
      hidden: true,
      render: (value) => <span className="truncate">{value || '-'}</span>,
    },
    {
      key: 'manufacturerPn',
      header: t('parts.mpn'),
      width: '120px',
      hidden: true,
      render: (value) => <span className="font-mono text-xs">{value || '-'}</span>,
    },
    {
      key: 'lifecycleStatus',
      header: t('column.status'),
      width: '100px',
      sortable: true,
      cellClassName: (value) => {
        const map: Record<string, string> = {
          DEVELOPMENT: 'bg-purple-100 dark:bg-purple-900/30',
          PROTOTYPE: 'bg-blue-100 dark:bg-blue-900/30',
          ACTIVE: 'bg-green-100 dark:bg-green-900/30',
          PHASE_OUT: 'bg-yellow-100 dark:bg-yellow-900/30',
          OBSOLETE: 'bg-red-100 dark:bg-red-900/30',
          EOL: 'bg-gray-100 dark:bg-gray-800',
        };
        return map[value] || '';
      },
      render: (value) => <span className="text-xs font-medium">{value || 'ACTIVE'}</span>,
    },

    // ===== TAB MUA HÀNG (Procurement) =====
    {
      key: 'leadTimeDays',
      header: t('parts.leadTime'),
      width: '85px',
      sortable: true,
      render: (value) => value ? (
        <span className="font-mono">{value} <span className="text-muted-foreground text-[10px]">{t('parts.daysUnit')}</span></span>
      ) : '-',
    },
    {
      key: 'moq',
      header: t('parts.moq'),
      width: '70px',
      render: (value) => <span className="font-mono">{formatNumber(value) || '-'}</span>,
    },
    {
      key: 'orderMultiple',
      header: t('parts.orderMultiple'),
      width: '80px',
      hidden: true,
      render: (value) => <span className="font-mono">{formatNumber(value) || '-'}</span>,
    },
    {
      key: 'minStockLevel',
      header: 'Min Stock',
      width: '85px',
      render: (value) => <span className="font-mono">{formatNumber(value) || '0'}</span>,
    },
    {
      key: 'reorderPoint',
      header: 'ROP',
      width: '70px',
      render: (value) => <span className="font-mono">{formatNumber(value) || '0'}</span>,
    },
    {
      key: 'safetyStock',
      header: 'Safety Stock',
      width: '90px',
      hidden: true,
      render: (value) => <span className="font-mono">{formatNumber(value) || '0'}</span>,
    },
    {
      key: 'maxStock',
      header: 'Max Stock',
      width: '85px',
      hidden: true,
      render: (value) => <span className="font-mono">{value ? formatNumber(value) : '-'}</span>,
    },

    // ===== TAB TUÂN THỦ (Compliance) =====
    {
      key: 'countryOfOrigin',
      header: t('parts.origin'),
      width: '100px',
      hidden: true,
      render: (value) => (
        <div className="flex items-center gap-1">
          <Globe className="h-3 w-3 text-muted-foreground" />
          <span className="truncate">{value || '-'}</span>
        </div>
      ),
    },
    {
      key: 'ndaaCompliant',
      header: 'NDAA',
      width: '65px',
      render: (value) => value ? (
        <CheckCircle className="h-4 w-4 text-green-500 " />
      ) : (
        <XCircle className="h-4 w-4 text-red-500 " />
      ),
    },
    {
      key: 'itarControlled',
      header: 'ITAR',
      width: '65px',
      render: (value) => value ? (
        <Shield className="h-4 w-4 text-red-500 " />
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
    },
    {
      key: 'rohsCompliant',
      header: 'RoHS',
      width: '65px',
      render: (value) => value ? (
        <Leaf className="h-4 w-4 text-green-500 " />
      ) : (
        <XCircle className="h-4 w-4 text-yellow-500 " />
      ),
    },
    {
      key: 'reachCompliant',
      header: 'REACH',
      width: '70px',
      hidden: true,
      render: (value) => value ? (
        <CheckCircle className="h-4 w-4 text-green-500 " />
      ) : (
        <XCircle className="h-4 w-4 text-yellow-500 " />
      ),
    },

    // ===== SYSTEM FIELDS =====
    {
      key: 'createdAt',
      header: t('parts.createdAt'),
      width: '100px',
      hidden: true,
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'updatedAt',
      header: t('parts.updatedAt'),
      width: '100px',
      hidden: true,
      sortable: true,
      render: (value) => formatDate(value),
    },

    // ===== ACTIONS =====
    {
      key: 'actions',
      header: '',
      width: '50px',
      sticky: 'right',
      render: (_, row) => <ActionDropdown items={createPartActions(row)} />,
    },
  ], [editingCostId, editingCostValue, t]);

  return (
    <TooltipProvider>
      {/* Fill viewport: flex column with overflow containment */}
      <div className="h-full flex flex-col gap-2">
        {/* Header - COMPACT */}
        <div>
          <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary flex items-center gap-1.5">
            <Package className="h-4 w-4" />
            {t('parts.pageTitle')}
          </h1>
          <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">
            {t('parts.pageDesc')}
          </p>
        </div>

        {/* Stats - CompactStatsBar */}
        <CompactStatsBar stats={(() => {
          const stats = {
            total: parts.length,
            active: parts.filter(p => p.lifecycleStatus === 'ACTIVE').length,
            critical: parts.filter(p => p.isCritical).length,
            make: parts.filter(p => p.makeOrBuy === 'MAKE').length,
            buy: parts.filter(p => p.makeOrBuy === 'BUY').length,
          };
          return [
            { label: t('parts.totalCount'), value: stats.total },
            { label: t('parts.activeCount'), value: stats.active, color: 'text-green-600' },
            { label: t('parts.criticalCount'), value: stats.critical, color: 'text-orange-600' },
            { label: t('parts.makeCount'), value: stats.make, color: 'text-indigo-600' },
            { label: t('parts.buyCount'), value: stats.buy, color: 'text-orange-600' },
          ];
        })()} />

        {/* Table Card - fill remaining height */}
        <Card className="border-gray-200 dark:border-mrp-border flex-1 flex flex-col min-h-0 overflow-hidden">
          <CardHeader className="px-3 py-2 shrink-0">
            <DataTableToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder={t('parts.searchPlaceholder')}
              onAdd={handleAdd}
              onImport={handleImport}
              onExport={handleExport}
              onBulkDelete={handleBulkDelete}
              onRefresh={refresh}
              addPermission="parts:create"
              deletePermission="parts:delete"
              addLabel={t('parts.addPart')}
              selectedCount={selectedIds.size}
              isLoading={loading}
              filters={[
                {
                  key: 'category',
                  label: t('parts.categoryFilter'),
                  options: categories.map((c) => ({ value: c, label: c })),
                },
                {
                  key: 'lifecycle',
                  label: t('parts.lifecycleFilter'),
                  options: [
                    { value: 'DEVELOPMENT', label: t('lifecycle.development') },
                    { value: 'PROTOTYPE', label: t('lifecycle.prototype') },
                    { value: 'ACTIVE', label: t('lifecycle.active') },
                    { value: 'PHASE_OUT', label: t('lifecycle.phaseOut') },
                    { value: 'OBSOLETE', label: t('lifecycle.obsolete') },
                    { value: 'EOL', label: t('lifecycle.eol') },
                  ],
                },
                {
                  key: 'makeOrBuy',
                  label: t('parts.makeOrBuyFilter'),
                  options: [
                    { value: 'MAKE', label: t('makeOrBuy.make') },
                    { value: 'BUY', label: t('makeOrBuy.buy') },
                    { value: 'BOTH', label: t('makeOrBuy.both') },
                  ],
                },
              ]}
              activeFilters={filters}
              onFilterChange={(key, value) =>
                setFilters((prev) => ({ ...prev, [key]: value }))
              }
              onClearFilters={() =>
                setFilters({ category: 'all', lifecycle: 'all', makeOrBuy: 'all' })
              }
            />
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col min-h-0">
            <DataTable
              data={filteredParts}
              columns={columns}
              keyField="id"
              loading={loading}
              emptyMessage={t('parts.emptyMessage')}
              selectable
              selectedKeys={selectedIds}
              onSelectionChange={setSelectedIds}
              pagination
              pageSize={50}
              searchable={false}
              stickyHeader
              columnToggle
              virtualize
              virtualRowHeight={36}
              excelMode={{
                enabled: true,
                showRowNumbers: true,
                columnHeaderStyle: 'field-names',
                gridBorders: true,
                showFooter: true,
                sheetName: 'Parts',
                compactMode: true,
              }}
            />
          </CardContent>
        </Card>

        {/* Dialogs */}
        <PartFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          part={editingPart}
          onSuccess={handleFormSuccess}
        />

        <DeletePartDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          part={deletingPart}
          onSuccess={handleDeleteSuccess}
        />

        {/* Import Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('parts.importFromExcel')}</DialogTitle>
            </DialogHeader>
            <ImportWizard
              defaultEntityType="parts"
              onSuccess={handleImportSuccess}
              onClose={() => setImportDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

export default PartsTable;
