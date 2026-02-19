'use client';

// =============================================================================
// PROCESS CAPABILITY ANALYSIS PAGE
// Phase 11: Quality Management
// =============================================================================

import React, { useState, useEffect, Suspense } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Info,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SPCEngine, ProcessCapability, ProcessCharacteristic } from '@/lib/spc';
import { clientLogger } from '@/lib/client-logger';

// Loading fallback
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );
}

// Histogram component
const HistogramSVG: React.FC<{
  data: number[];
  usl: number;
  lsl: number;
  target?: number;
  mean: number;
  stdDev: number;
  height?: number;
}> = ({ data, usl, lsl, target, mean, stdDev, height = 250 }) => {
  const width = 600;
  const padding = { top: 30, right: 40, bottom: 50, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500">Không có dữ liệu</p>
      </div>
    );
  }
  
  // Create histogram bins
  const numBins = Math.min(20, Math.ceil(Math.sqrt(data.length)));
  const min = Math.min(...data, lsl);
  const max = Math.max(...data, usl);
  const binWidth = (max - min) / numBins;
  
  const bins: number[] = new Array(numBins).fill(0);
  data.forEach(value => {
    const binIndex = Math.min(Math.floor((value - min) / binWidth), numBins - 1);
    bins[binIndex]++;
  });
  
  const maxBinCount = Math.max(...bins);
  
  const xScale = (value: number) => padding.left + ((value - min) / (max - min)) * chartWidth;
  const yScale = (count: number) => padding.top + chartHeight - (count / maxBinCount) * chartHeight;
  const barWidth = chartWidth / numBins - 1;
  
  // Normal curve points
  const normalCurvePoints: string[] = [];
  const normalScale = (maxBinCount / (stdDev * Math.sqrt(2 * Math.PI))) * binWidth * data.length;
  for (let i = 0; i <= 100; i++) {
    const x = min + (i / 100) * (max - min);
    const y = normalScale * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
    const px = xScale(x);
    const py = padding.top + chartHeight - (y / maxBinCount) * chartHeight;
    normalCurvePoints.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
  }
  
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Histogram bars */}
      {bins.map((count, i) => {
        const binStart = min + i * binWidth;
        const binEnd = binStart + binWidth;
        const isOutOfSpec = binEnd < lsl || binStart > usl;
        
        return (
          <rect
            key={i}
            x={xScale(binStart) + 0.5}
            y={yScale(count)}
            width={barWidth}
            height={chartHeight - (yScale(count) - padding.top)}
            fill={isOutOfSpec ? 'rgba(239, 68, 68, 0.7)' : 'rgba(62, 207, 142, 0.7)'}
            stroke={isOutOfSpec ? '#ef4444' : '#30a46c'}
            strokeWidth={1}
          />
        );
      })}
      
      {/* Normal distribution curve */}
      <path
        d={normalCurvePoints.join(' ')}
        fill="none"
        stroke="#10b981"
        strokeWidth={2}
      />
      
      {/* Specification limits */}
      <line
        x1={xScale(lsl)}
        y1={padding.top}
        x2={xScale(lsl)}
        y2={padding.top + chartHeight}
        stroke="#ef4444"
        strokeWidth={2}
        strokeDasharray="5,5"
      />
      <line
        x1={xScale(usl)}
        y1={padding.top}
        x2={xScale(usl)}
        y2={padding.top + chartHeight}
        stroke="#ef4444"
        strokeWidth={2}
        strokeDasharray="5,5"
      />
      
      {/* Target line */}
      {target && (
        <line
          x1={xScale(target)}
          y1={padding.top}
          x2={xScale(target)}
          y2={padding.top + chartHeight}
          stroke="#9333ea"
          strokeWidth={2}
        />
      )}
      
      {/* Mean line */}
      <line
        x1={xScale(mean)}
        y1={padding.top}
        x2={xScale(mean)}
        y2={padding.top + chartHeight}
        stroke="#30a46c"
        strokeWidth={2}
      />

      {/* X-axis */}
      <line
        x1={padding.left}
        y1={padding.top + chartHeight}
        x2={padding.left + chartWidth}
        y2={padding.top + chartHeight}
        stroke="#666"
        strokeWidth={1}
      />
      
      {/* X-axis labels */}
      {[lsl, mean, usl].map((v, i) => (
        <g key={i}>
          <text
            x={xScale(v)}
            y={height - padding.bottom + 15}
            textAnchor="middle"
            fontSize="10"
            fill="#666"
          >
            {v.toFixed(3)}
          </text>
          <text
            x={xScale(v)}
            y={height - padding.bottom + 28}
            textAnchor="middle"
            fontSize="9"
            fill={i === 1 ? '#30a46c' : '#ef4444'}
            fontWeight="bold"
          >
            {i === 0 ? 'LSL' : i === 1 ? 'Mean' : 'USL'}
          </text>
        </g>
      ))}
      
      {/* Legend */}
      <g transform={`translate(${width - 120}, 10)`}>
        <rect x={0} y={0} width={10} height={10} fill="rgba(62, 207, 142, 0.7)" />
        <text x={15} y={9} fontSize="9" fill="#666">Trong spec</text>
        <rect x={0} y={15} width={10} height={10} fill="rgba(239, 68, 68, 0.7)" />
        <text x={15} y={24} fontSize="9" fill="#666">Ngoài spec</text>
        <line x1={0} y1={35} x2={10} y2={35} stroke="#10b981" strokeWidth={2} />
        <text x={15} y={38} fontSize="9" fill="#666">Normal</text>
      </g>
    </svg>
  );
};

