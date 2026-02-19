'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  ComposedChart,
  Line,
} from 'recharts';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  Target,
  Percent,
} from 'lucide-react';

interface Statistics {
  mean: number;
  median: number;
  stdDev: number;
  variance: number;
  min: number;
  max: number;
  skewness: number;
  kurtosis: number;
  confidenceInterval: {
    lower: number;
    upper: number;
    level: number;
  };
  percentiles: {
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
}

interface RiskMetrics {
  valueAtRisk: number;
  conditionalVaR: number;
  stockoutProbability: number;
  capacityOverloadProbability: number;
  expectedShortfall: number;
}

interface SensitivityResult {
  variable: string;
  baseValue: number;
  elasticity: number;
  impact: 'high' | 'medium' | 'low';
  correlation: number;
}

interface MonteCarloResult {
  statistics: Statistics;
  distribution: number[];
  riskMetrics: RiskMetrics;
  sensitivityAnalysis: SensitivityResult[];
  iterationCount: number;
}

interface MonteCarloChartProps {
  result: MonteCarloResult;
  title?: string;
}

export function MonteCarloChart({
  result,
  title = 'Monte Carlo Analysis',
}: MonteCarloChartProps) {
  const { statistics, distribution, riskMetrics, sensitivityAnalysis, iterationCount } = result;

  // Create histogram data from distribution
  const histogramData = useMemo(() => {
    const min = Math.min(...distribution);
    const max = Math.max(...distribution);
    const binCount = 30;
    const binWidth = (max - min) / binCount;

    const bins: { range: string; count: number; value: number }[] = [];
    for (let i = 0; i < binCount; i++) {
      const binStart = min + i * binWidth;
      const binEnd = binStart + binWidth;
      const count = distribution.filter((v) => v >= binStart && v < binEnd).length;
      bins.push({
        range: `${(binStart / 1000).toFixed(0)}K`,
        count,
        value: (binStart + binEnd) / 2,
      });
    }
    return bins;
  }, [distribution]);

  // Create confidence interval visualization data
  const confidenceData = useMemo(() => {
    const sortedDist = [...distribution].sort((a, b) => a - b);
    const step = Math.floor(sortedDist.length / 50);
    return sortedDist
      .filter((_, i) => i % step === 0)
      .map((value, i) => ({
        percentile: (i * step / sortedDist.length) * 100,
        value,
      }));
  }, [distribution]);

  // Sensitivity analysis data
  const sensitivityData = useMemo(() => {
    return sensitivityAnalysis.map((s) => ({
      variable: s.variable,
      elasticity: Math.abs(s.elasticity) * 100,
      correlation: s.correlation * 100,
      impact: s.impact,
    }));
  }, [sensitivityAnalysis]);

  const formatNumber = (value: number) => {
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((entry: { name: string; value: number; color: string }, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            {title}
          </CardTitle>
          <CardDescription>
            {iterationCount.toLocaleString()} iterations analyzed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="p-3 border rounded-lg">
              <p className="text-xs text-muted-foreground">Mean</p>
              <p className="text-lg font-bold">{formatNumber(statistics.mean)}</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-xs text-muted-foreground">Median</p>
              <p className="text-lg font-bold">{formatNumber(statistics.median)}</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-xs text-muted-foreground">Std Dev</p>
              <p className="text-lg font-bold">{formatNumber(statistics.stdDev)}</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-xs text-muted-foreground">Min</p>
              <p className="text-lg font-bold">{formatNumber(statistics.min)}</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-xs text-muted-foreground">Max</p>
              <p className="text-lg font-bold">{formatNumber(statistics.max)}</p>
            </div>
            <div className="p-3 border rounded-lg bg-blue-50">
              <p className="text-xs text-muted-foreground">
                {statistics.confidenceInterval.level}% CI
              </p>
              <p className="text-sm font-bold">
                {formatNumber(statistics.confidenceInterval.lower)} -{' '}
                {formatNumber(statistics.confidenceInterval.upper)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <Tabs defaultValue="distribution" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="confidence">Confidence</TabsTrigger>
          <TabsTrigger value="risk">Risk Metrics</TabsTrigger>
          <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>
        </TabsList>

        {/* Distribution Histogram */}
        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Outcome Distribution</CardTitle>
              <CardDescription>
                Histogram of simulated outcomes across {iterationCount} iterations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={histogramData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine
                    x={histogramData.findIndex(
                      (d) => Math.abs(d.value - statistics.mean) === Math.min(
                        ...histogramData.map((h) => Math.abs(h.value - statistics.mean))
                      )
                    )}
                    stroke="#ef4444"
                    strokeDasharray="5 5"
                    label={{ value: 'Mean', position: 'top', fontSize: 10 }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#30a46c"
                    name="Frequency"
                    radius={[2, 2, 0, 0]}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-8 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded" />
                  <span>Frequency</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 border-t-2 border-red-500 border-dashed" />
                  <span>Mean ({formatNumber(statistics.mean)})</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Confidence Interval */}
        <TabsContent value="confidence">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cumulative Distribution</CardTitle>
              <CardDescription>
                Percentile distribution showing confidence intervals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={confidenceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="percentile"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={formatNumber} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={statistics.percentiles.p5} stroke="#ef4444" strokeDasharray="3 3" />
                  <ReferenceLine y={statistics.percentiles.p50} stroke="#22c55e" strokeDasharray="3 3" />
                  <ReferenceLine y={statistics.percentiles.p95} stroke="#ef4444" strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#8b5cf6"
                    fill="#8b5cf680"
                    name="Value"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-7 gap-2 mt-4 text-xs">
                {Object.entries(statistics.percentiles).map(([key, value]) => (
                  <div key={key} className="p-2 border rounded text-center">
                    <p className="text-muted-foreground uppercase">{key}</p>
                    <p className="font-medium">{formatNumber(value)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Metrics */}
        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Risk Metrics
              </CardTitle>
              <CardDescription>
                Key risk indicators from Monte Carlo simulation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-red-500" />
                    <p className="text-sm text-muted-foreground">Value at Risk (95%)</p>
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {formatNumber(riskMetrics.valueAtRisk)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    5% chance of loss exceeding this value
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                    <p className="text-sm text-muted-foreground">Conditional VaR (CVaR)</p>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatNumber(riskMetrics.conditionalVaR)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Expected loss in worst 5% scenarios
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <p className="text-sm text-muted-foreground">Expected Shortfall</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatNumber(riskMetrics.expectedShortfall)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average shortfall amount
                  </p>
                </div>
                <div className="p-4 border rounded-lg bg-red-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Percent className="h-4 w-4 text-red-500" />
                    <p className="text-sm text-muted-foreground">Stockout Probability</p>
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {formatPercent(riskMetrics.stockoutProbability)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Chance of inventory stockout
                  </p>
                </div>
                <div className="p-4 border rounded-lg bg-orange-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Percent className="h-4 w-4 text-orange-500" />
                    <p className="text-sm text-muted-foreground">Capacity Overload Prob.</p>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatPercent(riskMetrics.capacityOverloadProbability)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Chance of exceeding capacity
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sensitivity Analysis */}
        <TabsContent value="sensitivity">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sensitivity Analysis</CardTitle>
              <CardDescription>
                Impact of input variable changes on simulation outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={sensitivityData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="variable" tick={{ fontSize: 12 }} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="elasticity"
                    fill="#30a46c"
                    name="Elasticity %"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {sensitivityAnalysis.map((item) => (
                  <div
                    key={item.variable}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <span className="font-medium">{item.variable}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        Correlation: {(item.correlation * 100).toFixed(1)}%
                      </span>
                      <Badge className={getImpactColor(item.impact)}>
                        {item.impact} impact
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
