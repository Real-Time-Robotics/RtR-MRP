"use client";

import { useState, useEffect } from "react";
import { Play, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  runScenarioSimulation,
  predefinedScenarios,
  type ScenarioResult,
} from "@/lib/ai/scenario-engine";
import { clientLogger } from '@/lib/client-logger';

interface Supplier {
  id: string;
  name: string;
}

export default function ScenariosPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [demandChange, setDemandChange] = useState(0);
  const [leadTimeIncrease, setLeadTimeIncrease] = useState(0);
  const [supplierUnavailable, setSupplierUnavailable] = useState<string>("");
  const [newOrderQty, setNewOrderQty] = useState("");
  const [result, setResult] = useState<ScenarioResult | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers");
      const response = await res.json();
      // Handle paginated response format
      const supplierData = Array.isArray(response) ? response : (response.data || []);
      setSuppliers(supplierData);
    } catch (error) {
      clientLogger.error("Failed to fetch suppliers:", error);
    }
  };

  const runSimulation = () => {
    const simResult = runScenarioSimulation({
      demandChange,
      leadTimeIncrease,
      supplierUnavailable: supplierUnavailable || undefined,
      newOrderQty: newOrderQty ? parseInt(newOrderQty) : undefined,
    });
    setResult(simResult);
  };

  const applyPreset = (presetKey: keyof typeof predefinedScenarios) => {
    const preset = predefinedScenarios[presetKey];
    setDemandChange(preset.params.demandChange);
    setLeadTimeIncrease(preset.params.leadTimeIncrease);
    setSupplierUnavailable("");
    setNewOrderQty("");
  };

  const getImpactColor = (current: number, simulated: number) => {
    if (simulated > current * 1.2) return "text-red-600";
    if (simulated > current) return "text-amber-600";
    return "text-green-600";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="What-If Analysis"
        description="Simulate scenarios to understand potential impacts on your supply chain"
        backHref="/ai"
      />

      {/* Preset Scenarios */}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Quick Presets:</span>
          {Object.entries(predefinedScenarios).map(([key, preset]) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() =>
                applyPreset(key as keyof typeof predefinedScenarios)
              }
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Scenario Builder */}
        <Card>
          <CardHeader>
            <CardTitle>Scenario Builder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Demand Change */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Demand changes by:</Label>
                <span className="font-bold">
                  {demandChange > 0 ? "+" : ""}
                  {demandChange}%
                </span>
              </div>
              <Slider
                value={[demandChange]}
                onValueChange={(values: number[]) => setDemandChange(values[0])}
                min={-50}
                max={50}
                step={5}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>-50%</span>
                <span>0%</span>
                <span>+50%</span>
              </div>
            </div>

            {/* Lead Time Increase */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Lead times increase by:</Label>
                <span className="font-bold">+{leadTimeIncrease}d</span>
              </div>
              <Slider
                value={[leadTimeIncrease]}
                onValueChange={(values: number[]) => setLeadTimeIncrease(values[0])}
                min={0}
                max={30}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0d</span>
                <span>15d</span>
                <span>30d</span>
              </div>
            </div>

            {/* Supplier Unavailable */}
            <div className="space-y-2">
              <Label>Supplier unavailable:</Label>
              <Select
                value={supplierUnavailable}
                onValueChange={setSupplierUnavailable}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* New Order */}
            <div className="space-y-2">
              <Label>New order received (units):</Label>
              <Input
                type="number"
                value={newOrderQty}
                onChange={(e) => setNewOrderQty(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>

            <Button onClick={runSimulation} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              Run Simulation
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Simulation Results</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-6">
                {/* Impact Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-sm text-muted-foreground">
                        <th className="text-left py-2">Metric</th>
                        <th className="text-right py-2">Current</th>
                        <th className="text-right py-2">Simulated</th>
                        <th className="text-right py-2">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2">Stock-outs</td>
                        <td className="py-2 text-right">
                          {result.impacts.currentStockOuts}
                        </td>
                        <td
                          className={`py-2 text-right font-bold ${getImpactColor(result.impacts.currentStockOuts, result.impacts.stockOuts)}`}
                        >
                          {result.impacts.stockOuts}
                        </td>
                        <td className="py-2 text-right">
                          {result.impacts.stockOuts > result.impacts.currentStockOuts ? (
                            <Badge variant="destructive">
                              +{result.impacts.stockOuts - result.impacts.currentStockOuts}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">-</Badge>
                          )}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Orders at Risk</td>
                        <td className="py-2 text-right">
                          {result.impacts.currentOrdersAtRisk}
                        </td>
                        <td
                          className={`py-2 text-right font-bold ${getImpactColor(result.impacts.currentOrdersAtRisk, result.impacts.ordersAtRisk)}`}
                        >
                          {result.impacts.ordersAtRisk}
                        </td>
                        <td className="py-2 text-right">
                          {result.impacts.ordersAtRisk > result.impacts.currentOrdersAtRisk ? (
                            <Badge variant="destructive">
                              +{result.impacts.ordersAtRisk - result.impacts.currentOrdersAtRisk}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">-</Badge>
                          )}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Safety Coverage (days)</td>
                        <td className="py-2 text-right">
                          {result.impacts.currentSafetyCoverage}
                        </td>
                        <td
                          className={`py-2 text-right font-bold ${result.impacts.safetyCoverageDays < result.impacts.currentSafetyCoverage * 0.8 ? "text-red-600" : "text-green-600"}`}
                        >
                          {result.impacts.safetyCoverageDays}
                        </td>
                        <td className="py-2 text-right">
                          <Badge
                            variant={
                              result.impacts.safetyCoverageDays <
                              result.impacts.currentSafetyCoverage
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {result.impacts.safetyCoverageDays -
                              result.impacts.currentSafetyCoverage}
                            d
                          </Badge>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">Capital Needed</td>
                        <td className="py-2 text-right">
                          ${result.impacts.currentCapital.toLocaleString()}
                        </td>
                        <td
                          className={`py-2 text-right font-bold ${getImpactColor(result.impacts.currentCapital, result.impacts.capitalNeeded)}`}
                        >
                          ${result.impacts.capitalNeeded.toLocaleString()}
                        </td>
                        <td className="py-2 text-right">
                          <Badge
                            variant={
                              result.impacts.capitalNeeded >
                              result.impacts.currentCapital
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            +$
                            {(
                              result.impacts.capitalNeeded -
                              result.impacts.currentCapital
                            ).toLocaleString()}
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Critical Impacts */}
                {result.criticalImpacts.length > 0 && (
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Critical Impacts
                    </h4>
                    <ul className="space-y-2">
                      {result.criticalImpacts.map((impact, i) => (
                        <li
                          key={i}
                          className="text-sm p-2 bg-red-50 rounded flex items-start gap-2"
                        >
                          <span className="text-red-500">*</span>
                          {impact}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Mitigation Suggestions */}
                {result.mitigationSuggestions.length > 0 && (
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Mitigation Suggestions
                    </h4>
                    <ul className="space-y-2">
                      {result.mitigationSuggestions.map((suggestion, i) => (
                        <li
                          key={i}
                          className="text-sm p-2 bg-green-50 rounded flex items-start gap-2"
                        >
                          <span className="text-green-500">*</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Configure your scenario and click &quot;Run Simulation&quot;</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
