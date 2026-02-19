"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Loader2,
  Download,
  Search,
  X,
  Clock,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { clientLogger } from '@/lib/client-logger';

interface Inspection {
  id: string;
  inspectionNumber: string;
  type: string;
  status: string;
  result: string | null;
  sourceType: string | null;
  lotNumber: string | null;
  quantityReceived: number | null;
  quantityAccepted: number | null;
  quantityRejected: number | null;
  part?: { partNumber: string; name: string } | null;
  product?: { sku: string; name: string } | null;
  workOrder?: { woNumber: string } | null;
  createdAt: string;
}

const sourceBadge: Record<string, { label: string; className: string }> = {
  NON_PO: { label: "Ngoài PO", className: "bg-purple-100 text-purple-700" },
  PRODUCTION: { label: "Sản xuất", className: "bg-indigo-100 text-indigo-700" },
};

type TabKey = "all" | "pending" | "in_progress" | "pass" | "conditional" | "fail";

interface TabConfig {
  key: TabKey;
  label: string;
  icon: typeof Clock;
  color: string;
  activeColor: string;
  countColor: string;
}

const TABS: TabConfig[] = [
  {
    key: "all",
    label: "Tất cả",
    icon: Search,
    color: "text-muted-foreground",
    activeColor: "border-primary text-primary",
    countColor: "bg-muted text-muted-foreground",
  },
  {
    key: "pending",
    label: "Chờ kiểm",
    icon: Clock,
    color: "text-gray-500",
    activeColor: "border-gray-600 text-gray-700",
    countColor: "bg-gray-100 text-gray-700",
  },
  {
    key: "in_progress",
    label: "Đang kiểm",
    icon: PlayCircle,
    color: "text-blue-500",
    activeColor: "border-blue-600 text-blue-700",
    countColor: "bg-blue-100 text-blue-700",
  },
  {
    key: "pass",
    label: "Đạt",
    icon: CheckCircle2,
    color: "text-green-500",
    activeColor: "border-green-600 text-green-700",
    countColor: "bg-green-100 text-green-700",
  },
  {
    key: "conditional",
    label: "Có điều kiện",
    icon: AlertTriangle,
    color: "text-amber-500",
    activeColor: "border-amber-600 text-amber-700",
    countColor: "bg-amber-100 text-amber-700",
  },
  {
    key: "fail",
    label: "Không đạt",
    icon: XCircle,
    color: "text-red-500",
    activeColor: "border-red-600 text-red-700",
    countColor: "bg-red-100 text-red-700",
  },
];

function getCategory(inspection: Inspection): TabKey {
  if (inspection.status === "pending") return "pending";
  if (inspection.status === "in_progress") return "in_progress";
  if (inspection.status === "completed") {
    if (inspection.result === "PASS") return "pass";
    if (inspection.result === "CONDITIONAL") return "conditional";
    if (inspection.result === "FAIL") return "fail";
  }
  return "pending";
}

const cardBorderColors: Record<TabKey, string> = {
  all: "",
  pending: "border-l-4 border-l-gray-400",
  in_progress: "border-l-4 border-l-blue-500",
  pass: "border-l-4 border-l-green-500",
  conditional: "border-l-4 border-l-amber-500",
  fail: "border-l-4 border-l-red-500",
};

const resultBadge: Record<string, { label: string; className: string }> = {
  PASS: { label: "Đạt", className: "bg-green-100 text-green-700" },
  CONDITIONAL: {
    label: "Có điều kiện",
    className: "bg-amber-100 text-amber-700",
  },
  FAIL: { label: "Không đạt", className: "bg-red-100 text-red-700" },
};

const statusBadge: Record<string, { label: string; className: string }> = {
  pending: { label: "Chờ kiểm", className: "bg-gray-100 text-gray-700" },
  in_progress: {
    label: "Đang kiểm",
    className: "bg-blue-100 text-blue-700",
  },
  completed: {
    label: "Hoàn thành",
    className: "bg-green-100 text-green-700",
  },
};

