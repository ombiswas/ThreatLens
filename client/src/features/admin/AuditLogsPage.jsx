import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Filter,
  ShieldCheck,
  RefreshCw,
  Search,
  Calendar,
  Layers,
  Activity
} from "lucide-react";
import { fetchAuditLogs } from "../../services/auditLogApi.js";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Table } from "../../components/ui/Table.jsx";

const AUDIT_ACTION_OPTIONS = [
  { value: "", label: "All Recorded Actions" },
  { value: "LOGIN_SUCCESS", label: "LOGIN_SUCCESS" },
  { value: "LOGIN_FAILURE", label: "LOGIN_FAILURE" },
  { value: "LOGOUT", label: "LOGOUT" },
  { value: "REGISTER", label: "REGISTER" },
  { value: "ROLE_CHANGE", label: "ROLE_CHANGE" },
  { value: "STATUS_CHANGE", label: "STATUS_CHANGE" },
  { value: "DATASET_UPLOAD", label: "DATASET_UPLOAD" },
  { value: "DATASET_DELETE", label: "DATASET_DELETE" },
  { value: "INCIDENT_STATUS_CHANGE", label: "INCIDENT_STATUS_CHANGE" },
  { value: "INCIDENT_EXPORT", label: "INCIDENT_EXPORT" }
];

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [actionFilter, setActionFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const queryParams = {
    page,
    limit: pageSize,
    ...(actionFilter ? { action: actionFilter } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {})
  };

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["audit-logs", queryParams],
    queryFn: () => fetchAuditLogs(queryParams),
    keepPreviousData: true
  });

  const logs = data?.logs || [];
  const pagination = data?.pagination || { total: 0, page: 1, pages: 1 };

  const getActionBadgeVariant = (action) => {
    switch (action) {
      case "LOGIN_FAILURE":
      case "DATASET_DELETE":
        return "critical";
      case "ROLE_CHANGE":
      case "STATUS_CHANGE":
        return "high";
      case "INCIDENT_STATUS_CHANGE":
      case "DATASET_UPLOAD":
        return "medium";
      case "LOGIN_SUCCESS":
      case "REGISTER":
        return "low";
      default:
        return "neutral";
    }
  };

  const columns = [
    {
      key: "timestamp",
      header: "Timestamp",
      render: (timestamp) => {
        if (!timestamp) return <span className="text-soc-dim">-</span>;
        return (
          <div className="font-mono text-xs text-stone-300">
            <div>
              {new Date(timestamp).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric"
              })}
            </div>
            <div className="text-[11px] text-soc-dim">
              {new Date(timestamp).toLocaleTimeString()}
            </div>
          </div>
        );
      }
    },
    {
      key: "action",
      header: "Security Action",
      render: (action) => {
        if (!action) return <span className="text-soc-dim">-</span>;
        return (
          <Badge
            variant={getActionBadgeVariant(action)}
            size="sm"
            className="font-mono text-[11px]"
          >
            {action}
          </Badge>
        );
      }
    },
    {
      key: "userId",
      header: "Acting Account",
      render: (user) => {
        if (!user) {
          return <span className="font-mono text-xs text-soc-dim">System / Anonymous</span>;
        }
        if (typeof user === "object") {
          return (
            <div>
              <div className="font-semibold text-stone-200 text-xs">{user.name || "User"}</div>
              <div className="font-mono text-[11px] text-soc-muted">{user.email || user._id}</div>
            </div>
          );
        }
        return <span className="font-mono text-xs text-stone-300">{user}</span>;
      }
    },
    {
      key: "ip",
      header: "Client IP",
      render: (ip) => (
        <span className="font-mono text-xs text-brand-primary">{ip || "unknown"}</span>
      )
    },
    {
      key: "details",
      header: "Event Context & Metadata",
      render: (details) => {
        const d = details || {};
        const keys = Object.keys(d);
        if (keys.length === 0) {
          return <span className="text-xs text-soc-dim">-</span>;
        }

        return (
          <div className="max-w-md truncate font-mono text-xs text-stone-300">
            {JSON.stringify(d)}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-stone-100 sm:text-3xl">
            Security Audit Trail (Admin)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-soc-muted">
            Append-only immutable record of all authentication, administrative updates, and incident
            triage actions.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading || isRefetching ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Refresh Trail
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {/* Action Filter */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="audit-action-filter"
                className="font-semibold uppercase tracking-wider text-soc-muted whitespace-nowrap"
              >
                Action:
              </label>
              <select
                id="audit-action-filter"
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-soc-border bg-soc-dark px-3 py-1.5 font-medium text-stone-100 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                {AUDIT_ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Start */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="audit-start-date"
                className="font-semibold uppercase tracking-wider text-soc-muted whitespace-nowrap"
              >
                From:
              </label>
              <input
                id="audit-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-soc-border bg-soc-dark px-3 py-1.5 font-mono text-stone-100 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>

            {/* Date Range End */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="audit-end-date"
                className="font-semibold uppercase tracking-wider text-soc-muted whitespace-nowrap"
              >
                To:
              </label>
              <input
                id="audit-end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-soc-border bg-soc-dark px-3 py-1.5 font-mono text-stone-100 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>

            {/* Reset Filters */}
            {(actionFilter || startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActionFilter("");
                  setStartDate("");
                  setEndDate("");
                  setPage(1);
                }}
                className="text-stone-400 hover:text-stone-100"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-primary" aria-hidden="true" />
                Audit Trail Entries
              </CardTitle>
              <CardDescription>
                System compliance events retained under 90-day security policy.
              </CardDescription>
            </div>
            <span className="font-mono text-xs text-soc-muted">
              {pagination.total} {pagination.total === 1 ? "event" : "events"} recorded
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Table
            columns={columns}
            data={logs}
            isLoading={isLoading}
            page={page}
            totalPages={pagination.pages}
            totalItems={pagination.total}
            pageSize={pageSize}
            onPageChange={(p) => setPage(p)}
            emptyMessage="No security audit log entries match the selected filters."
          />
        </CardContent>
      </Card>
    </div>
  );
}
