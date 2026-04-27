// /dashboard/operations/assembly/:id — Assembly Order detail + scan (TIP-S27-07)
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

interface BomLineProgress {
  bomLineId: string;
  partId: string;
  required: number;
  scanned: number;
}

interface AODetail {
  ao: {
    id: string;
    aoNumber: string;
    status: string;
    targetQuantity: number;
    product: { name: string; sku: string };
    bomHeader: { bomLines: { id: string; partId: string; quantity: number; part: { name: string; partNumber: string } }[] };
    parentSerial: { serial: string } | null;
    assignedToUser: { name: string } | null;
  };
  scannedByBomLine: BomLineProgress[];
  childSerials: { childSerial: { serial: string; status: string } }[];
}

export default function AssemblyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AODetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanInput, setScanInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completedSerial, setCompletedSerial] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/assembly/${id}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!scanInput.trim()) return;
    setScanning(true);
    try {
      const res = await fetch(`/api/assembly/${id}/scan-child`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ childSerial: scanInput.trim() }),
      });
      const body = await res.json();
      if (res.ok) {
        toast.success(`Serial ${scanInput.trim()} đã quét thành công`);
        setScanInput('');
        fetchDetail();
      } else {
        const reasons: Record<string, string> = {
          NOT_FOUND: 'Không tìm thấy serial',
          NOT_IN_STOCK: 'Serial không ở trạng thái IN_STOCK',
          NOT_IN_BOM: 'Serial không thuộc BOM',
          ALREADY_USED: 'Serial đã dùng ở AO khác',
          CONFLICT: 'Serial vừa được dùng bởi AO khác',
        };
        toast.error(reasons[body.reason] || body.error || 'Lỗi quét serial');
      }
    } catch {
      toast.error('Lỗi kết nối');
    }
    setScanning(false);
    inputRef.current?.focus();
  }

  async function handleUnscan(serial: string) {
    const res = await fetch(`/api/assembly/${id}/unscan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ childSerial: serial }),
    });
    if (res.ok) {
      toast.success(`Đã bỏ quét ${serial}`);
      fetchDetail();
    }
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      const res = await fetch(`/api/assembly/${id}/complete`, { method: 'POST' });
      const body = await res.json();
      if (res.ok) {
        setCompletedSerial(body.parentSerial);
        toast.success('Lắp ráp hoàn thành!');
        fetchDetail();
      } else {
        toast.error(body.error || 'Lỗi hoàn thành');
      }
    } catch {
      toast.error('Lỗi kết nối');
    }
    setCompleting(false);
  }

  async function handleCancel() {
    if (!confirm('Bạn chắc chắn muốn huỷ AO này?')) return;
    const res = await fetch(`/api/assembly/${id}/cancel`, { method: 'POST' });
    if (res.ok) {
      toast.success('AO đã huỷ');
      fetchDetail();
    }
  }

  if (loading) return <div className="p-4 text-sm text-muted-foreground animate-pulse">Đang tải...</div>;
  if (!data) return <div className="p-4 text-sm text-red-500">Không tìm thấy Assembly Order</div>;

  const ao = data.ao;
  const progress = data.scannedByBomLine;
  const totalScanned = progress.reduce((s, b) => s + b.scanned, 0);
  const totalRequired = progress.reduce((s, b) => s + b.required, 0);
  const allScanned = totalScanned >= totalRequired && totalRequired > 0;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/operations/assembly" className="text-xs text-info-cyan hover:underline">← Danh sách AO</Link>
          <h1 className="text-xl font-bold">{ao.aoNumber}</h1>
          <p className="text-sm text-muted-foreground">{ao.product?.name} · Qty: {ao.targetQuantity}</p>
        </div>
        <span className={`px-3 py-1 text-xs font-bold rounded ${
          ao.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
          ao.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
          ao.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-600'
        }`}>
          {ao.status}
        </span>
      </div>

      {/* BOM Required */}
      <div className="border rounded-lg mb-4">
        <div className="px-4 py-2 bg-gray-50 dark:bg-steel-dark font-semibold text-sm">BOM Required</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b">
              <th className="px-4 pb-1">Component</th>
              <th className="px-4 pb-1">Required</th>
              <th className="px-4 pb-1">Scanned</th>
              <th className="px-4 pb-1">Progress</th>
            </tr>
          </thead>
          <tbody>
            {progress.map((line) => {
              const bomLine = ao.bomHeader.bomLines.find((bl) => bl.id === line.bomLineId);
              return (
                <tr key={line.bomLineId} className="border-b last:border-0">
                  <td className="px-4 py-1.5 text-xs">{bomLine?.part?.name || line.partId}</td>
                  <td className="px-4 py-1.5">{line.required}</td>
                  <td className="px-4 py-1.5">{line.scanned}</td>
                  <td className="px-4 py-1.5">
                    <div className="w-24 h-2 bg-gray-200 dark:bg-mrp-border rounded overflow-hidden">
                      <div
                        className="h-full bg-info-cyan transition-all"
                        style={{ width: `${Math.min(100, (line.scanned / line.required) * 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Scan section */}
      {ao.status === 'IN_PROGRESS' && (
        <div className="border rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-sm mb-2">Quét child serial</h3>
          <form onSubmit={handleScan} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Quét hoặc nhập serial..."
              autoFocus
              className="flex-1 px-3 py-2 border rounded text-sm font-mono dark:bg-gunmetal dark:border-mrp-border"
              aria-label="Child serial input"
            />
            <button
              type="submit"
              disabled={scanning || !scanInput.trim()}
              className="px-4 py-2 text-sm bg-info-cyan text-white rounded hover:bg-info-cyan/90 disabled:opacity-50"
            >
              {scanning ? '...' : 'Quét'}
            </button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            Đã quét: {totalScanned}/{totalRequired}
          </p>
        </div>
      )}

      {/* Completed children list */}
      {ao.status === 'COMPLETED' && data.childSerials.length > 0 && (
        <div className="border rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-sm mb-2">Serial con đã lắp</h3>
          <div className="space-y-1">
            {data.childSerials.map((cs) => (
              <div key={cs.childSerial.serial} className="text-xs font-mono flex items-center gap-2">
                <span>{cs.childSerial.serial}</span>
                <span className="px-1 py-0.5 text-[9px] bg-purple-100 text-purple-800 rounded">{cs.childSerial.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {ao.status === 'IN_PROGRESS' && (
          <>
            <button
              onClick={handleComplete}
              disabled={!allScanned || completing}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {completing ? 'Đang xử lý...' : 'Hoàn thành lắp ráp'}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
            >
              Huỷ AO
            </button>
          </>
        )}
      </div>

      {/* Completed serial modal */}
      {completedSerial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-steel-dark rounded-lg p-6 w-96 text-center">
            <h2 className="text-lg font-bold mb-2 text-green-600">Lắp ráp hoàn thành!</h2>
            <p className="text-sm mb-1">EBOX serial sinh ra:</p>
            <p className="text-xl font-mono font-bold mb-4">{completedSerial}</p>
            <div className="flex gap-2 justify-center">
              <Link
                href={`/search/serial/${completedSerial}`}
                className="px-4 py-2 text-sm bg-info-cyan text-white rounded hover:bg-info-cyan/90"
              >
                Xem serial
              </Link>
              <button
                onClick={() => setCompletedSerial(null)}
                className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
