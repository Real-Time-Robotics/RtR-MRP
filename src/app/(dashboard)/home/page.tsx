'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import to isolate any loading issues
const DashboardV2 = dynamic(
  () => import('@/components/pages-v2/dashboard-v2-full'),
  {
    loading: () => (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="grid grid-cols-4 gap-4 mt-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    ),
    ssr: false
  }
);

export default function HomePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Đang tải Dashboard...</div>}>
      <DashboardV2 />
    </Suspense>
  );
}
