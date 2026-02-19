'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart as RechartsComposedChart,
} from 'recharts';
import { cn, formatNumber, formatCurrency } from '@/lib/utils';

// =============================================================================
// CHART THEME CONFIGURATION
// =============================================================================

export const chartTheme = {
  colors: {
    primary: ['#30a46c', '#60A5FA', '#93C5FD'],
    palette: ['#30a46c', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'],
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    neutral: '#64748B',
  },
  grid: {
    stroke: '#E2E8F0',
    strokeDasharray: '3 3',
  },
  axis: {
    stroke: '#94A3B8',
    fontSize: 12,
    fontFamily: 'Inter, sans-serif',
  },
  tooltip: {
    background: '#FFFFFF',
    border: '#E2E8F0',
    shadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
};

// =============================================================================
// CHART WRAPPER
// Common wrapper for all charts
// =============================================================================

export interface ChartWrapperProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number | string;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  actions?: React.ReactNode;
  className?: string;
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({
  title,
  subtitle,
  children,
  height = 300,
  loading = false,
  empty = false,
  emptyMessage = 'No data available',
  actions,
  className,
}) => {
  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 p-5', className)}>
      {/* Header */}
      {(title || actions) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Chart content */}
      <div style={{ height: typeof height === 'number' ? `${height}px` : height }}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-500">Loading...</span>
            </div>
          </div>
        ) : empty ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">{emptyMessage}</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// CUSTOM TOOLTIP
// =============================================================================

interface TooltipPayloadEntry {
  color?: string;
  name?: string;
  value?: number;
  payload?: Record<string, unknown>;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  formatter?: (value: number, name: string) => string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  formatter,
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[120px]">
      <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-slate-600">{entry.name}</span>
          </div>
          <span className="text-sm font-semibold text-slate-900 font-mono">
            {formatter ? formatter(entry.value ?? 0, entry.name ?? '') : formatNumber(entry.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// AREA CHART
// =============================================================================

export interface AreaChartProps extends Omit<ChartWrapperProps, 'children'> {
  data: Record<string, unknown>[];
  dataKey: string | string[];
  xAxisKey?: string;
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  gradient?: boolean;
  formatter?: (value: number, name: string) => string;
}

const AreaChart: React.FC<AreaChartProps> = ({
  data,
  dataKey,
  xAxisKey = 'name',
  colors = chartTheme.colors.palette,
  showGrid = true,
  showLegend = false,
  stacked = false,
  gradient = true,
  formatter,
  ...wrapperProps
}) => {
  const dataKeys = Array.isArray(dataKey) ? dataKey : [dataKey];

  return (
    <ChartWrapper empty={!data?.length} {...wrapperProps}>
      <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {dataKeys.map((key, index) => (
            <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors[index % colors.length]} stopOpacity={0.3} />
              <stop offset="100%" stopColor={colors[index % colors.length]} stopOpacity={0.05} />
            </linearGradient>
          ))}
        </defs>
        {showGrid && (
          <CartesianGrid
            strokeDasharray={chartTheme.grid.strokeDasharray}
            stroke={chartTheme.grid.stroke}
            vertical={false}
          />
        )}
        <XAxis
          dataKey={xAxisKey}
          axisLine={false}
          tickLine={false}
          tick={{ fill: chartTheme.axis.stroke, fontSize: chartTheme.axis.fontSize }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: chartTheme.axis.stroke, fontSize: chartTheme.axis.fontSize }}
          tickFormatter={(value) => formatNumber(value)}
        />
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        {showLegend && <Legend />}
        {dataKeys.map((key, index) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[index % colors.length]}
            strokeWidth={2}
            fill={gradient ? `url(#gradient-${key})` : colors[index % colors.length]}
            fillOpacity={gradient ? 1 : 0.1}
            stackId={stacked ? 'stack' : undefined}
          />
        ))}
      </RechartsAreaChart>
    </ChartWrapper>
  );
};

// =============================================================================
// BAR CHART
// =============================================================================

export interface BarChartProps extends Omit<ChartWrapperProps, 'children'> {
  data: Record<string, unknown>[];
  dataKey: string | string[];
  xAxisKey?: string;
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  horizontal?: boolean;
  barSize?: number;
  formatter?: (value: number, name: string) => string;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  dataKey,
  xAxisKey = 'name',
  colors = chartTheme.colors.palette,
  showGrid = true,
  showLegend = false,
  stacked = false,
  horizontal = false,
  barSize = 24,
  formatter,
  ...wrapperProps
}) => {
  const dataKeys = Array.isArray(dataKey) ? dataKey : [dataKey];
  const ChartComponent = horizontal ? RechartsBarChart : RechartsBarChart;

  return (
    <ChartWrapper empty={!data?.length} {...wrapperProps}>
      <ChartComponent
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 10, right: 10, left: horizontal ? 80 : 0, bottom: 0 }}
      >
        {showGrid && (
          <CartesianGrid
            strokeDasharray={chartTheme.grid.strokeDasharray}
            stroke={chartTheme.grid.stroke}
            horizontal={!horizontal}
            vertical={horizontal}
          />
        )}
        {horizontal ? (
          <>
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: chartTheme.axis.stroke, fontSize: chartTheme.axis.fontSize }}
              tickFormatter={(value) => formatNumber(value)}
            />
            <YAxis
              type="category"
              dataKey={xAxisKey}
              axisLine={false}
              tickLine={false}
              tick={{ fill: chartTheme.axis.stroke, fontSize: chartTheme.axis.fontSize }}
              width={70}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xAxisKey}
              axisLine={false}
              tickLine={false}
              tick={{ fill: chartTheme.axis.stroke, fontSize: chartTheme.axis.fontSize }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: chartTheme.axis.stroke, fontSize: chartTheme.axis.fontSize }}
              tickFormatter={(value) => formatNumber(value)}
            />
          </>
        )}
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        {showLegend && <Legend />}
        {dataKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={colors[index % colors.length]}
            radius={[4, 4, 0, 0]}
            barSize={barSize}
            stackId={stacked ? 'stack' : undefined}
          />
        ))}
      </ChartComponent>
    </ChartWrapper>
  );
};

