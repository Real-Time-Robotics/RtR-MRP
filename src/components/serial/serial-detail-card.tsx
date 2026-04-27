// src/components/serial/serial-detail-card.tsx — Serial detail display (TIP-S27-08)
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES (matching API response from GET /api/serial/:serial)
// =============================================================================

export interface SerialResponse {
  id: string;
  serial: string;
  status: string;
  source: string;
  notes: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  locationCode: string | null;
  product: { id: string; sku: string; name: string } | null;
  moduleDesign: { id: string; code: string; name: string; version: string; prefix: string } | null;
  part: { id: string; partNumber: string; name: string } | null;
  inventory: { id: string; quantity: number; locationCode: string } | null;
  warehouse: { id: string; code: string; name: string } | null;
  createdByUser: { id: string; name: string; email: string } | null;
  parentLinks: { parentSerial: { id: string; serial: string; status: string } }[];
  childLinks: { childSerial: { id: string; serial: string; status: string } }[];
}

// =============================================================================
// STATUS BADGE
// =============================================================================

const STATUS_COLORS: Record<string, string> = {
  IN_STOCK: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  ALLOCATED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  CONSUMED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  SHIPPED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  SCRAPPED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  RETURNED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-block px-2 py-0.5 text-xs font-semibold font-mono rounded',
      STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'
    )}>
      {status}
    </span>
  );
}

// =============================================================================
// SERIAL DETAIL CARD
// =============================================================================

export function SerialDetailCard({ serial }: { serial: SerialResponse }) {
  const [childrenExpanded, setChildrenExpanded] = useState(false);
  const [metaExpanded, setMetaExpanded] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-steel-dark px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-mono">{serial.serial}</h2>
          <p className="text-sm text-muted-foreground">
            {serial.product?.name || serial.part?.name || 'Unknown product'}
          </p>
        </div>
        <StatusBadge status={serial.status} />
      </div>

      {/* Detail grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-2 text-sm">
          <DetailRow label="Product" value={serial.product ? `${serial.product.sku} — ${serial.product.name}` : '—'} />
          <DetailRow label="Module Design" value={serial.moduleDesign ? `${serial.moduleDesign.code} (${serial.moduleDesign.version})` : '—'} />
          <DetailRow label="Part" value={serial.part ? `${serial.part.partNumber} — ${serial.part.name}` : '—'} />
          <DetailRow label="Source" value={serial.source} />
          <DetailRow label="Created By" value={serial.createdByUser?.name || '—'} />
          <DetailRow label="Created At" value={new Date(serial.createdAt).toLocaleString('vi-VN')} />
        </div>

        {/* Right column */}
        <div className="space-y-2 text-sm">
          <DetailRow label="Warehouse" value={serial.warehouse?.name || '—'} />
          <DetailRow label="Location" value={serial.locationCode || serial.inventory?.locationCode || '—'} />
          <DetailRow label="Notes" value={serial.notes || '—'} />

          {/* Meta JSON collapsible */}
          {serial.meta && Object.keys(serial.meta).length > 0 && (
            <div>
              <button
                onClick={() => setMetaExpanded(!metaExpanded)}
                className="text-xs text-info-cyan hover:underline"
                aria-expanded={metaExpanded}
                aria-label="Toggle metadata"
              >
                {metaExpanded ? 'Ẩn metadata ▲' : 'Xem metadata ▼'}
              </button>
              {metaExpanded && (
                <pre className="mt-1 p-2 bg-gray-50 dark:bg-gunmetal text-[10px] font-mono rounded overflow-x-auto max-h-40">
                  {JSON.stringify(serial.meta, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Parent section */}
      {serial.parentLinks.length > 0 && (
        <div className="border-t px-4 py-3">
          <h3 className="text-sm font-semibold mb-2">Serial cha (Parent)</h3>
          {serial.parentLinks.map((link) => (
            <Link
              key={link.parentSerial.id}
              href={`/search/serial/${link.parentSerial.serial}`}
              className="inline-flex items-center gap-2 text-sm text-info-cyan hover:underline"
            >
              <span className="font-mono">{link.parentSerial.serial}</span>
              <StatusBadge status={link.parentSerial.status} />
            </Link>
          ))}
        </div>
      )}

      {/* Children section */}
      {serial.childLinks.length > 0 && (
        <div className="border-t px-4 py-3">
          <button
            onClick={() => setChildrenExpanded(!childrenExpanded)}
            className="text-sm font-semibold flex items-center gap-1"
            aria-expanded={childrenExpanded}
            aria-label="Toggle children list"
          >
            Serial con ({serial.childLinks.length})
            <span className="text-xs">{childrenExpanded ? '▲' : '▼'}</span>
          </button>
          {childrenExpanded && (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="pb-1 pr-4">Serial</th>
                    <th className="pb-1 pr-4">Status</th>
                    <th className="pb-1">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {serial.childLinks.map((link) => (
                    <tr key={link.childSerial.id} className="border-b last:border-0">
                      <td className="py-1 pr-4 font-mono text-xs">{link.childSerial.serial}</td>
                      <td className="py-1 pr-4"><StatusBadge status={link.childSerial.status} /></td>
                      <td className="py-1">
                        <Link
                          href={`/search/serial/${link.childSerial.serial}`}
                          className="text-xs text-info-cyan hover:underline"
                        >
                          Mở
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
