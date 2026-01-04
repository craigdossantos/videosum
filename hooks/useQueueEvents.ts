"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { QueueState, QueueItem, QueueItemProgress } from "@/lib/queue";

export interface QueueEventData {
  type: "state" | "progress" | "itemComplete" | "itemFailed" | "itemCancelled";
  state?: QueueState;
  item?: QueueItem;
  progress?: QueueItemProgress;
  error?: string;
  resultFolderId?: string;
}

export function useQueueEvents() {
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource("/api/queue/events");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: QueueEventData = JSON.parse(event.data);

        switch (data.type) {
          case "state":
            if (data.state) {
              setQueueState(data.state);
            }
            break;

          case "progress":
            // Update the progress of the specific item
            if (data.item && data.progress) {
              setQueueState((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  items: prev.items.map((item) =>
                    item.id === data.item?.id
                      ? { ...item, progress: data.progress }
                      : item,
                  ),
                };
              });
            }
            break;

          case "itemComplete":
          case "itemFailed":
          case "itemCancelled":
            // Full state update will follow
            break;
        }
      } catch {
        console.error("Failed to parse queue event");
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();

      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  // API functions
  const addToQueue = useCallback(
    async (files: File[], folder?: string): Promise<boolean> => {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      if (folder) formData.append("folder", folder);

      try {
        const response = await fetch("/api/queue", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Failed to add to queue");
          return false;
        }

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add to queue");
        return false;
      }
    },
    [],
  );

  const removeItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/queue/${id}`, { method: "DELETE" });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const retryItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/queue/${id}`, { method: "PATCH" });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const clearCompleted = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/queue", { method: "DELETE" });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const refreshQueue = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/queue");
      if (response.ok) {
        const state = await response.json();
        setQueueState(state);
      }
    } catch {
      console.error("Failed to refresh queue");
    }
  }, []);

  return {
    queueState,
    connected,
    error,
    addToQueue,
    removeItem,
    retryItem,
    clearCompleted,
    refreshQueue,
  };
}
