"use client";

import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, AlertTriangle, XCircle, Star, FlaskConical,
} from "lucide-react";
import { SubstituteSearchResult } from "@/hooks/cost-optimization/use-substitutes";

interface SubstituteResultsProps {
  originalPrice: number;
  results: SubstituteSearchResult[];
  onCreateEvaluation: (substituteId: string) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
  }).format(value);
}

export function SubstituteResults({
  originalPrice,
  results,
  onCreateEvaluation,
}: SubstituteResultsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getRecommendationBadge = (result: SubstituteSearchResult) => {
    if (!result.ndaaCompliant) {
      return (
        <Badge variant="destructive" className="gap-1 text-xs">
          <XCircle className="w-3 h-3" />
          Rui ro NDAA
        </Badge>
      );
    }
    if (result.compatibilityScore >= 90 && result.savingsPercent >= 30) {
      return (
        <Badge className="gap-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <Star className="w-3 h-3" />
          Khuyen dung
        </Badge>
      );
    }
    if (result.compatibilityScore >= 80) {
      return (
        <Badge variant="secondary" className="gap-1 text-xs">
          <CheckCircle2 className="w-3 h-3" />
          Tot
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <AlertTriangle className="w-3 h-3" />
        Can danh gia
      </Badge>
    );
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Part</TableHead>
            <TableHead className="text-right">Gia</TableHead>
            <TableHead className="text-right">Tiet kiem</TableHead>
            <TableHead className="text-center">Tuong thich</TableHead>
            <TableHead className="text-center">NDAA</TableHead>
            <TableHead>Danh gia</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                Khong tim thay linh kien thay the phu hop
              </TableCell>
            </TableRow>
          ) : (
            results.map((result, index) => (
              <TableRow
                key={result.id}
                className={
                  index === 0 && result.compatibilityScore >= 90
                    ? "bg-green-50/50 dark:bg-green-950/10"
                    : undefined
                }
                onClick={() =>
                  setExpandedId(expandedId === result.id ? null : result.id)
                }
              >
                <TableCell>
                  <div>
                    <span className="font-mono text-xs">{result.partNumber}</span>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {result.name}
                    </div>
                    {result.supplier && (
                      <div className="text-xs text-muted-foreground">
                        NCC: {result.supplier.name}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-mono text-sm">{formatCurrency(result.price)}</div>
                  <div className="text-xs text-muted-foreground">
                    vs {formatCurrency(originalPrice)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={`font-mono text-sm font-bold ${
                      result.savingsPercent >= 50
                        ? "text-green-600"
                        : result.savingsPercent >= 30
                        ? "text-blue-600"
                        : result.savingsPercent > 0
                        ? "text-gray-600"
                        : "text-red-600"
                    }`}
                  >
                    {result.savingsPercent}%
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          result.compatibilityScore >= 90
                            ? "bg-green-500"
                            : result.compatibilityScore >= 70
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${result.compatibilityScore}%` }}
                      />
                    </div>
                    <span className="text-xs">{result.compatibilityScore}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {result.ndaaCompliant ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                  )}
                </TableCell>
                <TableCell>{getRecommendationBadge(result)}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateEvaluation(result.id);
                    }}
                    title="Tao danh gia"
                  >
                    <FlaskConical className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
