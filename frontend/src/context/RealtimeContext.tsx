import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getAccessToken } from "../api/client";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

const EVENT_MESSAGES: Record<string, string> = {
  "task.assigned": "A task was assigned to you.",
  "task.status_changed": "The status of one of your tasks changed.",
  "task.commented": "Someone commented on your task.",
};

// Keeps one authenticated WebSocket open and refreshes cached data
// whenever the backend pushes an event.
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let socket: WebSocket | null = null;
    let retryTimer: number | undefined;
    let retryDelay = 1000;
    let stopped = false;

    function connect() {
      const token = getAccessToken();

      if (!token || stopped) {
        return;
      }

      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      socket = new WebSocket(`${protocol}://${window.location.host}/ws`);

      socket.onopen = () => {
        socket?.send(JSON.stringify({ type: "auth", accessToken: token }));
      };

      socket.onmessage = (message) => {
        let data: { type?: string; event?: { eventType?: string } };

        try {
          data = JSON.parse(message.data as string);
        } catch {
          return;
        }

        if (data.type === "auth.success") {
          retryDelay = 1000;
          return;
        }

        if (data.type === "outbox.event") {
          const eventType = data.event?.eventType ?? "";

          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
          queryClient.invalidateQueries({ queryKey: ["task-comments"] });
          queryClient.invalidateQueries({ queryKey: ["task-activity"] });

          showToast(EVENT_MESSAGES[eventType] ?? "New activity.", "info");
        }
      };

      socket.onclose = () => {
        if (stopped) {
          return;
        }

        // Reconnect with a growing delay, up to 30 seconds.
        retryTimer = window.setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30_000);
      };
    }

    connect();

    return () => {
      stopped = true;
      window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, [isAuthenticated, queryClient, showToast]);

  return <>{children}</>;
}
