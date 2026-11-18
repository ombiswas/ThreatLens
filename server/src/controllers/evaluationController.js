import {
  getLatestEvaluationMetrics,
  computeDatasetEvaluation
} from "../services/evaluationService.js";

/**
 * Returns model architecture, class definitions, and offline training evaluation metrics.
 */
export async function getLatestEvaluationHandler(_req, res) {
  const data = await getLatestEvaluationMetrics();
  res.status(200).json({ status: "success", data });
}

/**
 * Computes comparative live evaluation metrics for an uploaded dataset.
 */
export async function getDatasetEvaluationHandler(req, res) {
  const { id } = req.params;
  const data = await computeDatasetEvaluation(id);
  res.status(200).json({ status: "success", data });
}
