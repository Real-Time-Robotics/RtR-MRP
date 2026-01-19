"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";

// Key để lưu navigation history trong sessionStorage
const NAV_HISTORY_KEY = "rtr_nav_history";
const MAX_HISTORY_LENGTH = 50;

/**
 * Get navigation history from sessionStorage
 */
export function getNavHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = sessionStorage.getItem(NAV_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Add current path to navigation history
 */
export function addToNavHistory(path: string): void {
  if (typeof window === "undefined") return;
  try {
    const history = getNavHistory();
    // Chỉ thêm nếu khác trang cuối cùng (tránh duplicate)
    if (history[history.length - 1] !== path) {
      history.push(path);
      // Giữ tối đa MAX_HISTORY_LENGTH entries
      while (history.length > MAX_HISTORY_LENGTH) {
        history.shift();
      }
      sessionStorage.setItem(NAV_HISTORY_KEY, JSON.stringify(history));
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Pop the current page and get the previous page from history
 */
export function popNavHistory(): string | null {
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

/**
 * Check if there's a previous page in the app navigation history
 */
export function hasPreviousPage(): boolean {
  const history = getNavHistory();
  return history.length > 1;
}

/**
 * Clear navigation history
 */
export function clearNavHistory(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(NAV_HISTORY_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Hook to track navigation and provide goBack function
 */
export function useNavigationHistory(fallbackPath?: string) {
  const pathname = usePathname();
  const router = useRouter();

  // Track navigation khi pathname thay đổi
  useEffect(() => {
    if (pathname) {
      addToNavHistory(pathname);
    }
  }, [pathname]);

  // Go back to previous page in app history
  const goBack = useCallback(() => {
    const previousPage = popNavHistory();

    if (previousPage && previousPage !== pathname) {
      // Có trang trước trong app → navigate đến đó
      router.push(previousPage);
      return true;
    } else if (fallbackPath) {
      // Không có history → dùng fallback
      router.push(fallbackPath);
      return false;
    } else {
      // Fallback cuối cùng → về home
      router.push("/home");
      return false;
    }
  }, [router, pathname, fallbackPath]);

  return {
    goBack,
    hasPreviousPage: hasPreviousPage(),
    currentPath: pathname,
    history: getNavHistory(),
  };
}
