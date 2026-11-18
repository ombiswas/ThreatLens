import { describe, it, expect } from "vitest";
import { calculateThreatScore, getRiskLevel } from "../src/services/scoringService.js";
import { SCORING_CONFIG } from "../src/config/scoring.js";

describe("Threat Scoring Engine (scoringService)", () => {
  describe("Benign Traffic Invariant", () => {
    it("always scores 0 and Low risk for Benign traffic regardless of confidence", () => {
      const confidences = [0.0, 0.5, 0.95, 1.0];
      for (const conf of confidences) {
        const result = calculateThreatScore("Benign", conf);
        expect(result.score).toBe(0);
        expect(result.riskLevel).toBe("Low");
        expect(result.explanation.length).toBeGreaterThan(0);
        const sumContributions = result.explanation.reduce((acc, f) => acc + f.contribution, 0);
        expect(sumContributions).toBe(0);
      }
    });

    it("handles case-insensitive 'benign'", () => {
      const result = calculateThreatScore("benign", 0.99);
      expect(result.score).toBe(0);
      expect(result.riskLevel).toBe("Low");
    });
  });

  describe("Score Bounds & Risk Band Edges", () => {
    it("evaluates maximum possible threat score to 100 and Critical", () => {
      // DoS/DDoS severity = 1.0, confidence = 1.0 -> 100 * (0.6*1.0 + 0.4*1.0) = 100
      const result = calculateThreatScore("DoS/DDoS", 1.0);
      expect(result.score).toBe(100);
      expect(result.riskLevel).toBe("Critical");
    });

    it("evaluates PortScan boundaries across confidence levels", () => {
      // PortScan severity = 0.65
      // Conf = 0.0 -> 100 * (0.6*0.65 + 0) = 39 (Medium)
      const lowResult = calculateThreatScore("PortScan", 0.0);
      expect(lowResult.score).toBe(39);
      expect(lowResult.riskLevel).toBe("Medium");

      // Conf = 1.0 -> 100 * (0.6*0.65 + 0.4*1.0) = 39 + 40 = 79 (High)
      const highResult = calculateThreatScore("PortScan", 1.0);
      expect(highResult.score).toBe(79);
      expect(highResult.riskLevel).toBe("High");
    });

    it("evaluates BruteForce into High / Critical bands", () => {
      // BruteForce severity = 0.85
      // Conf = 1.0 -> 100 * (0.6*0.85 + 0.4*1.0) = 51 + 40 = 91 (Critical)
      const result = calculateThreatScore("BruteForce", 1.0);
      expect(result.score).toBe(91);
      expect(result.riskLevel).toBe("Critical");
    });

    it("clamps confidence values outside [0, 1] safely", () => {
      const negativeResult = calculateThreatScore("DoS/DDoS", -0.5);
      expect(negativeResult.score).toBe(60); // 100 * (0.6*1.0 + 0) = 60

      const oversizedResult = calculateThreatScore("DoS/DDoS", 1.5);
      expect(oversizedResult.score).toBe(100); // 100 * (0.6*1.0 + 0.4*1.0) = 100
    });
  });

  describe("Explanation Factor Contributions", () => {
    it("ensures factor contributions sum exactly to the final threat score", () => {
      const testCases = [
        { cls: "DoS/DDoS", conf: 0.1 },
        { cls: "DoS/DDoS", conf: 0.73 },
        { cls: "DoS/DDoS", conf: 0.99 },
        { cls: "PortScan", conf: 0.25 },
        { cls: "PortScan", conf: 0.88 },
        { cls: "BruteForce", conf: 0.33 },
        { cls: "BruteForce", conf: 0.95 },
        { cls: "Benign", conf: 0.85 }
      ];

      for (const { cls, conf } of testCases) {
        const result = calculateThreatScore(cls, conf);
        const sumContributions = result.explanation.reduce(
          (sum, factor) => sum + factor.contribution,
          0
        );
        expect(sumContributions).toBe(result.score);
      }
    });
  });

  describe("getRiskLevel Helper", () => {
    it("matches all defined risk band boundaries correctly", () => {
      expect(getRiskLevel(100)).toBe(SCORING_CONFIG.riskBands.CRITICAL.label);
      expect(getRiskLevel(80)).toBe(SCORING_CONFIG.riskBands.CRITICAL.label);
      expect(getRiskLevel(79)).toBe(SCORING_CONFIG.riskBands.HIGH.label);
      expect(getRiskLevel(60)).toBe(SCORING_CONFIG.riskBands.HIGH.label);
      expect(getRiskLevel(59)).toBe(SCORING_CONFIG.riskBands.MEDIUM.label);
      expect(getRiskLevel(30)).toBe(SCORING_CONFIG.riskBands.MEDIUM.label);
      expect(getRiskLevel(29)).toBe(SCORING_CONFIG.riskBands.LOW.label);
      expect(getRiskLevel(0)).toBe(SCORING_CONFIG.riskBands.LOW.label);
    });
  });
});
