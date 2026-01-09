"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Factory, Calendar, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WOStatusBadge } from "@/components/production/wo-status-badge";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { format } from "date-fns";
import { useLanguage } from "@/lib/i18n/language-context";
import { usePaginatedData } from "@/hooks/use-paginated-data";
import { useDebouncedCallback } from "use-debounce";
import { DataTable, Column } from "@/components/ui-v2/data-table";

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
      render: (value) => <span className="font-mono">{value}</span>,
    },
    {
      key: 'product',
      header: 'Product',
      width: '180px',
      render: (value) => (
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
      align: 'right',
      sortable: true,
    },
    {
      key: 'salesOrder',
      header: 'Sales Order',
      width: '150px',
      render: (value) => value ? (
        <div>
          <p>{value.orderNumber}</p>
          <p className="text-sm text-muted-foreground">{value.customer?.name || "-"}</p>
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
      render: (value) => value ? format(new Date(value), "MMM dd") : "-",
    },
    {
      key: 'allocations',
      header: 'Materials',
      width: '100px',
      align: 'center',
      render: (value) => {
        const readiness = getMaterialReadiness(value);
        return (
          <Badge variant={readiness === 100 ? "default" : "secondary"}>
            {readiness}% ready
          </Badge>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      align: 'center',
      sortable: true,
      render: (value) => <WOStatusBadge status={value} />,
    },
    {
      key: 'actions',
      header: '',
      width: '70px',
      align: 'right',
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("production.title")}</h1>
          <p className="text-muted-foreground">{t("production.description")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/production/schedule")}>
            <Calendar className="h-4 w-4 mr-2" />
            {t("nav.production.schedule")}
          </Button>
          <Button onClick={() => router.push("/production/new")}>
            <Plus className="h-4 w-4 mr-2" />
            {t("production.workOrders")}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Factory className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total WOs</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div>
            <p className="text-2xl font-bold">{stats.displayed}</p>
            <p className="text-sm text-muted-foreground">Showing</p>
          </div>
        </Card>
        <Card className="p-4">
          <div>
            <p className="text-2xl font-bold">{meta?.took || 0}ms</p>
            <p className="text-sm text-muted-foreground">Response Time</p>
          </div>
        </Card>
        <Card className="p-4">
          <div>
            <p className="text-2xl font-bold">{pagination?.totalPages || 0}</p>
            <p className="text-sm text-muted-foreground">Pages</p>
          </div>
        </Card>
      </div>

      {/* Work Orders List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Work Orders</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search WO number..."
                  value={searchInput}
                  onChange={handleSearchChange}
                  className="pl-9 w-full sm:w-[200px]"
                />
              </div>
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
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

          {/* Pagination */}
          {pagination && (
            <div className="p-4 border-t">
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
