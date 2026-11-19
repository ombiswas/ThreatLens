import React, { useState, useEffect, useRef } from "react";
import { Menu, Bell, LogOut, Radio, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "../../features/auth/useAuth.js";
import { onSocketStatusChange } from "../../services/socket.js";
import { Button } from "../ui/Button.jsx";

export function TopBar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const [socketStatus, setSocketStatus] = useState("disconnected");
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onSocketStatusChange((status) => {
      setSocketStatus(status);
    });
    return unsubscribe;
  }, []);

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
        {/* Notification Bell Dropdown Placeholder */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setIsNotifOpen((prev) => !prev)}
            className="relative rounded-lg p-2 text-stone-300 hover:bg-soc-raised hover:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            aria-label="View security notifications"
            aria-expanded={isNotifOpen}
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary" />
            </span>
          </button>

          {isNotifOpen && (
            <div
              role="dialog"
              aria-label="Notification alerts"
              className="absolute right-0 mt-2 w-80 rounded-xl border border-soc-border bg-soc-surface p-4 shadow-2xl focus:outline-none"
            >
              <div className="flex items-center justify-between border-b border-soc-border/60 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-200">
                  Security Alerts
                </span>
                <span className="font-mono text-[11px] text-brand-primary">Live SOC Feed</span>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-start gap-2.5 rounded-md border border-soc-border/40 bg-soc-dark/40 p-2.5">
                  <Radio className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" aria-hidden="true" />
                  <div>
                    <div className="font-semibold text-stone-200">Socket Telemetry Connected</div>
                    <div className="text-[11px] text-soc-muted">
                      Listening for real-time attack flows &amp; critical incident notifications.
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-center text-[11px] text-soc-dim">
                  Critical attack events will trigger automated priority alerts here.
                </div>
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
              className="absolute right-0 mt-2 w-52 rounded-xl border border-soc-border bg-soc-surface p-2 shadow-2xl focus:outline-none"
            >
              <div className="px-3 py-2 border-b border-soc-border/60">
                <div className="text-xs font-semibold text-stone-100">{user?.name}</div>
                <div className="font-mono text-[11px] text-soc-muted truncate">{user?.email}</div>
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
