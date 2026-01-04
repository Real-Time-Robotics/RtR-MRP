'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle,
  Timer,
  Settings,
  Activity,
  Wrench,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// DOWNTIME LIST PAGE
// Lịch sử downtime cho technician
// =============================================================================

interface DowntimeRecord {
  id: string;
  equipmentCode: string;
  equipmentName: string;
  category: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'OBSERVATION';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  description: string;
  reportedAt: string;
  resolvedAt?: string;
  duration?: number; // minutes
  reportedBy: string;
}

const mockDowntime: DowntimeRecord[] = [
  {
    id: '1',
    equipmentCode: 'ROBOT-001',
    equipmentName: 'Welding Robot',
    category: 'Electrical',
    severity: 'CRITICAL',
    status: 'OPEN',
    description: 'Servo motor arm #2 không phản hồi',
    reportedAt: '2026-01-04T08:30:00',
    reportedBy: 'Nguyễn Văn Minh',
  },
  {
    id: '2',
    equipmentCode: 'CONV-002',
    equipmentName: 'Conveyor Belt #2',
    category: 'Mechanical',
    severity: 'MAJOR',
    status: 'IN_PROGRESS',
    description: 'Belt bị mòn, cần thay thế',
    reportedAt: '2026-01-04T07:00:00',
    reportedBy: 'Trần Văn An',
  },
  {
    id: '3',
    equipmentCode: 'CNC-001',
    equipmentName: 'CNC Mill #1',
    category: 'Lubrication',
    severity: 'MINOR',
    status: 'RESOLVED',
    description: 'Dầu bôi trơn cần bổ sung',
    reportedAt: '2026-01-03T14:00:00',
    resolvedAt: '2026-01-03T15:30:00',
    duration: 90,
    reportedBy: 'Nguyễn Văn Minh',
  },
  {
    id: '4',
    equipmentCode: 'PACK-001',
    equipmentName: 'Packaging Line',
    category: 'Sensor',
    severity: 'OBSERVATION',
    status: 'RESOLVED',
    description: 'Cảm biến position đôi khi báo sai',
    reportedAt: '2026-01-02T10:00:00',
    resolvedAt: '2026-01-02T12:00:00',
    duration: 120,
    reportedBy: 'Lê Thị Hoa',
  },
];

type FilterStatus = 'all' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export default function DowntimeListPage() {
  const [records] = useState<DowntimeRecord[]>(mockDowntime);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const filteredRecords = records.filter((record) => {
    return filterStatus === 'all' || record.status === filterStatus;
  });

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Nghiêm trọng' };
      case 'MAJOR':
        return { color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', label: 'Lớn' };
      case 'MINOR':
        return { color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Nhỏ' };
      default:
        return { color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Quan sát' };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-600', bg: 'bg-red-500', label: 'Mở' };
      case 'IN_PROGRESS':
        return { icon: <Timer className="w-4 h-4" />, color: 'text-orange-600', bg: 'bg-orange-500', label: 'Đang xử lý' };
      default:
        return { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-500', label: 'Đã xử lý' };
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const filterButtons: { label: string; value: FilterStatus }[] = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Mở', value: 'OPEN' },
    { label: 'Đang xử lý', value: 'IN_PROGRESS' },
    { label: 'Đã xử lý', value: 'RESOLVED' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link href="/mobile/technician" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Lịch sử Downtime</h1>
          </div>
          <Link
            href="/mobile/technician/downtime/new"
            className="p-2 bg-red-500 text-white rounded-lg"
          >
            <Plus className="w-5 h-5" />
          </Link>
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

      {/* Records List */}
      <div className="p-4 space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500">Không có downtime record</p>
          </div>
        ) : (
          filteredRecords.map((record) => {
            const severityConfig = getSeverityConfig(record.severity);
            const statusConfig = getStatusConfig(record.status);
            return (
              <div
                key={record.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white">{record.equipmentCode}</span>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium text-white', statusConfig.bg)}>
                      {statusConfig.label}
                    </span>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', severityConfig.bg, severityConfig.color)}>
                    {severityConfig.label}
                  </span>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400">{record.equipmentName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{record.description}</p>

                <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(record.reportedAt)}
                  </span>
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{record.category}</span>
                  {record.duration && (
                    <span className="flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      {formatDuration(record.duration)}
                    </span>
                  )}
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
