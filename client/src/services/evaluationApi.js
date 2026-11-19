import { api } from "./api.js";

/**
 * Fetch latest ML model architecture, features count, and offline benchmark metrics.
 */
export async function fetchLatestModelInfo() {
  const data = await api.get("/api/evaluation/latest");
  return data;
}

/**
 * Fetch comparative evaluation for a specific dataset or demo.
 * @param {string} datasetId - Mongo ID or "demo"
 */
export async function fetchDatasetEvaluation(datasetId = "demo") {
  const data = await api.get(`/api/evaluation/dataset/${datasetId}`);
  return data;
}
