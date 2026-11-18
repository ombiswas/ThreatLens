import { SCORING_CONFIG } from "../config/scoring.js";

/**
 * Determines categorical risk level based on calculated threat score.
 *
 * @param {number} score - Threat score in range [0, 100]
 * @returns {"Low" | "Medium" | "High" | "Critical"}
 */
export function getRiskLevel(score) {
  const { CRITICAL, HIGH, MEDIUM, LOW } = SCORING_CONFIG.riskBands;

  if (score >= CRITICAL.min) return CRITICAL.label;
  if (score >= HIGH.min) return HIGH.label;
  if (score >= MEDIUM.min) return MEDIUM.label;
  return LOW.label;
}

/**
 * Calculates a transparent, bounded 0-100 threat score from an ML prediction.
 * Benign traffic always evaluates to score 0 and Low risk.
 *
 * Formula: score = round(100 * (wClass * severity[class] + wConf * confidence))
 * Clamped strictly to [0, 100].
 *
 * @param {string} predictedClass - Predicted attack class ("Benign", "DoS/DDoS", "PortScan", "BruteForce")
 * @param {number} confidence - Probability / confidence in [0.0, 1.0]
 * @returns {{ score: number, riskLevel: string, explanation: Array<{ factor: string, description: string, contribution: number }> }}
 */
export function calculateThreatScore(predictedClass, confidence) {
  // Safe normalization
  const safeClass = typeof predictedClass === "string" ? predictedClass.trim() : "Benign";
  const safeConf =
    typeof confidence === "number" && !Number.isNaN(confidence)
      ? Math.max(0.0, Math.min(1.0, confidence))
      : 0.0;

  // Benign traffic always scores 0
  if (safeClass.toLowerCase() === "benign") {
    return {
      score: 0,
      riskLevel: SCORING_CONFIG.riskBands.LOW.label,
      explanation: [
        {
          factor: "benign_traffic",
          description: "Traffic classified as benign carries zero threat penalty",
          contribution: 0
        }
      ]
    };
  }

  const { wClass, wConf } = SCORING_CONFIG.weights;
  const severity = SCORING_CONFIG.severity[safeClass] ?? 0.5;

  const rawScore = 100 * (wClass * severity + wConf * safeConf);
  const clampedScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Partition contributions such that sum(contribution) === clampedScore
  const classContribution = Math.round(100 * wClass * severity);
  const confidenceContribution = clampedScore - classContribution;

  const explanation = [
    {
      factor: "attack_class_severity",
      description: `Class '${safeClass}' base severity weight ${(severity * 100).toFixed(0)}%`,
      contribution: classContribution
    },
    {
      factor: "model_confidence",
      description: `Model prediction confidence ${(safeConf * 100).toFixed(1)}%`,
      contribution: confidenceContribution
    }
  ];

  return {
    score: clampedScore,
    riskLevel: getRiskLevel(clampedScore),
    explanation
  };
}
