# NEXT STEPS

## Current Goal: Phase 12 - Production Packaging & Deployment

Phases 0 through 11 are completely verified and operational. The full backend, offline ML training, inference microservice, detection engine, incident store, live Socket.IO telemetry, SOC dashboard with Recharts visualizations, throttled live feed, incident management with explainable score factors, status transitions, analyst notes, safe CSV exports, dataset ingestion with drag-and-drop client CSV validation, controlled traffic replay with live socket progress, comparative evaluation (Random Forest vs Heuristic Baseline, confusion matrix, discrepancy analysis, honest limitations), admin user management (RBAC controls, self-demotion safeguards), security audit trail viewer, and real-time notifications have passed exhaustive security review with 200 passing tests across the monorepo, zero accessibility violations (`axe-core`), zero pip-audit vulnerabilities, and zero secret leaks.

### Phase 12 Checklist
- [ ] Containerization & Service Packaging:
  - Verify and optimize Dockerfiles for `ml-service` (Hugging Face Spaces Docker runtime with uv frozen lock).
  - Prepare Dockerfile / Render configuration for `server/` (Node.js 22 LTS, production dependencies, environment variables).
  - Configure `client/` for Vercel deployment (static build output, routing rewrite rules for SPA, security headers).
- [ ] Environment Configuration & Health Verification:
  - Document deployment guide with exact environment variable requirements for all three hosted services.
  - Setup and verify production readiness probes (`/api/health`, `/health`).
  - Configure CORS origins and WebSocket client connection URLs for cross-domain free-tier environments.
- [ ] Staging / Production Smoke Testing:
  - Deploy ml-service to Hugging Face Spaces.
  - Deploy server to Render (connected to MongoDB Atlas M0).
  - Deploy client to Vercel.
  - Perform live smoke test across production URLs: seed admin, log in, ingest test flow sample, execute replay, verify dashboard and evaluation metrics.
- [ ] Phase 13 Preparation:
  - Structure viva presentation defense guide, architecture diagrams, and academic project report.

### Open Questions
- None.

### Known Issues
- Free-tier hosts (Render, Hugging Face Spaces) spin down on inactivity (cold start ~30-50s); client 4-second wake-up detector and backend MLClient 3-retry exponential backoff provide smooth recovery.
