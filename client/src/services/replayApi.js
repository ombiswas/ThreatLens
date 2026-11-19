import { api } from "./api.js";

/**
 * Fetch current user's active replay status.
 */
export async function fetchReplayStatus() {
  const data = await api.get("/api/replay/status");
  return data;
}

/**
 * Start a replay session.
 * @param {object} params
 * @param {string} params.datasetId - Mongo ID or "demo"
 * @param {number} params.flowsPerSec - 1 to 50
 */
export async function startReplaySession(params) {
  const data = await api.post("/api/replay/start", params);
  return data;
}

/**
 * Stop active replay session.
 */
export async function stopReplaySession() {
  const data = await api.post("/api/replay/stop");
  return data;
}
