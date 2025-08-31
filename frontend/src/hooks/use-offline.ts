import { useState, useEffect, useCallback } from "react";
import { useToast } from "./use-toast";

interface OfflineQueueItem {
  id: string;
  operation: () => Promise<any>;
  description: string;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const { toast } = useToast();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Connection Restored",
        description: "You are back online. Syncing pending changes...",
      });
      processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Connection Lost",
        description:
          "You are offline. Changes will be saved and synced when connection is restored.",
        variant: "destructive",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [toast]);

  // Process queued operations when back online
  const processQueue = useCallback(async () => {
    if (isProcessingQueue || queue.length === 0 || !isOnline) {
      return;
    }

    setIsProcessingQueue(true);

    const processedIds: string[] = [];
    const failedItems: OfflineQueueItem[] = [];

    for (const item of queue) {
      try {
        await item.operation();
        processedIds.push(item.id);

        toast({
          title: "Synced",
          description: `${item.description} has been synced successfully.`,
        });
      } catch (error) {
        console.error(
          `Failed to process queued operation: ${item.description}`,
          error
        );

        if (item.retries < item.maxRetries) {
          failedItems.push({
            ...item,
            retries: item.retries + 1,
          });
        } else {
          toast({
            title: "Sync Failed",
            description: `Failed to sync: ${item.description}. Please try again manually.`,
            variant: "destructive",
          });
        }
      }
    }

    // Update queue - remove processed items, keep failed items for retry
    setQueue((prevQueue) => [
      ...failedItems,
      ...prevQueue.filter(
        (item) =>
          !processedIds.includes(item.id) &&
          !failedItems.some((failed) => failed.id === item.id)
      ),
    ]);

    setIsProcessingQueue(false);
  }, [isProcessingQueue, queue, isOnline, toast]);

  // Add operation to queue
  const queueOperation = useCallback(
    (operation: () => Promise<any>, description: string, maxRetries = 3) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const queueItem: OfflineQueueItem = {
        id,
        operation,
        description,
        timestamp: Date.now(),
        retries: 0,
        maxRetries,
      };

      setQueue((prevQueue) => [...prevQueue, queueItem]);

      toast({
        title: "Queued for Sync",
        description: `${description} will be synced when connection is restored.`,
      });

      return id;
    },
    [toast]
  );

  // Execute operation with offline support
  const executeWithOfflineSupport = useCallback(
    async <T>(
      operation: () => Promise<T>,
      description: string,
      options: {
        fallbackData?: T;
        queueOnFailure?: boolean;
        maxRetries?: number;
      } = {}
    ): Promise<T> => {
      const { fallbackData, queueOnFailure = true, maxRetries = 3 } = options;

      if (!isOnline) {
        if (queueOnFailure) {
          queueOperation(operation, description, maxRetries);
        }

        if (fallbackData !== undefined) {
          return fallbackData;
        }

        throw new Error("Operation requires internet connection");
      }

      try {
        return await operation();
      } catch (error) {
        // If online but operation failed, optionally queue for retry
        if (queueOnFailure && isNetworkError(error)) {
          queueOperation(operation, description, maxRetries);
        }
        throw error;
      }
    },
    [isOnline, queueOperation]
  );

  // Remove item from queue
  const removeFromQueue = useCallback((id: string) => {
    setQueue((prevQueue) => prevQueue.filter((item) => item.id !== id));
  }, []);

  // Clear entire queue
  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  // Retry failed operations
  const retryQueue = useCallback(() => {
    if (isOnline) {
      processQueue();
    }
  }, [isOnline, processQueue]);

  return {
    isOnline,
    queue,
    isProcessingQueue,
    queueOperation,
    executeWithOfflineSupport,
    removeFromQueue,
    clearQueue,
    retryQueue,
    queueSize: queue.length,
  };
};

// Helper function to determine if an error is network-related
function isNetworkError(error: any): boolean {
  if (!error) return false;

  const networkErrorCodes = [
    "NETWORK_ERROR",
    "ERR_NETWORK",
    "ERR_INTERNET_DISCONNECTED",
    "ERR_CONNECTION_REFUSED",
    "TIMEOUT_ERROR",
  ];

  const networkErrorMessages = [
    "network error",
    "connection error",
    "timeout",
    "fetch failed",
    "failed to fetch",
  ];

  const errorCode = error.code || error.name || "";
  const errorMessage = (error.message || "").toLowerCase();

  return (
    networkErrorCodes.includes(errorCode) ||
    networkErrorMessages.some((msg) => errorMessage.includes(msg)) ||
    (error.status === undefined && errorMessage.includes("failed"))
  );
}
