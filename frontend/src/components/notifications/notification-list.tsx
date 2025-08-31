"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Check,
  CheckCheck,
  Trash2,
  Settings,
  MessageSquare,
  UserCheck,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { useNotifications, Notification } from "../../hooks/use-notifications";
import { cn } from "../../lib/utils";

interface NotificationListProps {
  onClose?: () => void;
}

export function NotificationList({ onClose }: NotificationListProps) {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadNotifications,
  } = useNotifications();

  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    loadNotifications({ unreadOnly: filter === "unread" });
  }, [filter, loadNotifications]);

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "mention":
        return <MessageSquare className="h-4 w-4" />;
      case "application_stage_change":
        return <UserCheck className="h-4 w-4" />;
      case "application_note":
        return <MessageSquare className="h-4 w-4" />;
      case "system":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: Notification["priority"]) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-blue-500";
      case "low":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
      onClose?.();
    }
  };

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
        <p className="text-sm">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => loadNotifications()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1">
          <Button
            variant={filter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
            className="text-xs"
          >
            All
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("unread")}
            className="text-xs"
          >
            Unread ({unreadCount})
          </Button>
        </div>
      </div>

      {/* Notifications list */}
      <ScrollArea className="h-96">
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
            <p className="text-sm mt-2">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {filter === "unread"
                ? "No unread notifications"
                : "No notifications"}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "p-4 hover:bg-gray-50 cursor-pointer transition-colors relative",
                  !notification.isRead && "bg-blue-50"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                {/* Priority indicator */}
                <div
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-1",
                    getPriorityColor(notification.priority)
                  )}
                />

                <div className="flex items-start gap-3 ml-2">
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex-shrink-0 p-1 rounded-full",
                      notification.type === "mention" &&
                        "bg-green-100 text-green-600",
                      notification.type === "application_stage_change" &&
                        "bg-blue-100 text-blue-600",
                      notification.type === "application_note" &&
                        "bg-purple-100 text-purple-600",
                      notification.type === "system" &&
                        "bg-gray-100 text-gray-600"
                    )}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            !notification.isRead && "font-semibold"
                          )}
                        >
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>

                        {/* Metadata */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(
                              new Date(notification.createdAt),
                              { addSuffix: true }
                            )}
                          </span>
                          {notification.sender && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">
                                {notification.sender.firstName}{" "}
                                {notification.sender.lastName}
                              </span>
                            </>
                          )}
                          {notification.actionUrl && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <ExternalLink className="h-3 w-3 text-gray-400" />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Unread indicator */}
                {!notification.isRead && (
                  <div className="absolute right-2 top-4 h-2 w-2 bg-blue-500 rounded-full" />
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {filteredNotifications.length > 0 && (
        <>
          <Separator />
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={onClose}
            >
              View all notifications
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