// Capability Gauge component
const CapabilityGauge: React.FC<{
  value: number;
  label: string;
  size?: number;
}> = ({ value, label, size = 120 }) => {
  const radius = size / 2 - 10;
  const circumference = radius * Math.PI;
  const normalizedValue = Math.min(Math.max(value, 0), 2);
  const progress = (normalizedValue / 2) * circumference;
  
  let color = '#ef4444'; // Red for < 1.0
  if (value >= 1.67) color = '#22c55e'; // Green for >= 1.67
  else if (value >= 1.33) color = '#30a46c'; // Green for >= 1.33
  else if (value >= 1.0) color = '#f59e0b'; // Yellow for >= 1.0
  
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        {/* Background arc */}
        <path
          d={`M ${10} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={8}
        />
        {/* Value arc */}
        <path
          d={`M ${10} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Value text */}
        <text
          x={size / 2}
          y={size / 2 - 5}
          textAnchor="middle"
          fontSize="20"
          fontWeight="bold"
          fill={color}
        >
          {value.toFixed(2)}
        </text>
        {/* Label */}
        <text
          x={size / 2}
          y={size / 2 + 15}
          textAnchor="middle"
          fontSize="12"
          fill="#666"
        >
          {label}
        </text>
      </svg>
    </div>
  );
};

