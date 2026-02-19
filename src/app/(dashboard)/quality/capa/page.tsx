"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Loader2, Wrench, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { CAPAStatusBadge } from "@/components/quality/capa-status-badge";
import { PriorityBadge } from "@/components/quality/priority-badge";
import { format } from "date-fns";
import { clientLogger } from '@/lib/client-logger';

interface CAPA {
  id: string;
  capaNumber: string;
  type: string;
  status: string;
  priority: string;
  title: string;
  source: string;
  ownerId: string;
  targetDate: string | null;
  ncrs: Array<{ ncrNumber: string }>;
  _count: { actions: number };
  createdAt: string;
}

export default function CAPAListPage() {
  const [capas, setCAPAs] = useState<CAPA[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchCAPAs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/quality/capa?${params}`);
      if (res.ok) {
        const result = await res.json();
        setCAPAs(Array.isArray(result) ? result : (result.data || []));
      }
    } catch (error) {
      clientLogger.error("Failed to fetch CAPAs:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCAPAs();
    }, search ? 300 : 0);
    return () => clearTimeout(timeoutId);
  }, [search, statusFilter, typeFilter, fetchCAPAs]);

  const typeColors: Record<string, string> = {
    CORRECTIVE: "bg-orange-100 text-orange-800",
    PREVENTIVE: "bg-blue-100 text-blue-800",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Corrective & Preventive Actions"
        description="Track root cause analysis and corrective measures"
        actions={
          <Button asChild>
            <Link href="/quality/capa/new">
              <Plus className="h-4 w-4 mr-2" />
              Create CAPA
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="CORRECTIVE">Corrective</SelectItem>
              <SelectItem value="PREVENTIVE">Preventive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="root_cause_analysis">RCA</SelectItem>
              <SelectItem value="action_planning">Planning</SelectItem>
              <SelectItem value="implementation">Implementation</SelectItem>
              <SelectItem value="verification">Verification</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="ml-auto">
            {capas.length} CAPAs
          </Badge>
        </div>
      </Card>

      {/* CAPA List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : capas.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No CAPAs found</p>
            <p className="text-sm">CAPAs are created to address recurring quality issues</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {capas.map((capa) => (
            <Link key={capa.id} href={`/quality/capa/${capa.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{capa.capaNumber}</CardTitle>
                      <Badge className={typeColors[capa.type] || typeColors.CORRECTIVE}>
                        {capa.type}
                      </Badge>
                      <PriorityBadge priority={capa.priority} />
                    </div>
                    <CAPAStatusBadge status={capa.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{capa.title}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>Source: {capa.source}</span>
                    {capa.ncrs.length > 0 && (
                      <span>NCRs: {capa.ncrs.map((n) => n.ncrNumber).join(", ")}</span>
                    )}
                    <span>{capa._count.actions} actions</span>
                    {capa.targetDate && (
                      <span>
                        Target: {format(new Date(capa.targetDate), "MMM d, yyyy")}
                      </span>
                    )}
                    <span>{format(new Date(capa.createdAt), "MMM d, yyyy")}</span>
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
