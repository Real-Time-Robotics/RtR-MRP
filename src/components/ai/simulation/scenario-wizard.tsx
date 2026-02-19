'use client';

import { useState, useEffect } from 'react';
import { clientLogger } from '@/lib/client-logger';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Play,
  ArrowRight,
  ArrowLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
  Zap,
  Settings2,
  AlertTriangle,
} from 'lucide-react';

interface ScenarioWizardProps {
  templateId?: string | null;
  onClose: () => void;
  onComplete: (scenario: Record<string, unknown>) => void;
}

type ScenarioType = 'demand' | 'supply' | 'capacity' | 'custom';

interface WizardState {
  step: number;
  name: string;
  description: string;
  type: ScenarioType;
  horizonDays: number;
  runMonteCarlo: boolean;
  // Demand parameters
  demandChange: number;
  rampUpWeeks: number;
  seasonalAdjustment: boolean;
  // Supply parameters
  leadTimeChange: number;
  priceChange: number;
  supplierDisruption: boolean;
  disruptionSeverity: number;
  disruptionDays: number;
  // Capacity parameters
  capacityChange: number;
  addShift: boolean;
  efficiencyChange: number;
  // Custom parameters (combined)
  customDemandChange: number;
  customSupplyChange: number;
  customCapacityChange: number;
}

const initialState: WizardState = {
  step: 1,
  name: '',
  description: '',
  type: 'demand',
  horizonDays: 90,
  runMonteCarlo: true,
  demandChange: 0,
  rampUpWeeks: 2,
  seasonalAdjustment: true,
  leadTimeChange: 0,
  priceChange: 0,
  supplierDisruption: false,
  disruptionSeverity: 50,
  disruptionDays: 14,
  capacityChange: 0,
  addShift: false,
  efficiencyChange: 0,
  customDemandChange: 0,
  customSupplyChange: 0,
  customCapacityChange: 0,
};

