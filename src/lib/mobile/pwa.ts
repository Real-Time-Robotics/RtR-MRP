// PWA utilities for installation, updates, and service worker management
import { clientLogger } from '@/lib/client-logger';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let isInstalled = false;

// Check if app is installed
export function checkIfInstalled(): boolean {
  // Check display-mode
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }

  // Check for iOS standalone mode
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) {
    return true;
  }

  // Check if launched from home screen on Android
  if (document.referrer.includes("android-app://")) {
    return true;
  }

  return false;
}

// Initialize PWA install prompt handling
export function initInstallPrompt(
  onInstallAvailable?: () => void
): () => void {
  isInstalled = checkIfInstalled();

  const handleBeforeInstall = (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    onInstallAvailable?.();
  };

  const handleAppInstalled = () => {
    isInstalled = true;
    deferredPrompt = null;
  };

  window.addEventListener("beforeinstallprompt", handleBeforeInstall);
  window.addEventListener("appinstalled", handleAppInstalled);

  return () => {
    window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    window.removeEventListener("appinstalled", handleAppInstalled);
  };
}

// Show install prompt
export async function showInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }

  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return outcome === "accepted";
  } catch (error) {
    clientLogger.error("Install prompt error", error);
    return false;
  }
}

// Check if install prompt is available
export function canInstall(): boolean {
  return deferredPrompt !== null && !isInstalled;
}

// Check if app is installed
export function getInstallStatus(): boolean {
  return isInstalled;
}

// Service worker registration
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    // Check for updates on page load
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // New version available
            dispatchUpdateEvent();
          }
        });
      }
    });

    return registration;
  } catch (error) {
    clientLogger.error("Service worker registration failed", error);
    return null;
  }
}

// Update service worker
export async function updateServiceWorker(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      return true;
    }
    return false;
  } catch (error) {
    clientLogger.error("Service worker update failed", error);
    return false;
  }
}

// Skip waiting and activate new service worker
export function skipWaitingAndReload(): void {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.controller?.postMessage({ type: "SKIP_WAITING" });
  window.location.reload();
}

// Dispatch custom update event
function dispatchUpdateEvent(): void {
  window.dispatchEvent(new CustomEvent("pwa-update-available"));
}

// Listen for update events
export function onUpdateAvailable(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener("pwa-update-available", handler);
  return () => window.removeEventListener("pwa-update-available", handler);
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  return Notification.requestPermission();
}

// Send local notification
export async function sendNotification(
  title: string,
  options?: NotificationOptions
): Promise<boolean> {
  if (!("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      return false;
    }
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      ...options,
    } as NotificationOptions);
    return true;
  } catch (error) {
    clientLogger.error("Notification error", error);
    return false;
  }
}

// Cache URLs for offline use
export async function cacheUrls(urls: string[]): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  const controller = navigator.serviceWorker.controller;
  if (controller) {
    controller.postMessage({
      type: "CACHE_URLS",
      urls,
    });
  }
}

// Get storage estimate
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  percentUsed: number;
} | null> {
  if (!("storage" in navigator && "estimate" in navigator.storage)) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    return {
      usage,
      quota,
      percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
    };
  } catch (error) {
    clientLogger.error("Storage estimate error", error);
    return null;
  }
}

// Request persistent storage
export async function requestPersistentStorage(): Promise<boolean> {
  if (!("storage" in navigator && "persist" in navigator.storage)) {
    return false;
  }

  try {
    return await navigator.storage.persist();
  } catch (error) {
    clientLogger.error("Persistent storage error", error);
    return false;
  }
}

// Check if persistent storage is granted
export async function isPersisted(): Promise<boolean> {
  if (!("storage" in navigator && "persisted" in navigator.storage)) {
    return false;
  }

  try {
    return await navigator.storage.persisted();
  } catch (error) {
    clientLogger.error("Persisted check error", error);
    return false;
  }
}
