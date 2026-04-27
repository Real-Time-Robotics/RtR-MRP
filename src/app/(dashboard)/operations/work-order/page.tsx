// /dashboard/operations/work-order — Gia công (TIP-S27-07)
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface WorkOrder {
  id: string;
  woNumber: string;
  status: string;
  quantity: number;
  completedQty: number;
  scrapQty: number;
  product: { id: string; sku: string; name: string };
  assignedTo: string | null;
  createdAt: string;
}

export default function WorkOrderPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [completeDialog, setCompleteDialog] = useState<WorkOrder | null>(null);
  const [completedQty, setCompletedQty] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const fetchWOs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    params.set('limit', '25');
    try {
      const res = await fetch(`/api/production?${params}`);
      if (res.ok) {
        const data = await res.json();
        setWorkOrders(data.data || data.items || data || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchWOs(); }, [fetchWOs]);

  async function handleComplete() {
    if (!completeDialog) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/production/${completeDialog.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED', completedQty }),
      });
      if (res.ok) {
        toast.success(`Đã hoàn thành WO ${completeDialog.woNumber}.`);
        setCompleteDialog(null);
        fetchWOs();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Lỗi khi hoàn thành WO');
      }
    } catch {
      toast.error('Lỗi kết nối');
    }
    setSubmitting(false);
  }

  const openWOs = workOrders.filter((wo) =>
    ['draft', 'in_progress', 'DRAFT', 'IN_PROGRESS'].includes(wo.status)
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Gia công</h1>
          <p className="text-sm text-muted-foreground">{openWOs} WO đang mở</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['', 'draft', 'in_progress', 'completed', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 text-xs font-mono rounded border ${
              statusFilter === s
                ? 'bg-info-cyan text-white border-info-cyan'
                : 'bg-white dark:bg-steel-dark border-gray-200 dark:border-mrp-border hover:bg-gray-50'
            }`}
          >
            {s || 'Tất cả'}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-sm text-muted-foreground animate-pulse p-4">Đang tải...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="pb-2 pr-4">WO Number</th>
                <th className="pb-2 pr-4">Product</th>
                <th className="pb-2 pr-4">Qty</th>
                <th className="pb-2 pr-4">Completed</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Created</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map((wo) => (
                <tr key={wo.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gunmetal">
                  <td className="py-2 pr-4 font-mono text-xs">{wo.woNumber}</td>
                  <td className="py-2 pr-4">{wo.product?.name || '—'}</td>
                  <td className="py-2 pr-4">{wo.quantity}</td>
                  <td className="py-2 pr-4">{wo.completedQty}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      wo.status.toUpperCase() === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      wo.status.toUpperCase() === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      wo.status.toUpperCase() === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {wo.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-xs">{new Date(wo.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="py-2">
                    {['draft', 'in_progress', 'DRAFT', 'IN_PROGRESS'].includes(wo.status) && (
                      <button
                        onClick={() => { setCompleteDialog(wo); setCompletedQty(wo.quantity); }}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Hoàn thành
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {workOrders.length === 0 && (
                <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">Không có WO nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Complete dialog */}
      {completeDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setCompleteDialog(null)}>
          <div className="bg-white dark:bg-steel-dark rounded-lg p-6 w-96 max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2">Hoàn thành WO</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {completeDialog.woNumber} — {completeDialog.product?.name}
            </p>
            <label className="block text-sm font-medium mb-1">Số lượng hoàn thành</label>
            <input
              type="number"
              value={completedQty}
              onChange={(e) => setCompletedQty(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded mb-4 text-sm dark:bg-gunmetal dark:border-mrp-border"
              min={1}
              max={completeDialog.quantity}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setCompleteDialog(null)}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 dark:hover:bg-gunmetal"
              >
                Huỷ
              </button>
              <button
                onClick={handleComplete}
                disabled={submitting}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
