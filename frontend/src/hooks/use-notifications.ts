import { useState, useEffect, useCallback } from "react";
import { useRealtime } from "./use-realtime";
import { apiClient } from "../lib/api-client";

export interface Notification {
  id: string;
  type: "application_stage_change" | "mention" | "application_note" | "system";
  priority: "low" | "medium" | "high" | "urgent";
  title: string;
  message: string;
  data?: Record<string, any>;
  applicationId?: string;
  applicationNoteId?: string;
  isRead: boolean;
  readAt?: Date;
  actionUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  mentionNotifications: boolean;
  stageChangeNotifications: boolean;
  digestFrequency: "immediate" | "hourly" | "daily" | "weekly" | "never";
}

export function useNotifications() {
  const realtime = useRealtime();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial notifications and preferences
  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
    loadPreferences();
  }, []);

  // Listen for new notifications via realtime
  useEffect(() => {
    if (!realtime.isConnected) return;

    const cleanup = realtime.addEventListener(
      "notification:new",
      (notification: Notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);

        // Show browser notification if supported and enabled
        if (
          preferences?.inAppNotifications &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          new Notification(notification.title, {
            body: notification.message,
            icon: "/favicon.ico",
            tag: notification.id,
          });
        }
      }
    );

    return cleanup;
  }, [realtime.isConnected, preferences?.inAppNotifications]);

  const loadNotifications = useCallback(
    async (
      options: {
        limit?: number;
        offset?: number;
        unreadOnly?: boolean;
        type?: string;
      } = {}
    ) => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.get("/notifications", {
          params: options,
        });

        if (response.data.success) {
          if (options.offset && options.offset > 0) {
            // Append to existing notifications (pagination)
            setNotifications((prev) => [
              ...prev,
              ...response.data.data.notifications,
            ]);
          } else {
            // Replace notifications (initial load or refresh)
            setNotifications(response.data.data.notifications);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load notifications"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await apiClient.get("/notifications/unread-count");
      if (response.data.success) {
        setUnreadCount(response.data.data.count);
      }
    } catch (err) {
      console.error("Failed to load unread count:", err);
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    try {
      const response = await apiClient.get("/notifications/preferences");
      if (response.data.success) {
        setPreferences(response.data.data);
      }
    } catch (err) {
      console.error("Failed to load notification preferences:", err);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await apiClient.put(`/notifications/${notificationId}/read`);

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, isRead: true, readAt: new Date() }
            : n
        )
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to mark notification as read"
      );
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.put("/notifications/read-all");

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
      );

      setUnreadCount(0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to mark all notifications as read"
      );
    }
  }, []);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        await apiClient.delete(`/notifications/${notificationId}`);

        const notification = notifications.find((n) => n.id === notificationId);

        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

        if (notification && !notification.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete notification"
        );
      }
    },
    [notifications]
  );

  const updatePreferences = useCallback(
    async (newPreferences: Partial<NotificationPreferences>) => {
      try {
        await apiClient.put("/notifications/preferences", newPreferences);
        setPreferences((prev) =>
          prev ? { ...prev, ...newPreferences } : null
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update preferences"
        );
      }
    },
    []
  );

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ("Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return Notification.permission === "granted";
  }, []);

  return {
    notifications,
    unreadCount,
    preferences,
    loading,
    error,
    loadNotifications,
    loadUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
    requestNotificationPermission,
    refresh: () => {
      loadNotifications();
      loadUnreadCount();
    },
  };
}
