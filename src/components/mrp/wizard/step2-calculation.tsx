'use client';

import React, { useState } from 'react';
import {
  Calculator,
  Loader2,
  Zap,
  Info,
} from 'lucide-react';
import type { Step2Props } from './wizard-types';

export function Step2Calculation({ isCalculating, selectedCount, onRun }: Step2Props) {
  const [progress, setProgress] = useState(0);

  React.useEffect(() => {
    if (isCalculating) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + Math.random() * 15, 95));
      }, 200);
      return () => clearInterval(interval);
    } else {
      setProgress(100);
    }
  }, [isCalculating]);

  return (
    <div className="max-w-xl mx-auto py-12 text-center">
      {isCalculating ? (
        <>
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Calculator className="w-12 h-12 text-white animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Đang tính toán MRP...
          </h3>
          <p className="text-gray-500 mb-6">
            Phân tích BOM và tính toán nhu cầu vật tư cho {selectedCount} đơn hàng
          </p>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang xử lý...
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
        </>
      ) : (
        <>
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 flex items-center justify-center">
            <Zap className="w-12 h-12 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Sẵn sàng chạy MRP
          </h3>
          <p className="text-gray-500 mb-6">
            Đã chọn <span className="font-semibold text-purple-600">{selectedCount}</span> đơn hàng để hoạch định
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">MRP sẽ thực hiện:</p>
                <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                  <li>{'\u2022'} Phân tích BOM cho tất cả sản phẩm</li>
                  <li>{'\u2022'} Tính toán nhu cầu nguyên vật liệu</li>
                  <li>{'\u2022'} So sánh với tồn kho hiện tại</li>
                  <li>{'\u2022'} Tạo đề xuất mua hàng</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={onRun}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-200 flex items-center gap-2 mx-auto"
          >
            <Calculator className="w-5 h-5" />
            Chạy MRP
          </button>
        </>
      )}
    </div>
  );
}
