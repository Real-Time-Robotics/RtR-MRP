"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Loader2, Download } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { PassFailBadge } from "@/components/quality/pass-fail-badge";
import { format } from "date-fns";

interface Inspection {
  id: string;
  inspectionNumber: string;
  type: string;
  status: string;
  result: string | null;
  lotNumber: string | null;
  quantityReceived: number | null;
  part?: { partNumber: string; name: string } | null;
  createdAt: string;
}

export default function ReceivingInspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchInspections();
  }, [statusFilter]);

  const fetchInspections = async () => {
    try {
      const params = new URLSearchParams({ type: "RECEIVING" });
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/quality/inspections?${params}`);
      if (res.ok) {
        const result = await res.json();
        // API returns { data: [...], pagination: {...} }
        setInspections(Array.isArray(result) ? result : (result.data || []));
      }
    } catch (error) {
      console.error("Failed to fetch inspections:", error);
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-gray-100 text-gray-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    on_hold: "bg-amber-100 text-amber-800",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receiving Inspections"
        description="Inspect incoming materials from suppliers"
        actions={
          <Button asChild>
            <Link href="/quality/receiving/new">
              <Plus className="h-4 w-4 mr-2" />
              New Inspection
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="ml-auto">
            {inspections.length} inspections
          </Badge>
        </div>
      </Card>

      {/* Inspections List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : inspections.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Download className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No receiving inspections found</p>
            <p className="text-sm">Create an inspection when receiving materials</p>
            <Button asChild className="mt-4">
              <Link href="/quality/receiving/new">
                <Plus className="h-4 w-4 mr-2" />
                New Inspection
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {inspections.map((inspection) => (
            <Link key={inspection.id} href={`/quality/receiving/${inspection.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {inspection.inspectionNumber}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          statusColors[inspection.status] || statusColors.pending
                        }
                      >
                        {inspection.status.replace("_", " ")}
                      </Badge>
                      {inspection.result && (
                        <PassFailBadge result={inspection.result as "PASS" | "FAIL" | "CONDITIONAL" | "PENDING"} size="sm" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      {inspection.part && (
                        <p className="font-medium">
                          {inspection.part.partNumber} - {inspection.part.name}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {inspection.lotNumber && (
                          <span>Lot: {inspection.lotNumber}</span>
                        )}
                        {inspection.quantityReceived && (
                          <span>Qty: {inspection.quantityReceived}</span>
                        )}
                        <span>
                          {format(new Date(inspection.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
