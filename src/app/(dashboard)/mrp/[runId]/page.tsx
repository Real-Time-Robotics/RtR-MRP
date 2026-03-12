"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { MrpSummaryCards } from "@/components/mrp/mrp-summary-cards";
import { SuggestionCard } from "@/components/mrp/suggestion-card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { EntityDiscussions } from "@/components/discussions/entity-discussions";
import { MRPExceptionsTab } from "@/components/mrp/mrp-exceptions-tab";
import { clientLogger } from '@/lib/client-logger';
import { toast } from "sonner";
import { useWorkSession } from '@/hooks/use-work-session';
import { SmartBreadcrumb } from '@/components/smart-breadcrumb';

interface MrpRunData {
  id: string;
  runNumber: string;
  runDate: string;
  planningHorizon: number;
  status: string;
  totalParts: number | null;
  purchaseSuggestions: number | null;
  expediteAlerts: number | null;
  shortageWarnings: number | null;
  suggestions: Array<{
    id: string;
    partId: string;
    actionType: string;
    priority: string;
    suggestedQty: number | null;
    suggestedDate: string | null;
    reason: string | null;
    status: string;
    estimatedCost: number | null;
    onOrder?: number;
    part: {
      partNumber: string;
      name: string;
    };
    supplier: {
      name: string;
    } | null;
    bomChildren?: Array<{
      partId: string;
      partNumber: string;
      name: string;
      quantity: number;
      unit: string;
      stock: number;
      onOrder: number;
      isCritical: boolean;
      totalDemandAll?: number;
      children?: Array<{
        partId: string;
        partNumber: string;
        name: string;
        quantity: number;
        unit: string;
        stock: number;
        onOrder: number;
        isCritical: boolean;
        totalDemandAll?: number;
      }>;
    }>;
  }>;
}

