'use client';

// =============================================================================
// QUALITY ALERTS PAGE
// Phase 11: Quality Management
// =============================================================================

import React, { useState, useEffect } from 'react';
import { 
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Search,
  RefreshCw,
  Eye,
  Check,
  MessageSquare,
  ChevronDown,
  Calendar
} from 'lucide-react';
import { QualityAlert, SPCEngine } from '@/lib/spc';
import { clientLogger } from '@/lib/client-logger';

export default function QualityAlertsPage() {
  const [alerts, setAlerts] = useState<QualityAlert[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    new: number;
    acknowledged: number;
    investigating: number;
    resolved: number;
    critical: number;
    warning: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<QualityAlert | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolution, setResolution] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, severityFilter]);

  const fetchAlerts = async () => {
    try {
      let url = '/api/v2/quality?view=alerts';
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (severityFilter) params.append('severity', severityFilter);
      if (params.toString()) url += `&${params.toString()}`;
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setAlerts(data.data.alerts);
        setSummary(data.data.summary);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      const response = await fetch('/api/v2/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge_alert',
          alertId,
          acknowledgedBy: 'Current User' // In real app, get from auth
        })
      });
      
      const data = await response.json();
      if (data.success) {
        fetchAlerts();
      }
    } catch (error) {
      clientLogger.error('Failed to acknowledge alert:', error);
    }
  };

  const handleResolve = async () => {
    if (!selectedAlert || !resolution.trim()) return;
    
    try {
      const response = await fetch('/api/v2/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve_alert',
          alertId: selectedAlert.id,
          resolvedBy: 'Current User',
          resolution: resolution.trim()
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setShowResolveModal(false);
        setSelectedAlert(null);
        setResolution('');
        fetchAlerts();
      }
    } catch (error) {
      clientLogger.error('Failed to resolve alert:', error);
    }
  };

  const handleDismiss = async (alertId: string) => {
    if (!confirm('Bạn có chắc muốn bỏ qua cảnh báo này?')) return;
    
    try {
      const response = await fetch('/api/v2/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dismiss_alert',
          alertId
        })
      });
      
      const data = await response.json();
      if (data.success) {
        fetchAlerts();
      }
    } catch (error) {
      clientLogger.error('Failed to dismiss alert:', error);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'WARNING': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'NEW': 'bg-blue-100 text-blue-700',
      'ACKNOWLEDGED': 'bg-yellow-100 text-yellow-700',
      'INVESTIGATING': 'bg-purple-100 text-purple-700',
      'RESOLVED': 'bg-green-100 text-green-700',
      'DISMISSED': 'bg-gray-100 text-gray-700'
    };
    const labels: Record<string, string> = {
      'NEW': 'Mới',
      'ACKNOWLEDGED': 'Đã xác nhận',
      'INVESTIGATING': 'Đang xử lý',
      'RESOLVED': 'Đã xử lý',
      'DISMISSED': 'Đã bỏ qua'
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || styles.NEW}`}>
        {labels[status] || status}
      </span>
    );
  };

  const filteredAlerts = alerts.filter(alert => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        alert.title.toLowerCase().includes(search) ||
        alert.characteristicName.toLowerCase().includes(search) ||
        alert.processName.toLowerCase().includes(search)
      );
    }
    return true;
  });

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cảnh báo Chất lượng</h1>
          <p className="text-gray-500 dark:text-gray-400">Quản lý và xử lý các cảnh báo SPC</p>
        </div>
        <button
          onClick={fetchAlerts}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500">Tổng</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
            <p className="text-sm text-blue-600 dark:text-blue-400">Mới</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{summary.new}</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 p-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">Đã xác nhận</p>
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{summary.acknowledged}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-4">
            <p className="text-sm text-purple-600 dark:text-purple-400">Đang xử lý</p>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{summary.investigating}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4">
            <p className="text-sm text-green-600 dark:text-green-400">Đã xử lý</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{summary.resolved}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-600 dark:text-red-400">Critical</p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">{summary.critical}</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 p-4">
            <p className="text-sm text-orange-600 dark:text-orange-400">Warning</p>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{summary.warning}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm cảnh báo..."
                aria-label="Tìm kiếm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Bộ lọc trạng thái"
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="NEW">Mới</option>
            <option value="ACKNOWLEDGED">Đã xác nhận</option>
            <option value="INVESTIGATING">Đang xử lý</option>
            <option value="RESOLVED">Đã xử lý</option>
            <option value="DISMISSED">Đã bỏ qua</option>
          </select>
          
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            aria-label="Bộ lọc mức độ"
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">Tất cả mức độ</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Không có cảnh báo nào</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  alert.status === 'NEW' ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getSeverityIcon(alert.severity)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {alert.title}
                      </h3>
                      {getStatusBadge(alert.status)}
                      <span className={`px-2 py-0.5 text-xs rounded ${SPCEngine.getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {alert.description}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(alert.createdAt).toLocaleString('vi-VN')}
                      </span>
                      <span>{alert.characteristicName}</span>
                      <span>{alert.processName}</span>
                      {alert.acknowledgedBy && (
                        <span className="text-yellow-600">
                          Xác nhận: {alert.acknowledgedBy}
                        </span>
                      )}
                      {alert.resolvedBy && (
                        <span className="text-green-600">
                          Xử lý: {alert.resolvedBy}
                        </span>
                      )}
                    </div>
                    
                    {alert.violation && (
                      <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                        <span className="font-medium">{alert.violation.rule}:</span>{' '}
                        {alert.violation.description}
                      </div>
                    )}
                    
                    {alert.resolution && (
                      <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm text-green-700 dark:text-green-400">
                        <span className="font-medium">Giải pháp:</span> {alert.resolution}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex-shrink-0 flex gap-2">
                    {alert.status === 'NEW' && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        Xác nhận
                      </button>
                    )}
                    {(alert.status === 'ACKNOWLEDGED' || alert.status === 'INVESTIGATING') && (
                      <button
                        onClick={() => {
                          setSelectedAlert(alert);
                          setShowResolveModal(true);
                        }}
                        className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1"
                      >
                        <Check className="h-4 w-4" />
                        Giải quyết
                      </button>
                    )}
                    {alert.status !== 'RESOLVED' && alert.status !== 'DISMISSED' && (
                      <button
                        onClick={() => handleDismiss(alert.id)}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        Bỏ qua
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {showResolveModal && selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Giải quyết cảnh báo
            </h3>
            
            <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="font-medium">{selectedAlert.title}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {selectedAlert.characteristicName} - {selectedAlert.processName}
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Giải pháp đã thực hiện <span className="text-red-500">*</span>
              </label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
                aria-label="Giải pháp đã thực hiện"
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Mô tả các hành động đã thực hiện để giải quyết vấn đề..."
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowResolveModal(false);
                  setSelectedAlert(null);
                  setResolution('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolution.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
