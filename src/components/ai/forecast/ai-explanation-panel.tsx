"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Brain,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  ChevronDown,
  Target,
  Calendar,
  Zap,
  ShieldAlert,
  Clock,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface AIInsights {
  summary: string;
  keyDrivers: string[];
  risks: string[];
  opportunities: string[];
}

interface RiskFactor {
  factor: string;
  impact: number;
  description: string;
}

interface RiskAssessment {
  level: "low" | "medium" | "high" | "critical";
  factors: RiskFactor[];
}

interface ActionItem {
  priority: "high" | "medium" | "low";
  action: string;
  deadline: string;
  impact: string;
}

interface AIExplanationPanelProps {
  insights?: AIInsights;
  riskAssessment?: RiskAssessment;
  actionItems?: ActionItem[];
  modelExplanation?: {
    model: string;
    confidence: number;
    factors: Array<{
      name: string;
      weight: number;
      description: string;
    }>;
  };
  isLoading?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getRiskColor(level: string) {
  switch (level) {
    case "critical":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "high":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    case "medium":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    default:
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "high":
      return "border-l-red-500 bg-red-50 dark:bg-red-900/20";
    case "medium":
      return "border-l-amber-500 bg-amber-50 dark:bg-amber-900/20";
    default:
      return "border-l-green-500 bg-green-50 dark:bg-green-900/20";
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AIExplanationPanel({
  insights,
  riskAssessment,
  actionItems,
  modelExplanation,
  isLoading = false,
}: AIExplanationPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    insights: true,
    risks: true,
    actions: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Brain className="h-8 w-8 animate-pulse text-primary mr-3" />
            <div>
              <p className="font-medium">Analyzing forecast...</p>
              <p className="text-sm text-muted-foreground">AI is generating insights</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights && !riskAssessment && !actionItems && !modelExplanation) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-muted-foreground py-8">
            <Brain className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No AI Analysis Available</p>
            <p className="text-sm">Generate an enhanced forecast to see AI insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="insights" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="insights" className="text-xs">
              <Lightbulb className="h-3 w-3 mr-1" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="risks" className="text-xs">
              <ShieldAlert className="h-3 w-3 mr-1" />
              Risks
            </TabsTrigger>
            <TabsTrigger value="actions" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              Actions
            </TabsTrigger>
          </TabsList>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            {insights ? (
              <>
                {/* Summary */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm leading-relaxed">{insights.summary}</p>
                </div>

                {/* Key Drivers */}
                {insights.keyDrivers.length > 0 && (
                  <Collapsible
                    open={expandedSections.insights}
                    onOpenChange={() => toggleSection("insights")}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          Key Drivers ({insights.keyDrivers.length})
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            expandedSections.insights ? "rotate-180" : ""
                          }`}
                        />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-2">
                      {insights.keyDrivers.map((driver, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20"
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                          <span className="text-sm">{driver}</span>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Opportunities */}
                {insights.opportunities.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Opportunities
                    </h4>
                    {insights.opportunities.map((opp, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20"
                      >
                        <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5" />
                        <span className="text-sm">{opp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No insights available
              </p>
            )}
          </TabsContent>

          {/* Risks Tab */}
          <TabsContent value="risks" className="space-y-4">
            {riskAssessment ? (
              <>
                {/* Overall Risk Level */}
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <span className="font-medium">Overall Risk Level</span>
                  <Badge className={getRiskColor(riskAssessment.level)}>
                    <ShieldAlert className="h-3 w-3 mr-1" />
                    {riskAssessment.level.toUpperCase()}
                  </Badge>
                </div>

                {/* Risk Factors */}
                <div className="space-y-3">
                  {riskAssessment.factors.map((factor, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{factor.factor}</span>
                        <Badge variant="outline">
                          Impact: {(factor.impact * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {factor.description}
                      </p>
                      {/* Impact bar */}
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            factor.impact > 0.7
                              ? "bg-red-500"
                              : factor.impact > 0.4
                                ? "bg-amber-500"
                                : "bg-green-500"
                          }`}
                          style={{ width: `${factor.impact * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Risk Warnings from Insights */}
                {insights?.risks && insights.risks.length > 0 && (
                  <div className="space-y-2 pt-4 border-t">
                    <h4 className="text-sm font-medium">Risk Warnings</h4>
                    {insights.risks.map((risk, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20"
                      >
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                        <span className="text-sm">{risk}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <ShieldAlert className="h-8 w-8 mb-2 opacity-50" />
                <p>No risk assessment available</p>
              </div>
            )}
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-4">
            {actionItems && actionItems.length > 0 ? (
              <div className="space-y-3">
                {actionItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-l-4 ${getPriorityColor(item.priority)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge
                        variant="outline"
                        className={
                          item.priority === "high"
                            ? "bg-red-100 text-red-800 border-0"
                            : item.priority === "medium"
                              ? "bg-amber-100 text-amber-800 border-0"
                              : "bg-green-100 text-green-800 border-0"
                        }
                      >
                        {item.priority.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.deadline}
                      </span>
                    </div>
                    <p className="font-medium text-sm mb-1">{item.action}</p>
                    <p className="text-xs text-muted-foreground">
                      <Target className="h-3 w-3 inline mr-1" />
                      Impact: {item.impact}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Zap className="h-8 w-8 mb-2 opacity-50" />
                <p>No action items available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Model Explanation */}
        {modelExplanation && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Model: {modelExplanation.model}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {modelExplanation.factors.slice(0, 4).map((factor, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded bg-muted/50 text-xs"
                  title={factor.description}
                >
                  <div className="flex justify-between mb-1">
                    <span className="truncate">{factor.name}</span>
                    <span className="font-mono">{(factor.weight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${factor.weight * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SIMPLE INSIGHT BADGE
// =============================================================================

export function InsightBadge({
  type,
  count,
}: {
  type: "drivers" | "risks" | "opportunities" | "actions";
  count: number;
}) {
  const config = {
    drivers: { icon: TrendingUp, color: "bg-green-100 text-green-800" },
    risks: { icon: AlertTriangle, color: "bg-red-100 text-red-800" },
    opportunities: { icon: Lightbulb, color: "bg-amber-100 text-amber-800" },
    actions: { icon: Zap, color: "bg-blue-100 text-blue-800" },
  };

  const { icon: Icon, color } = config[type];

  return (
    <Badge className={`${color} border-0`}>
      <Icon className="h-3 w-3 mr-1" />
      {count} {type}
    </Badge>
  );
}
