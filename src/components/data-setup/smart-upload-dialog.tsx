"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Package,
  ShoppingBag,
  Layers,
  FileSpreadsheet,
  XCircle,
} from "lucide-react";

interface SmartUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface AnalysisResult {
  isComposite: boolean;
  sessionId?: string;
  confidence?: number;
  message?: string;
  stats?: {
    totalRows: number;
    partCount: number;
    productCount: number;
    bomLineCount: number;
    skippedRows: number;
  };
  warnings?: string[];
  preview?: {
    parts: Array<{ partNumber: string; name: string; unit: string; unitCost: number }>;
    products: Array<{ sku: string; name: string }>;
    bomLines: Array<{ parentSku: string; childPartNumber: string; quantity: number; scrapRate: number }>;
  };
}

interface PhaseResult {
  phase: string;
  total: number;
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
}

interface ImportResult {
  success: boolean;
  results: PhaseResult[];
  summary: {
    totalSuccess: number;
    totalFailed: number;
    totalSkipped: number;
  };
}

type DialogState = "upload" | "preview" | "importing" | "done" | "error";

export function SmartUploadDialog({
  open,
  onOpenChange,
  onSuccess,
}: SmartUploadDialogProps) {
  const [state, setState] = useState<DialogState>("upload");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const reset = useCallback(() => {
    setState("upload");
    setAnalyzing(false);
    setAnalysis(null);
    setImportResult(null);
    setCurrentPhase(0);
    setErrorMessage("");
  }, []);

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        reset();
      }
      onOpenChange(isOpen);
    },
    [onOpenChange, reset]
  );

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.xlsx?$/i)) {
      setErrorMessage("Chỉ hỗ trợ file Excel (.xlsx, .xls)");
      setState("error");
      return;
    }

    setAnalyzing(true);
    setState("upload");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/data-setup/smart-upload/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Analysis failed");
      }

      const result: AnalysisResult = await res.json();

      if (!result.isComposite) {
        setErrorMessage(result.message || "File không phải BOM phức hợp");
        setState("error");
        return;
      }

      setAnalysis(result);
      setState("preview");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Lỗi phân tích file");
      setState("error");
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!analysis?.sessionId) return;

    setState("importing");
    setCurrentPhase(0);

    try {
      // Simulate phase progression
      const phaseInterval = setInterval(() => {
        setCurrentPhase((p) => Math.min(p + 1, 2));
      }, 2000);

      const res = await fetch("/api/data-setup/smart-upload/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: analysis.sessionId }),
      });

      clearInterval(phaseInterval);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Import failed");
      }

      const result: ImportResult = await res.json();
      setImportResult(result);
      setCurrentPhase(3);
      setState("done");
      onSuccess();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Lỗi import");
      setState("error");
    }
  }, [analysis, onSuccess]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-violet-500" />
            Smart Upload — BOM phức hợp
          </DialogTitle>
        </DialogHeader>

        {/* State 1: Upload */}
        {state === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload file Excel BOM phức hợp. AI sẽ tự động phân loại thành Parts, Products, và BOM lines.
            </p>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver
                  ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-violet-400"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {analyzing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                  <p className="text-sm font-medium">Đang phân tích file...</p>
                  <p className="text-xs text-muted-foreground">
                    Nhận diện cấu trúc BOM phức hợp
                  </p>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-3">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <p className="text-sm font-medium">
                    Kéo thả file Excel hoặc{" "}
                    <span className="text-violet-600 underline">chọn file</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hỗ trợ .xlsx, .xls
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {/* State 2: Preview */}
        {state === "preview" && analysis && (
          <div className="space-y-4">
            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-3">
              <StatsCard
                icon={<Package className="w-4 h-4" />}
                label="Parts"
                count={analysis.stats?.partCount ?? 0}
                color="blue"
              />
              <StatsCard
                icon={<ShoppingBag className="w-4 h-4" />}
                label="Products"
                count={analysis.stats?.productCount ?? 0}
                color="green"
              />
              <StatsCard
                icon={<Layers className="w-4 h-4" />}
                label="BOM Lines"
                count={analysis.stats?.bomLineCount ?? 0}
                color="purple"
              />
            </div>

            {/* Confidence */}
            <div className="text-xs text-muted-foreground">
              Confidence: {((analysis.confidence ?? 0) * 100).toFixed(0)}% |
              Tổng dòng: {analysis.stats?.totalRows ?? 0} |
              Bỏ qua: {analysis.stats?.skippedRows ?? 0}
            </div>

            {/* Warnings */}
            {analysis.warnings && analysis.warnings.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Cảnh báo
                  </span>
                </div>
                <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
                  {analysis.warnings.map((w, i) => (
                    <li key={i}>- {w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview tables */}
            {analysis.preview && (
              <div className="space-y-3">
                <PreviewTable
                  title="Parts (mẫu 5 dòng đầu)"
                  headers={["Part Number", "Name", "Unit", "Unit Cost"]}
                  rows={analysis.preview.parts.map((p) => [
                    p.partNumber,
                    p.name,
                    p.unit,
                    p.unitCost?.toLocaleString() ?? "0",
                  ])}
                />
                <PreviewTable
                  title="Products (mẫu 5 dòng đầu)"
                  headers={["SKU", "Name"]}
                  rows={analysis.preview.products.map((p) => [p.sku, p.name])}
                />
                <PreviewTable
                  title="BOM Lines (mẫu 5 dòng đầu)"
                  headers={["Parent SKU", "Child Part", "Qty", "Scrap %"]}
                  rows={analysis.preview.bomLines.map((b) => [
                    b.parentSku,
                    b.childPartNumber,
                    b.quantity.toString(),
                    (b.scrapRate * 100).toFixed(1) + "%",
                  ])}
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={reset}>
                Chọn file khác
              </Button>
              <Button
                onClick={handleImport}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import All
              </Button>
            </div>
          </div>
        )}

        {/* State 3: Importing */}
        {state === "importing" && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-center text-muted-foreground mb-4">
              Đang import dữ liệu theo thứ tự...
            </p>
            <PhaseProgress phase={0} label="Parts" current={currentPhase} icon={<Package className="w-4 h-4" />} />
            <PhaseProgress phase={1} label="Products" current={currentPhase} icon={<ShoppingBag className="w-4 h-4" />} />
            <PhaseProgress phase={2} label="BOM Lines" current={currentPhase} icon={<Layers className="w-4 h-4" />} />
          </div>
        )}

        {/* State 4: Done */}
        {state === "done" && importResult && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 py-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <p className="text-lg font-semibold">Import hoàn tất!</p>
            </div>

            <div className="space-y-2">
              {importResult.results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-md px-3 py-2"
                >
                  <span className="text-sm font-medium">{r.phase}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-emerald-600">{r.success} thành công</span>
                    {r.failed > 0 && (
                      <span className="text-red-600">{r.failed} lỗi</span>
                    )}
                    {r.skipped > 0 && (
                      <span className="text-gray-500">{r.skipped} bỏ qua</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Show errors if any */}
            {importResult.results.some((r) => r.errors.length > 0) && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-3 max-h-32 overflow-y-auto">
                <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                  Chi tiết lỗi:
                </p>
                <ul className="text-xs text-red-600 dark:text-red-400 space-y-0.5">
                  {importResult.results
                    .flatMap((r) => r.errors)
                    .slice(0, 20)
                    .map((e, i) => (
                      <li key={i}>- {e}</li>
                    ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => handleClose(false)}>Đóng</Button>
            </div>
          </div>
        )}

        {/* Error state */}
        {state === "error" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 py-4">
              <XCircle className="w-10 h-10 text-red-500" />
              <p className="text-sm text-red-600">{errorMessage}</p>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={reset}>
                Thử lại
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function StatsCard({
  icon,
  label,
  count,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: "blue" | "green" | "purple";
}) {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400",
    green: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400",
    purple: "bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400",
  };

  return (
    <div className={`border rounded-lg p-3 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold font-mono">{count.toLocaleString()}</p>
    </div>
  );
}

function PreviewTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  if (rows.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              {headers.map((h, i) => (
                <th key={i} className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                {row.map((cell, j) => (
                  <td key={j} className="px-2 py-1.5 truncate max-w-[150px]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PhaseProgress({
  phase,
  label,
  current,
  icon,
}: {
  phase: number;
  label: string;
  current: number;
  icon: React.ReactNode;
}) {
  const isDone = current > phase;
  const isActive = current === phase;

  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isDone
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
            : isActive
              ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600"
              : "bg-gray-100 dark:bg-gray-800 text-gray-400"
        }`}
      >
        {isDone ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : isActive ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          icon
        )}
      </div>
      <span
        className={`text-sm font-medium ${
          isDone
            ? "text-emerald-600"
            : isActive
              ? "text-violet-600"
              : "text-gray-400"
        }`}
      >
        {label}
        {isDone && " ✓"}
      </span>
    </div>
  );
}
