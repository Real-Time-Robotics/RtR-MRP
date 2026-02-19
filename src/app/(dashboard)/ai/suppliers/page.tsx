"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/page-header";
import { RiskGauge } from "@/components/ai/risk-gauge";
import { TrendIndicator } from "@/components/ai/trend-indicator";
import {
  calculateSupplierRiskScore,
  generateMockSupplierMetrics,
} from "@/lib/ai/supplier-scorer";
import { clientLogger } from '@/lib/client-logger';

interface Supplier {
  id: string;
  name: string;
  country: string;
  leadTimeDays: number;
}

interface SupplierRisk {
  supplierId: string;
  supplierName: string;
  overallScore: number;
  riskLevel: string;
  deliveryScore: number;
  qualityScore: number;
  financialScore: number;
  geographicScore: number;
  communicationScore: number;
  trend: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
}

export default function SupplierRiskPage() {
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [riskScores, setRiskScores] = useState<SupplierRisk[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRisk | null>(
    null
  );

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers");
      const response = await res.json();
      // Handle paginated response format
      const supplierData = Array.isArray(response) ? response : (response.data || []);
      setSuppliers(supplierData);
      calculateRiskScores(supplierData);
    } catch (error) {
      clientLogger.error("Failed to fetch suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRiskScores = (supplierList: Supplier[]) => {
    const scores = supplierList.map((supplier) => {
      const metrics = generateMockSupplierMetrics(
        supplier.id,
        supplier.name,
        supplier.country
      );
      const score = calculateSupplierRiskScore(metrics);
      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        overallScore: score.overallScore,
        riskLevel: score.riskLevel,
        deliveryScore: score.deliveryScore,
        qualityScore: score.qualityScore,
        financialScore: score.financialScore,
        geographicScore: score.geographicScore,
        communicationScore: score.communicationScore,
        trend: score.trend,
        strengths: score.strengths,
        risks: score.risks,
        recommendations: score.recommendations,
      };
    });

    // Sort by risk level (critical first)
    const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    scores.sort(
      (a, b) =>
        (riskOrder[a.riskLevel as keyof typeof riskOrder] || 4) -
        (riskOrder[b.riskLevel as keyof typeof riskOrder] || 4)
    );

    setRiskScores(scores);
    if (scores.length > 0) {
      setSelectedSupplier(scores.find((s) => s.riskLevel !== "LOW") || scores[0]);
    }
  };

  const lowRisk = riskScores.filter((s) => s.riskLevel === "LOW").length;
  const mediumRisk = riskScores.filter((s) => s.riskLevel === "MEDIUM").length;
  const highRisk = riskScores.filter(
    (s) => s.riskLevel === "HIGH" || s.riskLevel === "CRITICAL"
  ).length;
  const avgScore = Math.round(
    riskScores.reduce((sum, s) => sum + s.overallScore, 0) / riskScores.length ||
      0
  );

  const getRiskColor = (level: string) => {
    switch (level) {
      case "LOW":
        return "bg-green-100 text-green-800";
      case "MEDIUM":
        return "bg-amber-100 text-amber-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "CRITICAL":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Risk Analysis"
        description="AI-powered supplier risk assessment and recommendations"
        backHref="/ai"
        actions={
          <Button variant="outline" onClick={fetchSuppliers} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Recalculate
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-green-600 font-bold">{lowRisk}</span>
            </div>
            <div>
              <p className="text-2xl font-bold">{lowRisk}</p>
              <p className="text-sm text-muted-foreground">Low Risk</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div>
            <p className="text-2xl font-bold text-amber-600">{mediumRisk}</p>
            <p className="text-sm text-muted-foreground">Medium Risk</p>
          </div>
        </Card>
        <Card className="p-4">
          <div>
            <p className="text-2xl font-bold text-red-600">{highRisk}</p>
            <p className="text-sm text-muted-foreground">High/Critical</p>
          </div>
        </Card>
        <Card className="p-4">
          <div>
            <p className="text-2xl font-bold">{avgScore}</p>
            <p className="text-sm text-muted-foreground">Avg Score</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Supplier List */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Suppliers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {riskScores.map((supplier) => (
                  <div
                    key={supplier.supplierId}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedSupplier?.supplierId === supplier.supplierId
                        ? "bg-blue-50"
                        : ""
                    }`}
                    onClick={() => setSelectedSupplier(supplier)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{supplier.supplierName}</p>
                        <p className="text-sm text-muted-foreground">
                          Score: {supplier.overallScore}/100
                        </p>
                      </div>
                      <Badge className={getRiskColor(supplier.riskLevel)}>
                        {supplier.riskLevel}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Supplier Detail */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedSupplier?.riskLevel === "HIGH" ||
              selectedSupplier?.riskLevel === "CRITICAL" ? (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              ) : null}
              {selectedSupplier?.supplierName || "Select a supplier"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedSupplier ? (
              <div className="space-y-6">
                {/* Risk Gauge */}
                <div className="flex justify-center">
                  <RiskGauge score={selectedSupplier.overallScore} size="lg" />
                </div>

                {/* Factor Scores */}
                <div className="space-y-4">
                  <h4 className="font-medium">Risk Factor Breakdown</h4>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Delivery</span>
                        <span className="flex items-center gap-2">
                          {selectedSupplier.deliveryScore}%
                          <TrendIndicator
                            trend={
                              selectedSupplier.deliveryScore > 70
                                ? "STABLE"
                                : "DECLINING"
                            }
                          />
                        </span>
                      </div>
                      <Progress value={selectedSupplier.deliveryScore} />
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Quality</span>
                        <span>{selectedSupplier.qualityScore}%</span>
                      </div>
                      <Progress value={selectedSupplier.qualityScore} />
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Financial</span>
                        <span>{selectedSupplier.financialScore}%</span>
                      </div>
                      <Progress value={selectedSupplier.financialScore} />
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Geographic</span>
                        <span>{selectedSupplier.geographicScore}%</span>
                      </div>
                      <Progress value={selectedSupplier.geographicScore} />
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Communication</span>
                        <span>{selectedSupplier.communicationScore}%</span>
                      </div>
                      <Progress value={selectedSupplier.communicationScore} />
                    </div>
                  </div>
                </div>

                {/* Strengths & Risks */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedSupplier.strengths.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-600 mb-2">
                        Strengths
                      </h4>
                      <ul className="text-sm space-y-1">
                        {selectedSupplier.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-500">+</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedSupplier.risks.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-600 mb-2">Risks</h4>
                      <ul className="text-sm space-y-1">
                        {selectedSupplier.risks.map((r, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-red-500">!</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Recommendations */}
                {selectedSupplier.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Recommendations</h4>
                    <ul className="text-sm space-y-1">
                      {selectedSupplier.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-500">*</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Select a supplier to view details
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
