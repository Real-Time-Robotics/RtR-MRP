"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, AlertTriangle, XCircle, ArrowUp, ArrowDown, Minus,
} from "lucide-react";

interface SpecComparisonItem {
  specName: string;
  originalValue: string;
  substituteValue: string;
  matchType: "exact" | "better" | "acceptable" | "worse" | "incompatible";
  notes?: string;
}

interface SpecsComparisonProps {
  originalPart: { partNumber: string; name: string };
  substitutePart: { partNumber: string; name: string };
  specs: SpecComparisonItem[];
  overallScore: number;
}

const MATCH_CONFIG = {
  exact: { icon: Minus, color: "text-gray-500", bg: "bg-gray-50 dark:bg-gray-900/20", label: "Exact" },
  better: { icon: ArrowUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20", label: "Better" },
  acceptable: { icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20", label: "OK" },
  worse: { icon: ArrowDown, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-900/20", label: "Lower" },
  incompatible: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20", label: "Issue" },
};

export function SpecsComparison({
  originalPart,
  substitutePart,
  specs,
  overallScore,
}: SpecsComparisonProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">So sanh Specs</CardTitle>
          <Badge
            className={
              overallScore >= 90
                ? "bg-green-100 text-green-700"
                : overallScore >= 70
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
            }
          >
            Tuong thich: {overallScore}%
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <span className="font-mono text-xs">{originalPart.partNumber}</span>
          <span>vs</span>
          <span className="font-mono text-xs text-primary">{substitutePart.partNumber}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="grid grid-cols-4 gap-4 text-xs font-medium text-muted-foreground pb-2 border-b">
            <div>Spec</div>
            <div className="text-center">Original</div>
            <div className="text-center">Substitute</div>
            <div className="text-center">Match</div>
          </div>

          {specs.map((spec) => {
            const config = MATCH_CONFIG[spec.matchType];
            const Icon = config.icon;

            return (
              <div
                key={spec.specName}
                className={`grid grid-cols-4 gap-4 py-2 px-1 rounded ${config.bg}`}
              >
                <div className="text-sm font-medium">{spec.specName}</div>
                <div className="text-sm text-center">{spec.originalValue}</div>
                <div className="text-sm text-center font-medium">
                  {spec.substituteValue}
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                  <span className={`text-xs ${config.color}`}>
                    {spec.notes || config.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
          {Object.entries(MATCH_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <div key={key} className="flex items-center gap-1">
                <Icon className={`w-3 h-3 ${config.color}`} />
                <span>{config.label}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
