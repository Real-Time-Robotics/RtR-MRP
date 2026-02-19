'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// =============================================================================
// LAZY-LOADED CHART COMPONENTS
// Recharts (~500KB) is dynamically imported to reduce initial bundle size.
// The actual implementations live in charts-impl.tsx.
// =============================================================================

// Loading placeholder for charts
const ChartLoading = ({ height = 300 }: { height?: number }) => (
  <div
    className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl animate-pulse"
    style={{ height }}
  >
    <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
  </div>
);

// Dynamic imports with SSR disabled for recharts-dependent components
const AreaChart = dynamic(
  () => import('./charts-impl').then(mod => mod.AreaChart),
  { ssr: false, loading: () => <ChartLoading /> }
);

const BarChart = dynamic(
  () => import('./charts-impl').then(mod => mod.BarChart),
  { ssr: false, loading: () => <ChartLoading /> }
);

const LineChart = dynamic(
  () => import('./charts-impl').then(mod => mod.LineChart),
  { ssr: false, loading: () => <ChartLoading /> }
);

const DonutChart = dynamic(
  () => import('./charts-impl').then(mod => mod.DonutChart),
  { ssr: false, loading: () => <ChartLoading /> }
);

const ComposedChart = dynamic(
  () => import('./charts-impl').then(mod => mod.ComposedChart),
  { ssr: false, loading: () => <ChartLoading /> }
);

// Static exports (no recharts dependency)
export { ChartWrapper, chartTheme, Sparkline, CustomTooltip } from './charts-impl';
export type { ChartWrapperProps, AreaChartProps, BarChartProps, LineChartProps, DonutChartProps, ComposedChartProps, SparklineProps } from './charts-impl';

export {
  AreaChart,
  BarChart,
  LineChart,
  DonutChart,
  ComposedChart,
};
