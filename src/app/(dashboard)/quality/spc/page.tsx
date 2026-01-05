'use client';

// =============================================================================
// SPC CONTROL CHARTS PAGE
// Phase 11: Quality Management
// =============================================================================

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Download,
  Filter,
  ChevronDown,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { SPCEngine, ControlChart, ProcessCharacteristic, ChartType } from '@/lib/spc';

// Loading fallback
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );
}

// Simple chart component using SVG
const ControlChartSVG: React.FC<{
  chart: ControlChart;
  height?: number;
}> = ({ chart, height = 300 }) => {
  const width = 800;
  const padding = { top: 40, right: 60, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const { dataPoints, ucl, cl, lcl, usl, lsl } = chart;
  
  if (dataPoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500">Không có dữ liệu</p>
      </div>
    );
  }
  
  const values = dataPoints.map(d => d.primaryValue);
  const minValue = Math.min(...values, lcl, lsl) - (ucl - lcl) * 0.1;
  const maxValue = Math.max(...values, ucl, usl) + (ucl - lcl) * 0.1;
  const valueRange = maxValue - minValue;
  
  const xScale = (index: number) => padding.left + (index / (dataPoints.length - 1 || 1)) * chartWidth;
  const yScale = (value: number) => padding.top + (1 - (value - minValue) / valueRange) * chartHeight;
  
  // Create path for data line
  const linePath = dataPoints
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.primaryValue)}`)
    .join(' ');
  
  // Zone colors
  const sigma = (ucl - cl) / 3;
  const zone1Upper = cl + 2 * sigma;
  const zone1Lower = cl - 2 * sigma;
  const zone2Upper = cl + sigma;
  const zone2Lower = cl - sigma;
  
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Background zones */}
      <rect
        x={padding.left}
        y={yScale(ucl)}
        width={chartWidth}
        height={yScale(zone1Upper) - yScale(ucl)}
        fill="rgba(239, 68, 68, 0.1)"
      />
      <rect
        x={padding.left}
        y={yScale(zone1Upper)}
        width={chartWidth}
        height={yScale(zone2Upper) - yScale(zone1Upper)}
        fill="rgba(251, 191, 36, 0.1)"
      />
      <rect
        x={padding.left}
        y={yScale(zone2Upper)}
        width={chartWidth}
        height={yScale(zone2Lower) - yScale(zone2Upper)}
        fill="rgba(34, 197, 94, 0.1)"
      />
      <rect
        x={padding.left}
        y={yScale(zone2Lower)}
        width={chartWidth}
        height={yScale(zone1Lower) - yScale(zone2Lower)}
        fill="rgba(251, 191, 36, 0.1)"
      />
      <rect
        x={padding.left}
        y={yScale(zone1Lower)}
        width={chartWidth}
        height={yScale(lcl) - yScale(zone1Lower)}
        fill="rgba(239, 68, 68, 0.1)"
      />
      
      {/* Grid lines */}
      {[ucl, zone1Upper, zone2Upper, cl, zone2Lower, zone1Lower, lcl].map((v, i) => (
        <line
          key={i}
          x1={padding.left}
          y1={yScale(v)}
          x2={padding.left + chartWidth}
          y2={yScale(v)}
          stroke={v === ucl || v === lcl ? '#ef4444' : v === cl ? '#3b82f6' : '#e5e7eb'}
          strokeWidth={v === ucl || v === lcl || v === cl ? 2 : 1}
          strokeDasharray={v === ucl || v === lcl ? '5,5' : 'none'}
        />
      ))}
      
      {/* Specification limits */}
      {usl && (
        <line
          x1={padding.left}
          y1={yScale(usl)}
          x2={padding.left + chartWidth}
          y2={yScale(usl)}
          stroke="#9333ea"
          strokeWidth={1}
          strokeDasharray="10,5"
        />
      )}
      {lsl && (
        <line
          x1={padding.left}
          y1={yScale(lsl)}
          x2={padding.left + chartWidth}
          y2={yScale(lsl)}
          stroke="#9333ea"
          strokeWidth={1}
          strokeDasharray="10,5"
        />
      )}
      
      {/* Data line */}
      <path
        d={linePath}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
      />
      
      {/* Data points */}
      {dataPoints.map((d, i) => (
        <g key={d.id}>
          <circle
            cx={xScale(i)}
            cy={yScale(d.primaryValue)}
            r={d.isOutOfControl ? 8 : 5}
            fill={d.isOutOfControl ? '#ef4444' : d.violations.length > 0 ? '#f59e0b' : '#3b82f6'}
            stroke="white"
            strokeWidth={2}
          />
          {d.isOutOfControl && (
            <text
              x={xScale(i)}
              y={yScale(d.primaryValue) - 12}
              textAnchor="middle"
              fontSize="10"
              fill="#ef4444"
              fontWeight="bold"
            >
              !
            </text>
          )}
        </g>
      ))}
      
      {/* Y-axis labels */}
      <text x={padding.left - 10} y={yScale(ucl)} textAnchor="end" fontSize="10" fill="#ef4444" dominantBaseline="middle">UCL</text>
      <text x={padding.left - 10} y={yScale(cl)} textAnchor="end" fontSize="10" fill="#3b82f6" dominantBaseline="middle">CL</text>
      <text x={padding.left - 10} y={yScale(lcl)} textAnchor="end" fontSize="10" fill="#ef4444" dominantBaseline="middle">LCL</text>
      
      {/* Values */}
      <text x={width - padding.right + 5} y={yScale(ucl)} textAnchor="start" fontSize="9" fill="#666" dominantBaseline="middle">{ucl.toFixed(3)}</text>
      <text x={width - padding.right + 5} y={yScale(cl)} textAnchor="start" fontSize="9" fill="#666" dominantBaseline="middle">{cl.toFixed(3)}</text>
      <text x={width - padding.right + 5} y={yScale(lcl)} textAnchor="start" fontSize="9" fill="#666" dominantBaseline="middle">{lcl.toFixed(3)}</text>
      
      {/* X-axis labels (sample numbers) */}
      {dataPoints.filter((_, i) => i % 5 === 0 || i === dataPoints.length - 1).map((d, i, arr) => {
        const originalIndex = dataPoints.indexOf(d);
        return (
          <text
            key={d.id}
            x={xScale(originalIndex)}
            y={height - padding.bottom + 15}
            textAnchor="middle"
            fontSize="10"
            fill="#666"
          >
            {d.sampleNumber}
          </text>
        );
      })}
      
      {/* Title */}
      <text x={width / 2} y={20} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#333">
        {chart.characteristicName} - {SPCEngine.getChartTypeLabel(chart.chartType)}
      </text>
    </svg>
  );
};

// Secondary chart (R or S chart)
const SecondaryChartSVG: React.FC<{
  chart: ControlChart;
  height?: number;
}> = ({ chart, height = 200 }) => {
  const width = 800;
  const padding = { top: 30, right: 60, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const { dataPoints, uclSecondary, clSecondary, lclSecondary, chartType } = chart;
  
  if (dataPoints.length === 0) return null;
  
  const values = dataPoints.map(d => d.secondaryValue);
  const minValue = Math.min(...values, lclSecondary) - (uclSecondary - lclSecondary) * 0.1;
  const maxValue = Math.max(...values, uclSecondary) + (uclSecondary - lclSecondary) * 0.1;
  const valueRange = maxValue - minValue || 1;
  
  const xScale = (index: number) => padding.left + (index / (dataPoints.length - 1 || 1)) * chartWidth;
  const yScale = (value: number) => padding.top + (1 - (value - minValue) / valueRange) * chartHeight;
  
  const linePath = dataPoints
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.secondaryValue)}`)
    .join(' ');
  
  const chartLabel = chartType === 'XBAR_S' ? 'S Chart' : chartType === 'I_MR' ? 'MR Chart' : 'R Chart';
  
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Control limit lines */}
      <line x1={padding.left} y1={yScale(uclSecondary)} x2={padding.left + chartWidth} y2={yScale(uclSecondary)} stroke="#ef4444" strokeWidth={2} strokeDasharray="5,5" />
      <line x1={padding.left} y1={yScale(clSecondary)} x2={padding.left + chartWidth} y2={yScale(clSecondary)} stroke="#3b82f6" strokeWidth={2} />
      {lclSecondary > 0 && (
        <line x1={padding.left} y1={yScale(lclSecondary)} x2={padding.left + chartWidth} y2={yScale(lclSecondary)} stroke="#ef4444" strokeWidth={2} strokeDasharray="5,5" />
      )}
      
      {/* Data line */}
      <path d={linePath} fill="none" stroke="#10b981" strokeWidth={2} />
      
      {/* Data points */}
      {dataPoints.map((d, i) => (
        <circle
          key={d.id}
          cx={xScale(i)}
          cy={yScale(d.secondaryValue)}
          r={4}
          fill={d.secondaryValue > uclSecondary ? '#ef4444' : '#10b981'}
          stroke="white"
          strokeWidth={1}
        />
      ))}
      
      {/* Labels */}
      <text x={padding.left - 10} y={yScale(uclSecondary)} textAnchor="end" fontSize="10" fill="#ef4444" dominantBaseline="middle">UCL</text>
      <text x={padding.left - 10} y={yScale(clSecondary)} textAnchor="end" fontSize="10" fill="#3b82f6" dominantBaseline="middle">CL</text>
      
      <text x={width - padding.right + 5} y={yScale(uclSecondary)} textAnchor="start" fontSize="9" fill="#666" dominantBaseline="middle">{uclSecondary.toFixed(3)}</text>
      <text x={width - padding.right + 5} y={yScale(clSecondary)} textAnchor="start" fontSize="9" fill="#666" dominantBaseline="middle">{clSecondary.toFixed(3)}</text>
      
      <text x={width / 2} y={15} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#333">{chartLabel}</text>
    </svg>
  );
};

