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
import { format } from "date-fns";

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
    part: {
      partNumber: string;
      name: string;
    };
    supplier: {
      name: string;
    } | null;
  }>;
}

export default function MrpRunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params.runId as string;

  const [data, setData] = useState<MrpRunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("pending");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/mrp/${runId}`);
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch MRP run:", error);
    } finally {
      setLoading(false);
    }
  }, [runId]);

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
    await fetch(`/api/mrp/suggestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    fetchData();
  };

  const handleReject = async (id: string) => {
    await fetch(`/api/mrp/suggestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    });
    fetchData();
  };

  const handleCreatePO = async (id: string) => {
    await fetch(`/api/mrp/suggestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", createPO: true }),
    });
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
    </div>
  );
}