// =============================================================================
// LINE CHART
// =============================================================================

export interface LineChartProps extends Omit<ChartWrapperProps, 'children'> {
  data: Record<string, unknown>[];
  dataKey: string | string[];
  xAxisKey?: string;
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  showDots?: boolean;
  curved?: boolean;
  formatter?: (value: number, name: string) => string;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  dataKey,
  xAxisKey = 'name',
  colors = chartTheme.colors.palette,
  showGrid = true,
  showLegend = false,
  showDots = true,
  curved = true,
  formatter,
  ...wrapperProps
}) => {
  const dataKeys = Array.isArray(dataKey) ? dataKey : [dataKey];

  return (
    <ChartWrapper empty={!data?.length} {...wrapperProps}>
      <RechartsLineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        {showGrid && (
          <CartesianGrid
            strokeDasharray={chartTheme.grid.strokeDasharray}
            stroke={chartTheme.grid.stroke}
            vertical={false}
          />
        )}
        <XAxis
          dataKey={xAxisKey}
          axisLine={false}
          tickLine={false}
          tick={{ fill: chartTheme.axis.stroke, fontSize: chartTheme.axis.fontSize }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: chartTheme.axis.stroke, fontSize: chartTheme.axis.fontSize }}
          tickFormatter={(value) => formatNumber(value)}
        />
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        {showLegend && <Legend />}
        {dataKeys.map((key, index) => (
          <Line
            key={key}
            type={curved ? 'monotone' : 'linear'}
            dataKey={key}
            stroke={colors[index % colors.length]}
            strokeWidth={2}
            dot={showDots ? { fill: colors[index % colors.length], strokeWidth: 2, r: 4 } : false}
            activeDot={{ r: 6, strokeWidth: 2 }}
          />
        ))}
      </RechartsLineChart>
    </ChartWrapper>
  );
};

// =============================================================================
// DONUT/PIE CHART
// =============================================================================

export interface DonutChartProps extends Omit<ChartWrapperProps, 'children'> {
  data: { name: string; value: number; color?: string }[];
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
  showLabels?: boolean;
  showLegend?: boolean;
  centerLabel?: string;
  centerValue?: string | number;
  formatter?: (value: number, name: string) => string;
}

