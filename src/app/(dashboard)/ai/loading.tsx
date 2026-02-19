export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* PageHeader: title, description, badges + refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-80 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
        </div>
        <div className="flex items-center gap-4">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-md" />
        </div>
      </div>

      {/* Model Status Cards - 4 columns */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              <div>
                <div className="h-5 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Bar - 3 tabs */}
      <div>
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
          <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded-md" />
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-md" />
          <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded-md" />
        </div>
      </div>

      {/* First Tab Content (ML Real-time): 2-column grid */}
      <div className="space-y-4">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Anomaly Alerts card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
                    <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optimization Suggestions card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 w-44 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
                    <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Links to ML Features - 4 columns */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div>
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
