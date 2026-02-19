'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Step3Props } from './wizard-types';

export function Step3Results({ requirements, summary }: Step3Props) {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredRequirements = useMemo(() => {
    if (statusFilter === 'all') return requirements;
    return requirements.filter((r) => r.status === statusFilter);
  }, [requirements, statusFilter]);

  const statusConfig = {
    CRITICAL: { icon: <AlertCircle className="w-4 h-4" />, bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Thiếu nghiêm trọng' },
    LOW: { icon: <AlertTriangle className="w-4 h-4" />, bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Sắp hết' },
    OK: { icon: <CheckCircle className="w-4 h-4" />, bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Đủ hàng' },
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={cn(
            'rounded-xl p-4 border-2 transition-all text-left',
            statusFilter === 'all'
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
          )}
        >
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalRequirements}</p>
          <p className="text-sm text-gray-500">Tổng vật tư</p>
        </button>
        <button
          onClick={() => setStatusFilter('CRITICAL')}
          className={cn(
            'rounded-xl p-4 border-2 transition-all text-left',
            statusFilter === 'CRITICAL'
              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-red-300'
          )}
        >
          <p className="text-2xl font-bold text-red-600">{summary.criticalItems}</p>
          <p className="text-sm text-gray-500">Thiếu nghiêm trọng</p>
        </button>
        <button
          onClick={() => setStatusFilter('LOW')}
          className={cn(
            'rounded-xl p-4 border-2 transition-all text-left',
            statusFilter === 'LOW'
              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-amber-300'
          )}
        >
          <p className="text-2xl font-bold text-amber-600">{summary.lowItems}</p>
          <p className="text-sm text-gray-500">Sắp hết</p>
        </button>
        <button
          onClick={() => setStatusFilter('OK')}
          className={cn(
            'rounded-xl p-4 border-2 transition-all text-left',
            statusFilter === 'OK'
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
          )}
        >
          <p className="text-2xl font-bold text-green-600">{summary.okItems}</p>
          <p className="text-sm text-gray-500">Đủ hàng</p>
        </button>
      </div>

      {/* Requirements Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vật tư</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Nhu cầu</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Tồn kho</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Đang đặt</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Thiếu</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nhà cung cấp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredRequirements.map((req) => {
                const config = statusConfig[req.status];
                return (
                  <tr key={req.partId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-mono font-medium text-gray-900 dark:text-white">{req.partNumber}</p>
                        <p className="text-sm text-gray-500">{req.partName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                      {req.grossRequirement} {req.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                      {req.onHand} {req.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                      {req.onOrder} {req.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn('font-semibold', req.netRequirement > 0 ? 'text-red-600' : 'text-green-600')}>
                        {req.netRequirement > 0 ? `-${req.netRequirement}` : '0'} {req.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium', config.bg, config.text)}>
                        {config.icon}
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Building2 className="w-4 h-4" />
                        <span className="text-sm">{req.supplierName}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formula Explanation */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-sm">
        <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Công thức tính:</p>
        <p className="text-gray-600 dark:text-gray-400">
          <span className="font-mono bg-white dark:bg-gray-700 px-2 py-1 rounded">
            Thiếu = Nhu cầu - Tồn kho - Đang đặt + Safety Stock
          </span>
        </p>
      </div>
    </div>
  );
}
