'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText, Search, RefreshCw, Download, Eye,
  CheckCircle, Clock, AlertTriangle, DollarSign, X,
  CreditCard, Building2, Calendar
} from 'lucide-react';
import {
  CustomerPortalEngine,
  CustomerInvoice
} from '@/lib/customer/customer-engine';
import { clientLogger } from '@/lib/client-logger';
import {
  ExcelPortalTable,
  excelPortalStyles,
} from '@/components/ui-v2/excel';

// =============================================================================
// CUSTOMER INVOICES PAGE
// Phase 9: Customer Portal
// =============================================================================

export default function CustomerInvoicesPage() {
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [summary, setSummary] = useState({ total: 0, paid: 0, unpaid: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<CustomerInvoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/v2/customer?view=invoices');
      const result = await response.json();
      if (result.success) {
        setInvoices(result.data.invoices || []);
        setSummary(result.data.summary || { total: 0, paid: 0, unpaid: 0 });
      }
    } catch (error) {
      clientLogger.error('Failed to fetch invoices', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!invoice.invoiceNumber.toLowerCase().includes(query) &&
          !invoice.soNumber.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (statusFilter !== 'ALL' && invoice.status !== statusFilter) {
      return false;
    }
    return true;
  });

  // Get status icon
  const getStatusIcon = (status: CustomerInvoice['status']) => {
    switch (status) {
      case 'DRAFT': return <FileText className="w-5 h-5 text-gray-500" />;
      case 'SENT': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'VIEWED': return <Eye className="w-5 h-5 text-purple-500" />;
      case 'PAID': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'OVERDUE': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'CANCELLED': return <X className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-yellow-600" />
            Hóa đơn của tôi
          </h1>
          <p className="text-gray-500 mt-1">Xem và thanh toán hóa đơn</p>
        </div>
        <button
          onClick={() => fetchInvoices()}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[rgb(var(--sidebar-item-hover))]"
          aria-label="Làm mới"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl p-4 border border-gray-200 dark:border-[rgb(var(--border-primary))]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {CustomerPortalEngine.formatCurrency(summary.total)}
              </p>
              <p className="text-sm text-gray-500">Tổng giá trị</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl p-4 border border-gray-200 dark:border-[rgb(var(--border-primary))]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {CustomerPortalEngine.formatCurrency(summary.paid)}
              </p>
              <p className="text-sm text-gray-500">Đã thanh toán</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl p-4 border border-gray-200 dark:border-[rgb(var(--border-primary))]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">
                {CustomerPortalEngine.formatCurrency(summary.unpaid)}
              </p>
              <p className="text-sm text-gray-500">Chưa thanh toán</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl p-4 border border-gray-200 dark:border-[rgb(var(--border-primary))]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo số hóa đơn, đơn hàng..."
              aria-label="Tìm kiếm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-[rgb(var(--bg-tertiary))] rounded-xl focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Bộ lọc trạng thái"
            className="px-4 py-2 bg-gray-100 dark:bg-[rgb(var(--bg-tertiary))] rounded-xl focus:outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="SENT">Đã gửi</option>
            <option value="VIEWED">Đã xem</option>
            <option value="PAID">Đã thanh toán</option>
            <option value="OVERDUE">Quá hạn</option>
          </select>
        </div>
      </div>

      {/* Invoices Table - Excel Style */}
      <ExcelPortalTable
        title="Danh sách hóa đơn"
        subtitle={`${filteredInvoices.length} records`}
        totalRows={filteredInvoices.length}
        sheetName="Invoices"
      >
        <table className={excelPortalStyles.table}>
          <thead className={excelPortalStyles.thead}>
            <tr>
              <th className={excelPortalStyles.th}>Số hóa đơn</th>
              <th className={excelPortalStyles.th}>Đơn hàng</th>
              <th className={excelPortalStyles.th}>Ngày tạo</th>
              <th className={excelPortalStyles.th}>Hạn thanh toán</th>
              <th className={`${excelPortalStyles.th} ${excelPortalStyles.thRight}`}>Tổng tiền</th>
              <th className={`${excelPortalStyles.th} ${excelPortalStyles.thRight}`}>Còn nợ</th>
              <th className={`${excelPortalStyles.th} ${excelPortalStyles.thCenter}`}>Trạng thái</th>
              <th className={`${excelPortalStyles.th} ${excelPortalStyles.thCenter}`}>Thao tác</th>
            </tr>
          </thead>
          <tbody className={excelPortalStyles.tbody}>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                </td>
              </tr>
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Không có hóa đơn nào
                </td>
              </tr>
            ) : (
              filteredInvoices.map(invoice => {
                const dueInfo = CustomerPortalEngine.getDaysUntilDue(invoice.dueDate);

                return (
                  <tr key={invoice.id} className={excelPortalStyles.tr}>
                    <td className={excelPortalStyles.td}>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(invoice.status)}
                        <span className="font-medium">{invoice.invoiceNumber}</span>
                      </div>
                    </td>
                    <td className={excelPortalStyles.td}>
                      <Link href={`/customer/orders/${invoice.soId}`} className="text-[#217346] dark:text-[#70AD47] hover:underline font-medium">
                        {invoice.soNumber}
                      </Link>
                    </td>
                    <td className={`${excelPortalStyles.td} ${excelPortalStyles.tdMono} text-slate-500`}>
                      {new Date(invoice.invoiceDate).toLocaleDateString('vi-VN')}
                    </td>
                    <td className={excelPortalStyles.td}>
                      <div className={`text-sm ${
                        dueInfo.status === 'OVERDUE' ? 'text-red-600' :
                        dueInfo.status === 'DUE_SOON' ? 'text-yellow-600' : 'text-slate-500'
                      }`}>
                        {new Date(invoice.dueDate).toLocaleDateString('vi-VN')}
                        {dueInfo.status === 'OVERDUE' && (
                          <span className="block text-xs">Quá hạn {Math.abs(dueInfo.days)} ngày</span>
                        )}
                        {dueInfo.status === 'DUE_SOON' && (
                          <span className="block text-xs">Còn {dueInfo.days} ngày</span>
                        )}
                      </div>
                    </td>
                    <td className={excelPortalStyles.tdCurrency}>
                      {CustomerPortalEngine.formatCurrency(invoice.total)}
                    </td>
                    <td className={`${excelPortalStyles.td} ${excelPortalStyles.tdRight}`}>
                      <span className={invoice.balance > 0 ? 'text-yellow-600 font-semibold' : 'text-green-600'}>
                        {CustomerPortalEngine.formatCurrency(invoice.balance)}
                      </span>
                    </td>
                    <td className={`${excelPortalStyles.td} ${excelPortalStyles.tdCenter}`}>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${CustomerPortalEngine.getInvoiceStatusColor(invoice.status)}`}>
                        {CustomerPortalEngine.getInvoiceStatusLabel(invoice.status)}
                      </span>
                    </td>
                    <td className={`${excelPortalStyles.td} ${excelPortalStyles.tdCenter}`}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedInvoice(invoice)}
                          className="p-1.5 hover:bg-[#E2EFDA] dark:hover:bg-[#217346]/20 rounded-lg transition-colors"
                          title="Xem chi tiết"
                          aria-label="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4 text-[#217346] dark:text-[#70AD47]" />
                        </button>
                        <button
                          className="p-1.5 hover:bg-[#E2EFDA] dark:hover:bg-[#217346]/20 rounded-lg transition-colors"
                          title="Tải xuống"
                          aria-label="Tải xuống"
                        >
                          <Download className="w-4 h-4 text-[#217346] dark:text-[#70AD47]" />
                        </button>
                        {invoice.balance > 0 && (
                          <button
                            className="p-1.5 hover:bg-[#E2EFDA] dark:hover:bg-[#217346]/20 rounded-lg transition-colors"
                            title="Thanh toán"
                            aria-label="Thanh toán"
                          >
                            <CreditCard className="w-4 h-4 text-[#217346] dark:text-[#70AD47]" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </ExcelPortalTable>

      {/* Payment Info */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6">
        <h3 className="font-semibold mb-4 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Thông tin chuyển khoản
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-emerald-600 dark:text-emerald-400">Tên tài khoản</p>
            <p className="font-medium text-emerald-800 dark:text-emerald-200">CÔNG TY TNHH RTR MANUFACTURING</p>
          </div>
          <div>
            <p className="text-emerald-600 dark:text-emerald-400">Số tài khoản</p>
            <p className="font-medium text-emerald-800 dark:text-emerald-200 font-mono">0123456789123</p>
          </div>
          <div>
            <p className="text-emerald-600 dark:text-emerald-400">Ngân hàng</p>
            <p className="font-medium text-emerald-800 dark:text-emerald-200">Vietcombank - Chi nhánh TP.HCM</p>
          </div>
          <div>
            <p className="text-emerald-600 dark:text-emerald-400">Nội dung chuyển khoản</p>
            <p className="font-medium text-emerald-800 dark:text-emerald-200">[Mã KH] + [Số hóa đơn]</p>
          </div>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold">{selectedInvoice.invoiceNumber}</h3>
                  <p className="text-gray-500">Đơn hàng: {selectedInvoice.soNumber}</p>
                </div>
                <button onClick={() => setSelectedInvoice(null)} aria-label="Đóng">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              {/* Status */}
              <div className="mb-6">
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${CustomerPortalEngine.getInvoiceStatusColor(selectedInvoice.status)}`}>
                  {CustomerPortalEngine.getInvoiceStatusLabel(selectedInvoice.status)}
                </span>
              </div>
              
              {/* Details */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Ngày hóa đơn</p>
                  <p className="font-medium">{new Date(selectedInvoice.invoiceDate).toLocaleDateString('vi-VN')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Hạn thanh toán</p>
                  <p className="font-medium">{new Date(selectedInvoice.dueDate).toLocaleDateString('vi-VN')}</p>
                </div>
                {selectedInvoice.paidDate && (
                  <div>
                    <p className="text-sm text-gray-500">Ngày thanh toán</p>
                    <p className="font-medium text-green-600">{new Date(selectedInvoice.paidDate).toLocaleDateString('vi-VN')}</p>
                  </div>
                )}
                {selectedInvoice.paymentMethod && (
                  <div>
                    <p className="text-sm text-gray-500">Phương thức</p>
                    <p className="font-medium">{selectedInvoice.paymentMethod}</p>
                  </div>
                )}
              </div>
              
              {/* Items */}
              <div className="border-t border-gray-200 dark:border-[rgb(var(--border-primary))] pt-4 mb-4">
                <h4 className="font-medium mb-3">Chi tiết</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-left py-2">Mô tả</th>
                      <th className="text-right py-2">SL</th>
                      <th className="text-right py-2">Đơn giá</th>
                      <th className="text-right py-2">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice?.items?.map(item => (
                      <tr key={item.id}>
                        <td className="py-2">{item.description}</td>
                        <td className="py-2 text-right">{item.quantity}</td>
                        <td className="py-2 text-right">{item.unitPrice.toLocaleString('vi-VN')}</td>
                        <td className="py-2 text-right">{item.amount.toLocaleString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-200 dark:border-[rgb(var(--border-primary))]">
                    <tr>
                      <td colSpan={3} className="pt-2 text-right text-gray-500">Tạm tính:</td>
                      <td className="pt-2 text-right">{selectedInvoice.subtotal.toLocaleString('vi-VN')}</td>
                    </tr>
                    {selectedInvoice.discount > 0 && (
                      <tr>
                        <td colSpan={3} className="text-right text-gray-500">Chiết khấu:</td>
                        <td className="text-right text-red-500">-{selectedInvoice.discount.toLocaleString('vi-VN')}</td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={3} className="text-right text-gray-500">VAT (10%):</td>
                      <td className="text-right">{selectedInvoice.tax.toLocaleString('vi-VN')}</td>
                    </tr>
                    <tr className="font-semibold text-lg">
                      <td colSpan={3} className="pt-2 text-right">Tổng cộng:</td>
                      <td className="pt-2 text-right text-emerald-600">{selectedInvoice.total.toLocaleString('vi-VN')} ₫</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="text-right text-gray-500">Đã thanh toán:</td>
                      <td className="text-right text-green-600">{selectedInvoice.paidAmount.toLocaleString('vi-VN')}</td>
                    </tr>
                    <tr className="font-semibold">
                      <td colSpan={3} className="text-right">Còn nợ:</td>
                      <td className={`text-right ${selectedInvoice.balance > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {selectedInvoice.balance.toLocaleString('vi-VN')} ₫
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-[rgb(var(--border-primary))] flex justify-end gap-3">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-[rgb(var(--sidebar-item-hover))] rounded-xl"
              >
                Đóng
              </button>
              <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-[rgb(var(--sidebar-item-hover))] rounded-xl flex items-center gap-2">
                <Download className="w-4 h-4" />
                Tải PDF
              </button>
              {selectedInvoice.balance > 0 && (
                <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Thanh toán ngay
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
