import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/useAuth.js";
import {
  fetchStatsSummary,
  fetchStatsTimeline,
  fetchStatsDistribution,
  fetchTopSources
} from "../../services/statsApi.js";
import { SummaryCards } from "./SummaryCards.jsx";
import { TimelineChart } from "./TimelineChart.jsx";
import { DistributionCharts } from "./DistributionCharts.jsx";
import { TopSourcesTable } from "./TopSourcesTable.jsx";
import { LiveFeedPanel } from "./LiveFeedPanel.jsx";
import { IncidentDetailModal } from "../incidents/IncidentDetailModal.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { RotateCcw, Radio } from "lucide-react";

export function DashboardPage() {
  const { user } = useAuth();
  const [interval, setInterval] = useState("hour");
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Queries
  const summaryQuery = useQuery({
    queryKey: ["stats", "summary"],
    queryFn: fetchStatsSummary,
    refetchInterval: 15000
  });

  const timelineQuery = useQuery({
    queryKey: ["stats", "timeline", interval],
    queryFn: () => fetchStatsTimeline({ interval }),
    refetchInterval: 30000
  });

  const distributionQuery = useQuery({
    queryKey: ["stats", "distribution"],
    queryFn: fetchStatsDistribution,
    refetchInterval: 30000
  });

  const topSourcesQuery = useQuery({
    queryKey: ["stats", "topSources"],
    queryFn: () => fetchTopSources({ limit: 5 }),
    refetchInterval: 30000
  });

  const handleRefresh = useCallback(() => {
    summaryQuery.refetch();
    timelineQuery.refetch();
    distributionQuery.refetch();
    topSourcesQuery.refetch();
  }, [summaryQuery, timelineQuery, distributionQuery, topSourcesQuery]);

  const handleSelectIncident = useCallback((incident) => {
    setSelectedIncident(incident);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-stone-100 sm:text-3xl">
            Security Operations Center (SOC)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-soc-muted">
            Real-time cyberattack classification, threat score analytics, and telemetry monitoring
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-soc-border bg-soc-dark/70 px-3 py-1 text-xs font-semibold text-stone-300">
            <Radio className="h-3 w-3 text-emerald-400 animate-pulse" aria-hidden="true" />
            <span>Role: {user?.role?.toUpperCase()}</span>
          </span>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            isLoading={summaryQuery.isFetching}
            iconLeft={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* 1. KPI Summary Cards */}
      <SummaryCards summary={summaryQuery.data} isLoading={summaryQuery.isLoading} />

      {/* 2. Live Telemetry Stream and Timeline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TimelineChart
            timeline={timelineQuery.data || []}
            interval={interval}
            onIntervalChange={setInterval}
            isLoading={timelineQuery.isLoading}
          />
        </div>

        <div className="lg:col-span-1">
          <LiveFeedPanel onSelectIncident={handleSelectIncident} />
        </div>
      </div>

      {/* 3. Categorical Distributions (Class & Risk) */}
      <DistributionCharts
        distribution={distributionQuery.data}
        isLoading={distributionQuery.isLoading}
      />

      {/* 4. Top Attack Sources Table */}
      <TopSourcesTable sources={topSourcesQuery.data || []} isLoading={topSourcesQuery.isLoading} />

      {/* Incident Detail Modal for Live Feed items or Top Sources */}
      {selectedIncident && (
        <IncidentDetailModal
          incidentId={selectedIncident._id || selectedIncident.id}
          isOpen={Boolean(selectedIncident)}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </div>
  );
}
