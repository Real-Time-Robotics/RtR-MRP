// =============================================================================
// MOBILE LOADING
// =============================================================================

'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export function MobileLoading({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  );
}
