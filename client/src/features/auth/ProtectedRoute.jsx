import React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "./useAuth.js";
import { Spinner } from "../../components/ui/Spinner.jsx";

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen flex-col items-center justify-center bg-soc-dark text-stone-300"
      >
        <Spinner size="lg" className="border-t-brand-primary" />
        <span className="mt-4 font-mono text-xs uppercase tracking-widest text-soc-muted">
          Validating Security Credentials...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
}