function ProcessCapabilityPageContent() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');
  
  const [capabilities, setCapabilities] = useState<ProcessCapability[]>([]);
  const [selectedCapability, setSelectedCapability] = useState<ProcessCapability | null>(null);
  const [characteristics, setCharacteristics] = useState<ProcessCharacteristic[]>([]);
  const [loading, setLoading] = useState(true);
  const [sampleData, setSampleData] = useState<number[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedId && capabilities.length > 0) {
      const cap = capabilities.find(c => c.characteristicId === selectedId);
      if (cap) {
        setSelectedCapability(cap);
        generateSampleData(cap);
      }
    }
  }, [selectedId, capabilities]);

  const fetchData = async () => {
    try {
      const [capResponse, charResponse] = await Promise.all([
        fetch('/api/v2/quality?view=capability'),
        fetch('/api/v2/quality?view=characteristics')
      ]);
      
      const capData = await capResponse.json();
      const charData = await charResponse.json();
      
      if (capData.success) {
        setCapabilities(capData.data.capabilities);
        if (!selectedId && capData.data.capabilities.length > 0) {
          setSelectedCapability(capData.data.capabilities[0]);
          generateSampleData(capData.data.capabilities[0]);
        }
      }
      
      if (charData.success) {
        setCharacteristics(charData.data.characteristics);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSampleData = (cap: ProcessCapability) => {
    // Generate sample data based on capability statistics
    const data: number[] = [];
    for (let i = 0; i < cap.sampleSize; i++) {
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      data.push(cap.mean + z * cap.stdDev);
    }
    setSampleData(data);
  };

  const handleSelectCapability = (cap: ProcessCapability) => {
    setSelectedCapability(cap);
    generateSampleData(cap);
  };

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Phân tích Năng lực Quy trình</h1>
          <p className="text-gray-500 dark:text-gray-400">Đánh giá Cp, Cpk, Pp, Ppk và các chỉ số năng lực</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="h-4 w-4" />
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Capability Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {capabilities.map((cap) => (
          <button
            key={cap.characteristicId}
            onClick={() => handleSelectCapability(cap)}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedCapability?.characteristicId === cap.characteristicId
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`px-2 py-0.5 text-xs rounded-full ${SPCEngine.getCapabilityStatusColor(cap.status)}`}>
                {cap.status}
              </span>
              {cap.cpk >= 1.33 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : cap.cpk >= 1.0 ? (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
              {cap.characteristicName}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${
                cap.cpk >= 1.33 ? 'text-green-600' :
                cap.cpk >= 1.0 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {cap.cpk.toFixed(2)}
              </span>
              <span className="text-xs text-gray-500">Cpk</span>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Capability Detail */}
      {selectedCapability && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Histogram */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Phân bố dữ liệu - {selectedCapability.characteristicName}
            </h3>
            <HistogramSVG
              data={sampleData}
              usl={selectedCapability.usl}
              lsl={selectedCapability.lsl}
              target={selectedCapability.targetValue}
              mean={selectedCapability.mean}
              stdDev={selectedCapability.stdDev}
              height={280}
            />
          </div>

          {/* Capability Gauges */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Chỉ số năng lực
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <CapabilityGauge value={selectedCapability.cp} label="Cp" />
              <CapabilityGauge value={selectedCapability.cpk} label="Cpk" />
              <CapabilityGauge value={selectedCapability.pp} label="Pp" />
              <CapabilityGauge value={selectedCapability.ppk} label="Ppk" />
            </div>
            
            {/* Interpretation */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>Đánh giá:</strong> {selectedCapability.recommendation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Statistics */}
      {selectedCapability && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Statistics Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Thống kê mô tả
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Cỡ mẫu (n)</span>
                <span className="font-medium">{selectedCapability.sampleSize}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Trung bình (X̄)</span>
                <span className="font-medium font-mono">{selectedCapability.mean.toFixed(4)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Độ lệch chuẩn (σ)</span>
                <span className="font-medium font-mono">{selectedCapability.stdDev.toFixed(4)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Giá trị nhỏ nhất</span>
                <span className="font-medium font-mono">{selectedCapability.min.toFixed(4)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Giá trị lớn nhất</span>
                <span className="font-medium font-mono">{selectedCapability.max.toFixed(4)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">USL</span>
                <span className="font-medium font-mono text-red-600">{selectedCapability.usl.toFixed(4)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">LSL</span>
                <span className="font-medium font-mono text-red-600">{selectedCapability.lsl.toFixed(4)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600 dark:text-gray-400">Target</span>
                <span className="font-medium font-mono text-purple-600">
                  {selectedCapability.targetValue?.toFixed(4) || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Capability Indices */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Chỉ số năng lực chi tiết
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Cp (Potential)</span>
                <span className={`font-medium ${
                  selectedCapability.cp >= 1.33 ? 'text-green-600' : 
                  selectedCapability.cp >= 1.0 ? 'text-yellow-600' : 'text-red-600'
                }`}>{selectedCapability.cp.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Cpk (Actual)</span>
                <span className={`font-medium ${
                  selectedCapability.cpk >= 1.33 ? 'text-green-600' : 
                  selectedCapability.cpk >= 1.0 ? 'text-yellow-600' : 'text-red-600'
                }`}>{selectedCapability.cpk.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Cpl (Lower)</span>
                <span className="font-medium">{selectedCapability.cpl.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Cpu (Upper)</span>
                <span className="font-medium">{selectedCapability.cpu.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Pp (Performance)</span>
                <span className="font-medium">{selectedCapability.pp.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Ppk</span>
                <span className="font-medium">{selectedCapability.ppk.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Sigma Level</span>
                <span className={`font-medium ${
                  selectedCapability.sigma >= 4 ? 'text-green-600' : 
                  selectedCapability.sigma >= 3 ? 'text-yellow-600' : 'text-red-600'
                }`}>{selectedCapability.sigma.toFixed(1)}σ</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">PPM (Defective)</span>
                <span className={`font-medium ${
                  selectedCapability.ppm < 100 ? 'text-green-600' : 
                  selectedCapability.ppm < 1000 ? 'text-yellow-600' : 'text-red-600'
                }`}>{selectedCapability.ppm.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600 dark:text-gray-400">Yield (%)</span>
                <span className={`font-medium ${
                  selectedCapability.yield >= 99.9 ? 'text-green-600' : 
                  selectedCapability.yield >= 99 ? 'text-yellow-600' : 'text-red-600'
                }`}>{selectedCapability.yield.toFixed(4)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Capability Interpretation Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Hướng dẫn đánh giá năng lực
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="font-medium text-green-700 dark:text-green-400">Cpk ≥ 1.67</p>
            <p className="text-sm text-green-600 dark:text-green-500 mt-1">EXCELLENT - Six Sigma</p>
            <p className="text-xs text-green-500 mt-1">&lt; 0.6 PPM</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="font-medium text-blue-700 dark:text-blue-400">Cpk ≥ 1.33</p>
            <p className="text-sm text-blue-600 dark:text-blue-500 mt-1">GOOD - 4 Sigma</p>
            <p className="text-xs text-blue-500 mt-1">&lt; 66 PPM</p>
          </div>
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="font-medium text-yellow-700 dark:text-yellow-400">Cpk ≥ 1.00</p>
            <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">ACCEPTABLE - 3 Sigma</p>
            <p className="text-xs text-yellow-500 mt-1">&lt; 2,700 PPM</p>
          </div>
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <p className="font-medium text-orange-700 dark:text-orange-400">Cpk ≥ 0.67</p>
            <p className="text-sm text-orange-600 dark:text-orange-500 mt-1">POOR - 2 Sigma</p>
            <p className="text-xs text-orange-500 mt-1">&lt; 45,500 PPM</p>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="font-medium text-red-700 dark:text-red-400">Cpk &lt; 0.67</p>
            <p className="text-sm text-red-600 dark:text-red-500 mt-1">UNACCEPTABLE</p>
            <p className="text-xs text-red-500 mt-1">&gt; 45,500 PPM</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProcessCapabilityPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ProcessCapabilityPageContent />
    </Suspense>
  );
}
