import React, { useState, useCallback, useEffect } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, X, Server } from "lucide-react";
import { onServerWakingChange } from "../services/api.js";
import { ToastContext } from "./toastContextDef.js";

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [isServerWaking, setIsServerWaking] = useState(false);

  useEffect(() => {
    const unsubscribe = onServerWakingChange((isWaking) => {
      setIsServerWaking(isWaking);
    });
    return unsubscribe;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = "info", title, message, description, duration = 5000 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const newToast = { id, type, title, message: message || description };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}

      {/* Cold-start Server Waking Banner */}
      {isServerWaking && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary/95 to-brand-accent/95 px-4 py-2.5 text-xs font-semibold text-white shadow-warm"
        >
          <Server className="h-4 w-4 animate-pulse" aria-hidden="true" />
          <span>
            Server is waking up from idle state (free-tier spin-up). First response may take 10-30s.
            Please wait...
          </span>
          <button
            type="button"
            onClick={() => setIsServerWaking(false)}
            className="ml-3 rounded p-0.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            aria-label="Dismiss banner"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </aside>
      )}

      {/* Floating Toast Notification Container */}
      <div
        aria-live="assertive"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2.5 sm:bottom-6 sm:right-6"
      >
        {toasts.map((toast) => {
          const isError = toast.type === "error";
          const isSuccess = toast.type === "success";
          const isWarning = toast.type === "warning";

          return (
            <div
              key={toast.id}
              role={isError ? "alert" : "status"}
              className="pointer-events-auto flex items-start gap-3 rounded-lg border border-soc-border bg-soc-surface/95 p-3.5 shadow-warm backdrop-blur transition-all duration-200"
            >
              <div className="mt-0.5 shrink-0">
                {isSuccess && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                )}
                {isError && <XCircle className="h-5 w-5 text-rose-400" aria-hidden="true" />}
                {isWarning && (
                  <AlertTriangle className="h-5 w-5 text-amber-400" aria-hidden="true" />
                )}
                {!isSuccess && !isError && !isWarning && (
                  <Info className="h-5 w-5 text-sky-400" aria-hidden="true" />
                )}
              </div>

              <div className="flex-1 text-sm">
                {toast.title && <div className="font-semibold text-stone-100">{toast.title}</div>}
                <div className="text-xs text-stone-300 leading-relaxed">{toast.message}</div>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="shrink-0 rounded p-1 text-stone-400 hover:bg-soc-raised hover:text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
