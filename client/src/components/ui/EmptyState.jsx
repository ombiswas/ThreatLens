import React from "react";
import { FolderOpen } from "lucide-react";
import { cn } from "../../utils/cn.js";
import { Button } from "./Button.jsx";

export function EmptyState({
  icon: Icon = FolderOpen,
  title = "No data available",
  description = "There are no records matching your current filter criteria.",
  actionText,
  onAction,
  className
}) {
  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-soc-border bg-soc-surface/40 p-8 text-center sm:p-12",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-soc-raised text-stone-400">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>

      <h4 className="mt-4 text-sm font-semibold text-stone-200">{title}</h4>
      <p className="mt-1.5 max-w-sm text-xs text-soc-muted leading-relaxed">{description}</p>

      {actionText && onAction && (
        <div className="mt-5">
          <Button variant="secondary" size="sm" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
}
