"use client";

import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useCallback } from "react";

// Key để lưu navigation history trong sessionStorage
const NAV_HISTORY_KEY = "rtr_nav_history";

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string; // Fallback URL khi không có history trong app
  showBack?: boolean; // Hiển thị nút back (mặc định: true nếu có backHref)
  actions?: React.ReactNode;
}

// Helper functions để quản lý navigation history
function getNavHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = sessionStorage.getItem(NAV_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addToNavHistory(path: string): void {
  if (typeof window === "undefined") return;
  try {
    const history = getNavHistory();
    // Chỉ thêm nếu khác trang hiện tại (tránh duplicate)
    if (history[history.length - 1] !== path) {
      history.push(path);
      // Giữ tối đa 50 entries
      if (history.length > 50) history.shift();
      sessionStorage.setItem(NAV_HISTORY_KEY, JSON.stringify(history));
    }
  } catch {
    // Ignore storage errors
  }
}

function popNavHistory(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const history = getNavHistory();
    if (history.length > 1) {
      // Bỏ trang hiện tại
      history.pop();
      // Lấy trang trước đó
      const previousPage = history[history.length - 1];
      sessionStorage.setItem(NAV_HISTORY_KEY, JSON.stringify(history));
      return previousPage;
    }
    return null;
  } catch {
    return null;
  }
}

export function PageHeader({
  title,
  description,
  backHref,
  showBack,
  actions,
}: PageHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Track navigation khi pathname thay đổi
  useEffect(() => {
    if (pathname) {
      addToNavHistory(pathname);
    }
  }, [pathname]);

  // Hiển thị back button nếu showBack=true hoặc có backHref
  const shouldShowBack = showBack ?? !!backHref;

  const handleBack = useCallback(() => {
    // Lấy trang trước đó từ internal navigation history
    const previousPage = popNavHistory();

    if (previousPage && previousPage !== pathname) {
      // Có trang trước trong app → navigate đến đó
      router.push(previousPage);
    } else if (backHref) {
      // Không có history trong app → dùng backHref
      router.push(backHref);
    } else {
      // Fallback cuối cùng → về home
      router.push("/home");
    }
  }, [router, pathname, backHref]);

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        {shouldShowBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            title="Quay lại trang trước"
            aria-label="Quay lại trang trước"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground text-sm mt-1">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
