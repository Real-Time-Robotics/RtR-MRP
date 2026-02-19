'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell,
  Mail,
  Volume2,
  Smartphone,
  Clock,
  Save,
  RefreshCw,
  Check,
  AlertCircle,
  ShoppingCart,
  Package,
  AlertTriangle,
  AtSign,
  ClipboardCheck,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';

interface NotificationSettings {
  email: {
    enabled: boolean;
    onOrder: boolean;
    onStock: boolean;
    onQuality: boolean;
    onMention: boolean;
    onApproval: boolean;
  };
  push: {
    enabled: boolean;
  };
  inApp: {
    sound: boolean;
    desktop: boolean;
  };
  digest: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'never';
  };
}

const defaultSettings: NotificationSettings = {
  email: {
    enabled: true,
    onOrder: true,
    onStock: true,
    onQuality: true,
    onMention: true,
    onApproval: true,
  },
  push: {
    enabled: false,
  },
  inApp: {
    sound: true,
    desktop: true,
  },
  digest: {
    enabled: false,
    frequency: 'never',
  },
};

export default function NotificationSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<NotificationSettings>(defaultSettings);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/notifications/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setSettings(data.data);
            setOriginalSettings(data.data);
          }
        }
      } catch (error) {
        clientLogger.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Track changes
  useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings));
  }, [settings, originalSettings]);

  // Update a setting
  const updateSetting = <T extends keyof NotificationSettings>(
    category: T,
    key: keyof NotificationSettings[T],
    value: boolean | string
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  // Save settings
  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();

      if (data.success) {
        setOriginalSettings(settings);
        toast({
          title: 'Đã lưu',
          description: 'Cài đặt thông báo đã được cập nhật',
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu cài đặt',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setSettings(defaultSettings);
  };

  // Request desktop notification permission
  const requestDesktopPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        updateSetting('inApp', 'desktop', true);
        toast({
          title: 'Đã bật',
          description: 'Thông báo trên desktop đã được kích hoạt',
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="container py-6 space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Cài đặt thông báo
          </h1>
          <p className="text-muted-foreground">
            Quản lý cách bạn nhận thông báo từ hệ thống
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetToDefaults} disabled={saving}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Mặc định
          </Button>
          <Button onClick={saveSettings} disabled={!hasChanges || saving}>
            {saving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Bạn có thay đổi chưa lưu
          </p>
        </div>
      )}

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email
          </CardTitle>
          <CardDescription>
            Cấu hình thông báo qua email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Bật thông báo email</Label>
              <p className="text-sm text-muted-foreground">
                Nhận thông báo quan trọng qua email
              </p>
            </div>
            <Switch
              checked={settings.email.enabled}
              onCheckedChange={(v) => updateSetting('email', 'enabled', v)}
            />
          </div>

          {settings.email.enabled && (
            <>
              <Separator />
              <div className="space-y-4 pl-4 border-l-2 border-muted">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                    <Label>Đơn hàng</Label>
                  </div>
                  <Switch
                    checked={settings.email.onOrder}
                    onCheckedChange={(v) => updateSetting('email', 'onOrder', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <Label>Tồn kho</Label>
                  </div>
                  <Switch
                    checked={settings.email.onStock}
                    onCheckedChange={(v) => updateSetting('email', 'onStock', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                    <Label>Chất lượng</Label>
                  </div>
                  <Switch
                    checked={settings.email.onQuality}
                    onCheckedChange={(v) => updateSetting('email', 'onQuality', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AtSign className="w-4 h-4 text-muted-foreground" />
                    <Label>Đề cập (@mention)</Label>
                  </div>
                  <Switch
                    checked={settings.email.onMention}
                    onCheckedChange={(v) => updateSetting('email', 'onMention', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
                    <Label>Yêu cầu phê duyệt</Label>
                  </div>
                  <Switch
                    checked={settings.email.onApproval}
                    onCheckedChange={(v) => updateSetting('email', 'onApproval', v)}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Thông báo đẩy trên thiết bị di động (sắp ra mắt)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Bật push notification</Label>
              <p className="text-sm text-muted-foreground">
                Tính năng này đang được phát triển
              </p>
            </div>
            <Switch
              checked={settings.push.enabled}
              onCheckedChange={(v) => updateSetting('push', 'enabled', v)}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Trong ứng dụng
          </CardTitle>
          <CardDescription>
            Cấu hình thông báo trong ứng dụng
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label>Âm thanh</Label>
                <p className="text-sm text-muted-foreground">
                  Phát âm thanh khi có thông báo mới
                </p>
              </div>
            </div>
            <Switch
              checked={settings.inApp.sound}
              onCheckedChange={(v) => updateSetting('inApp', 'sound', v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Thông báo desktop</Label>
              <p className="text-sm text-muted-foreground">
                Hiển thị thông báo trên màn hình desktop
              </p>
            </div>
            <div className="flex items-center gap-2">
              {typeof window !== 'undefined' &&
                'Notification' in window &&
                Notification.permission !== 'granted' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={requestDesktopPermission}
                  >
                    Yêu cầu quyền
                  </Button>
                )}
              <Switch
                checked={settings.inApp.desktop}
                onCheckedChange={(v) => updateSetting('inApp', 'desktop', v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Digest */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Tổng hợp (Digest)
          </CardTitle>
          <CardDescription>
            Nhận email tổng hợp thay vì từng thông báo riêng lẻ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Bật email tổng hợp</Label>
              <p className="text-sm text-muted-foreground">
                Gom nhiều thông báo vào một email
              </p>
            </div>
            <Switch
              checked={settings.digest.enabled}
              onCheckedChange={(v) => updateSetting('digest', 'enabled', v)}
            />
          </div>

          {settings.digest.enabled && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <Label>Tần suất</Label>
                <Select
                  value={settings.digest.frequency}
                  onValueChange={(v) =>
                    updateSetting('digest', 'frequency', v as 'daily' | 'weekly' | 'never')
                  }
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Hàng ngày</SelectItem>
                    <SelectItem value="weekly">Hàng tuần</SelectItem>
                    <SelectItem value="never">Không bao giờ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
