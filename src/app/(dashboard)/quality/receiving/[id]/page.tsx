"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

interface Inspection {
  id: string;
  inspectionNumber: string;
  type: string;
  status: string;
  result: string | null;
  lotNumber: string | null;
  quantityReceived: number | null;
  quantityInspected: number | null;
  quantityAccepted: number | null;
  quantityRejected: number | null;
  notes: string | null;
  createdAt: string;
  inspectedAt: string | null;
  part?: { id: string; partNumber: string; name: string; unit: string } | null;
  product?: { id: string; sku: string; name: string } | null;
  plan?: { id: string; planNumber: string; name: string } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  on_hold: "bg-amber-100 text-amber-800",
};

const resultConfig: Record<string, { color: string; icon: typeof CheckCircle }> = {
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
      }
    } catch (error) {
      console.error("Failed to fetch inspection:", error);
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
        alert(error.error || "Failed to update");
      }
    } catch (error) {
      console.error("Failed to update:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleStartInspection = () => {
    updateInspection({ status: "in_progress" });
  };

  const handleComplete = (result: "PASS" | "FAIL" | "CONDITIONAL") => {
    updateInspection({
      status: "completed",
      result,
      quantityAccepted: result === "PASS" ? inspection?.quantityReceived : 0,
      quantityRejected: result === "FAIL" ? inspection?.quantityReceived : 0,
      notes,
    });
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
        <Button variant="outline" className="mt-4" onClick={() => router.push("/quality/receiving")}>
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/quality/receiving")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{inspection.inspectionNumber}</h1>
            <p className="text-muted-foreground">Receiving Inspection</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusColors[inspection.status] || statusColors.pending}>
            {inspection.status.replace("_", " ").toUpperCase()}
          </Badge>
          {inspection.result && (
            <Badge className={resultConfig[inspection.result]?.color || ""}>
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
                <span className="font-medium">{inspection.part.partNumber} - {inspection.part.name}</span>
              </div>
            )}
            {inspection.lotNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lot/Batch</span>
                <span className="font-medium">{inspection.lotNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ngày tạo</span>
              <span>{format(new Date(inspection.createdAt), "dd/MM/yyyy HH:mm")}</span>
            </div>
            {inspection.inspectedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ngày hoàn thành</span>
                <span>{format(new Date(inspection.inspectedAt), "dd/MM/yyyy HH:mm")}</span>
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
              <span className="font-medium">{inspection.quantityReceived ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SL kiểm tra</span>
              <span className="font-medium">{inspection.quantityInspected ?? 0}</span>
            </div>
            {inspection.quantityAccepted != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">SL chấp nhận</span>
                <span className="font-medium text-green-600">{inspection.quantityAccepted}</span>
              </div>
            )}
            {inspection.quantityRejected != null && inspection.quantityRejected > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">SL từ chối</span>
                <span className="font-medium text-red-600">{inspection.quantityRejected}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ghi chú</CardTitle>
        </CardHeader>
        <CardContent>
          {inspection.status === "completed" ? (
            <p className="text-sm">{inspection.notes || "Không có ghi chú"}</p>
          ) : (
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú kết quả kiểm tra..."
              rows={3}
            />
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {inspection.status !== "completed" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thao tác</CardTitle>
          </CardHeader>
          <CardContent>
            {inspection.status === "pending" && (
              <Button onClick={handleStartInspection} disabled={updating}>
                {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Bắt đầu kiểm tra
              </Button>
            )}
            {inspection.status === "in_progress" && (
              <div className="flex gap-3">
                <Button
                  onClick={() => handleComplete("PASS")}
                  disabled={updating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Đạt (PASS)
                </Button>
                <Button
                  onClick={() => handleComplete("CONDITIONAL")}
                  disabled={updating}
                  variant="outline"
                  className="border-amber-500 text-amber-600 hover:bg-amber-50"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Chấp nhận có điều kiện
                </Button>
                <Button
                  onClick={() => handleComplete("FAIL")}
                  disabled={updating}
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
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
