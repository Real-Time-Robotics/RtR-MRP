'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';

/**
 * AI Insights page - redirects to main AI dashboard
 * This page exists for backward compatibility with old URLs
 */
export default function AIInsightsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main AI page
    router.replace('/ai');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-4">
          <Sparkles className="w-8 h-8 text-purple-600 animate-pulse" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Đang chuyển hướng...
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Chuyển đến trang AI Insights
        </p>
        <Loader2 className="w-6 h-6 mx-auto text-purple-600 animate-spin" />
      </div>
    </div>
  );
}
