"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
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
  Search,
  ChevronRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// TYPES
// =============================================================================

interface QualityMetrics {
  overallFPY: number;
  overallPPM: number;
  openNCRs: number;
  openCAPAs: number;
  avgNCRResolutionDays: number;
}

interface QualityTrend {
  period: string;
  fpy: number;
  ncrCount: number;
}

interface DefectCategory {
  category: string;
  count: number;
}

interface RiskPart {
  partId: string;
  partSku: string;
  partName: string;
  riskScore: number;
  riskLevel: string;
  trendDirection: string;
}

interface BatchAssessment {
  partsAssessed: number;
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    minimal: number;
  };
  systemwideMetrics: {
    avgRiskScore: number;
    avgFPY: number;
    totalOpenNCRs: number;
    trendingWorse: number;
  };
  topRiskParts: RiskPart[];
  recommendations: string[];
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function AIQualityDashboardPage() {
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [qualityTrend, setQualityTrend] = useState<QualityTrend[]>([]);
  const [defectCategories, setDefectCategories] = useState<DefectCategory[]>([]);
  const [batchAssessment, setBatchAssessment] = useState<BatchAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [days, setDays] = useState("30");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchQualityData();
  }, [days]);

  const fetchQualityData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ai/quality?days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.data.metrics);
        setQualityTrend(data.data.qualityTrend);
        setDefectCategories(data.data.topDefectCategories);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch quality data:", error);
    } finally {
      setLoading(false);
    }
  };

  const runBatchAssessment = async () => {
    try {
      setAssessmentLoading(true);
      const res = await fetch("/api/ai/quality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      });
      if (res.ok) {
        const data = await res.json();
        setBatchAssessment(data.data);
      }
    } catch (error) {
      clientLogger.error("Failed to run batch assessment:", error);
    } finally {
      setAssessmentLoading(false);
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
      case "improving": return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
      case "degrading": return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
      default: return <Minus className="h-3.5 w-3.5 text-gray-500" />;
    }
  };

  const getStatusIcon = (level: string) => {
    switch (level) {
      case "critical":
      case "high":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "medium":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary">
              AI Quality Prediction
            </h1>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">
            AI-powered quality analysis, risk assessment, and defect prediction
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[120px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchQualityData}
            className="h-8"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-5 gap-2">
        <Card className="border-gray-200 dark:border-mrp-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Target className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">FPY</p>
                <p className="text-lg font-bold font-mono">
                  {metrics?.overallFPY?.toFixed(1) || "0"}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-mrp-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">PPM</p>
                <p className="text-lg font-bold font-mono">
                  {metrics?.overallPPM?.toLocaleString() || "0"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-mrp-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Open NCRs</p>
                <p className="text-lg font-bold font-mono">
                  {metrics?.openNCRs || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-mrp-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Activity className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Open CAPAs</p>
                <p className="text-lg font-bold font-mono">
                  {metrics?.openCAPAs || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-mrp-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Clock className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Avg Resolution</p>
                <p className="text-lg font-bold font-mono">
                  {metrics?.avgNCRResolutionDays || 0}d
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batch Risk Assessment */}
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardHeader className="px-3 py-2 flex flex-row items-center justify-between">
          <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-purple-500" />
            AI Risk Assessment
          </CardTitle>
          <Button
            size="sm"
            onClick={runBatchAssessment}
            disabled={assessmentLoading}
            className="text-xs"
          >
            {assessmentLoading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            )}
            Run Assessment
          </Button>
        </CardHeader>
        <CardContent className="px-3 py-2">
          {batchAssessment ? (
            <div className="space-y-3">
              {/* Risk Distribution */}
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(batchAssessment.riskDistribution).map(([level, count]) => (
                  <div key={level} className="text-center p-2 border border-gray-200 dark:border-mrp-border">
                    <Badge className={`${getRiskLevelColor(level)} text-[10px] mb-1`}>
                      {level.toUpperCase()}
                    </Badge>
                    <p className="text-lg font-bold font-mono">{count}</p>
                    <p className="text-[9px] text-muted-foreground">parts</p>
                  </div>
                ))}
              </div>

              {/* System Metrics */}
              <div className="grid grid-cols-4 gap-2 p-2 bg-gray-50 dark:bg-gray-800/50">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Avg Risk Score</p>
                  <p className="text-base font-bold font-mono">
                    {batchAssessment.systemwideMetrics.avgRiskScore}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Avg FPY</p>
                  <p className="text-base font-bold font-mono">
                    {batchAssessment.systemwideMetrics.avgFPY.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Total Open NCRs</p>
                  <p className="text-base font-bold font-mono">
                    {batchAssessment.systemwideMetrics.totalOpenNCRs}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Trending Worse</p>
                  <p className="text-base font-bold font-mono text-red-500">
                    {batchAssessment.systemwideMetrics.trendingWorse}
                  </p>
                </div>
              </div>

              {/* Recommendations */}
              {batchAssessment.recommendations.length > 0 && (
                <div className="p-2 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                  <p className="text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-400 mb-1">
                    AI Recommendations
                  </p>
                  <ul className="space-y-0.5">
                    {batchAssessment.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1">
                        <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Shield className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-[11px]">Click "Run Assessment" to analyze part quality risks</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        {/* Top Risk Parts */}
        <Card className="border-gray-200 dark:border-mrp-border">
          <CardHeader className="px-3 py-2 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              High Risk Parts
            </CardTitle>
            <div className="relative w-40">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-6 pl-6 text-[10px]"
              />
            </div>
          </CardHeader>
          <CardContent className="px-3 py-2">
            {batchAssessment?.topRiskParts && batchAssessment.topRiskParts.length > 0 ? (
              <div className="space-y-1">
                {batchAssessment.topRiskParts
                  .filter((p) =>
                    searchQuery === "" ||
                    p.partSku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.partName.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .slice(0, 8)
                  .map((part) => (
                    <Link
                      key={part.partId}
                      href={`/ai/quality/${part.partId}`}
                      className="flex items-center justify-between p-2 border border-gray-200 dark:border-mrp-border hover:bg-gray-50 dark:hover:bg-gunmetal transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(part.riskLevel)}
                        <div>
                          <p className="text-[11px] font-medium font-mono">{part.partSku}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                            {part.partName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm font-bold font-mono">{part.riskScore}</p>
                          <p className="text-[9px] text-muted-foreground">risk score</p>
                        </div>
                        {getTrendIcon(part.trendDirection)}
                        <Badge className={`${getRiskLevelColor(part.riskLevel)} text-[9px]`}>
                          {part.riskLevel}
                        </Badge>
                      </div>
                    </Link>
                  ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-[11px]">Run assessment to see high-risk parts</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quality Trend & Defects */}
        <div className="space-y-2">
          {/* Quality Trend */}
          <Card className="border-gray-200 dark:border-mrp-border">
            <CardHeader className="px-3 py-2">
              <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                Quality Trend (FPY)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 py-2">
              {qualityTrend.length > 0 ? (
                <div className="space-y-1">
                  {qualityTrend.slice(-6).map((period) => (
                    <div key={period.period} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono w-16">{period.period}</span>
                      <div className="flex-1">
                        <Progress value={period.fpy} className="h-2" />
                      </div>
                      <span className="text-[10px] font-mono w-12 text-right">
                        {period.fpy.toFixed(1)}%
                      </span>
                      <span className="text-[9px] text-muted-foreground w-12 text-right">
                        {period.ncrCount} NCR
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-[11px]">No trend data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Defect Categories */}
          <Card className="border-gray-200 dark:border-mrp-border">
            <CardHeader className="px-3 py-2">
              <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-amber-500" />
                Top Defect Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 py-2">
              {defectCategories.length > 0 ? (
                <div className="space-y-1">
                  {defectCategories.slice(0, 5).map((defect, idx) => {
                    const maxCount = defectCategories[0]?.count || 1;
                    const percentage = (defect.count / maxCount) * 100;
                    return (
                      <div key={defect.category} className="flex items-center gap-2">
                        <span className="text-[10px] font-mono w-4">{idx + 1}.</span>
                        <span className="text-[10px] flex-1 truncate">{defect.category}</span>
                        <div className="w-24">
                          <Progress value={percentage} className="h-1.5" />
                        </div>
                        <span className="text-[10px] font-mono w-8 text-right">{defect.count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-[11px]">No defect data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Links */}
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 py-2">
          <div className="flex flex-wrap gap-1.5">
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href="/quality">
                <Activity className="h-3.5 w-3.5 mr-1.5" />
                Quality Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href="/quality/ncr">
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                NCR Reports
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href="/quality/capa">
                <Target className="h-3.5 w-3.5 mr-1.5" />
                CAPA Management
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href="/quality/spc">
                <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                SPC Analysis
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
