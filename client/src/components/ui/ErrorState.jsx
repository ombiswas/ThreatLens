import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "../../utils/cn.js";
import { Button } from "./Button.jsx";

export function ErrorState({
  title = "Failed to load data",
  message = "An unexpected error occurred while fetching information from the server.",
  onRetry,
  className
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-rose-900/50 bg-rose-950/20 p-8 text-center sm:p-10",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-900/40 text-rose-400">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>

      <h4 className="mt-4 text-sm font-semibold text-rose-200">{title}</h4>
      <p className="mt-1.5 max-w-sm text-xs text-rose-300/80 leading-relaxed">{message}</p>

      {onRetry && (
        <div className="mt-5">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            iconLeft={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Retry Request
          </Button>
        </div>
      )}
    </div>
  );
}
