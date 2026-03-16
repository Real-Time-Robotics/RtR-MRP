"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  Play,
  History,
  Loader2,
  AlertTriangle,
  TrendingDown,
  Package,
  ArrowRightLeft,
  Layers,
  Truck,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/language-context";
import { DataTable, Column } from "@/components/ui-v2/data-table";
import { clientLogger } from "@/lib/client-logger";

interface AnalysisResult {
  productsAnalyzed: number;
  bomRollups: number;
  makeVsBuyCount: number;
  substituteCount: number;
  supplierOpportunities: number;
  totalPotentialSavings: number;
  costTargetId: string | null;
  duration: number;
}

interface AnalysisRun {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  currentCost: number;
  targetCost: number;
  productName: string;
  phasesCount: number;
  actionsCount: number;
  makeVsBuyCount: number;
  substituteCount: number;
  supplierCount: number;
  totalSavings: number;
}

interface ActionDetail {
  id: string;
  type: string;
  description: string;
  partNumber?: string | null;
  partName?: string | null;
  currentCost: number;
  targetCost: number;
  savingsPerUnit: number;
  annualSavings: number;
  riskLevel: string;
}

interface MakeVsBuyDetail {
  partNumber: string;
  partName: string;
  buyPrice: number;
  makeCostEstimate: number;
  savingsPerUnit: number;
  annualSavings: number;
  overallScore: number;
  recommendation: string;
  rationale: string;
  breakEvenMonths: number;
  investmentRequired: number;
}

interface SubstituteDetail {
  originalPartNumber: string;
  originalPartName: string;
  substitutePartNumber: string;
  substitutePartName: string;
  originalPrice: number;
  substitutePrice: number;
  savingsPercent: number;
  compatibilityScore: number;
  riskLevel: string;
}

interface AnalysisDetailData {
  id: string;
  name: string;
  createdAt: string;
  currentCost: number;
  targetCost: number;
  phases: Array<{ name: string; actions: ActionDetail[] }>;
  makeVsBuyDetails: MakeVsBuyDetail[];
  substituteDetails: SubstituteDetail[];
}

const RECOMMENDATION_BADGE: Record<string, string> = {
  STRONG_MAKE: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  CONSIDER_MAKE: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  NEUTRAL: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  CONSIDER_BUY: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  STRONG_BUY: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
};

const RISK_BADGE: Record<string, string> = {
  LOW: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
};

