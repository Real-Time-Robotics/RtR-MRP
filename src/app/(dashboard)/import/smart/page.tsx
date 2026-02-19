"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  Brain,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Info,
} from "lucide-react";
import { useDropzone } from "react-dropzone";

type WizardStep =
  | "upload"
  | "analysis"
  | "mapping"
  | "preview"
  | "importing"
  | "report";

const STEP_INFO = [
  { key: "upload", label: "Tải lên", icon: Upload },
  { key: "analysis", label: "AI Phân tích", icon: Brain },
  { key: "mapping", label: "Ghép cột", icon: ArrowRight },
  { key: "preview", label: "Xem trước", icon: FileSpreadsheet },
  { key: "importing", label: "Nhập dữ liệu", icon: Loader2 },
  { key: "report", label: "Báo cáo", icon: CheckCircle },
];

const TARGET_TYPES = [
  { value: "PARTS", label: "Linh kiện (Parts)" },
  { value: "SUPPLIERS", label: "Nhà cung cấp (Suppliers)" },
  { value: "BOM", label: "Định mức (BOM)" },
  { value: "INVENTORY", label: "Tồn kho (Inventory)" },
];

const SYSTEM_FIELDS: Record<string, { label: string; required?: boolean }[]> = {
  PARTS: [
    { label: "partNumber", required: true },
    { label: "name", required: true },
    { label: "category" },
    { label: "unit" },
    { label: "unitCost" },
    { label: "reorderPoint" },
    { label: "leadTime" },
    { label: "moq" },
    { label: "weight" },
    { label: "notes" },
  ],
  SUPPLIERS: [
    { label: "supplierName", required: true },
    { label: "supplierCode" },
    { label: "contactName" },
    { label: "phone" },
    { label: "email" },
    { label: "address" },
    { label: "taxId" },
    { label: "paymentTerms" },
  ],
  BOM: [
    { label: "parentPart", required: true },
    { label: "childPart", required: true },
    { label: "bomQuantity", required: true },
    { label: "scrapRate" },
  ],
  INVENTORY: [
    { label: "partNumber", required: true },
    { label: "quantityOnHand", required: true },
    { label: "warehouse" },
    { label: "lotNumber" },
  ],
};

interface ColumnMapping {
  excelColumn: string;
  excelIndex: number;
  mappedTo: string | null;
  confidence: number;
  sampleValues: string[];
  suggestion?: string;
}

interface AnalysisData {
  sessionId: string;
  fileName: string;
  sheets: string[];
  selectedSheet: string;
  detectedType: string;
  typeConfidence: number;
  columns: ColumnMapping[];
  totalRows: number;
  issues: {
    type: "ERROR" | "WARNING" | "INFO";
    row?: number;
    column?: string;
    message: string;
  }[];
  summary: {
    mappedColumns: number;
    unmappedColumns: number;
    estimatedImportable: number;
    emptyRows: number;
  };
}

interface ImportResultData {
  success: boolean;
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: { row: number; message: string }[];
}

