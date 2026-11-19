import React from "react";
import { cn } from "../../utils/cn.js";

const accentBorders = {
  terracotta: "border-l-4 border-l-brand-primary",
  amber: "border-l-4 border-l-brand-accent",
  rose: "border-l-4 border-l-rose-500",
  emerald: "border-l-4 border-l-emerald-500",
  sky: "border-l-4 border-l-sky-500"
};

export function Card({ children, className, accent, hover = false, ...props }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-soc-border bg-soc-surface p-5 shadow-warm transition-all duration-200",
        hover && "hover:border-soc-border-light hover:shadow-warm-raised hover:-translate-y-0.5",
        accent && accentBorders[accent],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }) {
  return (
    <div
      className={cn("mb-4 flex flex-col gap-1 border-b border-soc-border/60 pb-3", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }) {
  return (
    <h3
      className={cn("text-base font-semibold tracking-tight text-stone-100", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ children, className, ...props }) {
  return (
    <p className={cn("text-xs text-soc-muted leading-relaxed", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className, ...props }) {
  return (
    <div className={cn("text-sm text-stone-200", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "mt-4 flex items-center justify-between border-t border-soc-border/60 pt-3 text-xs text-soc-muted",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