export default function CostAnalyzePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);

  // Detail state
  const [detailData, setDetailData] = useState<AnalysisDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedPanels, setExpandedPanels] = useState<Record<string, boolean>>({
    bom: true,
    mvb: true,
    substitutes: true,
    supplier: true,
  });

  // Parameters
  const [clearPrevious, setClearPrevious] = useState(true);
  const [bomRollup, setBomRollup] = useState(true);
  const [makeVsBuy, setMakeVsBuy] = useState(true);
  const [substitutes, setSubstitutes] = useState(true);
  const [supplierConsolidation, setSupplierConsolidation] = useState(true);

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/cost-optimization/analyze");
      const data = await res.json();
      setRuns(Array.isArray(data) ? data : []);
    } catch (error) {
      clientLogger.error("Failed to fetch analysis runs:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/cost-optimization/analyze/${id}`);
      if (!res.ok) throw new Error("Failed to fetch detail");
      const data = await res.json();
      setDetailData(data);
    } catch (error) {
      clientLogger.error("Failed to fetch analysis detail:", error);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const runAnalysis = async () => {
    setRunning(true);
    setErrorMsg(null);
    setLastResult(null);
    setDetailData(null);
    try {
      const analysisTypes: string[] = [];
      if (bomRollup) analysisTypes.push("BOM_ROLLUP");
      if (makeVsBuy) analysisTypes.push("MAKE_VS_BUY");
      if (substitutes) analysisTypes.push("SUBSTITUTES");
      if (supplierConsolidation) analysisTypes.push("SUPPLIER_CONSOLIDATION");

      if (analysisTypes.length === 0) {
        setErrorMsg("Please select at least one analysis type");
        setRunning(false);
        return;
      }

      const res = await fetch("/api/cost-optimization/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisTypes,
          clearPrevious,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to run analysis");
      }

      setLastResult(data);
      await fetchRuns(true);

      // Auto-fetch detail for the new run
      if (data.costTargetId) {
        fetchDetail(data.costTargetId);
      }
    } catch (error: unknown) {
      clientLogger.error("Failed to run analysis:", error);
      setErrorMsg(
        error instanceof Error ? error.message : "Failed to start cost analysis"
      );
    } finally {
      setRunning(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString("vi-VN");
  };

  const togglePanel = (key: string) => {
    setExpandedPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Derived data from detailData
  const bomActions = useMemo(() => {
    if (!detailData) return [];
    return detailData.phases
      .flatMap((p) => p.actions)
      .filter((a) => a.type === "PROCESS_IMPROVE" || a.type === "DESIGN_CHANGE")
      .sort((a, b) => b.annualSavings - a.annualSavings)
      .slice(0, 10);
  }, [detailData]);

  const supplierActions = useMemo(() => {
    if (!detailData) return [];
    return detailData.phases
      .flatMap((p) => p.actions)
      .filter((a) => a.type === "SUPPLIER_OPTIMIZE")
      .sort((a, b) => b.annualSavings - a.annualSavings)
      .slice(0, 10);
  }, [detailData]);

  const columns: Column<AnalysisRun>[] = useMemo(
    () => [
      {
        key: "createdAt",
        header: "Date",
        width: "160px",
        sortable: true,
        render: (value: string) =>
          format(new Date(value), "MMM dd, yyyy HH:mm"),
      },
      {
        key: "actionsCount",
        header: "Actions",
        width: "80px",
        sortable: true,
        render: (value: number) => value || 0,
      },
      {
        key: "makeVsBuyCount",
        header: "MvB",
        width: "60px",
        sortable: true,
        render: (value: number) => value || 0,
      },
      {
        key: "substituteCount",
        header: "Subs",
        width: "60px",
        sortable: true,
        render: (value: number) => value || 0,
      },
      {
        key: "supplierCount",
        header: "Supplier",
        width: "70px",
        sortable: true,
        render: (value: number) => value || 0,
      },
      {
        key: "totalSavings",
        header: "Savings",
        width: "120px",
        sortable: true,
        render: (value: number) => (
          <span className="text-green-600 dark:text-green-400 font-medium">
            {formatCurrency(value)}đ
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        width: "90px",
        sortable: true,
        render: (value: string) => (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              value === "ACTIVE" &&
                "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
              value === "DRAFT" &&
                "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700"
            )}
          >
            {value}
          </Badge>
        ),
      },
      {
        key: "actions" as keyof AnalysisRun,
        header: "",
        width: "80px",
        render: (_: unknown, row: AnalysisRun) => (
          <Button
            variant="ghost"
            size="sm"
            className="text-[11px]"
            onClick={() => {
              fetchDetail(row.id);
            }}
          >
            View
          </Button>
        ),
      },
    ],
    [fetchDetail]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-[#e8eaed]">
            Cost Analysis Engine
          </h1>
          <p className="text-[11px] text-gray-500 dark:text-[#8b9ab0]">
            Analyze real BOM & Parts data to generate cost reduction scenarios
          </p>
        </div>
      </div>

      {/* Run Analysis Form */}
      <Card className="border-gray-200 dark:border-mrp-border overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-mrp-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
              <Brain className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-xs font-semibold font-mono uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Cost Analysis
            </span>
          </div>
          <Button
            onClick={runAnalysis}
            disabled={running}
            size="sm"
            className="text-[11px] px-3 gap-1.5"
          >
            {running ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-3 w-3" />
                Run Analysis
              </>
            )}
          </Button>
        </div>

        <CardContent className="px-4 py-3">
          {errorMsg && (
            <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-md text-[11px] font-medium mb-3 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-[1fr_1px_1fr] gap-0 items-start">
            {/* Left Column: Scope */}
            <div className="pr-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-[11px] text-muted-foreground whitespace-nowrap">
                  Product Scope
                </Label>
                <span className="text-[11px] font-medium text-foreground">
                  All Products
                </span>
              </div>

              <div className="space-y-0">
                <div className="flex items-center justify-between py-1.5 group">
                  <Label
                    htmlFor="clearPrevious"
                    className="text-[11px] font-normal text-muted-foreground group-hover:text-foreground transition-colors cursor-pointer"
                  >
                    Clear Previous Data
                  </Label>
                  <Switch
                    id="clearPrevious"
                    checked={clearPrevious}
                    onCheckedChange={setClearPrevious}
                    className="scale-[0.8] origin-right"
                  />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-full bg-gray-200 dark:bg-gray-800" />

            {/* Right Column: Analysis Types */}
            <div className="pl-4 space-y-0">
              <div className="flex items-center justify-between py-1.5 group">
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3 w-3 text-blue-500" />
                  <Label
                    htmlFor="bomRollup"
                    className="text-[11px] font-normal text-muted-foreground group-hover:text-foreground transition-colors cursor-pointer"
                  >
                    BOM Cost Rollup
                  </Label>
                </div>
                <Switch
                  id="bomRollup"
                  checked={bomRollup}
                  onCheckedChange={setBomRollup}
                  className="scale-[0.8] origin-right"
                />
              </div>
              <div className="flex items-center justify-between py-1.5 group">
                <div className="flex items-center gap-1.5">
                  <ArrowRightLeft className="h-3 w-3 text-purple-500" />
                  <Label
                    htmlFor="makeVsBuy"
                    className="text-[11px] font-normal text-muted-foreground group-hover:text-foreground transition-colors cursor-pointer"
                  >
                    Make vs Buy
                  </Label>
                </div>
                <Switch
                  id="makeVsBuy"
                  checked={makeVsBuy}
                  onCheckedChange={setMakeVsBuy}
                  className="scale-[0.8] origin-right"
                />
              </div>
              <div className="flex items-center justify-between py-1.5 group">
                <div className="flex items-center gap-1.5">
                  <Package className="h-3 w-3 text-orange-500" />
                  <Label
                    htmlFor="substitutes"
                    className="text-[11px] font-normal text-muted-foreground group-hover:text-foreground transition-colors cursor-pointer"
                  >
                    Substitute Parts
                  </Label>
                </div>
                <Switch
                  id="substitutes"
                  checked={substitutes}
                  onCheckedChange={setSubstitutes}
                  className="scale-[0.8] origin-right"
                />
              </div>
              <div className="flex items-center justify-between py-1.5 group">
                <div className="flex items-center gap-1.5">
                  <Truck className="h-3 w-3 text-green-500" />
                  <Label
                    htmlFor="supplierConsolidation"
                    className="text-[11px] font-normal text-muted-foreground group-hover:text-foreground transition-colors cursor-pointer"
                  >
                    Supplier Consolidation
                  </Label>
                </div>
                <Switch
                  id="supplierConsolidation"
                  checked={supplierConsolidation}
                  onCheckedChange={setSupplierConsolidation}
                  className="scale-[0.8] origin-right"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {lastResult && (
        <div className="grid grid-cols-4 gap-2 animate-in fade-in-50 slide-in-from-top-2 duration-300">
          <Card className="border-gray-200 dark:border-mrp-border">
            <CardContent className="p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Products
              </div>
              <div className="text-lg font-semibold mt-0.5">
                {lastResult.productsAnalyzed}
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 dark:border-mrp-border">
            <CardContent className="p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                MvB Opportunities
              </div>
              <div className="text-lg font-semibold mt-0.5">
                {lastResult.makeVsBuyCount}
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 dark:border-mrp-border">
            <CardContent className="p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Substitutes Found
              </div>
              <div className="text-lg font-semibold mt-0.5">
                {lastResult.substituteCount}
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 dark:border-mrp-border">
            <CardContent className="p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-green-500" />
                Potential Savings
              </div>
              <div className="text-lg font-semibold mt-0.5 text-green-600 dark:text-green-400">
                {formatCurrency(lastResult.totalPotentialSavings)}đ
              </div>
              <div className="text-[10px] text-muted-foreground">
                in {(lastResult.duration / 1000).toFixed(1)}s
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Results */}
      {detailLoading && (
        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs">Loading analysis details...</span>
        </div>
      )}

      {detailData && !detailLoading && (
        <div className="space-y-2 animate-in fade-in-50 slide-in-from-top-2 duration-300">
          <h2 className="text-xs font-semibold font-mono uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Analysis Results — {detailData.name}
          </h2>

          {/* Card 1: BOM Cost Rollup — Pareto Parts */}
          {bomActions.length > 0 && (
            <Card className="border-gray-200 dark:border-mrp-border overflow-hidden">
              <button
                onClick={() => togglePanel("bom")}
                className="w-full px-4 py-2.5 bg-blue-50/50 dark:bg-blue-950/20 border-b border-gray-200 dark:border-mrp-border flex items-center justify-between hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-semibold font-mono uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    BOM Cost Rollup — Pareto Parts
                  </span>
                  <Badge variant="secondary" className="text-[10px] ml-1">
                    {bomActions.length}
                  </Badge>
                </div>
                {expandedPanels.bom ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {expandedPanels.bom && (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Part Number</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Part Name</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Current Cost</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Target Cost</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Est. Savings</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bomActions.map((action) => (
                        <tr key={action.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-900/20">
                          <td className="px-3 py-1.5 font-mono text-[10px]">{action.partNumber || "—"}</td>
                          <td className="px-3 py-1.5 max-w-[200px] truncate">{action.partName || action.description}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(action.currentCost)}đ</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(action.targetCost)}đ</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-green-600 dark:text-green-400 font-medium">
                            {formatCurrency(action.annualSavings)}đ
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <Badge variant="outline" className={cn("text-[9px]", RISK_BADGE[action.riskLevel] || "")}>
                              {action.riskLevel}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] text-muted-foreground bg-gray-50/30 dark:bg-gray-900/20">
                    <span>Pareto parts covering ~80% of total cost</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      Total: {formatCurrency(bomActions.reduce((s, a) => s + a.annualSavings, 0))}đ
                    </span>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Card 2: Make vs Buy Opportunities */}
          {detailData.makeVsBuyDetails.length > 0 && (
            <Card className="border-gray-200 dark:border-mrp-border overflow-hidden">
              <button
                onClick={() => togglePanel("mvb")}
                className="w-full px-4 py-2.5 bg-purple-50/50 dark:bg-purple-950/20 border-b border-gray-200 dark:border-mrp-border flex items-center justify-between hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs font-semibold font-mono uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Make vs Buy Opportunities
                  </span>
                  <Badge variant="secondary" className="text-[10px] ml-1">
                    {detailData.makeVsBuyDetails.length}
                  </Badge>
                </div>
                {expandedPanels.mvb ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {expandedPanels.mvb && (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Part Number</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Part Name</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Buy Price</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Make Cost</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Annual Savings</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground">Score</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground">Recommendation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.makeVsBuyDetails.slice(0, 10).map((m, i) => (
                        <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-900/20">
                          <td className="px-3 py-1.5 font-mono text-[10px]">{m.partNumber}</td>
                          <td className="px-3 py-1.5 max-w-[180px] truncate">{m.partName}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(m.buyPrice)}đ</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(m.makeCostEstimate)}đ</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-green-600 dark:text-green-400 font-medium">
                            {formatCurrency(m.annualSavings)}đ
                          </td>
                          <td className="px-3 py-1.5 text-center tabular-nums font-medium">
                            {m.overallScore.toFixed(0)}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <Badge variant="outline" className={cn("text-[9px]", RECOMMENDATION_BADGE[m.recommendation] || "")}>
                              {m.recommendation.replace(/_/g, " ")}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] text-muted-foreground bg-gray-50/30 dark:bg-gray-900/20">
                    <Button
                      variant="link"
                      size="sm"
                      className="text-[10px] p-0 h-auto gap-1"
                      onClick={() => router.push("/cost-optimization/make-vs-buy")}
                    >
                      View all Make vs Buy analyses <ExternalLink className="h-3 w-3" />
                    </Button>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      Total: {formatCurrency(detailData.makeVsBuyDetails.reduce((s, m) => s + m.annualSavings, 0))}đ
                    </span>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Card 3: Substitute Parts */}
          {detailData.substituteDetails.length > 0 && (
            <Card className="border-gray-200 dark:border-mrp-border overflow-hidden">
              <button
                onClick={() => togglePanel("substitutes")}
                className="w-full px-4 py-2.5 bg-orange-50/50 dark:bg-orange-950/20 border-b border-gray-200 dark:border-mrp-border flex items-center justify-between hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                    <Package className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-xs font-semibold font-mono uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Substitute Parts
                  </span>
                  <Badge variant="secondary" className="text-[10px] ml-1">
                    {detailData.substituteDetails.length}
                  </Badge>
                </div>
                {expandedPanels.substitutes ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {expandedPanels.substitutes && (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Original Part</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Substitute Part</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Original Price</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Substitute Price</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Savings %</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground">Compat.</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.substituteDetails.slice(0, 10).map((s, i) => (
                        <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-900/20">
                          <td className="px-3 py-1.5">
                            <div className="font-mono text-[10px]">{s.originalPartNumber}</div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{s.originalPartName}</div>
                          </td>
                          <td className="px-3 py-1.5">
                            <div className="font-mono text-[10px]">{s.substitutePartNumber}</div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{s.substitutePartName}</div>
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(s.originalPrice)}đ</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(s.substitutePrice)}đ</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-green-600 dark:text-green-400 font-medium">
                            {s.savingsPercent.toFixed(1)}%
                          </td>
                          <td className="px-3 py-1.5 text-center tabular-nums">
                            {s.compatibilityScore.toFixed(0)}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <Badge variant="outline" className={cn("text-[9px]", RISK_BADGE[s.riskLevel] || "")}>
                              {s.riskLevel}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] text-muted-foreground bg-gray-50/30 dark:bg-gray-900/20">
                    <Button
                      variant="link"
                      size="sm"
                      className="text-[10px] p-0 h-auto gap-1"
                      onClick={() => router.push("/cost-optimization/substitutes")}
                    >
                      View all Substitute evaluations <ExternalLink className="h-3 w-3" />
                    </Button>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      Avg savings: {(detailData.substituteDetails.reduce((s, x) => s + x.savingsPercent, 0) / detailData.substituteDetails.length).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Card 4: Supplier Optimization */}
          {supplierActions.length > 0 && (
            <Card className="border-gray-200 dark:border-mrp-border overflow-hidden">
              <button
                onClick={() => togglePanel("supplier")}
                className="w-full px-4 py-2.5 bg-green-50/50 dark:bg-green-950/20 border-b border-gray-200 dark:border-mrp-border flex items-center justify-between hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <Truck className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-xs font-semibold font-mono uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Supplier Optimization
                  </span>
                  <Badge variant="secondary" className="text-[10px] ml-1">
                    {supplierActions.length}
                  </Badge>
                </div>
                {expandedPanels.supplier ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {expandedPanels.supplier && (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Current Spend</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Potential Savings</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierActions.map((action) => (
                        <tr key={action.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-900/20">
                          <td className="px-3 py-1.5 max-w-[300px] truncate">{action.description}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(action.currentCost)}đ</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-green-600 dark:text-green-400 font-medium">
                            {formatCurrency(action.annualSavings)}đ
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <Badge variant="outline" className={cn("text-[9px]", RISK_BADGE[action.riskLevel] || "")}>
                              {action.riskLevel}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] text-muted-foreground bg-gray-50/30 dark:bg-gray-900/20">
                    <Button
                      variant="link"
                      size="sm"
                      className="text-[10px] p-0 h-auto gap-1"
                      onClick={() => router.push("/cost-optimization/suppliers")}
                    >
                      View Supplier details <ExternalLink className="h-3 w-3" />
                    </Button>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      Total: {formatCurrency(supplierActions.reduce((s, a) => s + a.annualSavings, 0))}đ
                    </span>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* History */}
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" />
            Analysis History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={runs}
            columns={columns}
            keyField="id"
            loading={loading}
            emptyMessage="No analysis runs yet. Run your first cost analysis above."
            pagination
            pageSize={10}
            searchable={false}
            stickyHeader
            excelMode={{
              enabled: true,
              showRowNumbers: true,
              columnHeaderStyle: "field-names",
              gridBorders: true,
              showFooter: true,
              sheetName: "Cost Analysis Runs",
              compactMode: true,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
