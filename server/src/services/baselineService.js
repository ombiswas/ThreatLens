/**
 * Rule-based heuristic baseline service.
 * Ported deterministically from ml-training/src/baseline.py and docs/BASELINE_RULES.md.
 * Pure function with no side-effects or external I/O.
 */

const BRUTEFORCE_PORTS = new Set([21, 22, 23]);
const DOS_PPS_THRESHOLD = 500.0;
const PORTSCAN_DURATION_MAX = 2000.0;

/**
 * Evaluates a single network flow record against deterministic signature heuristics.
 *
 * @param {object} flow - Flow record key-value mappings
 * @returns {{ prediction: "Benign" | "DoS/DDoS" | "PortScan" | "BruteForce", rule: string, confidence: number }}
 */
export function evaluateBaseline(flow) {
  if (!flow || typeof flow !== "object") {
    return {
      prediction: "Benign",
      rule: "INVALID_INPUT_FALLBACK",
      confidence: 0.9
    };
  }

  const dstPort = Number(flow["Destination Port"] ?? flow.destination_port ?? 0);
  const flowDuration = Number(flow["Flow Duration"] ?? flow.flow_duration ?? 0);
  const flowPps = Number(flow["Flow Packets/s"] ?? flow.flow_packets_s ?? 0);
  const totFwd = Number(flow["Total Fwd Packets"] ?? flow.total_fwd_packets ?? 0);
  const totBwd = Number(flow["Total Backward Packets"] ?? flow.total_backward_packets ?? 0);

  // Rule 1: Brute Force authentication probe (repeated packets to SSH, Telnet, FTP)
  if (BRUTEFORCE_PORTS.has(dstPort) && totFwd >= 3) {
    return {
      prediction: "BruteForce",
      rule: "AUTH_PORT_REPEATED_EXCHANGE",
      confidence: 0.95
    };
  }

  // Rule 2: Denial of Service flood (high packet rate or asymmetric forward flood)
  if (flowPps >= DOS_PPS_THRESHOLD || (totFwd > 50 && totBwd <= 2)) {
    return {
      prediction: "DoS/DDoS",
      rule: "ANOMALOUS_PACKET_RATE_OR_UNANSWERED_FLOOD",
      confidence: 0.95
    };
  }

  // Rule 3: Fast reconnaissance PortScan (abrupt short duration, zero backward response, 1-3 fwd packets)
  if (flowDuration <= PORTSCAN_DURATION_MAX && totBwd === 0 && totFwd >= 1 && totFwd <= 3) {
    return {
      prediction: "PortScan",
      rule: "RAPID_UNANSWERED_PORT_PROBE",
      confidence: 0.95
    };
  }

  // Default benign heuristic
  return {
    prediction: "Benign",
    rule: "NO_ANOMALY_HEURISTIC_MATCH",
    confidence: 0.9
  };
}

// Alias for consistency with detection service
export const predictBaseline = evaluateBaseline;
