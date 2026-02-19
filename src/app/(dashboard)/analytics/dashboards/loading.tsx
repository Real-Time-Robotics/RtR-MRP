export default function Loading() {
  return (
    <div className="container py-6 space-y-6 animate-pulse">
      {/* Header: title + create button */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-7 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
        </div>
        <div className="h-9 w-36 bg-gray-200 dark:bg-gray-700 rounded-md" />
      </div>

      {/* Filters: search input + sort dropdown */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-md" />
        </div>
        <div className="h-10 w-[180px] bg-gray-200 dark:bg-gray-700 rounded-md" />
      </div>

      {/* Dashboard Card Grid - 1/2/3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 rounded-lg bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-5 w-36 bg-gray-300 dark:bg-gray-600 rounded" />
                <div className="h-5 w-5 bg-gray-300 dark:bg-gray-600 rounded" />
              </div>
              <div className="h-3 w-full bg-gray-300 dark:bg-gray-600 rounded" />
              <div className="h-3 w-2/3 bg-gray-300 dark:bg-gray-600 rounded" />
              <div className="flex items-center gap-2 mt-4">
                <div className="h-5 w-16 bg-gray-300 dark:bg-gray-600 rounded-full" />
                <div className="h-5 w-20 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="h-3 w-24 bg-gray-300 dark:bg-gray-600 rounded" />
                <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
