import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  Bell,
  LogOut,
  Radio,
  Check,
  CheckCheck,
  AlertTriangle,
  Info,
  ShieldAlert
} from "lucide-react";
import { useAuth } from "../../features/auth/useAuth.js";
import { onSocketStatusChange, onNotificationNew } from "../../services/socket.js";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from "../../services/notificationApi.js";
import { Badge } from "../ui/Badge.jsx";

export function TopBar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [socketStatus, setSocketStatus] = useState("disconnected");
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  // 1. Fetch live notifications
  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    enabled: Boolean(user),
    staleTime: 15000,
    refetchInterval: 30000
  });

  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;

  // 2. Mark Single Notification as Read
  const markReadMutation = useMutation({
    mutationFn: (id) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  // 3. Mark All Notifications as Read
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  // Socket status tracking
  useEffect(() => {
    const unsubscribe = onSocketStatusChange((status) => {
      setSocketStatus(status);
    });
    return unsubscribe;
  }, []);

  // Listen to new real-time alerts
  useEffect(() => {
    const unsubscribe = onNotificationNew(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
    return unsubscribe;
  }, [queryClient]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const socketIndicator = {
    connected: {
      label: "Socket Live",
      dot: "bg-emerald-400 animate-pulse",
      text: "text-emerald-400"
    },
    reconnecting: {
      label: "Reconnecting",
      dot: "bg-amber-400 animate-ping",
      text: "text-amber-400"
    },
    connecting: {
      label: "Connecting",
      dot: "bg-sky-400 animate-pulse",
      text: "text-sky-400"
    },
    disconnected: {
      label: "Socket Offline",
      dot: "bg-stone-500",
      text: "text-stone-400"
    },
    error: {
      label: "Connection Error",
      dot: "bg-rose-500",
      text: "text-rose-400"
    }
  }[socketStatus] || {
    label: "Offline",
    dot: "bg-stone-500",
    text: "text-stone-400"
  };

  const getSeverityBadgeVariant = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "critical";
      case "warning":
      case "high":
        return "high";
      default:
        return "low";
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-soc-border bg-soc-surface/90 px-4 backdrop-blur sm:px-6">
      {/* Left: Mobile Menu & Live Badge */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded p-2 text-stone-400 hover:bg-soc-raised hover:text-stone-100 lg:hidden focus:outline-none focus:ring-2 focus:ring-brand-primary"
          aria-label="Toggle navigation drawer"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Live Socket Status Pill */}
        <div
          role="status"
          aria-label={`Telemetry status: ${socketIndicator.label}`}
          className="flex items-center gap-2 rounded-full border border-soc-border bg-soc-dark/70 px-3 py-1 text-xs font-mono"
        >
          <span className={`h-2 w-2 rounded-full ${socketIndicator.dot}`} aria-hidden="true" />
          <span className={`font-semibold ${socketIndicator.text}`}>{socketIndicator.label}</span>
        </div>
      </div>

      {/* Right: Notification Bell & Profile Menu */}
      <div className="flex items-center gap-3">
        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setIsNotifOpen((prev) => !prev)}
            className="relative rounded-lg p-2 text-stone-300 hover:bg-soc-raised hover:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            aria-label={`View security notifications (${unreadCount} unread)`}
            aria-expanded={isNotifOpen}
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white font-mono">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div
              role="dialog"
              aria-label="Notification alerts"
              className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-soc-border bg-soc-surface p-4 shadow-2xl focus:outline-none z-50"
            >
              <div className="flex items-center justify-between border-b border-soc-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-200">
                    Security Alerts
                  </span>
                  {unreadCount > 0 && (
                    <span className="rounded bg-rose-950/80 px-1.5 py-0.5 text-[10px] font-mono font-bold text-rose-400 border border-rose-800/40">
                      {unreadCount} unread
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                    className="flex items-center gap-1 text-[11px] font-mono text-brand-primary hover:underline"
                  >
                    <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="mt-3 max-h-80 overflow-y-auto space-y-2 text-xs">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-soc-muted">
                    No notifications recorded.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif._id}
                      className={`flex items-start justify-between gap-2.5 rounded-lg border p-2.5 transition-colors ${
                        notif.isRead
                          ? "border-soc-border/40 bg-soc-dark/30 opacity-70"
                          : "border-soc-border bg-soc-raised/40"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityBadgeVariant(notif.severity)} size="sm">
                            {notif.severity || "Info"}
                          </Badge>
                          <span className="font-semibold text-stone-200 text-xs">
                            {notif.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-soc-muted leading-tight">{notif.message}</p>
                        <div className="text-[10px] font-mono text-soc-dim">
                          {new Date(notif.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </div>
                      </div>

                      {!notif.isRead && (
                        <button
                          type="button"
                          onClick={() => markReadMutation.mutate(notif._id)}
                          disabled={markReadMutation.isPending}
                          className="rounded p-1 text-stone-400 hover:bg-soc-dark hover:text-stone-100"
                          title="Mark as read"
                          aria-label={`Mark notification '${notif.title}' as read`}
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Logout Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-lg border border-soc-border bg-soc-dark/60 px-3 py-1.5 text-xs text-stone-200 hover:bg-soc-raised focus:outline-none focus:ring-2 focus:ring-brand-primary"
            aria-label="User account menu"
            aria-expanded={isUserMenuOpen}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary text-[11px] font-bold text-white uppercase">
              {user?.name ? user.name[0] : "U"}
            </div>
            <span className="hidden sm:inline-block max-w-[120px] truncate font-medium">
              {user?.name || "User"}
            </span>
          </button>

          {isUserMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-52 rounded-xl border border-soc-border bg-soc-surface p-2 shadow-2xl focus:outline-none z-50"
            >
              <div className="px-3 py-2 border-b border-soc-border/60">
                <div className="text-xs font-semibold text-stone-100">{user?.name}</div>
                <div className="font-mono text-[11px] text-soc-muted truncate">{user?.email}</div>
                <div className="mt-1">
                  <Badge variant="neutral" size="sm" className="capitalize text-[10px]">
                    {user?.role || "viewer"}
                  </Badge>
                </div>
              </div>

              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition-colors"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
