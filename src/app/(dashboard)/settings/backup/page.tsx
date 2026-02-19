'use client';

// src/app/(dashboard)/settings/backup/page.tsx
// Backup & Recovery Settings Page

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Database,
  Download,
  Upload,
  Clock,
  HardDrive,
  Trash2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Calendar,
  Shield,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Backup {
  id: string;
  name: string;
  type: 'MANUAL' | 'AUTO' | 'PRE_UPDATE';
  status: string;
  filePath: string | null;
  fileSize: number | null;
  tables: number | null;
  records: number | null;
  duration: number | null;
  createdAt: string;
  createdBy: string;
}

interface BackupSchedule {
  id: string;
  enabled: boolean;
  frequency: string;
  timeOfDay: string;
  retention: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  MANUAL: { label: 'Thủ công', color: 'bg-blue-100 text-blue-700' },
  AUTO: { label: 'Tự động', color: 'bg-green-100 text-green-700' },
  PRE_UPDATE: { label: 'Trước cập nhật', color: 'bg-yellow-100 text-yellow-700' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  IN_PROGRESS: { label: 'Đang chạy', color: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Hoàn thành', color: 'bg-green-100 text-green-700' },
  FAILED: { label: 'Thất bại', color: 'bg-red-100 text-red-700' },
};

export default function BackupSettingsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmDownloadId, setConfirmDownloadId] = useState<string | null>(null);

  // Schedule form state
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [scheduleFrequency, setScheduleFrequency] = useState('DAILY');
  const [scheduleTime, setScheduleTime] = useState('02:00');
  const [scheduleRetention, setScheduleRetention] = useState(30);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [backupsRes, scheduleRes] = await Promise.all([
        fetch('/api/backup'),
        fetch('/api/backup/schedule'),
      ]);

      const backupsData = await backupsRes.json();
      const scheduleData = await scheduleRes.json();

      if (backupsData.success) {
        setBackups(backupsData.data);
      }

