/**
 * System-wide domain constants for roles, audit actions, attack vectors, risk levels, and incident triage.
 */

export const ROLES = Object.freeze({
  VIEWER: "viewer",
  ANALYST: "analyst",
  ADMIN: "admin"
});

export const AUDIT_ACTIONS = Object.freeze({
  REGISTER: "REGISTER",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILURE: "LOGIN_FAILURE",
  LOGOUT: "LOGOUT",
  ROLE_CHANGE: "ROLE_CHANGE",
  STATUS_CHANGE: "STATUS_CHANGE"
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
