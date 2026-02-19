'use client';

import { useState, useEffect } from 'react';
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
  Users,
  Package,
  Globe,
  Bell,
  BarChart3,
  RefreshCw,
  ChevronRight,
  Building2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface DashboardData {
  riskProfile: {
    overallRiskScore: number;
    overallRiskLevel: string;
    riskBreakdown: {
      supplierPerformance: number;
      concentration: number;
      geographic: number;
      singleSource: number;
      external: number;
    };
    metrics: {
      totalActiveSuppliers: number;
      avgSupplierRiskScore: number;
      suppliersAtRisk: number;
      singleSourcePartsPercent: number;
      geographicDiversityScore: number;
      overallResilienceScore: number;
    };
    riskTrend: { period: string; score: number }[];
    criticalSuppliers: {
      supplierId: string;
      supplierName: string;
      riskScore: number;
      riskLevel: string;
      spendPercent: number;
      criticalParts: number;
      topRiskFactors: string[];
    }[];
    topRisks: {
      id: string;
      title: string;
      description: string;
      riskScore: number;
      riskLevel: string;
      category: string;
    }[];
  };
  topSuppliers: {
    supplierId: string;
    supplierName: string;
    overallScore: number;
    overallGrade: string;
    rank: number;
    trend: string;
  }[];
  alertSummary: {
    totalActiveAlerts: number;
    alertsBySeverity: Record<string, number>;
    criticalSuppliers: {
      supplierId: string;
      supplierName: string;
      alertCount: number;
      highestSeverity: string;
    }[];
  } | null;
  dependencySummary: {
    singleSourcePartCount: number;
    singleSourcePercent: number;
    criticalPartsAtRisk: number;
    overallDependencyScore: number;
    concentrationRiskLevel: string;
    geographicRiskLevel: string;
  } | null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getRiskColor = (level: string) => {
  switch (level.toLowerCase()) {
    case 'low':
      return 'bg-success-500';
    case 'medium':
      return 'bg-warning-500';
    case 'high':
      return 'bg-orange-500';
    case 'critical':
      return 'bg-danger-500';
    default:
      return 'bg-gray-500';
  }
};

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const getRiskBadgeVariant = (level: string): BadgeVariant => {
  switch (level.toLowerCase()) {
    case 'low':
      return 'default';
    case 'medium':
      return 'secondary';
    case 'high':
      return 'destructive';
    case 'critical':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A':
      return 'text-success-600 bg-success-100';
    case 'B':
      return 'text-primary-600 bg-primary-100';
    case 'C':
      return 'text-warning-600 bg-warning-100';
    case 'D':
      return 'text-orange-600 bg-orange-100';
    case 'F':
      return 'text-danger-600 bg-danger-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'improving':
      return <TrendingUp className="h-4 w-4 text-success-500" />;
    case 'declining':
      return <TrendingDown className="h-4 w-4 text-danger-500" />;
    default:
      return <Minus className="h-4 w-4 text-gray-500" />;
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical':
    case 'emergency':
      return <AlertCircle className="h-4 w-4 text-danger-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-warning-500" />;
    default:
      return <Bell className="h-4 w-4 text-primary-500" />;
  }
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function SupplierRiskDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/ai/supplier-risk?months=12&includeAlerts=true&includeDependencies=true');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to load data');
      }
    } catch (err) {
      setError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading supplier risk dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-destructive" />
          <p className="text-destructive">{error || 'No data available'}</p>
          <Button onClick={fetchData} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Risk Intelligence</h1>
          <p className="text-muted-foreground">
            AI-powered supply chain risk monitoring and analysis
          </p>
        </div>
        <Button onClick={fetchData} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Risk Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.riskProfile.overallRiskScore}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={getRiskBadgeVariant(data.riskProfile.overallRiskLevel)}>
                {data.riskProfile.overallRiskLevel.toUpperCase()}
              </Badge>
              <span className="text-xs text-muted-foreground">risk level</span>
            </div>
            <Progress
              value={100 - data.riskProfile.overallRiskScore}
              className="h-2 mt-3"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.riskProfile.metrics.totalActiveSuppliers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-danger-500 font-medium">{data.riskProfile.metrics.suppliersAtRisk}</span> at elevated risk
            </p>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs">Avg Score:</span>
              <span className="text-sm font-medium">{data.riskProfile.metrics.avgSupplierRiskScore}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Single Source Parts</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.dependencySummary?.singleSourcePartCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.dependencySummary?.singleSourcePercent.toFixed(1)}% of total parts
            </p>
            <div className="flex items-center gap-2 mt-3">
              <AlertTriangle className="h-3 w-3 text-orange-500" />
              <span className="text-xs">
                {data.dependencySummary?.criticalPartsAtRisk || 0} critical parts at risk
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.alertSummary?.totalActiveAlerts || 0}</div>
            <div className="flex gap-2 mt-1">
              {data.alertSummary?.alertsBySeverity.critical ? (
                <Badge variant="destructive" className="text-xs">
                  {data.alertSummary.alertsBySeverity.critical} critical
                </Badge>
              ) : null}
              {data.alertSummary?.alertsBySeverity.warning ? (
                <Badge variant="secondary" className="text-xs">
                  {data.alertSummary.alertsBySeverity.warning} warnings
                </Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Risk Breakdown</CardTitle>
            <CardDescription>Component risk scores (0-100, lower is better)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { name: 'Supplier Performance', value: data.riskProfile.riskBreakdown.supplierPerformance, icon: Users },
              { name: 'Concentration', value: data.riskProfile.riskBreakdown.concentration, icon: BarChart3 },
              { name: 'Geographic', value: data.riskProfile.riskBreakdown.geographic, icon: Globe },
              { name: 'Single Source', value: data.riskProfile.riskBreakdown.singleSource, icon: Package },
              { name: 'External Factors', value: data.riskProfile.riskBreakdown.external, icon: AlertTriangle },
            ].map((item) => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold">{item.value}</span>
                </div>
                <Progress
                  value={100 - item.value}
                  className="h-2"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resilience Metrics</CardTitle>
            <CardDescription>Supply chain health indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold text-success-600">
                  {data.riskProfile.metrics.overallResilienceScore}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Resilience Score</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold text-primary-600">
                  {data.riskProfile.metrics.geographicDiversityScore}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Geographic Diversity</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Dependency Risk Levels</h4>
              <div className="flex gap-2">
                <Badge variant={getRiskBadgeVariant(data.dependencySummary?.concentrationRiskLevel || 'medium')}>
                  Concentration: {data.dependencySummary?.concentrationRiskLevel || 'N/A'}
                </Badge>
                <Badge variant={getRiskBadgeVariant(data.dependencySummary?.geographicRiskLevel || 'medium')}>
                  Geographic: {data.dependencySummary?.geographicRiskLevel || 'N/A'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Suppliers, Alerts, Risks */}
      <Tabs defaultValue="suppliers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suppliers">
            <Building2 className="h-4 w-4 mr-2" />
            Top Suppliers
          </TabsTrigger>
          <TabsTrigger value="critical">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Critical Suppliers
          </TabsTrigger>
          <TabsTrigger value="risks">
            <Shield className="h-4 w-4 mr-2" />
            Top Risks
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="h-4 w-4 mr-2" />
            Alerts
          </TabsTrigger>
        </TabsList>

        {/* Top Suppliers Tab */}
        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Suppliers</CardTitle>
              <CardDescription>Ranked by overall performance score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.topSuppliers.map((supplier) => (
                  <div
                    key={supplier.supplierId}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-muted-foreground w-8">
                        #{supplier.rank}
                      </div>
                      <div>
                        <Link
                          href={`/ai/supplier-risk/${supplier.supplierId}`}
                          className="font-medium hover:underline"
                        >
                          {supplier.supplierName}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          {getTrendIcon(supplier.trend)}
                          <span className="text-xs text-muted-foreground capitalize">
                            {supplier.trend}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-bold">{supplier.overallScore}</div>
                        <div className="text-xs text-muted-foreground">score</div>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-bold ${getGradeColor(
                          supplier.overallGrade
                        )}`}
                      >
                        {supplier.overallGrade}
                      </div>
                      <Link href={`/ai/supplier-risk/${supplier.supplierId}`}>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Critical Suppliers Tab */}
        <TabsContent value="critical">
          <Card>
            <CardHeader>
              <CardTitle>Critical Suppliers</CardTitle>
              <CardDescription>Suppliers requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              {data.riskProfile.criticalSuppliers.length > 0 ? (
                <div className="space-y-4">
                  {data.riskProfile.criticalSuppliers.map((supplier) => (
                    <div
                      key={supplier.supplierId}
                      className="p-4 border rounded-lg border-danger-200 bg-danger-50/50"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <Link
                            href={`/ai/supplier-risk/${supplier.supplierId}`}
                            className="font-medium hover:underline"
                          >
                            {supplier.supplierName}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={getRiskBadgeVariant(supplier.riskLevel)}>
                              {supplier.riskLevel.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {supplier.spendPercent.toFixed(1)}% of spend
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-danger-600">
                            {supplier.riskScore}
                          </div>
                          <div className="text-xs text-muted-foreground">risk score</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {supplier.criticalParts} critical parts
                        </span>
                      </div>
                      {supplier.topRiskFactors.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {supplier.topRiskFactors.map((factor) => (
                            <Badge key={factor} variant="outline" className="text-xs">
                              {factor}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success-500" />
                  <p>No critical suppliers detected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Risks Tab */}
        <TabsContent value="risks">
          <Card>
            <CardHeader>
              <CardTitle>Top Supply Chain Risks</CardTitle>
              <CardDescription>Identified risks requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              {data.riskProfile.topRisks.length > 0 ? (
                <div className="space-y-4">
                  {data.riskProfile.topRisks.map((risk) => (
                    <div
                      key={risk.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{risk.title}</h4>
                            <Badge variant={getRiskBadgeVariant(risk.riskLevel)}>
                              {risk.riskLevel.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {risk.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{risk.riskScore}</div>
                          <Badge variant="outline" className="text-xs">
                            {risk.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-success-500" />
                  <p>No significant risks identified</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Alerts</CardTitle>
              <CardDescription>Active warnings and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              {data.alertSummary && data.alertSummary.criticalSuppliers.length > 0 ? (
                <div className="space-y-4">
                  {data.alertSummary.criticalSuppliers.map((supplier) => (
                    <div
                      key={supplier.supplierId}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getSeverityIcon(supplier.highestSeverity)}
                        <div>
                          <Link
                            href={`/ai/supplier-risk/${supplier.supplierId}`}
                            className="font-medium hover:underline"
                          >
                            {supplier.supplierName}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={getRiskBadgeVariant(supplier.highestSeverity)}>
                              {supplier.highestSeverity}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-lg font-bold">{supplier.alertCount}</div>
                          <div className="text-xs text-muted-foreground">alerts</div>
                        </div>
                        <Link href={`/ai/supplier-risk/${supplier.supplierId}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success-500" />
                  <p>No active alerts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common risk management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/ai/supplier-risk/alerts">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <Bell className="h-5 w-5" />
                <span>View All Alerts</span>
              </Button>
            </Link>
            <Link href="/ai/supplier-risk/rankings">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <BarChart3 className="h-5 w-5" />
                <span>Supplier Rankings</span>
              </Button>
            </Link>
            <Link href="/ai/supplier-risk/dependencies">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <Package className="h-5 w-5" />
                <span>Dependency Analysis</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full h-auto py-4 flex flex-col gap-2"
              onClick={async () => {
                try {
                  await fetch('/api/ai/supplier-risk/alerts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'scan' }),
                  });
                  fetchData();
                } catch (e) {
                  clientLogger.error('Supplier risk scan failed', e);
                }
              }}
            >
              <RefreshCw className="h-5 w-5" />
              <span>Run Risk Scan</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
