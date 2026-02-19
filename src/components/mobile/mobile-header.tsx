"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clientLogger } from "@/lib/client-logger";
import { ArrowLeft, MoreVertical, Wifi, WifiOff, CloudOff } from "lucide-react";
import { useState, useEffect } from "react";
import { isOnline, getPendingOperations } from "@/lib/mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  menuItems?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  }>;
  className?: string;
}

export function MobileHeader({
  title,
  subtitle,
  showBack = false,
  backHref,
  onBack,
  actions,
  menuItems,
  className,
}: MobileHeaderProps) {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Check initial online status
    setOnline(isOnline());

    // Listen for online/offline changes
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check pending operations
    const checkPending = async () => {
      try {
        const pending = await getPendingOperations();
        setPendingCount(pending.length);
      } catch (error) {
        clientLogger.error("Failed to get pending operations", error);
      }
    };
    checkPending();
    const interval = setInterval(checkPending, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-neutral-900 text-white safe-area-top",
        className
      )}
    >
      <div className="flex items-center h-14 px-4 gap-3">
        {/* Back button */}
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0 text-white hover:bg-white/10"
            aria-label="Quay lại"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-lg truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-neutral-400 truncate">{subtitle}</p>
          )}
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-2">
          {/* Online/Offline indicator */}
          {online ? (
            <Wifi className="h-4 w-4 text-green-400" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-400" />
          )}

          {/* Sync status */}
          {pendingCount > 0 && (
            <div className="relative">
              <CloudOff className="h-4 w-4 text-yellow-400" />
              <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        {actions}

        {/* Menu */}
        {menuItems && menuItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-white hover:bg-white/10"
                aria-label="Menu"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {menuItems.map((item, index) => (
                <DropdownMenuItem key={index} onClick={item.onClick}>
                  {item.icon}
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
