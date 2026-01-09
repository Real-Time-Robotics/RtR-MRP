"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Brain, Play, History, Loader2, AlertTriangle, Wand2 } from "lucide-react";
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
import { format } from "date-fns";
import { useLanguage } from "@/lib/i18n/language-context";
import { DataTable, Column } from "@/components/ui-v2/data-table";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("mrp.title")}</h1>
          <p className="text-muted-foreground">{t("mrp.description")}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push("/mrp/wizard")}>
            <Wand2 className="h-4 w-4 mr-2" />
            MRP Wizard
          </Button>
          <Button variant="outline" onClick={() => router.push("/mrp/shortages")}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            {t("mrp.shortages")}
          </Button>
        </div>
      </div>

      {/* Run MRP Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Run MRP Calculation (Async)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {errorMsg && (
            <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Planning Horizon</Label>
              <Select value={horizon} onValueChange={setHorizon}>
                <SelectTrigger>
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

          <div className="space-y-4">
            <Label>Include in Calculation:</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="confirmed" className="font-normal">
                  Confirmed Sales Orders
                </Label>
                <Switch
                  id="confirmed"
                  checked={includeConfirmed}
                  onCheckedChange={setIncludeConfirmed}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="draft" className="font-normal">
                  Draft Sales Orders
                </Label>
                <Switch
                  id="draft"
                  checked={includeDraft}
                  onCheckedChange={setIncludeDraft}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="safety" className="font-normal">
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

          <Button onClick={runMrp} disabled={running} size="lg">
            {running ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Queuing Job...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Queue MRP Calculation
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
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