function SPCControlChartsPageContent() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');
  
  const [characteristics, setCharacteristics] = useState<ProcessCharacteristic[]>([]);
  const [selectedChar, setSelectedChar] = useState<string | null>(selectedId);
  const [chart, setChart] = useState<ControlChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    fetchCharacteristics();
  }, []);

  useEffect(() => {
    if (selectedChar) {
      fetchChart(selectedChar);
    }
  }, [selectedChar]);

  const fetchCharacteristics = async () => {
    try {
      const response = await fetch('/api/v2/quality?view=characteristics');
      const data = await response.json();
      if (data.success) {
        setCharacteristics(data.data.characteristics);
        if (!selectedChar && data.data.characteristics.length > 0) {
          setSelectedChar(data.data.characteristics[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch characteristics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChart = async (charId: string) => {
    setChartLoading(true);
    try {
      const response = await fetch(`/api/v2/quality?view=chart&characteristicId=${charId}`);
      const data = await response.json();
      if (data.success) {
        setChart(data.data.chart);
      }
    } catch (error) {
      console.error('Failed to fetch chart:', error);
    } finally {
      setChartLoading(false);
    }
  };

  const currentCharacteristic = characteristics.find(c => c.id === selectedChar);
  
  const violations = useMemo(() => {
    if (!chart) return [];
    return chart.dataPoints.flatMap(dp => dp.violations);
  }, [chart]);

  const trend = useMemo(() => {
    if (!chart || chart.dataPoints.length < 6) return null;
    const values = chart.dataPoints.map(d => d.primaryValue);
    return SPCEngine.detectTrend(values);
  }, [chart]);

  const shift = useMemo(() => {
    if (!chart || chart.dataPoints.length < 8) return null;
    const values = chart.dataPoints.map(d => d.primaryValue);
    const sigma = (chart.ucl - chart.cl) / 3;
    return SPCEngine.detectShift(values, chart.cl, sigma);
  }, [chart]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Biểu đồ Kiểm soát SPC</h1>
          <p className="text-gray-500 dark:text-gray-400">Theo dõi quá trình sản xuất theo thời gian thực</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => selectedChar && fetchChart(selectedChar)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${chartLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="h-4 w-4" />
            Xuất PDF
          </button>
        </div>
      </div>

      {/* Characteristic Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Chọn đặc tính kiểm soát
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {characteristics.map((char) => (
            <button
              key={char.id}
              onClick={() => setSelectedChar(char.id)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                selectedChar === char.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <p className="font-medium text-gray-900 dark:text-white text-sm">{char.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {SPCEngine.getChartTypeLabel(char.chartType)} • n={char.subgroupSize}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Chart Display */}
      {chart && currentCharacteristic && (
        <>
          {/* Chart Info Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                {chart.status === 'IN_CONTROL' && <CheckCircle className="h-5 w-5 text-green-500" />}
                {chart.status === 'WARNING' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                {chart.status === 'OUT_OF_CONTROL' && <XCircle className="h-5 w-5 text-red-500" />}
                <span className={`px-2 py-1 text-sm rounded-full ${SPCEngine.getStatusColor(chart.status)}`}>
                  {chart.status === 'IN_CONTROL' ? 'Trong kiểm soát' : 
                   chart.status === 'WARNING' ? 'Cảnh báo' : 'Ngoài kiểm soát'}
                </span>
              </div>
              
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
              
              <div className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">UCL:</span>
                <span className="ml-1 font-medium text-red-600">{chart.ucl.toFixed(3)}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">CL:</span>
                <span className="ml-1 font-medium text-blue-600">{chart.cl.toFixed(3)}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">LCL:</span>
                <span className="ml-1 font-medium text-red-600">{chart.lcl.toFixed(3)}</span>
              </div>
              
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
              
              <div className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">USL:</span>
                <span className="ml-1 font-medium text-purple-600">{currentCharacteristic.usl.toFixed(3)}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">LSL:</span>
                <span className="ml-1 font-medium text-purple-600">{currentCharacteristic.lsl.toFixed(3)}</span>
              </div>
              
              {trend && trend.hasTrend && (
                <>
                  <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
                  <div className="flex items-center gap-1 text-sm">
                    {trend.direction === 'UP' ? (
                      <TrendingUp className="h-4 w-4 text-orange-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-orange-500" />
                    )}
                    <span className="text-orange-600">Xu hướng {trend.direction === 'UP' ? 'tăng' : 'giảm'}</span>
                  </div>
                </>
              )}
              
              {shift && shift.hasShift && (
                <>
                  <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
                  <div className="flex items-center gap-1 text-sm text-orange-600">
                    <AlertTriangle className="h-4 w-4" />
                    Dịch chuyển {shift.direction === 'UP' ? 'lên' : 'xuống'} {shift.magnitude.toFixed(1)}σ
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Main Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            {chartLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                <ControlChartSVG chart={chart} height={350} />
                <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <SecondaryChartSVG chart={chart} height={200} />
                </div>
              </>
            )}
          </div>

          {/* Violations List */}
          {violations.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Vi phạm quy tắc ({violations.length})
              </h3>
              <div className="space-y-2">
                {violations.slice(0, 10).map((v, i) => (
                  <div 
                    key={i}
                    className={`p-3 rounded-lg border ${
                      v.severity === 'CRITICAL' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                      v.severity === 'WARNING' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' :
                      'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{v.rule}</p>
                        <p className="text-sm opacity-80">{v.description}</p>
                      </div>
                      <span className="text-sm">Mẫu #{v.pointIndex + 1}</span>
                    </div>
                  </div>
                ))}
                {violations.length > 10 && (
                  <p className="text-sm text-gray-500 text-center py-2">
                    Và {violations.length - 10} vi phạm khác...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Dữ liệu chi tiết (20 mẫu gần nhất)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3 font-medium text-gray-500">#</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Thời gian</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">X̄</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">
                      {chart.chartType === 'XBAR_S' ? 'S' : 'R'}
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Giá trị</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-500">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {chart.dataPoints.slice(-20).reverse().map((dp) => (
                    <tr 
                      key={dp.id}
                      className={`border-b border-gray-100 dark:border-gray-700/50 ${
                        dp.isOutOfControl ? 'bg-red-50 dark:bg-red-900/20' : ''
                      }`}
                    >
                      <td className="py-2 px-3">{dp.sampleNumber}</td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                        {new Date(dp.timestamp).toLocaleString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit'
                        })}
                      </td>
                      <td className={`py-2 px-3 text-right font-mono ${
                        dp.primaryValue > chart.ucl || dp.primaryValue < chart.lcl
                          ? 'text-red-600 font-bold'
                          : ''
                      }`}>
                        {dp.primaryValue.toFixed(3)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {dp.secondaryValue.toFixed(3)}
                      </td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400 font-mono text-xs">
                        [{dp.values.map(v => v.toFixed(2)).join(', ')}]
                      </td>
                      <td className="py-2 px-3 text-center">
                        {dp.isOutOfControl ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">OOC</span>
                        ) : dp.violations.length > 0 ? (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">Warning</span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function SPCControlChartsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SPCControlChartsPageContent />
    </Suspense>
  );
}
