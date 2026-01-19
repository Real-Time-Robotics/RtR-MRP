'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Factory,
  Truck,
  Package,
  Users,
  Clock,
  ChevronRight,
} from 'lucide-react';

interface Bottleneck {
  id: string;
  type: 'resource' | 'supplier' | 'capacity' | 'inventory' | 'workforce';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  affectedWeeks: number[];
  utilizationRate?: number;
  recommendation: string;
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  week: number;
  metric: string;
  threshold: number;
  actualValue: number;
}

interface BottleneckAnalysisProps {
  bottlenecks: Bottleneck[];
  alerts: Alert[];
}

export function BottleneckAnalysis({ bottlenecks, alerts }: BottleneckAnalysisProps) {
  const getBottleneckIcon = (type: string) => {
    switch (type) {
      case 'resource':
        return <Factory className="h-5 w-5" />;
      case 'supplier':
        return <Truck className="h-5 w-5" />;
      case 'capacity':
        return <Factory className="h-5 w-5" />;
      case 'inventory':
        return <Package className="h-5 w-5" />;
      case 'workforce':
        return <Users className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getAlertBgColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-orange-50 border-orange-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const criticalBottlenecks = bottlenecks.filter((b) => b.severity === 'critical');
  const otherBottlenecks = bottlenecks.filter((b) => b.severity !== 'critical');

  const criticalAlerts = alerts.filter((a) => a.type === 'critical');
  const warningAlerts = alerts.filter((a) => a.type === 'warning');
  const infoAlerts = alerts.filter((a) => a.type === 'info');

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Critical Issues</p>
                <p className="text-2xl font-bold text-red-700">
                  {criticalBottlenecks.length + criticalAlerts.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Warnings</p>
                <p className="text-2xl font-bold text-orange-700">
                  {otherBottlenecks.filter((b) => b.severity === 'high').length + warningAlerts.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Factory className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Bottlenecks</p>
                <p className="text-2xl font-bold">{bottlenecks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Weeks Affected</p>
                <p className="text-2xl font-bold">
                  {new Set(bottlenecks.flatMap((b) => b.affectedWeeks)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottlenecks List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-purple-500" />
            Identified Bottlenecks
          </CardTitle>
          <CardDescription>
            Resource constraints and capacity issues identified in the simulation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bottlenecks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bottlenecks identified in this scenario</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bottlenecks.map((bottleneck) => (
                <div
                  key={bottleneck.id}
                  className={`p-4 border rounded-lg ${getSeverityColor(bottleneck.severity)}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getBottleneckIcon(bottleneck.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="capitalize">
                          {bottleneck.type}
                        </Badge>
                        <Badge className={getSeverityColor(bottleneck.severity)}>
                          {bottleneck.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Weeks: {bottleneck.affectedWeeks.join(', ')}
                        </span>
                      </div>
                      <p className="font-medium mb-1">{bottleneck.description}</p>
                      <p className="text-sm text-muted-foreground mb-2">{bottleneck.impact}</p>
                      {bottleneck.utilizationRate !== undefined && (
                        <div className="mb-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Utilization Rate</span>
                            <span className="font-medium">{bottleneck.utilizationRate}%</span>
                          </div>
                          <Progress
                            value={bottleneck.utilizationRate}
                            className={`h-2 ${
                              bottleneck.utilizationRate > 100 ? 'bg-red-200' : 'bg-gray-200'
                            }`}
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <ChevronRight className="h-4 w-4" />
                        <span>{bottleneck.recommendation}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Simulation Alerts
          </CardTitle>
          <CardDescription>
            Threshold violations and warnings from the simulation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No alerts generated in this scenario</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Critical Alerts */}
              {criticalAlerts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-red-700">Critical Alerts</h4>
                  {criticalAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 border rounded-lg ${getAlertBgColor(alert.type)}`}
                    >
                      <div className="flex items-start gap-3">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <p className="font-medium">{alert.message}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>Week {alert.week}</span>
                            <span>{alert.metric}</span>
                            <span>
                              Threshold: {alert.threshold} | Actual: {alert.actualValue}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Warning Alerts */}
              {warningAlerts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-orange-700">Warnings</h4>
                  {warningAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 border rounded-lg ${getAlertBgColor(alert.type)}`}
                    >
                      <div className="flex items-start gap-3">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <p className="font-medium">{alert.message}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>Week {alert.week}</span>
                            <span>{alert.metric}</span>
                            <span>
                              Threshold: {alert.threshold} | Actual: {alert.actualValue}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Info Alerts */}
              {infoAlerts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-blue-700">Information</h4>
                  {infoAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 border rounded-lg ${getAlertBgColor(alert.type)}`}
                    >
                      <div className="flex items-start gap-3">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <p className="font-medium">{alert.message}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>Week {alert.week}</span>
                            <span>{alert.metric}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
