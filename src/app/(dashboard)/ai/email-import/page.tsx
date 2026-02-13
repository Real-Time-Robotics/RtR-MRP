'use client';

import { useState } from 'react';
import {
  Mail,
  Upload,
  FileText,
  ShoppingCart,
  Building2,
  Loader2,
  Check,
  X,
  AlertTriangle,
  AlertCircle,
  Edit,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Package,
  Calendar,
  DollarSign,
  User,
  Paperclip,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// EMAIL IMPORT PAGE
// Parse emails and create orders with AI
// =============================================================================

interface ExtractedLineItem {
  lineNumber: number;
  partNumber?: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
  confidence: number;
}

interface ExtractedData {
  emailType: string;
  confidence: number;
  customerPO?: any;
  supplierQuote?: any;
  fieldConfidence: Record<string, number>;
  warnings: string[];
}

interface DraftOrder {
  type: string;
  status: string;
  data: any;
  confidence: number;
  requiresReview: boolean;
  reviewNotes: string[];
}

export default function EmailImportPage() {
  const [emailContent, setEmailContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [draftOrder, setDraftOrder] = useState<DraftOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showRawData, setShowRawData] = useState(false);

  // Parse email
  const handleParse = async () => {
    if (!emailContent.trim()) {
      setError('Vui lòng nhập nội dung email');
      return;
    }

    setProcessing(true);
    setError(null);
    setExtractedData(null);
    setDraftOrder(null);
    setCreatedOrder(null);

    try {
      // Convert attachments to base64
      const attachmentData = await Promise.all(
        attachments.map(async (file) => {
          const base64 = await fileToBase64(file);
          return {
            filename: file.name,
            contentType: file.type,
            base64Data: base64,
          };
        })
      );

      const response = await fetch('/api/ai/email-parser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parse',
          emailContent,
          attachments: attachmentData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse email');
      }

      setExtractedData(data.extractedData);
      setDraftOrder(data.draftOrder);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  // Create order
  const handleCreateOrder = async () => {
    if (!draftOrder) return;

    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/email-parser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_order',
          draftOrder,
          approved: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      setCreatedOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setCreating(false);
    }
  };

  // Handle file input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setAttachments(Array.from(files));
    }
  };

  // Reset
  const handleReset = () => {
    setEmailContent('');
    setAttachments([]);
    setExtractedData(null);
    setDraftOrder(null);
    setError(null);
    setCreatedOrder(null);
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-red-600 bg-red-100 dark:bg-red-900/30';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'Cao';
    if (confidence >= 0.7) return 'Trung bình';
    return 'Thấp';
  };

  return (
    <div className="bg-white dark:bg-steel-dark">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-mrp-border">
        <div className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                Nhập đơn hàng từ Email
              </h1>
              <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">
                AI trích xuất dữ liệu từ email PO/Quote để tạo đơn hàng
              </p>
            </div>
            {(extractedData || error) && (
              <button
                onClick={handleReset}
                className="h-9 px-3 text-xs bg-gray-100 dark:bg-gunmetal text-gray-700 dark:text-gray-300 hover:bg-gray-200 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Làm mới
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="py-4 space-y-4">
        {/* Created Order Success */}
        {createdOrder && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-400">
                  Đã tạo {createdOrder.type === 'sales_order' ? 'Sales Order' : 'Purchase Order'} thành công!
                </p>
                <p className="text-sm text-green-700 dark:text-green-500 mt-1">
                  {createdOrder.type === 'sales_order'
                    ? `${createdOrder.orderNumber} - ${createdOrder.customer}`
                    : `${createdOrder.poNumber} - ${createdOrder.supplier}`}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  {createdOrder.itemCount} items • {new Intl.NumberFormat('vi-VN').format(createdOrder.totalAmount || 0)} VND
                </p>
                <div className="mt-3 flex gap-2">
                  <a
                    href={createdOrder.type === 'sales_order' ? `/orders/sales/${createdOrder.id}` : `/purchasing/${createdOrder.id}`}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700"
                  >
                    Xem đơn hàng
                  </a>
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 bg-white text-green-700 text-xs font-medium rounded border border-green-300 hover:bg-green-50"
                  >
                    Nhập email khác
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-400">Lỗi</p>
                <p className="text-sm text-red-700 dark:text-red-500 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!createdOrder && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Input Panel */}
            <div className="space-y-4">
              {/* Email Input */}
              <div className="bg-white dark:bg-gunmetal border border-gray-200 dark:border-mrp-border p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Nội dung Email
                </h3>
                <textarea
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder={`Paste nội dung email ở đây...

Ví dụ:
Subject: PO#12345 - ABC Company
From: buyer@abccompany.com

Dear Supplier,

Please supply the following items:
1. Part ABC-001 - Bearing SKF 6205 - Qty: 100 - $15.00
2. Part ABC-002 - Motor 5HP - Qty: 5 - $250.00

Total: $1,750.00
Delivery: 15 Jan 2026

Best regards,
John`}
                  className="w-full h-64 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={processing}
                />
              </div>

              {/* Attachments */}
              <div className="bg-white dark:bg-gunmetal border border-gray-200 dark:border-mrp-border p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  File đính kèm (tùy chọn)
                </h3>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="attachment-input"
                  disabled={processing}
                />
                <label
                  htmlFor="attachment-input"
                  className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded cursor-pointer hover:border-blue-500 transition-colors"
                >
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Click để chọn file hoặc kéo thả
                  </span>
                </label>
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {file.name}
                        <button
                          onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Parse Button */}
              <button
                onClick={handleParse}
                disabled={processing || !emailContent.trim()}
                className="w-full py-3 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang phân tích...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Phân tích Email
                  </>
                )}
              </button>
            </div>

            {/* Results Panel */}
            <div className="space-y-4">
              {extractedData ? (
                <>
                  {/* Extraction Summary */}
                  <div className="bg-white dark:bg-gunmetal border border-gray-200 dark:border-mrp-border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        {extractedData.emailType === 'customer_po' ? (
                          <>
                            <ShoppingCart className="w-4 h-4 text-green-600" />
                            Customer PO
                          </>
                        ) : extractedData.emailType === 'supplier_quote' ? (
                          <>
                            <Building2 className="w-4 h-4 text-blue-600" />
                            Supplier Quote
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4 text-gray-600" />
                            Unknown
                          </>
                        )}
                      </h3>
                      <span className={cn('px-2 py-1 text-xs font-medium rounded', getConfidenceColor(extractedData.confidence))}>
                        {getConfidenceLabel(extractedData.confidence)} ({Math.round(extractedData.confidence * 100)}%)
                      </span>
                    </div>

                    {/* Warnings */}
                    {extractedData.warnings.length > 0 && (
                      <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-yellow-700 dark:text-yellow-500">
                            {extractedData.warnings.map((w, i) => (
                              <p key={i}>• {w}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Extracted Fields */}
                    <div className="space-y-3">
                      {extractedData.customerPO && (
                        <>
                          <DataField
                            icon={FileText}
                            label="PO Number"
                            value={extractedData.customerPO.poNumber}
                            confidence={extractedData.fieldConfidence['poNumber']}
                          />
                          <DataField
                            icon={User}
                            label="Khách hàng"
                            value={extractedData.customerPO.customerName}
                            code={extractedData.customerPO.customerCode}
                            confidence={extractedData.fieldConfidence['customerName']}
                          />
                          <DataField
                            icon={Calendar}
                            label="Ngày giao"
                            value={extractedData.customerPO.deliveryDate}
                            confidence={extractedData.fieldConfidence['deliveryDate']}
                          />
                          <DataField
                            icon={DollarSign}
                            label="Tổng tiền"
                            value={extractedData.customerPO.total
                              ? `${new Intl.NumberFormat('vi-VN').format(extractedData.customerPO.total)} ${extractedData.customerPO.currency || 'VND'}`
                              : '-'}
                            confidence={extractedData.fieldConfidence['total']}
                          />
                        </>
                      )}

                      {extractedData.supplierQuote && (
                        <>
                          <DataField
                            icon={FileText}
                            label="Quote Number"
                            value={extractedData.supplierQuote.quoteNumber}
                            confidence={extractedData.fieldConfidence['quoteNumber']}
                          />
                          <DataField
                            icon={Building2}
                            label="Nhà cung cấp"
                            value={extractedData.supplierQuote.supplierName}
                            code={extractedData.supplierQuote.supplierCode}
                            confidence={extractedData.fieldConfidence['supplierName']}
                          />
                          <DataField
                            icon={Calendar}
                            label="Hiệu lực đến"
                            value={extractedData.supplierQuote.validUntil}
                            confidence={extractedData.fieldConfidence['validUntil']}
                          />
                          <DataField
                            icon={DollarSign}
                            label="Tổng tiền"
                            value={extractedData.supplierQuote.total
                              ? `${new Intl.NumberFormat('vi-VN').format(extractedData.supplierQuote.total)} ${extractedData.supplierQuote.currency || 'VND'}`
                              : '-'}
                            confidence={extractedData.fieldConfidence['total']}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Line Items */}
                  {((extractedData.customerPO?.items?.length || 0) > 0 ||
                    (extractedData.supplierQuote?.items?.length || 0) > 0) && (
                    <div className="bg-white dark:bg-gunmetal border border-gray-200 dark:border-mrp-border p-4">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Chi tiết mặt hàng ({(extractedData.customerPO?.items || extractedData.supplierQuote?.items)?.length || 0})
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="py-2 text-left">#</th>
                              <th className="py-2 text-left">Part#</th>
                              <th className="py-2 text-left">Mô tả</th>
                              <th className="py-2 text-right">SL</th>
                              <th className="py-2 text-right">Đơn giá</th>
                              <th className="py-2 text-center">%</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {(extractedData.customerPO?.items || extractedData.supplierQuote?.items || []).map(
                              (item: ExtractedLineItem) => (
                                <tr key={item.lineNumber}>
                                  <td className="py-2">{item.lineNumber}</td>
                                  <td className="py-2 font-mono">{item.partNumber || '-'}</td>
                                  <td className="py-2 max-w-[150px] truncate">{item.description}</td>
                                  <td className="py-2 text-right">{item.quantity} {item.unit || ''}</td>
                                  <td className="py-2 text-right">
                                    {item.unitPrice ? new Intl.NumberFormat('vi-VN').format(item.unitPrice) : '-'}
                                  </td>
                                  <td className="py-2 text-center">
                                    <span className={cn('px-1 py-0.5 rounded text-[10px]', getConfidenceColor(item.confidence))}>
                                      {Math.round(item.confidence * 100)}
                                    </span>
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {draftOrder && extractedData.emailType !== 'unknown' && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateOrder}
                        disabled={creating}
                        className="flex-1 py-3 bg-green-600 text-white font-medium rounded hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {creating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Đang tạo...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Tạo {draftOrder.type === 'sales_order' ? 'Sales Order' : 'Purchase Order'}
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleReset}
                        className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded hover:bg-gray-200 flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Hủy
                      </button>
                    </div>
                  )}

                  {/* Raw Data Toggle */}
                  <button
                    onClick={() => setShowRawData(!showRawData)}
                    className="w-full flex items-center justify-center gap-1 py-2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    {showRawData ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {showRawData ? 'Ẩn dữ liệu thô' : 'Xem dữ liệu thô'}
                  </button>

                  {showRawData && (
                    <pre className="bg-gray-900 text-green-400 p-3 rounded text-[10px] overflow-auto max-h-[300px]">
                      {JSON.stringify(extractedData, null, 2)}
                    </pre>
                  )}
                </>
              ) : (
                /* Empty State */
                <div className="bg-white dark:bg-gunmetal border border-gray-200 dark:border-mrp-border p-8 text-center">
                  <Mail className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-sm text-gray-500 mb-2">
                    Paste nội dung email để AI phân tích
                  </p>
                  <p className="text-xs text-gray-400">
                    Hỗ trợ: Customer PO, Supplier Quote
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800 rounded">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-400 mb-2">
            Cách hoạt động
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-[11px] text-blue-700 dark:text-blue-500">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 flex items-center justify-center bg-blue-200 dark:bg-blue-800 rounded-full text-blue-800 dark:text-blue-200 font-bold">1</span>
              <span>Paste email hoặc upload file đính kèm (PDF, hình ảnh)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 flex items-center justify-center bg-blue-200 dark:bg-blue-800 rounded-full text-blue-800 dark:text-blue-200 font-bold">2</span>
              <span>AI phân tích và trích xuất thông tin đơn hàng</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 flex items-center justify-center bg-blue-200 dark:bg-blue-800 rounded-full text-blue-800 dark:text-blue-200 font-bold">3</span>
              <span>Review và chỉnh sửa dữ liệu nếu cần</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 flex items-center justify-center bg-blue-200 dark:bg-blue-800 rounded-full text-blue-800 dark:text-blue-200 font-bold">4</span>
              <span>Xác nhận để tạo Sales Order / Purchase Order</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function DataField({
  icon: Icon,
  label,
  value,
  code,
  confidence,
}: {
  icon: any;
  label: string;
  value: string | undefined;
  code?: string;
  confidence?: number;
}) {
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.9) return 'text-green-600';
    if (conf >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-500">{label}:</span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {value || '-'}
        </span>
        {code && (
          <span className="text-xs text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
            {code}
          </span>
        )}
      </div>
      {confidence !== undefined && (
        <span className={cn('text-[10px] font-mono', getConfidenceColor(confidence))}>
          {Math.round(confidence * 100)}%
        </span>
      )}
    </div>
  );
}

// =============================================================================
// UTILITIES
// =============================================================================

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
