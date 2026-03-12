'use client';

import { Lightbulb } from 'lucide-react';

interface NextStepHintProps {
  hint: string;
}

export function NextStepHint({ hint }: NextStepHintProps) {
  return (
    <div className="mt-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-2">
      <Lightbulb className="w-4 h-4 text-blue-500 flex-shrink-0" />
      <span className="text-sm text-blue-700 dark:text-blue-300">
        <strong>Buoc tiep theo:</strong> {hint}
      </span>
    </div>
  );
}
