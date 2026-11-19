import React from "react";
import { NavLink } from "react-router-dom";
import {
  Shield,
  LayoutDashboard,
  ShieldAlert,
  Database,
  BarChart3,
  Users,
  FileText,
  ScanLine,
  X
} from "lucide-react";
import { useAuth } from "../../features/auth/useAuth.js";
import { RoleBadge } from "../ui/Badge.jsx";
import { cn } from "../../utils/cn.js";

const navigationItems = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "analyst", "viewer"]
  },
  {
    name: "Incidents Triage",
    path: "/incidents",
    icon: ShieldAlert,
    roles: ["admin", "analyst", "viewer"]
  },
  {
    name: "Datasets & Replay",
    path: "/datasets",
    icon: Database,
    roles: ["admin", "analyst", "viewer"]
  },
  {
    name: "Comparative Evaluation",
    path: "/evaluation",
    icon: BarChart3,
    roles: ["admin", "analyst", "viewer"]
  },
  {
    name: "Flow Detection",
    path: "/detect",
    icon: ScanLine,
    roles: ["admin", "analyst"]
  },
  {
    name: "User Management",
    path: "/admin/users",
    icon: Users,
    roles: ["admin"]
  },
  {
    name: "Audit Logs",
    path: "/admin/audit-logs",
    icon: FileText,
    roles: ["admin"]
  }
];

export function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const userRole = (user?.role || "viewer").toLowerCase();

  const allowedNavItems = navigationItems.filter((item) => item.roles.includes(userRole));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-soc-border bg-soc-surface transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-soc-border px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-soc-border bg-soc-dark text-brand-primary shadow-warm-glow">
              <Shield className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="font-display text-sm font-bold tracking-tight text-stone-100">
                AI CyberShield
              </div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-brand-primary">
                SOC v0.1.0
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-stone-400 hover:text-stone-100 lg:hidden focus:outline-none focus:ring-2 focus:ring-brand-primary"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-soc-dim">
            Operations &amp; Analytics
          </div>

          <nav className="space-y-1" aria-label="Main Navigation">
            {allowedNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-colors select-none",
                      isActive
                        ? "border-l-4 border-l-brand-primary bg-brand-primary/10 text-stone-100 font-semibold"
                        : "text-stone-300 hover:bg-soc-raised hover:text-white"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive
                            ? "text-brand-primary"
                            : "text-stone-400 group-hover:text-stone-200"
                        )}
                        aria-hidden="true"
                      />
                      <span>{item.name}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Card in Footer */}
        <div className="border-t border-soc-border bg-soc-dark/40 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-stone-200">
                {user?.name || "Security Analyst"}
              </div>
              <div className="truncate font-mono text-[11px] text-soc-muted">
                {user?.email || "analyst@local"}
              </div>
            </div>
            <RoleBadge role={user?.role || "viewer"} />
          </div>
        </div>
      </aside>
    </>
  );
}
