"use client";

import { useEffect, useState } from "react";
import { isOnline, onNetworkStatusChange, getPendingOperations } from "@/lib/mobile";
import { cn } from "@/lib/utils";
import { clientLogger } from "@/lib/client-logger";
import { WifiOff, CloudOff } from "lucide-react";

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({
  className,
}: OfflineIndicatorProps) {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setOnline(isOnline());

    const unsubscribe = onNetworkStatusChange((status) => {
      setOnline(status);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const checkPending = async () => {
      try {
        const pending = await getPendingOperations();
        setPendingCount(pending.length);
      } catch (error) {
        clientLogger.error("Failed to get pending operations", error);
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Show indicator if offline or has pending operations
    setVisible(!online || pendingCount > 0);
  }, [online, pendingCount]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed top-16 left-0 right-0 z-40 px-4 py-2 text-sm transition-transform",
        !online
          ? "bg-red-500 text-white"
          : pendingCount > 0
          ? "bg-yellow-500 text-black"
          : "bg-gray-800 text-white",
        className
      )}
    >
      <div className="flex items-center justify-center gap-2">
        {!online ? (
          <>
            <WifiOff className="h-4 w-4" />
            <span>You are offline. Changes will sync when connected.</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <CloudOff className="h-4 w-4" />
            <span>
              {pendingCount} operation{pendingCount !== 1 ? "s" : ""} pending
              sync
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
