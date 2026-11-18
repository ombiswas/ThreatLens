# NEXT STEPS

## Current Goal: Phase 7 - Real-Time Telemetry with Socket.IO and Evaluation Comparison in `server/`

Phases 0 through 6 are verified and completed. The Express server now has authentication, RBAC, audit logging, the threat detection engine, explainable scoring, rule-based baseline comparison, incident persistence, streaming dataset upload, and safe CSV export.

### Phase 7 Checklist
- [ ] Socket.IO Real-Time Telemetry (`server/src/sockets/`):
  - Authenticated Socket.IO handshake using JWT (reject missing, expired, or invalid tokens).
  - Room management: `soc-stream` room for broadcasting live detection events, new incidents, and triage status updates.
  - Event emitters integrated into `detectionService`, `incidentService`, and `datasetService`:
    - `telemetry:flow`: Broadcast flow detection event (throttled/batched for high-throughput uploads).
    - `incident:created`: High-priority alert whenever a non-Benign incident is persisted.
    - `incident:updated`: Emitted when an incident's triage status or notes change.
    - `dataset:progress`: Emitted periodically during dataset processing (percentage, processed rows, incident count).
- [ ] Evaluation Comparison Service (`server/src/services/evaluationService.js`):
  - Run comparative evaluation on an uploaded dataset with ground truth labels (`POST /api/evaluation/run`).
  - Calculate comparative metrics:
    - ML Model: Accuracy, Precision, Recall, F1-score (macro and weighted), and per-class confusion matrix.
    - Rule-Based Baseline: Accuracy, Precision, Recall, F1-score, and confusion matrix on the identical evaluation set.
    - Discrepancy analysis: Instances where ML and baseline disagree.
  - Evaluation Routes (`/api/evaluation`, `/api/v1/evaluation`):
    - `POST /api/evaluation/run` (Analyst, Admin): Trigger evaluation against an uploaded dataset.
    - `GET /api/evaluation/:datasetId` (Authenticated): Fetch existing evaluation comparison metrics.
- [ ] Integration & Unit Tests (`server/tests/evaluation.test.js`, `server/tests/sockets.test.js`):
  - Socket.IO connection authentication, room joining, and broadcast event delivery.
  - Evaluation metric computation correctness (tested against known ground-truth confusion matrices).
- [ ] Verification:
  - Run linting (`npm run lint`), format check (`npm run format:check`), and tests (`npm test`).
  - Verify live Socket.IO connection with test client and verify evaluation against `demo_flows.csv`.

### Open Questions
- None.

### Known Issues
- None tracked.
