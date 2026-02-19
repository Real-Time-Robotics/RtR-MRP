'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle,
  Download,
  Plus,
  Building2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, getPriorityLabel } from '@/lib/hooks/use-mrp-data';
import type { Step4Props, PurchaseSuggestion } from './wizard-types';

export function Step4Suggestions({ suggestions, totalValue }: Step4Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>(suggestions.map((s) => s.id));

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedSuggestions = suggestions.filter((s) => selectedIds.includes(s.id));
  const selectedValue = selectedSuggestions.reduce((sum, s) => sum + s.totalCost, 0);

  // Group by supplier
  const bySupplier = useMemo(() => {
    const grouped: Record<string, PurchaseSuggestion[]> = {};
    selectedSuggestions.forEach((s) => {
      if (!grouped[s.supplierName]) {
        grouped[s.supplierName] = [];
      }
      grouped[s.supplierName].push(s);
    });
    return grouped;
  }, [selectedSuggestions]);

  const priorityConfig = {
    URGENT: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
    HIGH: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
    NORMAL: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-5 border border-purple-200 dark:border-purple-800">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Tổng đề xuất mua hàng</p>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(selectedValue)}</p>
          <p className="text-sm text-gray-500">{selectedIds.length} / {suggestions.length} items đã chọn</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
            <Plus className="w-4 h-4" />
            Tạo PO
          </button>
        </div>
      </div>

      {/* Grouped by Supplier */}
      {Object.entries(bySupplier).map(([supplier, items]) => {
        const supplierTotal = items.reduce((sum, i) => sum + i.totalCost, 0);
        return (
          <div key={supplier} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-500" />
                <span className="font-semibold text-gray-900 dark:text-white">{supplier}</span>
                <span className="text-sm text-gray-500">({items.length} items)</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(supplierTotal)}</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((item) => {
                const pConfig = priorityConfig[item.priority];
                return (
                  <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => handleToggle(item.id)}
                      aria-label={`Chọn ${item.partNumber}`}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-gray-900 dark:text-white">{item.partNumber}</span>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', pConfig.bg, pConfig.text)}>
                          {getPriorityLabel(item.priority)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{item.partName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.quantity} {item.unit}
                      </p>
                      <p className="text-sm text-gray-500">@ {formatCurrency(item.unitCost)}</p>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(item.totalCost)}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>Lead: {item.leadTime} ngày</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {suggestions.length === 0 && (
        <div className="py-12 text-center">
          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
          <p className="text-gray-500">Không có đề xuất mua hàng - Tất cả vật tư đều đủ!</p>
        </div>
      )}
    </div>
  );
}
