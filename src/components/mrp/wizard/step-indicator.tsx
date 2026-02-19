'use client';

import React from 'react';
import {
  Calculator,
  Check,
  ShoppingCart,
  FileText,
  Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Step, StepIndicatorProps } from './wizard-types';

const steps: Step[] = [
  { id: 1, title: 'Chọn đơn hàng', description: 'Chọn SO cần hoạch định', icon: <ShoppingCart className="w-5 h-5" /> },
  { id: 2, title: 'Chạy MRP', description: 'Tính toán nhu cầu vật tư', icon: <Calculator className="w-5 h-5" /> },
  { id: 3, title: 'Kết quả', description: 'Xem nhu cầu và thiếu hụt', icon: <FileText className="w-5 h-5" /> },
  { id: 4, title: 'Đề xuất mua', description: 'Tạo đề xuất mua hàng', icon: <Truck className="w-5 h-5" /> },
];

export { steps };

export function StepIndicator({ currentStep, completedSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = currentStep === step.id;

        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300',
                  isCompleted
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                    : isCurrent
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 scale-110'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                )}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : step.icon}
              </div>
              <div className="hidden sm:block">
                <p className={cn(
                  'font-semibold text-sm',
                  isCurrent ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'
                )}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                'flex-1 h-1 mx-4 rounded-full transition-colors duration-300',
                completedSteps.includes(step.id) ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
