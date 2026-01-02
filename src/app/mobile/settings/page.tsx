'use client';

import React, { useState, useEffect } from 'react';
import { 
  User,
  Bell,
  Vibrate,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  Database,
  Trash2,
  RefreshCw,
  LogOut,
  ChevronRight,
  Check,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// MOBILE SETTINGS PAGE
// =============================================================================

export default function MobileSettingsPage() {
  const [settings, setSettings] = useState({
    hapticEnabled: true,
    soundEnabled: true,
    darkMode: false,
    autoSync: true,
  });
  const [offlineStatus, setOfflineStatus] = useState({
    isOnline: true,
    cachedParts: 0,
    cachedLocations: 0,
    pendingOps: 0,
    lastSync: null as string | null,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('mobile-settings');
    if (stored) {
      setSettings(JSON.parse(stored));
    }
    
    // Check online status
    setOfflineStatus(prev => ({
      ...prev,
      isOnline: navigator.onLine,
    }));
  }, []);

  // Save settings
  const updateSetting = (key: string, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('mobile-settings', JSON.stringify(newSettings));
  };

  // Sync data
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/mobile/sync?type=parts');
      if (response.ok) {
        const parts = await response.json();
        setOfflineStatus(prev => ({
          ...prev,
          cachedParts: parts.length,
          lastSync: new Date().toISOString(),
        }));
      }
      
      const locResponse = await fetch('/api/mobile/sync?type=locations');
      if (locResponse.ok) {
        const locations = await locResponse.json();
        setOfflineStatus(prev => ({
          ...prev,
          cachedLocations: locations.length,
        }));
      }
      
      // Vibrate on success
      if (settings.hapticEnabled && 'vibrate' in navigator) {
        navigator.vibrate(100);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Clear cache
  const handleClearCache = async () => {
    if (!confirm('Xóa toàn bộ dữ liệu offline?')) return;
    
    setIsClearing(true);
    try {
      // Clear IndexedDB
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
      
      setOfflineStatus(prev => ({
        ...prev,
        cachedParts: 0,
        cachedLocations: 0,
        pendingOps: 0,
        lastSync: null,
      }));
    } catch (error) {
      console.error('Clear cache failed:', error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* User Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 flex items-center gap-4">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-blue-600" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-gray-900 dark:text-white">
            Operator User
          </div>
          <div className="text-sm text-gray-500">
            operator@rtr.com
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>

      {/* Scanner Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-gray-700">
        <h3 className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
          Cài đặt Scanner
        </h3>
        
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Vibrate className="w-5 h-5 text-gray-400" />
            <span className="text-gray-900 dark:text-white">Rung khi quét</span>
          </div>
          <button
            onClick={() => updateSetting('hapticEnabled', !settings.hapticEnabled)}
            className={cn(
              'w-12 h-7 rounded-full transition-colors relative',
              settings.hapticEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            )}
          >
            <div className={cn(
              'w-5 h-5 bg-white rounded-full absolute top-1 transition-transform',
              settings.hapticEnabled ? 'right-1' : 'left-1'
            )} />
          </button>
        </div>
        
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.soundEnabled ? (
              <Volume2 className="w-5 h-5 text-gray-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-400" />
            )}
            <span className="text-gray-900 dark:text-white">Âm thanh</span>
          </div>
          <button
            onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
            className={cn(
              'w-12 h-7 rounded-full transition-colors relative',
              settings.soundEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            )}
          >
            <div className={cn(
              'w-5 h-5 bg-white rounded-full absolute top-1 transition-transform',
              settings.soundEnabled ? 'right-1' : 'left-1'
            )} />
          </button>
        </div>
      </div>

      {/* Offline Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-gray-700">
        <h3 className="px-4 py-3 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Database className="w-5 h-5" />
          Dữ liệu Offline
        </h3>
        
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-500">Trạng thái</span>
            <span className={cn(
              'flex items-center gap-1 text-sm font-medium',
              offlineStatus.isOnline ? 'text-green-600' : 'text-yellow-600'
            )}>
              {offlineStatus.isOnline ? (
                <>
                  <Wifi className="w-4 h-4" />
                  Online
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4" />
                  Offline
                </>
              )}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {offlineStatus.cachedParts}
              </div>
              <div className="text-xs text-gray-500">Vật tư</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {offlineStatus.cachedLocations}
              </div>
              <div className="text-xs text-gray-500">Vị trí</div>
            </div>
          </div>
          
          {offlineStatus.lastSync && (
            <div className="text-xs text-gray-500 text-center mt-2">
              Sync: {new Date(offlineStatus.lastSync).toLocaleString('vi-VN')}
            </div>
          )}
        </div>
        
        <div className="px-4 py-3 flex gap-2">
          <button
            onClick={handleSync}
            disabled={isSyncing || !offlineStatus.isOnline}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSyncing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            Sync dữ liệu
          </button>
          <button
            onClick={handleClearCache}
            disabled={isClearing}
            className="px-4 py-2.5 bg-red-100 text-red-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isClearing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* App Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-gray-700">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-gray-500">Phiên bản</span>
          <span className="text-gray-900 dark:text-white font-mono">2.1.0</span>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-gray-500">Build</span>
          <span className="text-gray-900 dark:text-white font-mono">2024.01.02</span>
        </div>
      </div>

      {/* Logout */}
      <button className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-medium flex items-center justify-center gap-2">
        <LogOut className="w-5 h-5" />
        Đăng xuất
      </button>
    </div>
  );
}
