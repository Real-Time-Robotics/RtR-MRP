export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Back button and header skeleton */}
      <div>
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-4 w-72 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
      </div>

      {/* Form skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <div className="h-6 w-36 bg-gray-200 dark:bg-gray-700 rounded" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-24 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
