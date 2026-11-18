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
  STATUS_CHANGE: "STATUS_CHANGE",
  DATASET_UPLOAD: "DATASET_UPLOAD",
  DATASET_DELETE: "DATASET_DELETE",
  INCIDENT_STATUS_CHANGE: "INCIDENT_STATUS_CHANGE",
  INCIDENT_EXPORT: "INCIDENT_EXPORT"
});

export const ATTACK_CLASSES = Object.freeze({
  BENIGN: "Benign",
  DOS_DDOS: "DoS/DDoS",
  PORTSCAN: "PortScan",
  BRUTEFORCE: "BruteForce"
});

export const RISK_LEVELS = Object.freeze({
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical"
});

export const INCIDENT_STATUSES = Object.freeze({
  NEW: "New",
  UNDER_REVIEW: "Under Review",
  RESOLVED: "Resolved"
});

export const VALID_STATUS_TRANSITIONS = Object.freeze({
  [INCIDENT_STATUSES.NEW]: [INCIDENT_STATUSES.UNDER_REVIEW, INCIDENT_STATUSES.RESOLVED],
  [INCIDENT_STATUSES.UNDER_REVIEW]: [INCIDENT_STATUSES.RESOLVED, INCIDENT_STATUSES.NEW],
  [INCIDENT_STATUSES.RESOLVED]: [INCIDENT_STATUSES.UNDER_REVIEW]
});
