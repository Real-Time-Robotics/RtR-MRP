'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  FileImage,
  Upload,
  History,
  RefreshCw,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  ShoppingCart,
  Receipt,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentOCRPanel } from '@/components/documents/document-ocr-panel';

// =============================================================================
// DOCUMENT PROCESSING PAGE
// AI-powered document scanning and data extraction
// =============================================================================

type DocumentType = 'supplier_quote' | 'customer_po' | 'invoice' | 'certificate' | 'unknown';

interface ProcessedDocument {
  id: string;
  fileName: string;
  documentType: DocumentType;
  confidence: number;
  status: 'success' | 'partial' | 'failed';
  processedAt: Date;
  extractedFields: number;
  createdEntities: string[];
}

const documentTypeInfo: Record<DocumentType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  supplier_quote: { label: 'Báo giá NCC', icon: Building2, color: 'blue' },
  customer_po: { label: 'Đơn hàng KH', icon: ShoppingCart, color: 'green' },
  invoice: { label: 'Hóa đơn', icon: Receipt, color: 'purple' },
  certificate: { label: 'Chứng chỉ', icon: Award, color: 'amber' },
  unknown: { label: 'Không xác định', icon: FileText, color: 'gray' },
};

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const [recentDocuments, setRecentDocuments] = useState<ProcessedDocument[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock recent documents for history tab
  useEffect(() => {
    // In a real app, this would fetch from API
    setRecentDocuments([]);
  }, []);

  const handleProcessComplete = (result: {
    success: boolean;
    documentType: DocumentType;
    confidence: number;
    extractedData: Record<string, unknown>;
    processingTime: number;
    warnings?: string[];
    error?: string;
    createdEntities?: {
      supplier?: { name: string };
      customer?: { name: string };
      salesOrder?: { orderNumber: string; lineCount: number };
      quote?: { quoteNumber: string; itemCount: number };
      invoice?: { invoiceNumber: string };
      certificate?: { certificateNumber: string };
      pendingReview?: { reason: string };
    };
  }) => {
    if (result.success) {
      const newDoc: ProcessedDocument = {
        id: Date.now().toString(),
        fileName: 'Document',
        documentType: result.documentType,
        confidence: result.confidence,
        status: result.confidence >= 0.7 ? 'success' : 'partial',
        processedAt: new Date(),
        extractedFields: result.extractedData ? Object.keys(result.extractedData).length : 0,
        createdEntities: result.createdEntities
          ? Object.keys(result.createdEntities).filter((k) => !['error', 'partial'].includes(k))
          : [],
      };
      setRecentDocuments((prev) => [newDoc, ...prev.slice(0, 9)]);
    }
  };

  return (
    <div className="bg-white dark:bg-steel-dark">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-mrp-border">
        <div className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary flex items-center gap-1.5">
                <FileImage className="w-4 h-4" />
                Xử lý Tài liệu AI
              </h1>
              <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">
                Quét và trích xuất dữ liệu từ báo giá, PO, hóa đơn, chứng chỉ
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('upload')}
                className={cn(
                  'h-9 px-3 text-xs font-medium flex items-center gap-1.5 transition-colors',
                  activeTab === 'upload'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gunmetal text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                <Upload className="w-3.5 h-3.5" />
                Tải lên
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={cn(
                  'h-9 px-3 text-xs font-medium flex items-center gap-1.5 transition-colors',
                  activeTab === 'history'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gunmetal text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                <History className="w-3.5 h-3.5" />
                Lịch sử
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-4">
        {activeTab === 'upload' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Upload Panel */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gunmetal border border-gray-200 dark:border-mrp-border p-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileImage className="w-4 h-4" />
                  Quét tài liệu mới
                </h2>
                <DocumentOCRPanel onComplete={handleProcessComplete} />
              </div>
            </div>

            {/* Info Panel */}
            <div className="space-y-4">
              {/* Supported Types */}
              <div className="bg-white dark:bg-gunmetal border border-gray-200 dark:border-mrp-border p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Loại tài liệu hỗ trợ
                </h3>
                <div className="space-y-2">
                  {(['supplier_quote', 'customer_po', 'invoice', 'certificate'] as DocumentType[]).map(
                    (type) => {
                      const info = documentTypeInfo[type];
                      const Icon = info.icon;
                      return (
                        <div
                          key={type}
                          className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
                        >
                          <div className={cn('p-1.5 rounded', `bg-${info.color}-100 dark:bg-${info.color}-900/30`)}>
                            <Icon className={cn('w-4 h-4', `text-${info.color}-600`)} />
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-gray-900 dark:text-white">
                              {info.label}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {type === 'supplier_quote' && 'Báo giá từ nhà cung cấp'}
                              {type === 'customer_po' && 'Đơn đặt hàng khách hàng'}
                              {type === 'invoice' && 'Hóa đơn mua/bán hàng'}
                              {type === 'certificate' && 'Chứng chỉ chất lượng COC'}
                            </p>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              {recentDocuments.length > 0 && (
                <div className="bg-white dark:bg-gunmetal border border-gray-200 dark:border-mrp-border p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Xử lý gần đây
                  </h3>
                  <div className="space-y-2">
                    {recentDocuments.slice(0, 5).map((doc) => {
                      const info = documentTypeInfo[doc.documentType];
                      const Icon = info.icon;
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
                        >
                          <Icon className={cn('w-4 h-4', `text-${info.color}-600`)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-gray-900 dark:text-white truncate">
                              {info.label}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {Math.round(doc.confidence * 100)}% accuracy
                            </p>
                          </div>
                          {doc.status === 'success' ? (
                            <CheckCircle className="w-4 h-4 text-success-500" />
                          ) : doc.status === 'partial' ? (
                            <Clock className="w-4 h-4 text-warning-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-danger-500" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tips */}
              <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 p-4 rounded">
                <h3 className="text-sm font-semibold text-primary-800 dark:text-primary-400 mb-2">
                  Mẹo sử dụng
                </h3>
                <ul className="space-y-1 text-[11px] text-primary-700 dark:text-primary-500">
                  <li>• Chụp ảnh rõ nét, đủ ánh sáng</li>
                  <li>• Tài liệu nằm ngang, không bị che</li>
                  <li>• Hỗ trợ tiếng Việt và tiếng Anh</li>
                  <li>• Tự động tạo Supplier, Customer, Order</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          /* History Tab */
          <div className="bg-white dark:bg-gunmetal border border-gray-200 dark:border-mrp-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Lịch sử xử lý tài liệu
              </h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    aria-label="Tìm kiếm"
                    className="h-9 pl-8 pr-3 bg-gray-100 dark:bg-gray-700 border-0 text-xs focus:ring-2 focus:ring-primary-500 rounded"
                  />
                </div>
              </div>
            </div>

            {recentDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500">Chưa có tài liệu nào được xử lý</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Tải lên tài liệu đầu tiên để bắt đầu
                </p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="mt-4 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded hover:bg-primary-700"
                >
                  Tải lên ngay
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">
                        Loại
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">
                        Thời gian
                      </th>
                      <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-500 uppercase">
                        Độ chính xác
                      </th>
                      <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-500 uppercase">
                        Trường dữ liệu
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">
                        Đối tượng tạo
                      </th>
                      <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-500 uppercase">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {recentDocuments.map((doc) => {
                      const info = documentTypeInfo[doc.documentType];
                      const Icon = info.icon;
                      return (
                        <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Icon className={cn('w-4 h-4', `text-${info.color}-600`)} />
                              <span className="text-[11px] font-medium text-gray-900 dark:text-white">
                                {info.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-[11px] text-gray-600 dark:text-gray-400">
                            {doc.processedAt.toLocaleString('vi-VN')}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={cn(
                                'text-[11px] font-medium',
                                doc.confidence >= 0.9
                                  ? 'text-success-600'
                                  : doc.confidence >= 0.7
                                  ? 'text-warning-600'
                                  : 'text-danger-600'
                              )}
                            >
                              {Math.round(doc.confidence * 100)}%
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-[11px] text-gray-600 dark:text-gray-400">
                            {doc.extractedFields}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {doc.createdEntities.map((entity) => (
                                <span
                                  key={entity}
                                  className="px-1.5 py-0.5 bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 text-[10px] rounded"
                                >
                                  {entity}
                                </span>
                              ))}
                              {doc.createdEntities.length === 0 && (
                                <span className="text-[10px] text-gray-400">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {doc.status === 'success' ? (
                              <CheckCircle className="w-4 h-4 text-success-500 mx-auto" />
                            ) : doc.status === 'partial' ? (
                              <Clock className="w-4 h-4 text-warning-500 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-danger-500 mx-auto" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
