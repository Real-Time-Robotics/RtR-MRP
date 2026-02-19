'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Filter,
  Wrench,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Timer,
  ChevronRight,
  Play,
  User,
  Activity,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// MAINTENANCE LIST PAGE
// Danh sách lệnh bảo trì cho technician - Connected to real database
// =============================================================================

interface MaintenanceTask {
  id: string;
  workOrderNumber: string;
  equipmentCode: string;
  equipmentName: string;
  location: string;
  type: 'PM' | 'CM' | 'Emergency' | 'Inspection';
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  description: string;
  dueTime: string;
  dueDate: string | null;
  estimatedMinutes: number;
  createdAt: string;
  assignedTo?: string;
}

interface MaintenanceSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  urgent: number;
}

type FilterStatus = 'all' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export default function MaintenanceListPage() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [summary, setSummary] = useState<MaintenanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Fetch maintenance tasks from API
  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (filterStatus !== 'all') {
          params.set('status', filterStatus.toLowerCase());
        } else {
          params.set('status', 'all');
        }
        if (searchQuery) {
          params.set('search', searchQuery);
        }

        const response = await fetch(`/api/mobile/maintenance?${params.toString()}`);
        const result = await response.json();

        if (result.success) {
          setTasks(result.data);
          setSummary(result.summary);
        } else {
          setError(result.error || 'Failed to fetch maintenance tasks');
        }
      } catch (err) {
        setError('Network error - please try again');
        clientLogger.error('Maintenance fetch error', err);
      } finally {
        setLoading(false);
      }
    }

    // Debounce search
    const timeoutId = setTimeout(fetchTasks, 300);
    return () => clearTimeout(timeoutId);
  }, [filterStatus, searchQuery]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'HIGH': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return 'bg-orange-500 text-white';
      case 'COMPLETED': return 'bg-green-500 text-white';
      case 'ON_HOLD': return 'bg-gray-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return 'Đang làm';
      case 'COMPLETED': return 'Hoàn thành';
      case 'ON_HOLD': return 'Tạm dừng';
      default: return 'Chờ xử lý';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Emergency': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'PM': return <Settings className="w-4 h-4 text-blue-500" />;
      case 'CM': return <Wrench className="w-4 h-4 text-orange-500" />;
      default: return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PM': return 'Bảo trì định kỳ';
      case 'CM': return 'Sửa chữa';
      case 'Emergency': return 'Khẩn cấp';
      default: return 'Kiểm tra';
    }
  };

  const filterButtons: { label: string; value: FilterStatus }[] = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Chờ xử lý', value: 'PENDING' },
    { label: 'Đang làm', value: 'IN_PROGRESS' },
    { label: 'Xong', value: 'COMPLETED' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <Link href="/mobile/technician" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Lệnh bảo trì</h1>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo mã thiết bị, tên..."
              aria-label="Tìm kiếm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilterStatus(btn.value)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                filterStatus === btn.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
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
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500">Không có lệnh bảo trì</p>
          </div>
        ) : (
          tasks.map((task) => (
            <Link
              key={task.id}
              href={`/mobile/technician/maintenance/${task.id}`}
              className="block bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getTypeIcon(task.type)}
                  <span className="font-mono text-sm text-gray-500">{task.workOrderNumber}</span>
                </div>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(task.status))}>
                  {getStatusLabel(task.status)}
                </span>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900 dark:text-white">{task.equipmentCode}</span>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getPriorityColor(task.priority))}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{task.equipmentName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{task.description}</p>

                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Due: {task.dueTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      ~{task.estimatedMinutes} phút
                    </span>
                    <span className="text-gray-400">{task.location}</span>
                  </div>
                </div>

                {task.status === 'PENDING' && (
                  <button className="p-2 bg-green-500 text-white rounded-lg">
                    <Play className="w-4 h-4" />
                  </button>
                )}
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center justify-around">
          <Link href="/mobile/technician" className="flex flex-col items-center gap-1 text-gray-400">
            <Activity className="w-5 h-5" />
            <span className="text-xs">Home</span>
          </Link>
          <Link href="/mobile/technician/maintenance" className="flex flex-col items-center gap-1 text-blue-600">
            <Wrench className="w-5 h-5" />
            <span className="text-xs">Tasks</span>
          </Link>
          <Link href="/mobile/technician/equipment" className="flex flex-col items-center gap-1 text-gray-400">
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
