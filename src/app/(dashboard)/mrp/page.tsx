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
import { useLanguage } from "@/lib/i18n/language-context";
import { DataTable, Column } from "@/components/ui-v2/data-table";
import Link from "next/link";

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
    upcomingHolidays: any[];
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
      console.error("Failed to fetch forecast status:", error);
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
      setRuns(data);
    } catch (error) {
      console.error("Failed to fetch runs:", error);
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

    } catch (error: any) {
      console.error("Failed to run MRP:", error);
      setErrorMsg(error.message || "Failed to start MRP calculation");
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
      align: 'right',
      sortable: true,
      render: (value) => value || 0,
    },
    {
      key: 'purchaseSuggestions',
      header: 'Purchase',
      width: '80px',
      align: 'right',
      sortable: true,
      render: (value) => value || 0,
    },
    {
      key: 'expediteAlerts',
      header: 'Expedite',
      width: '80px',
      align: 'right',
      sortable: true,
      render: (value) => value || 0,
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      align: 'center',
      sortable: true,
      render: (value) => (
        <Badge
          variant={
            value === "completed"
              ? "default"
              : value === "failed"
                ? "destructive"
                : "secondary"
          }
          className={
            value === "running" || value === "queued"
              ? "animate-pulse"
              : ""
          }
        >
          {value === "running" ? "Running..." :
            value === "queued" ? "Queued" :
              value}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      align: 'right',
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

      {/* Run MRP Form - COMPACT */}
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5" />
            Run MRP Calculation (Async)
          </CardTitle>
        </CardHeader>
        {/* COMPACT: space-y-6 → space-y-3 */}
        <CardContent className="px-3 py-3 space-y-3">
          {errorMsg && (
            <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm font-medium">
              {errorMsg}
            </div>
          )}

          {/* COMPACT: gap-6 → gap-3 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px]">Planning Horizon</Label>
              <Select value={horizon} onValueChange={setHorizon}>
                <SelectTrigger className="h-9 text-xs">
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
          </div>

          {/* COMPACT: space-y-4 → space-y-2 */}
          <div className="space-y-2">
            <Label className="text-[11px]">Include in Calculation:</Label>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="confirmed" className="text-[11px] font-normal">
                  Confirmed Sales Orders
                </Label>
                <Switch
                  id="confirmed"
                  checked={includeConfirmed}
                  onCheckedChange={setIncludeConfirmed}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="draft" className="text-[11px] font-normal">
                  Draft Sales Orders
                </Label>
                <Switch
                  id="draft"
                  checked={includeDraft}
                  onCheckedChange={setIncludeDraft}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="safety" className="text-[11px] font-normal">
                  Include Safety Stock in calculations
                </Label>
                <Switch
                  id="safety"
                  checked={includeSafetyStock}
                  onCheckedChange={setIncludeSafetyStock}
                />
              </div>
            </div>
          </div>

          {/* AI Forecast Integration */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                <Label className="text-[11px] font-semibold">AI Forecast Integration</Label>
                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-purple-50 text-purple-700 border-purple-200">
                  NEW
                </Badge>
              </div>
              <Switch
                id="forecast"
                checked={useForecast}
                onCheckedChange={setUseForecast}
              />
            </div>

            {useForecast && (
              <div className="space-y-2 pl-5 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between">
                  <Label htmlFor="forecastWeight" className="text-[11px] font-normal">
                    Forecast Weight
                  </Label>
                  <Select value={forecastWeight} onValueChange={setForecastWeight}>
                    <SelectTrigger className="h-6 w-24 text-[10px]">
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
                    Loading forecast status...
                  </div>
                ) : forecastStatus && (
                  <div className="p-2 bg-muted/50 rounded-md space-y-1">
                    {forecastStatus.holidayBuffer > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <Calendar className="h-3 w-3 text-amber-500" />
                        <span className="text-amber-700 dark:text-amber-400">
                          Holiday buffer active: +{(forecastStatus.holidayBuffer * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                    {forecastStatus.tetPhase && forecastStatus.tetPhase !== 'normal' && (
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <TrendingUp className="h-3 w-3 text-red-500" />
                        <span className="text-red-700 dark:text-red-400">
                          Tết phase: {forecastStatus.tetPhase}
                        </span>
                      </div>
                    )}
                    {forecastStatus.upcomingHolidays?.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Next: {forecastStatus.upcomingHolidays[0]?.name} ({forecastStatus.upcomingHolidays[0]?.daysUntil} days)
                      </div>
                    )}
                  </div>
                )}

                <Link href="/ai/forecast" className="flex items-center gap-1 text-[10px] text-purple-600 hover:underline">
                  View Forecast Dashboard
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>

          {/* COMPACT: size="lg" → size="sm" */}
          <Button onClick={runMrp} disabled={running} size="sm" className="text-xs">
            {running ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Queuing Job...
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Queue MRP Calculation
              </>
            )}
          </Button>
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
