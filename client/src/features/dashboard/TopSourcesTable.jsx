import React, { memo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "../../components/ui/Card.jsx";
import { Table } from "../../components/ui/Table.jsx";
import { AttackClassBadge, RiskBadge } from "../../components/ui/Badge.jsx";
import { Shield } from "lucide-react";

export const TopSourcesTable = memo(function TopSourcesTable({ sources = [], isLoading = false }) {
  const columns = [
    {
      key: "source",
      header: "Source IP Address",
      render: (val) => (
        <span className="font-mono font-semibold text-stone-100 flex items-center gap-1.5">
          <span>{val}</span>
          {val.includes("***") && (
            <span
              className="rounded bg-soc-raised px-1.5 py-0.2 text-[10px] text-soc-dim font-sans"
              title="IP masked for privacy (Non-Admin view)"
            >
              Masked
            </span>
          )}
        </span>
      )
    },
    {
      key: "incidentCount",
      header: "Attack Incidents",
      render: (val) => <span className="font-mono font-bold text-stone-100">{val}</span>
    },
    {
      key: "maxScore",
      header: "Max Threat Score",
      render: (val) => {
        const risk = val >= 80 ? "Critical" : val >= 60 ? "High" : val >= 30 ? "Medium" : "Low";
        return (
          <div className="flex items-center gap-2 font-mono">
            <span className="font-bold text-stone-100">{val}</span>
            <RiskBadge risk={risk} showIcon={false} />
          </div>
        );
      }
    },
    {
      key: "classes",
      header: "Identified Attack Vectors",
      render: (classes) => (
        <div className="flex flex-wrap gap-1">
          {(classes || []).map((cls) => (
            <AttackClassBadge key={cls} attackClass={cls} />
          ))}
        </div>
      )
    },
    {
      key: "lastSeen",
      header: "Last Activity",
      render: (val) => (
        <span className="font-mono text-xs text-soc-muted">
          {val
            ? new Date(val).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
              })
            : "-"}
        </span>
      )
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Attack Source Addresses</CardTitle>
        <CardDescription>
          Highest-frequency hostile IP addresses observed in telemetry
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table
          columns={columns}
          data={sources}
          isLoading={isLoading}
          emptyMessage="No attacking source IP telemetry recorded yet."
        />
      </CardContent>
    </Card>
  );
});
