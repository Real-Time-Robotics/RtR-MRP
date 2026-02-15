export default function Loading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-60 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-white/5 rounded animate-pulse" />
          <div className="h-9 w-32 bg-white/5 rounded animate-pulse" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/[0.025] border border-white/[0.06] rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
              <div className="h-5 w-5 bg-white/5 rounded animate-pulse" />
            </div>
            <div className="h-8 w-28 bg-white/5 rounded animate-pulse" />
            <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-64 bg-white/5 rounded animate-pulse" />
        <div className="h-9 w-32 bg-white/5 rounded animate-pulse" />
        <div className="h-9 w-32 bg-white/5 rounded animate-pulse" />
        <div className="h-9 w-24 bg-white/5 rounded animate-pulse ml-auto" />
      </div>

      {/* Inventory table */}
      <div className="bg-white/[0.025] border border-white/[0.06] rounded-lg">
        {/* Table header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-white/[0.06] bg-white/[0.015]">
          <div className="h-4 w-4 bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-36 bg-white/5 rounded animate-pulse flex-1" />
          <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
        </div>

        {/* Table rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-white/[0.04]">
            <div className="h-4 w-4 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-36 bg-white/5 rounded animate-pulse flex-1" />
            <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
            <div className="h-5 w-20 bg-white/5 rounded-full animate-pulse" />
            <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
          </div>
        ))}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="h-4 w-40 bg-white/5 rounded animate-pulse" />
          <div className="flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-8 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
