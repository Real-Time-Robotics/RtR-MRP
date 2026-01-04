'use client';

import { cn } from '@/lib/utils';

// TPM Six Big Losses
export interface SixBigLosses {
  // Availability losses
  breakdownLoss: number;      // Unplanned stops
  setupLoss: number;          // Setup/changeover time

  // Performance losses
  minorStopsLoss: number;     // Small stops < 5 min
  speedLoss: number;          // Reduced speed

  // Quality losses
  startupLoss: number;        // Startup rejects
  defectLoss: number;         // Production rejects
}

interface LossesWaterfallProps {
  losses: SixBigLosses;
  plannedTime: number;
  className?: string;
}

export function LossesWaterfall({ losses, plannedTime, className }: LossesWaterfallProps) {
  const totalLoss = Object.values(losses).reduce((sum, val) => sum + val, 0);
  const valueAddedTime = Math.max(0, plannedTime - totalLoss);

  const lossCategories = [
    {
      category: 'Availability',
      items: [
        { name: 'Equipment Breakdown', value: losses.breakdownLoss, color: 'bg-red-500' },
        { name: 'Setup & Adjustment', value: losses.setupLoss, color: 'bg-red-400' },
      ],
    },
    {
      category: 'Performance',
      items: [
        { name: 'Minor Stops', value: losses.minorStopsLoss, color: 'bg-orange-500' },
        { name: 'Reduced Speed', value: losses.speedLoss, color: 'bg-orange-400' },
      ],
    },
    {
      category: 'Quality',
      items: [
        { name: 'Startup Rejects', value: losses.startupLoss, color: 'bg-yellow-500' },
        { name: 'Production Rejects', value: losses.defectLoss, color: 'bg-yellow-400' },
      ],
    },
  ];

  // Sort all losses for Pareto
  const allLosses = lossCategories.flatMap((cat) =>
    cat.items.map((item) => ({ ...item, category: cat.category }))
  ).sort((a, b) => b.value - a.value);

  const maxValue = Math.max(...allLosses.map((l) => l.value), 1);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-xs text-green-700 dark:text-green-400">Value Added Time</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">
            {valueAddedTime} min
          </p>
        </div>
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-700 dark:text-red-400">Total Loss</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">
            {totalLoss} min
          </p>
        </div>
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-400">Planned Time</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
            {plannedTime} min
          </p>
        </div>
      </div>

      {/* Pareto Chart */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Six Big Losses (Pareto)</h4>
        {allLosses.map((loss, idx) => (
          <div key={loss.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded text-xs flex items-center justify-center bg-gray-200 dark:bg-gray-700 font-medium">
                  {idx + 1}
                </span>
                <span className="text-muted-foreground">{loss.name}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {loss.category}
                </span>
              </div>
              <span className="font-medium">
                {loss.value} min
                {totalLoss > 0 && (
                  <span className="text-muted-foreground ml-1">
                    ({((loss.value / totalLoss) * 100).toFixed(0)}%)
                  </span>
                )}
              </span>
            </div>
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', loss.color)}
                style={{ width: `${(loss.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* By Category */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Loss by Category</h4>
        <div className="grid grid-cols-3 gap-4">
          {lossCategories.map((cat) => {
            const catTotal = cat.items.reduce((sum, item) => sum + item.value, 0);
            return (
              <div
                key={cat.category}
                className="p-3 rounded-lg border bg-gray-50 dark:bg-gray-900"
              >
                <p className="text-sm font-medium mb-2">{cat.category}</p>
                <p className="text-2xl font-bold">{catTotal} min</p>
                <div className="mt-2 space-y-1">
                  {cat.items.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs">
                      <div className={cn('w-2 h-2 rounded-full', item.color)} />
                      <span className="text-muted-foreground flex-1">{item.name}</span>
                      <span>{item.value}m</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface SimpleLossChartProps {
  losses: Array<{ category: string; minutes: number; percentage: number }>;
  className?: string;
}

export function SimpleLossChart({ losses, className }: SimpleLossChartProps) {
  const maxMinutes = Math.max(...losses.map((l) => l.minutes), 1);

  const getBarColor = (idx: number) => {
    switch (idx) {
      case 0: return 'bg-red-500';
      case 1: return 'bg-orange-500';
      case 2: return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {losses.map((loss, idx) => (
        <div key={loss.category} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{loss.category}</span>
            <span className="font-medium">
              {loss.minutes} min ({loss.percentage}%)
            </span>
          </div>
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', getBarColor(idx))}
              style={{ width: `${(loss.minutes / maxMinutes) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
