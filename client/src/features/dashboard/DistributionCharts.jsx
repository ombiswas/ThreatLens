import React, { memo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
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
import { PieChart as PieIcon, BarChart2 } from "lucide-react";

const CLASS_COLORS = {
  "DoS/DDoS": "#ea580c",
  PortScan: "#f59e0b",
  BruteForce: "#e11d48",
  Benign: "#10b981"
};

const RISK_COLORS = {
  Critical: "#e11d48",
  High: "#ea580c",
  Medium: "#f59e0b",
  Low: "#10b981"
};

function CustomPieTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];
  return (
    <div className="rounded border border-soc-border bg-soc-surface p-2 shadow-warm text-xs font-mono">
      <div className="font-semibold text-stone-200">{item.name}</div>
      <div className="text-soc-muted">
        Incidents: <span className="font-bold text-stone-100">{item.value}</span>
      </div>
    </div>
  );
}

export const DistributionCharts = memo(function DistributionCharts({
  distribution,
  isLoading = false
}) {
  const classData = Object.entries(distribution?.byClass || {}).map(([name, value]) => ({
    name,
    value
  }));

  const riskData = ["Critical", "High", "Medium", "Low"].map((level) => ({
    name: level,
    count: distribution?.byRiskLevel?.[level] || 0
  }));

  const hasClassData = classData.some((d) => d.value > 0);
  const hasRiskData = riskData.some((d) => d.count > 0);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 1. Attack Class Distribution Donut */}
      <Card>
        <CardHeader>
          <CardTitle>Attack Classification Breakdown</CardTitle>
          <CardDescription>
            Proportional distribution across ML-classified threat types
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 w-full flex items-center justify-center">
              <Skeleton className="h-52 w-52 rounded-full" />
            </div>
          ) : !hasClassData ? (
            <EmptyState
              icon={PieIcon}
              title="No classification data"
              description="Classification data will populate as flow records are processed."
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={classData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {classData.map((entry) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={CLASS_COLORS[entry.name] || "#78716c"}
                        stroke="#171514"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                    formatter={(val) => <span className="text-stone-300">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Risk Level Severity Distribution Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Severity Distribution</CardTitle>
          <CardDescription>
            Incident breakdown by severity band (0–100 threat score)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 w-full flex items-center justify-center">
              <Skeleton className="h-52 w-full rounded" />
            </div>
          ) : !hasRiskData ? (
            <EmptyState
              icon={BarChart2}
              title="No risk data available"
              description="Threat score evaluations will be visualized here."
            />
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#78716c" fontSize={11} tickLine={false} />
                  <YAxis stroke="#78716c" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded border border-soc-border bg-soc-surface p-2 text-xs font-mono">
                          <div className="font-semibold text-stone-200">{d.name} Risk</div>
                          <div className="text-soc-muted">
                            Count: <span className="text-stone-100 font-bold">{d.count}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {riskData.map((entry) => (
                      <Cell key={`bar-${entry.name}`} fill={RISK_COLORS[entry.name] || "#ea580c"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
