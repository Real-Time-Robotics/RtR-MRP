'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calculator,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useSalesOrdersForMRP,
  useMRPCalculation,
} from '@/lib/hooks/use-mrp-data';

// Import sub-components
import { StepIndicator, steps } from './wizard/step-indicator';
import { Step1OrderSelection } from './wizard/step1-order-selection';
import { Step2Calculation } from './wizard/step2-calculation';
import { Step3Results } from './wizard/step3-results';
import { Step4Suggestions } from './wizard/step4-suggestions';

// =============================================================================
// MAIN WIZARD COMPONENT
// =============================================================================

export default function MRPWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const { orders, isLoading: ordersLoading } = useSalesOrdersForMRP();
  const { result: mrpResult, isCalculating, runMRP, reset } = useMRPCalculation();

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1:
        return selectedOrderIds.length > 0;
      case 2:
        return mrpResult !== null;
      case 3:
        return true;
      default:
        return false;
    }
  }, [currentStep, selectedOrderIds, mrpResult]);

  const handleNext = async () => {
    if (currentStep === 2 && !mrpResult) {
      await runMRP(selectedOrderIds);
    }

    setCompletedSteps((prev) => Array.from(new Set([...prev, currentStep])));
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleReset = () => {
    setCurrentStep(1);
    setCompletedSteps([]);
    setSelectedOrderIds([]);
    reset();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-lg shadow-purple-500/30">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MRP Wizard</h1>
            <p className="text-gray-500">Hoạch định nhu cầu vật tư</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Làm lại
        </button>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

      {/* Step Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        {currentStep === 1 && (
          <Step1OrderSelection
            orders={orders}
            selectedIds={selectedOrderIds}
            onSelectionChange={setSelectedOrderIds}
            isLoading={ordersLoading}
          />
        )}

        {currentStep === 2 && (
          <Step2Calculation
            isCalculating={isCalculating}
            selectedCount={selectedOrderIds.length}
            onRun={() => runMRP(selectedOrderIds)}
          />
        )}

        {currentStep === 3 && mrpResult && (
          <Step3Results
            requirements={mrpResult.requirements}
            summary={{
              totalRequirements: mrpResult.totalRequirements,
              criticalItems: mrpResult.criticalItems,
              lowItems: mrpResult.lowItems,
              okItems: mrpResult.okItems,
            }}
          />
        )}

        {currentStep === 4 && mrpResult && (
          <Step4Suggestions
            suggestions={mrpResult.suggestions}
            totalValue={mrpResult.totalPurchaseValue}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
            currentStep === 1
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          <ChevronLeft className="w-5 h-5" />
          Quay lại
        </button>

        <div className="flex items-center gap-2">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => completedSteps.includes(step.id) && setCurrentStep(step.id)}
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-all',
                currentStep === step.id
                  ? 'bg-purple-600 w-8'
                  : completedSteps.includes(step.id)
                  ? 'bg-green-500 cursor-pointer hover:scale-110'
                  : 'bg-gray-300 dark:bg-gray-600'
              )}
            />
          ))}
        </div>

        {currentStep < 4 ? (
          <button
            onClick={handleNext}
            disabled={!canProceed || isCalculating}
            className={cn(
              'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
              canProceed && !isCalculating
                ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/30'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
          >
            {isCalculating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Đang xử lý...
              </>
            ) : currentStep === 2 && !mrpResult ? (
              <>
                Chạy MRP
                <Zap className="w-5 h-5" />
              </>
            ) : (
              <>
                Tiếp tục
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        ) : (
          <Link
            href="/purchasing"
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 shadow-lg shadow-green-500/30 transition-all"
          >
            <CheckCircle className="w-5 h-5" />
            Hoàn tất
          </Link>
        )}
      </div>
    </div>
  );
}
