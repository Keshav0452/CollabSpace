import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notifications.api";
import type { AppNotification } from "../../api/notifications.api";

import "./NotificationBell.css";

function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const notificationKey = ["notifications", user?.id];
  const queryClient = useQueryClient();

  const countQuery = useQuery({
    queryKey: [...notificationKey, "unread-count"],
    queryFn: getUnreadCount,
  });

  const listQuery = useQuery({
    queryKey: [...notificationKey, "list"],
    queryFn: () => getNotifications(15),
    enabled: isOpen,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: notificationKey });
  }

  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: refresh,
  });

  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: refresh,
  });

  // Close the dropdown when clicking outside of it.
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);

    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleOpenNotification(notification: AppNotification) {
    if (!notification.isRead) {
      readMutation.mutate(notification.id);
    }

    setIsOpen(false);
    navigate(notification.taskId ? `/tasks?taskId=${notification.taskId}` : "/tasks");
  }

  const unreadCount = countQuery.data ?? 0;
  const notifications = listQuery.data?.notifications ?? [];

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        className="topbar-icon"
        aria-label={`Notifications${
          unreadCount ? ` (${unreadCount} unread)` : ""
        }`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-count">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <strong>Notifications</strong>
            <button
              type="button"
              disabled={unreadCount === 0 || readAllMutation.isPending}
              onClick={() => readAllMutation.mutate()}
            >
              Mark all read
            </button>
          </div>

          {listQuery.isLoading && <p className="muted">Loading...</p>}
          {listQuery.isError && (
            <p className="task-form-error">Unable to load notifications.</p>
          )}
          {listQuery.isSuccess && notifications.length === 0 && (
            <p className="muted">You're all caught up.</p>
          )}

          <ul>
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  className={
                    notification.isRead
                      ? "notification-item"
                      : "notification-item unread"
                  }
                  onClick={() => handleOpenNotification(notification)}
                >
                  <span>{notification.message}</span>
                  <time>
                    {new Date(notification.createdAt).toLocaleString(
                      undefined,
                      { dateStyle: "medium", timeStyle: "short" },
                    )}
                  </time>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
