'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowUp,
  ArrowDown,
  Minus,
  DollarSign,
  Package,
  Truck,
  Factory,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface ImpactMetric {
  label: string;
  baseline: number;
  simulated: number;
  unit?: string;
  format?: 'number' | 'currency' | 'percent';
  invertChange?: boolean; // If true, decrease is good (e.g., costs)
}

interface FinancialImpact {
  revenueLoss: number;
  additionalCosts: number;
  inventoryCarryingCost: number;
  expeditingCost: number;
  totalImpact: number;
}

interface OperationalImpact {
  stockoutRisk: number;
  capacityUtilization: number;
  onTimeDeliveryRate: number;
  leadTimeImpact: number;
}

interface RiskImpact {
  overallRiskScore: number;
  criticalAlerts: number;
  warnings: number;
}

interface ImpactComparisonProps {
  baseline: {
    demand: number;
    supply: number;
    inventory: number;
    capacity: number;
  };
  simulated: {
    demand: number;
    supply: number;
    inventory: number;
    capacity: number;
  };
  financialImpact?: FinancialImpact;
  operationalImpact?: OperationalImpact;
  riskImpact?: RiskImpact;
}

export function ImpactComparison({
  baseline,
  simulated,
  financialImpact,
  operationalImpact,
  riskImpact,
}: ImpactComparisonProps) {
  const formatNumber = (value: number, format: 'number' | 'currency' | 'percent' = 'number') => {
    if (format === 'currency') {
      if (Math.abs(value) >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M VND`;
      }
      if (Math.abs(value) >= 1000) {
        return `${(value / 1000).toFixed(1)}K VND`;
      }
      return `${value.toLocaleString()} VND`;
    }
    if (format === 'percent') {
      return `${value.toFixed(1)}%`;
    }
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  const calculateChange = (baseline: number, simulated: number) => {
    if (baseline === 0) return { value: 0, percent: 0 };
    const value = simulated - baseline;
    const percent = (value / baseline) * 100;
    return { value, percent };
  };

  const renderChangeIndicator = (
    change: { value: number; percent: number },
    invertChange = false
  ) => {
    const isPositive = change.value > 0;
    const isGood = invertChange ? !isPositive : isPositive;

    if (Math.abs(change.percent) < 0.1) {
      return (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Minus className="h-4 w-4" />
          <span className="text-sm">No change</span>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-1 ${isGood ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          {isPositive ? '+' : ''}
          {change.percent.toFixed(1)}%
        </span>
      </div>
    );
  };

  const metrics: ImpactMetric[] = [
    { label: 'Demand', baseline: baseline.demand, simulated: simulated.demand },
    { label: 'Supply', baseline: baseline.supply, simulated: simulated.supply },
    { label: 'Inventory', baseline: baseline.inventory, simulated: simulated.inventory },
    { label: 'Capacity', baseline: baseline.capacity, simulated: simulated.capacity, format: 'percent' },
  ];

  return (
    <div className="space-y-6">
      {/* Core Metrics Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Baseline vs Simulated
          </CardTitle>
          <CardDescription>
            Key metric changes from baseline to simulated scenario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map((metric) => {
              const change = calculateChange(metric.baseline, metric.simulated);
              return (
                <div key={metric.label} className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">Baseline</span>
                      <span className="text-sm">{formatNumber(metric.baseline, metric.format)}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">Simulated</span>
                      <span className="text-lg font-bold">
                        {formatNumber(metric.simulated, metric.format)}
                      </span>
                    </div>
                    <div className="pt-1 border-t">
                      {renderChangeIndicator(change, metric.invertChange)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Financial Impact */}
      {financialImpact && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Financial Impact
            </CardTitle>
            <CardDescription>
              Estimated financial implications of the scenario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Revenue Loss</p>
                <p className="text-xl font-bold text-red-600">
                  {formatNumber(financialImpact.revenueLoss, 'currency')}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Additional Costs</p>
                <p className="text-xl font-bold text-red-600">
                  {formatNumber(financialImpact.additionalCosts, 'currency')}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Inventory Carrying</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatNumber(financialImpact.inventoryCarryingCost, 'currency')}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Expediting Cost</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatNumber(financialImpact.expeditingCost, 'currency')}
                </p>
              </div>
              <div className="p-4 border rounded-lg bg-red-50">
                <p className="text-sm text-muted-foreground">Total Impact</p>
                <p className="text-xl font-bold text-red-700">
                  {formatNumber(financialImpact.totalImpact, 'currency')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Operational Impact */}
      {operationalImpact && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5 text-purple-500" />
              Operational Impact
            </CardTitle>
            <CardDescription>
              Impact on operational KPIs and service levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Stockout Risk</span>
                  <span className="text-sm font-medium">{operationalImpact.stockoutRisk}%</span>
                </div>
                <Progress
                  value={operationalImpact.stockoutRisk}
                  className={`h-2 ${operationalImpact.stockoutRisk > 20 ? 'bg-red-100' : 'bg-gray-100'}`}
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Capacity Utilization</span>
                  <span className="text-sm font-medium">{operationalImpact.capacityUtilization}%</span>
                </div>
                <Progress
                  value={operationalImpact.capacityUtilization}
                  className={`h-2 ${operationalImpact.capacityUtilization > 90 ? 'bg-red-100' : 'bg-gray-100'}`}
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">On-Time Delivery</span>
                  <span className="text-sm font-medium">{operationalImpact.onTimeDeliveryRate}%</span>
                </div>
                <Progress
                  value={operationalImpact.onTimeDeliveryRate}
                  className={`h-2 ${operationalImpact.onTimeDeliveryRate < 95 ? 'bg-yellow-100' : 'bg-gray-100'}`}
                />
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Lead Time Impact</span>
                  <Badge variant={operationalImpact.leadTimeImpact > 0 ? 'destructive' : 'default'}>
                    {operationalImpact.leadTimeImpact > 0 ? '+' : ''}
                    {operationalImpact.leadTimeImpact} days
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Impact */}
      {riskImpact && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Risk Assessment
            </CardTitle>
            <CardDescription>
              Overall risk score and alert counts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-2">Risk Score</p>
                <div
                  className={`text-3xl font-bold ${
                    riskImpact.overallRiskScore > 70
                      ? 'text-red-600'
                      : riskImpact.overallRiskScore > 40
                      ? 'text-orange-600'
                      : 'text-green-600'
                  }`}
                >
                  {riskImpact.overallRiskScore}
                </div>
                <p className="text-xs text-muted-foreground mt-1">out of 100</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-2">Critical Alerts</p>
                <div className="text-3xl font-bold text-red-600">
                  {riskImpact.criticalAlerts}
                </div>
                <Badge variant="destructive" className="mt-1">Critical</Badge>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-2">Warnings</p>
                <div className="text-3xl font-bold text-orange-600">
                  {riskImpact.warnings}
                </div>
                <Badge variant="outline" className="mt-1 border-orange-500 text-orange-500">
                  Warning
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
