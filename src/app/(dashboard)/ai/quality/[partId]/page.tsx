"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { clientLogger } from "@/lib/client-logger";
import {
  ArrowLeft,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Activity,
  BarChart3,
  Target,
  Loader2,
  RefreshCw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  Brain,
  ChevronRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// =============================================================================
// TYPES
// =============================================================================

interface PartQualityData {
  partId: string;
  partSku: string;
  partName: string;
  summary: {
    totalInspections: number;
    firstPassYield: number;
    totalNCRs: number;
    openNCRs: number;
    topDefects: { category: string; count: number }[];
  };
  riskAssessment: {
    overallScore: number;
    riskLevel: string;
    factors: {
      name: string;
      category: string;
      score: number;
      impact: string;
      trend: string;
    }[];
    recommendations: string[];
  };
  drift: {
    hasDrift: boolean;
    direction: string;
    magnitude: number;
    confidence: number;
    alerts: string[];
  };
  patterns: {
    hasRecurringIssues: boolean;
    issueCount: number;
    issues: {
      defectCategory: string;
      occurrences: number;
      frequency: string;
      isResolved: boolean;
      pattern: string;
    }[];
    impactScore: number;
  };
  anomalies: {
    count: number;
    riskLevel: string;
    severityDistribution: {
      critical: number;
      major: number;
      minor: number;
    };
    recentAnomalies: {
      type: string;
      severity: string;
      description: string;
      detectedAt: string;
    }[];
  };
  prediction: {
    ncrProbability: number;
    expectedNCRCount: { min: number; expected: number; max: number };
    confidenceLevel: number;
    riskFactors: string[];
    mitigatingFactors: string[];
  };
  forecast: {
    overallTrend: string;
    confidenceLevel: number;
    periods: {
      period: string;
      predictedFPY: number;
      predictedNCRCount: number;
      riskEvents: string[];
    }[];
  };
  qualityTrend: {
    period: string;
    firstPassYield: number;
    ncrCount: number;
    totalInspections: number;
  }[];
  aiInsights?: {
    executiveSummary: string;
    keyFindings: {
      type: string;
      title: string;
      description: string;
      impact: string;
    }[];
    recommendations: {
      priority: string;
      category: string;
      recommendation: string;
      expectedImpact: string;
    }[];
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function PartQualityDetailPage({
  params,
}: {
  params: Promise<{ partId: string }>;
}) {
  const { partId } = use(params);
  const [data, setData] = useState<PartQualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchPartQuality();
  }, [partId]);

  const fetchPartQuality = async (includeAI = false) => {
    try {
      if (includeAI) setAiLoading(true);
      else setLoading(true);

      const res = await fetch(
        `/api/ai/quality/parts/${partId}?months=6${includeAI ? "&includeAI=true" : ""}`
      );
      if (res.ok) {
        const result = await res.json();
        setData(result.data);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch part quality data", error);
    } finally {
      setLoading(false);
      setAiLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "critical": return "bg-red-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-yellow-500 text-white";
      case "low": return "bg-blue-500 text-white";
      case "minimal": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case "improving": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "degrading": return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "text-red-500";
      case "medium": return "text-yellow-500";
      default: return "text-green-500";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Part not found</p>
        <Button asChild className="mt-4">
          <Link href="/ai/quality">Back to Quality Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/ai/quality">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold font-mono uppercase tracking-wider">
                {data.partSku}
              </h1>
              <Badge className={getRiskLevelColor(data.riskAssessment.riskLevel)}>
                {data.riskAssessment.riskLevel.toUpperCase()} RISK
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">{data.partName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPartQuality(true)}
            disabled={aiLoading}
            className="h-8"
          >
            {aiLoading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Brain className="h-3.5 w-3.5 mr-1.5" />
            )}
            Generate AI Insights
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchPartQuality()} className="h-8">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-5 gap-2">
        <Card className="border-gray-200 dark:border-mrp-border">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Risk Score</p>
            <p className="text-2xl font-bold font-mono">{data.riskAssessment.overallScore}</p>
            <Progress
              value={data.riskAssessment.overallScore}
              className="h-1 mt-1"
            />
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-mrp-border">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">FPY</p>
            <div className="flex items-center justify-center gap-1">
              <p className="text-2xl font-bold font-mono">{data.summary.firstPassYield.toFixed(1)}%</p>
              {getTrendIcon(data.forecast.overallTrend)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-mrp-border">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">NCR Probability</p>
            <p className="text-2xl font-bold font-mono text-amber-500">
              {(data.prediction.ncrProbability * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-mrp-border">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Open NCRs</p>
            <p className="text-2xl font-bold font-mono">{data.summary.openNCRs}</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-mrp-border">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Anomalies</p>
            <p className="text-2xl font-bold font-mono">{data.anomalies.count}</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Executive Summary */}
      {data.aiInsights && (
        <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20">
          <CardHeader className="px-3 py-2">
            <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
              AI Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 py-2">
            <p className="text-[12px] text-gray-700 dark:text-gray-300">
              {data.aiInsights.executiveSummary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="risk" className="w-full">
        <TabsList className="grid grid-cols-6 h-8">
          <TabsTrigger value="risk" className="text-[10px]">Risk Factors</TabsTrigger>
          <TabsTrigger value="patterns" className="text-[10px]">Patterns</TabsTrigger>
          <TabsTrigger value="anomalies" className="text-[10px]">Anomalies</TabsTrigger>
          <TabsTrigger value="prediction" className="text-[10px]">Prediction</TabsTrigger>
          <TabsTrigger value="trend" className="text-[10px]">Trend</TabsTrigger>
          <TabsTrigger value="ai" className="text-[10px]">AI Insights</TabsTrigger>
        </TabsList>

        {/* Risk Factors Tab */}
        <TabsContent value="risk" className="mt-2">
          <Card className="border-gray-200 dark:border-mrp-border">
            <CardContent className="p-3">
              <div className="space-y-2">
                {data.riskAssessment.factors.map((factor, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 border border-gray-200 dark:border-mrp-border"
                  >
                    <div className="flex items-center gap-2">
                      {getTrendIcon(factor.trend)}
                      <div>
                        <p className="text-[11px] font-medium">{factor.name}</p>
                        <Badge variant="outline" className="text-[9px]">
                          {factor.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24">
                        <Progress value={factor.score} className="h-2" />
                      </div>
                      <span className="text-sm font-mono w-8">{factor.score}</span>
                      <Badge className={`${getImpactColor(factor.impact)} text-[9px]`} variant="outline">
                        {factor.impact}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              {data.riskAssessment.recommendations.length > 0 && (
                <div className="mt-3 p-2 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                  <p className="text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-400 mb-1">
                    Recommendations
                  </p>
                  <ul className="space-y-0.5">
                    {data.riskAssessment.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1">
                        <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="mt-2">
          <Card className="border-gray-200 dark:border-mrp-border">
            <CardContent className="p-3">
              {data.patterns.hasRecurringIssues ? (
                <div className="space-y-2">
                  {data.patterns.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 border border-gray-200 dark:border-mrp-border"
                    >
                      <div>
                        <p className="text-[11px] font-medium">{issue.defectCategory}</p>
                        <p className="text-[10px] text-muted-foreground">{issue.pattern}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{issue.occurrences}x</span>
                        <Badge
                          variant={issue.frequency === "high" ? "destructive" : "outline"}
                          className="text-[9px]"
                        >
                          {issue.frequency}
                        </Badge>
                        {issue.isResolved ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500 opacity-50" />
                  <p className="text-[11px]">No recurring patterns detected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Anomalies Tab */}
        <TabsContent value="anomalies" className="mt-2">
          <Card className="border-gray-200 dark:border-mrp-border">
            <CardContent className="p-3">
              {data.anomalies.count > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                      <p className="text-lg font-bold text-red-500">{data.anomalies.severityDistribution.critical}</p>
                      <p className="text-[9px] text-muted-foreground">Critical</p>
                    </div>
                    <div className="text-center p-2 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                      <p className="text-lg font-bold text-amber-500">{data.anomalies.severityDistribution.major}</p>
                      <p className="text-[9px] text-muted-foreground">Major</p>
                    </div>
                    <div className="text-center p-2 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                      <p className="text-lg font-bold text-blue-500">{data.anomalies.severityDistribution.minor}</p>
                      <p className="text-[9px] text-muted-foreground">Minor</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {data.anomalies.recentAnomalies.map((anomaly, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2 border border-gray-200 dark:border-mrp-border"
                      >
                        <AlertCircle className={`h-4 w-4 mt-0.5 ${
                          anomaly.severity === "critical" ? "text-red-500" :
                          anomaly.severity === "major" ? "text-amber-500" : "text-blue-500"
                        }`} />
                        <div className="flex-1">
                          <p className="text-[11px]">{anomaly.description}</p>
                          <p className="text-[9px] text-muted-foreground">
                            {anomaly.type} • {new Date(anomaly.detectedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500 opacity-50" />
                  <p className="text-[11px]">No anomalies detected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prediction Tab */}
        <TabsContent value="prediction" className="mt-2">
          <Card className="border-gray-200 dark:border-mrp-border">
            <CardContent className="p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border border-gray-200 dark:border-mrp-border">
                  <p className="text-[10px] text-muted-foreground uppercase mb-2">NCR Probability</p>
                  <p className="text-3xl font-bold font-mono text-amber-500">
                    {(data.prediction.ncrProbability * 100).toFixed(0)}%
                  </p>
                  <Progress value={data.prediction.ncrProbability * 100} className="h-2 mt-2" />
                  <p className="text-[9px] text-muted-foreground mt-1">
                    Confidence: {(data.prediction.confidenceLevel * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="p-3 border border-gray-200 dark:border-mrp-border">
                  <p className="text-[10px] text-muted-foreground uppercase mb-2">Expected NCR Count</p>
                  <p className="text-3xl font-bold font-mono">
                    {data.prediction.expectedNCRCount.expected}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    Range: {data.prediction.expectedNCRCount.min} - {data.prediction.expectedNCRCount.max}
                  </p>
                </div>
              </div>

              {data.prediction.riskFactors.length > 0 && (
                <div className="mt-3 p-2 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                  <p className="text-[10px] font-semibold uppercase text-red-700 dark:text-red-400 mb-1">
                    Risk Factors
                  </p>
                  <ul className="space-y-0.5">
                    {data.prediction.riskFactors.map((factor, idx) => (
                      <li key={idx} className="text-[11px] text-red-800 dark:text-red-300 flex items-start gap-1">
                        <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.prediction.mitigatingFactors.length > 0 && (
                <div className="mt-2 p-2 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                  <p className="text-[10px] font-semibold uppercase text-green-700 dark:text-green-400 mb-1">
                    Mitigating Factors
                  </p>
                  <ul className="space-y-0.5">
                    {data.prediction.mitigatingFactors.map((factor, idx) => (
                      <li key={idx} className="text-[11px] text-green-800 dark:text-green-300 flex items-start gap-1">
                        <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trend Tab */}
        <TabsContent value="trend" className="mt-2">
          <Card className="border-gray-200 dark:border-mrp-border">
            <CardContent className="p-3">
              <div className="space-y-2">
                {data.qualityTrend.map((period) => (
                  <div key={period.period} className="flex items-center gap-3 p-2 border border-gray-200 dark:border-mrp-border">
                    <span className="text-[10px] font-mono w-16">{period.period}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-muted-foreground w-8">FPY</span>
                        <Progress value={period.firstPassYield} className="h-2 flex-1" />
                        <span className="text-[10px] font-mono w-12 text-right">
                          {period.firstPassYield.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono">{period.ncrCount} NCR</span>
                      <p className="text-[9px] text-muted-foreground">{period.totalInspections} insp</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Drift Info */}
              {data.drift.hasDrift && (
                <div className={`mt-3 p-2 border ${
                  data.drift.direction === "degrading"
                    ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                    : "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                }`}>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(data.drift.direction)}
                    <p className="text-[11px]">
                      Quality {data.drift.direction} by {Math.abs(data.drift.magnitude).toFixed(1)}%
                    </p>
                  </div>
                  {data.drift.alerts.map((alert, idx) => (
                    <p key={idx} className="text-[10px] text-muted-foreground mt-1">
                      {alert}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="ai" className="mt-2">
          <Card className="border-gray-200 dark:border-mrp-border">
            <CardContent className="p-3">
              {data.aiInsights ? (
                <div className="space-y-4">
                  {/* Key Findings */}
                  {data.aiInsights.keyFindings.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-2">
                        Key Findings
                      </p>
                      <div className="space-y-2">
                        {data.aiInsights.keyFindings.map((finding, idx) => (
                          <div
                            key={idx}
                            className={`p-2 border ${
                              finding.type === "negative"
                                ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                                : finding.type === "positive"
                                ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                                : "border-gray-200 dark:border-mrp-border"
                            }`}
                          >
                            <p className="text-[11px] font-medium">{finding.title}</p>
                            <p className="text-[10px] text-muted-foreground">{finding.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Recommendations */}
                  {data.aiInsights.recommendations.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-2">
                        AI Recommendations
                      </p>
                      <div className="space-y-2">
                        {data.aiInsights.recommendations.map((rec, idx) => (
                          <div
                            key={idx}
                            className="p-2 border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                className={`text-[9px] ${
                                  rec.priority === "high"
                                    ? "bg-red-500"
                                    : rec.priority === "medium"
                                    ? "bg-yellow-500"
                                    : "bg-blue-500"
                                } text-white`}
                              >
                                {rec.priority}
                              </Badge>
                              <Badge variant="outline" className="text-[9px]">
                                {rec.category}
                              </Badge>
                            </div>
                            <p className="text-[11px]">{rec.recommendation}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Expected Impact: {rec.expectedImpact}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Brain className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-[11px]">Click "Generate AI Insights" to analyze this part</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
