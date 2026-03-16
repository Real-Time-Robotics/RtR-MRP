"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Factory, Calendar, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompactStatsBar } from "@/components/ui/compact-stats-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WOStatusBadge } from "@/components/production/wo-status-badge";
import { Pagination } from "@/components/ui/pagination";
import { formatDateMedium } from "@/lib/date";
import { useLanguage } from "@/lib/i18n/language-context";
import { usePaginatedData } from "@/hooks/use-paginated-data";
import { useDebouncedCallback } from "use-debounce";
import { DataTable, Column } from "@/components/ui-v2/data-table";
import { WOExportButton } from "@/components/production/wo-export-button";
import { EntityTooltip } from "@/components/entity-tooltip";

interface WorkOrder {
  id: string;
  woNumber: string;
  quantity: number;
  priority: string;
  status: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  completedQty: number;
  product: {
    id: string;
    sku: string;
    name: string;
  };
  salesOrder: {
    id: string;
    orderNumber: string;
    customer: {
      id: string;
      name: string;
    };
  } | null;
  allocations: Array<{
    id: string;
    requiredQty: number;
    allocatedQty: number;
    part: { id: string; partNumber: string; name: string };
  }>;
}

export default function ProductionPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");

  // Use paginated data hook
  const {
    data: workOrders,
    pagination,
    meta,
    loading,
    error,
    fetchPage,
    setPageSize,
    setFilters,
    setSearch,
  } = usePaginatedData<WorkOrder>({
    endpoint: "/api/production",
    initialPageSize: 50,
  });

  // Debounced search
  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value);
  }, 300);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    if (value === "all") {
      setFilters({});
    } else {
      setFilters({ status: value });
    }
  }, [setFilters]);

  // Stats from pagination metadata (server-calculated)
  const stats = {
    total: pagination?.totalItems || 0,
    displayed: workOrders.length,
  };

  const getMaterialReadiness = (allocations: WorkOrder["allocations"]) => {
    if (!allocations || allocations.length === 0) return 0;
    const allocated = allocations.reduce((sum, a) => sum + (a.allocatedQty || 0), 0);
    const required = allocations.reduce((sum, a) => sum + (a.requiredQty || 0), 0);
    return required > 0 ? Math.round((allocated / required) * 100) : 0;
  };

  const columns: Column<WorkOrder>[] = useMemo(() => [
    {
      key: 'woNumber',
      header: 'WO #',
      width: '120px',
      sortable: true,
      render: (value, row) => (
        <EntityTooltip type="wo" id={row.id}>
          <span className="font-mono cursor-help">{value}</span>
        </EntityTooltip>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      width: '180px',
      render: (value) => value?.id ? (
        <EntityTooltip type="part" id={value.id}>
          <div className="cursor-help">
            <p className="font-medium">{value?.name || "-"}</p>
            <p className="text-sm text-muted-foreground">{value?.sku || "-"}</p>
          </div>
        </EntityTooltip>
      ) : (
        <div>
          <p className="font-medium">{value?.name || "-"}</p>
          <p className="text-sm text-muted-foreground">{value?.sku || "-"}</p>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty',
      width: '70px',
      sortable: true,
    },
    {
      key: 'salesOrder',
      header: 'Sales Order',
      width: '150px',
      render: (value) => value ? (
        <div>
          <EntityTooltip type="so" id={value.id}>
            <span className="cursor-help">{value.orderNumber}</span>
          </EntityTooltip>
          {value.customer?.id ? (
            <EntityTooltip type="customer" id={value.customer.id}>
              <p className="text-sm text-muted-foreground cursor-help">{value.customer.name}</p>
            </EntityTooltip>
          ) : (
            <p className="text-sm text-muted-foreground">{value.customer?.name || "-"}</p>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
    },
    {
      key: 'plannedEnd',
      header: 'Due',
      width: '90px',
      sortable: true,
      render: (value) => value ? formatDateMedium(value) : "-",
    },
    {
      key: 'allocations',
      header: 'Materials',
      width: '100px',
      render: (value) => {
        const readiness = getMaterialReadiness(value);
        return `${readiness}% ready`;
      },
      cellClassName: (value) => {
        const readiness = getMaterialReadiness(value);
        return readiness === 100
          ? 'bg-green-50 dark:bg-green-950/30'
          : 'bg-yellow-50 dark:bg-yellow-950/30';
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      sortable: true,
      render: (value) => <WOStatusBadge status={value} />,
    },
    {
      key: 'actions',
      header: '',
      width: '70px',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/production/${row.id}`)}
        >
          View
        </Button>
      ),
    },
  ], [router]);

  return (
    // COMPACT: space-y-6 → space-y-3
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          {/* COMPACT: text-2xl → text-base, add font-mono uppercase */}
          <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary">{t("production.title")}</h1>
          <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">{t("production.description")}</p>
        </div>
        {/* COMPACT: gap-2 → gap-1.5, smaller buttons */}
        <div className="flex gap-1.5">
          <WOExportButton workOrders={workOrders} variant="outline" size="sm" />
          <Button variant="outline" size="sm" className="text-xs" onClick={() => router.push("/production/schedule")}>
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            {t("nav.production.schedule")}
          </Button>
          <Button size="sm" className="text-xs" onClick={() => router.push("/production/new")}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {t("production.workOrders")}
          </Button>
        </div>
      </div>

      {/* Stats Bar - Compact inline */}
      <CompactStatsBar stats={[
        { label: 'Total WOs', value: stats.total.toLocaleString(), color: 'text-blue-600 dark:text-blue-400' },
        { label: 'Showing', value: stats.displayed },
        { label: 'Response Time', value: `${meta?.took || 0}ms` },
        { label: 'Pages', value: pagination?.totalPages || 0 },
      ]} />

      {/* Work Orders List - COMPACT */}
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardHeader className="px-3 py-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider">Work Orders</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 w-full sm:w-auto">
              {/* Search Input - COMPACT */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search WO number..."
                  value={searchInput}
                  onChange={handleSearchChange}
                  className="pl-7 h-9 text-xs w-full sm:w-[160px]"
                />
              </div>
              {/* Status Filter - COMPACT */}
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="released">Released</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={workOrders}
            columns={columns}
            keyField="id"
            loading={loading}
            emptyMessage="No work orders found"
            searchable={false}
            stickyHeader
            excelMode={{
              enabled: true,
              showRowNumbers: true,
              columnHeaderStyle: 'field-names',
              gridBorders: true,
              showFooter: true,
              sheetName: 'Work Orders',
              compactMode: true,
            }}
          />

          {/* Pagination - COMPACT */}
          {pagination && (
            <div className="p-2 border-t border-gray-200 dark:border-mrp-border">
              <Pagination
                pagination={pagination}
                onPageChange={fetchPage}
                onPageSizeChange={setPageSize}
                loading={loading}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
