import { describe, it, expect } from "vitest";
import { evaluateBaseline } from "../src/services/baselineService.js";

describe("Rule-Based Baseline Detector (baselineService)", () => {
  it("detects BruteForce on authentication ports with repeated forward packets", () => {
    // Port 22 (SSH) with >= 3 forward packets
    const sshProbe = {
      "Destination Port": 22,
      "Total Fwd Packets": 4,
      "Total Backward Packets": 1,
      "Flow Duration": 50000,
      "Flow Packets/s": 80
    };
    const resSsh = evaluateBaseline(sshProbe);
    expect(resSsh.prediction).toBe("BruteForce");
    expect(resSsh.rule).toBe("AUTH_PORT_REPEATED_EXCHANGE");
    expect(resSsh.confidence).toBe(0.95);

    // Port 21 (FTP) with >= 3 forward packets
    const ftpProbe = {
      destination_port: 21,
      total_fwd_packets: 3,
      total_backward_packets: 0,
      flow_duration: 10000,
      flow_packets_s: 300
    };
    const resFtp = evaluateBaseline(ftpProbe);
    expect(resFtp.prediction).toBe("BruteForce");
  });

  it("detects DoS/DDoS on high packet rate exceeding 500 pps", () => {
    const highPpsFlood = {
      "Destination Port": 80,
      "Total Fwd Packets": 100,
      "Total Backward Packets": 50,
      "Flow Duration": 100000,
      "Flow Packets/s": 650.0
    };
    const res = evaluateBaseline(highPpsFlood);
    expect(res.prediction).toBe("DoS/DDoS");
    expect(res.rule).toBe("ANOMALOUS_PACKET_RATE_OR_UNANSWERED_FLOOD");
  });

  it("detects DoS/DDoS on asymmetric forward packet flood with minimal response", () => {
    const synFlood = {
      "Destination Port": 443,
      "Total Fwd Packets": 60,
      "Total Backward Packets": 1,
      "Flow Duration": 500000,
      "Flow Packets/s": 120.0
    };
    const res = evaluateBaseline(synFlood);
    expect(res.prediction).toBe("DoS/DDoS");
  });

  it("detects PortScan on rapid unanswered probes (<= 2000us, bwd=0, fwd<=3)", () => {
    const scanProbe = {
      "Destination Port": 8080,
      "Total Fwd Packets": 2,
      "Total Backward Packets": 0,
      "Flow Duration": 1500,
      "Flow Packets/s": 100.0
    };
    const res = evaluateBaseline(scanProbe);
    expect(res.prediction).toBe("PortScan");
    expect(res.rule).toBe("RAPID_UNANSWERED_PORT_PROBE");
  });

  it("defaults to Benign when flow does not match attack heuristics", () => {
    const normalHttp = {
      "Destination Port": 443,
      "Total Fwd Packets": 15,
      "Total Backward Packets": 20,
      "Flow Duration": 300000,
      "Flow Packets/s": 116.6
    };
    const res = evaluateBaseline(normalHttp);
    expect(res.prediction).toBe("Benign");
    expect(res.rule).toBe("NO_ANOMALY_HEURISTIC_MATCH");
    expect(res.confidence).toBe(0.9);
  });

  it("gracefully falls back to Benign on empty or invalid input", () => {
    expect(evaluateBaseline(null).prediction).toBe("Benign");
    expect(evaluateBaseline({}).prediction).toBe("Benign");
  });
});
