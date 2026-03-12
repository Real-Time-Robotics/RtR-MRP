'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkflowStep } from '@/lib/workflow/workflow-definitions';

interface WorkflowProgressProps {
  steps: WorkflowStep[];
  currentStep: number;
}

export function WorkflowProgress({ steps, currentStep }: WorkflowProgressProps) {
  return (
    <div className="relative">
      <div className="flex justify-between items-center">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isPending = stepNumber > currentStep;

          return (
            <div key={step.id} className="flex flex-col items-center relative z-10">
              {/* Step indicator */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                  isCompleted && 'bg-green-500 text-white',
                  isCurrent && 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/50',
                  isPending && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : stepNumber}
              </div>

              {/* Step name */}
              <span
                className={cn(
                  'mt-2 text-xs font-medium text-center',
                  isCompleted && 'text-green-600 dark:text-green-400',
                  isCurrent && 'text-blue-600 dark:text-blue-400',
                  isPending && 'text-muted-foreground'
                )}
              >
                {step.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress line */}
      <div className="absolute top-4 left-4 right-4 h-0.5 bg-muted -z-0" style={{ transform: 'translateY(-50%)' }}>
        <div
          className="h-full bg-green-500 transition-all duration-300"
          style={{
            width: steps.length > 1
              ? `${((currentStep - 1) / (steps.length - 1)) * 100}%`
              : '0%',
          }}
        />
      </div>
    </div>
  );
}
