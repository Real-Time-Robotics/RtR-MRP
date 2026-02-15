"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Trash2,
  RefreshCw,
  Undo2,
  CheckCircle,
  Loader2,
} from "lucide-react";

interface NcrDispositionDialogProps {
  open: boolean;
  onClose: () => void;
  ncr: {
    id: string;
    ncrNumber: string;
    partNumber: string;
    partName: string;
    quantityAffected: number;
  };
  onSuccess: () => void;
}

const DISPOSITIONS = [
  {
    value: "SCRAP",
    label: "Scrap",
    labelVi: "Hủy bỏ",
    icon: Trash2,
    color: "text-red-600",
    description: "Chuyển sang kho phế liệu để hủy",
  },
  {
    value: "REWORK",
    label: "Rework",
    labelVi: "Làm lại",
    icon: RefreshCw,
    color: "text-amber-600",
    description: "Đưa về sản xuất để sửa chữa/gia công lại",
  },
  {
    value: "RETURN_TO_VENDOR",
    label: "Return to Supplier",
    labelVi: "Trả NCC",
    icon: Undo2,
    color: "text-blue-600",
    description: "Trả hàng về nhà cung cấp (cần RMA)",
  },
  {
    value: "USE_AS_IS",
    label: "Use As-Is",
    labelVi: "Sử dụng",
    icon: CheckCircle,
    color: "text-green-600",
    description: "Chấp nhận sử dụng với sai lệch cho phép",
  },
];

export function NcrDispositionDialog({
  open,
  onClose,
  ncr,
  onSuccess,
}: NcrDispositionDialogProps) {
  const [disposition, setDisposition] = useState<string>("");
  const [quantity, setQuantity] = useState(ncr.quantityAffected);
  const [notes, setNotes] = useState("");
  const [returnRmaNumber, setReturnRmaNumber] = useState("");
  const [deviationNumber, setDeviationNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedDisposition = DISPOSITIONS.find((d) => d.value === disposition);

  async function handleSubmit() {
    if (!disposition) {
      setError("Vui lòng chọn hướng xử lý");
      return;
    }

    if (quantity <= 0 || quantity > ncr.quantityAffected) {
      setError(`Số lượng phải từ 1 đến ${ncr.quantityAffected}`);
      return;
    }

    if (disposition === "RETURN_TO_VENDOR" && !returnRmaNumber) {
      setError("Vui lòng nhập số RMA");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/quality/ncr/${ncr.id}/execute-disposition`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            disposition,
            quantity,
            notes,
            returnRmaNumber,
            deviationNumber,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.details?.join(", ") || data.error || "Có lỗi xảy ra");
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Xử lý NCR: {ncr.ncrNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Part info */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg text-sm">
            <p>
              <strong>Linh kiện:</strong> {ncr.partNumber} - {ncr.partName}
            </p>
            <p>
              <strong>SL ảnh hưởng:</strong> {ncr.quantityAffected}
            </p>
          </div>

          {/* Disposition select */}
          <div className="space-y-2">
            <Label>Hướng xử lý *</Label>
            <Select value={disposition} onValueChange={setDisposition}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn hướng xử lý..." />
              </SelectTrigger>
              <SelectContent>
                {DISPOSITIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    <div className="flex items-center gap-2">
                      <d.icon className={`h-4 w-4 ${d.color}`} />
                      <span>{d.labelVi}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDisposition && (
              <p className="text-sm text-muted-foreground">
                {selectedDisposition.description}
              </p>
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label>Số lượng xử lý *</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min={1}
              max={ncr.quantityAffected}
            />
            {quantity < ncr.quantityAffected && quantity > 0 && (
              <p className="text-sm text-amber-600">
                Xử lý một phần. Còn lại {ncr.quantityAffected - quantity} trong
                cách ly.
              </p>
            )}
          </div>

          {/* RMA Number (for RETURN_TO_VENDOR) */}
          {disposition === "RETURN_TO_VENDOR" && (
            <div className="space-y-2">
              <Label>Số RMA *</Label>
              <Input
                value={returnRmaNumber}
                onChange={(e) => setReturnRmaNumber(e.target.value)}
                placeholder="VD: RMA-2026-001"
              />
            </div>
          )}

          {/* Deviation Number (for USE_AS_IS) */}
          {disposition === "USE_AS_IS" && (
            <div className="space-y-2">
              <Label>Số chấp nhận sai lệch</Label>
              <Input
                value={deviationNumber}
                onChange={(e) => setDeviationNumber(e.target.value)}
                placeholder="VD: DEV-2026-001"
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Ghi chú</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Lý do xử lý, ghi chú thêm..."
              rows={3}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-950/20 p-3 rounded">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !disposition}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              "Xác nhận xử lý"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