export default function ReceivingInspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");

  const fetchInspections = useCallback(async () => {
    try {
      const params = new URLSearchParams({ type: "RECEIVING", pageSize: "200" });
      if (search) params.set("search", search);

      const res = await fetch(`/api/quality/inspections?${params}`);
      if (res.ok) {
        const result = await res.json();
        setInspections(
          Array.isArray(result) ? result : result.data || []
        );
      }
    } catch (error) {
      clientLogger.error("Failed to fetch inspections:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const timeoutId = setTimeout(() => {
      fetchInspections();
    }, search ? 300 : 0);
    return () => clearTimeout(timeoutId);
  }, [search, fetchInspections]);

  // Count per category
  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      all: inspections.length,
      pending: 0,
      in_progress: 0,
      pass: 0,
      conditional: 0,
      fail: 0,
    };
    for (const i of inspections) {
      c[getCategory(i)]++;
    }
    return c;
  }, [inspections]);

  // Filtered list
  const filtered = useMemo(() => {
    if (activeTab === "all") return inspections;
    return inspections.filter((i) => getCategory(i) === activeTab);
  }, [inspections, activeTab]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kiểm tra nhận hàng"
        description="Kiểm tra chất lượng nguyên vật liệu nhận từ nhà cung cấp"
        actions={
          <Button asChild>
            <Link href="/quality/receiving/new">
              <Plus className="h-4 w-4 mr-2" />
              Tạo mới
            </Link>
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {TABS.filter((t) => t.key !== "all").map((tab) => {
          const Icon = tab.icon;
          const count = counts[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() =>
                setActiveTab(activeTab === tab.key ? "all" : tab.key)
              }
              className={cn(
                "rounded-lg border p-3 text-left transition-all hover:shadow-sm",
                activeTab === tab.key
                  ? "ring-2 ring-offset-1 ring-primary/30 border-primary/50"
                  : "border-border"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn("h-4 w-4", tab.color)} />
                <span className="text-xs text-muted-foreground font-medium">
                  {tab.label}
                </span>
              </div>
              <p className="text-2xl font-bold">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Search + Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Tìm kiếm số phiếu, lot, part..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? tab.activeColor
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full ml-1",
                    isActive ? tab.countColor : "bg-muted text-muted-foreground"
                  )}
                >
                  {counts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inspections List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Download className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">
              {activeTab === "all"
                ? "Chưa có phiếu kiểm tra nhận hàng"
                : `Không có phiếu nào ở trạng thái "${TABS.find((t) => t.key === activeTab)?.label}"`}
            </p>
            {activeTab === "all" && (
              <>
                <p className="text-sm">
                  Phiếu kiểm tra tự động tạo khi PO chuyển sang Đã nhận
                </p>
                <Button asChild className="mt-4">
                  <Link href="/quality/receiving/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo mới
                  </Link>
                </Button>
              </>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((inspection) => {
            const category = getCategory(inspection);
            return (
              <Link
                key={inspection.id}
                href={`/quality/receiving/${inspection.id}`}
              >
                <Card
                  className={cn(
                    "hover:shadow-md transition-shadow cursor-pointer",
                    cardBorderColors[category]
                  )}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-base">
                            {inspection.inspectionNumber}
                          </span>
                          {inspection.sourceType && sourceBadge[inspection.sourceType] && (
                            <Badge variant="outline" className={sourceBadge[inspection.sourceType].className}>
                              {sourceBadge[inspection.sourceType].label}
                            </Badge>
                          )}
                        </div>
                        {inspection.part && (
                          <p className="font-medium text-sm">
                            {inspection.part.partNumber} -{" "}
                            {inspection.part.name}
                          </p>
                        )}
                        {!inspection.part && inspection.product && (
                          <p className="font-medium text-sm">
                            {inspection.product.sku} - {inspection.product.name}
                          </p>
                        )}
                        {inspection.workOrder && (
                          <p className="text-xs text-muted-foreground">
                            WO: {inspection.workOrder.woNumber}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          {inspection.lotNumber && (
                            <span>Lot: {inspection.lotNumber}</span>
                          )}
                          <span>SL: {inspection.quantityReceived ?? 0}</span>
                          {inspection.quantityAccepted != null &&
                            inspection.quantityAccepted > 0 && (
                              <span className="text-success-600">
                                Nhận: {inspection.quantityAccepted}
                              </span>
                            )}
                          {inspection.quantityRejected != null &&
                            inspection.quantityRejected > 0 && (
                              <span className="text-danger-600">
                                Loại: {inspection.quantityRejected}
                              </span>
                            )}
                          <span>
                            {format(
                              new Date(inspection.createdAt),
                              "dd/MM/yyyy"
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        {inspection.status !== "completed" && (
                          <Badge
                            className={
                              statusBadge[inspection.status]?.className ||
                              "bg-gray-100 text-gray-700"
                            }
                          >
                            {statusBadge[inspection.status]?.label ||
                              inspection.status}
                          </Badge>
                        )}
                        {inspection.result &&
                          resultBadge[inspection.result] && (
                            <Badge
                              className={
                                resultBadge[inspection.result].className
                              }
                            >
                              {resultBadge[inspection.result].label}
                            </Badge>
                          )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
