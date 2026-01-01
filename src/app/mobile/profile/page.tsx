"use client";

import { useState, useEffect } from "react";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Settings,
  Bell,
  Vibrate,
  Volume2,
  Wifi,
  WifiOff,
  Cloud,
  Database,
  RefreshCw,
  Trash2,
  LogOut,
  Download,
  HardDrive,
  Loader2,
} from "lucide-react";
import {
  getCacheStats,
  clearCache,
  refreshCache,
  syncPendingOperations,
  isOnline,
  getSetting,
  setSetting,
  canInstall,
  showInstallPrompt,
  getStorageEstimate,
} from "@/lib/mobile";
import { haptic, feedback } from "@/lib/mobile/haptics";
import { signOut, useSession } from "next-auth/react";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState({
    hapticFeedback: true,
    soundFeedback: true,
    autoSync: true,
    notifications: true,
  });
  const [cacheStats, setCacheStats] = useState({
    parts: 0,
    locations: 0,
    workOrders: 0,
    pendingOps: 0,
    scans: 0,
    pickLists: 0,
  });
  const [storage, setStorage] = useState<{
    usage: number;
    quota: number;
    percentUsed: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [online, setOnline] = useState(true);
  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    loadData();
    setOnline(isOnline());
    setInstallable(canInstall());

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const loadData = async () => {
    try {
      const [stats, storageEst, hapticSetting, soundSetting, autoSyncSetting] =
        await Promise.all([
          getCacheStats(),
          getStorageEstimate(),
          getSetting<boolean>("hapticFeedback"),
          getSetting<boolean>("soundFeedback"),
          getSetting<boolean>("autoSync"),
        ]);

      setCacheStats(stats);
      setStorage(storageEst);
      setSettings((prev) => ({
        ...prev,
        hapticFeedback: hapticSetting ?? true,
        soundFeedback: soundSetting ?? true,
        autoSync: autoSyncSetting ?? true,
      }));
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  };

  const handleSettingChange = async (
    key: keyof typeof settings,
    value: boolean
  ) => {
    haptic("selection");
    setSettings((prev) => ({ ...prev, [key]: value }));
    await setSetting(key, value);
  };

  const handleRefreshCache = async () => {
    haptic("light");
    setIsLoading(true);
    try {
      await refreshCache();
      await loadData();
      feedback.success();
    } catch (error) {
      console.error("Failed to refresh cache:", error);
      feedback.error();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = async () => {
    haptic("warning");
    if (confirm("Clear all cached data? This cannot be undone.")) {
      setIsLoading(true);
      try {
        await clearCache();
        await loadData();
        feedback.success();
      } catch (error) {
        console.error("Failed to clear cache:", error);
        feedback.error();
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSync = async () => {
    haptic("light");
    setIsSyncing(true);
    try {
      const results = await syncPendingOperations();
      const failed = results.filter((r) => !r.success).length;
      if (failed > 0) {
        feedback.warning();
        alert(`Sync completed with ${failed} errors`);
      } else {
        feedback.success();
      }
      await loadData();
    } catch (error) {
      console.error("Sync failed:", error);
      feedback.error();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInstall = async () => {
    haptic("light");
    const installed = await showInstallPrompt();
    if (installed) {
      feedback.success();
      setInstallable(false);
    }
  };

  const handleLogout = () => {
    haptic("light");
    signOut({ callbackUrl: "/" });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen">
      <MobileHeader
        title="Profile"
        subtitle="Settings & preferences"
        showBack
        backHref="/mobile"
      />

      <div className="p-4 space-y-4">
        {/* User info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{session?.user?.name || "User"}</h3>
                <p className="text-sm text-muted-foreground">
                  {session?.user?.email || ""}
                </p>
              </div>
              <Badge
                variant="outline"
                className={online ? "text-green-600" : "text-red-600"}
              >
                {online ? (
                  <>
                    <Wifi className="h-3 w-3 mr-1" />
                    Online
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 mr-1" />
                    Offline
                  </>
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Install app */}
        {installable && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Download className="h-8 w-8 text-primary" />
                <div className="flex-1">
                  <h4 className="font-medium">Install App</h4>
                  <p className="text-sm text-muted-foreground">
                    Add to home screen for quick access
                  </p>
                </div>
                <Button size="sm" onClick={handleInstall}>
                  Install
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sync status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Sync Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Pending operations</span>
              <Badge
                variant={cacheStats.pendingOps > 0 ? "destructive" : "secondary"}
              >
                {cacheStats.pendingOps}
              </Badge>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSync}
              disabled={isSyncing || !online || cacheStats.pendingOps === 0}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Now
            </Button>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Vibrate className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Haptic Feedback</span>
              </div>
              <Switch
                checked={settings.hapticFeedback}
                onCheckedChange={(v) => handleSettingChange("hapticFeedback", v)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Sound Feedback</span>
              </div>
              <Switch
                checked={settings.soundFeedback}
                onCheckedChange={(v) => handleSettingChange("soundFeedback", v)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Cloud className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Auto Sync</span>
              </div>
              <Switch
                checked={settings.autoSync}
                onCheckedChange={(v) => handleSettingChange("autoSync", v)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Notifications</span>
              </div>
              <Switch
                checked={settings.notifications}
                onCheckedChange={(v) => handleSettingChange("notifications", v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Cache */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Cached Data
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parts</span>
                <span>{cacheStats.parts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Locations</span>
                <span>{cacheStats.locations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Work Orders</span>
                <span>{cacheStats.workOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scan History</span>
                <span>{cacheStats.scans}</span>
              </div>
            </div>

            {storage && (
              <div className="pt-2">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    Storage Used
                  </span>
                  <span>
                    {formatBytes(storage.usage)} / {formatBytes(storage.quota)}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(storage.percentUsed, 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleRefreshCache}
                disabled={isLoading || !online}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-red-600 hover:text-red-700"
                onClick={handleClearCache}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full text-red-600 hover:text-red-700"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Log Out
        </Button>
      </div>
    </div>
  );
}
