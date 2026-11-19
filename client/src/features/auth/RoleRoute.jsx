import React from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "./useAuth.js";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "../../components/ui/Button.jsx";

export function RoleRoute({ allowedRoles = [], children }) {
  const { user } = useAuth();

  const userRole = (user?.role || "").toLowerCase();
  const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

  const hasPermission = normalizedAllowed.includes(userRole);

  if (!hasPermission) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-900/60 bg-rose-950/30 text-rose-400 shadow-warm">
          <ShieldAlert className="h-8 w-8" aria-hidden="true" />
        </div>

        <div className="mt-6 font-mono text-xs uppercase tracking-widest text-rose-400">
          403 — Unauthorized Role Elevation
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-100">Access Denied</h1>
        <p className="mt-2 max-w-md text-xs sm:text-sm text-soc-muted">
          Your current security clearance level (<strong>{user?.role || "Viewer"}</strong>) is
          insufficient to access this administrative module. Required clearance:{" "}
          <span className="font-semibold text-stone-200">{allowedRoles.join(" or ")}</span>.
        </p>

        <div className="mt-8">
          <Link to="/dashboard">
            <Button
              variant="secondary"
              size="md"
              iconLeft={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
            >
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return children ? children : <Outlet />;
}
