'use client';

import { useState, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  FileText,
  Upload,
  X,
  Check,
  AlertTriangle,
  AlertCircle,
  Loader2,
  FileImage,
  Building2,
  ShoppingCart,
  Receipt,
  Award,
  ChevronDown,
  ChevronUp,
  Edit,
  Save,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

type DocumentType = 'supplier_quote' | 'customer_po' | 'invoice' | 'certificate' | 'unknown';

interface ExtractedItem {
  partNumber?: string;
  description: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  unit?: string;
}

interface CreatedEntities {
  supplier?: { name: string };
  customer?: { name: string };
  salesOrder?: { orderNumber: string; lineCount: number };
  quote?: { quoteNumber: string; itemCount: number };
  invoice?: { invoiceNumber: string };
  certificate?: { certificateNumber: string };
  pendingReview?: { reason: string };
}

interface OCRResult {
  success: boolean;
  documentType: DocumentType;
  confidence: number;
  extractedData: Record<string, unknown> & {
    items?: ExtractedItem[];
    lineItems?: ExtractedItem[];
  };
  processingTime: number;
  warnings?: string[];
  error?: string;
  createdEntities?: CreatedEntities;
}

// =============================================================================
// DOCUMENT TYPE INFO
// =============================================================================

const documentTypeInfo: Record<DocumentType, { label: string; icon: LucideIcon; color: string }> = {
  supplier_quote: { label: 'Báo giá NCC', icon: Building2, color: 'blue' },
  customer_po: { label: 'Đơn hàng KH', icon: ShoppingCart, color: 'green' },
  invoice: { label: 'Hóa đơn', icon: Receipt, color: 'purple' },
  certificate: { label: 'Chứng chỉ', icon: Award, color: 'amber' },
  unknown: { label: 'Chưa xác định', icon: FileText, color: 'gray' },
};

// =============================================================================
// DOCUMENT OCR PANEL
// =============================================================================

interface DocumentOCRPanelProps {
  onComplete?: (result: OCRResult) => void;
}

export function DocumentOCRPanel({ onComplete }: DocumentOCRPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<DocumentType | undefined>(undefined);
  const [autoCreate, setAutoCreate] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['data']));

  // Handle file selection
  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  }, []);

  // Handle drag and drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && droppedFile.type.startsWith('image/')) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Process document
  const processDocument = async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (selectedType) {
        formData.append('documentType', selectedType);
      }
      formData.append('autoCreate', autoCreate.toString());

      const response = await fetch('/api/documents/ocr', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process document');
      }

      setResult(data);
      onComplete?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  // Clear and reset
  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setSelectedType(undefined);
  };

  // Toggle section
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!file && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
          <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
            Kéo thả hoặc click để tải tài liệu
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Hỗ trợ: Báo giá, PO, Hóa đơn, Chứng chỉ (JPG, PNG, WebP)
          </p>
        </div>
      )}

      {/* File Preview & Options */}
      {file && !result && (
        <div className="space-y-4">
          {/* Preview */}
          <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            {preview && (
              <img
                src={preview}
                alt="Document preview"
                className="w-full max-h-96 object-contain bg-gray-50 dark:bg-gray-800"
              />
            )}
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Document Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Loại tài liệu (tùy chọn - để trống để tự động nhận diện)
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(['supplier_quote', 'customer_po', 'invoice', 'certificate'] as DocumentType[]).map(
                (type) => {
                  const info = documentTypeInfo[type];
                  const Icon = info.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(selectedType === type ? undefined : type)}
                      className={cn(
                        'flex items-center gap-2 p-3 rounded-lg border transition-all text-sm',
                        selectedType === type
                          ? `border-${info.color}-500 bg-${info.color}-50 dark:bg-${info.color}-900/20 text-${info.color}-700 dark:text-${info.color}-400`
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {info.label}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCreate}
                onChange={(e) => setAutoCreate(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Tự động tạo đối tượng (Supplier, Customer, Sales Order...)
              </span>
            </label>
          </div>

          {/* Process Button */}
          <button
            onClick={processDocument}
            disabled={processing}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <FileImage className="h-5 w-5" />
                Phân tích tài liệu
              </>
            )}
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-400">Lỗi xử lý</p>
              <p className="text-sm text-red-700 dark:text-red-500 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={handleClear}
            className="mt-3 text-sm text-red-600 hover:underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(() => {
                const info = documentTypeInfo[result.documentType];
                const Icon = info.icon;
                return (
                  <>
                    <div
                      className={cn(
                        'p-2 rounded-lg',
                        result.success
                          ? `bg-${info.color}-100 dark:bg-${info.color}-900/30`
                          : 'bg-gray-100 dark:bg-gray-800'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-6 w-6',
                          result.success
                            ? `text-${info.color}-600`
                            : 'text-gray-500'
                        )}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {info.label}
                      </p>
                      <p className="text-sm text-gray-500">
                        {result.processingTime}ms processing
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Confidence */}
            <div className="text-right">
              <p className="text-sm text-gray-500">Độ chính xác</p>
              <p className={cn('text-lg font-bold', getConfidenceColor(result.confidence))}>
                {Math.round(result.confidence * 100)}%
              </p>
            </div>
          </div>

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                    Cảnh báo
                  </p>
                  <ul className="mt-1 text-sm text-yellow-700 dark:text-yellow-500 space-y-1">
                    {result.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Extracted Data */}
          {result.extractedData && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('data')}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span className="font-medium text-gray-900 dark:text-white">
                  Dữ liệu trích xuất
                </span>
                {expandedSections.has('data') ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </button>

              {expandedSections.has('data') && (
                <div className="p-4 space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(result.extractedData)
                      .filter(([key]) => !['items', 'lineItems', 'testResults'].includes(key))
                      .map(([key, value]) => (
                        <div key={key}>
                          <p className="text-xs text-gray-500 uppercase">{formatFieldName(key)}</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatFieldValue(value)}
                          </p>
                        </div>
                      ))}
                  </div>

                  {/* Line Items */}
                  {(result.extractedData.items || result.extractedData.lineItems) && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">Chi tiết mặt hàng</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800">
                              <th className="px-3 py-2 text-left">Mô tả</th>
                              <th className="px-3 py-2 text-right">SL</th>
                              <th className="px-3 py-2 text-right">Đơn giá</th>
                              <th className="px-3 py-2 text-right">Thành tiền</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {(result.extractedData.items ?? result.extractedData.lineItems ?? []).map(
                              (item: ExtractedItem, index: number) => (
                                <tr key={index}>
                                  <td className="px-3 py-2">
                                    {item.partNumber && (
                                      <span className="text-xs text-gray-500 mr-2">
                                        {item.partNumber}
                                      </span>
                                    )}
                                    {item.description}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    {item.quantity} {item.unit || ''}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    {item.unitPrice
                                      ? new Intl.NumberFormat('vi-VN').format(item.unitPrice)
                                      : '-'}
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium">
                                    {item.totalPrice
                                      ? new Intl.NumberFormat('vi-VN').format(item.totalPrice)
                                      : '-'}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Created Entities */}
          {result.createdEntities && Object.keys(result.createdEntities).length > 0 && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-400">
                    Đã tạo đối tượng
                  </p>
                  <div className="mt-2 space-y-2 text-sm text-green-700 dark:text-green-500">
                    {result.createdEntities.supplier && (
                      <p>• Nhà cung cấp: {result.createdEntities.supplier.name}</p>
                    )}
                    {result.createdEntities.customer && (
                      <p>• Khách hàng: {result.createdEntities.customer.name}</p>
                    )}
                    {result.createdEntities.salesOrder && (
                      <p>
                        • Đơn hàng: {result.createdEntities.salesOrder.orderNumber} (
                        {result.createdEntities.salesOrder.lineCount} dòng)
                      </p>
                    )}
                    {result.createdEntities.quote && (
                      <p>
                        • Báo giá: {result.createdEntities.quote.quoteNumber} (
                        {result.createdEntities.quote.itemCount} mặt hàng)
                      </p>
                    )}
                    {result.createdEntities.invoice && (
                      <p>• Hóa đơn: {result.createdEntities.invoice.invoiceNumber}</p>
                    )}
                    {result.createdEntities.certificate && (
                      <p>• Chứng chỉ: {result.createdEntities.certificate.certificateNumber}</p>
                    )}
                    {result.createdEntities.pendingReview && (
                      <p className="text-yellow-600">
                        ⚠️ {result.createdEntities.pendingReview.reason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleClear}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <RefreshCw className="h-4 w-4" />
              Xử lý tài liệu khác
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function formatFieldName(key: string): string {
  const mappings: Record<string, string> = {
    quoteNumber: 'Số báo giá',
    poNumber: 'Số PO',
    invoiceNumber: 'Số hóa đơn',
    certificateNumber: 'Số chứng chỉ',
    supplierName: 'Nhà cung cấp',
    customerName: 'Khách hàng',
    productName: 'Sản phẩm',
    quoteDate: 'Ngày báo giá',
    poDate: 'Ngày PO',
    invoiceDate: 'Ngày hóa đơn',
    issueDate: 'Ngày cấp',
    validUntil: 'Hiệu lực đến',
    expiryDate: 'Ngày hết hạn',
    deliveryDate: 'Ngày giao hàng',
    totalAmount: 'Tổng tiền',
    subtotal: 'Tạm tính',
    taxAmount: 'Thuế',
    currency: 'Đơn vị tiền',
    paymentTerms: 'Điều khoản thanh toán',
    shippingAddress: 'Địa chỉ giao hàng',
    billingAddress: 'Địa chỉ thanh toán',
    contactName: 'Người liên hệ',
    contactEmail: 'Email',
    contactPhone: 'Điện thoại',
    certifyingBody: 'Cơ quan cấp',
    batchNumber: 'Số lô',
    lotNumber: 'Số lot',
  };
  return mappings[key] || key.replace(/([A-Z])/g, ' $1').trim();
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') {
    return new Intl.NumberFormat('vi-VN').format(value);
  }
  if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))) {
    return new Date(value).toLocaleDateString('vi-VN');
  }
  return String(value);
}

export default DocumentOCRPanel;