const DonutChart: React.FC<DonutChartProps> = ({
  data,
  colors = chartTheme.colors.palette,
  innerRadius = 60,
  outerRadius = 90,
  showLabels = false,
  showLegend = true,
  centerLabel,
  centerValue,
  formatter,
  ...wrapperProps
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <ChartWrapper empty={!data?.length} {...wrapperProps}>
      <RechartsPieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
          label={showLabels ? ({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%` : false}
          labelLine={showLabels}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || colors[index % colors.length]}
            />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const item = payload[0].payload;
            return (
              <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                <p className="text-sm font-medium text-slate-900">{item.name}</p>
                <p className="text-sm text-slate-600">
                  {formatter ? formatter(item.value, item.name) : formatNumber(item.value)}
                  <span className="text-slate-400 ml-1">
                    ({((item.value / total) * 100).toFixed(1)}%)
                  </span>
                </p>
              </div>
            );
          }}
        />
        {showLegend && (
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            iconType="circle"
            iconSize={8}
          />
        )}
        {/* Center text */}
        {(centerLabel || centerValue) && (
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
            {centerValue && (
              <tspan
                x="50%"
                dy="-0.5em"
                className="text-2xl font-semibold fill-slate-900"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {typeof centerValue === 'number' ? formatNumber(centerValue) : centerValue}
              </tspan>
            )}
            {centerLabel && (
              <tspan
                x="50%"
                dy={centerValue ? '1.5em' : '0'}
                className="text-sm fill-slate-500"
              >
                {centerLabel}
              </tspan>
            )}
          </text>
        )}
      </RechartsPieChart>
    </ChartWrapper>
  );
};

// =============================================================================
// COMPOSED CHART (Mixed Bar + Line)
// =============================================================================

export interface ComposedChartProps extends Omit<ChartWrapperProps, 'children'> {
  data: Record<string, unknown>[];
  xAxisKey?: string;
  barKeys: string[];
  lineKeys: string[];
  barColors?: string[];
  lineColors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  formatter?: (value: number, name: string) => string;
}

const ComposedChart: React.FC<ComposedChartProps> = ({
  data,
  xAxisKey = 'name',
  barKeys,
  lineKeys,
  barColors = ['#30a46c', '#10B981'],
  lineColors = ['#F59E0B', '#EF4444'],
  showGrid = true,
  showLegend = true,
  formatter,
  ...wrapperProps
}) => {
  return (
    <ChartWrapper empty={!data?.length} {...wrapperProps}>
      <RechartsComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        {showGrid && (
          <CartesianGrid
            strokeDasharray={chartTheme.grid.strokeDasharray}
            stroke={chartTheme.grid.stroke}
            vertical={false}
          />
        )}
        <XAxis
          dataKey={xAxisKey}
          axisLine={false}
          tickLine={false}
          tick={{ fill: chartTheme.axis.stroke, fontSize: chartTheme.axis.fontSize }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: chartTheme.axis.stroke, fontSize: chartTheme.axis.fontSize }}
          tickFormatter={(value) => formatNumber(value)}
        />
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        {showLegend && <Legend />}
        {barKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={barColors[index % barColors.length]}
            radius={[4, 4, 0, 0]}
            barSize={24}
          />
        ))}
        {lineKeys.map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={lineColors[index % lineColors.length]}
            strokeWidth={2}
            dot={{ fill: lineColors[index % lineColors.length], strokeWidth: 2, r: 4 }}
          />
        ))}
      </RechartsComposedChart>
    </ChartWrapper>
  );
};

// =============================================================================
// MINI SPARKLINE
// =============================================================================

export interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  showArea?: boolean;
  className?: string;
}

const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = '#30a46c',
  width = 100,
  height = 30,
  showArea = true,
  className,
}) => {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      preserveAspectRatio="none"
    >
      {showArea && (
        <polygon
          points={areaPoints}
          fill={color}
          fillOpacity="0.1"
        />
      )}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={width - padding}
        cy={height - padding - ((data[data.length - 1] - min) / range) * (height - padding * 2)}
        r="3"
        fill={color}
      />
    </svg>
  );
};

// =============================================================================
// EXPORTS
// =============================================================================

export {
  ChartWrapper,
  AreaChart,
  BarChart,
  LineChart,
  DonutChart,
  ComposedChart,
  Sparkline,
  CustomTooltip,
};
