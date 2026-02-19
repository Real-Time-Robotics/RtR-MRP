'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { clientLogger } from '@/lib/client-logger';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Package,
  Globe,
  Bell,
  BarChart3,
  RefreshCw,
  ArrowLeft,
  Building2,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Loader2,
  Sparkles,
  FileText,
  Target,
  Lightbulb,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface RiskFactor {
  name: string;
  impact: string;
  description: string;
}

interface RiskFactorCategory {
  score: number;
  weight: number;
  factors: RiskFactor[];
}

interface ScorecardMetric {
  name: string;
  value: number;
  unit: string;
  status: string;
}

interface ScorecardDimension {
  score: number;
  grade: string;
  trend: string;
  metrics: ScorecardMetric[];
}

interface RiskRecommendation {
  priority: string;
  category: string;
  action: string;
  expectedImpact: string;
  estimatedCost: string;
  deadline: string;
}

interface EarlyWarningSignal {
  severity: string;
  type: string;
  description: string;
  confidence: number;
  indicators: string[];
  timeframe: string;
}

interface SupplierData {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  country: string;
  category: string | null;
  riskAssessment: {
    overallRiskScore: number;
    riskLevel: string;
    riskFactors: {
      performance: RiskFactorCategory;
      dependency: RiskFactorCategory;
      external: RiskFactorCategory;
      financial: RiskFactorCategory;
    };
    trend: { direction: string; changePercent: number; previousScore: number | null };
    historicalRisk: { period: string; riskScore: number; riskLevel: string }[];
    mitigationStatus: {
      hasAlternateSupplier: boolean;
      hasSafetyStock: boolean;
      hasLongTermContract: boolean;
      mitigationScore: number;
    };
    recommendations: RiskRecommendation[];
  };
  scorecard?: {
    overallScore: number;
    overallGrade: string;
    dimensions: {
      delivery: ScorecardDimension;
      quality: ScorecardDimension;
      cost: ScorecardDimension;
      responsiveness: ScorecardDimension;
    };
    trend: { direction: string; changePercent: number };
    benchmarkComparison: {
      categoryAverage: number;
      percentile: number;
      rank: number;
      totalInCategory: number;
    };
    strengths: string[];
    weaknesses: string[];
  };
  warnings?: {
    earlyWarningSignals: EarlyWarningSignal[];
    dependencyInfo: {
      totalPartsSupplied: number;
      criticalPartsSupplied: number;
      soleSourceParts: number;
      dependencyScore: number;
      riskIfRemoved: string;
    } | null;
  };
}

interface StrategicRecommendation {
  priority: string;
  title: string;
  description: string;
  rationale?: string;
}

interface DevelopmentPlan {
  goals: string[];
  actions: string[];
  timeline: string;
  expectedOutcome: string;
}

interface AIInsight {
  executiveSummary: string;
  performanceAnalysis: string;
  riskAssessment: string;
  strategicRecommendations: StrategicRecommendation[];
  predictedPerformance: {
    nextQuarterScore: number;
    trend: string;
    keyDrivers: string[];
    risks: string[];
    opportunities: string[];
  };
  developmentPlan: DevelopmentPlan;
  confidenceLevel: string;
}

// =============================================================================
// HELPERS
// =============================================================================

const getRiskColor = (level: string) => {
  switch (level?.toLowerCase()) {
    case 'low': return 'bg-green-500';
    case 'medium': return 'bg-yellow-500';
    case 'high': return 'bg-orange-500';
    case 'critical': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const getRiskBadgeVariant = (level: string): BadgeVariant => {
  switch (level?.toLowerCase()) {
    case 'low': return 'default';
    case 'medium': return 'secondary';
    case 'high':
    case 'critical': return 'destructive';
    default: return 'outline';
  }
};

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A': return 'text-green-600 bg-green-100';
    case 'B': return 'text-blue-600 bg-blue-100';
    case 'C': return 'text-yellow-600 bg-yellow-100';
    case 'D': return 'text-orange-600 bg-orange-100';
    case 'F': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />;
    default: return <Minus className="h-4 w-4 text-gray-500" />;
  }
};

