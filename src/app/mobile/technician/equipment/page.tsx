'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Settings,
  Activity,
  AlertTriangle,
  CheckCircle,
  Pause,
  Wrench,
  User,
  Gauge,
  Clock,
  Calendar,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// EQUIPMENT STATUS PAGE
// Trạng thái thiết bị cho technician - Connected to real database
// =============================================================================

interface Equipment {
  id: string;
  code: string;
  name: string;
  type: string;
  location: string;
  status: 'RUNNING' | 'IDLE' | 'DOWN' | 'MAINTENANCE';
  oee: number;
  runningHours: number;
  nextPM: string | null;
  lastIssue?: string;
  workCenter?: string;
  criticality?: string;
}

interface EquipmentSummary {
  total: number;
  running: number;
  idle: number;
  down: number;
  maintenance: number;
}

type FilterStatus = 'all' | 'RUNNING' | 'IDLE' | 'DOWN' | 'MAINTENANCE';

export default function EquipmentStatusPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [summary, setSummary] = useState<EquipmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Fetch equipment from API
  useEffect(() => {
    async function fetchEquipment() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (filterStatus !== 'all') {
          params.set('status', filterStatus);
        }
        if (searchQuery) {
          params.set('search', searchQuery);
        }

        const response = await fetch(`/api/mobile/equipment?${params.toString()}`);
        const result = await response.json();

        if (result.success) {
          setEquipment(result.data);
          setSummary(result.summary);
        } else {
          setError(result.error || 'Failed to fetch equipment');
        }
      } catch (err) {
        setError('Network error - please try again');
        clientLogger.error('Equipment fetch error', err);
      } finally {
        setLoading(false);
      }
    }

    // Debounce search
    const timeoutId = setTimeout(fetchEquipment, 300);
    return () => clearTimeout(timeoutId);
  }, [filterStatus, searchQuery]);

  // Status counts from API summary
  const statusCounts = {
    all: summary?.total || equipment.length,
    RUNNING: summary?.running || equipment.filter((e) => e.status === 'RUNNING').length,
    IDLE: summary?.idle || equipment.filter((e) => e.status === 'IDLE').length,
    DOWN: summary?.down || equipment.filter((e) => e.status === 'DOWN').length,
    MAINTENANCE: summary?.maintenance || equipment.filter((e) => e.status === 'MAINTENANCE').length,
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Đang chạy' };
      case 'IDLE':
        return { icon: <Pause className="w-4 h-4" />, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Nghỉ' };
      case 'DOWN':
        return { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Ngừng' };
      case 'MAINTENANCE':
        return { icon: <Wrench className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Bảo trì' };
      default:
        return { icon: <Settings className="w-4 h-4" />, color: 'text-gray-600', bg: 'bg-gray-100', label: status };
    }
  };

  const getOEEColor = (oee: number) => {
    if (oee >= 85) return 'text-green-600';
    if (oee >= 70) return 'text-blue-600';
    if (oee >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filterButtons: { label: string; value: FilterStatus; count: number }[] = [
    { label: 'Tất cả', value: 'all', count: statusCounts.all },
    { label: 'Chạy', value: 'RUNNING', count: statusCounts.RUNNING },
    { label: 'Nghỉ', value: 'IDLE', count: statusCounts.IDLE },
    { label: 'Ngừng', value: 'DOWN', count: statusCounts.DOWN },
    { label: 'Bảo trì', value: 'MAINTENANCE', count: statusCounts.MAINTENANCE },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <Link href="/mobile/technician" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Trạng thái thiết bị</h1>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo mã, tên thiết bị..."
              aria-label="Tìm kiếm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Status Summary */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilterStatus(btn.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1',
                filterStatus === btn.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              )}
            >
              {btn.label}
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-xs',
                filterStatus === btn.value ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-600'
              )}>
                {btn.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Equipment List */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 mx-auto text-blue-500 animate-spin mb-3" />
            <p className="text-gray-500">Đang tải dữ liệu...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 mx-auto text-red-400 mb-3" />
            <p className="text-red-500">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
            >
              Thử lại
            </button>
          </div>
        ) : equipment.length === 0 ? (
          <div className="text-center py-12">
            <Settings className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500">Không tìm thấy thiết bị</p>
          </div>
        ) : (
          equipment.map((eq) => {
            const statusConfig = getStatusConfig(eq.status);
            return (
              <div
                key={eq.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white">{eq.code}</span>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1', statusConfig.bg, statusConfig.color)}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{eq.name}</p>
                    <p className="text-xs text-gray-400">{eq.location} • {eq.type}</p>
                  </div>
                </div>

                {/* Last Issue */}
                {eq.lastIssue && (
                  <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      {eq.lastIssue}
                    </p>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Gauge className="w-4 h-4 text-gray-400" />
                      <span className={cn('text-lg font-bold', getOEEColor(eq.oee))}>{eq.oee}%</span>
                    </div>
                    <p className="text-xs text-gray-400">OEE</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{eq.runningHours.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-400">Hours</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {eq.nextPM ? eq.nextPM.slice(5) : 'N/A'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">Next PM</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/mobile/technician/downtime/new?equipment=${eq.code}`}
                    className="flex-1 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium text-center"
                  >
                    Báo lỗi
                  </Link>
                  <Link
                    href={`/mobile/technician/equipment/${eq.id}`}
                    className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium text-center flex items-center justify-center gap-1"
                  >
                    Chi tiết <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center justify-around">
          <Link href="/mobile/technician" className="flex flex-col items-center gap-1 text-gray-400">
            <Activity className="w-5 h-5" />
            <span className="text-xs">Home</span>
          </Link>
          <Link href="/mobile/technician/maintenance" className="flex flex-col items-center gap-1 text-gray-400">
            <Wrench className="w-5 h-5" />
            <span className="text-xs">Tasks</span>
          </Link>
          <Link href="/mobile/technician/equipment" className="flex flex-col items-center gap-1 text-blue-600">
            <Settings className="w-5 h-5" />
            <span className="text-xs">Thiết bị</span>
          </Link>
          <Link href="/mobile/settings" className="flex flex-col items-center gap-1 text-gray-400">
            <User className="w-5 h-5" />
            <span className="text-xs">Tài khoản</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
