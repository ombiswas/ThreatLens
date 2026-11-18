# NEXT STEPS

## Current Goal: Phase 6 - Incidents & Datasets Management in `server/`

Phases 0, 0.5, 1, 2, 3, 4, and 5 are verified and completed. The Express server now has authentication, RBAC, audit logging, the detection engine, explainable threat scoring, rule-based baseline comparison, resilient ML service integration, and automated test coverage.

### Phase 6 Checklist
- [ ] Incident Persistence Model (`server/src/models/Incident.js`):
  - Mongoose schema: `flowData` (validated numeric features), `mlClass`, `confidence`, `probabilities`, `baselineClass`, `baselineRule`, `score`, `riskLevel`, `explanation`, `status` (`OPEN`, `INVESTIGATING`, `RESOLVED`, `FALSE_POSITIVE`), `assignedTo` (ref to User), `notes`, timestamps.
  - Compound indexes on `createdAt`, `status`, `riskLevel`, `score`.
- [ ] Dataset Upload Model (`server/src/models/Dataset.js`):
  - Mongoose schema: `name`, `filename`, `recordCount`, `classDistribution`, `fileSize`, `fileHash`, `uploadedBy` (ref to User), timestamps.
- [ ] Incident Service & Controllers (`server/src/services/incidentService.js`, `server/src/controllers/incidentController.js`):
  - `GET /api/incidents`: Paginated list of recorded incidents with filters (`status`, `riskLevel`, `mlClass`, `startDate`, `endDate`).
  - `GET /api/incidents/:id`: Detailed view of specific incident including feature vectors and explainability breakdown.
  - `PATCH /api/incidents/:id/status`: Analyst/Admin status transition triage.
  - `GET /api/incidents/export`: Sanitized CSV export neutralizing formula injection risks (prefix cells starting with `=`, `+`, `-`, `@` with a single quote).
- [ ] Dataset Ingestion Service (`server/src/services/datasetService.js`, `server/src/controllers/datasetController.js`):
  - `POST /api/datasets/upload`: Multer CSV file upload with strict MIME (`text/csv`), size (e.g. 10MB), and row limits.
  - Header whitelist check against `FEATURE_NAMES`.
  - Stream-based CSV parsing (no arbitrary eval or command execution).
- [ ] Integration & Security Tests (`server/tests/incidents.test.js`, `server/tests/datasets.test.js`):
  - Incident pagination, status update, and authorization tests.
  - Formula injection neutralization test in CSV export.
  - Dataset upload validation, header whitelist rejection, and oversized file rejection tests.
- [ ] Verify with `npm run format`, `npm run lint`, and `npm test`.

### Open Questions
- None.

### Known Issues
- None tracked.
