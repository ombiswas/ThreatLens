import { api } from "./api.js";

/**
 * Fetch summary KPI metrics for the SOC dashboard.
 */
export async function fetchStatsSummary() {
  const data = await api.get("/api/stats/summary");
  return data;
}

/**
 * Fetch time-bucketed telemetry stats.
 * @param {object} params
 * @param {string} [params.interval="hour"] - "minute" | "hour" | "day"
 * @param {string} [params.startDate]
 * @param {string} [params.endDate]
 */
export async function fetchStatsTimeline(params = {}) {
  const data = await api.get("/api/stats/timeline", { params });
  return data?.timeline || [];
}

/**
 * Fetch distribution across class, risk level, status, and protocol.
 */
export async function fetchStatsDistribution() {
  const data = await api.get("/api/stats/distribution");
  return data;
}

/**
 * Fetch top source IPs.
 * @param {object} params
 * @param {number} [params.limit=5]
 */
export async function fetchTopSources(params = {}) {
  const data = await api.get("/api/stats/top-sources", { params });
  return data?.sources || [];
}
