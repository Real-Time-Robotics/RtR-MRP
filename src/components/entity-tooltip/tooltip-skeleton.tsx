'use client';

export function TooltipSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-4 w-32 bg-muted rounded" />
      <div className="h-3 w-24 bg-muted rounded" />
      <div className="space-y-1.5 mt-2">
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-3/4 bg-muted rounded" />
        <div className="h-3 w-1/2 bg-muted rounded" />
      </div>
    </div>
  );
}
