"use client";

// src/components/excel/import-wizard/step-indicator.tsx
// Wizard Step Indicator Component

import {
  Upload,
  Columns,
  CheckCircle,
  Play,
  FileCheck,
  Check,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImportStep } from "./import-wizard-types";

const STEP_TOOLTIPS: Record<number, string> = {
  1: "Tải lên file Excel hoặc CSV",
  2: "Chọn loại dữ liệu cần import",
  3: "Ghép nối cột file với trường hệ thống",
  4: "Kiểm tra lỗi và dữ liệu trùng lặp",
  5: "Chỉnh sửa dữ liệu trước khi import",
  6: "Xác nhận và thực hiện import",
};

const STEPS: ImportStep[] = [
  { id: 1, name: "Tải file", icon: Upload },
  { id: 2, name: "Chọn loại", icon: FileCheck },
  { id: 3, name: "Mapping cột", icon: Columns },
  { id: 4, name: "Kiểm tra", icon: CheckCircle },
  { id: 5, name: "Chỉnh sửa", icon: Pencil },
  { id: 6, name: "Import", icon: Play },
];

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-2">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isComplete = step.id < currentStep;

          return (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                  isActive && "bg-blue-100 text-blue-700",
                  isComplete && "bg-green-100 text-green-700",
                  !isActive && !isComplete && "text-gray-400"
                )}
                title={STEP_TOOLTIPS[step.id]}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    isActive && "bg-blue-600 text-white",
                    isComplete && "bg-green-600 text-white",
                    !isActive && !isComplete && "bg-gray-200"
                  )}
                >
                  {isComplete ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span className={cn(
                  "text-sm font-medium",
                  isActive ? "block" : "hidden sm:block"
                )}>
                  {step.name}
                </span>
              </div>

              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-8 h-0.5 mx-2",
                    step.id < currentStep ? "bg-green-600" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { STEPS };
