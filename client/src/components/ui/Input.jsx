import React, { forwardRef, useId } from "react";
import { cn } from "../../utils/cn.js";

export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    id: customId,
    type = "text",
    className,
    containerClassName,
    startAdornment,
    endAdornment,
    disabled = false,
    required = false,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const inputId = customId || generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  return (
    <div className={cn("w-full flex flex-col gap-1.5", containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wider text-stone-300"
        >
          {label}
          {required && <span className="ml-1 text-rose-400">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {startAdornment && (
          <div className="pointer-events-none absolute left-3 flex items-center text-stone-400">
            {startAdornment}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            "w-full rounded-md border border-soc-border bg-soc-surface px-3 py-2 text-sm text-stone-100 placeholder-soc-dim transition-colors",
            "focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20",
            startAdornment && "pl-9",
            endAdornment && "pr-10",
            error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20",
            disabled && "cursor-not-allowed opacity-50 bg-soc-raised",
            className
          )}
          {...props}
        />

        {endAdornment && <div className="absolute right-3 flex items-center">{endAdornment}</div>}
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-rose-400">
          {error}
        </p>
      )}

      {!error && helperText && (
        <p id={helperId} className="text-xs text-soc-muted">
          {helperText}
        </p>
      )}
    </div>
  );
});
