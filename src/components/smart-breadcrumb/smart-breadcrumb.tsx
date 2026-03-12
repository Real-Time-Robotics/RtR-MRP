'use client';

import { useMemo } from 'react';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { WorkflowProgress } from './workflow-progress';
import { NextStepHint } from './next-step-hint';
import { getWorkflowDefinition } from '@/lib/workflow/workflow-definitions';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface SmartBreadcrumbProps {
  items: BreadcrumbItem[];
  entityType?: string;
  entityData?: Record<string, unknown>;
  showProgress?: boolean;
}

export function SmartBreadcrumb({
  items,
  entityType,
  entityData,
  showProgress = true,
}: SmartBreadcrumbProps) {
  const workflow = useMemo(() => {
    if (!entityType || !showProgress) return null;
    return getWorkflowDefinition(entityType);
  }, [entityType, showProgress]);

  const currentStep = useMemo(() => {
    if (!workflow || !entityData) return 1;
    return workflow.detectCurrentStep(entityData);
  }, [workflow, entityData]);

  const nextStepHint = useMemo(() => {
    if (!workflow || !entityData) return null;
    return workflow.getNextStepHint(entityData, currentStep);
  }, [workflow, entityData, currentStep]);

  return (
    <div className="bg-card rounded-lg border p-4 mb-4">
      {/* Breadcrumb trail */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
        <Link href="/" className="hover:text-primary transition-colors">
          <Home className="w-4 h-4" />
        </Link>
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-1">
            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
            {item.href ? (
              <Link href={item.href} className="hover:text-primary transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{item.label}</span>
            )}
          </div>
        ))}
      </nav>

      {/* Workflow progress */}
      {workflow && showProgress && (
        <>
          <WorkflowProgress steps={workflow.steps} currentStep={currentStep} />
          {nextStepHint && <NextStepHint hint={nextStepHint} />}
        </>
      )}
    </div>
  );
}
