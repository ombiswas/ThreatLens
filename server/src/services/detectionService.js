import { mlClient } from "./mlClient.js";
import { calculateThreatScore } from "./scoringService.js";
import { evaluateBaseline } from "./baselineService.js";

const DEFAULT_CHUNK_SIZE = 100;

/**
 * Orchestrates detection, ML classification, threat scoring, and baseline comparison for a single flow.
 *
 * @param {object} flowRecord - Flow feature dictionary
 * @param {import("./mlClient.js").MLClient} [client=mlClient] - Injected ML client instance
 * @returns {Promise<{ mlClass: string, confidence: number, probabilities: object, baselineClass: string, baselineRule: string, score: number, riskLevel: string, explanation: Array<object> }>}
 */
export async function detectFlow(flowRecord, client = mlClient) {
  // 1. Evaluate transparent deterministic baseline heuristic
  const baselineResult = evaluateBaseline(flowRecord);

  // 2. Query ML microservice for predicted class and probabilities
  const mlResult = await client.predictSingle(flowRecord);

  const mlClass = mlResult.predicted_class;
  const confidence = mlResult.confidence;
  const probabilities = mlResult.probabilities;

  // 3. Compute 0-100 threat score and explainability factors
  const scoring = calculateThreatScore(mlClass, confidence);

  return {
    mlClass,
    confidence,
    probabilities,
    baselineClass: baselineResult.prediction,
    baselineRule: baselineResult.rule,
    score: scoring.score,
    riskLevel: scoring.riskLevel,
    explanation: scoring.explanation
  };
}

/**
 * Orchestrates batch detection across a list of flow records with chunking.
 *
 * @param {Array<object>} flowRecords - Array of flow records
 * @param {import("./mlClient.js").MLClient} [client=mlClient] - Injected ML client instance
 * @param {number} [chunkSize=100] - Chunk size for batch requests
 * @returns {Promise<Array<object>>}
 */
export async function detectBatch(flowRecords, client = mlClient, chunkSize = DEFAULT_CHUNK_SIZE) {
  if (!Array.isArray(flowRecords) || flowRecords.length === 0) {
    return [];
  }

  const results = [];

  for (let i = 0; i < flowRecords.length; i += chunkSize) {
    const chunk = flowRecords.slice(i, i + chunkSize);
    const mlBatchResponse = await client.predictBatch(chunk);

    for (let j = 0; j < chunk.length; j++) {
      const flow = chunk[j];
      const mlItem = mlBatchResponse.predictions[j];
      const baselineResult = evaluateBaseline(flow);
      const scoring = calculateThreatScore(mlItem.predicted_class, mlItem.confidence);

      results.push({
        mlClass: mlItem.predicted_class,
        confidence: mlItem.confidence,
        probabilities: mlItem.probabilities,
        baselineClass: baselineResult.prediction,
        baselineRule: baselineResult.rule,
        score: scoring.score,
        riskLevel: scoring.riskLevel,
        explanation: scoring.explanation
      });
    }
  }

  return results;
}
