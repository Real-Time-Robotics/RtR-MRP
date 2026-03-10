"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2, XCircle, ShieldCheck, ShieldAlert,
  AlertTriangle, Package, ArrowRight, Loader2,
} from "lucide-react";
import { SubstituteEvaluation } from "@/hooks/cost-optimization/use-substitutes";

interface EvaluationDetailProps {
  evaluation: SubstituteEvaluation;
  onUpdate: () => void;
}

const statusFlow = [
  { key: "IDENTIFIED", label: "Tim thay" },
  { key: "EVALUATING", label: "Danh gia" },
  { key: "SUB_TESTING", label: "Test" },
  { key: "SUB_APPROVED", label: "Duyet" },
  { key: "IMPLEMENTED", label: "Trien khai" },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
  }).format(value);
}

export function EvaluationDetail({ evaluation, onUpdate }: EvaluationDetailProps) {
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const currentStepIndex = statusFlow.findIndex((s) => s.key === evaluation.status);

  const handleAdvanceStatus = async () => {
    const nextStatuses: Record<string, string> = {
      IDENTIFIED: "EVALUATING",
      EVALUATING: "SUB_TESTING",
    };
    const next = nextStatuses[evaluation.status];
    if (!next) return;

    setLoading(true);
    try {
      await fetch(`/api/cost-optimization/substitutes/${evaluation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      onUpdate();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await fetch(`/api/cost-optimization/substitutes/${evaluation.id}/approve`, {
        method: "POST",
      });
      onUpdate();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await fetch(`/api/cost-optimization/substitutes/${evaluation.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      onUpdate();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleMarkImplemented = async () => {
    setLoading(true);
    try {
      await fetch(`/api/cost-optimization/substitutes/${evaluation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IMPLEMENTED" }),
      });
      onUpdate();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleOrderSample = async () => {
    setLoading(true);
    try {
      await fetch(`/api/cost-optimization/substitutes/${evaluation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sampleOrdered: true,
          sampleOrderDate: new Date().toISOString(),
          testStatus: "SAMPLE_ORDERED",
        }),
      });
      onUpdate();
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Status Progress */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            {statusFlow.map((step, i) => {
              const isActive = step.key === evaluation.status;
              const isDone = i < currentStepIndex;
              const isRejected = evaluation.status === "SUB_REJECTED";

              return (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        isDone
                          ? "bg-green-500 text-white"
                          : isActive
                          ? isRejected
                            ? "bg-red-500 text-white"
                            : "bg-blue-500 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className="text-xs mt-1">{step.label}</span>
                  </div>
                  {i < statusFlow.length - 1 && (
                    <ArrowRight className={`w-4 h-4 mx-2 ${
                      isDone ? "text-green-500" : "text-muted-foreground"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Part Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              Original
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Part Number</span>
              <span className="font-mono">{evaluation.originalPart.partNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ten</span>
              <span className="truncate max-w-[200px]">{evaluation.originalPart.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gia</span>
              <span className="font-mono">{formatCurrency(evaluation.originalPrice)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-green-500" />
              Thay the
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Part Number</span>
              <span className="font-mono">{evaluation.substitutePart.partNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ten</span>
              <span className="truncate max-w-[200px]">{evaluation.substitutePart.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gia</span>
              <span className="font-mono text-green-600">{formatCurrency(evaluation.substitutePrice)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tiet kiem</span>
              <span className={`font-bold ${evaluation.savingsPercent > 0 ? "text-green-600" : "text-red-600"}`}>
                {evaluation.savingsPercent.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scores & Risk */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold">{evaluation.compatibilityScore}%</div>
            <div className="text-xs text-muted-foreground">Tuong thich</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="flex items-center justify-center gap-1">
              {evaluation.ndaaCompliant ? (
                <ShieldCheck className="w-5 h-5 text-green-500" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-red-500" />
              )}
              <span className="text-lg font-bold">
                {evaluation.ndaaCompliant ? "Compliant" : "Non-compliant"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">NDAA</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <Badge
              className={
                evaluation.riskLevel === "LOW"
                  ? "bg-green-100 text-green-800"
                  : evaluation.riskLevel === "MEDIUM"
                  ? "bg-yellow-100 text-yellow-800"
                  : evaluation.riskLevel === "HIGH"
                  ? "bg-orange-100 text-orange-800"
                  : "bg-red-100 text-red-800"
              }
            >
              {evaluation.riskLevel}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">Muc rui ro</div>
            {evaluation.riskFactors.length > 0 && (
              <div className="mt-2 space-y-1">
                {evaluation.riskFactors.map((f, i) => (
                  <div key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    {f}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Hanh dong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {evaluation.status === "IDENTIFIED" && (
            <div className="flex gap-2">
              <Button onClick={handleAdvanceStatus} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Bat dau danh gia
              </Button>
            </div>
          )}

          {evaluation.status === "EVALUATING" && (
            <div className="flex gap-2">
              {!evaluation.sampleOrdered && (
                <Button variant="outline" onClick={handleOrderSample} disabled={loading}>
                  Dat mau thu nghiem
                </Button>
              )}
              <Button onClick={handleAdvanceStatus} disabled={loading}>
                Chuyen sang Testing
              </Button>
            </div>
          )}

          {evaluation.status === "SUB_TESTING" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove} disabled={loading}>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Phe duyet
                </Button>
                <Button variant="destructive" onClick={() => setShowRejectForm(!showRejectForm)} disabled={loading}>
                  <XCircle className="w-4 h-4 mr-1" />
                  Tu choi
                </Button>
              </div>
              {showRejectForm && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Ly do tu choi</Label>
                    <Input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Nhap ly do..."
                    />
                  </div>
                  <Button variant="destructive" onClick={handleReject} disabled={loading || !rejectReason} className="self-end">
                    Xac nhan tu choi
                  </Button>
                </div>
              )}
            </div>
          )}

          {evaluation.status === "SUB_APPROVED" && (
            <Button onClick={handleMarkImplemented} disabled={loading}>
              Danh dau da trien khai
            </Button>
          )}

          {evaluation.status === "SUB_REJECTED" && evaluation.rejectionReason && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <div className="text-sm font-medium text-red-800 dark:text-red-400">Ly do tu choi:</div>
              <div className="text-sm text-red-700 dark:text-red-300">{evaluation.rejectionReason}</div>
            </div>
          )}

          {evaluation.status === "IMPLEMENTED" && (
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-400">
                Da trien khai thanh cong
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
