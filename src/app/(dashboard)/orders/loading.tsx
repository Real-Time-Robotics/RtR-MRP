export default function Loading() {
  return (
    <div className="h-[calc(100vh-4rem)] -m-6 flex overflow-hidden">
      {/* Main Content Area matching SmartLayout */}
      <div className="flex-1 min-w-0 h-full overflow-hidden p-6">
        <div className="h-full flex flex-col gap-3 animate-pulse">
          {/* Header - title + description */}
          <div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-5 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="h-3 w-56 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
          </div>

          {/* Stats Cards - grid-cols-2 md:grid-cols-4 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-2.5 w-20 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
              </div>
            ))}
          </div>

          {/* Table Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Toolbar: search + filters + action buttons */}
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-8 w-52 bg-gray-200 dark:bg-gray-700 rounded-md" />
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-md" />
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-md" />
                <div className="flex-1" />
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-md" />
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-md" />
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-md" />
              </div>
            </div>

            {/* Table header row */}
            <div className="flex items-center gap-0 px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0">
              <div className="w-8 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="w-8 h-3 bg-gray-200 dark:bg-gray-700 rounded ml-2" />
              <div className="w-[120px] h-3 bg-gray-200 dark:bg-gray-700 rounded ml-3" />
              <div className="w-[180px] h-3 bg-gray-200 dark:bg-gray-700 rounded ml-3" />
              <div className="w-[110px] h-3 bg-gray-200 dark:bg-gray-700 rounded ml-3" />
              <div className="w-[100px] h-3 bg-gray-200 dark:bg-gray-700 rounded ml-3" />
              <div className="w-[100px] h-3 bg-gray-200 dark:bg-gray-700 rounded ml-3" />
              <div className="w-[90px] h-3 bg-gray-200 dark:bg-gray-700 rounded ml-3" />
              <div className="w-[120px] h-3 bg-gray-200 dark:bg-gray-700 rounded ml-3" />
            </div>

            {/* Table body rows */}
            <div className="flex-1 overflow-hidden">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex items-center gap-0 px-2 py-2 border-b border-gray-100 dark:border-gray-700/50">
                  <div className="w-8 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="w-8 h-3 bg-gray-100 dark:bg-gray-700/50 rounded ml-2" />
                  <div className="w-[120px] h-3 bg-gray-200 dark:bg-gray-700 rounded ml-3" />
                  <div className="w-[180px]">
                    <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded ml-3" />
                    <div className="h-2.5 w-16 bg-gray-100 dark:bg-gray-700/50 rounded ml-3 mt-0.5" />
                  </div>
                  <div className="w-[110px] h-5 bg-gray-200 dark:bg-gray-700 rounded ml-3" />
                  <div className="w-[100px] h-3 bg-gray-200 dark:bg-gray-700 rounded ml-3" />
                  <div className="w-[100px] h-3 bg-gray-200 dark:bg-gray-700 rounded ml-3" />
                  <div className="w-[90px] h-4 bg-gray-200 dark:bg-gray-700 rounded ml-3" />
                  <div className="w-[120px] h-3 bg-gray-200 dark:bg-gray-700 rounded ml-3" />
                </div>
              ))}
            </div>

            {/* Footer / pagination area */}
            <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
              <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-7 w-7 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
