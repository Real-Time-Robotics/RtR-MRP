"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/mobile/bottom-nav";
import { OfflineIndicator } from "@/components/mobile/offline-indicator";
import {
  registerServiceWorker,
  initInstallPrompt,
  onUpdateAvailable,
  skipWaitingAndReload,
  initDB,
  enableAutoSync,
} from "@/lib/mobile";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Initialize mobile features
    const init = async () => {
      try {
        // Initialize IndexedDB
        await initDB();

        // Register service worker
        await registerServiceWorker();

        // Enable auto-sync when back online
        enableAutoSync();
      } catch (error) {
        console.error("Failed to initialize mobile features:", error);
      }
    };

    init();

    // Listen for PWA install prompt
    const cleanupInstall = initInstallPrompt(() => {
      // Install prompt is available
    });

    // Listen for service worker updates
    const cleanupUpdate = onUpdateAvailable(() => {
      setUpdateAvailable(true);
    });

    return () => {
      cleanupInstall();
      cleanupUpdate();
    };
  }, []);

  const handleUpdate = () => {
    skipWaitingAndReload();
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      {/* Update banner */}
      {updateAvailable && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between">
          <span className="text-sm">A new version is available</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleUpdate}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Update
          </Button>
        </div>
      )}

      {/* Offline indicator */}
      <OfflineIndicator />

      {/* Main content */}
      <main
        className={cn(
          "pb-20", // Space for bottom nav
          updateAvailable && "pt-12" // Space for update banner
        )}
      >
        {children}
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
