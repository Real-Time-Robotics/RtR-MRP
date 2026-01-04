"use client";

import { useState, useEffect } from "react";
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

  // MRP Parameters
  const [horizon, setHorizon] = useState("90");
  const [includeConfirmed, setIncludeConfirmed] = useState(true);
  const [includeDraft, setIncludeDraft] = useState(true);
  const [includeSafetyStock, setIncludeSafetyStock] = useState(true);

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mrp");
      const data = await res.json();
      setRuns(data);
    } catch (error) {
      console.error("Failed to fetch runs:", error);
    } finally {
      setLoading(false);
    }
  };

  const runMrp = async () => {
    setRunning(true);
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
      router.push(`/mrp/${data.id}`);
    } catch (error) {
      console.error("Failed to run MRP:", error);
    } finally {
      setRunning(false);
    }
  };

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
            Run MRP Calculation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
                Running MRP...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run MRP Calculation
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
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : runs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No MRP runs yet. Run your first MRP calculation above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-sm text-muted-foreground">
                    <th className="text-left py-3 px-4">Run #</th>
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-right py-3 px-4">Parts</th>
                    <th className="text-right py-3 px-4">Purchase</th>
                    <th className="text-right py-3 px-4">Expedite</th>
                    <th className="text-center py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono">{run.runNumber}</td>
                      <td className="py-3 px-4">
                        {format(new Date(run.runDate), "MMM dd, yyyy")}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {run.totalParts || 0}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {run.purchaseSuggestions || 0}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {run.expediteAlerts || 0}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            run.status === "completed" ? "default" : "secondary"
                          }
                        >
                          {run.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/mrp/${run.id}`)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
