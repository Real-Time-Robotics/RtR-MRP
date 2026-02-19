'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Package,
  Factory,
  Gauge,
  Wrench,
  Clock,
  TrendingUp,
  CheckCircle,
  Download,
  Calendar,
  Loader2,
  RefreshCw,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
  Info,
  Lightbulb,
  BarChart3,
  PieChart,
  LineChart,
  FileSpreadsheet,
  ShoppingCart,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ReportType,
  ReportPeriod,
  ReportData,
  ReportTemplate,
  ReportCategory,
  PERIOD_OPTIONS,
  CATEGORY_CONFIG,
} from '@/lib/reports/report-engine';
import { SCHEDULED_REPORT_TEMPLATES } from '@/lib/reports/report-templates';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// REPORTS DASHBOARD PAGE
// Advanced reporting and analytics interface
// =============================================================================

interface TemplateGroup {
  category: ReportCategory;
  label: string;
  labelVi: string;
  color: string;
  bgColor: string;
  templates: {
    type: ReportType;
    name: string;
    nameVi: string;
    description: string;
    descriptionVi: string;
    icon: string;
  }[];
}

export default function ReportsPage() {
  const [templates, setTemplates] = useState<TemplateGroup[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('THIS_WEEK');
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/v2/reports?view=templates');
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data.templates);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (type: ReportType) => {
    setGenerating(true);
    setSelectedReport(type);
    try {
      const res = await fetch('/api/v2/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, period: selectedPeriod }),
      });
      const data = await res.json();
      if (data.success) {
        setReportData(data.data);
      }
    } catch (error) {
      clientLogger.error('Failed to generate report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      factory: <Factory className="w-5 h-5" />,
      gauge: <Gauge className="w-5 h-5" />,
      package: <Package className="w-5 h-5" />,
      'check-circle': <CheckCircle className="w-5 h-5" />,
      wrench: <Wrench className="w-5 h-5" />,
      clock: <Clock className="w-5 h-5" />,
      'trending-up': <TrendingUp className="w-5 h-5" />,
    };
    return icons[iconName] || <FileText className="w-5 h-5" />;
  };

  const getTrendIcon = (trend?: string) => {
    if (trend === 'UP') return <ArrowUp className="w-4 h-4 text-success-500" />;
    if (trend === 'DOWN') return <ArrowDown className="w-4 h-4 text-danger-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle className="w-5 h-5 text-success-500" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'RECOMMENDATION':
        return <Lightbulb className="w-5 h-5 text-primary-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSummaryCardColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
      green: 'bg-green-100 dark:bg-green-900/30 text-green-600',
      red: 'bg-red-100 dark:bg-red-900/30 text-red-600',
      orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600',
      purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
    };
    return colors[color] || colors.blue;
  };

  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadReport = async (templateId: string, format: 'PDF' | 'EXCEL') => {
    const key = `${templateId}-${format}`;
    setDownloading(key);
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, format }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('Content-Disposition');
      a.download = disposition?.split('filename=')[1]?.replace(/"/g, '') || `report.${format === 'PDF' ? 'pdf' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      clientLogger.error('Download failed:', error);
    } finally {
      setDownloading(null);
    }
  };

  const exportToPDF = () => {
    // Use server-side PDF generation for inventory report
    downloadReport('inventory-summary', 'PDF');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-6 h-6" />
                Báo cáo & Phân tích
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Tạo và xem báo cáo sản xuất, tồn kho, bảo trì
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Period Selector */}
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as ReportPeriod)}
                aria-label="Chọn kỳ báo cáo"
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary-500"
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.labelVi}
                  </option>
                ))}
              </select>
              <button
                onClick={() => window.location.href = '/reports/scheduled'}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Lịch gửi
              </button>
              <button
                onClick={() => fetchTemplates()}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                Làm mới
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Download Reports Section */}
        {!reportData && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
              Tải báo cáo (PDF / Excel)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {SCHEDULED_REPORT_TEMPLATES.map((template) => {
                const iconMap: Record<string, React.ReactNode> = {
                  Package: <Package className="w-4 h-4" />,
                  ShoppingCart: <ShoppingCart className="w-4 h-4" />,
                  Factory: <Factory className="w-4 h-4" />,
                  Star: <Star className="w-4 h-4" />,
                  AlertTriangle: <AlertTriangle className="w-4 h-4" />,
                  CheckCircle: <CheckCircle className="w-4 h-4" />,
                };
                return (
                  <div
                    key={template.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3"
                  >
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                      {iconMap[template.icon] || <FileText className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{template.nameVi}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => downloadReport(template.id, 'EXCEL')}
                        disabled={downloading === `${template.id}-EXCEL`}
                        className="px-2.5 py-1.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50"
                      >
                        {downloading === `${template.id}-EXCEL` ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <span className="flex items-center gap-1">
                            <FileSpreadsheet className="w-3 h-3" /> Excel
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => downloadReport(template.id, 'PDF')}
                        disabled={downloading === `${template.id}-PDF`}
                        className="px-2.5 py-1.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                      >
                        {downloading === `${template.id}-PDF` ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" /> PDF
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Report Templates */}
        {!reportData ? (
          <div className="space-y-8">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              templates.map((group) => (
                <div key={group.category}>
                  <h2 className={cn('text-sm font-semibold uppercase tracking-wider mb-4', group.color)}>
                    {group.labelVi}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.templates.map((template) => (
                      <button
                        key={template.type}
                        onClick={() => generateReport(template.type)}
                        disabled={generating}
                        className={cn(
                          'bg-white dark:bg-gray-800 rounded-xl p-5 text-left',
                          'border border-gray-200 dark:border-gray-700',
                          'hover:border-primary-500 dark:hover:border-primary-500',
                          'hover:shadow-lg transition-all duration-200',
                          'group'
                        )}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={cn('p-2.5 rounded-lg', group.bgColor)}>
                            {getIcon(template.icon)}
                          </div>
                          {generating && selectedReport === template.type ? (
                            <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {template.nameVi}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {template.descriptionVi}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Report View */
          <div id="report-content" className="space-y-6">
            {/* Back Button & Title */}
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={() => setReportData(null)}
                  className="text-sm text-primary-600 hover:text-primary-700 mb-2 flex items-center gap-1 no-print"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Quay lại danh sách
                </button>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {reportData.title}
                </h2>
                <p className="text-sm text-gray-500">{reportData.subtitle}</p>
              </div>
              <div className="flex items-center gap-2 no-print">
                <button
                  onClick={() => downloadReport('inventory-summary', 'EXCEL')}
                  disabled={!!downloading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {downloading?.endsWith('EXCEL') ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                  Excel
                </button>
                <button
                  onClick={exportToPDF}
                  disabled={!!downloading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {downloading?.endsWith('PDF') ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  PDF
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {reportData.summary.map((card) => (
                <div
                  key={card.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">{card.title}</span>
                    <div className={cn('p-1.5 rounded-lg', getSummaryCardColor(card.color))}>
                      {getIcon(card.icon)}
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {card.value}
                    </span>
                    {card.change !== undefined && (
                      <div className="flex items-center gap-1 text-sm">
                        {getTrendIcon(card.trend)}
                        <span className={cn(
                          card.trend === 'UP' ? 'text-success-600' :
                          card.trend === 'DOWN' ? 'text-danger-600' : 'text-gray-500'
                        )}>
                          {card.change > 0 ? '+' : ''}{card.change}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {reportData.charts.map((chart) => (
                <div
                  key={chart.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{chart.title}</h3>
                    <div className="flex items-center gap-2">
                      {chart.type === 'BAR' && <BarChart3 className="w-4 h-4 text-gray-400" />}
                      {chart.type === 'PIE' && <PieChart className="w-4 h-4 text-gray-400" />}
                      {chart.type === 'LINE' && <LineChart className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {/* Simple Chart Visualization */}
                  {chart.type === 'BAR' && (
                    <div className="space-y-3">
                      {chart?.data?.labels?.map((label, idx) => {
                        const value = chart.data.datasets[0].data[idx];
                        const maxValue = Math.max(...chart.data.datasets[0].data);
                        const percentage = (value / maxValue) * 100;
                        return (
                          <div key={label} className="flex items-center gap-3">
                            <span className="w-12 text-xs text-gray-500 text-right">{label}</span>
                            <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="w-16 text-sm font-medium text-gray-700 dark:text-gray-300">
                              {value.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {chart.type === 'PIE' && (
                    <div className="flex items-center justify-center">
                      <div className="relative w-48 h-48">
                        {/* Simple pie representation */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {chart.data.datasets[0].data.reduce((a, b) => a + b, 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">Tổng</p>
                          </div>
                        </div>
                        <svg viewBox="0 0 100 100" className="transform -rotate-90">
                          {chart.data.datasets[0].data.map((value, idx) => {
                            const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const percentage = (value / total) * 100;
                            const colors = ['#30a46c', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
                            const offset = chart.data.datasets[0].data
                              .slice(0, idx)
                              .reduce((a, b) => a + (b / total) * 100, 0);
                            return (
                              <circle
                                key={idx}
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                stroke={colors[idx % colors.length]}
                                strokeWidth="20"
                                strokeDasharray={`${percentage * 2.51} 251`}
                                strokeDashoffset={-offset * 2.51}
                              />
                            );
                          })}
                        </svg>
                      </div>
                      <div className="ml-6 space-y-2">
                        {chart?.data?.labels?.map((label, idx) => {
                          const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500'];
                          return (
                            <div key={label} className="flex items-center gap-2">
                              <div className={cn('w-3 h-3 rounded-full', colors[idx % colors.length])} />
                              <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {chart.data.datasets[0].data[idx].toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {chart.type === 'LINE' && (
                    <div className="h-48 flex items-end gap-1">
                      {chart.data.datasets[0].data.map((value, idx) => {
                        const maxValue = Math.max(...chart.data.datasets[0].data);
                        const height = (value / maxValue) * 100;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className="w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t transition-all duration-500"
                              style={{ height: `${height}%` }}
                            />
                            <span className="text-xs text-gray-500">{chart.data.labels[idx]}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Insights */}
            {reportData.insights && reportData.insights.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-warning-500" />
                  Phân tích & Đề xuất
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportData.insights.map((insight, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex items-start gap-3 p-4 rounded-lg',
                        insight.type === 'SUCCESS' && 'bg-success-50 dark:bg-success-900/20',
                        insight.type === 'WARNING' && 'bg-orange-50 dark:bg-orange-900/20',
                        insight.type === 'RECOMMENDATION' && 'bg-primary-50 dark:bg-primary-900/20',
                        insight.type === 'INFO' && 'bg-gray-50 dark:bg-gray-700/50'
                      )}
                    >
                      {getInsightIcon(insight.type)}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{insight.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{insight.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="text-center text-xs text-gray-400">
              Báo cáo được tạo lúc {new Date(reportData.generatedAt).toLocaleString('vi-VN')} •
              Thời gian xử lý: {reportData.metadata.generationTime}ms •
              {reportData.metadata.dataPoints} điểm dữ liệu
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
