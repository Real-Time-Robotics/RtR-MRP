'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  type LucideIcon,
} from 'lucide-react';

// =============================================================================
// CLIENT-ONLY ICON WRAPPER (prevents hydration mismatch)
// =============================================================================
function SafeIcon({ icon: Icon, className, size = 16, style }: {
  icon: LucideIcon;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <span className={className} style={{ ...style, display: 'inline-block', width: size, height: size }} />;
  return <Icon className={className} size={size} style={style} />;
}
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { ActionDropdown, ActionDropdownItem } from '@/components/ui/action-dropdown';
import { DeletePartDialog, Part } from '@/components/forms/part-form';
import { PartFormDialog } from '@/components/parts/part-form-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImportWizard } from '@/components/excel/import-wizard';
import { useDataExport } from '@/hooks/use-data-export';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DataTable, Column } from '@/components/ui-v2/data-table';

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
// STATS CARDS
// =============================================================================

function StatsCards({ parts }: { parts: Part[] }) {
  const stats = {
    total: parts.length,
    active: parts.filter((p) => p.lifecycleStatus === 'ACTIVE').length,
    ndaaCompliant: parts.filter((p) => p.ndaaCompliant).length,
    critical: parts.filter((p) => p.isCritical).length,
    make: parts.filter((p) => p.makeOrBuy === 'MAKE').length,
    buy: parts.filter((p) => p.makeOrBuy === 'BUY').length,
  };

  return (
    // COMPACT: gap-4 → gap-2
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      <Card className="border-gray-200 dark:border-mrp-border">
        {/* COMPACT: pt-4 → p-3 */}
        <CardContent className="p-3">
          <div className="flex items-center gap-1.5">
            <SafeIcon icon={Package} className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Tổng số</span>
          </div>
          <p className="text-lg font-semibold font-mono">{stats.total}</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="flex items-center gap-1.5">
            <SafeIcon icon={CheckCircle} className="h-3.5 w-3.5 text-green-500" />
            <span className="text-[10px] text-muted-foreground">Hoạt động</span>
          </div>
          <p className="text-lg font-semibold font-mono text-green-600">{stats.active}</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="flex items-center gap-1.5">
            <SafeIcon icon={Shield} className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-[10px] text-muted-foreground">NDAA</span>
          </div>
          <p className="text-lg font-semibold font-mono text-blue-600">{stats.ndaaCompliant}</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="flex items-center gap-1.5">
            <SafeIcon icon={AlertTriangle} className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-[10px] text-muted-foreground">Quan trọng</span>
          </div>
          <p className="text-lg font-semibold font-mono text-orange-600">{stats.critical}</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="flex items-center gap-1.5">
            <SafeIcon icon={Package} className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-[10px] text-muted-foreground">Tự sản xuất</span>
          </div>
          <p className="text-lg font-semibold font-mono text-indigo-600">{stats.make}</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="flex items-center gap-1.5">
            <SafeIcon icon={Package} className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-[10px] text-muted-foreground">Mua</span>
          </div>
          <p className="text-lg font-semibold font-mono text-orange-600">{stats.buy}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PartsTable() {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Fetch parts
  const fetchParts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filters.category !== 'all') params.set('category', filters.category);
      if (filters.lifecycle !== 'all') params.set('lifecycleStatus', filters.lifecycle);
      if (filters.makeOrBuy !== 'all') params.set('makeOrBuy', filters.makeOrBuy);
      // Include relations for full column data (planning, costs, specs)
      params.set('includeRelations', 'true');

      const response = await fetch(`/api/parts?${params.toString()}`);
      const result = await response.json();

      if (response.ok) {
        // Ensure we have an array and each part has required fields with defaults
        // Flatten nested relations (planning, costs, specs, compliance) for display
        const partsArray = Array.isArray(result.data) ? result.data : (result.data || []);
        const normalizedParts = partsArray.map((p: any) => ({
          ...p,
          // Basic
          unitCost: p.costs?.unitCost ?? p.unitCost ?? 0,
          isCritical: p.isCritical ?? false,
          // Engineering
          makeOrBuy: p.planning?.makeOrBuy ?? p.makeOrBuy ?? 'BUY',
          lifecycleStatus: p.lifecycleStatus ?? 'ACTIVE',
          // Physical (from specs)
          weightKg: p.specs?.weightKg ?? p.weightKg ?? null,
          lengthMm: p.specs?.lengthMm ?? p.lengthMm ?? null,
          widthMm: p.specs?.widthMm ?? p.widthMm ?? null,
          heightMm: p.specs?.heightMm ?? p.heightMm ?? null,
          material: p.specs?.material ?? p.material ?? '',
          color: p.specs?.color ?? p.color ?? '',
          manufacturer: p.specs?.manufacturer ?? p.manufacturer ?? '',
          manufacturerPn: p.specs?.manufacturerPn ?? p.manufacturerPn ?? '',
          drawingNumber: p.specs?.drawingNumber ?? p.drawingNumber ?? '',
          // Procurement (from planning)
          leadTimeDays: p.planning?.leadTimeDays ?? p.leadTimeDays ?? 0,
          moq: p.planning?.moq ?? p.moq ?? 1,
          orderMultiple: p.planning?.orderMultiple ?? p.orderMultiple ?? 1,
          minStockLevel: p.planning?.minStockLevel ?? p.minStockLevel ?? 0,
          reorderPoint: p.planning?.reorderPoint ?? p.reorderPoint ?? 0,
          safetyStock: p.planning?.safetyStock ?? p.safetyStock ?? 0,
          maxStock: p.planning?.maxStock ?? null,
          // Compliance
          countryOfOrigin: p.compliance?.countryOfOrigin ?? p.countryOfOrigin ?? '',
          ndaaCompliant: p.compliance?.ndaaCompliant ?? p.ndaaCompliant ?? false,
          itarControlled: p.compliance?.itarControlled ?? p.itarControlled ?? false,
          rohsCompliant: p.compliance?.rohsCompliant ?? p.rohsCompliant ?? false,
          reachCompliant: p.compliance?.reachCompliant ?? p.reachCompliant ?? false,
        }));
        setParts(normalizedParts);
      } else {
        setParts([]);
        toast.error('Không thể tải danh sách parts');
      }
    } catch (error) {
      console.error('Failed to fetch parts:', error);
      toast.error('Không thể tải danh sách parts');
      setParts([]);
    } finally {
      setLoading(false);
    }
  }, [search, filters]);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  // Filtered parts (client-side additional filtering)
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
    fetchParts();
  };

  const handleDeleteSuccess = () => {
    fetchParts();
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} parts?`)) {
      return;
    }

    try {
      // Optimistic delete for bulk (harder to revert, but we can try)
      // For safety on delete, we usually wait. 
      // But let's speed up the UI feedback.
      const idsToDelete = new Set(selectedIds);
      setParts(prev => prev.filter(p => !idsToDelete.has(p.id)));
      setSelectedIds(new Set());
      toast.info(`Đang xóa ${idsToDelete.size} parts...`);

      const results = await Promise.all(
        Array.from(idsToDelete).map((id) =>
          fetch(`/api/parts/${id}`, { method: 'DELETE' })
        )
      );

      const failedCount = results.filter((r) => !r.ok).length;
      if (failedCount > 0) {
        toast.error(`Không thể xóa ${failedCount} parts (Đã hoàn tác)`);
        fetchParts(); // Revert/Refresh
      } else {
        toast.success(`Đã xóa ${idsToDelete.size} parts`);
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi xóa');
      fetchParts();
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
        toast.error('Giá trị không hợp lệ');
        return;
      }

      setParts(prev => prev.map(p => p.id === part.id ? { ...p, unitCost: newCost } : p));

      const res = await fetch(`/api/parts/${part.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitCost: newCost }),
      });

      if (!res.ok) throw new Error('Failed to update');

      toast.success('Đã cập nhật đơn giá');
      setEditingCostId(null);
    } catch (error) {
      toast.error('Không thể cập nhật đơn giá');
      fetchParts();
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
      toast.warning('Không có dữ liệu để export');
      return;
    }

    // Flatten nested relations (planning, costs, specs, compliance) for export
    const flattenedParts = parts.map((p: any) => ({
      partNumber: p.partNumber,
      name: p.name,
      description: p.description,
      category: p.category,
      unit: p.unit,
      unitCost: p.costs?.unitCost ?? p.unitCost ?? 0,
      makeOrBuy: p.planning?.makeOrBuy ?? p.makeOrBuy ?? 'BUY',
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
    }));

    exportToExcel(flattenedParts, {
      fileName: 'Parts_List',
      sheetName: 'Parts Master'
    });

    toast.success('Đã xuất file Excel');
  };

  const handleImport = () => {
    setImportDialogOpen(true);
  };

  const handleImportSuccess = () => {
    setImportDialogOpen(false);
    fetchParts();
    toast.success('Import thành công!');
  };

  // Get unique categories
  const categories = Array.from(new Set(parts.map((p) => p.category))).sort();

  // Create action items for each row
  const createPartActions = (part: Part): ActionDropdownItem[] => [
    {
      label: 'Xem chi tiết',
      href: `/parts/${part.id}`,
    },
    {
      label: 'Chỉnh sửa',
      onClick: () => handleEdit(part),
      permission: 'orders:edit',
    },
    {
      label: 'Xóa',
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
      header: 'Mã Part',
      width: '130px',
      sortable: true,
      sticky: 'left',
      render: (value, row) => (
        <div className="flex items-center gap-1">
          <Link href={`/parts/${row.id}`} className="font-mono font-medium text-primary hover:underline">
            {value}
          </Link>
          {row.isCritical && <SafeIcon icon={AlertTriangle} className="h-3 w-3 text-orange-500" />}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Tên Part',
      width: '180px',
      sortable: true,
      render: (value) => <div className="truncate max-w-[160px]">{value || '-'}</div>,
    },
    {
      key: 'description',
      header: 'Mô tả',
      width: '200px',
      hidden: true,
      render: (value) => <div className="truncate max-w-[180px] text-muted-foreground">{value || '-'}</div>,
    },
    {
      key: 'category',
      header: 'Danh mục',
      width: '100px',
      sortable: true,
      render: (value) => <Badge variant="outline" className="text-[10px] px-1 py-0">{value || '-'}</Badge>,
    },
    {
      key: 'unit',
      header: 'Đơn vị',
      width: '70px',
      align: 'center',
      render: (value) => <span className="text-xs">{value || 'EA'}</span>,
    },
    {
      key: 'unitCost',
      header: 'Đơn giá',
      width: '100px',
      align: 'right',
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
      header: 'Quan trọng',
      width: '80px',
      align: 'center',
      render: (value) => value ? (
        <Badge className="bg-orange-100 text-orange-800 text-[10px] px-1 py-0">
          <SafeIcon icon={AlertTriangle} className="h-3 w-3 mr-1" />
          Critical
        </Badge>
      ) : <span className="text-muted-foreground">-</span>,
    },

    // ===== TAB VẬT LÝ (Physical) =====
    {
      key: 'weightKg',
      header: 'Trọng lượng',
      width: '90px',
      align: 'right',
      hidden: true,
      render: (value) => value ? `${formatNumber(value, 3)} kg` : '-',
    },
    {
      key: 'dimensions',
      header: 'Kích thước',
      width: '140px',
      hidden: true,
      render: (_, row: any) => formatDimensions(row.lengthMm, row.widthMm, row.heightMm),
    },
    {
      key: 'material',
      header: 'Vật liệu',
      width: '100px',
      hidden: true,
      render: (value) => <span className="truncate">{value || '-'}</span>,
    },
    {
      key: 'color',
      header: 'Màu sắc',
      width: '80px',
      hidden: true,
      render: (value) => value || '-',
    },

    // ===== TAB KỸ THUẬT (Engineering) =====
    {
      key: 'makeOrBuy',
      header: 'Make/Buy',
      width: '85px',
      align: 'center',
      sortable: true,
      render: (value) => (
        <Badge className={cn(MAKE_BUY_COLORS[value] || '', 'text-[10px] px-1 py-0')}>
          {value || 'BUY'}
        </Badge>
      ),
    },
    {
      key: 'revision',
      header: 'Rev',
      width: '55px',
      align: 'center',
      render: (value) => <Badge variant="secondary" className="text-[10px] px-1 py-0">{value || 'A'}</Badge>,
    },
    {
      key: 'revisionDate',
      header: 'Ngày Rev',
      width: '100px',
      hidden: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'drawingNumber',
      header: 'Số bản vẽ',
      width: '120px',
      hidden: true,
      render: (value) => <span className="font-mono text-xs">{value || '-'}</span>,
    },
    {
      key: 'manufacturer',
      header: 'Nhà SX',
      width: '120px',
      hidden: true,
      render: (value) => <span className="truncate">{value || '-'}</span>,
    },
    {
      key: 'manufacturerPn',
      header: 'MPN',
      width: '120px',
      hidden: true,
      render: (value) => <span className="font-mono text-xs">{value || '-'}</span>,
    },
    {
      key: 'lifecycleStatus',
      header: 'Trạng thái',
      width: '100px',
      sortable: true,
      render: (value) => (
        <Badge className={cn(LIFECYCLE_COLORS[value] || LIFECYCLE_COLORS['ACTIVE'], 'text-[10px] px-1 py-0')}>
          {value || 'ACTIVE'}
        </Badge>
      ),
    },

    // ===== TAB MUA HÀNG (Procurement) =====
    {
      key: 'leadTimeDays',
      header: 'Lead Time',
      width: '85px',
      align: 'right',
      sortable: true,
      render: (value) => value ? (
        <span className="font-mono">{value} <span className="text-muted-foreground text-[10px]">ngày</span></span>
      ) : '-',
    },
    {
      key: 'moq',
      header: 'MOQ',
      width: '70px',
      align: 'right',
      render: (value) => <span className="font-mono">{formatNumber(value) || '-'}</span>,
    },
    {
      key: 'orderMultiple',
      header: 'Bội số đặt',
      width: '80px',
      align: 'right',
      hidden: true,
      render: (value) => <span className="font-mono">{formatNumber(value) || '-'}</span>,
    },
    {
      key: 'minStockLevel',
      header: 'Min Stock',
      width: '85px',
      align: 'right',
      render: (value) => <span className="font-mono">{formatNumber(value) || '0'}</span>,
    },
    {
      key: 'reorderPoint',
      header: 'ROP',
      width: '70px',
      align: 'right',
      render: (value) => <span className="font-mono">{formatNumber(value) || '0'}</span>,
    },
    {
      key: 'safetyStock',
      header: 'Safety Stock',
      width: '90px',
      align: 'right',
      hidden: true,
      render: (value) => <span className="font-mono">{formatNumber(value) || '0'}</span>,
    },
    {
      key: 'maxStock',
      header: 'Max Stock',
      width: '85px',
      align: 'right',
      hidden: true,
      render: (value) => <span className="font-mono">{value ? formatNumber(value) : '-'}</span>,
    },

    // ===== TAB TUÂN THỦ (Compliance) =====
    {
      key: 'countryOfOrigin',
      header: 'Xuất xứ',
      width: '100px',
      hidden: true,
      render: (value) => (
        <div className="flex items-center gap-1">
          <SafeIcon icon={Globe} className="h-3 w-3 text-muted-foreground" />
          <span className="truncate">{value || '-'}</span>
        </div>
      ),
    },
    {
      key: 'ndaaCompliant',
      header: 'NDAA',
      width: '65px',
      align: 'center',
      render: (value) => value ? (
        <SafeIcon icon={CheckCircle} className="h-4 w-4 text-green-500 mx-auto" />
      ) : (
        <SafeIcon icon={XCircle} className="h-4 w-4 text-red-500 mx-auto" />
      ),
    },
    {
      key: 'itarControlled',
      header: 'ITAR',
      width: '65px',
      align: 'center',
      render: (value) => value ? (
        <SafeIcon icon={Shield} className="h-4 w-4 text-red-500 mx-auto" />
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
    },
    {
      key: 'rohsCompliant',
      header: 'RoHS',
      width: '65px',
      align: 'center',
      render: (value) => value ? (
        <SafeIcon icon={Leaf} className="h-4 w-4 text-green-500 mx-auto" />
      ) : (
        <SafeIcon icon={XCircle} className="h-4 w-4 text-yellow-500 mx-auto" />
      ),
    },
    {
      key: 'reachCompliant',
      header: 'REACH',
      width: '70px',
      align: 'center',
      hidden: true,
      render: (value) => value ? (
        <SafeIcon icon={CheckCircle} className="h-4 w-4 text-green-500 mx-auto" />
      ) : (
        <SafeIcon icon={XCircle} className="h-4 w-4 text-yellow-500 mx-auto" />
      ),
    },

    // ===== SYSTEM FIELDS =====
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      width: '100px',
      hidden: true,
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'updatedAt',
      header: 'Cập nhật',
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
  ], [editingCostId, editingCostValue]);

  return (
    <TooltipProvider>
      {/* COMPACT: space-y-6 → space-y-3 */}
      <div className="space-y-3">
        {/* Header - COMPACT */}
        <div>
          <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary flex items-center gap-1.5">
            <SafeIcon icon={Package} className="h-4 w-4" />
            Parts Master
          </h1>
          <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">
            Quản lý danh sách parts với AS9100/ITAR compliance
          </p>
        </div>

        {/* Stats */}
        <StatsCards parts={parts} />

        {/* Table Card - COMPACT */}
        <Card className="border-gray-200 dark:border-mrp-border">
          <CardHeader className="px-3 py-2">
            <DataTableToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Tìm kiếm part number, tên, manufacturer..."
              onAdd={handleAdd}
              onImport={handleImport}
              onExport={handleExport}
              onBulkDelete={handleBulkDelete}
              onRefresh={fetchParts}
              addPermission="parts:create"
              deletePermission="parts:delete"
              addLabel="Thêm Part"
              selectedCount={selectedIds.size}
              isLoading={loading}
              filters={[
                {
                  key: 'category',
                  label: 'Danh mục',
                  options: categories.map((c) => ({ value: c, label: c })),
                },
                {
                  key: 'lifecycle',
                  label: 'Vòng đời',
                  options: [
                    { value: 'DEVELOPMENT', label: 'Phát triển' },
                    { value: 'PROTOTYPE', label: 'Mẫu thử' },
                    { value: 'ACTIVE', label: 'Hoạt động' },
                    { value: 'PHASE_OUT', label: 'Ngừng dần' },
                    { value: 'OBSOLETE', label: 'Lỗi thời' },
                    { value: 'EOL', label: 'Hết vòng đời' },
                  ],
                },
                {
                  key: 'makeOrBuy',
                  label: 'Sản xuất/Mua',
                  options: [
                    { value: 'MAKE', label: 'Tự sản xuất' },
                    { value: 'BUY', label: 'Mua' },
                    { value: 'BOTH', label: 'Cả hai' },
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
          <CardContent className="p-0">
            <DataTable
              data={filteredParts}
              columns={columns}
              keyField="id"
              loading={loading}
              emptyMessage="Không tìm thấy parts"
              selectable
              selectedKeys={selectedIds}
              onSelectionChange={setSelectedIds}
              pagination
              pageSize={20}
              searchable={false}
              stickyHeader
              columnToggle
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
              <DialogTitle>Import Parts từ Excel</DialogTitle>
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
