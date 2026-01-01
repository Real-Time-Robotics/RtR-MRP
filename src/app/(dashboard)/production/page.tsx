"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Factory, Loader2, Calendar, Search } from "lucide-react";
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
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-red-500">
              Error: {error}
            </div>
          ) : loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : workOrders.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No work orders found
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-sm text-muted-foreground">
                    <th className="text-left py-3 px-4">WO #</th>
                    <th className="text-left py-3 px-4">Product</th>
                    <th className="text-right py-3 px-4">Qty</th>
                    <th className="text-left py-3 px-4">Sales Order</th>
                    <th className="text-left py-3 px-4">Due</th>
                    <th className="text-center py-3 px-4">Materials</th>
                    <th className="text-center py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.map((wo) => {
                    const readiness = getMaterialReadiness(wo.allocations);
                    return (
                      <tr key={wo.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 font-mono">{wo.woNumber}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{wo.product?.name || "-"}</p>
                            <p className="text-sm text-muted-foreground">
                              {wo.product?.sku || "-"}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">{wo.quantity}</td>
                        <td className="py-3 px-4">
                          {wo.salesOrder ? (
                            <div>
                              <p>{wo.salesOrder.orderNumber}</p>
                              <p className="text-sm text-muted-foreground">
                                {wo.salesOrder.customer?.name || "-"}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {wo.plannedEnd
                            ? format(new Date(wo.plannedEnd), "MMM dd")
                            : "-"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant={readiness === 100 ? "default" : "secondary"}
                          >
                            {readiness}% ready
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <WOStatusBadge status={wo.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/production/${wo.id}`)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && (
            <div className="mt-4 pt-4 border-t">
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
