# NEXT STEPS

## Current Goal: Phase 11 - Testing & Security Hardening

Phases 0 through 10 are completely verified and operational. The full backend, offline ML training, inference microservice, detection engine, incident store, live Socket.IO telemetry, SOC dashboard with Recharts visualizations, throttled live feed, incident management with explainable score factors, status transitions, analyst notes, safe CSV exports, dataset ingestion with drag-and-drop client CSV validation, controlled traffic replay with live socket progress, comparative evaluation (Random Forest vs Heuristic Baseline, confusion matrix, discrepancy analysis, honest limitations), admin user management (RBAC controls, self-demotion safeguards), security audit trail viewer, and real-time notifications are fully tested with 65 client tests, 100 server tests, and full stack live verification.

### Phase 11 Checklist
- [ ] Comprehensive End-to-End Test Suite:
  - Integration workflow tests covering the complete operator lifecycle: registration -> login -> CSV upload -> traffic replay -> incident triage & status transition -> comparative evaluation inspection -> admin audit logging.
- [ ] Security Checklist Audit:
  - Input validation and sanitization audit across all routes.
  - Formula injection defense verification in CSV exports.
  - NoSQL injection rejection tests across nested queries.
  - Role-based authorization verification across all protected routes.
  - Brute-force lockout and timing attack protection checks.
  - Content Security Policy (CSP) and Helmet header verification.
- [ ] Dependency Audit & Vulnerability Scanning:
  - Run `npm audit` across `client/` and `server/`.
  - Run `uv run pip-audit` in `ml-service/` and `ml-training/`.
  - Pin and update any outdated dependencies.
- [ ] Code Polish & Cleanup:
  - Remove any obsolete test fixtures or scratch files.
  - Verify zero console warnings in production client build.

### Open Questions
- None.

### Known Issues
- None tracked.
