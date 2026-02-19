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
  Factory,
  Package,
  FileText,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { toast } from "sonner";
import Link from "next/link";
import { clientLogger } from '@/lib/client-logger';

type SourceType = "PO" | "NON_PO" | "PRODUCTION";

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

interface WorkOrder {
  id: string;
  woNumber: string;
  status: string;
  quantity: number;
  completedQty: number;
  productId: string;
  product: { id: string; sku: string; name: string };
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
  const [sourceType, setSourceType] = useState<SourceType>("PO");

  // PO state
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPOId, setSelectedPOId] = useState("");
  const [poLines, setPOLines] = useState<POLine[]>([]);
  const [selectedLineId, setSelectedLineId] = useState("");
  const [loadingPOs, setLoadingPOs] = useState(true);
  const [loadingLines, setLoadingLines] = useState(false);

  // Non-PO state
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedPartId, setSelectedPartId] = useState("");
  const [loadingParts, setLoadingParts] = useState(false);

  // Production state
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedWOId, setSelectedWOId] = useState("");
  const [loadingWOs, setLoadingWOs] = useState(false);

  // Shared state
  const [partQC, setPartQC] = useState<PartQC | null>(null);
  const [loadingQC, setLoadingQC] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lotEditable, setLotEditable] = useState(false);
  const [formData, setFormData] = useState({
    partId: "",
    productId: "",
    partDisplay: "",
    lotNumber: "",
    quantityReceived: "",
    quantityInspected: "",
    notes: "",
  });

  // Fetch received POs
  useEffect(() => {
    const fetchPOs = async () => {
      setLoadingPOs(true);
      try {
        const res = await fetch("/api/purchase-orders?status=received&limit=100");
        if (res.ok) {
          const data = await res.json();
          setPurchaseOrders(data.data || data.orders || []);
        }
      } catch (error) {
        clientLogger.error("Failed to fetch POs:", error);
      } finally {
        setLoadingPOs(false);
      }
    };
    fetchPOs();
  }, []);

  // Fetch parts when Non-PO tab is active
  useEffect(() => {
    if (sourceType !== "NON_PO" || parts.length > 0) return;
    const fetchParts = async () => {
      setLoadingParts(true);
      try {
        const res = await fetch("/api/parts?pageSize=100");
        if (res.ok) {
          const result = await res.json();
          const partsList = result.data || [];
          setParts(partsList.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            partNumber: p.partNumber as string,
            name: p.name as string,
          })));
        }
      } catch (error) {
        clientLogger.error("Failed to fetch parts:", error);
      } finally {
        setLoadingParts(false);
      }
    };
    fetchParts();
  }, [sourceType, parts.length]);

  // Fetch work orders when Production tab is active
  useEffect(() => {
    if (sourceType !== "PRODUCTION" || workOrders.length > 0) return;
    const fetchWOs = async () => {
      setLoadingWOs(true);
      try {
        const res = await fetch("/api/production?status=completed,in_progress&pageSize=100");
        if (res.ok) {
          const data = await res.json();
          setWorkOrders(data.data || []);
        }
      } catch (error) {
        clientLogger.error("Failed to fetch work orders:", error);
      } finally {
        setLoadingWOs(false);
      }
    };
    fetchWOs();
  }, [sourceType, workOrders.length]);

  // Reset form when switching tabs
  const handleTabChange = (value: string) => {
    setSourceType(value as SourceType);
    setPartQC(null);
    setLotEditable(false);
    setFormData({
      partId: "",
      productId: "",
      partDisplay: "",
      lotNumber: "",
      quantityReceived: "",
      quantityInspected: "",
      notes: formData.notes,
    });
    setSelectedPOId("");
    setSelectedLineId("");
    setPOLines([]);
    setSelectedPartId("");
    setSelectedWOId("");
  };

  // Fetch Part QC info
  const fetchPartQC = async (partId: string) => {
    setLoadingQC(true);
    try {
      const res = await fetch(`/api/parts/${partId}`);
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
      clientLogger.error("Failed to fetch part QC:", error);
    } finally {
      setLoadingQC(false);
    }
  };

  // PO handlers
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
      clientLogger.error("Failed to fetch PO detail:", error);
    } finally {
      setLoadingLines(false);
    }
  };

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
      fetchPartQC(line.partId);
    } else {
      setFormData((prev) => ({
        ...prev,
        partId: "",
        partDisplay: "",
        quantityReceived: "",
      }));
    }
  };

  // Non-PO: Part select handler
  const handlePartSelect = (partId: string) => {
    setSelectedPartId(partId);
    setPartQC(null);
    setLotEditable(true);

    const part = parts.find((p) => p.id === partId);
    if (part) {
      setFormData((prev) => ({
        ...prev,
        partId: part.id,
        partDisplay: `${part.partNumber} - ${part.name}`,
        lotNumber: "",
        quantityReceived: "",
      }));
      fetchPartQC(part.id);
    }
  };

  // Production: WO select handler
  const handleWOSelect = (woId: string) => {
    setSelectedWOId(woId);
    setPartQC(null);
    setLotEditable(false);

    const wo = workOrders.find((w) => w.id === woId);
    if (wo) {
      const autoLot = `LOT-WO-${wo.woNumber}`;
      setFormData((prev) => ({
        ...prev,
        productId: wo.productId,
        partDisplay: `${wo.product.sku} - ${wo.product.name}`,
        quantityReceived: String(wo.completedQty),
        lotNumber: autoLot,
      }));
    }
  };

  const selectedPO = purchaseOrders.find((po) => po.id === selectedPOId);
  const selectedLine = poLines.find((l) => l.id === selectedLineId);
  const selectedWO = workOrders.find((w) => w.id === selectedWOId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation per source type
    if (sourceType === "PO") {
      if (!selectedPOId || !selectedLineId) {
        toast.error("Vui lòng chọn Đơn mua hàng và dòng PO");
        return;
      }
    } else if (sourceType === "NON_PO") {
      if (!selectedPartId) {
        toast.error("Vui lòng chọn linh kiện");
        return;
      }
      if (!formData.quantityReceived || parseInt(formData.quantityReceived) <= 0) {
        toast.error("Số lượng nhận phải lớn hơn 0");
        return;
      }
    } else if (sourceType === "PRODUCTION") {
      if (!selectedWOId) {
        toast.error("Vui lòng chọn lệnh sản xuất");
        return;
      }
    }

    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        type: "RECEIVING",
        sourceType,
        lotNumber: formData.lotNumber || null,
        quantityReceived: parseInt(formData.quantityReceived) || 0,
        quantityInspected: parseInt(formData.quantityInspected) || 0,
        notes: formData.notes || null,
      };

      if (sourceType === "PO") {
        payload.partId = formData.partId || null;
        payload.poLineId = selectedLineId;
      } else if (sourceType === "NON_PO") {
        payload.partId = selectedPartId;
      } else if (sourceType === "PRODUCTION") {
        payload.workOrderId = selectedWOId;
        payload.productId = formData.productId || null;
      }

      const res = await fetch("/api/quality/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push("/quality/receiving");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create inspection");
      }
    } catch (error) {
      clientLogger.error("Failed to create inspection:", error);
      toast.error("Failed to create inspection");
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = () => {
    if (loading) return true;
    if (sourceType === "PO") return !selectedPOId || !selectedLineId || !formData.partId;
    if (sourceType === "NON_PO") return !selectedPartId || !formData.quantityReceived;
    if (sourceType === "PRODUCTION") return !selectedWOId;
    return true;
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
          {/* Source Type Tabs */}
          <Tabs value={sourceType} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="PO" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Từ PO
              </TabsTrigger>
              <TabsTrigger value="NON_PO" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Ngoài PO
              </TabsTrigger>
              <TabsTrigger value="PRODUCTION" className="flex items-center gap-2">
                <Factory className="h-4 w-4" />
                Từ Sản xuất
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: From PO */}
            <TabsContent value="PO">
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
            </TabsContent>

            {/* Tab 2: Non-PO */}
            <TabsContent value="NON_PO">
              <Card>
                <CardHeader>
                  <CardTitle>Nhận hàng ngoài PO</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm mb-2">
                    <Info className="h-4 w-4" />
                    <span>
                      Dùng cho hàng mẫu, hàng trả lại, chuyển kho, hoặc nhận hàng không qua PO.
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Label>Linh kiện / Vật tư *</Label>
                    {loadingParts ? (
                      <div className="flex items-center gap-2 text-muted-foreground h-10">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải danh sách linh kiện...
                      </div>
                    ) : (
                      <Select
                        value={selectedPartId}
                        onValueChange={handlePartSelect}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn linh kiện" />
                        </SelectTrigger>
                        <SelectContent>
                          {parts.map((part) => (
                            <SelectItem key={part.id} value={part.id}>
                              {part.partNumber} — {part.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {selectedPartId && (
                    <div className="bg-muted/50 rounded-md p-3 space-y-1 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <Info className="h-3.5 w-3.5" />
                        Thông tin linh kiện
                      </div>
                      <div>
                        <span className="text-muted-foreground">Linh kiện: </span>
                        <span className="font-medium">{formData.partDisplay}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: Production */}
            <TabsContent value="PRODUCTION">
              <Card>
                <CardHeader>
                  <CardTitle>Nhận bán thành phẩm từ sản xuất</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm mb-2">
                    <Info className="h-4 w-4" />
                    <span>
                      Nhận thành phẩm/bán thành phẩm từ Work Order đã hoàn thành hoặc đang thực hiện.
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Label>Lệnh sản xuất (Work Order) *</Label>
                    {loadingWOs ? (
                      <div className="flex items-center gap-2 text-muted-foreground h-10">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải danh sách WO...
                      </div>
                    ) : workOrders.length === 0 ? (
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md">
                        <AlertCircle className="h-4 w-4" />
                        <span>
                          Không có lệnh sản xuất nào ở trạng thái{" "}
                          <strong>Hoàn thành</strong> hoặc <strong>Đang thực hiện</strong>.
                        </span>
                      </div>
                    ) : (
                      <Select
                        value={selectedWOId}
                        onValueChange={handleWOSelect}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn Work Order" />
                        </SelectTrigger>
                        <SelectContent>
                          {workOrders.map((wo) => (
                            <SelectItem key={wo.id} value={wo.id}>
                              {wo.woNumber} — {wo.product?.name || "N/A"} (SL hoàn thành: {wo.completedQty})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {selectedWO && (
                    <div className="bg-muted/50 rounded-md p-3 space-y-1 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <Factory className="h-3.5 w-3.5" />
                        Thông tin Work Order
                      </div>
                      <div>
                        <span className="text-muted-foreground">WO: </span>
                        <span className="font-medium">{selectedWO.woNumber}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sản phẩm: </span>
                        <span className="font-medium">
                          {selectedWO.product.sku} - {selectedWO.product.name}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">SL kế hoạch: </span>
                        <span className="font-medium">{selectedWO.quantity}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">SL hoàn thành: </span>
                        <span className="font-medium text-green-600">
                          {selectedWO.completedQty}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Trạng thái: </span>
                        <span className="font-medium capitalize">
                          {selectedWO.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

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
                      sourceType === "PO" && selectedLine
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
                    readOnly={sourceType === "PRODUCTION"}
                  />
                  {sourceType === "PO" && selectedLine && (
                    <p className="text-xs text-muted-foreground">
                      Tối đa:{" "}
                      {selectedLine.quantity - selectedLine.receivedQty}
                    </p>
                  )}
                  {sourceType === "PRODUCTION" && selectedWO && (
                    <p className="text-xs text-muted-foreground">
                      Từ WO: {selectedWO.completedQty} đã hoàn thành
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
                      readOnly={!lotEditable && sourceType !== "NON_PO"}
                      className={
                        !lotEditable && sourceType !== "NON_PO"
                          ? "bg-muted cursor-default"
                          : ""
                      }
                    />
                    {sourceType !== "NON_PO" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-9 w-9"
                        onClick={() => setLotEditable(!lotEditable)}
                        title={lotEditable ? "Khóa" : "Sửa số lot"}
                        aria-label={lotEditable ? "Khóa" : "Sửa số lot"}
                      >
                        {lotEditable ? (
                          <Lock className="h-4 w-4" />
                        ) : (
                          <Pencil className="h-4 w-4" />
                        )}
                      </Button>
                    )}
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
            <Button type="submit" disabled={isSubmitDisabled()}>
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
