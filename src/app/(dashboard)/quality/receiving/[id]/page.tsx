"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Pencil,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { clientLogger } from '@/lib/client-logger';

interface Inspection {
  id: string;
  inspectionNumber: string;
  type: string;
  status: string;
  result: string | null;
  sourceType: string | null;
  lotNumber: string | null;
  quantityReceived: number | null;
  quantityInspected: number | null;
  quantityAccepted: number | null;
  quantityRejected: number | null;
  notes: string | null;
  createdAt: string;
  inspectedAt: string | null;
  part?: {
    id: string;
    partNumber: string;
    name: string;
    unit: string;
  } | null;
  product?: { id: string; sku: string; name: string } | null;
  plan?: { id: string; planNumber: string; name: string } | null;
  workOrder?: { id: string; woNumber: string; status: string; completedQty: number } | null;
}

const sourceTypeLabels: Record<string, string> = {
  PO: "Nhận từ PO",
  NON_PO: "Nhận ngoài PO",
  PRODUCTION: "Nhận từ sản xuất",
};

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  on_hold: "bg-amber-100 text-amber-800",
};

const resultConfig: Record<
  string,
  { color: string; icon: typeof CheckCircle }
> = {
  PASS: { color: "bg-green-100 text-green-800", icon: CheckCircle },
  FAIL: { color: "bg-red-100 text-red-800", icon: XCircle },
  CONDITIONAL: { color: "bg-amber-100 text-amber-800", icon: AlertTriangle },
};

