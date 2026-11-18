# NEXT STEPS

## Current Goal: Phase 5 - Threat Detection & Scoring Core in `server/`

Phases 0, 0.5, 1, 2, 3, and 4 are verified and completed. The Express server has working authentication, JWT token issuance/verification, server-side RBAC, and an idempotent system admin seed script.

### Phase 5 Checklist
- [ ] ML Service Client (`server/src/services/mlClient.js`):
  - Internal HTTP client communicating with FastAPI ML microservice (`env.ML_SERVICE_URL`).
  - Injects `X-API-Key: env.ML_API_KEY` header.
  - Exposes `predictFlow(flowRecord)` and `predictBatch(flowRecords)`.
  - Implements resilient error handling for timeouts, network failures, and bad gateway responses.
- [ ] Threat Scoring Engine (`server/src/services/scoringService.js`):
  - Explainable, transparent 0-100 threat score computation (ADR-003):
    - Base class weights: Benign (0), PortScan (50), BruteForce (70), DoS/DDoS (75).
    - ML probability amplification.
    - Sensitive destination port multipliers (e.g. 21, 22, 23, 80, 443, 3389, 8080).
    - Protocol risk weighting (TCP, UDP).
    - Volume and velocity adjustments.
  - Outputs clamped score [0, 100], risk level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), and explainability factor breakdown.
- [ ] Rule-Based Heuristic Baseline Service (`server/src/services/baselineService.js`):
  - Simple, deterministic heuristic rules for comparative analysis against ML predictions on the same records:
    - PortScan heuristics (high packet count with low duration to typical scan targets).
    - DoS/DDoS heuristics (extreme packet/byte rate exceeding volumetric thresholds).
    - BruteForce heuristics (short repeated connection attempts to auth ports).
- [ ] Detection Controller & Routes (`server/src/controllers/detectController.js`, `server/src/routes/detect.js`):
  - `POST /api/v1/detect/flow`: Requires `Analyst` or `Admin` role. Evaluates single network flow record, executes ML inference, computes threat score, runs baseline heuristic, and returns combined assessment.
  - `POST /api/v1/detect/batch`: Requires `Analyst` or `Admin` role. Evaluates batch of records (bounded limit).
  - Zod validation schemas for flow record inputs.
- [ ] Unit & Integration Tests (`server/tests/scoring.test.js`, `server/tests/detect.test.js`):
  - Unit tests for `scoringService` scoring boundaries, risk level thresholds, and explanation components.
  - Unit tests for `baselineService` heuristic classification accuracy.
  - Integration tests for `POST /api/v1/detect/flow` and `POST /api/v1/detect/batch` with mocked ML microservice responses.
- [ ] Verify with `npm run format`, `npm run lint`, and `npm test`.

### Open Questions
- None.

### Known Issues
- None tracked.
