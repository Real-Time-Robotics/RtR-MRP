'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  CheckCheck,
  X,
  RefreshCw,
  Search,
  Filter,
  Settings,
  ChevronRight,
  Clock,
  Package,
  Wrench,
  Gauge,
  ShieldAlert,
  Truck,
  Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Alert,
  AlertSeverity,
  AlertStatus,
  AlertType,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
  ALERT_TYPE_CONFIG,
  formatAlertTime,
} from '@/lib/alerts/alert-engine';

// =============================================================================
// ALERTS DASHBOARD PAGE
// Complete alert management interface
// =============================================================================

interface AlertSummary {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  dismissed: number;
  bySeverity: {
    critical: number;
    warning: number;
    info: number;
  };
  byType: Record<string, number>;
  unread: number;
  latestAlerts: Alert[];
}

export default function AlertsPage() {
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<AlertStatus | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'all'>('all');
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch alerts
  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const [summaryRes, alertsRes] = await Promise.all([
        fetch('/api/v2/alerts?view=summary'),
        fetch('/api/v2/alerts?view=list&limit=100'),
      ]);

      const summaryData = await summaryRes.json();
      const alertsData = await alertsRes.json();

      if (summaryData.success) {
        setSummary(summaryData.data);
      }
      if (alertsData.success) {
        setAlerts(alertsData.data.alerts);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Filter alerts
  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (alert.entityCode?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = filterStatus === 'all' || alert.status === filterStatus;
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  // Bulk actions
  const handleBulkAction = async (action: 'acknowledge' | 'resolve' | 'dismiss') => {
    if (selectedAlerts.length === 0) return;
    setActionLoading(true);
    try {
      await fetch('/api/v2/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, alertIds: selectedAlerts }),
      });
      setSelectedAlerts([]);
      await fetchAlerts();
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcknowledgeAll = async () => {
    setActionLoading(true);
    try {
      await fetch('/api/v2/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge_all' }),
      });
      await fetchAlerts();
    } catch (error) {
      console.error('Failed to acknowledge all:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Single alert actions
  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'resolve' | 'dismiss') => {
    try {
      await fetch('/api/v2/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, alertIds: [alertId] }),
      });
      await fetchAlerts();
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  };

  // Toggle selection
  const toggleSelection = (alertId: string) => {
    setSelectedAlerts((prev) =>
      prev.includes(alertId) ? prev.filter((id) => id !== alertId) : [...prev, alertId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedAlerts.length === filteredAlerts.length) {
      setSelectedAlerts([]);
    } else {
      setSelectedAlerts(filteredAlerts.map((a) => a.id));
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity: AlertSeverity, size = 'w-5 h-5') => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle className={cn(size, 'text-red-500')} />;
      case 'WARNING':
        return <AlertCircle className={cn(size, 'text-orange-500')} />;
      default:
        return <Info className={cn(size, 'text-blue-500')} />;
    }
  };

  // Get type icon
  const getTypeIcon = (type: AlertType) => {
    const iconMap: Record<string, React.ReactNode> = {
      LOW_STOCK: <Package className="w-4 h-4" />,
      STOCKOUT: <Package className="w-4 h-4" />,
      LOW_OEE: <Gauge className="w-4 h-4" />,
      EQUIPMENT_DOWN: <AlertTriangle className="w-4 h-4" />,
      MAINTENANCE_DUE: <Wrench className="w-4 h-4" />,
      MAINTENANCE_OVERDUE: <Clock className="w-4 h-4" />,
      QUALITY_ISSUE: <ShieldAlert className="w-4 h-4" />,
      HIGH_DEFECT_RATE: <X className="w-4 h-4" />,
      ORDER_DELAYED: <Clock className="w-4 h-4" />,
      ORDER_AT_RISK: <AlertCircle className="w-4 h-4" />,
      CAPACITY_OVERLOAD: <Gauge className="w-4 h-4" />,
      MRP_SHORTAGE: <Calculator className="w-4 h-4" />,
      SUPPLIER_LATE: <Truck className="w-4 h-4" />,
    };
    return iconMap[type] || <Bell className="w-4 h-4" />;
  };

  const statusFilters: { label: string; value: AlertStatus | 'all' }[] = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Đang hoạt động', value: 'ACTIVE' },
    { label: 'Đã xác nhận', value: 'ACKNOWLEDGED' },
    { label: 'Đã xử lý', value: 'RESOLVED' },
  ];

  const severityFilters: { label: string; value: AlertSeverity | 'all' }[] = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Nghiêm trọng', value: 'CRITICAL' },
    { label: 'Cảnh báo', value: 'WARNING' },
    { label: 'Thông tin', value: 'INFO' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Bell className="w-6 h-6" />
                Quản lý Cảnh báo
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Theo dõi và xử lý các cảnh báo hệ thống
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchAlerts()}
                disabled={loading}
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
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Nghiêm trọng</p>
                <p className="text-2xl font-bold text-red-600">{summary?.bySeverity.critical || 0}</p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Cảnh báo</p>
                <p className="text-2xl font-bold text-orange-600">{summary?.bySeverity.warning || 0}</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Thông tin</p>
                <p className="text-2xl font-bold text-blue-600">{summary?.bySeverity.info || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Info className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Đã xử lý</p>
                <p className="text-2xl font-bold text-green-600">{summary?.resolved || 0}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Check className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm cảnh báo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 overflow-x-auto">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterStatus(filter.value)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                    filterStatus === filter.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Severity Filter */}
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as AlertSeverity | 'all')}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              {severityFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedAlerts.length > 0 && (
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-500">
                Đã chọn {selectedAlerts.length} cảnh báo
              </span>
              <button
                onClick={() => handleBulkAction('acknowledge')}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200"
              >
                Xác nhận
              </button>
              <button
                onClick={() => handleBulkAction('resolve')}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
              >
                Đã xử lý
              </button>
              <button
                onClick={() => handleBulkAction('dismiss')}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Bỏ qua
              </button>
              <button
                onClick={() => setSelectedAlerts([])}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Bỏ chọn
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {summary && summary.active > 0 && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              Hiển thị {filteredAlerts.length} / {alerts.length} cảnh báo
            </p>
            <button
              onClick={handleAcknowledgeAll}
              disabled={actionLoading}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <CheckCheck className="w-4 h-4" />
              Xác nhận tất cả ({summary.active})
            </button>
          </div>
        )}

        {/* Alert List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <Bell className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500">Không có cảnh báo nào</p>
            </div>
          ) : (
            <>
              {/* Select All */}
              <div className="flex items-center gap-2 px-4">
                <input
                  type="checkbox"
                  checked={selectedAlerts.length === filteredAlerts.length && filteredAlerts.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">Chọn tất cả</span>
              </div>

              {filteredAlerts.map((alert) => {
                const severityConfig = SEVERITY_CONFIG[alert.severity];
                const statusConfig = STATUS_CONFIG[alert.status];
                const typeConfig = ALERT_TYPE_CONFIG[alert.type];

                return (
                  <div
                    key={alert.id}
                    className={cn(
                      'bg-white dark:bg-gray-800 rounded-xl p-4 border transition-all',
                      alert.status === 'ACTIVE' && severityConfig.borderColor,
                      alert.status !== 'ACTIVE' && 'border-gray-200 dark:border-gray-700',
                      selectedAlerts.includes(alert.id) && 'ring-2 ring-blue-500'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedAlerts.includes(alert.id)}
                        onChange={() => toggleSelection(alert.id)}
                        className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />

                      {/* Icon */}
                      <div className={cn('p-2 rounded-lg', severityConfig.bgColor)}>
                        {getSeverityIcon(alert.severity)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {alert.title}
                          </h3>
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium text-white', statusConfig.bgColor)}>
                            {statusConfig.labelVi}
                          </span>
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', severityConfig.bgColor, severityConfig.color)}>
                            {severityConfig.labelVi}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            {getTypeIcon(alert.type)}
                            {typeConfig?.labelVi || alert.type}
                          </span>
                          {alert.entityCode && (
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                              {alert.entityCode}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatAlertTime(new Date(alert.createdAt))}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {alert.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleAlertAction(alert.id, 'acknowledge')}
                            className="p-2 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg"
                            title="Xác nhận"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        {['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status) && (
                          <button
                            onClick={() => handleAlertAction(alert.id, 'resolve')}
                            className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg"
                            title="Đã xử lý"
                          >
                            <CheckCheck className="w-4 h-4" />
                          </button>
                        )}
                        {alert.status !== 'RESOLVED' && (
                          <button
                            onClick={() => handleAlertAction(alert.id, 'dismiss')}
                            className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            title="Bỏ qua"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Alert Type Stats */}
        {summary && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Thống kê theo loại cảnh báo
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(summary.byType)
                .filter(([_, count]) => count > 0)
                .map(([type, count]) => {
                  const config = ALERT_TYPE_CONFIG[type as AlertType];
                  return (
                    <div
                      key={type}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div className="p-2 bg-gray-200 dark:bg-gray-600 rounded-lg">
                        {getTypeIcon(type as AlertType)}
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{count}</p>
                        <p className="text-xs text-gray-500">{config?.labelVi || type}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