export default function ReceivingInspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [lotEditable, setLotEditable] = useState(false);

  // Inspection result form state
  const [quantityInspected, setQuantityInspected] = useState("");
  const [quantityAccepted, setQuantityAccepted] = useState("");
  const [quantityRejected, setQuantityRejected] = useState("");

  useEffect(() => {
    fetchInspection();
  }, [id]);

  const fetchInspection = async () => {
    try {
      const res = await fetch(`/api/quality/inspections/${id}`);
      if (res.ok) {
        const data = await res.json();
        setInspection(data);
        setNotes(data.notes || "");
        setLotNumber(data.lotNumber || "");
        // Pre-fill quantities
        const received = data.quantityReceived ?? 0;
        setQuantityInspected(String(data.quantityInspected || received));
        setQuantityAccepted(String(data.quantityAccepted || received));
        setQuantityRejected(String(data.quantityRejected || 0));
      } else {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        clientLogger.error("Inspection fetch failed:", err);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch inspection:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateInspection = async (updateData: Record<string, unknown>) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/quality/inspections/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (res.ok) {
        const data = await res.json();
        setInspection(data);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update");
      }
    } catch (error) {
      clientLogger.error("Failed to update:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleStartInspection = () => {
    if (!lotNumber.trim()) {
      toast.error("Vui lòng nhập số Lot/Batch trước khi bắt đầu kiểm tra");
      return;
    }
    updateInspection({ status: "in_progress", lotNumber: lotNumber.trim() });
  };

  const handleComplete = (result: "PASS" | "FAIL" | "CONDITIONAL") => {
    const inspected = parseInt(quantityInspected) || 0;
    const accepted = parseInt(quantityAccepted) || 0;
    const rejected = parseInt(quantityRejected) || 0;
    const received = inspection?.quantityReceived ?? 0;

    // Validation
    if (inspected <= 0) {
      toast.error("Số lượng kiểm tra phải lớn hơn 0");
      return;
    }
    if (inspected > received) {
      toast.error(`Số lượng kiểm tra (${inspected}) không thể lớn hơn số lượng nhận (${received})`);
      return;
    }
    if (accepted + rejected !== inspected) {
      toast.error(
        `Số lượng chấp nhận (${accepted}) + từ chối (${rejected}) phải bằng số lượng kiểm tra (${inspected})`
      );
      return;
    }
    if (result === "PASS" && rejected > 0) {
      toast.error("Kết quả ĐẠT không thể có số lượng từ chối > 0");
      return;
    }
    if (result === "FAIL" && accepted > 0) {
      toast.error("Kết quả KHÔNG ĐẠT không thể có số lượng chấp nhận > 0");
      return;
    }
    if (result === "CONDITIONAL" && (accepted <= 0 || rejected <= 0)) {
      toast.error(
        "Chấp nhận có điều kiện phải có cả số lượng chấp nhận và từ chối > 0"
      );
      return;
    }

    updateInspection({
      status: "completed",
      result,
      quantityInspected: inspected,
      quantityAccepted: accepted,
      quantityRejected: rejected,
      lotNumber: lotNumber.trim(),
      notes,
    });
  };

  // Auto-calculate rejected when accepted changes (and vice versa)
  const handleAcceptedChange = (value: string) => {
    setQuantityAccepted(value);
    const inspected = parseInt(quantityInspected) || 0;
    const accepted = parseInt(value) || 0;
    setQuantityRejected(String(Math.max(0, inspected - accepted)));
  };

  const handleRejectedChange = (value: string) => {
    setQuantityRejected(value);
    const inspected = parseInt(quantityInspected) || 0;
    const rejected = parseInt(value) || 0;
    setQuantityAccepted(String(Math.max(0, inspected - rejected)));
  };

  const handleInspectedChange = (value: string) => {
    setQuantityInspected(value);
    const inspected = parseInt(value) || 0;
    setQuantityAccepted(String(inspected));
    setQuantityRejected("0");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Không tìm thấy inspection</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/quality/receiving")}
        >
          Quay lại
        </Button>
      </div>
    );
  }

  const received = inspection.quantityReceived ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/quality/receiving")}
            aria-label="Quay lại"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {inspection.inspectionNumber}
            </h1>
            <p className="text-muted-foreground">
              {inspection.sourceType && sourceTypeLabels[inspection.sourceType]
                ? sourceTypeLabels[inspection.sourceType]
                : "Receiving Inspection"}
              {inspection.workOrder && ` - ${inspection.workOrder.woNumber}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className={
              statusColors[inspection.status] || statusColors.pending
            }
          >
            {inspection.status.replace("_", " ").toUpperCase()}
          </Badge>
          {inspection.result && (
            <Badge
              className={resultConfig[inspection.result]?.color || ""}
            >
              {inspection.result}
            </Badge>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin vật tư</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inspection.part && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Part</span>
                <span className="font-medium">
                  {inspection.part.partNumber} - {inspection.part.name}
                </span>
              </div>
            )}
            {!inspection.part && inspection.product && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sản phẩm</span>
                <span className="font-medium">
                  {inspection.product.sku} - {inspection.product.name}
                </span>
              </div>
            )}
            {inspection.workOrder && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Work Order</span>
                <span className="font-medium">{inspection.workOrder.woNumber}</span>
              </div>
            )}
            {inspection.status === "completed" ? (
              inspection.lotNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lot/Batch</span>
                  <span className="font-medium">{inspection.lotNumber}</span>
                </div>
              )
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Lot/Batch *</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setLotEditable(!lotEditable)}
                  >
                    {lotEditable ? (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {lotEditable ? (
                  <Input
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    placeholder="VD: LOT-PO-2025-001-1"
                    className="h-8 text-sm"
                  />
                ) : (
                  <p className="font-medium text-sm font-mono bg-muted/50 px-2 py-1 rounded">
                    {lotNumber || <span className="text-red-500 italic">Chưa có lot - nhấn bút để nhập</span>}
                  </p>
                )}
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ngày tạo</span>
              <span>
                {format(new Date(inspection.createdAt), "dd/MM/yyyy HH:mm")}
              </span>
            </div>
            {inspection.inspectedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ngày hoàn thành</span>
                <span>
                  {format(
                    new Date(inspection.inspectedAt),
                    "dd/MM/yyyy HH:mm"
                  )}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Số lượng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">SL nhận</span>
              <span className="font-medium">{received}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SL kiểm tra</span>
              <span className="font-medium">
                {inspection.quantityInspected ?? 0}
              </span>
            </div>
            {inspection.quantityAccepted != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">SL chấp nhận</span>
                <span className="font-medium text-green-600">
                  {inspection.quantityAccepted}
                </span>
              </div>
            )}
            {inspection.quantityRejected != null &&
              inspection.quantityRejected > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SL từ chối</span>
                  <span className="font-medium text-red-600">
                    {inspection.quantityRejected}
                  </span>
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Inspection Form — only visible when in_progress */}
      {inspection.status === "in_progress" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kết quả kiểm tra</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qtyInspected">SL kiểm tra *</Label>
                <Input
                  id="qtyInspected"
                  type="number"
                  min="1"
                  max={received}
                  value={quantityInspected}
                  onChange={(e) => handleInspectedChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Tối đa: {received}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qtyAccepted">SL chấp nhận</Label>
                <Input
                  id="qtyAccepted"
                  type="number"
                  min="0"
                  max={parseInt(quantityInspected) || 0}
                  value={quantityAccepted}
                  onChange={(e) => handleAcceptedChange(e.target.value)}
                  className="border-green-300 focus:ring-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qtyRejected">SL từ chối</Label>
                <Input
                  id="qtyRejected"
                  type="number"
                  min="0"
                  max={parseInt(quantityInspected) || 0}
                  value={quantityRejected}
                  onChange={(e) => handleRejectedChange(e.target.value)}
                  className="border-red-300 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Summary bar */}
            {parseInt(quantityInspected) > 0 && (
              <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                {parseInt(quantityAccepted) > 0 && (
                  <div
                    className="bg-green-500 transition-all"
                    style={{
                      width: `${(parseInt(quantityAccepted) / parseInt(quantityInspected)) * 100}%`,
                    }}
                  />
                )}
                {parseInt(quantityRejected) > 0 && (
                  <div
                    className="bg-red-500 transition-all"
                    style={{
                      width: `${(parseInt(quantityRejected) / parseInt(quantityInspected)) * 100}%`,
                    }}
                  />
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="inspectionNotes">Ghi chú / Điều kiện</Label>
              <Textarea
                id="inspectionNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú kết quả kiểm tra, điều kiện chấp nhận..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes (read-only when completed) */}
      {inspection.status === "completed" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ghi chú</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {inspection.notes || "Không có ghi chú"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Notes editable when pending */}
      {inspection.status === "pending" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ghi chú</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú kết quả kiểm tra..."
              rows={3}
            />
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {inspection.status !== "completed" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thao tác</CardTitle>
          </CardHeader>
          <CardContent>
            {inspection.status === "pending" && (
              <Button size="sm" onClick={handleStartInspection} disabled={updating}>
                {updating && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Bắt đầu kiểm tra
              </Button>
            )}
            {inspection.status === "in_progress" && (
              <div className="flex flex-wrap gap-3">
                <Button
                  size="sm"
                  onClick={() => handleComplete("PASS")}
                  disabled={updating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {updating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Đạt (PASS)
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleComplete("CONDITIONAL")}
                  disabled={updating}
                  variant="outline"
                  className="border-amber-500 text-amber-600 hover:bg-amber-50"
                >
                  {updating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 mr-2" />
                  )}
                  Chấp nhận có điều kiện
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleComplete("FAIL")}
                  disabled={updating}
                  variant="destructive"
                >
                  {updating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Không đạt (FAIL)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
