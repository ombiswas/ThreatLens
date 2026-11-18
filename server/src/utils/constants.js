/**
 * System-wide domain constants for roles, attack vectors, risk levels, and incident triage.
 */

export const ROLES = Object.freeze({
  VIEWER: "Viewer",
  ANALYST: "Analyst",
  ADMIN: "Admin"
});

export const ATTACK_CLASSES = Object.freeze({
  BENIGN: "Benign",
  DOS_DDOS: "DoS/DDoS",
  PORTSCAN: "PortScan",
  BRUTEFORCE: "BruteForce"
});

export const RISK_LEVELS = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL"
});

export const INCIDENT_STATUSES = Object.freeze({
  OPEN: "OPEN",
  INVESTIGATING: "INVESTIGATING",
  RESOLVED: "RESOLVED",
  FALSE_POSITIVE: "FALSE_POSITIVE"
});
