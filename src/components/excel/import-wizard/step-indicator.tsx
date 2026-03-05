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

const STEPS: ImportStep[] = [
  { id: 1, name: "Tai file", icon: Upload },
  { id: 2, name: "Chon loai", icon: FileCheck },
  { id: 3, name: "Mapping cot", icon: Columns },
  { id: 4, name: "Kiem tra", icon: CheckCircle },
  { id: 5, name: "Chinh sua", icon: Pencil },
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
