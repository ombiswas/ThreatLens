import React, { memo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "../../components/ui/Card.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { Activity } from "lucide-react";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-lg border border-soc-border bg-soc-surface/95 p-3 shadow-warm-raised backdrop-blur text-xs">
      <div className="font-mono font-semibold text-stone-200 border-b border-soc-border/60 pb-1.5 mb-2">
        {label}
      </div>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-soc-muted">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}:
            </span>
            <span className="font-mono font-bold text-stone-100">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const TimelineChart = memo(function TimelineChart({
  timeline = [],
  interval = "hour",
  onIntervalChange,
  isLoading = false
}) {
  const chartData = timeline.map((item) => {
    // Format timestamp label
    const date = new Date(item.timestamp);
    const label =
      interval === "minute"
        ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        : interval === "hour"
          ? `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : date.toLocaleDateString([], { month: "short", day: "numeric" });

    return {
      timestamp: label,
      "DoS/DDoS": item.byClass?.["DoS/DDoS"] || 0,
      PortScan: item.byClass?.PortScan || 0,
      BruteForce: item.byClass?.BruteForce || 0,
      avgScore: item.avgScore || 0,
      total: item.total || 0
    };
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle>Threat Activity Timeline</CardTitle>
            <CardDescription>
              Temporal distribution of attack classes and incident volume
            </CardDescription>
          </div>

          {/* Interval selector buttons */}
          <div
            role="group"
            aria-label="Timeline aggregation interval"
            className="flex items-center rounded-lg border border-soc-border bg-soc-dark/60 p-1 text-xs"
          >
            {[
              { id: "minute", label: "Minute" },
              { id: "hour", label: "Hour" },
              { id: "day", label: "Day" }
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => onIntervalChange?.(btn.id)}
                className={`rounded px-2.5 py-1 font-medium transition-colors ${
                  interval === btn.id
                    ? "bg-brand-primary text-white font-semibold"
                    : "text-soc-muted hover:text-stone-200"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="h-72 w-full flex items-center justify-center">
            <Skeleton className="h-64 w-full rounded" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-72 w-full flex items-center justify-center">
            <EmptyState
              icon={Activity}
              title="No timeline telemetry available"
              description="Replay flows or upload a network capture dataset to view attack time distributions."
            />
          </div>
        ) : (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradDos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gradPortScan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gradBruteForce" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e11d48" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0.05} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#262220" />
                <XAxis dataKey="timestamp" stroke="#78716c" fontSize={11} tickLine={false} />
                <YAxis stroke="#78716c" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  formatter={(val) => <span className="text-stone-300">{val}</span>}
                />

                <Area
                  type="monotone"
                  dataKey="DoS/DDoS"
                  stackId="1"
                  stroke="#ea580c"
                  fill="url(#gradDos)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="PortScan"
                  stackId="1"
                  stroke="#f59e0b"
                  fill="url(#gradPortScan)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="BruteForce"
                  stackId="1"
                  stroke="#e11d48"
                  fill="url(#gradBruteForce)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
