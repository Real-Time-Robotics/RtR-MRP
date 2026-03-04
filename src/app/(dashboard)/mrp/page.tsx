"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Brain, Play, History, Loader2, AlertTriangle, Wand2, TrendingUp, Calendar, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/language-context";
import { DataTable, Column } from "@/components/ui-v2/data-table";
import Link from "next/link";
import { clientLogger } from '@/lib/client-logger';

interface MrpRun {
  id: string;
  runNumber: string;
  runDate: string;
  planningHorizon: number;
  status: string;
  totalParts: number | null;
  purchaseSuggestions: number | null;
  expediteAlerts: number | null;
  shortageWarnings: number | null;
  completedAt: string | null;
}

export default function MrpPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [runs, setRuns] = useState<MrpRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // MRP Parameters
  const [horizon, setHorizon] = useState("90");
  const [includeConfirmed, setIncludeConfirmed] = useState(true);
  const [includeDraft, setIncludeDraft] = useState(true);
  const [includeSafetyStock, setIncludeSafetyStock] = useState(true);

  // Forecast Integration
  const [useForecast, setUseForecast] = useState(false);
  const [forecastWeight, setForecastWeight] = useState("0.5");
  const [forecastStatus, setForecastStatus] = useState<{
    holidayBuffer: number;
    tetPhase: string | null;
    upcomingHolidays: Array<{ name: string; date: string; daysUntil?: number }>;
  } | null>(null);
  const [loadingForecastStatus, setLoadingForecastStatus] = useState(false);

  // Fetch forecast status
  const fetchForecastStatus = useCallback(async () => {
    if (!useForecast) return;
    setLoadingForecastStatus(true);
    try {
      const res = await fetch("/api/ai/forecast/mrp-integration?action=summary");
      const data = await res.json();
      if (data.success) {
        setForecastStatus(data.data.holidayStatus);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch forecast status:", error);
    } finally {
      setLoadingForecastStatus(false);
    }
  }, [useForecast]);

  useEffect(() => {
    if (useForecast) {
      fetchForecastStatus();
    }
  }, [useForecast, fetchForecastStatus]);

  // Initial fetch
  useEffect(() => {
    fetchRuns();
  }, []);

  // Poll for status updates if any run is active
  useEffect(() => {
    const hasActiveRuns = runs.some(
      (r) => r.status === "queued" || r.status === "running"
    );

    let intervalId: NodeJS.Timeout;

    if (hasActiveRuns) {
      intervalId = setInterval(() => {
        fetchRuns(true); // silent fetch
      }, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [runs]);

  const fetchRuns = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/mrp");
      const data = await res.json();
      setRuns(Array.isArray(data) ? data : []);
    } catch (error) {
      clientLogger.error("Failed to fetch runs:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const runMrp = async () => {
    setRunning(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/mrp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planningHorizonDays: parseInt(horizon),
          includeConfirmed,
          includeDraft,
          includeSafetyStock,
          // AI Forecast options
          useForecast,
          forecastWeight: parseFloat(forecastWeight),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to run MRP");
      }

      // Don't redirect immediately. Just Add to list (or re-fetch) and let polling take over.
      // Optimistic update or just fetch
      await fetchRuns(true);

    } catch (error: unknown) {
      clientLogger.error("Failed to run MRP:", error);
      setErrorMsg(error instanceof Error ? error.message : "Failed to start MRP calculation");
    } finally {
      setRunning(false);
    }
  };

  // Column definitions for MRP Runs DataTable
  const columns: Column<MrpRun>[] = useMemo(() => [
    {
      key: 'runNumber',
      header: 'Run #',
      width: '150px',
      sortable: true,
      render: (value) => <span className="font-mono">{value}</span>,
    },
    {
      key: 'runDate',
      header: 'Date',
      width: '150px',
      sortable: true,
      render: (value) => format(new Date(value), "MMM dd, yyyy HH:mm"),
    },
    {
      key: 'totalParts',
      header: 'Parts',
      width: '80px',
      sortable: true,
      render: (value) => value || 0,
    },
    {
      key: 'purchaseSuggestions',
      header: 'Purchase',
      width: '80px',
      sortable: true,
      render: (value) => value || 0,
    },
    {
      key: 'expediteAlerts',
      header: 'Expedite',
      width: '80px',
      sortable: true,
      render: (value) => value || 0,
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      sortable: true,
      cellClassName: (value) => {
        const map: Record<string, string> = {
          completed: 'bg-green-100 dark:bg-green-900/30',
          failed: 'bg-red-100 dark:bg-red-900/30',
          running: 'bg-blue-100 dark:bg-blue-900/30',
          queued: 'bg-yellow-100 dark:bg-yellow-900/30',
        };
        return map[value] || 'bg-gray-50 dark:bg-gray-800';
      },
      render: (value) => (
        <span className={cn("text-xs font-medium", (value === "running" || value === "queued") && "animate-pulse")}>
          {value === "running" ? "Running..." : value === "queued" ? "Queued" : value}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/mrp/${row.id}`)}
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
          {/* COMPACT: text-base, font-mono uppercase, Industrial colors */}
          <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-[#e8eaed]">{t("mrp.title")}</h1>
          <p className="text-[11px] text-gray-500 dark:text-[#8b9ab0]">{t("mrp.description")}</p>
        </div>
        {/* COMPACT: gap-2 → gap-1.5, smaller buttons */}
        <div className="flex gap-1.5">
          <Button size="sm" className="text-xs" onClick={() => router.push("/mrp/wizard")}>
            <Wand2 className="h-3.5 w-3.5 mr-1.5" />
            MRP Wizard
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => router.push("/mrp/shortages")}>
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
            {t("mrp.shortages")}
          </Button>
        </div>
      </div>

      {/* Run MRP Form */}
      <Card className="border-gray-200 dark:border-mrp-border overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-mrp-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
              <Brain className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-xs font-semibold font-mono uppercase tracking-wider text-gray-700 dark:text-gray-300">
              MRP Calculation
            </span>
          </div>
          <Button onClick={runMrp} disabled={running} size="sm" className="text-[11px] px-3 gap-1.5">
            {running ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Queuing...
              </>
            ) : (
              <>
                <Play className="h-3 w-3" />
                Run MRP
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
            {/* Left Column: Parameters */}
            <div className="pr-4 space-y-3">
              {/* Planning Horizon */}
              <div className="flex items-center justify-between gap-3">
                <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Planning Horizon</Label>
                <Select value={horizon} onValueChange={setHorizon}>
                  <SelectTrigger className="h-7 w-28 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Toggles */}
              <div className="space-y-0">
                <div className="flex items-center justify-between py-1.5 group">
                  <Label htmlFor="confirmed" className="text-[11px] font-normal text-muted-foreground group-hover:text-foreground transition-colors cursor-pointer">
                    Confirmed Orders
                  </Label>
                  <Switch
                    id="confirmed"
                    checked={includeConfirmed}
                    onCheckedChange={setIncludeConfirmed}
                    className="scale-[0.8] origin-right"
                  />
                </div>
                <div className="flex items-center justify-between py-1.5 group">
                  <Label htmlFor="draft" className="text-[11px] font-normal text-muted-foreground group-hover:text-foreground transition-colors cursor-pointer">
                    Draft Orders
                  </Label>
                  <Switch
                    id="draft"
                    checked={includeDraft}
                    onCheckedChange={setIncludeDraft}
                    className="scale-[0.8] origin-right"
                  />
                </div>
                <div className="flex items-center justify-between py-1.5 group">
                  <Label htmlFor="safety" className="text-[11px] font-normal text-muted-foreground group-hover:text-foreground transition-colors cursor-pointer">
                    Safety Stock
                  </Label>
                  <Switch
                    id="safety"
                    checked={includeSafetyStock}
                    onCheckedChange={setIncludeSafetyStock}
                    className="scale-[0.8] origin-right"
                  />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-full bg-gray-200 dark:bg-gray-800" />

            {/* Right Column: AI Forecast */}
            <div className="pl-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-purple-500" />
                  <Label className="text-[11px] font-medium">AI Forecast</Label>
                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 leading-none bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800">
                    NEW
                  </Badge>
                </div>
                <Switch
                  id="forecast"
                  checked={useForecast}
                  onCheckedChange={setUseForecast}
                  className="scale-[0.8] origin-right"
                />
              </div>

              {useForecast ? (
                <div className="space-y-2.5 animate-in fade-in-50 slide-in-from-top-1 duration-200">
                  {/* Forecast Weight */}
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="forecastWeight" className="text-[11px] font-normal text-muted-foreground">
                      Weight
                    </Label>
                    <Select value={forecastWeight} onValueChange={setForecastWeight}>
                      <SelectTrigger className="h-7 w-32 text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.3">30% (Low)</SelectItem>
                        <SelectItem value="0.5">50% (Balanced)</SelectItem>
                        <SelectItem value="0.7">70% (High)</SelectItem>
                        <SelectItem value="1.0">100% (Full)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Forecast Status */}
                  {loadingForecastStatus ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading status...
                    </div>
                  ) : forecastStatus && (
                    <div className="p-2 bg-muted/40 rounded-md space-y-1">
                      {forecastStatus.holidayBuffer > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <Calendar className="h-3 w-3 text-amber-500" />
                          <span className="text-amber-700 dark:text-amber-400">
                            Holiday buffer +{(forecastStatus.holidayBuffer * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                      {forecastStatus.tetPhase && forecastStatus.tetPhase !== 'normal' && (
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <TrendingUp className="h-3 w-3 text-red-500" />
                          <span className="text-red-700 dark:text-red-400">
                            Tết: {forecastStatus.tetPhase}
                          </span>
                        </div>
                      )}
                      {forecastStatus.upcomingHolidays?.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {forecastStatus.upcomingHolidays[0]?.name} ({forecastStatus.upcomingHolidays[0]?.daysUntil}d)
                        </div>
                      )}
                    </div>
                  )}

                  <Link href="/ai/forecast" className="inline-flex items-center gap-1 text-[10px] text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:underline">
                    Forecast Dashboard
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                  Enable to blend AI demand forecasts with order-based MRP calculations for improved accuracy.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Runs - COMPACT */}
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" />
            Recent MRP Runs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={runs}
            columns={columns}
            keyField="id"
            loading={loading}
            emptyMessage="No MRP runs yet. Run your first MRP calculation above."
            pagination
            pageSize={10}
            searchable={false}
            stickyHeader
            excelMode={{
              enabled: true,
              showRowNumbers: true,
              columnHeaderStyle: 'field-names',
              gridBorders: true,
              showFooter: true,
              sheetName: 'MRP Runs',
              compactMode: true,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
