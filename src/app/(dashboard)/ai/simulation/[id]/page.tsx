'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Brain,
  BarChart3,
  Target,
  Loader2,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { clientLogger } from '@/lib/client-logger';

// Lazy-load heavy simulation visualization components
const ImpactComparison = dynamic(
  () => import('@/components/ai/simulation/impact-comparison').then(mod => mod.ImpactComparison),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted h-64 rounded-lg" />,
  }
);

const BottleneckAnalysis = dynamic(
  () => import('@/components/ai/simulation/bottleneck-analysis').then(mod => mod.BottleneckAnalysis),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted h-64 rounded-lg" />,
  }
);

// Lazy-load heavy chart components (recharts ~500KB)
const SimulationResultsChart = dynamic(
  () => import('@/components/ai/simulation/simulation-results-chart').then(mod => mod.SimulationResultsChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[400px] bg-muted/50 rounded-xl animate-pulse">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

const MonteCarloChart = dynamic(
  () => import('@/components/ai/simulation/monte-carlo-chart').then(mod => mod.MonteCarloChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[400px] bg-muted/50 rounded-xl animate-pulse">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface SimulationBaseline {
  demand: number;
  supply: number;
  inventory: number;
  capacity: number;
  serviceLevel: number;
  capacityUtilization: number;
}

interface SimulationSimulated {
  demand: number;
  supply: number;
  inventory: number;
  capacity: number;
  serviceLevel: number;
  capacityUtilization: number;
  stockoutRisk: number;
}

interface SimulationImpacts {
  serviceLevelChange: number;
  capacityUtilizationChange: number;
  costChangePercent: number;
  costChange: number;
}

interface SimulationTimelinePoint {
  week: number;
  date: string;
  demand: number;
  supply: number;
  inventory: number;
  capacityUsed: number;
  capacityAvailable: number;
  stockouts: number;
}

interface SimulationAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  week: number;
  metric: string;
  threshold: number;
  actualValue: number;
  recommendedAction: string;
}

interface SimulationBottleneck {
  id: string;
  type: 'resource' | 'supplier' | 'capacity' | 'inventory' | 'workforce';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  affectedWeeks: number[];
  utilizationRate?: number;
  recommendation: string;
}

interface MonteCarloStatistics {
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

interface MonteCarloRiskMetrics {
  valueAtRisk: number;
  conditionalVaR: number;
  stockoutProbability: number;
  capacityOverloadProbability: number;
  expectedShortfall: number;
}

interface MonteCarloSensitivityResult {
  variable: string;
  baseValue: number;
  elasticity: number;
  impact: 'high' | 'medium' | 'low';
  correlation: number;
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

interface ImpactAnalysisRecommendation {
  category: string;
  action: string;
  priority: string;
  expectedImpact: string;
}

interface ImpactAnalysisSummary {
  overallSeverity: string;
  description: string;
}

interface StrategicRecommendation {
  priority: string;
  title: string;
  description: string;
  rationale?: string;
}

interface RiskAnalysis {
  overallRiskLevel: string;
  keyRisks: string[];
  mitigationStrategies: string[];
}

interface ActionPlan {
  immediate?: string[];
  shortTerm?: string[];
  mediumTerm?: string[];
  longTerm?: string[];
}

interface SimulationResultData {
  id: string;
  scenario: {
    id: string;
    name: string;
    type: string;
    description: string;
    simulationHorizonDays: number;
  };
  simulationResult: {
    status: string;
    executionTimeMs: number;
    baseline: SimulationBaseline;
    simulated: SimulationSimulated;
    impacts: SimulationImpacts;
    timeline: SimulationTimelinePoint[];
    alerts: SimulationAlert[];
    bottlenecks: SimulationBottleneck[];
    recommendations: string[];
  };
  monteCarloResult?: {
    statistics: MonteCarloStatistics;
    riskMetrics: MonteCarloRiskMetrics;
    distribution: number[];
    percentiles: MonteCarloStatistics['percentiles'];
    sensitivityAnalysis: MonteCarloSensitivityResult[];
    iterationCount: number;
  };
  impactAnalysis?: {
    summary: ImpactAnalysisSummary;
    financial: FinancialImpact;
    operational: OperationalImpact;
    risk: RiskImpact;
    recommendations: ImpactAnalysisRecommendation[];
  };
  aiInsight?: {
    executiveSummary: string;
    situationAnalysis: string;
    impactAssessment: string;
    strategicRecommendations: StrategicRecommendation[];
    riskAnalysis: RiskAnalysis;
    actionPlan: ActionPlan;
    confidenceLevel: string;
  };
}

export default function SimulationResultPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [result, setResult] = useState<SimulationResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResult();
  }, [resolvedParams.id]);

  const fetchResult = async () => {
    try {
      const response = await fetch(`/api/ai/simulation/results/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        setError('Result not found');
      }
    } catch (err) {
      setError('Failed to load result');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/ai/simulation/results/${resolvedParams.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export', format }),
      });

      if (response.ok) {
        if (format === 'csv') {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `simulation-${resolvedParams.id}.csv`;
          a.click();
        } else {
          const data = await response.json();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `simulation-${resolvedParams.id}.json`;
          a.click();
        }
      }
    } catch (err) {
      clientLogger.error('Simulation export failed', err);
    }
  };

  const getImpactIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const formatPercent = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Result Not Found</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push('/ai/simulation')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Simulations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { scenario, simulationResult, monteCarloResult, impactAnalysis, aiInsight } = result;
  const { baseline, simulated, impacts, timeline, alerts, bottlenecks, recommendations } = simulationResult;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/ai/simulation')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{scenario.name}</h1>
            <p className="text-muted-foreground">{scenario.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('json')}>
            <FileText className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Service Level</p>
              {getImpactIcon(impacts.serviceLevelChange)}
            </div>
            <p className="text-2xl font-bold">{simulated.serviceLevel.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground">
              {formatPercent(impacts.serviceLevelChange)} from baseline
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Capacity Utilization</p>
              {getImpactIcon(impacts.capacityUtilizationChange)}
            </div>
            <p className="text-2xl font-bold">{simulated.capacityUtilization.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground">
              {formatPercent(impacts.capacityUtilizationChange)} from baseline
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Cost Impact</p>
              {getImpactIcon(-impacts.costChangePercent)}
            </div>
            <p className="text-2xl font-bold">{formatPercent(impacts.costChangePercent)}</p>
            <p className="text-sm text-muted-foreground">
              ${Math.abs(impacts.costChange).toLocaleString()} change
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Stockout Risk</p>
              {getImpactIcon(-simulated.stockoutRisk)}
            </div>
            <p className="text-2xl font-bold">{simulated.stockoutRisk.toFixed(1)}%</p>
            <Progress value={simulated.stockoutRisk} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="bottlenecks">Bottlenecks ({bottlenecks.length})</TabsTrigger>
          <TabsTrigger value="alerts">Alerts ({alerts.length})</TabsTrigger>
          {monteCarloResult && <TabsTrigger value="montecarlo">Monte Carlo</TabsTrigger>}
          {aiInsight && <TabsTrigger value="ai">AI Insights</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ImpactComparison
              baseline={baseline}
              simulated={simulated}
              financialImpact={impactAnalysis?.financial}
              operationalImpact={impactAnalysis?.operational}
              riskImpact={impactAnalysis?.risk}
            />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Key Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {recommendations.slice(0, 5).map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
                        {i + 1}
                      </span>
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <SimulationResultsChart timeline={timeline} />
        </TabsContent>

        {/* Bottlenecks Tab */}
        <TabsContent value="bottlenecks">
          <BottleneckAnalysis bottlenecks={bottlenecks} alerts={alerts} />
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">No alerts generated</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <Card key={i} className={`border-l-4 ${
                  alert.severity === 'critical' ? 'border-l-red-500' :
                  alert.severity === 'warning' ? 'border-l-yellow-500' :
                  'border-l-blue-500'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                          alert.severity === 'critical' ? 'text-red-500' :
                          alert.severity === 'warning' ? 'text-yellow-500' :
                          'text-blue-500'
                        }`} />
                        <div>
                          <p className="font-medium">{alert.message}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {alert.recommendedAction}
                          </p>
                        </div>
                      </div>
                      <Badge variant={
                        alert.severity === 'critical' ? 'destructive' :
                        alert.severity === 'warning' ? 'default' :
                        'secondary'
                      }>
                        {alert.severity}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Monte Carlo Tab */}
        {monteCarloResult && (
          <TabsContent value="montecarlo">
            <MonteCarloChart result={monteCarloResult} />
          </TabsContent>
        )}

        {/* AI Insights Tab */}
        {aiInsight && (
          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Analysis
                  </CardTitle>
                  <Badge variant={
                    aiInsight.confidenceLevel === 'high' ? 'default' :
                    aiInsight.confidenceLevel === 'medium' ? 'secondary' :
                    'outline'
                  }>
                    {aiInsight.confidenceLevel} confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Executive Summary</h4>
                  <p className="text-sm text-muted-foreground">{aiInsight.executiveSummary}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Situation Analysis</h4>
                  <p className="text-sm text-muted-foreground">{aiInsight.situationAnalysis}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Impact Assessment</h4>
                  <p className="text-sm text-muted-foreground">{aiInsight.impactAssessment}</p>
                </div>
              </CardContent>
            </Card>

            {aiInsight.strategicRecommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Strategic Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {aiInsight.strategicRecommendations.map((rec: StrategicRecommendation, i: number) => (
                      <div key={i} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={
                            rec.priority === 'critical' ? 'destructive' :
                            rec.priority === 'high' ? 'default' :
                            'secondary'
                          }>
                            {rec.priority}
                          </Badge>
                          <span className="font-medium">{rec.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{rec.description}</p>
                        {rec.rationale && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Rationale: {rec.rationale}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {aiInsight.actionPlan && (
              <Card>
                <CardHeader>
                  <CardTitle>Action Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiInsight.actionPlan.immediate && aiInsight.actionPlan.immediate.length > 0 && (
                      <div>
                        <h4 className="font-medium text-red-600 mb-2">Immediate</h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {aiInsight.actionPlan.immediate.map((action: string, i: number) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiInsight.actionPlan.shortTerm && aiInsight.actionPlan.shortTerm.length > 0 && (
                      <div>
                        <h4 className="font-medium text-orange-600 mb-2">Short Term</h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {aiInsight.actionPlan.shortTerm.map((action: string, i: number) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiInsight.actionPlan.mediumTerm && aiInsight.actionPlan.mediumTerm.length > 0 && (
                      <div>
                        <h4 className="font-medium text-blue-600 mb-2">Medium Term</h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {aiInsight.actionPlan.mediumTerm.map((action: string, i: number) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiInsight.actionPlan.longTerm && aiInsight.actionPlan.longTerm.length > 0 && (
                      <div>
                        <h4 className="font-medium text-green-600 mb-2">Long Term</h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {aiInsight.actionPlan.longTerm.map((action: string, i: number) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
