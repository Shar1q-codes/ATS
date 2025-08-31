import { io, Socket } from "socket.io-client";
import { useAuthStore } from "./auth-store";
import { getApiUrl } from "./env-config";

export interface RealtimeEvents {
  // User presence events
  "user:online": (data: { userId: string; name: string }) => void;
  "user:offline": (data: { userId: string }) => void;

  // Application events
  "application:user_joined": (data: {
    userId: string;
    name: string;
    applicationId: string;
  }) => void;
  "application:user_left": (data: {
    userId: string;
    applicationId: string;
  }) => void;
  "application:current_viewers": (data: {
    applicationId: string;
    viewers: Array<{ userId: string; name: string; joinedAt: Date }>;
  }) => void;
  "application:stage_updated": (data: {
    applicationId: string;
    fromStage: string;
    toStage: string;
    updatedBy: { id: string; name: string };
    updatedAt: Date;
    notes?: string;
  }) => void;
  "application:note_added": (data: {
    note: {
      id: string;
      content: string;
      createdAt: Date;
      author: { id: string; name: string };
    };
    applicationId: string;
  }) => void;
  "application:note_edited": (data: {
    note: {
      id: string;
      content: string;
      updatedAt: Date;
      author: { id: string; name: string };
    };
    applicationId: string;
  }) => void;

  // Typing events
  "typing:user_started": (data: {
    userId: string;
    name: string;
    applicationId: string;
  }) => void;
  "typing:user_stopped": (data: {
    userId: string;
    applicationId: string;
  }) => void;

  // Notification events
  "notification:new": (notification: any) => void;

  // Error events
  error: (data: { message: string }) => void;
}

class RealtimeService {
  private socket: Socket | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = useAuthStore.getState().token;

      if (!token) {
        reject(new Error("No authentication token available"));
        return;
      }

      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(`${getApiUrl()}/realtime`, {
        auth: {
          token,
        },
        transports: ["websocket"],
        upgrade: true,
        rememberUpgrade: true,
      });

      this.socket.on("connect", () => {
        console.log("Connected to realtime server");
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on("disconnect", (reason) => {
        console.log("Disconnected from realtime server:", reason);
        this.isConnected = false;

        if (reason === "io server disconnect") {
          // Server disconnected us, try to reconnect
          this.handleReconnect();
        }
      });

      this.socket.on("connect_error", (error) => {
        console.error("Connection error:", error);
        this.isConnected = false;

        if (this.reconnectAttempts === 0) {
          reject(error);
        }

        this.handleReconnect();
      });

      // Set up event forwarding
      this.setupEventForwarding();
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.eventListeners.clear();
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    setTimeout(() => {
      if (!this.isConnected && this.socket) {
        this.socket.connect();
      }
    }, delay);
  }

  private setupEventForwarding(): void {
    if (!this.socket) return;

    // Forward all events to registered listeners
    const events: (keyof RealtimeEvents)[] = [
      "user:online",
      "user:offline",
      "application:user_joined",
      "application:user_left",
      "application:current_viewers",
      "application:stage_updated",
      "application:note_added",
      "application:note_edited",
      "typing:user_started",
      "typing:user_stopped",
      "notification:new",
      "error",
    ];

    events.forEach((event) => {
      this.socket!.on(event, (data: any) => {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
          listeners.forEach((listener) => listener(data));
        }
      });
    });
  }

  // Event listener management
  on<K extends keyof RealtimeEvents>(
    event: K,
    listener: RealtimeEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  off<K extends keyof RealtimeEvents>(
    event: K,
    listener: RealtimeEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  // Application-specific methods
  joinApplication(applicationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit("application:join", { applicationId });
    }
  }

  leaveApplication(applicationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit("application:leave", { applicationId });
    }
  }

  updateApplicationStage(
    applicationId: string,
    fromStage: string,
    toStage: string,
    notes?: string
  ): void {
    if (this.socket?.connected) {
      this.socket.emit("application:stage_change", {
        applicationId,
        fromStage,
        toStage,
        notes,
      });
    }
  }

  addApplicationNote(
    applicationId: string,
    content: string,
    mentions?: string[]
  ): void {
    if (this.socket?.connected) {
      this.socket.emit("application:note_add", {
        applicationId,
        content,
        mentions,
      });
    }
  }

  editApplicationNote(
    noteId: string,
    content: string,
    mentions?: string[]
  ): void {
    if (this.socket?.connected) {
      this.socket.emit("application:note_edit", {
        noteId,
        content,
        mentions,
      });
    }
  }

  startTyping(applicationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit("typing:start", { applicationId });
    }
  }

  stopTyping(applicationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit("typing:stop", { applicationId });
    }
  }

  // Utility methods
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  getConnectionState(): "connected" | "disconnected" | "connecting" {
    if (!this.socket) return "disconnected";
    if (this.socket.connected) return "connected";
    if (this.socket.connecting) return "connecting";
    return "disconnected";
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();

// React hook for using realtime service
export function useRealtimeService() {
  return realtimeService;
}
