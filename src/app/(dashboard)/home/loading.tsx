export default function Loading() {
  return (
    <div className="space-y-3 pb-4 animate-pulse">
      {/* Page Header */}
      <div className="flex items-start sm:items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="h-4 sm:h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 w-64 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
        </div>
        <div className="h-8 w-8 sm:w-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* KPI Cards Row 1 - grid-cols-2 md:grid-cols-4 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 min-h-[72px]">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="h-2.5 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-2.5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* KPI Cards Row 2 - grid-cols-2 md:grid-cols-4 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 min-h-[72px]">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="h-2.5 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid: Production Status (2/3) + Alerts (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Production Status - lg:col-span-2 */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="p-2 space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3 w-14 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                  <div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
                </div>
                <div className="w-20">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="h-2 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-2 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                  <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-5 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="h-3 w-14 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="max-h-[240px]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 sm:p-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                <div className="w-6 h-6 sm:w-5 sm:h-5 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-2.5 w-12 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions (2/3) + Today's Summary (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Quick Actions - lg:col-span-2 */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="p-2 grid grid-cols-2 gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 sm:p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="w-8 h-8 sm:w-7 sm:h-7 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="flex-1 min-w-0">
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Today's Summary */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="p-2 space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                <div className="h-4 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
