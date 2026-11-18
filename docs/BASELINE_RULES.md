# Rule-Based Baseline Detection Heuristics

This document specifies the transparent, deterministic detection rules implemented in the baseline detector (`ml-training/src/baseline.py`) and ported to the Node.js API server (`server/services/baselineService.js`).

---

## 1. Pedagogical Purpose & Objective
In academic and operational cybersecurity settings, evaluating a machine learning intrusion detection system requires a transparent baseline to demonstrate whether complex non-linear ML models genuinely outperform deterministic heuristics, or if they simply reproduce trivial signature rules.

The baseline evaluates four distinct classes:
1. `Benign`
2. `DoS/DDoS`
3. `PortScan`
4. `BruteForce`

---

## 2. Formal Decision Logic (Language-Neutral)

```text
Input: Flow Record F containing:
  - destination_port (integer)
  - flow_duration (microseconds, float)
  - flow_packets_s (float)
  - total_fwd_packets (integer)
  - total_backward_packets (integer)

Parameters (calibrated on training split):
  - BRUTEFORCE_PORTS = { 21 (FTP), 22 (SSH), 23 (Telnet) }
  - DOS_PPS_THRESHOLD = 500.0 packets/second (or 95th percentile of benign traffic)
  - PORTSCAN_DURATION_MAX = 2000.0 microseconds (short probe duration)

Decision Hierarchy:
  1. IF destination_port IN BRUTEFORCE_PORTS AND total_fwd_packets >= 3:
         RETURN "BruteForce"

  2. IF flow_packets_s >= DOS_PPS_THRESHOLD OR (total_fwd_packets > 50 AND total_backward_packets <= 2):
         RETURN "DoS/DDoS"

  3. IF flow_duration <= PORTSCAN_DURATION_MAX AND total_backward_packets == 0 AND total_fwd_packets <= 3:
         RETURN "PortScan"

  4. DEFAULT:
         RETURN "Benign"
```

---

## 3. Node.js Implementation Specification
In `server/services/baselineService.js`:

```javascript
export function evaluateBaseline(flow) {
  const dstPort = Number(flow["Destination Port"] ?? flow.destination_port ?? 0);
  const flowDuration = Number(flow["Flow Duration"] ?? flow.flow_duration ?? 0);
  const flowPps = Number(flow["Flow Packets/s"] ?? flow.flow_packets_s ?? 0);
  const totFwd = Number(flow["Total Fwd Packets"] ?? flow.total_fwd_packets ?? 0);
  const totBwd = Number(flow["Total Backward Packets"] ?? flow.total_backward_packets ?? 0);

  if ([21, 22, 23].includes(dstPort) && totFwd >= 3) {
    return {
      prediction: "BruteForce",
      rule: "AUTH_PORT_REPEATED_EXCHANGE",
      confidence: 0.95
    };
  }

  if (flowPps >= 500.0 || (totFwd > 50 && totBwd <= 2)) {
    return {
      prediction: "DoS/DDoS",
      rule: "ANOMALOUS_PACKET_RATE_OR_UNANSWERED_FLOOD",
      confidence: 0.95
    };
  }

  if (flowDuration <= 2000.0 && totBwd === 0 && totFwd <= 3) {
    return {
      prediction: "PortScan",
      rule: "RAPID_UNANSWERED_PORT_PROBE",
      confidence: 0.95
    };
  }

  return {
    prediction: "Benign",
    rule: "NO_ANOMALY_HEURISTIC_MATCH",
    confidence: 0.90
  };
}
```
