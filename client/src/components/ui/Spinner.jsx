import React from "react";
import { cn } from "../../utils/cn.js";

const sizes = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-3"
};

export function Spinner({ size = "md", className, label = "Loading..." }) {
  return (
    <div role="status" className="inline-flex items-center justify-center">
      <div
        className={cn(
          "animate-spin rounded-full border-soc-border border-t-brand-primary",
          sizes[size] || sizes.md,
          className
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