const getMetricStatusColor = (status: string) => {
  switch (status) {
    case 'excellent': return 'text-green-600';
    case 'good': return 'text-blue-600';
    case 'acceptable': return 'text-yellow-600';
    case 'poor': return 'text-orange-600';
    case 'critical': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function SupplierRiskDetail({
  params,
}: {
  params: Promise<{ supplierId: string }>;
}) {
  const { supplierId } = use(params);
  const [data, setData] = useState<SupplierData | null>(null);
  const [aiInsight, setAIInsight] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [insightLoading, setInsightLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/ai/supplier-risk/suppliers/${supplierId}?months=12&includeScorecard=true&includeWarnings=true`
      );
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to load supplier data');
      }
    } catch (err) {
      setError('Failed to fetch supplier data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAIInsight = async () => {
    try {
      setInsightLoading(true);
      const response = await fetch(`/api/ai/supplier-risk/suppliers/${supplierId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ai_insight', months: 12 }),
      });
      const result = await response.json();

      if (result.success) {
        setAIInsight(result.data);
      }
    } catch (err) {
      clientLogger.error('Failed to fetch AI insight for supplier', err);
    } finally {
      setInsightLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [supplierId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading supplier details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-destructive" />
          <p className="text-destructive">{error || 'Supplier not found'}</p>
          <Link href="/ai/supplier-risk">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/ai/supplier-risk">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Building2 className="h-8 w-8" />
            {data.supplierName}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="outline">{data.supplierCode}</Badge>
            <Badge variant="outline">
              <Globe className="h-3 w-3 mr-1" />
              {data.country}
            </Badge>
            {data.category && <Badge variant="secondary">{data.category}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={fetchAIInsight}
            disabled={insightLoading}
            size="sm"
          >
            {insightLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            AI Analysis
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.riskAssessment.overallRiskScore}</div>
            <Badge variant={getRiskBadgeVariant(data.riskAssessment.riskLevel)} className="mt-1">
              {data.riskAssessment.riskLevel.toUpperCase()}
            </Badge>
            <div className="flex items-center gap-2 mt-2">
              {getTrendIcon(data.riskAssessment.trend.direction)}
              <span className="text-xs text-muted-foreground">
                {data.riskAssessment.trend.changePercent > 0 ? '+' : ''}
                {data.riskAssessment.trend.changePercent.toFixed(1)}% from previous
              </span>
            </div>
          </CardContent>
        </Card>

        {data.scorecard && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold">{data.scorecard.overallScore}</div>
                <div className={`px-3 py-1 rounded-full text-lg font-bold ${getGradeColor(data.scorecard.overallGrade)}`}>
                  {data.scorecard.overallGrade}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {getTrendIcon(data.scorecard.trend.direction)}
                <span className="text-xs text-muted-foreground capitalize">
                  {data.scorecard.trend.direction}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parts Supplied</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.warnings?.dependencyInfo?.totalPartsSupplied || 0}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-orange-600 font-medium">
                {data.warnings?.dependencyInfo?.soleSourceParts || 0}
              </span>
              <span className="text-xs text-muted-foreground">sole source</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {data.warnings?.dependencyInfo?.criticalPartsSupplied || 0} critical
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mitigation Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.riskAssessment.mitigationStatus.mitigationScore}%
            </div>
            <Progress value={data.riskAssessment.mitigationStatus.mitigationScore} className="h-2 mt-2" />
            <div className="flex gap-2 mt-2 flex-wrap">
              {data.riskAssessment.mitigationStatus.hasAlternateSupplier && (
                <Badge variant="outline" className="text-xs">Alt. Supplier</Badge>
              )}
              {data.riskAssessment.mitigationStatus.hasLongTermContract && (
                <Badge variant="outline" className="text-xs">LT Contract</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insight Card (if loaded) */}
      {aiInsight && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Analysis
              <Badge variant="outline" className="ml-2">
                {aiInsight.confidenceLevel} confidence
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Executive Summary</h4>
              <p className="text-sm text-muted-foreground">{aiInsight.executiveSummary}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Predicted Performance
                </h4>
                <div className="text-2xl font-bold">{aiInsight.predictedPerformance.nextQuarterScore}</div>
                <p className="text-xs text-muted-foreground">Next quarter projection</p>
              </div>
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Key Recommendations
                </h4>
                <ul className="text-sm space-y-1">
                  {aiInsight.strategicRecommendations.slice(0, 3).map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {rec.priority}
                      </Badge>
                      <span className="text-muted-foreground">{rec.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="scorecard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scorecard">
            <BarChart3 className="h-4 w-4 mr-2" />
            Scorecard
          </TabsTrigger>
          <TabsTrigger value="risk">
            <Shield className="h-4 w-4 mr-2" />
            Risk Factors
          </TabsTrigger>
          <TabsTrigger value="warnings">
            <Bell className="h-4 w-4 mr-2" />
            Warnings
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <Lightbulb className="h-4 w-4 mr-2" />
            Recommendations
          </TabsTrigger>
        </TabsList>

        {/* Scorecard Tab */}
        <TabsContent value="scorecard">
          {data.scorecard ? (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Dimension Cards */}
              {Object.entries(data.scorecard.dimensions).map(([key, dim]) => (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg capitalize flex items-center justify-between">
                      {key}
                      <div className={`px-2 py-1 rounded text-sm font-bold ${getGradeColor(dim.grade)}`}>
                        {dim.grade}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-3xl font-bold">{dim.score}</div>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(dim.trend)}
                        <span className="text-sm text-muted-foreground capitalize">{dim.trend}</span>
                      </div>
                    </div>
                    <Progress value={dim.score} className="h-2 mb-4" />
                    <div className="space-y-2">
                      {dim.metrics.slice(0, 3).map((metric: ScorecardMetric, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{metric.name}</span>
                          <span className={`font-medium ${getMetricStatusColor(metric.status)}`}>
                            {metric.value} {metric.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Benchmark Card */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Benchmark Comparison</CardTitle>
                  <CardDescription>How this supplier compares to others in category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">#{data.scorecard.benchmarkComparison.rank}</div>
                      <p className="text-xs text-muted-foreground">Rank</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{data.scorecard.benchmarkComparison.percentile}%</div>
                      <p className="text-xs text-muted-foreground">Percentile</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{data.scorecard.benchmarkComparison.categoryAverage}</div>
                      <p className="text-xs text-muted-foreground">Category Avg</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{data.scorecard.benchmarkComparison.totalInCategory}</div>
                      <p className="text-xs text-muted-foreground">In Category</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Strengths & Weaknesses */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.scorecard.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Weaknesses</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.scorecard.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No scorecard data available
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Risk Factors Tab */}
        <TabsContent value="risk">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(data.riskAssessment.riskFactors).map(([key, factor]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="capitalize">{key} Risk</CardTitle>
                  <CardDescription>Weight: {(factor.weight * 100).toFixed(0)}%</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-3xl font-bold">{factor.score}</div>
                    <Badge variant={getRiskBadgeVariant(factor.score > 50 ? 'high' : factor.score > 25 ? 'medium' : 'low')}>
                      {factor.score > 50 ? 'High' : factor.score > 25 ? 'Medium' : 'Low'}
                    </Badge>
                  </div>
                  <Progress value={100 - factor.score} className="h-2 mb-4" />
                  {factor.factors.length > 0 && (
                    <div className="space-y-2">
                      {factor.factors.map((f: RiskFactor, i: number) => (
                        <div key={i} className="p-2 bg-muted rounded text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{f.name}</span>
                            <Badge variant="outline">{f.impact}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{f.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Risk History */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Risk History</CardTitle>
                <CardDescription>Risk score over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-32">
                  {data.riskAssessment.historicalRisk.map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className={`w-full ${getRiskColor(h.riskLevel)} rounded-t`}
                        style={{ height: `${h.riskScore}%` }}
                      />
                      <span className="text-xs text-muted-foreground mt-1">{h.period.slice(-2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Warnings Tab */}
        <TabsContent value="warnings">
          <Card>
            <CardHeader>
              <CardTitle>Early Warning Signals</CardTitle>
              <CardDescription>Detected issues requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              {data.warnings?.earlyWarningSignals && data.warnings.earlyWarningSignals.length > 0 ? (
                <div className="space-y-4">
                  {data.warnings.earlyWarningSignals.map((signal: EarlyWarningSignal, i: number) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getRiskBadgeVariant(signal.severity)}>
                              {signal.severity}
                            </Badge>
                            <span className="font-medium">{signal.type}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{signal.description}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium">{(signal.confidence * 100).toFixed(0)}%</span>
                          <p className="text-xs text-muted-foreground">confidence</p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {signal.indicators.map((ind: string, j: number) => (
                          <Badge key={j} variant="outline" className="text-xs">
                            {ind}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        Timeframe: {signal.timeframe}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p>No warning signals detected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle>Risk Mitigation Recommendations</CardTitle>
              <CardDescription>Suggested actions to reduce risk</CardDescription>
            </CardHeader>
            <CardContent>
              {data.riskAssessment.recommendations.length > 0 ? (
                <div className="space-y-4">
                  {data.riskAssessment.recommendations.map((rec: RiskRecommendation, i: number) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={rec.priority === 'critical' ? 'destructive' : rec.priority === 'high' ? 'default' : 'secondary'}
                            >
                              {rec.priority}
                            </Badge>
                            <Badge variant="outline">{rec.category}</Badge>
                          </div>
                          <p className="font-medium mt-2">{rec.action}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium">-{rec.expectedImpact}</span>
                          <p className="text-xs text-muted-foreground">impact</p>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                        <span>Cost: {rec.estimatedCost}</span>
                        <span>Deadline: {rec.deadline}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No specific recommendations at this time</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
