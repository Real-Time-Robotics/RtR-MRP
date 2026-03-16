"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calculator,
  Search,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CostBreakdownChart, CostRollupStatus, VarianceCard } from "@/components/finance";
import { EntityTooltip } from "@/components/entity-tooltip";
import { clientLogger } from '@/lib/client-logger';

interface CostRollup {
  partId: string;
  part: { partNumber: string; name: string; category: string };
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  subcontractCost: number;
  otherCost: number;
  totalCost: number;
  bomLevel: number;
  isStale: boolean;
  lastRollupAt: string;
}

interface RollupStatus {
  totalParts: number;
  rolledUpParts: number;
  staleParts: number;
  lastRollupAt?: string;
}

interface Variance {
  id: string;
  workOrder: { orderNumber: string };
  varianceType: string;
  standardValue: number;
  actualValue: number;
  varianceAmount: number;
  variancePercent: number;
  favorability: string;
  createdAt: string;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
    </div>
  );
}

function CostingContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "costs";

  const [tab, setTab] = useState(initialTab);
  const [rollups, setRollups] = useState<CostRollup[]>([]);
  const [status, setStatus] = useState<RollupStatus | null>(null);
  const [variances, setVariances] = useState<Variance[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [runningRollup, setRunningRollup] = useState(false);
  const [selectedPart, setSelectedPart] = useState<CostRollup | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rollupsRes, statusRes, variancesRes] = await Promise.all([
        fetch("/api/finance/costing"),
        fetch("/api/finance/costing?action=status"),
        fetch("/api/finance/reports?report=variance-summary"),
      ]);

      if (rollupsRes.ok) {
        const data = await rollupsRes.json();
        setRollups(data.rollups || []);
      }

      if (statusRes.ok) {
        const data = await statusRes.json();
        setStatus(data);
      }

      if (variancesRes.ok) {
        const data = await variancesRes.json();
        setVariances(data.data?.variances || []);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch costing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const runFullRollup = async () => {
    setRunningRollup(true);
    try {
      const res = await fetch("/api/finance/costing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runAll: true }),
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      clientLogger.error("Failed to run rollup:", error);
    } finally {
      setRunningRollup(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const filteredRollups = rollups.filter(
    (r) =>
      r.part.partNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.part.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Costing & Variance Analysis"
        description="Standard costs, BOM rollup, and variance tracking"
      />

      {/* Status Card */}
      <CostRollupStatus
        totalParts={status?.totalParts || 0}
        rolledUpParts={status?.rolledUpParts || 0}
        staleParts={status?.staleParts || 0}
        lastRollupAt={status?.lastRollupAt}
        isRunning={runningRollup}
        onRunRollup={runFullRollup}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="costs">Standard Costs</TabsTrigger>
          <TabsTrigger value="variance">Variance Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="costs" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search parts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Cost Table */}
            <div className="col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Part Cost Rollups
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Part Number</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">Material</TableHead>
                          <TableHead className="text-right">Labor</TableHead>
                          <TableHead className="text-right">Overhead</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRollups.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              No cost data found. Run a cost rollup to calculate costs.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredRollups.map((rollup) => (
                            <TableRow
                              key={rollup.partId}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setSelectedPart(rollup)}
                            >
                              <TableCell className="font-mono font-medium">
                                <EntityTooltip type="part" id={rollup.partId}>
                                  <span className="cursor-help">{rollup.part.partNumber}</span>
                                </EntityTooltip>
                              </TableCell>
                              <TableCell>{rollup.part.name}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(rollup.materialCost)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(rollup.laborCost)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(rollup.overheadCost)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(rollup.totalCost)}
                              </TableCell>
                              <TableCell>
                                {rollup.isStale ? (
                                  <Badge variant="outline" className="text-warning-600">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Stale
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-success-600">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Current
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cost Breakdown */}
            <div>
              {selectedPart ? (
                <CostBreakdownChart
                  title={`${selectedPart.part.partNumber} Cost Breakdown`}
                  costs={{
                    materialCost: selectedPart.materialCost,
                    laborCost: selectedPart.laborCost,
                    overheadCost: selectedPart.overheadCost,
                    subcontractCost: selectedPart.subcontractCost,
                    otherCost: selectedPart.otherCost,
                    totalCost: selectedPart.totalCost,
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground py-12">
                      <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Select a part to view cost breakdown</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="variance" className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <VarianceCard
              title="Material Price Variance"
              standardValue={0}
              actualValue={0}
              variance={0}
              varianceType="NONE"
              description="(Standard - Actual Price) x Actual Qty"
            />
            <VarianceCard
              title="Material Usage Variance"
              standardValue={0}
              actualValue={0}
              variance={0}
              varianceType="NONE"
              description="(Standard - Actual Qty) x Standard Price"
            />
            <VarianceCard
              title="Labor Rate Variance"
              standardValue={0}
              actualValue={0}
              variance={0}
              varianceType="NONE"
              unit="hrs"
              description="(Standard - Actual Rate) x Actual Hours"
            />
            <VarianceCard
              title="Labor Efficiency Variance"
              standardValue={0}
              actualValue={0}
              variance={0}
              varianceType="NONE"
              unit="hrs"
              description="(Standard - Actual Hours) x Standard Rate"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Variance History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Work Order</TableHead>
                      <TableHead>Variance Type</TableHead>
                      <TableHead className="text-right">Standard</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead>Favorability</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No variance data. Variances are calculated when work orders are completed.
                        </TableCell>
                      </TableRow>
                    ) : (
                      variances.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono">
                            {v.workOrder.orderNumber}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {v.varianceType.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(v.standardValue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(v.actualValue)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                v.favorability === "FAVORABLE"
                                  ? "text-success-600"
                                  : v.favorability === "UNFAVORABLE"
                                  ? "text-danger-600"
                                  : ""
                              }
                            >
                              {formatCurrency(v.varianceAmount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {v.favorability === "FAVORABLE" ? (
                              <Badge className="bg-success-100 text-success-800">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Favorable
                              </Badge>
                            ) : v.favorability === "UNFAVORABLE" ? (
                              <Badge className="bg-danger-100 text-danger-800">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                Unfavorable
                              </Badge>
                            ) : (
                              <Badge variant="secondary">None</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(v.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function CostingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CostingContent />
    </Suspense>
  );
}
