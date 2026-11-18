/**
 * Threat scoring configuration.
 * Consolidates severity weights, confidence weighting, and risk band boundaries.
 */

export const SCORING_CONFIG = Object.freeze({
  // Relative weighting of attack class severity vs model confidence (sum = 1.0)
  weights: Object.freeze({
    wClass: 0.6,
    wConf: 0.4
  }),

  // Base severity weight per class (normalized 0.0 - 1.0)
  severity: Object.freeze({
    "DoS/DDoS": 1.0,
    BruteForce: 0.85,
    PortScan: 0.65,
    Benign: 0.0
  }),

  // Categorical risk bands
  riskBands: Object.freeze({
    CRITICAL: { min: 80, label: "Critical" },
    HIGH: { min: 60, label: "High" },
    MEDIUM: { min: 30, label: "Medium" },
    LOW: { min: 0, label: "Low" }
  })
});
