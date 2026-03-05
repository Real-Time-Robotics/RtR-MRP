"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Search, AlertTriangle, Pencil } from "lucide-react";
import { clientLogger } from "@/lib/client-logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Part {
  id: string;
  partNumber: string;
  name: string;
  unitCost: number;
  unit: string;
  category: string;
}

interface BomLineData {
  id: string;
  lineNumber: number;
  quantity: number;
  unit: string;
  isCritical: boolean;
  moduleCode: string | null;
  moduleName: string | null;
  part: {
    id: string;
    partNumber: string;
    name: string;
    unitCost: number;
  };
}

interface BomLineManagerProps {
  bomHeaderId: string;
  onLinesChanged?: () => void;
}

export function BomLineManager({ bomHeaderId, onLinesChanged }: BomLineManagerProps) {
  const router = useRouter();
  const [lines, setLines] = useState<BomLineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit state
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

  // Parts search
  const [parts, setParts] = useState<Part[]>([]);
  const [partsLoading, setPartsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDone, setSearchDone] = useState(false);

  // Line form fields
  const [selectedPartId, setSelectedPartId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pcs");
  const [moduleCode, setModuleCode] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [isCritical, setIsCritical] = useState(false);

  const fetchLines = useCallback(async () => {
    try {
      const res = await fetch(`/api/bom/${bomHeaderId}/lines`);
      if (res.ok) {
        const data = await res.json();
        setLines(data);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch BOM lines", error);
    } finally {
      setLoading(false);
    }
  }, [bomHeaderId]);

  useEffect(() => {
    fetchLines();
  }, [fetchLines]);

  const searchParts = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setParts([]);
      setSearchDone(false);
      return;
    }
    setPartsLoading(true);
    setSearchDone(false);
    try {
      const res = await fetch(`/api/parts?search=${encodeURIComponent(query)}&pageSize=20`);
      if (res.ok) {
        const data = await res.json();
        setParts(data.data || []);
      }
    } catch (error) {
      clientLogger.error("Failed to search parts", error);
    } finally {
      setPartsLoading(false);
      setSearchDone(true);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchParts(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchParts]);

  const openAddDialog = () => {
    setDialogMode("add");
    setEditingLineId(null);
    setSelectedPartId("");
    setQuantity("1");
    setUnit("pcs");
    setModuleCode("");
    setModuleName("");
    setIsCritical(false);
    setSearchQuery("");
    setParts([]);
    setSearchDone(false);
    setDialogOpen(true);
  };

  const openEditDialog = (line: BomLineData) => {
    setDialogMode("edit");
    setEditingLineId(line.id);
    setSelectedPartId(line.part.id);
    setQuantity(String(line.quantity));
    setUnit(line.unit);
    setModuleCode(line.moduleCode || "");
    setModuleName(line.moduleName || "");
    setIsCritical(line.isCritical);
    setSearchQuery(`${line.part.partNumber} - ${line.part.name}`);
    setParts([]);
    setDialogOpen(true);
  };

  const handleAddLine = async () => {
    if (!selectedPartId) {
      toast.error("Vui lòng chọn Part");
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error("Số lượng phải > 0");
      return;
    }

    // Check duplicate
    if (lines.some((l) => l.part.id === selectedPartId)) {
      toast.error("Part này đã có trong BOM");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/bom/${bomHeaderId}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId: selectedPartId,
          quantity: parseFloat(quantity),
          unit,
          moduleCode: moduleCode || null,
          moduleName: moduleName || null,
          isCritical,
        }),
      });

      if (res.ok) {
        toast.success("Đã thêm part vào BOM");
        setDialogOpen(false);
        await fetchLines();
        onLinesChanged?.();
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || "Lỗi thêm BOM line");
      }
    } catch (error) {
      clientLogger.error("Failed to add BOM line", error);
      toast.error("Lỗi thêm BOM line");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditLine = async () => {
    if (!editingLineId) return;
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error("Số lượng phải > 0");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/bom/${bomHeaderId}/lines`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: [{
            id: editingLineId,
            quantity: parseFloat(quantity),
            unit,
            moduleCode: moduleCode || null,
            moduleName: moduleName || null,
            isCritical,
          }],
        }),
      });

      if (res.ok) {
        toast.success("Đã cập nhật BOM line");
        setDialogOpen(false);
        await fetchLines();
        onLinesChanged?.();
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || "Lỗi cập nhật BOM line");
      }
    } catch (error) {
      clientLogger.error("Failed to update BOM line", error);
      toast.error("Lỗi cập nhật BOM line");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveLine = () => {
    if (dialogMode === "edit") {
      handleEditLine();
    } else {
      handleAddLine();
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    setDeletingId(lineId);
    try {
      const res = await fetch(`/api/bom/${bomHeaderId}/lines`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineId }),
      });

      if (res.ok) {
        toast.success("Đã xóa line khỏi BOM");
        await fetchLines();
        onLinesChanged?.();
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || "Lỗi xóa line");
      }
    } catch (error) {
      clientLogger.error("Failed to delete BOM line", error);
      toast.error("Lỗi xóa line");
    } finally {
      setDeletingId(null);
    }
  };

  const totalCost = lines.reduce(
    (sum, l) => sum + l.quantity * (l.part.unitCost || 0),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {lines.length} parts | Total: ${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </div>
        <Button size="sm" onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Part
        </Button>
      </div>

      {/* Lines Table */}
      {lines.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground mb-4">
            BOM chưa có component nào. Bấm &quot;Add Part&quot; để thêm.
          </p>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Part
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="text-xs text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium w-[50px]">#</th>
                <th className="px-4 py-2.5 text-left font-medium">Part Number</th>
                <th className="px-4 py-2.5 text-left font-medium">Name</th>
                <th className="px-4 py-2.5 text-left font-medium">Module</th>
                <th className="px-4 py-2.5 text-right font-medium">Qty</th>
                <th className="px-4 py-2.5 text-right font-medium">Unit Cost</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
                <th className="px-4 py-2.5 text-center font-medium w-[90px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr
                  key={line.id}
                  className="border-t hover:bg-muted/30 text-sm transition-colors"
                >
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {line.lineNumber}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">
                        {line.part.partNumber}
                      </span>
                      {line.isCritical && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          Critical
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">{line.part.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {line.moduleCode || "-"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {line.quantity} {line.unit}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    ${(line.part.unitCost || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-medium">
                    ${(line.quantity * (line.part.unitCost || 0)).toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => openEditDialog(line)}
                        title="Sửa"
                        aria-label="Sửa"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteLine(line.id)}
                        disabled={deletingId === line.id}
                        title="Xóa"
                        aria-label="Xóa"
                      >
                        {deletingId === line.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/30 font-medium text-sm">
              <tr className="border-t">
                <td colSpan={6} className="px-4 py-2.5 text-right">
                  Total Material Cost
                </td>
                <td className="px-4 py-2.5 text-right font-mono">
                  ${totalCost.toFixed(2)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Add / Edit Line Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "edit" ? "Chỉnh sửa BOM Line" : "Add Part to BOM"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "edit"
                ? "Cập nhật số lượng, đơn vị, module và thông tin khác."
                : "Tìm và thêm part vào Bill of Materials"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Part Search - only for Add mode */}
            {dialogMode === "add" ? (
              <div className="space-y-2">
                <Label>Part *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm theo Part Number hoặc tên..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Search results */}
                {(parts.length > 0 || partsLoading) && (
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {partsLoading ? (
                      <div className="p-3 text-center text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                        Đang tìm...
                      </div>
                    ) : (
                      parts.map((part) => (
                        <button
                          key={part.id}
                          type="button"
                          onClick={() => {
                            setSelectedPartId(part.id);
                            setUnit(part.unit || "pcs");
                            setSearchQuery(`${part.partNumber} - ${part.name}`);
                            setParts([]);
                            setSearchDone(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 border-b last:border-b-0 transition-colors ${
                            selectedPartId === part.id ? "bg-primary/10" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-mono font-medium">
                                {part.partNumber}
                              </span>
                              <span className="text-muted-foreground ml-2">
                                {part.name}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              ${part.unitCost?.toFixed(2)} / {part.unit}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* No results message */}
                {!partsLoading && searchDone && parts.length === 0 && searchQuery && !selectedPartId && (
                  <div className="border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800 rounded-lg p-3 text-sm text-orange-700 dark:text-orange-300">
                    Không tìm thấy part &quot;{searchQuery}&quot;. Hãy thử tìm theo Part Number hoặc tên khác.
                  </div>
                )}

                {/* Selected part display */}
                {selectedPartId && !parts.length && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 text-sm">
                    Selected: <span className="font-medium">{searchQuery}</span>
                  </div>
                )}
              </div>
            ) : (
              /* Edit mode - show part info read-only */
              <div className="space-y-2">
                <Label>Part</Label>
                <div className="bg-muted/50 border rounded-lg p-3 text-sm">
                  <span className="font-mono font-medium">{searchQuery}</span>
                </div>
              </div>
            )}

            {/* Quantity & Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1"
                  autoFocus={dialogMode === "edit"}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">pcs</SelectItem>
                    <SelectItem value="EA">EA</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="m">m</SelectItem>
                    <SelectItem value="set">set</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Module Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Module Code</Label>
                <Input
                  value={moduleCode}
                  onChange={(e) => setModuleCode(e.target.value)}
                  placeholder="e.g., ASSY-01"
                />
              </div>
              <div className="space-y-2">
                <Label>Module Name</Label>
                <Input
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  placeholder="e.g., Main Assembly"
                />
              </div>
            </div>

            {/* Critical flag */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isCritical"
                checked={isCritical}
                onChange={(e) => setIsCritical(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isCritical" className="text-sm font-normal cursor-pointer">
                Mark as critical part (supply chain risk)
              </Label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Hủy
              </Button>
              <Button
                onClick={handleSaveLine}
                disabled={submitting || (dialogMode === "add" && !selectedPartId)}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {dialogMode === "edit" ? "Đang lưu..." : "Adding..."}
                  </>
                ) : dialogMode === "edit" ? (
                  "Lưu thay đổi"
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add to BOM
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