      if (scheduleData.success && scheduleData.data) {
        setSchedule(scheduleData.data);
        setScheduleEnabled(scheduleData.data.enabled);
        setScheduleFrequency(scheduleData.data.frequency);
        setScheduleTime(scheduleData.data.timeOfDay);
        setScheduleRetention(scheduleData.data.retention);
      }
    } catch (err) {
      setError('Không thể tải dữ liệu backup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'MANUAL' }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMessage('Backup thành công!');
        fetchData();
      } else {
        setError(data.error || 'Backup thất bại');
      }
    } catch (err) {
      setError('Không thể tạo backup');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveSchedule = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/backup/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: scheduleEnabled,
          frequency: scheduleFrequency,
          timeOfDay: scheduleTime,
          retention: scheduleRetention,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMessage('Đã lưu cài đặt lịch backup');
        setSchedule(data.data);
      } else {
        setError(data.error || 'Không thể lưu cài đặt');
      }
    } catch (err) {
      setError('Không thể lưu cài đặt');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Xóa các backup cũ theo chính sách retention?')) return;

    setIsCleaningUp(true);
    setError(null);

    try {
      const res = await fetch('/api/backup', { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        setSuccessMessage(`Đã xóa ${data.data.deletedCount} backup cũ`);
        fetchData();
      } else {
        setError(data.error || 'Cleanup thất bại');
      }
    } catch (err) {
      setError('Không thể dọn dẹp backup');
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleDownload = (backupId: string) => {
    window.open(`/api/backup/${backupId}?download=true`, '_blank');
    setConfirmDownloadId(null);
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="container py-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon" aria-label="Quay lại">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="w-6 h-6" />
              Backup & Recovery
            </h1>
            <p className="text-muted-foreground">
              Quản lý sao lưu và phục hồi dữ liệu
            </p>
          </div>
        </div>
        <Button onClick={handleCreateBackup} disabled={isCreating}>
          {isCreating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <HardDrive className="w-4 h-4 mr-2" />
          )}
          Tạo Backup ngay
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle className="w-5 h-5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng backup</p>
                <p className="text-2xl font-bold">{backups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Thành công</p>
                <p className="text-2xl font-bold">
                  {backups.filter((b) => b.status === 'COMPLETED').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <HardDrive className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng dung lượng</p>
                <p className="text-2xl font-bold">
                  {formatFileSize(
                    backups.reduce((sum, b) => sum + (b.fileSize || 0), 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Retention</p>
                <p className="text-2xl font-bold">{scheduleRetention} ngày</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule Settings */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Lịch Backup Tự Động
            </CardTitle>
            <CardDescription>
              Cấu hình backup tự động theo lịch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Kích hoạt</Label>
              <Switch
                checked={scheduleEnabled}
                onCheckedChange={setScheduleEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label>Tần suất</Label>
              <Select
                value={scheduleFrequency}
                onValueChange={setScheduleFrequency}
                disabled={!scheduleEnabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Hàng ngày</SelectItem>
                  <SelectItem value="WEEKLY">Hàng tuần</SelectItem>
                  <SelectItem value="MONTHLY">Hàng tháng</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Giờ chạy</Label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                disabled={!scheduleEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label>Retention (ngày)</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={scheduleRetention}
                onChange={(e) => setScheduleRetention(parseInt(e.target.value) || 30)}
              />
              <p className="text-xs text-muted-foreground">
                Backup tự động cũ hơn sẽ bị xóa
              </p>
            </div>

            <div className="pt-4 space-y-2">
              <Button
                className="w-full"
                onClick={handleSaveSchedule}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4 mr-2" />
                )}
                Lưu cài đặt
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleCleanup}
                disabled={isCleaningUp}
              >
                {isCleaningUp ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Dọn dẹp backup cũ
              </Button>
            </div>

            {schedule?.nextRunAt && scheduleEnabled && (
              <div className="pt-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 inline mr-1" />
                Backup tiếp theo:{' '}
                {format(new Date(schedule.nextRunAt), "HH:mm 'ngày' dd/MM", {
                  locale: vi,
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backup History */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Lịch sử Backup</CardTitle>
              <CardDescription>Danh sách các bản backup đã tạo</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Làm mới
            </Button>
          </CardHeader>
          <CardContent>
            {backups.length === 0 ? (
              <div className="text-center py-8">
                <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Chưa có backup nào</p>
                <Button className="mt-4" onClick={handleCreateBackup}>
                  Tạo backup đầu tiên
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Kích thước</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell className="font-medium">
                        {backup.name}
                        {backup.tables && backup.records && (
                          <p className="text-xs text-muted-foreground">
                            {backup.tables} bảng, {backup.records.toLocaleString()} bản ghi
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(TYPE_LABELS[backup.type]?.color)}
                        >
                          {TYPE_LABELS[backup.type]?.label || backup.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(STATUS_LABELS[backup.status]?.color)}
                        >
                          {STATUS_LABELS[backup.status]?.label || backup.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatFileSize(backup.fileSize)}</TableCell>
                      <TableCell>
                        {format(new Date(backup.createdAt), 'HH:mm dd/MM/yyyy', {
                          locale: vi,
                        })}
                        {backup.duration && (
                          <p className="text-xs text-muted-foreground">
                            {backup.duration}s
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {backup.status === 'COMPLETED' && backup.filePath && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDownloadId(backup.id)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Download Confirmation Dialog */}
      <Dialog
        open={!!confirmDownloadId}
        onOpenChange={() => setConfirmDownloadId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tải xuống backup</DialogTitle>
            <DialogDescription>
              Bạn có muốn tải xuống file backup này? File chứa dữ liệu nhạy cảm,
              vui lòng bảo quản cẩn thận.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDownloadId(null)}>
              Hủy
            </Button>
            <Button onClick={() => handleDownload(confirmDownloadId!)}>
              <Download className="w-4 h-4 mr-2" />
              Tải xuống
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
