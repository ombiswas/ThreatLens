import React, { forwardRef, useId } from "react";
import { cn } from "../../utils/cn.js";
import { ChevronDown } from "lucide-react";

export const Select = forwardRef(function Select(
  {
    label,
    error,
    helperText,
    id: customId,
    options = [],
    className,
    containerClassName,
    disabled = false,
    required = false,
    children,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const selectId = customId || generatedId;
  const errorId = `${selectId}-error`;
  const helperId = `${selectId}-helper`;

  return (
    <div className={cn("w-full flex flex-col gap-1.5", containerClassName)}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold uppercase tracking-wider text-stone-300"
        >
          {label}
          {required && <span className="ml-1 text-rose-400">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            "w-full appearance-none rounded-md border border-soc-border bg-soc-surface px-3 py-2 pr-9 text-sm text-stone-100 transition-colors",
            "focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20",
            error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20",
            disabled && "cursor-not-allowed opacity-50 bg-soc-raised",
            className
          )}
          {...props}
        >
          {children ||
            options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="bg-soc-surface text-stone-100"
              >
                {opt.label}
              </option>
            ))}
        </select>

        <div className="pointer-events-none absolute right-3 flex items-center text-stone-400">
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </div>
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
