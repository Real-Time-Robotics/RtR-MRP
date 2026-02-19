export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div>
        <div className="h-8 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
      </div>

      {/* Profile card skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-6 mb-6">
          <div className="h-20 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div>
            <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>

        {/* Form fields skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-6">
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
