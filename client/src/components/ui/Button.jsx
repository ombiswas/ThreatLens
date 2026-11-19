import React, { forwardRef } from "react";
import { cn } from "../../utils/cn.js";
import { Spinner } from "./Spinner.jsx";

const variantStyles = {
  primary:
    "bg-brand-primary text-white hover:bg-brand-hover shadow-sm hover:shadow-warm-glow active:scale-[0.98] border border-transparent",
  secondary:
    "bg-soc-surface text-stone-200 border border-soc-border hover:bg-soc-raised hover:border-soc-border-light hover:text-white active:scale-[0.98]",
  ghost: "bg-transparent text-stone-300 hover:bg-soc-raised hover:text-white active:scale-[0.98]",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 shadow-sm active:scale-[0.98] border border-transparent",
  outline:
    "bg-transparent border border-brand-primary text-brand-primary hover:bg-brand-primary/10 active:scale-[0.98]"
};

const sizeStyles = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-10 px-4 text-sm gap-2 rounded-md",
  lg: "h-12 px-5 text-base gap-2.5 rounded-md"
};

export const Button = forwardRef(function Button(
  {
    type = "button",
    variant = "primary",
    size = "md",
    isLoading = false,
    disabled = false,
    iconLeft,
    iconRight,
    className,
    children,
    ...props
  },
  ref
) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading ? "true" : undefined}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-soc-dark",
        variantStyles[variant] || variantStyles.primary,
        sizeStyles[size] || sizeStyles.md,
        isDisabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
      {...props}
    >
      {isLoading ? (
        <Spinner size={size === "lg" ? "md" : "sm"} className="border-t-white" />
      ) : (
        iconLeft
      )}
      <span>{children}</span>
      {!isLoading && iconRight}
    </button>
  );
});