export default function SmartImportPage() {
  const [step, setStep] = useState<WizardStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [columns, setColumns] = useState<ColumnMapping[]>([]);
  const [targetType, setTargetType] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResultData | null>(
    null
  );
  const [importOptions, setImportOptions] = useState({
    skipDuplicates: true,
    updateExisting: false,
  });
  const [error, setError] = useState("");

  // Dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError("");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  // Step 1 → 2: Analyze file
  async function handleAnalyze() {
    if (!file) return;

    setAnalyzing(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Phân tích thất bại");
        return;
      }

      setAnalysis(data);
      setColumns(data.columns);
      setTargetType(data.detectedType);
      setStep("analysis");
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setAnalyzing(false);
    }
  }

  // Step 4 → 5: Execute import
  async function handleExecuteImport() {
    if (!file || !analysis) return;

    setImporting(true);
    setStep("importing");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionId", analysis.sessionId);
      formData.append("mapping", JSON.stringify(columns));
      formData.append("targetType", targetType);
      formData.append("options", JSON.stringify(importOptions));

      const res = await fetch("/api/import/execute", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setImportResult(data);
      setStep("report");
    } catch {
      setError("Import thất bại");
      setStep("preview");
    } finally {
      setImporting(false);
    }
  }

  // Update column mapping
  function updateColumnMapping(index: number, field: string | null) {
    setColumns((prev) =>
      prev.map((col, i) => (i === index ? { ...col, mappedTo: field } : col))
    );
  }

  // Reset wizard
  function resetWizard() {
    setStep("upload");
    setFile(null);
    setAnalysis(null);
    setColumns([]);
    setTargetType("");
    setImportResult(null);
    setError("");
  }

  const currentStepIndex = STEP_INFO.findIndex((s) => s.key === step);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-7 w-7 text-purple-600" />
          AI Smart Import
        </h1>
        <p className="text-muted-foreground mt-1">
          Nhập dữ liệu Excel với AI tự động nhận diện tiếng Việt
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center flex-wrap gap-1">
        {STEP_INFO.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
                currentStepIndex === i
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                  : currentStepIndex > i
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              <s.icon className="h-4 w-4" />
              <span className="font-medium hidden sm:inline">{s.label}</span>
            </div>
            {i < STEP_INFO.length - 1 && (
              <ArrowRight className="h-4 w-4 mx-1 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Bước 1: Tải lên file Excel</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20"
                  : "border-muted-foreground/25 hover:border-purple-400"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              {file ? (
                <div>
                  <p className="font-medium text-purple-700 dark:text-purple-300">
                    {file.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">Kéo thả file vào đây</p>
                  <p className="text-sm text-muted-foreground">
                    hoặc click để chọn file
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Hỗ trợ: .xlsx, .xls, .csv (tối đa 50MB)
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleAnalyze}
                disabled={!file || analyzing}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang phân tích...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Phân tích với AI
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Analysis Result */}
      {step === "analysis" && analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Kết quả phân tích
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Detection summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  Loại dữ liệu
                </p>
                <p className="text-lg font-bold">{analysis.detectedType}</p>
                <p className="text-xs text-purple-500">
                  Tin cậy: {(analysis.typeConfidence * 100).toFixed(0)}%
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Tổng dòng
                </p>
                <p className="text-lg font-bold">{analysis.totalRows}</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">
                  Cột đã map
                </p>
                <p className="text-lg font-bold">
                  {analysis.summary.mappedColumns}
                </p>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Cột chưa map
                </p>
                <p className="text-lg font-bold">
                  {analysis.summary.unmappedColumns}
                </p>
              </div>
            </div>

            {/* Issues */}
            {analysis.issues.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium">Vấn đề phát hiện:</p>
                {analysis.issues.slice(0, 5).map((issue, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg flex items-start gap-2 text-sm ${
                      issue.type === "ERROR"
                        ? "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300"
                        : issue.type === "WARNING"
                          ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300"
                          : "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300"
                    }`}
                  >
                    {issue.type === "ERROR" ? (
                      <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    ) : issue.type === "WARNING" ? (
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    )}
                    {issue.message}
                  </div>
                ))}
              </div>
            )}

            {/* Column preview */}
            <div>
              <p className="font-medium mb-2">Cột được nhận diện:</p>
              <div className="flex flex-wrap gap-2">
                {analysis.columns.map((col) => (
                  <Badge
                    key={col.excelIndex}
                    variant={col.mappedTo ? "default" : "outline"}
                    className={
                      col.mappedTo
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : ""
                    }
                  >
                    {col.excelColumn}
                    {col.mappedTo && ` → ${col.mappedTo}`}
                    {col.confidence > 0 &&
                      ` (${(col.confidence * 100).toFixed(0)}%)`}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={resetWizard}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Button>
              <Button
                onClick={() => setStep("mapping")}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Tiếp tục ghép cột
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Column Mapping */}
      {step === "mapping" && (
        <Card>
          <CardHeader>
            <CardTitle>Bước 3: Ghép cột dữ liệu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Target type selector */}
            <div className="flex items-center gap-4">
              <Label>Loại dữ liệu:</Label>
              <Select value={targetType} onValueChange={setTargetType}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mapping table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cột Excel</TableHead>
                    <TableHead>Mẫu dữ liệu</TableHead>
                    <TableHead>Ghép với</TableHead>
                    <TableHead>Độ tin cậy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {columns.map((col, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {col.excelColumn}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {col.sampleValues.slice(0, 2).join(", ") || "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={col.mappedTo || "__none__"}
                          onValueChange={(v) =>
                            updateColumnMapping(
                              idx,
                              v === "__none__" ? null : v
                            )
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Chọn trường..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">
                              — Bỏ qua —
                            </SelectItem>
                            {SYSTEM_FIELDS[targetType]?.map((f) => (
                              <SelectItem key={f.label} value={f.label}>
                                {f.label} {f.required && "*"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {col.confidence > 0 ? (
                          <Badge
                            variant={
                              col.confidence > 0.8 ? "default" : "outline"
                            }
                          >
                            {(col.confidence * 100).toFixed(0)}%
                          </Badge>
                        ) : col.suggestion ? (
                          <span className="text-xs text-muted-foreground">
                            {col.suggestion}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("analysis")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Button>
              <Button
                onClick={() => setStep("preview")}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Xem trước dữ liệu
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Preview */}
      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle>Bước 4: Xác nhận import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-1 text-sm">
              <p>
                <strong>File:</strong> {file?.name}
              </p>
              <p>
                <strong>Loại:</strong>{" "}
                {TARGET_TYPES.find((t) => t.value === targetType)?.label}
              </p>
              <p>
                <strong>Số dòng:</strong> {analysis?.totalRows}
              </p>
              <p>
                <strong>Cột được map:</strong>{" "}
                {columns.filter((c) => c.mappedTo).length}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <p className="font-medium">Tùy chọn:</p>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="skipDuplicates"
                  checked={importOptions.skipDuplicates}
                  onCheckedChange={(v) =>
                    setImportOptions((prev) => ({
                      ...prev,
                      skipDuplicates: !!v,
                    }))
                  }
                />
                <Label htmlFor="skipDuplicates">Bỏ qua bản ghi trùng</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="updateExisting"
                  checked={importOptions.updateExisting}
                  onCheckedChange={(v) =>
                    setImportOptions((prev) => ({
                      ...prev,
                      updateExisting: !!v,
                    }))
                  }
                />
                <Label htmlFor="updateExisting">
                  Cập nhật bản ghi đã tồn tại
                </Label>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("mapping")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Button>
              <Button
                onClick={handleExecuteImport}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Bắt đầu Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Importing */}
      {step === "importing" && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-purple-600 animate-spin mb-4" />
            <p className="text-lg font-medium">Đang import dữ liệu...</p>
            <p className="text-muted-foreground">
              Vui lòng không đóng trang này
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Report */}
      {step === "report" && importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              Kết quả Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold">{importResult.totalRows}</p>
                <p className="text-sm text-muted-foreground">Tổng dòng</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {importResult.successCount}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Thành công
                </p>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-center">
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {importResult.skippedCount}
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Bỏ qua (trùng)
                </p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {importResult.failedCount}
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">Lỗi</p>
              </div>
            </div>

            {/* Errors */}
            {importResult.errors && importResult.errors.length > 0 && (
              <div>
                <p className="font-medium mb-2">Chi tiết lỗi:</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {importResult.errors.slice(0, 20).map((err, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-sm rounded"
                    >
                      Dòng {err.row}: {err.message}
                    </div>
                  ))}
                  {importResult.errors.length > 20 && (
                    <p className="text-muted-foreground text-sm">
                      ... và {importResult.errors.length - 20} lỗi khác
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={resetWizard}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Import file khác
              </Button>
              <Button
                onClick={() =>
                  (window.location.href = "/import/history")
                }
              >
                Xem lịch sử import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
