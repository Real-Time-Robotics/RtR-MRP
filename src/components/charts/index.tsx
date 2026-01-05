'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Loading placeholder for charts
const ChartLoading = ({ height = 300 }: { height?: number }) => (
  <div
    className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl animate-pulse"
    style={{ height }}
  >
    <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
  </div>
);

// Dynamic imports with SSR disabled for recharts
export const RTRLineChart = dynamic(
  () => import('./chart-components').then(mod => mod.RTRLineChart),
  { ssr: false, loading: () => <ChartLoading /> }
);

export const RTRBarChart = dynamic(
  () => import('./chart-components').then(mod => mod.RTRBarChart),
  { ssr: false, loading: () => <ChartLoading /> }
);

export const RTRPieChart = dynamic(
  () => import('./chart-components').then(mod => mod.RTRPieChart),
  { ssr: false, loading: () => <ChartLoading /> }
);

export const RTRAreaChart = dynamic(
  () => import('./chart-components').then(mod => mod.RTRAreaChart),
  { ssr: false, loading: () => <ChartLoading /> }
);

export const StatCardWithChart = dynamic(
  () => import('./chart-components').then(mod => mod.StatCardWithChart),
  { ssr: false, loading: () => <ChartLoading height={150} /> }
);

// Static exports (no recharts dependency)
export { ChartContainer, chartColors, statusColors } from './chart-components';
