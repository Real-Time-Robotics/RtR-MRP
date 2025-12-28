"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Factory, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { format } from "date-fns";
import { useLanguage } from "@/lib/i18n/language-context";

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
    sku: string;
    name: string;
  };
  salesOrder: {
    orderNumber: string;
    customer: {
      name: string;
    };
  } | null;
  allocations: Array<{
    requiredQty: number;
    allocatedQty: number;
  }>;
}

export default function ProductionPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const fetchWorkOrders = async () => {
    try {
      const res = await fetch("/api/production");
      const data = await res.json();
      setWorkOrders(data);
    } catch (error) {
      console.error("Failed to fetch work orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = workOrders.filter((wo) => {
    if (statusFilter === "all") return true;
    return wo.status === statusFilter;
  });

  const stats = {
    total: workOrders.length,
    draft: workOrders.filter((wo) => wo.status === "draft").length,
    inProgress: workOrders.filter((wo) => wo.status === "in_progress").length,
    completed: workOrders.filter((wo) => wo.status === "completed").length,
  };

  const getMaterialReadiness = (allocations: WorkOrder["allocations"]) => {
    if (allocations.length === 0) return 0;
    const allocated = allocations.reduce((sum, a) => sum + a.allocatedQty, 0);
    const required = allocations.reduce((sum, a) => sum + a.requiredQty, 0);
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
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Factory className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total WOs</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div>
            <p className="text-2xl font-bold">{stats.draft}</p>
            <p className="text-sm text-muted-foreground">Draft</p>
          </div>
        </Card>
        <Card className="p-4">
          <div>
            <p className="text-2xl font-bold">{stats.inProgress}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </div>
        </Card>
        <Card className="p-4">
          <div>
            <p className="text-2xl font-bold">{stats.completed}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
        </Card>
      </div>

      {/* Work Orders List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Work Orders</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
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
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOrders.length === 0 ? (
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
                  {filteredOrders.map((wo) => {
                    const readiness = getMaterialReadiness(wo.allocations);
                    return (
                      <tr key={wo.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono">{wo.woNumber}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{wo.product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {wo.product.sku}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">{wo.quantity}</td>
                        <td className="py-3 px-4">
                          {wo.salesOrder ? (
                            <div>
                              <p>{wo.salesOrder.orderNumber}</p>
                              <p className="text-sm text-muted-foreground">
                                {wo.salesOrder.customer.name}
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
        </CardContent>
      </Card>
    </div>
  );
}
