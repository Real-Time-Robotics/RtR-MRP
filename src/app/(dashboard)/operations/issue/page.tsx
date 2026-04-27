// /dashboard/operations/issue — Xuất hàng (TIP-S27-07)
'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/serial/serial-detail-card';
import type { SerialResponse } from '@/components/serial/serial-detail-card';

type IssueMode = 'XUAT_CHINH' | 'XUAT_LE';

export default function IssuePage() {
  const [mode, setMode] = useState<IssueMode>('XUAT_CHINH');
  const [serialInput, setSerialInput] = useState('');
  const [serialData, setSerialData] = useState<SerialResponse | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [issuedCount, setIssuedCount] = useState(0);

  async function handleLookup() {
    if (!serialInput.trim()) return;
    setLookupLoading(true);
    setSerialData(null);
    try {
      const res = await fetch(`/api/serial/${encodeURIComponent(serialInput.trim())}`);
      if (res.ok) {
        setSerialData(await res.json());
      } else {
        toast.error('Không tìm thấy serial');
      }
    } catch {
      toast.error('Lỗi kết nối');
    }
    setLookupLoading(false);
  }

  async function shipSerial(serial: string, note: string): Promise<boolean> {
    const res = await fetch(`/api/serial/${encodeURIComponent(serial)}/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'SHIPPED', note }),
    });
    return res.ok;
  }

  async function handleIssue() {
    if (!serialData) return;
    if (!['IN_STOCK', 'ALLOCATED'].includes(serialData.status)) {
      toast.error('Serial không ở trạng thái cho phép xuất');
      return;
    }

    setIssuing(true);
    const noteStr = [destination, notes, mode].filter(Boolean).join(' | ');
    let count = 0;

    try {
      // Ship the main serial
      const ok = await shipSerial(serialData.serial, noteStr);
      if (!ok) {
        toast.error('Lỗi xuất serial chính');
        setIssuing(false);
        return;
      }
      count++;

      // If XUẤT_CHÍNH and has children, ship children too
      if (mode === 'XUAT_CHINH' && serialData.childLinks.length > 0) {
        for (const link of serialData.childLinks) {
          if (['IN_STOCK', 'ALLOCATED'].includes(link.childSerial.status)) {
            const childOk = await shipSerial(link.childSerial.serial, `Cascade from ${serialData.serial} | ${noteStr}`);
            if (childOk) count++;
          }
        }
      }

      setIssuedCount((prev) => prev + count);
      toast.success(`Đã xuất ${count} serial (${mode === 'XUAT_CHINH' ? 'parent + children' : 'lẻ'})`);

      // Reset form
      setSerialData(null);
      setSerialInput('');
      setDestination('');
      setNotes('');
    } catch {
      toast.error('Lỗi kết nối');
    }
    setIssuing(false);
  }

  const canIssue = serialData && ['IN_STOCK', 'ALLOCATED'].includes(serialData.status);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Xuất hàng</h1>
          <p className="text-sm text-muted-foreground">Hôm nay xuất {issuedCount} đơn vị</p>
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('XUAT_CHINH')}
          className={`px-3 py-1.5 text-sm rounded border ${
            mode === 'XUAT_CHINH'
              ? 'bg-info-cyan text-white border-info-cyan'
              : 'border-gray-200 dark:border-mrp-border hover:bg-gray-50'
          }`}
        >
          Xuất chính (EBOX + children)
        </button>
        <button
          onClick={() => setMode('XUAT_LE')}
          className={`px-3 py-1.5 text-sm rounded border ${
            mode === 'XUAT_LE'
              ? 'bg-info-cyan text-white border-info-cyan'
              : 'border-gray-200 dark:border-mrp-border hover:bg-gray-50'
          }`}
        >
          Xuất lẻ
        </button>
      </div>

      {/* Serial lookup */}
      <div className="border rounded-lg p-4 mb-4">
        <label className="block text-sm font-medium mb-1">Quét hoặc nhập serial</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={serialInput}
            onChange={(e) => setSerialInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            placeholder="Serial number..."
            autoFocus
            aria-label="Serial number for issue"
            className="flex-1 px-3 py-2 border rounded text-sm font-mono dark:bg-gunmetal dark:border-mrp-border"
          />
          <button
            onClick={handleLookup}
            disabled={lookupLoading || !serialInput.trim()}
            className="px-4 py-2 text-sm bg-info-cyan text-white rounded hover:bg-info-cyan/90 disabled:opacity-50"
          >
            {lookupLoading ? '...' : 'Tra cứu'}
          </button>
        </div>

        {/* Serial info */}
        {serialData && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gunmetal rounded text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold">{serialData.serial}</span>
              <StatusBadge status={serialData.status} />
            </div>
            <div className="text-xs text-muted-foreground">
              {serialData.product?.name || serialData.part?.name || '—'} · {serialData.source}
            </div>
            {mode === 'XUAT_CHINH' && serialData.childLinks.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Sẽ xuất kèm {serialData.childLinks.length} child serial
              </div>
            )}
            {!canIssue && (
              <div className="text-xs text-red-500 font-semibold">
                Không thể xuất: trạng thái {serialData.status} không hợp lệ
              </div>
            )}
          </div>
        )}
      </div>

      {/* Destination + notes */}
      {serialData && (
        <div className="border rounded-lg p-4 mb-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Khách hàng / Điểm đến</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 border rounded text-sm dark:bg-gunmetal dark:border-mrp-border"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ghi chú</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 border rounded text-sm dark:bg-gunmetal dark:border-mrp-border"
            />
          </div>
        </div>
      )}

      {/* Issue button */}
      {serialData && (
        <button
          onClick={handleIssue}
          disabled={!canIssue || issuing}
          className="px-6 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {issuing ? 'Đang xuất...' : 'Xác nhận xuất'}
        </button>
      )}
    </div>
  );
}
