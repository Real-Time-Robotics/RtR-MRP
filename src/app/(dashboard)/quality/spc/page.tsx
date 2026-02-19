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
import { DataTable, Column } from "@/components/ui-v2/data-table";
import { clientLogger } from '@/lib/client-logger';

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
          stroke={v === ucl || v === lcl ? '#ef4444' : v === cl ? '#30a46c' : '#e5e7eb'}
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
        stroke="#30a46c"
        strokeWidth={2}
      />

      {/* Data points */}
      {dataPoints.map((d, i) => (
        <g key={d.id}>
          <circle
            cx={xScale(i)}
            cy={yScale(d.primaryValue)}
            r={d.isOutOfControl ? 8 : 5}
            fill={d.isOutOfControl ? '#ef4444' : d.violations.length > 0 ? '#f59e0b' : '#30a46c'}
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
      <text x={padding.left - 10} y={yScale(cl)} textAnchor="end" fontSize="10" fill="#30a46c" dominantBaseline="middle">CL</text>
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
      <line x1={padding.left} y1={yScale(clSecondary)} x2={padding.left + chartWidth} y2={yScale(clSecondary)} stroke="#30a46c" strokeWidth={2} />
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
      <text x={padding.left - 10} y={yScale(clSecondary)} textAnchor="end" fontSize="10" fill="#30a46c" dominantBaseline="middle">CL</text>
      
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

  const exportToPDF = () => {
    const printStyles = `
      @media print {
        body * { visibility: hidden; }
        #spc-content, #spc-content * { visibility: visible; }
        #spc-content { position: absolute; left: 0; top: 0; width: 100%; }
        .no-print { display: none !important; }
        @page { margin: 1cm; size: A4 landscape; }
      }
    `;
    const styleSheet = document.createElement('style');
    styleSheet.id = 'print-styles';
    styleSheet.textContent = printStyles;
    document.head.appendChild(styleSheet);
    window.print();
    setTimeout(() => {
      const el = document.getElementById('print-styles');
      if (el) el.remove();
    }, 1000);
  };

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
      clientLogger.error('Failed to fetch characteristics:', error);
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
      clientLogger.error('Failed to fetch chart:', error);
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

  type DataPoint = ControlChart['dataPoints'][0];

  const spcDataColumns: Column<DataPoint>[] = useMemo(() => [
    {
      key: 'sampleNumber',
      header: '#',
      width: '60px',
      sortable: true,
    },
    {
      key: 'timestamp',
      header: 'Thời gian',
      width: '120px',
      render: (value) => new Date(value).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
      }),
    },
    {
      key: 'primaryValue',
      header: 'X̄',
      width: '100px',
      sortable: true,
      render: (value, row) => (
        <span className={`font-mono ${
          chart && (value > chart.ucl || value < chart.lcl)
            ? 'text-red-600 font-bold'
            : ''
        }`}>
          {value.toFixed(3)}
        </span>
      ),
    },
    {
      key: 'secondaryValue',
      header: chart?.chartType === 'XBAR_S' ? 'S' : 'R',
      width: '90px',
      render: (value) => <span className="font-mono">{value.toFixed(3)}</span>,
    },
    {
      key: 'values',
      header: 'Giá trị',
      width: '180px',
      render: (value) => (
        <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">
          [{value.map((v: number) => v.toFixed(2)).join(', ')}]
        </span>
      ),
    },
    {
      key: 'isOutOfControl',
      header: 'Trạng thái',
      width: '90px',
      cellClassName: (value, row) => {
        if (value) return 'bg-red-50 dark:bg-red-950/30';
        if (row.violations.length > 0) return 'bg-yellow-50 dark:bg-yellow-950/30';
        return 'bg-green-50 dark:bg-green-950/30';
      },
      render: (value, row) => value ? (
        <span className="text-red-700 dark:text-red-300 text-xs font-medium">OOC</span>
      ) : row.violations.length > 0 ? (
        <span className="text-yellow-700 dark:text-yellow-300 text-xs font-medium">Warning</span>
      ) : (
        <span className="text-green-700 dark:text-green-300 text-xs font-medium">OK</span>
      ),
    },
  ], [chart]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div id="spc-content" className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Biểu đồ Kiểm soát SPC</h1>
          <p className="text-gray-500 dark:text-gray-400">Theo dõi quá trình sản xuất theo thời gian thực</p>
        </div>
        <div className="flex items-center gap-3 no-print">
          <button
            onClick={() => selectedChar && fetchChart(selectedChar)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${chartLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
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
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Dữ liệu chi tiết (20 mẫu gần nhất)
              </h3>
            </div>
            <DataTable
              data={chart.dataPoints.slice(-20).reverse()}
              columns={spcDataColumns}
              keyField="id"
              emptyMessage="Không có dữ liệu"
              searchable={false}
              stickyHeader
              excelMode={{
                enabled: true,
                showRowNumbers: false,
                columnHeaderStyle: 'field-names',
                gridBorders: true,
                showFooter: true,
                sheetName: 'SPC Data',
                compactMode: true,
              }}
            />
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
