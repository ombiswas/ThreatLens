import React, { useRef } from "react";
import { cn } from "../../utils/cn.js";

export function Tabs({ tabs = [], activeTab, onChange, className }) {
  const tabRefs = useRef([]);

  const handleKeyDown = (e, index) => {
    let nextIndex = null;
    if (e.key === "ArrowRight") {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const nextTab = tabs[nextIndex];
      onChange(nextTab.id);
      tabRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        "flex items-center gap-1 border-b border-soc-border overflow-x-auto",
        className
      )}
    >
      {tabs.map((tab, idx) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            ref={(el) => (tabRefs.current[idx] = el)}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-controls={`tabpanel-${tab.id}`}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={cn(
              "group inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
              isActive
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-soc-muted hover:border-soc-border hover:text-stone-200"
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  isActive ? "text-brand-primary" : "text-stone-400 group-hover:text-stone-200"
                )}
                aria-hidden="true"
              />
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "ml-1 rounded-full px-2 py-0.5 text-[10px] font-mono",
                  isActive
                    ? "bg-brand-primary/20 text-brand-accent"
                    : "bg-soc-raised text-stone-400"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, activeTab, children, className }) {
  if (id !== activeTab) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className={cn("mt-4 focus:outline-none", className)}
    >
      {children}
    </div>
  );
}
