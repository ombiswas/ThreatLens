import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchIncidents, exportIncidentsCsv } from "../../services/incidentApi.js";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "../../components/ui/Card.jsx";
import { Table } from "../../components/ui/Table.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { Select } from "../../components/ui/Select.jsx";
import { RiskBadge, StatusBadge, AttackClassBadge } from "../../components/ui/Badge.jsx";
import { IncidentDetailModal } from "./IncidentDetailModal.jsx";
import { ErrorState } from "../../components/ui/ErrorState.jsx";
import { useToast } from "../../hooks/useToast.js";
import { Search, Download, FilterX, Eye, ShieldAlert, RotateCcw } from "lucide-react";

export function IncidentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast } = useToast();
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Parse and validate URL query params
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(5, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));
  const sort = searchParams.get("sort") || "detectedAt";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const searchParam = searchParams.get("search") || "";
  const riskLevel = searchParams.get("riskLevel") || "";
  const mlClass = searchParams.get("mlClass") || "";
  const status = searchParams.get("status") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  // Local state for debounced search input
  const [searchInput, setSearchInput] = useState(searchParam);

  const updateParams = useCallback(
    (newParams) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, val] of Object.entries(newParams)) {
            if (val === "" || val === null || val === undefined) {
              next.delete(key);
            } else {
              next.set(key, String(val));
            }
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  // Debounced search param sync
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchParam) {
        updateParams({ search: searchInput, page: 1 });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput, searchParam, updateParams]);

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      sort,
      order,
      search: searchParam,
      riskLevel,
      mlClass,
      status,
      startDate,
      endDate
    }),
    [page, limit, sort, order, searchParam, riskLevel, mlClass, status, startDate, endDate]
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["incidents", queryParams],
    queryFn: () => fetchIncidents(queryParams),
    placeholderData: (prev) => prev
  });

  const incidents = data?.incidents || [];
  const totalItems = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const handleSort = useCallback(
    (newKey, newOrder) => {
      updateParams({ sort: newKey, order: newOrder, page: 1 });
    },
    [updateParams]
  );

  const handlePageChange = useCallback(
    (newPage) => {
      updateParams({ page: newPage });
    },
    [updateParams]
  );

  const handleResetFilters = useCallback(() => {
    setSearchInput("");
    setSearchParams(
      new URLSearchParams({ page: "1", limit: "10", sort: "detectedAt", order: "desc" })
    );
  }, [setSearchParams]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportIncidentsCsv(queryParams);
      addToast({
        type: "success",
        title: "Export Completed",
        message: "CSV download initiated with formula injection protections."
      });
    } catch (err) {
      addToast({
        type: "error",
        title: "Export Failed",
        message: err.message || "Unable to generate incident CSV export."
      });
    } finally {
      setIsExporting(false);
    }
  };

  const hasActiveFilters = Boolean(
    searchParam || riskLevel || mlClass || status || startDate || endDate
  );

  const columns = [
    {
      key: "detectedAt",
      header: "Timestamp",
      sortable: true,
      render: (val) => (
        <span className="font-mono text-xs text-stone-200">
          {val
            ? new Date(val).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
              })
            : "-"}
        </span>
      )
    },
    {
      key: "source",
      header: "Source IP",
      sortable: false,
      render: (val) => (
        <span className="font-mono font-semibold text-stone-100 flex items-center gap-1.5">
          <span>{val}</span>
          {val && val.includes("***") && (
            <span
              className="rounded bg-soc-raised px-1 text-[10px] text-soc-dim font-sans"
              title="Masked for privacy"
            >
              Masked
            </span>
          )}
        </span>
      )
    },
    {
      key: "destination",
      header: "Destination",
      sortable: false,
      render: (val) => <span className="font-mono text-stone-300">{val || "10.0.0.1"}</span>
    },
    {
      key: "protocol",
      header: "Proto",
      sortable: false,
      render: (val) => <span className="font-mono text-xs text-soc-muted">{val || "TCP"}</span>
    },
    {
      key: "mlClass",
      header: "Attack Vector",
      sortable: true,
      render: (val) => <AttackClassBadge attackClass={val} />
    },
    {
      key: "score",
      header: "Threat Score",
      sortable: true,
      render: (score, row) => (
        <div className="flex items-center gap-2 font-mono">
          <span className="font-bold text-stone-100">{score}</span>
          <RiskBadge risk={row.riskLevel} showIcon={false} />
        </div>
      )
    },
    {
      key: "status",
      header: "Triage Status",
      sortable: true,
      render: (val) => <StatusBadge status={val} />
    },
    {
      key: "_id",
      header: "Actions",
      sortable: false,
      render: (id, row) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setSelectedIncidentId(row._id || id)}
          iconLeft={<Eye className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          Inspect
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-stone-100 sm:text-3xl">
            Security Incident Repository
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-soc-muted">
            Triage, investigate, and review classified network attack incidents with transparent
            scoring
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
            iconLeft={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExport}
            isLoading={isExporting}
            iconLeft={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <Input
                label="Search by IP"
                placeholder="Search source or target IP..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                startAdornment={<Search className="h-4 w-4" aria-hidden="true" />}
              />
            </div>

            {/* Risk Level Select */}
            <Select
              label="Risk Severity"
              value={riskLevel}
              onChange={(e) => updateParams({ riskLevel: e.target.value, page: 1 })}
              options={[
                { value: "", label: "All Risk Levels" },
                { value: "Critical", label: "Critical (80–100)" },
                { value: "High", label: "High (60–79)" },
                { value: "Medium", label: "Medium (30–59)" },
                { value: "Low", label: "Low (0–29)" }
              ]}
            />

            {/* Attack Class Select */}
            <Select
              label="Attack Vector"
              value={mlClass}
              onChange={(e) => updateParams({ mlClass: e.target.value, page: 1 })}
              options={[
                { value: "", label: "All Classifications" },
                { value: "DoS/DDoS", label: "DoS/DDoS" },
                { value: "PortScan", label: "PortScan" },
                { value: "BruteForce", label: "BruteForce" }
              ]}
            />

            {/* Status Select */}
            <Select
              label="Triage Status"
              value={status}
              onChange={(e) => updateParams({ status: e.target.value, page: 1 })}
              options={[
                { value: "", label: "All Statuses" },
                { value: "New", label: "New" },
                { value: "Under Review", label: "Under Review" },
                { value: "Resolved", label: "Resolved" }
              ]}
            />
          </div>

          {/* Active Filter Indicators */}
          {hasActiveFilters && (
            <div className="mt-3.5 flex items-center justify-between border-t border-soc-border/60 pt-3 text-xs">
              <div className="flex items-center gap-2 text-soc-muted">
                <span className="font-semibold text-stone-200">Active Filters:</span>
                {searchParam && (
                  <span className="font-mono bg-soc-raised px-2 py-0.5 rounded text-stone-200">
                    IP: {searchParam}
                  </span>
                )}
                {riskLevel && (
                  <span className="bg-soc-raised px-2 py-0.5 rounded text-stone-200">
                    Risk: {riskLevel}
                  </span>
                )}
                {mlClass && (
                  <span className="bg-soc-raised px-2 py-0.5 rounded text-stone-200">
                    Class: {mlClass}
                  </span>
                )}
                {status && (
                  <span className="bg-soc-raised px-2 py-0.5 rounded text-stone-200">
                    Status: {status}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 font-semibold text-brand-primary hover:text-brand-hover text-xs focus:outline-none"
              >
                <FilterX className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset All Filters</span>
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incidents Table */}
      {isError ? (
        <ErrorState
          title="Failed to retrieve incidents"
          message={error?.message || "Error communicating with incident service."}
          onRetry={() => refetch()}
        />
      ) : (
        <Table
          columns={columns}
          data={incidents}
          sortKey={sort}
          sortOrder={order}
          onSort={handleSort}
          page={page}
          pageSize={limit}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={handlePageChange}
          isLoading={isLoading}
          emptyMessage={
            hasActiveFilters
              ? "No security incidents match your filter criteria."
              : "No attack incidents have been logged yet. Replay flows or ingest a dataset to populate records."
          }
        />
      )}

      {/* Incident Detail Modal */}
      {selectedIncidentId && (
        <IncidentDetailModal
          incidentId={selectedIncidentId}
          isOpen={Boolean(selectedIncidentId)}
          onClose={() => setSelectedIncidentId(null)}
        />
      )}
    </div>
  );
}
