import React, { memo } from "react";
import { Activity, ShieldAlert, AlertTriangle, Percent } from "lucide-react";
import { Card } from "../../components/ui/Card.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";

export const SummaryCards = memo(function SummaryCards({ summary, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-soc-border bg-soc-surface p-5 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>
    );
  }

  const totalEvents = summary?.totalEvents ?? 0;
  const attackCount = summary?.attackCount ?? 0;
  const highCriticalCount = summary?.highCriticalCount ?? 0;
  const attackRatio = summary?.attackRatio ?? (totalEvents > 0 ? attackCount / totalEvents : 0);
  const ratioPercent = (attackRatio * 100).toFixed(1);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Monitored Flows */}
      <Card accent="terracotta" hover>
        <div className="flex items-center justify-between text-soc-muted">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Flow Events</span>
          <Activity className="h-4 w-4 text-brand-primary" aria-hidden="true" />
        </div>
        <div className="mt-2.5 font-mono text-2xl font-bold text-stone-100">
          {totalEvents.toLocaleString()}
        </div>
        <p className="mt-1 text-xs text-soc-muted">Network flows ingested across all sessions</p>
      </Card>

      {/* 2. Detected Attacks */}
      <Card accent="amber" hover>
        <div className="flex items-center justify-between text-soc-muted">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Total Attacks Detected
          </span>
          <ShieldAlert className="h-4 w-4 text-brand-accent" aria-hidden="true" />
        </div>
        <div className="mt-2.5 font-mono text-2xl font-bold text-stone-100">
          {attackCount.toLocaleString()}
        </div>
        <p className="mt-1 text-xs text-soc-muted">
          Non-benign classifications recorded as incidents
        </p>
      </Card>

      {/* 3. High & Critical Incidents */}
      <Card accent="rose" hover>
        <div className="flex items-center justify-between text-soc-muted">
          <span className="text-xs font-semibold uppercase tracking-wider">
            High &amp; Critical Threats
          </span>
          <AlertTriangle className="h-4 w-4 text-rose-500" aria-hidden="true" />
        </div>
        <div className="mt-2.5 font-mono text-2xl font-bold text-rose-300">
          {highCriticalCount.toLocaleString()}
        </div>
        <p className="mt-1 text-xs text-soc-muted">Threat score &ge; 60 requiring active triage</p>
      </Card>

      {/* 4. Attack Ratio */}
      <Card accent="emerald" hover>
        <div className="flex items-center justify-between text-soc-muted">
          <span className="text-xs font-semibold uppercase tracking-wider">Attack Flow Ratio</span>
          <Percent className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        </div>
        <div className="mt-2.5 font-mono text-2xl font-bold text-emerald-400">{ratioPercent}%</div>
        <p className="mt-1 text-xs text-soc-muted">Proportion of attack flows to total traffic</p>
      </Card>
    </div>
  );
});
