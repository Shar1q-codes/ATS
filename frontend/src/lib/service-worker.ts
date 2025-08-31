// Service Worker registration and management

export interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean;

  constructor() {
    this.isSupported = "serviceWorker" in navigator;
  }

  async register(config: ServiceWorkerConfig = {}): Promise<void> {
    if (!this.isSupported) {
      console.log("Service Worker not supported");
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      console.log("Service Worker registered successfully");

      // Handle updates
      this.registration.addEventListener("updatefound", () => {
        const newWorker = this.registration?.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // New content is available
            config.onUpdate?.(this.registration!);
          }
        });
      });

      // Handle successful registration
      if (this.registration.active) {
        config.onSuccess?.(this.registration);
      }

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener("message", this.handleMessage);

      // Register for background sync if supported
      if ("sync" in window.ServiceWorkerRegistration.prototype) {
        console.log("Background sync supported");
      }
    } catch (error) {
      console.error("Service Worker registration failed:", error);
      config.onError?.(error as Error);
    }
  }

  async unregister(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      const result = await this.registration.unregister();
      console.log("Service Worker unregistered:", result);
      return result;
    } catch (error) {
      console.error("Service Worker unregistration failed:", error);
      return false;
    }
  }

  async update(): Promise<void> {
    if (!this.registration) return;

    try {
      await this.registration.update();
      console.log("Service Worker update check completed");
    } catch (error) {
      console.error("Service Worker update failed:", error);
    }
  }

  skipWaiting(): void {
    if (!this.registration?.waiting) return;

    this.registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }

  async requestBackgroundSync(tag: string): Promise<void> {
    if (
      !this.registration ||
      !("sync" in window.ServiceWorkerRegistration.prototype)
    ) {
      console.log("Background sync not supported");
      return;
    }

    try {
      await this.registration.sync.register(tag);
      console.log("Background sync registered:", tag);
    } catch (error) {
      console.error("Background sync registration failed:", error);
    }
  }

  async cacheApiResponse(request: Request, response: any): Promise<void> {
    if (!this.registration?.active) return;

    this.registration.active.postMessage({
      type: "CACHE_API_RESPONSE",
      data: { request: request.url, response },
    });
  }

  async clearCache(cacheName?: string): Promise<void> {
    if (!this.registration?.active) return;

    this.registration.active.postMessage({
      type: "CLEAR_CACHE",
      data: { cacheName },
    });
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  private handleMessage = (event: MessageEvent) => {
    const { type, data } = event.data;

    switch (type) {
      case "BACKGROUND_SYNC_SUCCESS":
        console.log("Background sync successful:", data);
        // Dispatch custom event for components to listen to
        window.dispatchEvent(
          new CustomEvent("backgroundSyncSuccess", { detail: data })
        );
        break;

      default:
        console.log("Unknown service worker message:", type);
    }
  };

  // Network status monitoring
  onNetworkChange(callback: (isOnline: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Return cleanup function
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }

  // Store failed requests for background sync
  async storeFailedRequest(request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbRequest = indexedDB.open("FailedRequests", 1);

      dbRequest.onerror = () => reject(dbRequest.error);
      dbRequest.onsuccess = () => {
        const db = dbRequest.result;
        const transaction = db.transaction(["requests"], "readwrite");
        const store = transaction.objectStore("requests");
        const addRequest = store.add({
          ...request,
          timestamp: Date.now(),
        });

        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      };

      dbRequest.onupgradeneeded = () => {
        const db = dbRequest.result;
        if (!db.objectStoreNames.contains("requests")) {
          db.createObjectStore("requests", {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      };
    });
  }
}

// Create singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// React hook for service worker functionality
export function useServiceWorker() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);

  React.useEffect(() => {
    // Register service worker
    serviceWorkerManager.register({
      onUpdate: () => setUpdateAvailable(true),
      onSuccess: (registration) => {
        console.log("Service Worker ready");
      },
      onError: (error) => {
        console.error("Service Worker error:", error);
      },
    });

    // Monitor network status
    const cleanup = serviceWorkerManager.onNetworkChange(setIsOnline);

    return cleanup;
  }, []);

  const updateApp = () => {
    serviceWorkerManager.skipWaiting();
    window.location.reload();
  };

  const requestBackgroundSync = (tag: string) => {
    return serviceWorkerManager.requestBackgroundSync(tag);
  };

  return {
    isOnline,
    updateAvailable,
    updateApp,
    requestBackgroundSync,
    clearCache: serviceWorkerManager.clearCache.bind(serviceWorkerManager),
  };
}

// Import React for the hook
import React from "react";
