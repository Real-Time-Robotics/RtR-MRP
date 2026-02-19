'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { clientLogger } from '@/lib/client-logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    clientLogger.error('Page error', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Có lỗi xảy ra!
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
        {error.message}
      </p>
      <button
        onClick={reset}
        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        Thử lại
      </button>
    </div>
  );
}
