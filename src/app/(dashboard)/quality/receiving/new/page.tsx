"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  AlertCircle,
  Info,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Pencil,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";

interface Part {
  id: string;
  partNumber: string;
  name: string;
}

interface PartQC {
  inspectionRequired: boolean;
  inspectionPlan: string | null;
  aqlLevel: string | null;
  shelfLifeDays: number | null;
  lotControl: boolean;
  serialControl: boolean;
  certificateRequired: boolean;
}

interface POLine {
  id: string;
  lineNumber: number;
  partId: string;
  quantity: number;
  receivedQty: number;
  unitPrice: number;
  part: Part;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  supplier: { id: string; name: string };
  lines?: POLine[];
}

function BooleanBadge({ value, label }: { value: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      {value ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground/40" />
      )}
    </div>
  );
}

export default function NewReceivingInspectionPage() {
  const router = useRouter();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPOId, setSelectedPOId] = useState("");
  const [poLines, setPOLines] = useState<POLine[]>([]);
  const [selectedLineId, setSelectedLineId] = useState("");
  const [partQC, setPartQC] = useState<PartQC | null>(null);
  const [loadingPOs, setLoadingPOs] = useState(true);
  const [loadingLines, setLoadingLines] = useState(false);
  const [loadingQC, setLoadingQC] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lotEditable, setLotEditable] = useState(false);
  const [formData, setFormData] = useState({
    partId: "",
    partDisplay: "",
    lotNumber: "",
    quantityReceived: "",
    quantityInspected: "",
    notes: "",
  });

  // Fetch only received POs
  useEffect(() => {
    const fetchPOs = async () => {
      setLoadingPOs(true);
      try {
        const res = await fetch(
          "/api/purchase-orders?status=received&limit=100"
        );
        if (res.ok) {
          const data = await res.json();
          setPurchaseOrders(data.data || data.orders || []);
        }
      } catch (error) {
        console.error("Failed to fetch POs:", error);
      } finally {
        setLoadingPOs(false);
      }
    };
    fetchPOs();
  }, []);

  // When PO is selected, fetch its detail to get lines
  const handlePOSelect = async (poId: string) => {
    setSelectedPOId(poId);
    setSelectedLineId("");
    setPOLines([]);
    setPartQC(null);
    setFormData((prev) => ({
      ...prev,
      partId: "",
      partDisplay: "",
      quantityReceived: "",
    }));

    if (!poId) return;

    setLoadingLines(true);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}`);
      if (res.ok) {
        const data = await res.json();
        const order = data.data || data;
        const lines: POLine[] = order.lines || [];
        const availableLines = lines.filter(
          (line) => line.quantity - line.receivedQty > 0
        );
        setPOLines(availableLines);
      }
    } catch (error) {
      console.error("Failed to fetch PO detail:", error);
    } finally {
      setLoadingLines(false);
    }
  };

  // When PO Line is selected, auto-fill part/quantity and fetch Part QC info
  const handleLineSelect = async (lineId: string) => {
    setSelectedLineId(lineId);
    setPartQC(null);
    setLotEditable(false);

    const line = poLines.find((l) => l.id === lineId);
    if (line) {
      const remaining = line.quantity - line.receivedQty;
      const po = purchaseOrders.find((p) => p.id === selectedPOId);
      const autoLot = po ? `LOT-${po.poNumber}-${line.lineNumber || 1}` : "";
      setFormData((prev) => ({
        ...prev,
        partId: line.partId,
        partDisplay: `${line.part.partNumber} - ${line.part.name}`,
        quantityReceived: String(remaining),
        lotNumber: autoLot,
      }));

      // Fetch Part QC details
      setLoadingQC(true);
      try {
        const res = await fetch(`/api/parts/${line.partId}`);
        if (res.ok) {
          const data = await res.json();
          const part = data.data || data;
          setPartQC({
            inspectionRequired: part.inspectionRequired ?? false,
            inspectionPlan: part.inspectionPlan || null,
            aqlLevel: part.aqlLevel || null,
            shelfLifeDays: part.shelfLifeDays || null,
            lotControl: part.lotControl ?? false,
            serialControl: part.serialControl ?? false,
            certificateRequired: part.certificateRequired ?? false,
          });
        }
      } catch (error) {
        console.error("Failed to fetch part QC:", error);
      } finally {
        setLoadingQC(false);
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        partId: "",
        partDisplay: "",
        quantityReceived: "",
      }));
    }
  };

  const selectedPO = purchaseOrders.find((po) => po.id === selectedPOId);
  const selectedLine = poLines.find((l) => l.id === selectedLineId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPOId || !selectedLineId) {
      alert("Vui lòng chọn Đơn mua hàng và dòng PO");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/quality/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "RECEIVING",
          partId: formData.partId || null,
          poLineId: selectedLineId,
          lotNumber: formData.lotNumber || null,
          quantityReceived: parseInt(formData.quantityReceived) || 0,
          quantityInspected: parseInt(formData.quantityInspected) || 0,
          notes: formData.notes || null,
        }),
      });

      if (res.ok) {
        router.push("/quality/receiving");
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create inspection");
      }
    } catch (error) {
      console.error("Failed to create inspection:", error);
      alert("Failed to create inspection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tạo phiếu kiểm tra nhận hàng"
        description="Kiểm tra chất lượng nguyên vật liệu nhận về"
        backHref="/quality/receiving"
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Purchase Order Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Đơn mua hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingPOs ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải danh sách PO...
                </div>
              ) : purchaseOrders.length === 0 ? (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    Không có đơn mua hàng nào ở trạng thái{" "}
                    <strong>Đã nhận hàng</strong>. Vui lòng nhận hàng PO trước
                    khi tạo phiếu kiểm tra.
                  </span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Đơn mua hàng (PO) *</Label>
                      <Select
                        value={selectedPOId}
                        onValueChange={handlePOSelect}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn PO" />
                        </SelectTrigger>
                        <SelectContent>
                          {purchaseOrders.map((po) => (
                            <SelectItem key={po.id} value={po.id}>
                              {po.poNumber} — {po.supplier?.name || "N/A"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Dòng PO *</Label>
                      {loadingLines ? (
                        <div className="flex items-center gap-2 text-muted-foreground h-10">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang tải...
                        </div>
                      ) : (
                        <Select
                          value={selectedLineId}
                          onValueChange={handleLineSelect}
                          disabled={!selectedPOId || poLines.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !selectedPOId
                                  ? "Chọn PO trước"
                                  : poLines.length === 0
                                    ? "Không có dòng nào cần nhận"
                                    : "Chọn dòng PO"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {poLines.map((line) => (
                              <SelectItem key={line.id} value={line.id}>
                                #{line.lineNumber} — {line.part.partNumber}{" "}
                                (Đặt: {line.quantity} / Nhận:{" "}
                                {line.receivedQty})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {/* PO Info Display */}
                  {selectedPO && (
                    <div className="bg-muted/50 rounded-md p-3 space-y-1 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <Info className="h-3.5 w-3.5" />
                        Thông tin PO
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Nhà cung cấp:{" "}
                        </span>
                        <span className="font-medium">
                          {selectedPO.supplier?.name || "N/A"}
                        </span>
                      </div>
                      {selectedLine && (
                        <>
                          <div>
                            <span className="text-muted-foreground">
                              Vật tư:{" "}
                            </span>
                            <span className="font-medium">
                              {selectedLine.part.partNumber} -{" "}
                              {selectedLine.part.name}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Số lượng đặt:{" "}
                            </span>
                            <span className="font-medium">
                              {selectedLine.quantity}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Đã nhận:{" "}
                            </span>
                            <span className="font-medium">
                              {selectedLine.receivedQty}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Còn lại:{" "}
                            </span>
                            <span className="font-medium text-orange-600">
                              {selectedLine.quantity - selectedLine.receivedQty}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {selectedPOId && !loadingLines && poLines.length === 0 && (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>
                        PO này đã nhận đủ hàng cho tất cả các dòng.
                      </span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Quality Control Info — from Part */}
          {loadingQC && (
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải thông tin kiểm tra...
                </div>
              </CardContent>
            </Card>
          )}

          {partQC && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Hướng dẫn kiểm tra
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: boolean flags */}
                  <div>
                    <BooleanBadge
                      value={partQC.inspectionRequired}
                      label="Yêu cầu kiểm tra"
                    />
                    <BooleanBadge
                      value={partQC.lotControl}
                      label="Kiểm soát Lot"
                    />
                    <BooleanBadge
                      value={partQC.serialControl}
                      label="Kiểm soát Serial"
                    />
                    <BooleanBadge
                      value={partQC.certificateRequired}
                      label="Yêu cầu chứng chỉ"
                    />
                  </div>

                  {/* Right: values */}
                  <div className="space-y-3">
                    {partQC.inspectionPlan && (
                      <div className="flex items-center justify-between py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">
                          Kế hoạch kiểm tra
                        </span>
                        <span className="text-sm font-medium">
                          {partQC.inspectionPlan}
                        </span>
                      </div>
                    )}
                    {partQC.aqlLevel && (
                      <div className="flex items-center justify-between py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">
                          Mức AQL
                        </span>
                        <span className="text-sm font-medium">
                          {partQC.aqlLevel}
                        </span>
                      </div>
                    )}
                    {partQC.shelfLifeDays && (
                      <div className="flex items-center justify-between py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">
                          Hạn sử dụng
                        </span>
                        <span className="text-sm font-medium">
                          {partQC.shelfLifeDays} ngày
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quantity & Lot Information */}
          <Card>
            <CardHeader>
              <CardTitle>Số lượng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantityReceived">Số lượng nhận *</Label>
                  <Input
                    id="quantityReceived"
                    type="number"
                    min="1"
                    max={
                      selectedLine
                        ? selectedLine.quantity - selectedLine.receivedQty
                        : undefined
                    }
                    value={formData.quantityReceived}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantityReceived: e.target.value,
                      })
                    }
                    placeholder="0"
                    required
                  />
                  {selectedLine && (
                    <p className="text-xs text-muted-foreground">
                      Tối đa:{" "}
                      {selectedLine.quantity - selectedLine.receivedQty}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantityInspected">Số lượng kiểm tra</Label>
                  <Input
                    id="quantityInspected"
                    type="number"
                    min="0"
                    value={formData.quantityInspected}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantityInspected: e.target.value,
                      })
                    }
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lotNumber">Số Lot/Batch</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      id="lotNumber"
                      value={formData.lotNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, lotNumber: e.target.value })
                      }
                      placeholder="LOT-XXXX"
                      readOnly={!lotEditable}
                      className={!lotEditable ? "bg-muted cursor-default" : ""}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-9 w-9"
                      onClick={() => setLotEditable(!lotEditable)}
                      title={lotEditable ? "Khóa" : "Sửa số lot"}
                    >
                      {lotEditable ? <Lock className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Ghi chú</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Thêm ghi chú về inspection..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/quality/receiving">Hủy</Link>
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !selectedPOId ||
                !selectedLineId ||
                !formData.partId
              }
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Tạo Inspection
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
