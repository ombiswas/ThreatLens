import React from "react";
import { cn } from "../../utils/cn.js";
import {
  ShieldCheck,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Radio,
  Clock,
  CheckCircle2,
  Shield,
  Activity
} from "lucide-react";

export function Badge({ children, variant = "default", className, ...props }) {
  const variants = {
    default: "bg-soc-raised text-stone-200 border-soc-border",
    outline: "bg-transparent text-stone-300 border-soc-border",
    primary: "bg-brand-primary/15 text-brand-accent border-brand-primary/40",
    success: "bg-emerald-950/40 text-emerald-300 border-emerald-800/50",
    warning: "bg-amber-950/40 text-amber-300 border-amber-800/50",
    danger: "bg-rose-950/40 text-rose-300 border-rose-800/50"
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide select-none",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * Accessible Risk Badge that pairs distinct Lucide icons, explicit textual labels,
 * and semantic borders/backgrounds so risk severity is immediately distinguishable
 * without relying on color perception alone.
 */
export function RiskBadge({ risk = "Low", className, showIcon = true }) {
  const normalized = (risk || "Low").toLowerCase();

  const config = {
    critical: {
      label: "Critical",
      icon: ShieldAlert,
      className: "bg-rose-950/40 text-rose-300 border-rose-600/50"
    },
    high: {
      label: "High",
      icon: Flame,
      className: "bg-orange-950/40 text-orange-300 border-orange-600/50"
    },
    medium: {
      label: "Medium",
      icon: AlertTriangle,
      className: "bg-amber-950/40 text-amber-300 border-amber-600/50"
    },
    low: {
      label: "Low",
      icon: ShieldCheck,
      className: "bg-emerald-950/40 text-emerald-300 border-emerald-600/50"
    }
  };

  const current = config[normalized] || config.low;
  const Icon = current.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide select-none",
        current.className,
        className
      )}
      aria-label={`Risk Level: ${current.label}`}
    >
      {showIcon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      <span>{current.label}</span>
    </span>
  );
}

/**
 * Status Badge for Incident lifecycle triage (New, Under Review, Resolved).
 */
export function StatusBadge({ status = "New", className }) {
  const normalized = (status || "New").toLowerCase();

  const config = {
    new: {
      label: "New",
      icon: Radio,
      className: "bg-sky-950/40 text-sky-300 border-sky-700/50"
    },
    "under review": {
      label: "Under Review",
      icon: Clock,
      className: "bg-amber-950/40 text-amber-300 border-amber-700/50"
    },
    resolved: {
      label: "Resolved",
      icon: CheckCircle2,
      className: "bg-emerald-950/40 text-emerald-300 border-emerald-700/50"
    }
  };

  const current = config[normalized] || config.new;
  const Icon = current.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold select-none",
        current.className,
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{current.label}</span>
    </span>
  );
}

/**
 * Attack Class Badge (Benign vs Attack classifications).
 */
export function AttackClassBadge({ attackClass = "Benign", className }) {
  const isBenign = (attackClass || "").toLowerCase() === "benign";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-xs font-medium select-none",
        isBenign
          ? "bg-stone-900 text-stone-300 border-soc-border"
          : "bg-brand-primary/15 text-orange-300 border-brand-primary/40",
        className
      )}
    >
      {isBenign ? (
        <Shield className="h-3 w-3 text-emerald-400" aria-hidden="true" />
      ) : (
        <Activity className="h-3 w-3 text-orange-400" aria-hidden="true" />
      )}
      <span>{attackClass}</span>
    </span>
  );
}

/**
 * Role Badge (Admin, Analyst, Viewer).
 */
export function RoleBadge({ role = "viewer", className }) {
  const normalized = (role || "viewer").toLowerCase();

  const styles = {
    admin: "bg-purple-950/50 text-purple-300 border-purple-800/60",
    analyst: "bg-sky-950/50 text-sky-300 border-sky-800/60",
    viewer: "bg-stone-900 text-stone-300 border-soc-border"
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider border select-none",
        styles[normalized] || styles.viewer,
        className
      )}
    >
      {role}
    </span>
  );
}
