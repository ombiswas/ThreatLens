# NEXT STEPS

## Current Goal: Phase 10 - Datasets, Baseline Comparison & Admin UI in `client/`

Phases 0 through 9 are completely verified and operational. The full backend, offline ML training, inference microservice, detection engine, incident store, live Socket.IO telemetry, SOC dashboard with Recharts visualizations, throttled live feed, incident management with factor score breakdown, status transitions, analyst notes, and formula-injection-safe CSV exports are fully tested with 45 passing tests and live stack verification.

### Phase 10 Checklist
- [ ] Dataset Upload & Traffic Replay Manager (`client/src/features/datasets/`):
  - Drag-and-drop CSV file uploader with client validation (extension check, 5MB size limit).
  - Multi-part upload progress bar to `POST /api/datasets/upload`.
  - Ingested datasets table (`GET /api/datasets`): File name, row count, incident count, class distribution pills, upload date, uploader attribution, delete action.
  - Replay Control Panel: Select dataset (or default `demo_flows.csv`), configure flows/sec slider (1–50 fps), start replay (`POST /api/replay/start`), pause/stop replay (`POST /api/replay/stop`), real-time progress bar listening to `replay:progress` socket event.
- [ ] Comparative Evaluation Visualizer (`client/src/features/evaluation/`):
  - Latest model architecture and offline evaluation metrics (`GET /api/evaluation/latest`).
  - Dataset live comparative evaluation view (`GET /api/evaluation/dataset/:id`):
    - Multi-class confusion matrix table (RandomForest vs Heuristic Baseline).
    - Accuracy, Precision, Recall, and F1-Score comparison bars using Recharts.
    - Concordance vs Discrepancy analysis drill-down table.
- [ ] Flow Detection Playground (`client/src/features/dashboard/DetectPage.jsx`):
  - Interactive 67-feature inspection form with preloaded attack flow samples (DoS, PortScan, BruteForce, Benign).
  - Immediate submission to `POST /api/detect` with real-time classification, 0–100 threat score breakdown gauge, and baseline comparison.
- [ ] Admin Management Modules (`client/src/features/admin/`):
  - User Accounts Console (`client/src/features/admin/UsersPage.jsx`): Paginated users table (`GET /api/users`), role modification select (`PATCH /api/users/:id/role`), active status toggle (`PATCH /api/users/:id/status`), safeguards confirmation modal preventing self-demotion/deactivation.
  - Security Audit Logs Viewer (`client/src/features/admin/AuditLogsPage.jsx`): Paginated audit log table (`GET /api/audit-logs`) with action filters (`LOGIN_SUCCESS`, `ROLE_CHANGE`, `INCIDENT_STATUS_CHANGE`, etc.), date range, and IP address inspection.
- [ ] Verification:
  - Run `npm run lint`, `npm run format`, `npm test`, and `npm run build` in `client/`.
  - Verify dataset upload, replay trigger, and admin role adjustments against the live API.

### Open Questions
- None.

### Known Issues
- None tracked.
