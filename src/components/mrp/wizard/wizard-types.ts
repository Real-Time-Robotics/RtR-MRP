import React from 'react';
import type {
  SalesOrderForMRP,
  MRPRequirement,
  PurchaseSuggestion,
} from '@/lib/hooks/use-mrp-data';

// Re-export types used by wizard steps
export type { SalesOrderForMRP, MRPRequirement, PurchaseSuggestion };

export interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export interface StepIndicatorProps {
  currentStep: number;
  completedSteps: number[];
}

export interface Step1Props {
  orders: SalesOrderForMRP[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  isLoading: boolean;
}

export interface Step2Props {
  isCalculating: boolean;
  selectedCount: number;
  onRun: () => void;
}

export interface Step3Props {
  requirements: MRPRequirement[];
  summary: {
    totalRequirements: number;
    criticalItems: number;
    lowItems: number;
    okItems: number;
  };
}

export interface Step4Props {
  suggestions: PurchaseSuggestion[];
  totalValue: number;
}
