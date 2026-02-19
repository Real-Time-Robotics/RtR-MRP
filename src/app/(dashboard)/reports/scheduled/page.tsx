'use client';

// src/app/(dashboard)/reports/scheduled/page.tsx
// Scheduled Reports Management Page

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  Mail,
  Plus,
  Trash2,
  Edit,
  Play,
  Pause,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { SCHEDULED_REPORT_TEMPLATES } from '@/lib/reports/report-templates';
import { clientLogger } from '@/lib/client-logger';

interface Schedule {
  id: string;
  name: string;
  report: {
    id: string;
    name: string;
    nameVi: string;
    type: string;
  };
  frequency: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  time: string;
  outputFormat: string;
  recipients: { email: string; type: string }[];
  isActive: boolean;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  nextRunAt: string | null;
  runCount: number;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Hàng ngày',
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
};

const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

export default function ScheduledReportsPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formTemplate, setFormTemplate] = useState('');
  const [formFrequency, setFormFrequency] = useState('daily');
  const [formDayOfWeek, setFormDayOfWeek] = useState('0');
  const [formDayOfMonth, setFormDayOfMonth] = useState('1');
  const [formTime, setFormTime] = useState('07:00');
  const [formFormat, setFormFormat] = useState('PDF');
  const [formRecipients, setFormRecipients] = useState('');

  // Fetch schedules
  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/reports/schedule');
      const data = await res.json();
      if (data.success) {
        setSchedules(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Không thể tải danh sách lịch báo cáo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formName || !formTemplate || !formRecipients) return;

    setIsCreating(true);
    try {
      const res = await fetch('/api/reports/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          templateId: formTemplate,
          frequency: formFrequency.toUpperCase(),
          dayOfWeek: formFrequency === 'weekly' ? parseInt(formDayOfWeek) : undefined,
          dayOfMonth: formFrequency === 'monthly' ? parseInt(formDayOfMonth) : undefined,
          timeOfDay: formTime,
          format: formFormat,
          recipients: formRecipients.split(',').map((e) => e.trim()).filter(Boolean),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsCreateOpen(false);
        resetForm();
        fetchSchedules();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Không thể tạo lịch báo cáo');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (scheduleId: string, isActive: boolean) => {
    try {
      const res = await fetch('/api/reports/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId, enabled: isActive }),
      });

      if (res.ok) {
        setSchedules((prev) =>
          prev.map((s) => (s.id === scheduleId ? { ...s, isActive } : s))
        );
      }
    } catch (err) {
      clientLogger.error('Failed to toggle schedule:', err);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Bạn có chắc muốn xóa lịch báo cáo này?')) return;

    try {
      const res = await fetch(`/api/reports/schedule?id=${scheduleId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
      }
    } catch (err) {
      clientLogger.error('Failed to delete schedule:', err);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormTemplate('');
    setFormFrequency('daily');
    setFormDayOfWeek('0');
    setFormDayOfMonth('1');
    setFormTime('07:00');
    setFormFormat('PDF');
    setFormRecipients('');
  };

  const getFrequencyLabel = (schedule: Schedule): string => {
    const base = FREQUENCY_LABELS[schedule.frequency] || schedule.frequency;
    if (schedule.frequency === 'weekly' && schedule.dayOfWeek !== null) {
      return `${base} (${DAY_LABELS[schedule.dayOfWeek]})`;
    }
    if (schedule.frequency === 'monthly' && schedule.dayOfMonth !== null) {
      return `${base} (ngày ${schedule.dayOfMonth})`;
    }
    return base;
  };

  if (isLoading) {
    return (
      <div className="container py-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="ghost" size="icon" aria-label="Quay lại">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Lịch gửi báo cáo
            </h1>
            <p className="text-muted-foreground">
              Quản lý báo cáo tự động gửi qua email
            </p>
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Tạo lịch mới
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Tạo lịch gửi báo cáo</DialogTitle>
              <DialogDescription>
                Thiết lập báo cáo tự động gửi qua email
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tên lịch</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="VD: Báo cáo tồn kho hàng ngày"
                />
              </div>
              <div className="space-y-2">
                <Label>Loại báo cáo</Label>
                <Select value={formTemplate} onValueChange={setFormTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại báo cáo" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULED_REPORT_TEMPLATES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nameVi}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tần suất</Label>
                  <Select value={formFrequency} onValueChange={setFormFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Hàng ngày</SelectItem>
                      <SelectItem value="weekly">Hàng tuần</SelectItem>
                      <SelectItem value="monthly">Hàng tháng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Giờ gửi</Label>
                  <Input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                  />
                </div>
              </div>
              {formFrequency === 'weekly' && (
                <div className="space-y-2">
                  <Label>Ngày trong tuần</Label>
                  <Select value={formDayOfWeek} onValueChange={setFormDayOfWeek}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_LABELS.map((day, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {formFrequency === 'monthly' && (
                <div className="space-y-2">
                  <Label>Ngày trong tháng</Label>
                  <Select value={formDayOfMonth} onValueChange={setFormDayOfMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          Ngày {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Định dạng</Label>
                <Select value={formFormat} onValueChange={setFormFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="EXCEL">Excel</SelectItem>
                    <SelectItem value="BOTH">Cả hai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Người nhận (email, phân cách bằng dấu phẩy)</Label>
                <Input
                  value={formRecipients}
                  onChange={(e) => setFormRecipients(e.target.value)}
                  placeholder="email1@company.com, email2@company.com"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Hủy
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!formName || !formTemplate || !formRecipients || isCreating}
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Tạo lịch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Schedule List */}
      {schedules.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Chưa có lịch gửi báo cáo</h3>
              <p className="text-muted-foreground mt-1">
                Tạo lịch để tự động gửi báo cáo qua email
              </p>
              <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Tạo lịch đầu tiên
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6 text-primary-600" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{schedule.name}</h4>
                      <Badge variant={schedule.isActive ? 'default' : 'secondary'}>
                        {schedule.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getFrequencyLabel(schedule)} lúc {schedule.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {schedule.recipients.length} người nhận
                      </span>
                      <span>{schedule.outputFormat.toUpperCase()}</span>
                    </div>
                    {schedule.nextRunAt && schedule.isActive && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Lần gửi tiếp theo:{' '}
                        {format(new Date(schedule.nextRunAt), "HH:mm 'ngày' dd/MM/yyyy", {
                          locale: vi,
                        })}
                      </p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium">{schedule.runCount}</div>
                      <div className="text-xs text-muted-foreground">Đã gửi</div>
                    </div>
                    {schedule.lastRunStatus && (
                      <div className="flex items-center gap-1">
                        {schedule.lastRunStatus === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-success-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-danger-600" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={schedule.isActive}
                      onCheckedChange={(checked) =>
                        handleToggleActive(schedule.id, checked)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(schedule.id)}
                      aria-label="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
