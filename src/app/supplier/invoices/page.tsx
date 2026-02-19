'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { clientLogger } from '@/lib/client-logger';
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  Send,
  Download,
  XCircle,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { excelPortalStyles } from '@/components/ui-v2/excel';

// =============================================================================
// SUPPLIER INVOICES PAGE
// Manage invoices and payment tracking
// =============================================================================

type InvoiceStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REJECTED' | 'OVERDUE';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  deliveryId: string;
  poNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  paymentTerms: string;
  paidDate?: string;
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  DRAFT: { label: 'Nháp', color: 'text-gray-600', bgColor: 'bg-gray-50 dark:bg-gray-900/20', icon: <FileText className="w-4 h-4" /> },
  SUBMITTED: { label: 'Đã gửi', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20', icon: <Send className="w-4 h-4" /> },
  APPROVED: { label: 'Đã duyệt', color: 'text-cyan-600', bgColor: 'bg-cyan-50 dark:bg-cyan-900/20', icon: <CheckCircle2 className="w-4 h-4" /> },
  PAID: { label: 'Đã thanh toán', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20', icon: <CreditCard className="w-4 h-4" /> },
  REJECTED: { label: 'Từ chối', color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20', icon: <XCircle className="w-4 h-4" /> },
  OVERDUE: { label: 'Quá hạn', color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-900/20', icon: <AlertTriangle className="w-4 h-4" /> },
};

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );
}

function SupplierInvoicesContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') as InvoiceStatus | null;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>(initialStatus || 'ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  async function fetchInvoices() {
    setLoading(true);
    try {
      const url = statusFilter === 'ALL'
        ? '/api/v2/supplier?view=invoices'
        : `/api/v2/supplier?view=invoices&status=${statusFilter}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setInvoices(json.data.invoices);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch supplier invoices', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitInvoice(invoiceId: string) {
    setSubmitting(invoiceId);
    try {
      const res = await fetch('/api/v2/supplier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit_invoice', data: { invoiceId } }),
      });
      const json = await res.json();
      if (json.success) {
        setInvoices(prev => prev.map(inv =>
          inv.id === invoiceId ? { ...inv, status: 'SUBMITTED' as InvoiceStatus } : inv
        ));
      }
    } catch (error) {
      clientLogger.error('Failed to submit invoice', error);
    } finally {
      setSubmitting(null);
    }
  }

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.poNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  // Summary stats
  const stats = {
    totalPending: invoices.filter(i => ['DRAFT', 'SUBMITTED'].includes(i.status)).reduce((s, i) => s + i.total, 0),
    totalApproved: invoices.filter(i => i.status === 'APPROVED').reduce((s, i) => s + i.total, 0),
    totalPaid: invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.total, 0),
    totalOverdue: invoices.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + i.total, 0),
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hóa đơn</h1>
          <p className="text-gray-500 dark:text-gray-400">Quản lý hóa đơn và theo dõi thanh toán</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-500">Chờ xử lý</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalPending)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-500" />
            <span className="text-sm text-gray-500">Đã duyệt</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalApproved)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-500">Đã thanh toán</span>
          </div>
          <p className="text-lg font-bold text-green-600">{formatCurrency(stats.totalPaid)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-gray-500">Quá hạn</span>
          </div>
          <p className="text-lg font-bold text-orange-600">{formatCurrency(stats.totalOverdue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo số hóa đơn hoặc PO..."
            aria-label="Tìm kiếm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'ALL')}
            aria-label="Bộ lọc trạng thái"
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoices List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Không có hóa đơn nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => {
            const statusConfig = STATUS_CONFIG[invoice.status];

            return (
              <div
                key={invoice.id}
                className={cn(
                  'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden',
                  invoice.status === 'OVERDUE' && 'border-orange-300 dark:border-orange-800'
                )}
              >
                {/* Invoice Header */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <div className={cn('p-2 rounded-lg', statusConfig.bgColor)}>
                      <FileText className={cn('w-5 h-5', statusConfig.color)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{invoice.invoiceNumber}</h3>
                        {invoice.status === 'OVERDUE' && (
                          <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            Quá hạn
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        PO: {invoice.poNumber} • Ngày: {formatDate(invoice.invoiceDate)} • Hạn: {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
                      statusConfig.bgColor, statusConfig.color
                    )}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>

                    {invoice.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSubmitInvoice(invoice.id)}
                        disabled={submitting === invoice.id}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {submitting === invoice.id ? (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Gửi
                      </button>
                    )}

                    <button
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      title="Tải xuống"
                    >
                      <Download className="w-4 h-4 text-gray-400" />
                    </button>

                    <button
                      onClick={() => setSelectedInvoice(selectedInvoice?.id === invoice.id ? null : invoice)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <ChevronRight className={cn(
                        'w-5 h-5 text-gray-400 transition-transform',
                        selectedInvoice?.id === invoice.id && 'rotate-90'
                      )} />
                    </button>
                  </div>
                </div>

                {/* Invoice Summary */}
                <div className="p-4 flex flex-wrap items-center gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Tạm tính:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">VAT (10%):</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{formatCurrency(invoice.tax)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Tổng cộng:</span>
                    <span className="ml-2 font-bold text-blue-600">{formatCurrency(invoice.total)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Điều khoản:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{invoice.paymentTerms}</span>
                  </div>
                  {invoice.paidDate && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CreditCard className="w-4 h-4" />
                      <span>Thanh toán: {formatDate(invoice.paidDate)}</span>
                    </div>
                  )}
                </div>

                {/* Invoice Items (Expandable) - Excel Style */}
                {selectedInvoice?.id === invoice.id && (
                  <div className="border-t border-[#217346]/30 dark:border-[#70AD47]/30 bg-white dark:bg-slate-950">
                    <table className={excelPortalStyles.table}>
                      <thead className={excelPortalStyles.thead}>
                        <tr>
                          <th className={excelPortalStyles.th}>Mô tả</th>
                          <th className={`${excelPortalStyles.th} ${excelPortalStyles.thRight}`}>Số lượng</th>
                          <th className={`${excelPortalStyles.th} ${excelPortalStyles.thRight}`}>Đơn giá</th>
                          <th className={`${excelPortalStyles.th} ${excelPortalStyles.thRight}`}>Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className={excelPortalStyles.tbody}>
                        {invoice?.items?.map((item, idx) => (
                          <tr key={idx} className={excelPortalStyles.tr}>
                            <td className={excelPortalStyles.td}>{item.description}</td>
                            <td className={excelPortalStyles.tdNumber}>
                              {item.quantity.toLocaleString()}
                            </td>
                            <td className={excelPortalStyles.tdNumber}>
                              {formatCurrency(item.unitPrice)}
                            </td>
                            <td className={excelPortalStyles.tdCurrency}>
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className={excelPortalStyles.tfoot}>
                        <tr>
                          <td colSpan={3} className={`${excelPortalStyles.tfootTd} text-right text-slate-500`}>
                            Tạm tính
                          </td>
                          <td className={`${excelPortalStyles.tfootTd} text-right`}>
                            {formatCurrency(invoice.subtotal)}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={3} className={`${excelPortalStyles.tfootTd} text-right text-slate-500`}>
                            VAT (10%)
                          </td>
                          <td className={`${excelPortalStyles.tfootTd} text-right`}>
                            {formatCurrency(invoice.tax)}
                          </td>
                        </tr>
                        <tr className="bg-[#E2EFDA]/50 dark:bg-[#217346]/20">
                          <td colSpan={3} className={`${excelPortalStyles.tfootTd} text-right font-bold text-[#217346] dark:text-[#70AD47]`}>
                            Tổng cộng
                          </td>
                          <td className={`${excelPortalStyles.tfootTd} text-right font-bold text-[#217346] dark:text-[#70AD47]`}>
                            {formatCurrency(invoice.total)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SupplierInvoicesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SupplierInvoicesContent />
    </Suspense>
  );
}
