export default function Loading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-72 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="h-9 w-32 bg-white/5 rounded animate-pulse" />
      </div>

      {/* KPI stat cards (6 cards, 3 per row on desktop) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white/[0.025] border border-white/[0.06] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
              <div className="h-5 w-5 bg-white/5 rounded animate-pulse" />
            </div>
            <div className="h-7 w-20 bg-white/5 rounded animate-pulse" />
            <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Main content: Work Orders + Alerts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Work Orders table (2/3 width) */}
        <div className="lg:col-span-2 bg-white/[0.025] border border-white/[0.06] rounded-lg">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="h-5 w-36 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-white/[0.04]">
              <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
              <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
              <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
              <div className="h-2 flex-1 bg-white/5 rounded animate-pulse" />
              <div className="h-5 w-16 bg-white/5 rounded-full animate-pulse" />
            </div>
          ))}
        </div>

        {/* Alerts panel (1/3 width) */}
        <div className="bg-white/[0.025] border border-white/[0.06] rounded-lg">
          <div className="p-4 border-b border-white/[0.06]">
            <div className="h-5 w-20 bg-white/5 rounded animate-pulse" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3 border-b border-white/[0.04] space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-white/5 rounded-full animate-pulse" />
                <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
              </div>
              <div className="h-3 w-16 bg-white/5 rounded animate-pulse ml-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
