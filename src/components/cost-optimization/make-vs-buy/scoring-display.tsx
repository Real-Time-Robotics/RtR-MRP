"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Wrench,
  Target,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

interface ScoringDisplayProps {
  financialScore: number;
  capabilityScore: number;
  strategicScore: number;
  overallScore: number;
  recommendation: string;
  rationale: string;
  conditions: string[];
}

const recommendationConfig: Record<
  string,
  { label: string; color: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  STRONG_MAKE: {
    label: "Tu san xuat",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    variant: "default",
  },
  CONSIDER_MAKE: {
    label: "Can nhac tu lam",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    variant: "secondary",
  },
  NEUTRAL: {
    label: "Trung lap",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    variant: "outline",
  },
  CONSIDER_BUY: {
    label: "Can nhac mua ngoai",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    variant: "secondary",
  },
  STRONG_BUY: {
    label: "Mua ngoai",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    variant: "destructive",
  },
};

function ScoreBar({ score, label, icon }: { score: number; label: string; icon: React.ReactNode }) {
  const percent = (score / 10) * 100;
  const color =
    score >= 7 ? "bg-green-500" : score >= 5 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5">
          {icon}
          <span>{label}</span>
        </div>
        <span className="font-semibold">{score.toFixed(1)}/10</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function ScoringDisplay({
  financialScore,
  capabilityScore,
  strategicScore,
  overallScore,
  recommendation,
  rationale,
  conditions,
}: ScoringDisplayProps) {
  const config = recommendationConfig[recommendation] || recommendationConfig.NEUTRAL;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Diem danh gia & Khuyen nghi</span>
          <Badge className={config.color}>{config.label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <div className="text-3xl font-bold">
            {overallScore.toFixed(1)}
            <span className="text-lg text-muted-foreground">/10</span>
          </div>
          <div className="text-sm text-muted-foreground mt-1">Diem tong hop</div>
        </div>

        {/* Sub-scores */}
        <div className="space-y-3">
          <ScoreBar
            score={financialScore}
            label="Tai chinh (40%)"
            icon={<DollarSign className="w-3.5 h-3.5 text-green-600" />}
          />
          <ScoreBar
            score={capabilityScore}
            label="Nang luc (30%)"
            icon={<Wrench className="w-3.5 h-3.5 text-blue-600" />}
          />
          <ScoreBar
            score={strategicScore}
            label="Chien luoc (30%)"
            icon={<Target className="w-3.5 h-3.5 text-purple-600" />}
          />
        </div>

        {/* Rationale */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm">{rationale}</p>
          </div>
        </div>

        {/* Conditions */}
        {conditions.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Dieu kien
            </div>
            <ul className="space-y-1">
              {conditions.map((c, i) => (
                <li key={i} className="text-sm text-muted-foreground pl-5 relative">
                  <span className="absolute left-1.5 top-2 w-1 h-1 bg-amber-500 rounded-full" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
