import { detectFlow, detectBatch } from "../services/detectionService.js";

/**
 * Controller handling single or batch network flow classification and scoring.
 * Accessible to Analyst and Admin roles.
 */
export async function detectController(req, res) {
  // 1. Batch prediction format: { flows: [ ... ] }
  if (Array.isArray(req.body.flows)) {
    const results = await detectBatch(req.body.flows);
    return res.status(200).json({
      status: "success",
      count: results.length,
      data: results
    });
  }

  // 2. Single prediction format: { flow: { ... } } or direct flow object
  const flowRecord = req.body.flow || req.body;
  const result = await detectFlow(flowRecord);

  return res.status(200).json({
    status: "success",
    data: result
  });
}
