import { useEffect, useRef, useState, useCallback } from "react";
import { realtimeService, RealtimeEvents } from "../lib/realtime-service";
import { useAuth } from "./use-auth";

export function useRealtime() {
  const { user, isAuthenticated } = useAuth();
  const [connectionState, setConnectionState] = useState<
    "connected" | "disconnected" | "connecting"
  >("disconnected");
  const [error, setError] = useState<string | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user || isInitialized.current) {
      return;
    }

    isInitialized.current = true;
    setConnectionState("connecting");

    const connectToRealtime = async () => {
      try {
        await realtimeService.connect();
        setConnectionState("connected");
        setError(null);
      } catch (err) {
        console.error("Failed to connect to realtime service:", err);
        setError(err instanceof Error ? err.message : "Connection failed");
        setConnectionState("disconnected");
      }
    };

    // Set up error listener
    const handleError = (data: { message: string }) => {
      setError(data.message);
    };

    realtimeService.on("error", handleError);
    connectToRealtime();

    return () => {
      realtimeService.off("error", handleError);
      realtimeService.disconnect();
      isInitialized.current = false;
      setConnectionState("disconnected");
    };
  }, [isAuthenticated, user]);

  const addEventListener = useCallback(
    <K extends keyof RealtimeEvents>(event: K, listener: RealtimeEvents[K]) => {
      realtimeService.on(event, listener);

      return () => {
        realtimeService.off(event, listener);
      };
    },
    []
  );

  return {
    connectionState,
    error,
    isConnected: connectionState === "connected",
    addEventListener,
    joinApplication: realtimeService.joinApplication.bind(realtimeService),
    leaveApplication: realtimeService.leaveApplication.bind(realtimeService),
    updateApplicationStage:
      realtimeService.updateApplicationStage.bind(realtimeService),
    addApplicationNote:
      realtimeService.addApplicationNote.bind(realtimeService),
    editApplicationNote:
      realtimeService.editApplicationNote.bind(realtimeService),
    startTyping: realtimeService.startTyping.bind(realtimeService),
    stopTyping: realtimeService.stopTyping.bind(realtimeService),
  };
}

// Hook for application-specific realtime features
export function useApplicationRealtime(applicationId: string | null) {
  const realtime = useRealtime();
  const [viewers, setViewers] = useState<
    Array<{ userId: string; name: string; joinedAt: Date }>
  >([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const currentApplicationId = useRef<string | null>(null);

  // Join/leave application when applicationId changes
  useEffect(() => {
    if (!applicationId || !realtime.isConnected) {
      return;
    }

    // Leave previous application if different
    if (
      currentApplicationId.current &&
      currentApplicationId.current !== applicationId
    ) {
      realtime.leaveApplication(currentApplicationId.current);
    }

    // Join new application
    realtime.joinApplication(applicationId);
    currentApplicationId.current = applicationId;

    return () => {
      if (currentApplicationId.current) {
        realtime.leaveApplication(currentApplicationId.current);
        currentApplicationId.current = null;
      }
    };
  }, [applicationId, realtime.isConnected, realtime]);

  // Set up event listeners for application events
  useEffect(() => {
    if (!applicationId) return;

    const cleanupFunctions: (() => void)[] = [];

    // Current viewers
    cleanupFunctions.push(
      realtime.addEventListener("application:current_viewers", (data) => {
        if (data.applicationId === applicationId) {
          setViewers(data.viewers);
        }
      })
    );

    // User joined
    cleanupFunctions.push(
      realtime.addEventListener("application:user_joined", (data) => {
        if (data.applicationId === applicationId) {
          setViewers((prev) => [
            ...prev.filter((v) => v.userId !== data.userId),
            { userId: data.userId, name: data.name, joinedAt: new Date() },
          ]);
        }
      })
    );

    // User left
    cleanupFunctions.push(
      realtime.addEventListener("application:user_left", (data) => {
        if (data.applicationId === applicationId) {
          setViewers((prev) => prev.filter((v) => v.userId !== data.userId));
        }
      })
    );

    // Typing events
    cleanupFunctions.push(
      realtime.addEventListener("typing:user_started", (data) => {
        if (data.applicationId === applicationId) {
          setTypingUsers((prev) => new Set([...prev, data.userId]));
        }
      })
    );

    cleanupFunctions.push(
      realtime.addEventListener("typing:user_stopped", (data) => {
        if (data.applicationId === applicationId) {
          setTypingUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(data.userId);
            return newSet;
          });
        }
      })
    );

    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [applicationId, realtime]);

  // Typing indicator management
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTyping = useCallback(() => {
    if (!applicationId) return;

    realtime.startTyping(applicationId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      realtime.stopTyping(applicationId);
    }, 2000);
  }, [applicationId, realtime]);

  const stopTypingIndicator = useCallback(() => {
    if (!applicationId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    realtime.stopTyping(applicationId);
  }, [applicationId, realtime]);

  return {
    ...realtime,
    viewers,
    typingUsers: Array.from(typingUsers),
    handleTyping,
    stopTypingIndicator,
  };
}