export default function MrpRunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params.runId as string;

  const [data, setData] = useState<MrpRunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("pending");

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/mrp/${runId}`);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch MRP run");
      }

      const result = await res.json();

      // Normalize the data structure
      const normalizedData: MrpRunData = {
        ...result,
        suggestions: result.suggestions || [],
        totalParts: result.totalParts ?? 0,
        purchaseSuggestions: result.purchaseSuggestions ?? 0,
        expediteAlerts: result.expediteAlerts ?? 0,
        shortageWarnings: result.shortageWarnings ?? 0,
      };

      setData(normalizedData);
    } catch (error) {
      clientLogger.error("Failed to fetch MRP run:", error);
      setError(error instanceof Error ? error.message : "Failed to load MRP run");
    } finally {
      setLoading(false);
    }
  }, [runId]);

  // Work Session tracking
  const { trackActivity, updateContext } = useWorkSession({
    entityType: 'MRP_RUN',
    entityId: runId,
    entityNumber: data?.runNumber || runId,
    workflowSteps: ['Xem kết quả', 'Duyệt đề xuất', 'Tạo PO'],
    currentStep: 1,
    enabled: !!runId,
  });

  // Update work session context when MRP data loads
  useEffect(() => {
    if (!data) return;
    const pendingCount = (data.suggestions || []).filter(s => s.status === 'pending').length;
    const approvedCount = (data.suggestions || []).filter(s => s.status === 'approved').length;
    updateContext({
      summary: `MRP ${data.runNumber} - ${data.status} - ${data.suggestions?.length || 0} suggestions`,
      keyMetrics: {
        status: data.status,
        totalParts: data.totalParts || 0,
        purchaseSuggestions: data.purchaseSuggestions || 0,
        expediteAlerts: data.expediteAlerts || 0,
        shortageWarnings: data.shortageWarnings || 0,
        pendingSuggestions: pendingCount,
        approvedSuggestions: approvedCount,
      },
    });
  }, [data, updateContext]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for updates if running
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (data && (data.status === "running" || data.status === "queued")) {
      intervalId = setInterval(() => {
        fetchData();
      }, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [data, fetchData]);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/mrp/suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Không thể duyệt suggestion");
        return;
      }
      toast.success("Đã duyệt suggestion", {
        description: "Bạn có thể tạo PO từ tab 'Đã duyệt'",
      });
      trackActivity('MRP_APPROVE', `Duyệt suggestion ${id}`);
      setStatusFilter("approved");
      fetchData();
    } catch {
      toast.error("Lỗi khi duyệt suggestion");
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await fetch(`/api/mrp/suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Không thể từ chối suggestion");
        return;
      }
      toast.success("Đã từ chối suggestion");
      trackActivity('MRP_REJECT', `Từ chối suggestion ${id}`);
      fetchData();
    } catch {
      toast.error("Lỗi khi từ chối suggestion");
    }
  };

  const handleCreatePO = async (id: string) => {
    try {
      const res = await fetch(`/api/mrp/suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", createPO: true }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Không thể tạo PO");
        return;
      }
      const result = await res.json();
      if (result.error) {
        toast.error(result.error);
        fetchData();
        return;
      }
      const poId = result.po?.id;
      if (!poId) {
        toast.warning("Suggestion đã duyệt nhưng không tạo được PO", {
          description: "Không tìm thấy nhà cung cấp. Tạo PO thủ công từ trang Purchasing.",
        });
        setStatusFilter("approved");
        fetchData();
        return;
      }
      const isConsolidated = result.consolidated === true;
      trackActivity('MRP_CREATE_PO', `Tạo PO từ suggestion ${id}`, { poId, consolidated: isConsolidated });
      toast.success(
        isConsolidated ? "Đã gộp vào PO hiện có!" : "Đã tạo PO thành công!", {
        description: isConsolidated
          ? "Part đã được thêm vào PO draft cùng nhà cung cấp"
          : "Suggestion đã duyệt và PO đã được tạo tự động",
        action: { label: "Xem PO", onClick: () => router.push(`/purchasing/${poId}`) },
      });
      setStatusFilter("converted");
      fetchData();
    } catch {
      toast.error("Lỗi khi tạo PO");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-red-500">{error}</p>
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={fetchData}>
            Try Again
          </Button>
          <Button variant="link" onClick={() => router.push("/mrp")}>
            Back to MRP
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">MRP run not found</p>
        <Button variant="link" onClick={() => router.push("/mrp")}>
          Back to MRP
        </Button>
      </div>
    );
  }

  // Show processing state
  if (data.status === "queued" || data.status === "running") {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`MRP Run ${data.runNumber}`}
          description={`Started on ${format(new Date(data.runDate), "MMM dd, yyyy 'at' HH:mm")}`}
          backHref="/mrp"
        />
        <Card className="border-2 border-primary/20">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              <div className="relative bg-background rounded-full p-4 border-2 border-primary">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                {data.status === "queued" ? "MRP Job Queued" : "Calculation in Progress"}
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                The MRP engine is currently processing demand and inventory levels.
                This page will automatically update when the calculation is complete.
              </p>
              <div className="pt-4">
                <Badge variant="outline" className="animate-pulse">
                  Status: {data.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show failed state
  if (data.status === "failed") {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`MRP Run ${data.runNumber}`}
          description={`Started on ${format(new Date(data.runDate), "MMM dd, yyyy 'at' HH:mm")}`}
          backHref="/mrp"
        />
        <Card className="border-2 border-red-200 dark:border-red-800">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
            <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-4">
              <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-red-600">
                Tính toán thất bại
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                MRP calculation đã gặp lỗi trong quá trình xử lý. Vui lòng thử chạy lại.
              </p>
              <div className="pt-4">
                <Badge variant="destructive">
                  Status: FAILED
                </Badge>
              </div>
            </div>
            <Button onClick={() => router.push("/mrp")}>
              Quay lại MRP
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredSuggestions = (data.suggestions || []).filter((s) => {
    if (actionFilter !== "all" && s.actionType !== actionFilter) return false;
    if (priorityFilter !== "all" && s.priority !== priorityFilter) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  });

  const deferCount = (data.suggestions || []).filter(
    (s) => s.actionType === "DEFER"
  ).length;

  return (
    <div className="space-y-6">
      {/* Smart Breadcrumb with Progress */}
      <SmartBreadcrumb
        items={[
          { label: 'MRP', href: '/mrp' },
          { label: `Run ${data.runNumber}` },
        ]}
        entityType="MRP_RUN"
        entityData={data as unknown as Record<string, unknown>}
      />

      <PageHeader
        title={`MRP Run ${data.runNumber}`}
        description={`Run on ${format(new Date(data.runDate), "MMM dd, yyyy 'at' HH:mm")}`}
        backHref="/mrp"
        actions={
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        }
      />

      <MrpSummaryCards
        totalParts={data.totalParts || 0}
        purchaseSuggestions={data.purchaseSuggestions || 0}
        expediteAlerts={data.expediteAlerts || 0}
        deferSuggestions={deferCount}
      />

      <Tabs defaultValue="suggestions" className="w-full">
        <TabsList>
          <TabsTrigger value="suggestions">Đề xuất</TabsTrigger>
          <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
          <TabsTrigger value="discussions">Thảo luận</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Suggestions</CardTitle>
                <div className="flex gap-2">
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="PURCHASE">Purchase</SelectItem>
                      <SelectItem value="EXPEDITE">Expedite</SelectItem>
                      <SelectItem value="DEFER">Defer</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredSuggestions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No suggestions match the selected filters
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredSuggestions.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={{
                        id: suggestion.id,
                        partId: suggestion.partId,
                        partNumber: suggestion.part.partNumber,
                        partName: suggestion.part.name,
                        actionType: suggestion.actionType,
                        priority: suggestion.priority,
                        suggestedQty: suggestion.suggestedQty,
                        suggestedDate: suggestion.suggestedDate,
                        reason: suggestion.reason,
                        supplierName: suggestion.supplier?.name,
                        estimatedCost: suggestion.estimatedCost,
                        status: suggestion.status,
                        onOrder: suggestion.onOrder,
                        bomChildren: suggestion.bomChildren,
                      }}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onCreatePO={handleCreatePO}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exceptions" className="mt-4">
          <MRPExceptionsTab mrpRunId={data.id} />
        </TabsContent>

        <TabsContent value="discussions" className="mt-4">
          <EntityDiscussions
            contextType="MRP_RUN"
            contextId={data.id}
            contextTitle={`MRP Run ${data.runNumber}`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