export function ScenarioWizard({ templateId, onClose, onComplete }: ScenarioWizardProps) {
  const [state, setState] = useState<WizardState>(initialState);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    }
  }, [templateId]);

  const loadTemplate = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/simulation/scenarios?id=' + id);
      // For templates, we use the scenarios endpoint with template data
      const templatesResponse = await fetch('/api/ai/simulation?templates=true');
      if (templatesResponse.ok) {
        const data = await templatesResponse.json();
        const template = data.templates?.find((t: { id: string; name: string; description: string; type: string }) => t.id === id);
        if (template) {
          setState((prev) => ({
            ...prev,
            name: template.name,
            description: template.description,
            type: template.type as ScenarioType,
          }));
        }
      }
    } catch (err) {
      clientLogger.error('Failed to load template', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (state.step < 3) {
      setState((prev) => ({ ...prev, step: prev.step + 1 }));
    }
  };

  const handleBack = () => {
    if (state.step > 1) {
      setState((prev) => ({ ...prev, step: prev.step - 1 }));
    }
  };

  const buildConfig = () => {
    const startDate = new Date();
    const endDate = new Date(Date.now() + state.horizonDays * 24 * 60 * 60 * 1000);

    switch (state.type) {
      case 'demand':
        return {
          type: 'demand',
          parameters: {
            demandChange: state.demandChange,
            rampUpWeeks: state.rampUpWeeks,
            seasonalAdjustment: state.seasonalAdjustment,
            startDate,
            endDate,
          },
        };
      case 'supply':
        return {
          type: 'supply',
          parameters: {
            leadTimeChange: state.leadTimeChange,
            priceChange: state.priceChange,
            supplierDisruption: state.supplierDisruption
              ? [{ supplierId: 'any', disruptionType: 'partial', severity: state.disruptionSeverity, durationDays: state.disruptionDays }]
              : undefined,
            startDate,
            endDate,
          },
        };
      case 'capacity':
        return {
          type: 'capacity',
          parameters: {
            capacityChange: state.capacityChange,
            addShift: state.addShift,
            efficiencyChange: state.efficiencyChange,
            startDate,
            endDate,
          },
        };
      case 'custom':
        return {
          type: 'custom',
          parameters: {
            name: state.name,
            description: state.description,
            demandFactors: { demandChange: state.customDemandChange },
            supplyFactors: { leadTimeChange: state.customSupplyChange },
            capacityFactors: { capacityChange: state.customCapacityChange },
          },
        };
    }
  };

  const handleRun = async () => {
    if (!state.name) {
      setError('Please enter a scenario name');
      return;
    }

    setRunning(true);
    setProgress(10);
    setError(null);

    try {
      const config = buildConfig();

      setProgress(30);

      const response = await fetch('/api/ai/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioConfig: {
            name: state.name,
            type: state.type,
            config,
            description: state.description,
            horizonDays: state.horizonDays,
          },
          runMonteCarlo: state.runMonteCarlo,
          generateAIInsight: true,
        }),
      });

      setProgress(80);

      if (response.ok) {
        const result = await response.json();
        setProgress(100);
        setTimeout(() => {
          onComplete(result);
        }, 500);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Simulation failed');
      }
    } catch (err) {
      setError('Failed to run simulation');
    } finally {
      setRunning(false);
    }
  };

  const getTypeIcon = (type: ScenarioType) => {
    switch (type) {
      case 'demand':
        return <TrendingUp className="h-5 w-5" />;
      case 'supply':
        return <TrendingDown className="h-5 w-5" />;
      case 'capacity':
        return <Zap className="h-5 w-5" />;
      case 'custom':
        return <Settings2 className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Simulation Scenario</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      state.step >= step
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step}
                  </div>
                  {step < 3 && (
                    <div
                      className={`w-20 h-1 mx-2 ${
                        state.step > step ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Basic Info */}
            {state.step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Scenario Name</Label>
                  <Input
                    id="name"
                    value={state.name}
                    onChange={(e) => setState((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Q2 Demand Surge"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={state.description}
                    onChange={(e) => setState((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the scenario..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Scenario Type</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {(['demand', 'supply', 'capacity', 'custom'] as ScenarioType[]).map((type) => (
                      <Card
                        key={type}
                        className={`cursor-pointer transition-colors ${
                          state.type === type ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => setState((prev) => ({ ...prev, type }))}
                      >
                        <CardContent className="p-4 flex items-center gap-3">
                          {getTypeIcon(type)}
                          <span className="capitalize font-medium">{type}</span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Simulation Horizon: {state.horizonDays} days</Label>
                  <Slider
                    value={[state.horizonDays]}
                    onValueChange={([v]) => setState((prev) => ({ ...prev, horizonDays: v }))}
                    min={30}
                    max={365}
                    step={30}
                    className="mt-2"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Parameters */}
            {state.step === 2 && (
              <div className="space-y-4">
                {state.type === 'demand' && (
                  <>
                    <div>
                      <Label>Demand Change: {state.demandChange > 0 ? '+' : ''}{state.demandChange}%</Label>
                      <Slider
                        value={[state.demandChange]}
                        onValueChange={([v]) => setState((prev) => ({ ...prev, demandChange: v }))}
                        min={-50}
                        max={100}
                        step={5}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Ramp-up Period: {state.rampUpWeeks} weeks</Label>
                      <Slider
                        value={[state.rampUpWeeks]}
                        onValueChange={([v]) => setState((prev) => ({ ...prev, rampUpWeeks: v }))}
                        min={0}
                        max={12}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Seasonal Adjustment</Label>
                      <Switch
                        checked={state.seasonalAdjustment}
                        onCheckedChange={(v) => setState((prev) => ({ ...prev, seasonalAdjustment: v }))}
                      />
                    </div>
                  </>
                )}

                {state.type === 'supply' && (
                  <>
                    <div>
                      <Label>Lead Time Change: {state.leadTimeChange > 0 ? '+' : ''}{state.leadTimeChange}%</Label>
                      <Slider
                        value={[state.leadTimeChange]}
                        onValueChange={([v]) => setState((prev) => ({ ...prev, leadTimeChange: v }))}
                        min={-50}
                        max={200}
                        step={10}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Price Change: {state.priceChange > 0 ? '+' : ''}{state.priceChange}%</Label>
                      <Slider
                        value={[state.priceChange]}
                        onValueChange={([v]) => setState((prev) => ({ ...prev, priceChange: v }))}
                        min={-30}
                        max={50}
                        step={5}
                        className="mt-2"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Supplier Disruption</Label>
                      <Switch
                        checked={state.supplierDisruption}
                        onCheckedChange={(v) => setState((prev) => ({ ...prev, supplierDisruption: v }))}
                      />
                    </div>
                    {state.supplierDisruption && (
                      <>
                        <div>
                          <Label>Disruption Severity: {state.disruptionSeverity}%</Label>
                          <Slider
                            value={[state.disruptionSeverity]}
                            onValueChange={([v]) => setState((prev) => ({ ...prev, disruptionSeverity: v }))}
                            min={10}
                            max={100}
                            step={10}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label>Disruption Duration: {state.disruptionDays} days</Label>
                          <Slider
                            value={[state.disruptionDays]}
                            onValueChange={([v]) => setState((prev) => ({ ...prev, disruptionDays: v }))}
                            min={7}
                            max={90}
                            step={7}
                            className="mt-2"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}

                {state.type === 'capacity' && (
                  <>
                    <div>
                      <Label>Capacity Change: {state.capacityChange > 0 ? '+' : ''}{state.capacityChange}%</Label>
                      <Slider
                        value={[state.capacityChange]}
                        onValueChange={([v]) => setState((prev) => ({ ...prev, capacityChange: v }))}
                        min={-50}
                        max={100}
                        step={5}
                        className="mt-2"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Add Additional Shift</Label>
                      <Switch
                        checked={state.addShift}
                        onCheckedChange={(v) => setState((prev) => ({ ...prev, addShift: v }))}
                      />
                    </div>
                    <div>
                      <Label>Efficiency Change: {state.efficiencyChange > 0 ? '+' : ''}{state.efficiencyChange}%</Label>
                      <Slider
                        value={[state.efficiencyChange]}
                        onValueChange={([v]) => setState((prev) => ({ ...prev, efficiencyChange: v }))}
                        min={-30}
                        max={30}
                        step={5}
                        className="mt-2"
                      />
                    </div>
                  </>
                )}

                {state.type === 'custom' && (
                  <>
                    <div>
                      <Label>Demand Factor: {state.customDemandChange > 0 ? '+' : ''}{state.customDemandChange}%</Label>
                      <Slider
                        value={[state.customDemandChange]}
                        onValueChange={([v]) => setState((prev) => ({ ...prev, customDemandChange: v }))}
                        min={-50}
                        max={100}
                        step={5}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Supply Factor (Lead Time): {state.customSupplyChange > 0 ? '+' : ''}{state.customSupplyChange}%</Label>
                      <Slider
                        value={[state.customSupplyChange]}
                        onValueChange={([v]) => setState((prev) => ({ ...prev, customSupplyChange: v }))}
                        min={-50}
                        max={100}
                        step={5}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Capacity Factor: {state.customCapacityChange > 0 ? '+' : ''}{state.customCapacityChange}%</Label>
                      <Slider
                        value={[state.customCapacityChange]}
                        onValueChange={([v]) => setState((prev) => ({ ...prev, customCapacityChange: v }))}
                        min={-50}
                        max={50}
                        step={5}
                        className="mt-2"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 3: Review & Run */}
            {state.step === 3 && (
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{state.name || 'Unnamed'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <Badge>{state.type}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Horizon</span>
                      <span>{state.horizonDays} days</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Monte Carlo</span>
                      <Switch
                        checked={state.runMonteCarlo}
                        onCheckedChange={(v) => setState((prev) => ({ ...prev, runMonteCarlo: v }))}
                      />
                    </div>
                  </CardContent>
                </Card>

                {running && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Running simulation...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={state.step === 1 ? onClose : handleBack}>
                {state.step === 1 ? 'Cancel' : (
                  <>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </>
                )}
              </Button>
              {state.step < 3 ? (
                <Button onClick={handleNext}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleRun} disabled={running}>
                  {running ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Simulation
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
