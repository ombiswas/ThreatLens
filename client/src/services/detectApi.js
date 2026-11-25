import { api } from "./api.js";

/**
 * Dispatches a single network flow record to POST /api/detect for ML classification,
 * transparent threat scoring, and baseline rule evaluation.
 *
 * @param {object} flowRecord - Flow feature map containing the 67 CIC-IDS2017 features
 * @returns {Promise<object>} Analysis payload containing mlClass, confidence, score, riskLevel, baseline, and factors
 */
export async function detectSingleFlow(flowRecord) {
  const result = await api.post("/api/detect", { flow: flowRecord });
  return result?.data || result;
}

/**
 * Dispatches a batch of network flow records to POST /api/detect.
 *
 * @param {Array<object>} flows - Array of flow records (max 100)
 * @returns {Promise<Array<object>>} Batch analysis results
 */
export async function detectBatchFlows(flows) {
  const result = await api.post("/api/detect", { flows });
  return result?.data || result;
}
