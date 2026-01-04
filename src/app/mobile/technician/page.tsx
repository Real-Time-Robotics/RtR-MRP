'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  Clock,
  LogIn,
  LogOut,
  Wrench,
  CheckCircle,
  AlertTriangle,
  Settings,
  QrCode,
  ChevronRight,
  AlertCircle,
  Timer,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TECHNICIAN MOBILE DASHBOARD
// Dashboard chính cho kỹ thuật viên bảo trì
// =============================================================================

interface TechnicianStats {
  pendingTasks: number;
  completedToday: number;
  downtimeReports: number;
  equipmentAssigned: number;
}

interface MaintenanceTask {
  id: string;
  equipmentCode: string;
  equipmentName: string;
  type: 'PM' | 'CM' | 'Emergency' | 'Inspection';
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
  description: string;
  dueTime: string;
  estimatedMinutes: number;
}

interface CurrentTask {
  id: string;
  equipmentCode: string;
  equipmentName: string;
  type: string;
  startTime: string;
  progress: number;
}

// Mock data
const mockStats: TechnicianStats = {
  pendingTasks: 5,
  completedToday: 3,
  downtimeReports: 2,
  equipmentAssigned: 8,
};

const mockCurrentTask: CurrentTask | null = {
  id: '1',
  equipmentCode: 'CNC-001',
  equipmentName: 'CNC Mill #1',
  type: 'Bảo trì định kỳ',
  startTime: '08:30',
  progress: 65,
};

const mockPendingTasks: MaintenanceTask[] = [
  {
    id: '2',
    equipmentCode: 'ROBOT-001',
    equipmentName: 'Welding Robot',
    type: 'Emergency',
    priority: 'URGENT',
    description: 'Lỗi servo motor arm #2',
    dueTime: '10:00',
    estimatedMinutes: 45,
  },
  {
    id: '3',
    equipmentCode: 'PACK-001',
    equipmentName: 'Packaging Line',
    type: 'Inspection',
    priority: 'NORMAL',
    description: 'Kiểm tra an toàn định kỳ',
    dueTime: '14:00',
    estimatedMinutes: 30,
  },
];

export default function TechnicianDashboard() {
  const [stats, setStats] = useState<TechnicianStats>(mockStats);
  const [currentTask, setCurrentTask] = useState<CurrentTask | null>(mockCurrentTask);
  const [pendingTasks, setPendingTasks] = useState<MaintenanceTask[]>(mockPendingTasks);
  const [clockedIn, setClockedIn] = useState(true);
  const [clockInTime, setClockInTime] = useState('06:00');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleClockToggle = () => {
    if (clockedIn) {
      setClockedIn(false);
    } else {
      setClockedIn(true);
      const now = new Date();
      setClockInTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'HIGH': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Xin chào, Nguyễn Văn Minh</h1>
              <p className="text-sm text-blue-100">NV-001 • Kỹ thuật viên bảo trì</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{currentTime}</p>
          </div>
        </div>

        {/* Clock In/Out */}
        <button
          onClick={handleClockToggle}
          className={cn(
            'w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all',
            clockedIn
              ? 'bg-white/20 text-white hover:bg-white/30'
              : 'bg-green-500 text-white hover:bg-green-600'
          )}
        >
          {clockedIn ? (
            <>
              <LogOut className="w-5 h-5" />
              Clock Out • Đã vào ca từ {clockInTime}
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              Clock In
            </>
          )}
        </button>
      </div>

      {/* Current Task */}
      {currentTask && (
        <div className="px-4 -mt-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 border-l-4 border-orange-500">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
              <Activity className="w-4 h-4" />
              <span className="text-sm font-semibold">Đang thực hiện</span>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white">{currentTask.equipmentCode}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{currentTask.type}</p>

            {/* Progress */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-500">Tiến độ</span>
                <span className="font-semibold text-gray-900 dark:text-white">{currentTask.progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all"
                  style={{ width: `${currentTask.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="px-4 mt-4">
        <div className="grid grid-cols-4 gap-3">
          <Link href="/mobile/technician/maintenance" className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{stats.pendingTasks}</p>
            <p className="text-xs text-gray-500">Tasks</p>
          </Link>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-600">{stats.completedToday}</p>
            <p className="text-xs text-gray-500">Done</p>
          </div>
          <Link href="/mobile/technician/downtime" className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-red-600">{stats.downtimeReports}</p>
            <p className="text-xs text-gray-500">Down</p>
          </Link>
          <Link href="/mobile/technician/equipment" className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-purple-600">{stats.equipmentAssigned}</p>
            <p className="text-xs text-gray-500">Equip</p>
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mt-4">
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/mobile/technician/downtime/new"
            className="bg-red-500 text-white rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm"
          >
            <AlertTriangle className="w-6 h-6" />
            <span className="text-sm font-medium">Báo lỗi</span>
          </Link>
          <Link
            href="/mobile/scan"
            className="bg-blue-500 text-white rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm"
          >
            <QrCode className="w-6 h-6" />
            <span className="text-sm font-medium">Scan QR</span>
          </Link>
          <Link
            href="/mobile/technician/equipment"
            className="bg-purple-500 text-white rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm"
          >
            <Settings className="w-6 h-6" />
            <span className="text-sm font-medium">Thiết bị</span>
          </Link>
        </div>
      </div>

      {/* Pending Tasks */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900 dark:text-white">Công việc chờ xử lý</h2>
          <Link href="/mobile/technician/maintenance" className="text-sm text-blue-600 flex items-center gap-1">
            Xem tất cả <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="space-y-3">
          {pendingTasks.map((task) => (
            <Link
              key={task.id}
              href={`/mobile/technician/maintenance/${task.id}`}
              className="block bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">{getTypeIcon(task.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">{task.equipmentCode}</span>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getPriorityColor(task.priority))}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{task.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {task.dueTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      ~{task.estimatedMinutes} phút
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center justify-around">
          <Link href="/mobile/technician" className="flex flex-col items-center gap-1 text-blue-600">
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
