// /dashboard/operations/assembly — Lắp ráp list (TIP-S27-07)
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface AssemblyOrder {
  id: string;
  aoNumber: string;
  status: string;
  targetQuantity: number;
  productId: string;
  product: { id: string; name: string; sku: string };
  assignedToUser: { name: string } | null;
  createdAt: string;
  parentSerialId: string | null;
}

export default function AssemblyListPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<AssemblyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ productId: '', bomHeaderId: '', targetQuantity: 1 });
  const [creating, setCreating] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    params.set('limit', '25');
    try {
      const res = await fetch(`/api/assembly?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.items || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function handleCreate() {
    if (!createForm.productId) { toast.error('Chọn sản phẩm'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/assembly', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          productId: createForm.productId,
          bomHeaderId: createForm.bomHeaderId || undefined,
          targetQuantity: createForm.targetQuantity,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`AO ${data.ao.aoNumber} đã tạo`);
        setShowCreateDialog(false);
        router.push(`/operations/assembly/${data.ao.id}`);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Lỗi tạo AO');
      }
    } catch {
      toast.error('Lỗi kết nối');
    }
    setCreating(false);
  }

  async function handleStart(ao: AssemblyOrder) {
    const res = await fetch(`/api/assembly/${ao.id}/start`, { method: 'POST' });
    if (res.ok) {
      toast.success(`AO ${ao.aoNumber} đã bắt đầu`);
      fetchOrders();
    } else {
      const err = await res.json();
      toast.error(err.error || 'Lỗi');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Lắp ráp</h1>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-3 py-1.5 text-sm bg-info-cyan text-white rounded hover:bg-info-cyan/90"
        >
          Tạo AO mới
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['', 'DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => (
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
                <th className="pb-2 pr-4">AO Number</th>
                <th className="pb-2 pr-4">Product</th>
                <th className="pb-2 pr-4">Qty</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Assigned</th>
                <th className="pb-2 pr-4">Created</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((ao) => (
                <tr key={ao.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gunmetal">
                  <td className="py-2 pr-4 font-mono text-xs">{ao.aoNumber}</td>
                  <td className="py-2 pr-4">{ao.product?.name || '—'}</td>
                  <td className="py-2 pr-4">{ao.targetQuantity}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      ao.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      ao.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      ao.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {ao.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-xs">{ao.assignedToUser?.name || '—'}</td>
                  <td className="py-2 pr-4 text-xs">{new Date(ao.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="py-2 space-x-1">
                    {ao.status === 'DRAFT' && (
                      <button onClick={() => handleStart(ao)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                        Bắt đầu
                      </button>
                    )}
                    {ao.status === 'IN_PROGRESS' && (
                      <Link href={`/operations/assembly/${ao.id}`} className="px-2 py-1 text-xs bg-info-cyan text-white rounded hover:bg-info-cyan/90">
                        Quét serial
                      </Link>
                    )}
                    {ao.status === 'COMPLETED' && (
                      <Link href={`/operations/assembly/${ao.id}`} className="px-2 py-1 text-xs text-info-cyan hover:underline">
                        Xem chi tiết
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">Không có AO nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateDialog(false)}>
          <div className="bg-white dark:bg-steel-dark rounded-lg p-6 w-96 max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Tạo Assembly Order mới</h2>
            <label className="block text-sm font-medium mb-1">Product ID</label>
            <input
              type="text"
              value={createForm.productId}
              onChange={(e) => setCreateForm({ ...createForm, productId: e.target.value })}
              placeholder="Product ID (CUID)"
              className="w-full px-3 py-2 border rounded mb-3 text-sm dark:bg-gunmetal dark:border-mrp-border"
            />
            <label className="block text-sm font-medium mb-1">BOM Header ID (optional)</label>
            <input
              type="text"
              value={createForm.bomHeaderId}
              onChange={(e) => setCreateForm({ ...createForm, bomHeaderId: e.target.value })}
              placeholder="Auto-pick active BOM nếu bỏ trống"
              className="w-full px-3 py-2 border rounded mb-3 text-sm dark:bg-gunmetal dark:border-mrp-border"
            />
            <label className="block text-sm font-medium mb-1">Số lượng</label>
            <input
              type="number"
              value={createForm.targetQuantity}
              onChange={(e) => setCreateForm({ ...createForm, targetQuantity: parseInt(e.target.value) || 1 })}
              min={1}
              className="w-full px-3 py-2 border rounded mb-4 text-sm dark:bg-gunmetal dark:border-mrp-border"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreateDialog(false)} className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">Huỷ</button>
              <button onClick={handleCreate} disabled={creating} className="px-3 py-1.5 text-sm bg-info-cyan text-white rounded hover:bg-info-cyan/90 disabled:opacity-50">
                {creating ? 'Đang tạo...' : 'Tạo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
