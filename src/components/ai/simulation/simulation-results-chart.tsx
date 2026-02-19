'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts';

interface TimelinePoint {
  week: number;
  date: string;
  demand: number;
  supply: number;
  inventory: number;
  capacityUsed: number;
  capacityAvailable: number;
  stockouts: number;
}

interface SimulationResultsChartProps {
  timeline: TimelinePoint[];
  baseline?: {
    demand: number;
    supply: number;
    inventory: number;
    capacity: number;
  };
  title?: string;
  description?: string;
}

export function SimulationResultsChart({
  timeline,
  baseline,
  title = 'Simulation Timeline',
  description = 'Week-by-week projection of key metrics',
}: SimulationResultsChartProps) {
  const chartData = useMemo(() => {
    return timeline.map((point) => ({
      ...point,
      capacityUtilization: point.capacityAvailable > 0
        ? Math.round((point.capacityUsed / point.capacityAvailable) * 100)
        : 0,
      inventoryDays: point.demand > 0
        ? Math.round((point.inventory / (point.demand / 7)) * 10) / 10
        : 0,
      shortLabel: `W${point.week}`,
    }));
  }, [timeline]);

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: { name: string; value: number; color: string }, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatNumber(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="supply-demand" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="supply-demand">Supply & Demand</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="capacity">Capacity</TabsTrigger>
            <TabsTrigger value="stockouts">Stockouts</TabsTrigger>
          </TabsList>

          {/* Supply & Demand Chart */}
          <TabsContent value="supply-demand">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tickFormatter={formatNumber}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {baseline && (
                  <ReferenceLine
                    y={baseline.demand}
                    stroke="#94a3b8"
                    strokeDasharray="5 5"
                    label={{ value: 'Baseline Demand', position: 'right', fontSize: 10 }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="demand"
                  stroke="#30a46c"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Demand"
                />
                <Line
                  type="monotone"
                  dataKey="supply"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Supply"
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Inventory Chart */}
          <TabsContent value="inventory">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tickFormatter={formatNumber}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {baseline && (
                  <ReferenceLine
                    y={baseline.inventory}
                    stroke="#94a3b8"
                    strokeDasharray="5 5"
                    label={{ value: 'Baseline', position: 'right', fontSize: 10 }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="inventory"
                  stroke="#8b5cf6"
                  fill="#8b5cf680"
                  strokeWidth={2}
                  name="Inventory Level"
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Capacity Chart */}
          <TabsContent value="capacity">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  domain={[0, 120]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <ReferenceLine
                  y={100}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{ value: 'Max Capacity', position: 'right', fontSize: 10 }}
                />
                <Bar
                  dataKey="capacityUtilization"
                  fill="#f59e0b"
                  name="Capacity Utilization %"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Stockouts Chart */}
          <TabsContent value="stockouts">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tickFormatter={formatNumber}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="stockouts"
                  fill="#ef4444"
                  name="Stockout Units"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
